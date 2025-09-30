import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '../../../../lib/generated/prisma';

const prisma = new PrismaClient();

/**
 * 모든 활성 신청 내역 로드 API
 * 관리자가 신청 내역을 한눈에 볼 수 있도록 모든 데이터 반환
 */
export async function GET(request: NextRequest) {
  try {
    console.log("📋 [관리자] 모든 활성 신청 내역 로드 시작");

    // 🔧 수정: ScheduleApplication 테이블에서 신청 내역 조회 (실제 Database 구조)
    const requests = await prisma.scheduleApplication.findMany({
      where: {
        status: {
          in: ['ACTIVE', 'COMPLETED'] // 활성 상태인 신청만
        }
      },
      include: {
        user: {
          select: {
            name: true,
            employeeId: true,
            department: true
          }
        },
        schedule: {
          select: {
            date: true,
            type: true,
            classType: true,
            category: true,
            classroom: true
          }
        }
      },
      orderBy: [
        { schedule: { date: 'desc' } },
        { slot: 'asc' },
        { appliedAt: 'desc' }
      ]
    });

    console.log(`📊 [관리자] 로드된 신청 내역: ${requests.length}개`);

    // 데이터 변환 (ScheduleApplication 구조에 맞게)
    const transformedRequests = requests.map(request => ({
      id: request.id,
      type: request.schedule.type === 'recording' ? 'recording' : 'education',
      date: request.schedule.date,
      slot: request.slot,
      employeeId: request.user.employeeId,
      name: request.user.name,
      department: request.user.department,
      details: request.details,
      status: request.status,
      notes: request.details?.notes || '',
      createdAt: request.appliedAt.toISOString(),
      updatedAt: request.appliedAt.toISOString(),
      schedule: {
        type: request.schedule.type,
        classType: request.schedule.classType,
        category: request.schedule.category,
        classroom: request.schedule.classroom
      }
    }));

    // 통계 생성
    const stats = {
      total: transformedRequests.length,
      education: transformedRequests.filter(r => r.type === 'education').length,
      recording: transformedRequests.filter(r => r.type === 'recording').length,
      active: transformedRequests.filter(r => r.status === 'ACTIVE').length,
      completed: transformedRequests.filter(r => r.status === 'COMPLETED').length
    };

    // 월별 통계
    const monthlyStats: Record<string, any> = {};
    transformedRequests.forEach(request => {
      const month = request.date.substring(0, 7); // YYYY-MM
      if (!monthlyStats[month]) {
        monthlyStats[month] = {
          month,
          total: 0,
          education: 0,
          recording: 0,
          active: 0,
          completed: 0
        };
      }
      monthlyStats[month].total++;
      monthlyStats[month][request.type]++;
      monthlyStats[month][request.status.toLowerCase()]++;
    });

    console.log(`✅ [관리자] 신청 내역 로드 완료: 총 ${stats.total}개 (교육: ${stats.education}, 녹음: ${stats.recording})`);

    return NextResponse.json({
      success: true,
      requests: transformedRequests,
      stats,
      monthlyStats: Object.values(monthlyStats).sort((a: any, b: any) => b.month.localeCompare(a.month)),
      message: `${stats.total}개의 활성 신청 내역을 로드했습니다.`
    });

  } catch (error) {
    console.error("❌ [관리자] 신청 내역 로드 실패:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "신청 내역 로드 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * 특정 조건으로 신청 내역 검색
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      month, 
      type, 
      status, 
      employeeId, 
      name,
      limit = 1000,
      offset = 0 
    } = body;

    console.log("🔍 [관리자] 신청 내역 검색:", { month, type, status, employeeId, name });

    // 검색 조건 구성
    const whereClause: any = {
      status: {
        in: ['ACTIVE', 'COMPLETED']
      }
    };

    if (month) {
      whereClause.date = {
        gte: `${month}-01`,
        lte: `${month}-31`
      };
    }

    if (type) {
      whereClause.type = type;
    }

    if (status) {
      whereClause.status = status;
    }

    if (employeeId || name) {
      whereClause.user = {};
      if (employeeId) {
        whereClause.user.employeeId = {
          contains: employeeId
        };
      }
      if (name) {
        whereClause.user.name = {
          contains: name
        };
      }
    }

    const requests = await prisma.request.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            name: true,
            employeeId: true,
            department: true
          }
        }
      },
      orderBy: [
        { date: 'desc' },
        { slot: 'asc' },
        { createdAt: 'desc' }
      ],
      take: limit,
      skip: offset
    });

    const totalCount = await prisma.request.count({
      where: whereClause
    });

    console.log(`✅ [관리자] 검색 완료: ${requests.length}개 (전체: ${totalCount}개)`);

    return NextResponse.json({
      success: true,
      requests: requests.map(request => ({
        id: request.id,
        type: request.type,
        date: request.date,
        slot: request.slot,
        employeeId: request.user.employeeId,
        name: request.user.name,
        department: request.user.department,
        details: request.details,
        status: request.status,
        notes: request.notes,
        createdAt: request.createdAt.toISOString(),
        updatedAt: request.updatedAt.toISOString()
      })),
      totalCount,
      hasMore: totalCount > offset + requests.length,
      message: `검색 결과: ${requests.length}개`
    });

  } catch (error) {
    console.error("❌ [관리자] 신청 내역 검색 실패:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "신청 내역 검색 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
