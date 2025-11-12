import { NextRequest, NextResponse } from "next/server";
import { prisma } from '../../../../lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const language = searchParams.get("language");
    
    if (!employeeId) {
      return NextResponse.json({ error: "employeeId가 필요합니다." }, { status: 400 });
    }
    
    console.log(`📚 [평가 기록 조회] ${employeeId} - 언어: ${language || '전체'}`);

    // 해당 사용자의 완료/승인된 평가만 조회 (언어 필터 적용)
    const whereClause: any = {
      user: {
        employeeId: employeeId
      },
      OR: [
        { status: 'completed' },
        { approved: true }  // 승인된 평가도 포함
      ],
      evaluatedAt: {
        not: null
      }
    };

    // 같은 언어만 필터링
    if (language) {
      whereClause.language = language;
    }

    const evaluations = await prisma.evaluation.findMany({
      where: whereClause,
      include: {
        user: true,
        scores: true,
      },
      orderBy: {
        evaluatedAt: 'desc'
      },
      take: 20 // 최근 20개까지만
    });

    console.log(`✅ [평가 기록 조회] ${evaluations.length}개 발견`);

    // 평가 기록을 간단한 형태로 변환
    const history = evaluations.map(evaluation => {
      const scores: Record<string, number> = {};
      const categoryScores: Record<string, number> = {};
      
      evaluation.scores.forEach(score => {
        scores[score.criteriaKey] = score.score;
        
        // 카테고리별 점수 계산 - criteriaKey에서 대분류 추출
        // 예: "korean-발음-자음" → "korean-발음"
        //     "english-발음_자음-P / F" → "english-발음_자음"
        const keyParts = score.criteriaKey.split('-');
        if (keyParts.length >= 2) {
          let categoryKey = '';
          
          // 영어는 발음_자음, 발음_모음 같은 2단계 카테고리가 있음
          if (keyParts[0] === 'english') {
            // english-발음_자음-... → english-발음_자음
            categoryKey = keyParts.length >= 3 ? `${keyParts[0]}-${keyParts[1]}` : score.criteriaKey;
          } else {
            // korean-발음-... → korean-발음
            categoryKey = `${keyParts[0]}-${keyParts[1]}`;
          }
          
          if (!categoryScores[categoryKey]) {
            categoryScores[categoryKey] = 0;
          }
          
          // 소항목만 합산 (대분류 자체가 아닌 경우)
          const isSubItem = (keyParts[0] === 'english' && keyParts.length >= 3) || 
                           (keyParts[0] === 'korean' && keyParts.length >= 3);
          if (isSubItem) {
            categoryScores[categoryKey] += score.score;
          }
        }
      });

      return {
        id: evaluation.id,
        language: evaluation.language,
        category: evaluation.category,
        totalScore: evaluation.totalScore,
        koreanTotalScore: evaluation.koreanTotalScore,
        englishTotalScore: evaluation.englishTotalScore,
        grade: evaluation.grade,
        evaluatedAt: evaluation.evaluatedAt?.toISOString(),
        evaluatedBy: evaluation.evaluatedBy,
        comments: evaluation.comments as Record<string, string>,
        scores,
        categoryScores,
        submittedAt: evaluation.submittedAt.toISOString(),
        approved: evaluation.approved,
        status: evaluation.status
      };
    });

    return NextResponse.json({
      success: true,
      count: history.length,
      history
    });

  } catch (error: any) {
    console.error("❌ [평가 기록 조회 오류]:", error);
    return NextResponse.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
}

