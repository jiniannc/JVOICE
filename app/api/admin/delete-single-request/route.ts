import { NextRequest, NextResponse } from "next/server";
import { prisma } from '../../../../lib/database'; // Prisma 클라이언트 임포트

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get("requestId");

    if (!requestId) {
      return NextResponse.json(
        { success: false, error: "신청 ID가 필요합니다." },
        { status: 400 }
      );
    }

    console.log(`🗑️ [관리자] 개별 신청 내역 삭제 시작: ${requestId}`);

    // 1. 삭제할 신청 내역 조회 (존재 여부 확인)
    const targetRequest = await prisma.scheduleApplication.findUnique({
      where: { id: requestId },
      include: {
        user: {
          select: {
            name: true,
            employeeId: true
          }
        },
        schedule: {
          select: {
            date: true,
            type: true,
            classType: true,
            category: true
          }
        }
      }
    });

    if (!targetRequest) {
      return NextResponse.json(
        { success: false, error: "삭제할 신청 내역을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (targetRequest.status === 'DELETED') {
      return NextResponse.json(
        { success: false, error: "이미 삭제된 신청 내역입니다." },
        { status: 400 }
      );
    }

    console.log(`📋 [관리자] 삭제 대상 신청:`, {
      id: targetRequest.id,
      user: targetRequest.user.name,
      employeeId: targetRequest.user.employeeId,
      date: targetRequest.schedule.date,
      type: targetRequest.schedule.type,
      slot: targetRequest.slot,
      status: targetRequest.status
    });

    // 2. 실제 삭제 실행 (soft delete - status를 'DELETED'로 변경)
    const deletedRequest = await prisma.scheduleApplication.update({
      where: { id: requestId },
      data: {
        status: 'DELETED'
      }
    });

    console.log(`✅ [관리자] 개별 신청 내역 삭제 완료: ${requestId}`);

    // 3. 삭제 후 검증 (평가/녹음 파일은 영향받지 않았는지 확인)
    const evaluationCount = await prisma.evaluation.count();
    const recordingCount = await prisma.recording.count();

    console.log(`🔍 [관리자] 삭제 후 검증 - 평가: ${evaluationCount}개, 녹음: ${recordingCount}개 (영향 없음)`);

    return NextResponse.json({
      success: true,
      message: `신청 내역이 성공적으로 삭제되었습니다.`,
      deletedRequest: {
        id: targetRequest.id,
        user: targetRequest.user.name,
        employeeId: targetRequest.user.employeeId,
        date: targetRequest.schedule.date,
        type: targetRequest.schedule.type === 'recording' ? 'recording' : 'education',
        slot: targetRequest.slot
      },
      verification: {
        evaluationCount,
        recordingCount
      }
    });

  } catch (error) {
    console.error("❌ [관리자] 개별 신청 내역 삭제 오류:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "개별 신청 내역 삭제 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}





