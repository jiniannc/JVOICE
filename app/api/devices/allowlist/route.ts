import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

  if (mode === "check") {
    const ip = getClientIp(request);
    const device = await prisma.allowedDevice.findFirst({
      where: {
        ip: ip || "unknown",
        isActive: true,
      },
    });
    const allowed = !!device;
    return NextResponse.json({ allowed, ip: ip || "unknown" });
  }

  // 기본: 전체 목록 반환 (최신순)
  const devices = await prisma.allowedDevice.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      ip: true,
      label: true,
      createdAt: true,
      createdBy: true,
      userAgent: true,
    },
  });

  return NextResponse.json({ 
    devices: devices.map(d => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
    }))
  });
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

    // 이미 등록된 IP인지 확인
    const existing = await prisma.allowedDevice.findUnique({
      where: { ip },
    });

    if (existing) {
      // 비활성화된 IP라면 다시 활성화
      if (!existing.isActive) {
        await prisma.allowedDevice.update({
          where: { ip },
          data: {
            isActive: true,
            label,
            createdBy,
            userAgent,
          },
        });
        return NextResponse.json({ success: true, message: "IP가 다시 활성화되었습니다.", ip });
      }
      return NextResponse.json({ success: true, message: "이미 등록된 IP입니다.", ip });
    }

    // 새로운 IP 등록
    const device = await prisma.allowedDevice.create({
      data: {
        ip,
        label,
        createdBy,
        userAgent,
      },
    });

    return NextResponse.json({ 
      success: true, 
      ip, 
      entry: {
        ip: device.ip,
        label: device.label,
        createdAt: device.createdAt.toISOString(),
        createdBy: device.createdBy,
        userAgent: device.userAgent,
      }
    });
  } catch (error) {
    console.error("IP 등록 실패:", error);
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

    // 소프트 삭제 (isActive를 false로 설정)
    await prisma.allowedDevice.update({
      where: { ip },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("IP 삭제 실패:", error);
    return NextResponse.json({ success: false, error: "삭제 실패" }, { status: 500 });
  }
}

