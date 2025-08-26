import { NextRequest, NextResponse } from "next/server";
import dropboxService from "@/lib/dropbox-service";

export async function POST(request: NextRequest) {
  try {
    const { dropboxPath, reevaluatedBy } = await request.json();
    
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
      const rawData = await dropboxService.download({ path: dropboxPath });
      
      // 문자열인 경우 JSON으로 파싱
      if (typeof rawData === 'string') {
        evaluationData = JSON.parse(rawData);
      } else {
        evaluationData = rawData;
      }
      
      console.log("📄 [API] 평가 데이터 로드 성공:", {
        id: evaluationData.id,
        name: evaluationData.name,
        status: evaluationData.status
      });
    } catch (e) {
      console.error("❌ [API] 평가 파일 읽기 실패:", e);
      return NextResponse.json(
        { success: false, error: "평가 파일을 읽지 못했습니다." },
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

    // Dropbox에서 파일 이동 (복사 후 삭제 방식으로 변경)
    let moveResult;
    try {
      // 먼저 복사 시도
      const copyResult = await dropboxService.copy({
        from: dropboxPath,
        to: newPath,
      });
      
      // 복사 성공 후 원본 삭제
      await dropboxService.delete({ path: dropboxPath });
      
      moveResult = copyResult;
      console.log("✅ [API] 파일 복사 후 삭제 성공");
    } catch (copyError) {
      console.error("❌ [API] 파일 복사 실패, 직접 이동 시도:", copyError);
      
      // 복사 실패 시 직접 이동 시도
      moveResult = await dropboxService.move({
        from: dropboxPath,
        to: newPath,
      });
    }

    // 5. 이동된 파일에 업데이트된 데이터 저장
    const updatedBuffer = Buffer.from(JSON.stringify(evaluationData, null, 2), "utf-8");
    await dropboxService.overwrite({ 
      path: moveResult.metadata.path_display, 
      content: updatedBuffer 
    });

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

    // 재평가 후 캐시 무효화
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
      message: "평가가 재평가 대기 상태로 변경되었습니다.",
      newPath: moveResult.metadata.path_display,
    });

  } catch (error: any) {
    console.error("❌ [API] 재평가 처리 실패:", error);
    
    // 더 자세한 오류 정보 추출
    let errorMessage = "알 수 없는 오류";
    let errorDetails = {};
    
    if (error.response?.data) {
      errorMessage = error.response.data.error_summary || error.response.data.error || "Dropbox API 오류";
      errorDetails = error.response.data;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    console.error("❌ [API] 오류 상세:", {
      message: errorMessage,
      details: errorDetails,
      stack: error.stack
    });
    
    return NextResponse.json(
      {
        success: false,
        error: "재평가 처리 중 오류가 발생했습니다.",
        details: errorMessage,
        fullError: process.env.NODE_ENV === 'development' ? errorDetails : undefined
      },
      { status: 500 }
    );
  }
} 