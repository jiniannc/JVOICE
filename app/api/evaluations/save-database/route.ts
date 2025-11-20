import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '../../../../lib/generated/prisma';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const evaluationData = await request.json();

    if (!evaluationData.id) {
      return NextResponse.json(
        { error: "평가 ID가 필요합니다." },
        { status: 400 }
      );
    }

    console.log(`📊 [API] Database 평가 결과 저장 시작: ${evaluationData.id}`);

    // 1. 기존 평가 데이터 조회
    const existingEvaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationData.id },
      include: { scores: true, recordings: true }
    });

    if (!existingEvaluation) {
      return NextResponse.json(
        { error: "평가 데이터를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 2. 평가 데이터 업데이트
    const currentEvaluatedBy = evaluationData.evaluatedBy || existingEvaluation.evaluatedBy;
    const isFirstEvaluation = !existingEvaluation.initialEvaluatedBy;
    
    const updatedEvaluation = await prisma.evaluation.update({
      where: { id: evaluationData.id },
      data: {
        status: evaluationData.status || existingEvaluation.status,
        totalScore: evaluationData.totalScore || existingEvaluation.totalScore,
        koreanTotalScore: evaluationData.koreanTotalScore || existingEvaluation.koreanTotalScore,
        englishTotalScore: evaluationData.englishTotalScore || existingEvaluation.englishTotalScore,
        grade: evaluationData.grade || existingEvaluation.grade,
        comments: evaluationData.comments || existingEvaluation.comments,
        evaluatedAt: evaluationData.evaluatedAt ? new Date(evaluationData.evaluatedAt) : existingEvaluation.evaluatedAt,
        evaluatedBy: currentEvaluatedBy, // 최종 평가자 (항상 업데이트)
        // 최초 평가자 설정 (없을 때만)
        initialEvaluatedBy: isFirstEvaluation ? currentEvaluatedBy : existingEvaluation.initialEvaluatedBy,
        initialEvaluatedAt: isFirstEvaluation && evaluationData.evaluatedAt 
          ? new Date(evaluationData.evaluatedAt) 
          : existingEvaluation.initialEvaluatedAt,
        approved: evaluationData.approved !== undefined ? evaluationData.approved : existingEvaluation.approved
      }
    });
    
    console.log(`✅ [API] 평가자 정보 저장: 최초=${updatedEvaluation.initialEvaluatedBy}, 최종=${updatedEvaluation.evaluatedBy}`);

    // 3. 기존 점수 삭제 후 새로 생성
    if (evaluationData.scores) {
      await prisma.evaluationScore.deleteMany({
        where: { evaluationId: evaluationData.id }
      });

      for (const [key, score] of Object.entries(evaluationData.scores)) {
        await prisma.evaluationScore.create({
          data: {
            evaluationId: evaluationData.id,
            criteriaKey: key,
            score: score as number,
            language: key.startsWith('korean') ? 'korean' :
                     key.startsWith('english') ? 'english' :
                     key.startsWith('japanese') ? 'japanese' :
                     key.startsWith('chinese') ? 'chinese' : null
          }
        });
      }
    }

    // 4. 녹음 파일 정보 업데이트 (있는 경우)
    if (evaluationData.dropboxFiles) {
      // 기존 녹음 파일 삭제
      await prisma.recording.deleteMany({
        where: { evaluationId: evaluationData.id }
      });

      // 새 녹음 파일 정보 생성
      for (const file of evaluationData.dropboxFiles) {
        await prisma.recording.create({
          data: {
            evaluationId: evaluationData.id,
            scriptNumber: parseInt(file.scriptKey.split('-')[0]),
            language: file.scriptKey.split('-')[1],
            filePath: file.dropboxPath,
            fileName: file.fileName || file.originalFileName,
            originalFileName: file.originalFileName,
            url: file.url,
            dropboxPath: file.dropboxPath,
            dropboxFileId: file.fileId,
            success: file.success || true
          }
        });
      }
    }

    console.log(`✅ [API] Database 평가 결과 저장 완료: ${evaluationData.id}`);

    return NextResponse.json({
      success: true,
      message: "평가 결과가 데이터베이스에 저장되었습니다.",
      evaluationId: evaluationData.id
    });

  } catch (error: any) {
    console.error("❌ [API] Database 평가 결과 저장 실패:", error);
    return NextResponse.json(
      { success: false, error: error.message || "알 수 없는 오류" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

