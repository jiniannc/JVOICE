import { NextRequest, NextResponse } from "next/server";
import dropboxService from "@/lib/dropbox-service";

// 메모리 캐시 (개발 환경에서만 사용)
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5분

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const clearCache = searchParams.get("clearCache") === "true";
    
    if (!employeeId) {
      return NextResponse.json({ error: "employeeId 쿼리 파라미터가 필요합니다." }, { status: 400 });
    }
    
    // 캐시 클리어 요청이 있으면 캐시 비우기
    if (clearCache) {
      cache.clear();
      console.log(`🧹 [load-my-recordings] 캐시 클리어됨`);
    }
    
    // index.json 읽기
    let indexData: any[] = [];
    try {
      const indexResult = await dropboxService.getIndexJson({ path: "/evaluations/index.json" });
      indexData = Array.isArray(indexResult.entries) ? indexResult.entries : [];
    } catch (e) {
      // index.json이 없으면 빈 배열 반환
      indexData = [];
    }
    
    // employeeId로 필터링
    const myRecords = indexData.filter(entry => entry.employeeId === employeeId);
    
    // 캐시 확인 (임시로 비활성화)
    const cacheKey = `my-recordings-${employeeId}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`📄 [load-my-recordings] 캐시된 데이터 사용: ${employeeId}`);
      // return NextResponse.json({ success: true, records: cached.data });
    }
    
    // index.json에서 바로 사용 (매우 빠름!)
    console.log(`⚡ [load-my-recordings] index.json에서 바로 사용: ${employeeId} (${myRecords.length}개)`);
    
    // index.json에 status 정보가 있으면 그대로 사용, 없으면 기본값
    const recordsWithStatus = myRecords.map(record => ({
      ...record,
      status: record.status || 'pending',
      approved: record.approved || false,
      totalScore: record.totalScore || 0,
      grade: record.grade || 'N/A',
      evaluatedAt: record.evaluatedAt || null,
      evaluatedBy: record.evaluatedBy || null,
    }));
    
    // 캐시에 저장
    cache.set(cacheKey, { data: recordsWithStatus, timestamp: Date.now() });
    
    return NextResponse.json({ success: true, records: recordsWithStatus });
  } catch (error: any) {
    console.error("❌ [load-my-recordings] 오류:", error);
    return NextResponse.json({ error: error.message || "알 수 없는 오류" }, { status: 500 });
  }
} 