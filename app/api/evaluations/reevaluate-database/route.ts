import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/lib/generated/prisma'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { evaluationId, reevaluatedBy } = await request.json()

    if (!evaluationId) {
      return NextResponse.json(
        { success: false, error: 'evaluationId가 필요합니다.' },
        { status: 400 }
      )
    }

    console.log(`🔄 [API] 재평가 요청: ${evaluationId}, 처리자: ${reevaluatedBy}`)

    // 1. 해당 evaluation이 존재하는지 확인
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: { user: true }
    })

    if (!evaluation) {
      return NextResponse.json(
        { success: false, error: '평가 데이터를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 2. 재평가 가능한 상태인지 확인 (submitted이고 approved가 아닌 경우만)
    if (evaluation.status !== 'completed') {
      return NextResponse.json(
        { success: false, error: '재평가할 수 없는 상태입니다. (평가 완료된 항목만 재평가 가능)' },
        { status: 400 }
      )
    }

    if (evaluation.approved === true) {
      return NextResponse.json(
        { success: false, error: '이미 승인된 평가는 재평가할 수 없습니다.' },
        { status: 400 }
      )
    }

    // 3. status를 re_evaluation으로 변경 (기존 데이터 유지)
    const updatedEvaluation = await prisma.evaluation.update({
      where: { id: evaluationId },
      data: {
        status: 're_evaluation', // 🔥 새로운 상태로 변경
        approved: false, // 승인 상태 초기화
        approvedAt: null,
        approvedBy: null,
        // 재평가 메타데이터 추가
        reevaluatedAt: new Date(),
        reevaluatedBy: reevaluatedBy || 'Admin'
        // 🔥 기존 점수, 코멘트, 평가 정보는 유지
      }
    })

    // 4. 기존 점수 데이터는 유지 (삭제하지 않음)

    console.log(`✅ [API] 재평가 완료: ${evaluation.user.name} (${evaluation.user.employeeId}) - re_evaluation 상태로 변경`)

    return NextResponse.json({
      success: true,
      message: `${evaluation.user.name} (${evaluation.user.employeeId})의 평가가 재평가 대기 상태로 변경되었습니다.`,
      data: {
        evaluationId: updatedEvaluation.id,
        candidateName: evaluation.user.name,
        employeeId: evaluation.user.employeeId,
        newStatus: updatedEvaluation.status,
        reevaluatedAt: updatedEvaluation.reevaluatedAt,
        reevaluatedBy: updatedEvaluation.reevaluatedBy
      }
    })

  } catch (error) {
    console.error('❌ [API] 재평가 처리 중 오류:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '재평가 처리 중 알 수 없는 오류가 발생했습니다.' 
      },
      { status: 500 }
    )
  }
}
