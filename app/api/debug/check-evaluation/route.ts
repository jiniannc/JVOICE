import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '../../../../lib/generated/prisma';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const evaluationId = searchParams.get('id') || 'cmhstiybx005zpc015r07116f'; // 강여울 ID
    
    // 평가 데이터 조회
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: {
        scores: {
          orderBy: { criteriaKey: 'asc' }
        },
        user: {
          select: {
            name: true,
            employeeId: true
          }
        }
      }
    });
    
    if (!evaluation) {
      return NextResponse.json({ error: '평가를 찾을 수 없습니다' }, { status: 404 });
    }
    
    // 0점 항목 찾기
    const zeroScores = evaluation.scores.filter(s => s.score === 0);
    const nonZeroScores = evaluation.scores.filter(s => s.score !== 0);
    
    return NextResponse.json({
      evaluationId: evaluation.id,
      userName: evaluation.user?.name,
      employeeId: evaluation.user?.employeeId,
      status: evaluation.status,
      totalScore: evaluation.totalScore,
      koreanTotalScore: evaluation.koreanTotalScore,
      englishTotalScore: evaluation.englishTotalScore,
      scoresCount: evaluation.scores.length,
      zeroScoresCount: zeroScores.length,
      nonZeroScoresCount: nonZeroScores.length,
      zeroScoresSample: zeroScores.slice(0, 5).map(s => ({
        criteriaKey: s.criteriaKey,
        score: s.score,
        language: s.language
      })),
      nonZeroScoresSample: nonZeroScores.slice(0, 5).map(s => ({
        criteriaKey: s.criteriaKey,
        score: s.score,
        language: s.language
      })),
      allScores: evaluation.scores.map(s => ({
        criteriaKey: s.criteriaKey,
        score: s.score,
        language: s.language
      }))
    });
    
  } catch (error: any) {
    console.error('❌ [Debug] 평가 조회 실패:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}




