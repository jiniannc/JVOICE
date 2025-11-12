import { NextRequest, NextResponse } from "next/server";
import { prisma } from '../../../../lib/database';

export async function POST(request: NextRequest) {
  try {
    const { evaluationId, instructorId } = await request.json();
    
    if (!evaluationId) {
      return NextResponse.json(
        { success: false, error: "evaluationId가 필요합니다." },
        { status: 400 }
      );
    }

    console.log(`🔙 [API] 평가/검토 나가기 (상태 복구): ${evaluationId}, 교관: ${instructorId}`);

    // 현재 평가 상태 확인
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      select: {
        status: true,
        evaluatedBy: true,
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

    // evaluating 또는 reviewing 상태인 경우만 원래 상태로 복구
    const isValidStatus = evaluation.status === 'evaluating' || evaluation.status === 'reviewing';
    if (!isValidStatus) {
      // 이미 다른 상태면 그냥 성공 반환
      return NextResponse.json({
        success: true,
        message: "이미 처리된 상태입니다."
      });
    }

    // 평가/검토 나가기 - 원래 상태로 복구
    // evaluating -> pending (재평가도 일단 pending으로, 필요시 관리자가 다시 재평가 처리)
    // reviewing -> review_requested
    // 
    // 참고: evaluating 상태에서는 원래 pending이었는지 re_evaluation이었는지 
    // 구분이 불가능하므로, 일단 pending으로 복구합니다.
    // 재평가가 필요한 경우 관리자가 다시 재평가로 전환할 수 있습니다.
    const originalStatus = evaluation.status === 'reviewing' ? 'review_requested' : 'pending';
    
    const updatedEvaluation = await prisma.evaluation.update({
      where: { id: evaluationId },
      data: {
        status: originalStatus,
        evaluatedBy: null,
        evaluatedAt: null
      }
    });

    const mode = evaluation.status === 'reviewing' ? '검토' : '평가';
    console.log(`✅ [API] ${mode} 나가기 완료 (상태 복구됨): ${evaluationId} - ${evaluation.user.name} (${evaluation.user.employeeId})`);

    return NextResponse.json({
      success: true,
      message: `${mode}를 나갔습니다.`,
      evaluation: {
        id: updatedEvaluation.id,
        status: updatedEvaluation.status
      }
    });

  } catch (error: any) {
    console.error("❌ [API] 평가/검토 취소 실패:", error);
    return NextResponse.json(
      { success: false, error: error.message || "알 수 없는 오류" },
      { status: 500 }
    );
  }
}

