import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/lib/generated/prisma'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { evaluationId, deletedBy } = await request.json()

    if (!evaluationId) {
      return NextResponse.json(
        { success: false, error: 'evaluationId가 필요합니다.' },
        { status: 400 }
      )
    }

    console.log(`🗑️ [API] 삭제 요청: ${evaluationId}, 처리자: ${deletedBy}`)

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

    // 2. 삭제 가능한 상태인지 확인 (평가 완료된 것은 삭제 불가)
    if (evaluation.status === 'completed' && evaluation.approved === true) {
      return NextResponse.json(
        { success: false, error: '승인 완료된 평가는 삭제할 수 없습니다.' },
        { status: 400 }
      )
    }

    // 3. 삭제 방식 선택
    // Option A: Soft Delete (deleted 상태로 변경)
    // Option B: Hard Delete (실제 삭제)
    
    // 여기서는 Soft Delete 방식 사용
    const updatedEvaluation = await prisma.evaluation.update({
      where: { id: evaluationId },
      data: {
        status: 'deleted', // 새로운 상태 추가 필요
        deletedAt: new Date(),
        deletedBy: deletedBy || 'Admin'
      }
    })

    console.log(`✅ [API] 삭제 완료: ${evaluation.user.name} (${evaluation.user.employeeId}) - deleted 상태로 변경`)

    return NextResponse.json({
      success: true,
      message: `${evaluation.user.name} (${evaluation.user.employeeId})의 평가가 삭제되었습니다.`,
      data: {
        evaluationId: updatedEvaluation.id,
        candidateName: evaluation.user.name,
        employeeId: evaluation.user.employeeId,
        deletedAt: updatedEvaluation.deletedAt,
        deletedBy: updatedEvaluation.deletedBy
      }
    })

  } catch (error) {
    console.error('❌ [API] 삭제 처리 중 오류:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '삭제 처리 중 알 수 없는 오류가 발생했습니다.' 
      },
      { status: 500 }
    )
  }
}
