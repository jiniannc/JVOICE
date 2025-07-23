import { NextRequest, NextResponse } from "next/server";
import dropboxService from "@/lib/dropbox-service";

export async function POST(request: NextRequest) {
  try {
    const { dropboxPath, approvedBy } = await request.json();
    if (!dropboxPath) {
      return NextResponse.json({ error: "dropboxPath 누락" }, { status: 400 });
    }

    /* 1. 평가 JSON 다운로드 */
    let evaluationData: any = {};
    try {
      evaluationData = await dropboxService.download({ path: dropboxPath });
    } catch (e) {
      return NextResponse.json({ error: "평가 파일을 읽지 못했습니다." }, { status: 404 });
    }

    /* 2. approved 플래그 추가 */
    evaluationData.approved = true;
    evaluationData.approvedAt = new Date().toISOString();
    if (approvedBy) evaluationData.approvedBy = approvedBy;

    const evalBuffer = Buffer.from(JSON.stringify(evaluationData, null, 2), "utf-8");
    await dropboxService.overwrite({ path: dropboxPath, content: evalBuffer });

    /* 3. index.json 업데이트 (같은 dropboxPath entry 찾아 approved:true 추가) */
    const indexPath = "/evaluations/index.json";
    try {
      const idx = await dropboxService.getIndexJson({ path: indexPath });
      const list = Array.isArray(idx.entries) ? idx.entries : [];
      const found = list.find((e: any) => e.dropboxPath === dropboxPath);
      if (found) {
        found.approved = true;
        found.approvedAt = evaluationData.approvedAt;
        const buf = Buffer.from(JSON.stringify(list, null, 2), "utf-8");
        if (idx.rev) {
          await dropboxService.overwriteIndexJson({ path: indexPath, content: buf, rev: idx.rev });
        } else {
          await dropboxService.overwrite({ path: indexPath, content: buf });
        }
      }
    } catch (err) {
      console.warn("index.json 업데이트 실패", err);
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "error" }, { status: 500 });
  }
} 