import { NextRequest, NextResponse } from "next/server";
import dropboxService from "@/lib/dropbox-service";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    // Vercel Hobby 플랜 대응: 스트리밍 처리
    const isVercel = process.env.VERCEL === '1';
    
    // 요청 크기 확인 (Vercel Hobby 플랜: 4.5MB 제한)
    const contentLength = request.headers.get('content-length');
    const maxSize = isVercel ? 4.5 * 1024 * 1024 : 50 * 1024 * 1024;
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      const maxSizeMB = isVercel ? '4.5MB' : '50MB';
      return NextResponse.json(
        {
          error: `평가 데이터가 너무 큽니다. (최대 ${maxSizeMB})`,
          details: isVercel 
            ? "Vercel Hobby 플랜에서는 4.5MB 제한이 적용됩니다. 평가 데이터를 간소화하거나 Pro 플랜으로 업그레이드하세요."
            : "평가 결과를 다시 시도해주세요. 문제가 지속되면 관리자에게 문의하세요.",
          code: "PAYLOAD_TOO_LARGE",
          environment: isVercel ? "vercel-hobby" : "local"
        },
        { status: 413 }
      );
    }

    // 스트리밍으로 데이터 읽기 (메모리 효율성)
    const evaluationData = await request.json();

    if (!evaluationData.dropboxPath) {
      return NextResponse.json(
        { error: "필수 데이터(dropboxPath)가 누락되었습니다." },
        { status: 400 }
      );
    }

    const dropboxPath = evaluationData.dropboxPath;
    console.log(`📊 [API] Dropbox 평가 결과 저장 시작: ${dropboxPath}`);

    // 1. 파일 내용 업데이트
    const fileContent = JSON.stringify(evaluationData, null, 2);
    const buffer = Buffer.from(fileContent, "utf-8");

    await dropboxService.overwrite({
      path: dropboxPath,
      content: buffer,
    });
    console.log(`✅ [API] Dropbox 파일 업데이트 완료: ${dropboxPath}`);

    let finalPath = dropboxPath;

    // 2. status가 'submitted'이면 파일 이동
    if (evaluationData.status === "submitted") {
      const fileName = path.basename(dropboxPath);
      const newPath = `/evaluations/completed/${fileName}`;
      console.log(`➡️ [API] 파일 이동 시도: ${dropboxPath} -> ${newPath}`);

      const moveResult = await dropboxService.move({
        from: dropboxPath,
        to: newPath,
      });
      finalPath = moveResult.metadata.path_display;
      console.log(`✅ [API] 파일 이동 성공: ${finalPath}`);
      /* index.json 의 dropboxPath 업데이트 */
      try {
        const idxPath = "/evaluations/index.json";
        const idx = await dropboxService.getIndexJson({ path: idxPath });
        const list = Array.isArray(idx.entries) ? idx.entries : [];
        const entry = list.find((e: any)=>e.dropboxPath===dropboxPath);
        if(entry){
          entry.dropboxPath = finalPath;
          const buf = Buffer.from(JSON.stringify(list, null, 2),"utf-8");
          if(idx.rev){
            await dropboxService.overwriteIndexJson({path:idxPath,content:buf,rev:idx.rev});
          }else{
            await dropboxService.overwrite({path:idxPath,content:buf});
          }
        }
      }catch(err){console.warn("index.json path update fail",err);}
    }

    return NextResponse.json({
      success: true,
      path: finalPath,
      message: "평가 결과가 Dropbox에 성공적으로 저장되었습니다.",
    });
  } catch (error: any) {
    console.error("❌ [API] Dropbox 평가 결과 저장 실패:", error);
    
    // 413 에러 특별 처리
    if (error.message?.includes('413') || error.status === 413) {
      return NextResponse.json(
        {
          error: "평가 데이터가 너무 큽니다. (최대 10MB)",
          details: "평가 결과를 다시 시도해주세요. 문제가 지속되면 관리자에게 문의하세요.",
          code: "PAYLOAD_TOO_LARGE"
        },
        { status: 413 }
      );
    }
    
    const errorMessage =
      error.response?.data?.error_summary ||
      error.message ||
      "알 수 없는 오류";
    return NextResponse.json(
      {
        error: "평가 결과 저장 중 오류가 발생했습니다.",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
} 