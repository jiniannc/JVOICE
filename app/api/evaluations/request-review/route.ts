import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '../../../../lib/generated/prisma';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { evaluationId, requestedBy, scores, comments, totalScore, koreanTotalScore, englishTotalScore, grade } = await request.json();
    
    console.log(`📝 [API] 검토 요청: ${evaluationId}, 요청자: ${requestedBy}`);

    // 기존 평가 조회
    const existingEvaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId }
    });

    if (!existingEvaluation) {
      return NextResponse.json(
        { success: false, error: "평가를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    console.log(`🔍 [Request-Review] 기존 평가 상태:`);
    console.log(`   - initialEvaluatedBy: ${existingEvaluation.initialEvaluatedBy}`);
    console.log(`   - evaluatedBy: ${existingEvaluation.evaluatedBy}`);
    console.log(`   - status: ${existingEvaluation.status}`);

    // 점수 계산
    let calculatedTotalScore = 0;
    let calculatedKoreanScore = 0;
    let calculatedEnglishScore = 0;
    
    if (scores && Object.keys(scores).length > 0) {
      Object.entries(scores).forEach(([key, score]) => {
        calculatedTotalScore += score as number;
        if (key.startsWith('korean-')) {
          calculatedKoreanScore += score as number;
        } else if (key.startsWith('english-')) {
          calculatedEnglishScore += score as number;
        }
      });
    }

    // 평가 정보 업데이트 (점수와 의견 포함)
    const evaluation = await prisma.evaluation.update({
      where: { id: evaluationId },
      data: {
        status: 'review_requested',
        reviewRequestedBy: requestedBy,
        reviewRequestedAt: new Date(),
        totalScore: totalScore || calculatedTotalScore,
        koreanTotalScore: koreanTotalScore || calculatedKoreanScore,
        englishTotalScore: englishTotalScore || calculatedEnglishScore,
        grade: grade || 'N/A',
        comments: comments || { korean: '', english: '' },
        evaluatedAt: new Date(), // 평가 완료 시간 설정
        evaluatedBy: requestedBy, // 최종 평가자 (검토 요청한 교관)
        // 최초 평가자 설정 (없을 때만)
        initialEvaluatedBy: existingEvaluation.initialEvaluatedBy || requestedBy,
        initialEvaluatedAt: existingEvaluation.initialEvaluatedAt || new Date()
      }
    });
    
    console.log(`✅ [API] 검토 요청 - 최초 평가자: ${evaluation.initialEvaluatedBy}, 검토 요청자(최종 평가자): ${evaluation.evaluatedBy}`);

    // 기존 점수 삭제 후 새 점수 추가
    await prisma.evaluationScore.deleteMany({
      where: { evaluationId: evaluationId }
    });

    // 새 점수들 추가
    if (scores && Object.keys(scores).length > 0) {
      const scoreEntries = Object.entries(scores).map(([criteriaKey, score]) => ({
        evaluationId: evaluationId,
        criteriaKey: criteriaKey,
        score: score as number,
        language: criteriaKey.includes('-') ? criteriaKey.split('-')[0] : 'general'
      }));

      await prisma.evaluationScore.createMany({
        data: scoreEntries
      });
    }

    console.log(`✅ [API] 검토 요청 완료: ${evaluationId}`);

    return NextResponse.json({
      success: true,
      message: "검토 요청이 완료되었습니다.",
      evaluation: evaluation
    });

  } catch (error: any) {
    console.error("❌ [API] 검토 요청 실패:", error);
    return NextResponse.json(
      { success: false, error: error.message || "알 수 없는 오류" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
