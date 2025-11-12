import { NextRequest, NextResponse } from "next/server";
import { prisma } from '../../../../lib/database';

// 평가 잠금 타임아웃 (30분)
const EVALUATION_LOCK_TIMEOUT = 30 * 60 * 1000; // 30분 (밀리초)

export async function POST(request: NextRequest) {
  try {
    const { evaluationId, instructorId, instructorName, isReview } = await request.json();
    
    if (!evaluationId || !instructorId) {
      return NextResponse.json(
        { success: false, error: "evaluationId와 instructorId가 필요합니다." },
        { status: 400 }
      );
    }

    const mode = isReview ? '검토' : '평가';
    const targetStatus = isReview ? 'reviewing' : 'evaluating';
    
    console.log(`🔒 [API] ${mode} 시작: ${evaluationId}, 교관: ${instructorName} (${instructorId})`);

    // 현재 평가 상태 확인
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      select: {
        status: true,
        evaluatedBy: true,
        evaluatedAt: true,
        user: {
          select: {
            name: true,
            employeeId: true
          }
        }
      }
    });

    if (!evaluation) {
      return NextResponse.json(
        { success: false, error: "평가 데이터를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 이미 다른 교관이 평가/검토 중인지 확인 (경고만 표시, 차단하지 않음)
    const isOtherInstructorWorking = (evaluation.status === 'evaluating' || evaluation.status === 'reviewing') 
                                      && evaluation.evaluatedBy 
                                      && evaluation.evaluatedBy !== instructorId;
    
    let warningMessage = null;
    if (isOtherInstructorWorking) {
      const lockMode = evaluation.status === 'reviewing' ? '검토' : '평가';
      warningMessage = `${evaluation.evaluatedBy} 교관이 현재 ${lockMode} 중입니다.`;
      console.log(`⚠️ [API] ${mode} 중복 진입 경고: ${warningMessage}`);
    }

    // 평가/검토 시작 - evaluating 또는 reviewing 상태로 변경
    const updatedEvaluation = await prisma.evaluation.update({
      where: { id: evaluationId },
      data: {
        status: targetStatus,
        evaluatedBy: instructorId,
        evaluatedAt: new Date() // 평가/검토 시작 시간 기록
      }
    });

    console.log(`✅ [API] ${mode} 시작 완료: ${evaluationId} - ${evaluation.user.name} (${evaluation.user.employeeId})`);

    return NextResponse.json({
      success: true,
      warning: warningMessage ? true : false,
      warningMessage: warningMessage,
      message: `${mode}를 시작했습니다.`,
      evaluation: {
        id: updatedEvaluation.id,
        status: updatedEvaluation.status,
        evaluatedBy: updatedEvaluation.evaluatedBy,
        evaluatedAt: updatedEvaluation.evaluatedAt
      }
    });

  } catch (error: any) {
    console.error("❌ [API] 평가/검토 시작 실패:", error);
    return NextResponse.json(
      { success: false, error: error.message || "알 수 없는 오류" },
      { status: 500 }
    );
  }
}

