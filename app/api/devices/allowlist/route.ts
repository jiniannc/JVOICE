import { NextRequest, NextResponse } from "next/server";
import dropboxService from "@/lib/dropbox-service";

type AllowedDevice = {
  ip: string;
  label?: string;
  createdAt: string;
  createdBy?: string;
  userAgent?: string;
};

const ALLOWLIST_PATH = "/config/allowed-ips.json";

async function readAllowlist(): Promise<AllowedDevice[]> {
  try {
    const content = await dropboxService.download({ path: ALLOWLIST_PATH });
    if (content && typeof content === "string" && content.trim()) {
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : [];
    }
    return [];
  } catch (e) {
    // 파일이 없거나 에러일 경우 빈 목록 반환
    return [];
  }
}

async function writeAllowlist(list: AllowedDevice[]): Promise<void> {
  const buf = Buffer.from(JSON.stringify(list, null, 2), "utf-8");
  await dropboxService.overwrite({ path: ALLOWLIST_PATH, content: buf });
}

function getClientIp(req: NextRequest): string | null {
  const xff = req.headers.get("x-forwarded-for");
  const xrip = req.headers.get("x-real-ip");
  const reqIp = (req as any).ip;
  
  // 디버깅: 모든 IP 관련 헤더 로깅
  console.log("🔍 [IP 디버깅] 모든 IP 정보:");
  console.log("  - x-forwarded-for:", xff);
  console.log("  - x-real-ip:", xrip);
  console.log("  - request.ip:", reqIp);
  console.log("  - 모든 헤더:", Object.fromEntries(req.headers.entries()));
  
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) {
      console.log("✅ [IP 디버깅] x-forwarded-for에서 IP 추출:", first);
      return first;
    }
  }
  if (xrip) {
    console.log("✅ [IP 디버깅] x-real-ip에서 IP 추출:", xrip.trim());
    return xrip.trim();
  }
  if (reqIp) {
    console.log("✅ [IP 디버깅] request.ip에서 IP 추출:", reqIp);
    return reqIp;
  }
  
  console.log("❌ [IP 디버깅] IP를 찾을 수 없음");
  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");
  const list = await readAllowlist();

  if (mode === "check") {
    const ip = getClientIp(request);
    const allowed = !!ip && list.some((d) => d.ip === ip);
    return NextResponse.json({ allowed, ip: ip || "unknown" });
  }

  // 기본: 전체 목록 반환 (최신순)
  const sorted = [...list].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return NextResponse.json({ devices: sorted });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const label = body?.label as string | undefined;
    const createdBy = body?.createdBy as string | undefined;
    const bodyIp = (body?.ip as string | undefined)?.trim();
    const ipFromHeaders = getClientIp(request);
    const ip = ipFromHeaders || bodyIp || null;
    const userAgent = request.headers.get("user-agent") || undefined;

    if (!ip) {
      return NextResponse.json({ success: false, error: "IP를 확인할 수 없습니다." }, { status: 400 });
    }

    // 간단한 IPv4 형식 검증 (localhost 개발 편의: 127.0.0.1, ::1 허용)
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!(ipv4Regex.test(ip) || ip === "127.0.0.1" || ip === "::1")) {
      // 여전히 저장은 허용 (CDN/프록시 IP일 수 있음)
    }

    const list = await readAllowlist();
    if (list.some((d) => d.ip === ip)) {
      return NextResponse.json({ success: true, message: "이미 등록된 IP입니다.", ip });
    }

    const entry: AllowedDevice = {
      ip,
      label,
      createdAt: new Date().toISOString(),
      createdBy,
      userAgent,
    };
    list.push(entry);
    await writeAllowlist(list);
    return NextResponse.json({ success: true, ip, entry });
  } catch (error) {
    return NextResponse.json({ success: false, error: "등록 실패" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ip = searchParams.get("ip");
    if (!ip) {
      return NextResponse.json({ success: false, error: "ip 쿼리 파라미터가 필요합니다." }, { status: 400 });
    }
    const list = await readAllowlist();
    const next = list.filter((d) => d.ip !== ip);
    await writeAllowlist(next);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: "삭제 실패" }, { status: 500 });
  }
}

