import { NextRequest, NextResponse } from "next/server";
import dropboxService from "@/lib/dropbox-service";

// 간단한 메모리 캐시 (실제 운영에서는 Redis 등 사용 권장)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5000; // 5초 캐시로 단축 (실시간성 개선)
const FILE_LIST_CACHE_DURATION = 10000; // 파일 목록은 10초 캐시로 단축
const FILE_CONTENT_CACHE_DURATION = 15000; // 파일 내용은 15초 캐시로 단축

// 캐시 무효화 함수 추가
export function clearEvaluationCache() {
  cache.clear();
  console.log("✅ [API] 평가 캐시 무효화 완료");
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "5");
    const page = parseInt(searchParams.get("page") || "1");
    const month = searchParams.get("month"); // 'YYYY-MM'
    const offset = (page - 1) * limit;

    console.log(
      `📊 [API] Dropbox 'pending' 평가 결과 로드 시작 (Page: ${page}, Limit: ${limit})`
    );

    // 캐시 키 생성
    const cacheKey = `pending_${month || 'all'}_${page}_${limit}`;
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`✅ [API] 캐시된 데이터 반환: ${cached.data.evaluations.length}개`);
      return NextResponse.json(cached.data);
    }

    // 1. Dropbox에서 파일 목록 조회 (캐시 적용)
    const listCacheKey = `list_pending_${month || 'all'}`;
    let files;
    
    const listCached = cache.get(listCacheKey);
    if (listCached && Date.now() - listCached.timestamp < FILE_LIST_CACHE_DURATION) {
      files = listCached.data;
      console.log(`📁 [API] 캐시된 파일 목록 사용: ${files.length}개`);
    } else {
      files = await dropboxService.listFolder({
        path: "/evaluations/pending",
      });
      cache.set(listCacheKey, { data: files, timestamp: Date.now() });
      console.log(`📁 [API] 새로운 파일 목록 조회: ${files.length}개`);
    }

    let evaluationFiles = files.filter(
      (file: any) =>
        file[".tag"] === "file" &&
        file.name.startsWith("evaluation_") &&
        file.name.endsWith(".json")
    );

    // month가 지정되면 메타데이터(client_modified) 기준으로 해당 월만 필터
    if (month) {
      evaluationFiles = evaluationFiles.filter((file: any) => {
        const ym = new Date(file.client_modified).toISOString().slice(0, 7);
        return ym === month;
      });
    }

    console.log(
      `📋 [API] Dropbox에서 ${evaluationFiles.length}개 평가 파일 메타데이터 발견. 내용 다운로드 시작...`
    );

    // 2. 페이지네이션을 먼저 적용하여 필요한 파일만 다운로드
    const startIndex = month ? 0 : offset;
    const endIndex = month ? evaluationFiles.length : offset + limit;
    const filesToDownload = evaluationFiles.slice(startIndex, endIndex);

    // 3. 필요한 파일만 병렬로 다운로드 (배치 크기 제한)
    const batchSize = 5; // 메모리 절약을 위해 배치 크기 축소
    const allEvaluations = [];
    
    // 타임아웃 설정으로 안정성 확보
    const downloadWithTimeout = async (file: any) => {
      // 파일 내용 캐시 확인
      const fileCacheKey = `file_${file.id}`;
      const fileCached = cache.get(fileCacheKey);
      if (fileCached && Date.now() - fileCached.timestamp < FILE_CONTENT_CACHE_DURATION) {
        console.log(`📄 [API] 캐시된 파일 내용 사용: ${file.name}`);
        return fileCached.data;
      }
      
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Download timeout')), 5000)
      );
      
      const download = dropboxService
        .download({ path: file.path_display })
        .then((evaluationDataString) => {
          let evaluationData;
          try {
            evaluationData = JSON.parse(evaluationDataString);
          } catch (parseError) {
            console.warn(`⚠️ [API] JSON 파싱 실패 (${file.name}):`, parseError);
            return null;
          }
          
          const result = {
            ...evaluationData,
            dropboxFileId: file.id,
            dropboxFileName: file.name,
            dropboxPath: file.path_display,
            dropboxCreatedTime: file.client_modified,
            dropboxSize: file.size,
          };
          
          // 파일 내용 캐싱
          cache.set(fileCacheKey, { data: result, timestamp: Date.now() });
          return result;
        })
        .catch((fileError) => {
          console.warn(`⚠️ [API] 파일 읽기 실패 (${file.name}):`, fileError);
          return null;
        });
      
      return Promise.race([download, timeout]);
    };
    
    for (let i = 0; i < filesToDownload.length; i += batchSize) {
      const batch = filesToDownload.slice(i, i + batchSize);
      const batchPromises = batch.map(downloadWithTimeout);

      const batchResults = await Promise.all(batchPromises);
      allEvaluations.push(...batchResults.filter(Boolean));
    }

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

    // 5. 페이지네이션 (월 선택 시에는 이미 필터링됨)
    const totalCount = evaluationFiles.length; // 전체 파일 수
    const paginatedEvaluations = month
      ? filteredEvaluations // month 지정 시 전체 반환
      : filteredEvaluations;
    const hasNextPage = month ? false : offset + limit < totalCount;

    const result = {
      success: true,
      evaluations: paginatedEvaluations,
      totalCount,
      hasNextPage,
      message: `${paginatedEvaluations.length}개의 평가 결과를 Dropbox에서 로드했습니다.`,
    };

    // 결과 캐싱
    cache.set(cacheKey, { data: result, timestamp: Date.now() });

    console.log(
      `✅ [API] Dropbox 평가 결과 정렬 및 페이지네이션 완료: ${paginatedEvaluations.length}개 반환`
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("❌ [API] Dropbox 평가 결과 로드 실패:", error);
    const errorMessage =
      error.response?.data?.error_summary ||
      error.message ||
      "알 수 없는 오류";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// 캐시 무효화 핸들러 추가
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const invalidate = searchParams.get("invalidate");
    
    if (invalidate === "true") {
      clearEvaluationCache();
      return NextResponse.json({ 
        success: true, 
        message: "평가 목록 캐시가 무효화되었습니다." 
      });
    }
    
    return NextResponse.json({ 
      success: false, 
      message: "유효하지 않은 요청입니다." 
    }, { status: 400 });
  } catch (error) {
    console.error("❌ [API] 캐시 무효화 실패:", error);
    return NextResponse.json(
      { success: false, error: "캐시 무효화 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 