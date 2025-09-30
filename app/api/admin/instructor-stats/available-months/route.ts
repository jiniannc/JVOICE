import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "../../../../../lib/generated/prisma";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    console.log(`🔍 [API] 교관 통계 사용 가능한 월 조회`);

    // 1. 평가 데이터에서 월 추출
    const evaluations = await prisma.evaluation.findMany({
      where: {
        status: {
          in: ["submitted", "completed"],
        },
        evaluatedAt: {
          not: null,
        },
        evaluatedBy: {
          not: null,
        },
      },
      select: {
        evaluatedAt: true,
      },
    });

    // 2. 교육 일지에서 월 추출
    const educationJournals = await prisma.educationJournal.findMany({
      select: {
        createdAt: true,
        educationDate: true,
      },
    });

    // 3. 월 목록 생성
    const monthsSet = new Set<string>();

    console.log(`📊 [API] 평가 데이터 처리: ${evaluations.length}건`);
    // 평가 데이터에서 월 추출
    evaluations.forEach((evaluation) => {
      if (evaluation.evaluatedAt) {
        const month = evaluation.evaluatedAt.toISOString().slice(0, 7); // YYYY-MM
        console.log(`📅 [API] 평가 월 추가: ${month}`);
        monthsSet.add(month);
      }
    });

    console.log(`📚 [API] 교육 일지 처리: ${educationJournals.length}건`);
    // 교육 일지에서 월 추출 (educationDate 기준)
    educationJournals.forEach((journal) => {
      if (journal.educationDate) {
        const month = journal.educationDate.toISOString().slice(0, 7); // YYYY-MM
        console.log(`📅 [API] 교육 월 추가: ${month}`);
        monthsSet.add(month);
      }
    });

    console.log(`🗓️ [API] 수집된 고유 월: ${Array.from(monthsSet).join(', ')}`);

    // 4. 월 목록을 배열로 변환하고 정렬 (최신순)
    const availableMonths = Array.from(monthsSet)
      .sort()
      .reverse()
      .map(month => {
        const date = new Date(month + '-01');
        return {
          value: month,
          label: date.toLocaleDateString("ko-KR", { year: "numeric", month: "long" })
        };
      });

    console.log(`✅ [API] 사용 가능한 월 ${availableMonths.length}개 조회됨:`, availableMonths.map(m => m.value));

    return NextResponse.json({
      success: true,
      months: availableMonths,
    });

  } catch (error: any) {
    console.error("❌ [API] 사용 가능한 월 조회 실패:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: "사용 가능한 월 조회 중 오류가 발생했습니다.",
        details: error.message,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
