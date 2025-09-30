import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "../../../../lib/generated/prisma";

const prisma = new PrismaClient();

interface InstructorStats {
  instructorName: string;
  instructorId: string;
  evaluationStats: {
    totalEvaluations: number;
    byDate: { [date: string]: number };
    byLanguage: { [language: string]: number };
  };
  educationStats: {
    totalHours: number;
    totalSessions: number;
    onlineHours: number;
    smallGroupHours: number;
    byDate: { [date: string]: { sessions: number; hours: number } };
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month"); // YYYY-MM 형식

    if (!month) {
      return NextResponse.json(
        { success: false, error: "월 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    // 날짜 범위 설정
    const startDate = new Date(`${month}-01T00:00:00Z`);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59, 999);

    console.log(`🔍 [API] 교관 통계 조회: ${month}`);

    // 1. 평가 통계 수집 (submitted, completed 상태)
    const evaluations = await prisma.evaluation.findMany({
      where: {
        evaluatedAt: {
          gte: new Date(`${month}-01`),
          lt: new Date(`${month}-31T23:59:59`),
        },
        status: {
          in: ["submitted", "completed"],
        },
        evaluatedBy: {
          not: null,
        },
      },
      select: {
        evaluatedBy: true,
        evaluatedAt: true,
        language: true,
      },
    });

    console.log(`📊 [API] 평가 데이터 ${evaluations.length}건 조회됨`);

    // 2. 교육 일지 통계 수집
    const educationJournals = await prisma.educationJournal.findMany({
      where: {
        educationDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        instructorName: true,
        instructorEmployeeId: true,
        educationType: true,
        educationDate: true,
        educationSlot: true,
        createdAt: true,
      },
    });

    console.log(`📚 [API] 교육 일지 ${educationJournals.length}건 조회됨`);
    console.log(`📅 [API] 조회 기간: ${startDate.toISOString()} ~ ${endDate.toISOString()}`);
    
    // 교육 일지 샘플 로그
    if (educationJournals.length > 0) {
      console.log(`📋 [API] 교육 일지 샘플:`, educationJournals.slice(0, 3).map(j => ({
        instructorId: j.instructorEmployeeId,
        instructorName: j.instructorName,
        date: j.educationDate.toISOString(),
        type: j.educationType,
        slot: j.educationSlot
      })));
    }

    // 3. 교관별 통계 집계
    const instructorStatsMap = new Map<string, InstructorStats>();

    // 평가 통계 처리
    evaluations.forEach((evaluation) => {
      const instructorId = evaluation.evaluatedBy!;
      const evaluatedDate = evaluation.evaluatedAt!.toISOString().split('T')[0];
      const language = evaluation.language || 'unknown';

      if (!instructorStatsMap.has(instructorId)) {
        instructorStatsMap.set(instructorId, {
          instructorName: instructorId, // 실제로는 사용자 정보에서 가져와야 함
          instructorId,
          evaluationStats: {
            totalEvaluations: 0,
            byDate: {},
            byLanguage: {},
          },
          educationStats: {
            totalHours: 0,
            totalSessions: 0,
            onlineHours: 0,
            smallGroupHours: 0,
            byDate: {},
          },
        });
      }

      const stats = instructorStatsMap.get(instructorId)!;
      stats.evaluationStats.totalEvaluations++;
      stats.evaluationStats.byDate[evaluatedDate] = (stats.evaluationStats.byDate[evaluatedDate] || 0) + 1;
      stats.evaluationStats.byLanguage[language] = (stats.evaluationStats.byLanguage[language] || 0) + 1;
    });

    // 교육 통계 처리 (중복 제거 로직 포함)
    const sessionTracker = new Map<string, Set<string>>(); // instructorId -> Set of "date-slot-type"

    console.log(`🔄 [API] 교육 통계 처리 시작: ${educationJournals.length}건`);

    educationJournals.forEach((journal, index) => {
      const instructorId = journal.instructorEmployeeId;
      const sessionDate = journal.educationDate.toISOString().split('T')[0];
      const sessionKey = `${sessionDate}-${journal.educationSlot}-${journal.educationType}`;
      
      console.log(`📝 [API] 교육 일지 ${index + 1}: 교관=${instructorId}, 날짜=${sessionDate}, 유형=${journal.educationType}, 차수=${journal.educationSlot}`);

      // 교관별 세션 추적기 초기화
      if (!sessionTracker.has(instructorId)) {
        sessionTracker.set(instructorId, new Set());
      }

      // 이미 처리된 세션인지 확인 (같은 날, 같은 차수, 같은 유형)
      if (sessionTracker.get(instructorId)!.has(sessionKey)) {
        return; // 중복 세션이므로 건너뛰기
      }

      // 세션 추가
      sessionTracker.get(instructorId)!.add(sessionKey);

      if (!instructorStatsMap.has(instructorId)) {
        instructorStatsMap.set(instructorId, {
          instructorName: journal.instructorName || instructorId,
          instructorId,
          evaluationStats: {
            totalEvaluations: 0,
            byDate: {},
            byLanguage: {},
          },
          educationStats: {
            totalHours: 0,
            totalSessions: 0,
            onlineHours: 0,
            smallGroupHours: 0,
            byDate: {},
          },
        });
      }

      const stats = instructorStatsMap.get(instructorId)!;
      
      // 교육 유형별 시간 계산
      let sessionHours = 0;
      if (journal.educationType === "1:1") {
        sessionHours = 0.5; // 30분
        stats.educationStats.onlineHours += sessionHours;
      } else if (journal.educationType === "small-group") {
        sessionHours = 2; // 2시간
        stats.educationStats.smallGroupHours += sessionHours;
      }

      stats.educationStats.totalHours += sessionHours;
      stats.educationStats.totalSessions++;

      // 날짜별 통계
      if (!stats.educationStats.byDate[sessionDate]) {
        stats.educationStats.byDate[sessionDate] = { sessions: 0, hours: 0 };
      }
      stats.educationStats.byDate[sessionDate].sessions++;
      stats.educationStats.byDate[sessionDate].hours += sessionHours;

      // 교관명 업데이트 (교육 일지에서 더 정확한 이름 가져오기)
      if (journal.instructorName) {
        stats.instructorName = journal.instructorName;
      }
    });

    // 4. 결과 정리
    const instructorStats = Array.from(instructorStatsMap.values());

    console.log(`✅ [API] 교관 통계 완료: ${instructorStats.length}명`);
    instructorStats.forEach((stat, index) => {
      console.log(`👨‍🏫 [API] 교관 ${index + 1}: ${stat.instructorName} (${stat.instructorId}) - 평가: ${stat.evaluationStats.totalEvaluations}건, 교육: ${stat.educationStats.totalHours}시간`);
    });

    return NextResponse.json({
      success: true,
      stats: instructorStats,
      summary: {
        totalInstructors: instructorStats.length,
        totalEvaluations: instructorStats.reduce((sum, s) => sum + s.evaluationStats.totalEvaluations, 0),
        totalEducationHours: instructorStats.reduce((sum, s) => sum + s.educationStats.totalHours, 0),
        totalEducationSessions: instructorStats.reduce((sum, s) => sum + s.educationStats.totalSessions, 0),
      },
    });

  } catch (error: any) {
    console.error("❌ [API] 교관 통계 조회 실패:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: "교관 통계 조회 중 오류가 발생했습니다.",
        details: error.message,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
