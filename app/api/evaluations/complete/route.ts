import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '../../../../lib/generated/prisma';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { evaluationId, evaluatedBy, scores, comments, totalScore, koreanTotalScore, englishTotalScore, grade } = await request.json();
    
    console.log(`📝 [API] 평가 완료: ${evaluationId}, 평가자: ${evaluatedBy}`);

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

    console.log(`🔍 [Complete] 기존 평가 상태:`);
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

    // 평가 정보 업데이트
    const isFirstEvaluation = !existingEvaluation.initialEvaluatedBy;
    
    console.log(`📝 [Complete] 평가자 설정:`);
    console.log(`   - isFirstEvaluation: ${isFirstEvaluation}`);
    console.log(`   - 최종 평가자 (evaluatedBy): ${evaluatedBy}`);
    console.log(`   - 최초 평가자 설정값: ${isFirstEvaluation ? evaluatedBy : existingEvaluation.initialEvaluatedBy}`);
    
    const evaluation = await prisma.evaluation.update({
      where: { id: evaluationId },
      data: {
        status: 'completed',
        evaluatedAt: new Date(),
        evaluatedBy: evaluatedBy, // 최종 평가자
        totalScore: totalScore || calculatedTotalScore,
        koreanTotalScore: koreanTotalScore || calculatedKoreanScore,
        englishTotalScore: englishTotalScore || calculatedEnglishScore,
        grade: grade || 'N/A',
        comments: comments || { korean: '', english: '' },
        // 최초 평가자 설정 (없을 때만 - 검토 요청 없이 바로 제출하는 경우)
        initialEvaluatedBy: isFirstEvaluation ? evaluatedBy : existingEvaluation.initialEvaluatedBy,
        initialEvaluatedAt: isFirstEvaluation ? new Date() : existingEvaluation.initialEvaluatedAt
      }
    });
    
    console.log(`✅ [API] 평가 완료 - 최초 평가자: ${evaluation.initialEvaluatedBy}, 최종 평가자: ${evaluation.evaluatedBy}`);

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
        language: criteriaKey.includes('-') ? criteriaKey.split('-')[0] : 'general' // 'korean-pronunciation' -> 'korean', 'speaking' -> 'general'
      }));

      await prisma.evaluationScore.createMany({
        data: scoreEntries
      });
    }

    console.log(`✅ [API] 평가 완료: ${evaluationId}`);

    return NextResponse.json({
      success: true,
      message: "평가가 완료되었습니다.",
      evaluation: {
        id: evaluation.id,
        initialEvaluatedBy: evaluation.initialEvaluatedBy,
        evaluatedBy: evaluation.evaluatedBy,
        status: evaluation.status,
      }
    });

  } catch (error: any) {
    console.error("❌ [API] 평가 완료 실패:", error);
    return NextResponse.json(
      { success: false, error: error.message || "알 수 없는 오류" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}