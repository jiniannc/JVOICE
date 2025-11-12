import { NextRequest, NextResponse } from "next/server";
import { prisma } from '../../../../../../lib/database';

// GET: 특정 직원의 교육 이력 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");

    // 직원 존재 여부 확인 (사번으로 조회)
    const employee = await prisma.user.findUnique({
      where: { employeeId: id },
      select: { name: true, employeeId: true, email: true },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: "존재하지 않는 직원입니다." },
        { status: 404 }
      );
    }

    // 교육 체크인 이력 조회
    const educationCheckins = await prisma.educationCheckin.findMany({
      where: {
        employeeId: employee.employeeId, // employeeId 필드 사용
      },
      take: limit,
      orderBy: { checkinTime: "desc" }, // checkinTime 필드 사용
      select: {
        id: true,
        requestId: true,
        employeeId: true,
        checkinTime: true,
        status: true,
        notes: true,
      },
    });

    // 교육 일지 조회 (별도 테이블)
    const educationJournals = await prisma.educationJournal.findMany({
      where: {
        traineeEmployeeId: employee.employeeId,
      },
      take: limit,
      orderBy: { educationDate: "desc" },
      select: {
        id: true,
        educationDate: true,
        educationType: true,
        educationLanguage: true,
        educationSlot: true,
        instructorName: true,
        instructorEmployeeId: true,
        detailedContent: true, // sessionContent 대신
        feedback: true,        // sessionFeedback 대신
        rating: true,
      },
    });

    // 신청 이력은 제외 (필요시 userId로 조회)
    const requests: any[] = [];

    // 통계 계산
    const stats = {
      totalCheckins: educationCheckins.length,
      totalJournals: educationJournals.length,
      totalRequests: requests.length,
      completed: educationCheckins.filter((c) => c.status === "COMPLETED").length,
      cancelled: requests.filter((r) => r.status === "cancelled").length,
      byType: {} as Record<string, number>,
      recentEducation: educationJournals.length > 0 ? educationJournals[0].educationDate : null,
    };

    educationJournals.forEach((journal) => {
      if (journal.educationType) {
        const type = journal.educationType;
        stats.byType[type] = (stats.byType[type] || 0) + 1;
      }
    });


    return NextResponse.json({
      success: true,
      employee: {
        id,
        name: employee.name,
        employeeId: employee.employeeId,
        email: employee.email,
      },
      educationCheckins: educationJournals, // 교육 일지를 메인으로 반환
      checkins: educationCheckins, // 체크인 기록은 별도
      requests,
      stats,
    });
  } catch (error: any) {
    console.error("❌ [API] 교육 이력 조회 실패:", error);
    return NextResponse.json(
      { success: false, error: "교육 이력 조회 중 오류가 발생했습니다.", details: error.message },
      { status: 500 }
    );
  }
}
