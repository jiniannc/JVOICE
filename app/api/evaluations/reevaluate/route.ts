import { NextRequest, NextResponse } from "next/server";
import dropboxService from "@/lib/dropbox-service";

export async function POST(request: NextRequest) {
  let dropboxPath: string | undefined;
  try {
    const { dropboxPath: path, reevaluatedBy } = await request.json();
    dropboxPath = path;
    
    console.log("🔄 [API] 재평가 요청:", { dropboxPath, reevaluatedBy });

    if (!dropboxPath) {
      return NextResponse.json(
        { success: false, error: "Dropbox 경로가 없습니다." },
        { status: 400 }
      );
    }

    // 1. 기존 평가 데이터 다운로드
    let evaluationData: any = {};
    try {
      const evaluationDataString = await dropboxService.download({ path: dropboxPath });
      evaluationData = JSON.parse(evaluationDataString);
      console.log(`✅ [API] 평가 데이터 로드 성공: ${dropboxPath}`);
    } catch (e) {
      console.error(`❌ [API] 평가 파일 읽기 실패: ${dropboxPath}`, e);
      return NextResponse.json(
        { 
          success: false, 
          error: "평가 파일을 읽지 못했습니다.",
          details: e instanceof Error ? e.message : "파일 다운로드 실패",
          code: "FILE_READ_ERROR",
          dropboxPath
        },
        { status: 404 }
      );
    }

    // 2. 상태를 'pending'으로 변경하고 재평가 정보 추가
    evaluationData.status = "pending";
    evaluationData.reevaluatedAt = new Date().toISOString();
    evaluationData.reevaluatedBy = reevaluatedBy || "Admin";
    evaluationData.previousStatus = "submitted"; // 이전 상태 보존
    evaluationData.previousEvaluatedAt = evaluationData.evaluatedAt;
    evaluationData.previousEvaluatedBy = evaluationData.evaluatedBy;

    // 3. 평가 결과 초기화 (점수는 유지하되 상태만 변경)
    // evaluationData.scores = {};
    // evaluationData.categoryScores = {};
    // evaluationData.totalScore = 0;
    // evaluationData.grade = "N/A";
    // evaluationData.comments = { korean: "", english: "" };
    // evaluationData.evaluatedAt = null;
    // evaluationData.evaluatedBy = null;

    // 4. 녹음 파일 정보 보존 확인
    if (!evaluationData.dropboxFiles && evaluationData.candidateInfo?.dropboxFiles) {
      evaluationData.dropboxFiles = evaluationData.candidateInfo.dropboxFiles;
    }
    if (!evaluationData.recordings && evaluationData.candidateInfo?.recordings) {
      evaluationData.recordings = evaluationData.candidateInfo.recordings;
    }

    // 4. 파일을 pending 폴더로 이동
    const fileName = dropboxPath.split('/').pop();
    const newPath = `/evaluations/pending/${fileName}`;
    
    console.log("📁 [API] 파일 이동:", { from: dropboxPath, to: newPath });

    // Dropbox에서 파일 이동
    let moveResult;
    try {
      moveResult = await dropboxService.move({
        from: dropboxPath,
        to: newPath,
      });
      console.log(`✅ [API] 파일 이동 성공: ${dropboxPath} -> ${newPath}`);
    } catch (moveError) {
      console.error(`❌ [API] 파일 이동 실패: ${dropboxPath} -> ${newPath}`, moveError);
      return NextResponse.json(
        { 
          success: false, 
          error: "파일 이동 중 오류가 발생했습니다.",
          details: moveError instanceof Error ? moveError.message : "파일 이동 실패",
          code: "FILE_MOVE_ERROR",
          dropboxPath,
          targetPath: newPath
        },
        { status: 500 }
      );
    }

    // 5. 이동된 파일에 업데이트된 데이터 저장
    try {
      const updatedBuffer = Buffer.from(JSON.stringify(evaluationData, null, 2), "utf-8");
      await dropboxService.overwrite({ 
        path: moveResult.metadata.path_display, 
        content: updatedBuffer 
      });
      console.log(`✅ [API] 업데이트된 데이터 저장 성공: ${moveResult.metadata.path_display}`);
    } catch (saveError) {
      console.error(`❌ [API] 데이터 저장 실패: ${moveResult.metadata.path_display}`, saveError);
      return NextResponse.json(
        { 
          success: false, 
          error: "업데이트된 데이터 저장 중 오류가 발생했습니다.",
          details: saveError instanceof Error ? saveError.message : "데이터 저장 실패",
          code: "FILE_SAVE_ERROR",
          dropboxPath: moveResult.metadata.path_display
        },
        { status: 500 }
      );
    }

    console.log("✅ [API] 재평가 처리 완료:", moveResult.metadata.path_display);

    // 6. index.json 업데이트 (선택적)
    try {
      const indexPath = "/evaluations/index.json";
      const idx = await dropboxService.getIndexJson({ path: indexPath });
      const list = Array.isArray(idx.entries) ? idx.entries : [];
      const entry = list.find((e: any) => e.dropboxPath === dropboxPath);
      if (entry) {
        entry.dropboxPath = moveResult.metadata.path_display;
        entry.status = "pending";
        entry.reevaluatedAt = evaluationData.reevaluatedAt;
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

    return NextResponse.json({
      success: true,
      message: "평가가 재평가 대기 상태로 변경되었습니다.",
      newPath: moveResult.metadata.path_display,
    });

  } catch (error: any) {
    console.error("❌ [API] 재평가 처리 실패:", error);
    
    // 더 자세한 에러 정보 제공
    let errorMessage = "알 수 없는 오류";
    let errorCode = "UNKNOWN_ERROR";
    
    if (error.response?.data?.error_summary) {
      errorMessage = error.response.data.error_summary;
      errorCode = "DROPBOX_API_ERROR";
    } else if (error.message) {
      errorMessage = error.message;
      if (error.message.includes("not_found")) {
        errorCode = "FILE_NOT_FOUND";
      } else if (error.message.includes("insufficient_quota")) {
        errorCode = "QUOTA_EXCEEDED";
      } else if (error.message.includes("invalid_access_token")) {
        errorCode = "AUTH_ERROR";
      }
    }
    
    return NextResponse.json(
      {
        success: false,
        error: "재평가 처리 중 오류가 발생했습니다.",
        details: errorMessage,
        code: errorCode,
        dropboxPath: dropboxPath || "unknown",
      },
      { status: 500 }
    );
  }
} 