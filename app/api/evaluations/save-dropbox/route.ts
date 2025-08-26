import { NextRequest, NextResponse } from "next/server";
import dropboxService from "@/lib/dropbox-service";
import path from "path";

export async function POST(request: NextRequest) {
  try {
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
      /* index.json 업데이트 (dropboxPath + 상태 정보) */
      try {
        const idxPath = "/evaluations/index.json";
        const idx = await dropboxService.getIndexJson({ path: idxPath });
        const list = Array.isArray(idx.entries) ? idx.entries : [];
        const entry = list.find((e: any)=>e.dropboxPath===dropboxPath);
        if(entry){
          // dropboxPath 업데이트
          entry.dropboxPath = finalPath;
          // 상태 정보 추가 (빠른 조회를 위해)
          entry.status = evaluationData.status || 'pending';
          entry.approved = evaluationData.approved || false;
          entry.totalScore = evaluationData.totalScore || 0;
          entry.grade = evaluationData.grade || 'N/A';
          entry.evaluatedAt = evaluationData.evaluatedAt || null;
          entry.evaluatedBy = evaluationData.evaluatedBy || null;
          
          const buf = Buffer.from(JSON.stringify(list, null, 2),"utf-8");
          if(idx.rev){
            await dropboxService.overwriteIndexJson({path:idxPath,content:buf,rev:idx.rev});
          }else{
            await dropboxService.overwrite({path:idxPath,content:buf});
          }
          console.log(`✅ [API] index.json 상태 정보 업데이트 완료: ${finalPath}`);
        }
      }catch(err){console.warn("index.json update fail",err);}
    }

    // 평가 저장 후 캐시 무효화
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/evaluations/load-dropbox?invalidate=true`, {
        method: "DELETE",
        cache: "no-store"
      });
      console.log("✅ [API] 평가 목록 캐시 무효화 요청 완료");
    } catch (error) {
      console.warn("⚠️ [API] 캐시 무효화 실패:", error);
    }

    return NextResponse.json({
      success: true,
      path: finalPath,
      message: "평가 결과가 Dropbox에 성공적으로 저장되었습니다.",
    });
  } catch (error: any) {
    console.error("❌ [API] Dropbox 평가 결과 저장 실패:", error);
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