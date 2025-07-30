import { NextRequest, NextResponse } from "next/server";
import dropboxService from "@/lib/dropbox-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "1000"); // 기본값을 넉넉하게
    const page = parseInt(searchParams.get("page") || "1");
    const offset = (page - 1) * limit;

    console.log(
      `📊 [API] Dropbox 'completed' 평가 결과 로드 시작 (Page: ${page}, Limit: ${limit})`
    );

    // 1. Dropbox에서 파일 목록 조회
    const files = await dropboxService.listFolder({
      path: "/evaluations/completed", // 경로 변경
    });

    const evaluationFiles = files.filter(
      (file: any) =>
        file[".tag"] === "file" &&
        file.name.startsWith("evaluation_") &&
        file.name.endsWith(".json")
    );

    console.log(
      `📋 [API] Dropbox에서 ${evaluationFiles.length}개 완료된 평가 파일 발견. 내용 다운로드 시작...`
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
    
    // 완료된 데이터는 별도의 정렬이나 중복 제거가 현재로서는 불필요. 최신 수정 순으로 반환.
    allEvaluations.sort((a: any, b: any) => {
      const timeA = new Date(a.dropboxCreatedTime || 0).getTime();
      const timeB = new Date(b.dropboxCreatedTime || 0).getTime();
      return timeB - timeA;
    });

    // 3. 페이지네이션
    const totalCount = allEvaluations.length;
    const paginatedEvaluations = allEvaluations.slice(offset, offset + limit);
    const hasNextPage = offset + limit < totalCount;

    console.log(
      `✅ [API] Dropbox 완료된 평가 결과 페이지네이션 완료: ${paginatedEvaluations.length}개 반환`
    );

    return NextResponse.json({
      success: true,
      evaluations: paginatedEvaluations,
      totalCount,
      hasNextPage,
      message: `${paginatedEvaluations.length}개의 완료된 평가 결과를 Dropbox에서 로드했습니다.`,
    });
  } catch (error: any) {
    console.error("❌ [API] Dropbox 완료된 평가 결과 로드 실패:", error);
    const errorMessage =
      error.response?.data?.error_summary ||
      error.message ||
      "알 수 없는 오류";
    return NextResponse.json(
      {
        error: "완료된 평가 결과 로드 중 오류가 발생했습니다.",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
} 