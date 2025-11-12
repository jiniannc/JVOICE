import { NextRequest, NextResponse } from "next/server";
import { prisma } from '../../../../../../lib/database';
import { evaluationCriteria } from "../../../../../../lib/evaluation-criteria";

// GET: 특정 직원의 평가 이력 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const language = searchParams.get("language");
    const limit = parseInt(searchParams.get("limit") || "50");

    // 직원 존재 여부 확인 (사번으로 조회)
    const employee = await prisma.user.findUnique({
      where: { employeeId: id },
      select: { id: true, name: true, employeeId: true, email: true },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: "존재하지 않는 직원입니다." },
        { status: 404 }
      );
    }

    // 평가 이력 조회 (userId 기준, approved만)
    const where: any = {
      userId: employee.id, // UUID 사용
      status: "approved", // approved 상태만 조회
    };

    if (language) {
      where.language = language;
    }

    const evaluations = await prisma.evaluation.findMany({
      where,
      take: limit,
      orderBy: { evaluatedAt: "desc" }, // 평가일 기준 정렬
      select: {
        id: true,
        language: true,
        category: true,
        status: true,
        grade: true,
        totalScore: true,
        koreanTotalScore: true,
        englishTotalScore: true,
        evaluatedBy: true,
        evaluatedAt: true,
        createdAt: true,
        scores: {
          select: {
            criteriaKey: true,
            score: true,
            language: true,
          },
        },
      },
    });

    // 평가 데이터 가공 (등급 정보 추가)
    const processedEvaluations = evaluations.map((ev) => {
      // 카테고리별 점수 계산 (제출 인원 현황과 동일한 로직)
      const categoryScores: Record<string, number> = {};
      
      if (ev.language === "korean-english") {
        // 1) 소항목 점수를 먼저 저장
        ev.scores.forEach((score) => {
          categoryScores[score.criteriaKey] = score.score;
        });

        // 2) 대분류 합계 생성: korean-발음, korean-억양, ..., english-전달력
        const koreanCategories = Object.keys(evaluationCriteria.korean || {});
        koreanCategories.forEach((cat) => {
          const sum = Object.entries(categoryScores)
            .filter(([key]) => key.startsWith(`korean-${cat}-`))
            .reduce((acc, [, score]) => acc + (score || 0), 0);
          categoryScores[`korean-${cat}`] = sum;
        });

        const englishCategories = Object.keys(evaluationCriteria.english || {});
        englishCategories.forEach((cat) => {
          const sum = Object.entries(categoryScores)
            .filter(([key]) => key.startsWith(`english-${cat}-`))
            .reduce((acc, [, score]) => acc + (score || 0), 0);
          categoryScores[`english-${cat}`] = sum;
        });
      } else {
        // 일본어/중국어: 개별 카테고리별 점수 저장
        ev.scores.forEach((score) => {
          categoryScores[score.criteriaKey] = score.score;
        });
      }

      // 등급 결정 (항상 점수로 재계산 - DB의 grade는 무시)
      let displayGrade = "N/A";
      
      // 점수 기반으로 정확한 등급 계산
      if (true) { // 항상 재계산
        const totalScore = ev.totalScore || 0;
        
        if (ev.language === "korean-english") {
          // 한/영 평가 등급 계산
          const koreanCategories = ["korean-발음", "korean-억양", "korean-전달력", "korean-음성", "korean-속도"];
          const englishCategories = ["english-발음_자음", "english-발음_모음", "english-억양", "english-강세", "english-전달력"];
          
          // FAIL 조건: 하나라도 16점 미만이면 FAIL
          let isFail = false;
          for (const cat of [...koreanCategories, ...englishCategories]) {
            const score = categoryScores[cat] || 0;
            if (score < 16) {
              isFail = true;
              break;
            }
          }
          
          if (isFail || totalScore < 160) {
            displayGrade = "FAIL";
          } else {
            // S/A/B 등급 결정
            let hasBelow17 = false;
            let hasBelow18 = false;
            
            for (const cat of [...koreanCategories, ...englishCategories]) {
              const score = categoryScores[cat] || 0;
              if (score < 17) {
                hasBelow17 = true;
                break;
              }
              if (score < 18) {
                hasBelow18 = true;
              }
            }
            
            if (hasBelow17) {
              displayGrade = "B등급";
            } else if (hasBelow18) {
              displayGrade = "A등급";
            } else {
              displayGrade = "S등급";
            }
          }
        } else {
          // 일본어/중국어 평가 등급 계산
          if (totalScore >= 90) {
            displayGrade = ev.category === "신규" ? "A" : "A";
          } else if (totalScore >= 80) {
            displayGrade = ev.category === "신규" ? "B" : "F";
          } else {
            displayGrade = "F";
          }
        }
      }

      // 등급별 색상 정보
      let gradeColor = "text-gray-600";
      let gradeBgColor = "bg-gray-50";
      
      if (displayGrade.includes("S") || displayGrade === "A" || displayGrade === "A등급") {
        gradeColor = "text-green-600";
        gradeBgColor = "bg-green-50";
      } else if (displayGrade === "B" || displayGrade === "B등급") {
        gradeColor = "text-blue-600";
        gradeBgColor = "bg-blue-50";
      } else if (displayGrade.includes("FAIL") || displayGrade === "F") {
        gradeColor = "text-red-600";
        gradeBgColor = "bg-red-50";
      }

      return {
        ...ev,
        gradeColor,
        gradeBgColor,
        categoryScores,
        displayGrade,
        scoreBreakdown: {
          korean: ev.koreanTotalScore || 0,
          english: ev.englishTotalScore || 0,
          total: ev.totalScore || 0,
        },
      };
    });

    // 통계 계산
    const stats = {
      total: evaluations.length,
      byLanguage: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      byGrade: {} as Record<string, number>,
      averageScore: 0,
      averageKoreanScore: 0,
      averageEnglishScore: 0,
    };

    let totalScore = 0;
    let scoredCount = 0;
    let koreanTotalScore = 0;
    let koreanCount = 0;
    let englishTotalScore = 0;
    let englishCount = 0;

    evaluations.forEach((ev) => {
      // 언어별
      stats.byLanguage[ev.language] = (stats.byLanguage[ev.language] || 0) + 1;

      // 상태별
      stats.byStatus[ev.status] = (stats.byStatus[ev.status] || 0) + 1;

      // 등급별
      if (ev.grade) {
        stats.byGrade[ev.grade] = (stats.byGrade[ev.grade] || 0) + 1;
      }

      // 평균 점수
      if (ev.totalScore !== null && ev.totalScore !== undefined) {
        totalScore += ev.totalScore;
        scoredCount++;
      }

      // 한국어/영어 평균 점수 (한/영 평가만)
      if (ev.language === "korean-english") {
        if (ev.koreanTotalScore !== null && ev.koreanTotalScore !== undefined) {
          koreanTotalScore += ev.koreanTotalScore;
          koreanCount++;
        }
        if (ev.englishTotalScore !== null && ev.englishTotalScore !== undefined) {
          englishTotalScore += ev.englishTotalScore;
          englishCount++;
        }
      }
    });

    if (scoredCount > 0) {
      stats.averageScore = Math.round((totalScore / scoredCount) * 10) / 10;
    }
    if (koreanCount > 0) {
      stats.averageKoreanScore = Math.round((koreanTotalScore / koreanCount) * 10) / 10;
    }
    if (englishCount > 0) {
      stats.averageEnglishScore = Math.round((englishTotalScore / englishCount) * 10) / 10;
    }


    return NextResponse.json({
      success: true,
      employee: {
        id,
        name: employee.name,
        employeeId: employee.employeeId,
        email: employee.email,
      },
      evaluations: processedEvaluations,
      stats,
    });
  } catch (error: any) {
    console.error("❌ [API] 평가 이력 조회 실패:", error);
    return NextResponse.json(
      { success: false, error: "평가 이력 조회 중 오류가 발생했습니다.", details: error.message },
      { status: 500 }
    );
  }
}
