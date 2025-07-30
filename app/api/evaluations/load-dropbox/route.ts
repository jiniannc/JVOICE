import { NextRequest, NextResponse } from "next/server";
import dropboxService from "@/lib/dropbox-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const page = parseInt(searchParams.get("page") || "1");
    const offset = (page - 1) * limit;

    console.log(
      `📊 [API] Dropbox 'pending' 평가 결과 로드 시작 (Page: ${page}, Limit: ${limit})`
    );

    // 1. Dropbox에서 파일 목록 조회
    const files = await dropboxService.listFolder({
      path: "/evaluations/pending",
    });

    const evaluationFiles = files.filter(
      (file: any) =>
        file[".tag"] === "file" &&
        file.name.startsWith("evaluation_") &&
        file.name.endsWith(".json")
    );

    console.log(
      `📋 [API] Dropbox에서 ${evaluationFiles.length}개 평가 파일 메타데이터 발견. 내용 다운로드 시작...`
    );

    // 2. 모든 파일의 내용을 병렬로 다운로드
    const downloadPromises = evaluationFiles.map((file: any) => {
      return dropboxService
        .download({ path: file.path_display })
        .then((evaluationDataString) => {
          // 문자열을 JSON으로 파싱
          let evaluationData;
          try {
            evaluationData = JSON.parse(evaluationDataString);
          } catch (parseError) {
            console.warn(`⚠️ [API] JSON 파싱 실패 (${file.name}):`, parseError);
            return null;
          }
          
          return {
            ...evaluationData,
            dropboxFileId: file.id,
            dropboxFileName: file.name,
            dropboxPath: file.path_display,
            dropboxCreatedTime: file.client_modified,
            dropboxSize: file.size,
          };
        })
        .catch((fileError) => {
          console.warn(`⚠️ [API] 파일 읽기 실패 (${file.name}):`, fileError);
          return null;
        });
    });

    const allEvaluations = (await Promise.all(downloadPromises)).filter(Boolean);

    // 평가완료(submitted) 상태는 제외
    const filteredEvaluations = allEvaluations.filter((ev: any) => ev.status !== "submitted");

    // 4. 정렬 (검토 요청 우선 > 최신순)
    filteredEvaluations.sort((a: any, b: any) => {
      const aIsReview = a.status === "review_requested";
      const bIsReview = b.status === "review_requested";
      if (aIsReview && !bIsReview) return -1;
      if (!aIsReview && bIsReview) return 1;

      const timeA = new Date(a.candidateInfo?.submittedAt || 0).getTime();
      const timeB = new Date(b.candidateInfo?.submittedAt || 0).getTime();
      return timeB - timeA;
    });

    // 5. 페이지네이션
    const totalCount = filteredEvaluations.length;
    const paginatedEvaluations = filteredEvaluations.slice(offset, offset + limit);
    const hasNextPage = offset + limit < totalCount;

    console.log(
      `✅ [API] Dropbox 평가 결과 정렬 및 페이지네이션 완료: ${paginatedEvaluations.length}개 반환`
    );

    return NextResponse.json({
      success: true,
      evaluations: paginatedEvaluations,
      totalCount,
      hasNextPage,
      message: `${paginatedEvaluations.length}개의 평가 결과를 Dropbox에서 로드했습니다.`,
    });
  } catch (error: any) {
    console.error("❌ [API] Dropbox 평가 결과 로드 실패:", error);
    const errorMessage =
      error.response?.data?.error_summary ||
      error.message ||
      "알 수 없는 오류";
    return NextResponse.json(
      {
        error: "평가 결과 로드 중 오류가 발생했습니다.",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
} 