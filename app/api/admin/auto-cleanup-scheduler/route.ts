import { NextRequest, NextResponse } from "next/server";

/**
 * 신청 내역 자동 정리 스케줄러
 * 매월 말일 23:59에 실행되어 해당 월의 신청 내역을 자동 삭제
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRun = searchParams.get("force") === "true"; // 강제 실행 모드
    
    console.log(`🕐 [자동 정리 스케줄러] 시작 ${forceRun ? '(강제 실행)' : ''}`);

    const currentDate = new Date();
    const currentDay = currentDate.getDate();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    // 해당 월의 마지막 날 계산
    const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate();
    
    console.log(`📅 현재: ${currentYear}-${currentMonth}-${currentDay}, 월말: ${lastDayOfMonth}일`);

    // 월말이 아닌 경우 (강제 실행 모드가 아니라면)
    if (!forceRun && currentDay !== lastDayOfMonth) {
      return NextResponse.json({
        success: false,
        message: `월말이 아닙니다. 현재: ${currentDay}일, 월말: ${lastDayOfMonth}일`,
        nextRun: `${currentYear}-${String(currentMonth).padStart(2, '0')}-${lastDayOfMonth} 23:59`
      });
    }

    // 정리할 월 계산 (현재 월)
    const targetMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    
    console.log(`🗑️ [자동 정리] 대상 월: ${targetMonth}`);

    // 신청 내역 정리 API 호출
    const cleanupResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/admin/cleanup-requests?month=${targetMonth}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!cleanupResponse.ok) {
      const errorData = await cleanupResponse.json();
      throw new Error(`정리 API 호출 실패: ${errorData.error}`);
    }

    const cleanupResult = await cleanupResponse.json();
    
    console.log(`✅ [자동 정리] 완료:`, cleanupResult);

    // 다음 실행 예정일 계산
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
    const nextLastDay = new Date(nextYear, nextMonth, 0).getDate();
    const nextRun = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${nextLastDay} 23:59`;

    return NextResponse.json({
      success: true,
      message: `${targetMonth}월 신청 내역 자동 정리 완료`,
      cleanupResult,
      nextRun,
      executedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ [자동 정리 스케줄러] 오류:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "자동 정리 스케줄러 실행 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * 스케줄러 상태 조회
 */
export async function GET(request: NextRequest) {
  try {
    const currentDate = new Date();
    const currentDay = currentDate.getDate();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    // 이번 달 마지막 날
    const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate();
    const isLastDay = currentDay === lastDayOfMonth;
    
    // 다음 실행 예정일
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
    const nextLastDay = new Date(nextYear, nextMonth, 0).getDate();
    const nextRun = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${nextLastDay} 23:59`;

    // 이번 달 정리 대상 확인
    const targetMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    const checkResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/admin/cleanup-requests?month=${targetMonth}&dryRun=true`, {
      method: 'POST'
    });

    let cleanupPreview = null;
    if (checkResponse.ok) {
      cleanupPreview = await checkResponse.json();
    }

    return NextResponse.json({
      success: true,
      scheduler: {
        currentDate: currentDate.toISOString(),
        isLastDay,
        canRunToday: isLastDay,
        nextRun,
        targetMonth
      },
      cleanupPreview: cleanupPreview || { message: "정리 대상 확인 실패" }
    });

  } catch (error) {
    console.error("❌ [스케줄러 상태 조회] 오류:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "스케줄러 상태 조회 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}





