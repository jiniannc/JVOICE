import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "../../../../../lib/generated/prisma";

const prisma = new PrismaClient();

interface MonthlyData {
  month: string;
  monthLabel: string;
  evaluationHours: number;
  educationHours: number;
  totalHours: number;
}

interface InstructorSemesterData {
  instructorId: string;
  instructorName: string;
  semesterLabel: string;
  totalEvaluationHours: number;
  totalEducationHours: number;
  totalHours: number;
  monthlyData: MonthlyData[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const semester = searchParams.get("semester"); // YYYY-H1 또는 YYYY-H2 형식

    if (!semester) {
      return NextResponse.json(
        { success: false, error: "반기 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    console.log(`🔍 [API] 반기별 교관 통계 조회: ${semester}`);

    // 반기 파싱
    const [year, half] = semester.split("-");
    const isFirstHalf = half === "H1";
    
    // 반기별 월 범위 설정
    const startMonth = isFirstHalf ? 1 : 7;
    const endMonth = isFirstHalf ? 6 : 12;
    
    const startDate = new Date(parseInt(year), startMonth - 1, 1);
    const endDate = new Date(parseInt(year), endMonth, 0, 23, 59, 59, 999);
    
    console.log(`📅 [API] 반기 조회 범위: ${startDate.toISOString()} ~ ${endDate.toISOString()}`);

    // 반기 내 모든 월 생성
    const months = [];
    for (let month = startMonth; month <= endMonth; month++) {
      const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
      const monthLabel = `${month}월`;
      months.push({ month: monthStr, monthLabel });
    }

    // 1. 평가 데이터 조회
    const evaluations = await prisma.evaluation.findMany({
      where: {
        evaluatedAt: {
          gte: startDate,
          lte: endDate,
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

    console.log(`📊 [API] 반기 평가 데이터 ${evaluations.length}건 조회됨`);

    // 2. 교육 일지 조회
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
      },
    });

    console.log(`📚 [API] 반기 교육 일지 ${educationJournals.length}건 조회됨`);

    // 3. 교관별 데이터 집계
    const instructorDataMap = new Map<string, InstructorSemesterData>();

    // 평가 데이터 처리 (4건당 1시간으로 환산)
    evaluations.forEach((evaluation) => {
      const instructorId = evaluation.evaluatedBy!;
      const evaluatedDate = new Date(evaluation.evaluatedAt!);
      const month = `${evaluatedDate.getFullYear()}-${(evaluatedDate.getMonth() + 1).toString().padStart(2, '0')}`;

      if (!instructorDataMap.has(instructorId)) {
        instructorDataMap.set(instructorId, {
          instructorId,
          instructorName: instructorId, // 나중에 교육 일지에서 업데이트
          semesterLabel: `${year}년 ${isFirstHalf ? '상반기' : '하반기'}`,
          totalEvaluationHours: 0,
          totalEducationHours: 0,
          totalHours: 0,
          monthlyData: months.map(m => ({
            month: m.month,
            monthLabel: m.monthLabel,
            evaluationHours: 0,
            educationHours: 0,
            totalHours: 0,
          })),
        });
      }

      const instructorData = instructorDataMap.get(instructorId)!;
      const evaluationHours = 0.25; // 4건당 1시간이므로 1건당 0.25시간

      // 월별 데이터 업데이트
      const monthData = instructorData.monthlyData.find(m => m.month === month);
      if (monthData) {
        monthData.evaluationHours += evaluationHours;
        monthData.totalHours += evaluationHours;
      }

      instructorData.totalEvaluationHours += evaluationHours;
      instructorData.totalHours += evaluationHours;
    });

    // 교육 데이터 처리 (중복 제거 로직 포함)
    const sessionTracker = new Map<string, Set<string>>(); // instructorId -> Set of "date-slot-type"

    educationJournals.forEach((journal) => {
      const instructorId = journal.instructorEmployeeId;
      const sessionDate = journal.educationDate.toISOString().split('T')[0];
      const sessionKey = `${sessionDate}-${journal.educationSlot}-${journal.educationType}`;
      const month = `${journal.educationDate.getFullYear()}-${(journal.educationDate.getMonth() + 1).toString().padStart(2, '0')}`;

      // 교관별 세션 추적기 초기화
      if (!sessionTracker.has(instructorId)) {
        sessionTracker.set(instructorId, new Set());
      }

      // 이미 처리된 세션인지 확인 (중복 제거)
      if (sessionTracker.get(instructorId)!.has(sessionKey)) {
        return; // 중복 세션은 건너뛰기
      }

      sessionTracker.get(instructorId)!.add(sessionKey);

      // 교관 데이터 초기화
      if (!instructorDataMap.has(instructorId)) {
        instructorDataMap.set(instructorId, {
          instructorId,
          instructorName: journal.instructorName || instructorId,
          semesterLabel: `${year}년 ${isFirstHalf ? '상반기' : '하반기'}`,
          totalEvaluationHours: 0,
          totalEducationHours: 0,
          totalHours: 0,
          monthlyData: months.map(m => ({
            month: m.month,
            monthLabel: m.monthLabel,
            evaluationHours: 0,
            educationHours: 0,
            totalHours: 0,
          })),
        });
      }

      const instructorData = instructorDataMap.get(instructorId)!;

      // 교관명 업데이트
      if (journal.instructorName) {
        instructorData.instructorName = journal.instructorName;
      }

      // 교육 시간 계산
      let sessionHours = 0;
      if (journal.educationType === "1:1") {
        sessionHours = 0.5; // 30분
      } else if (journal.educationType === "small-group") {
        sessionHours = 2; // 2시간
      }

      // 월별 데이터 업데이트
      const monthData = instructorData.monthlyData.find(m => m.month === month);
      if (monthData) {
        monthData.educationHours += sessionHours;
        monthData.totalHours += sessionHours;
      }

      instructorData.totalEducationHours += sessionHours;
      instructorData.totalHours += sessionHours;
    });

    // 4. 결과 정리
    const result = Array.from(instructorDataMap.values());

    console.log(`✅ [API] 반기별 교관 통계 완료: ${result.length}명`);
    result.forEach((instructor, index) => {
      console.log(`👨‍🏫 [API] 교관 ${index + 1}: ${instructor.instructorName} (${instructor.instructorId}) - 평가: ${instructor.totalEvaluationHours.toFixed(1)}시간, 교육: ${instructor.totalEducationHours.toFixed(1)}시간`);
    });

    return NextResponse.json({
      success: true,
      data: result,
      summary: {
        semester: `${year}년 ${isFirstHalf ? '상반기' : '하반기'}`,
        totalInstructors: result.length,
        totalEvaluationHours: result.reduce((sum, s) => sum + s.totalEvaluationHours, 0),
        totalEducationHours: result.reduce((sum, s) => sum + s.totalEducationHours, 0),
        totalHours: result.reduce((sum, s) => sum + s.totalHours, 0),
      },
    });

  } catch (error: any) {
    console.error("❌ [API] 반기별 교관 통계 조회 실패:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: "반기별 교관 통계 조회 중 오류가 발생했습니다.",
        details: error.message,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

