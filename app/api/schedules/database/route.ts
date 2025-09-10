import { NextRequest, NextResponse } from "next/server";
import { prisma } from '../../../../lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || new Date().toISOString().slice(0, 7);
    
    console.log(`📅 [schedules-database] ${month} 스케줄 조회`);

    // Database에서 월별 스케줄 조회
    const monthlySchedule = await prisma.monthlySchedule.findUnique({
      where: { month }
    });

    if (!monthlySchedule) {
      console.log(`❌ [schedules-database] ${month} 스케줄이 Database에 없음`);
      return NextResponse.json({
        success: false,
        error: "해당 월의 스케줄이 동기화되지 않았습니다.",
        needsSync: true,
        month
      }, { status: 404 });
    }

    // 신청 현황도 함께 조회 (실시간)
    const applications = await prisma.scheduleApplication.findMany({
      where: {
        schedule: {
          month: month
        },
        status: "ACTIVE"
      },
      include: {
        schedule: {
          select: {
            date: true,
            type: true,
            classType: true
          }
        },
        user: {
          select: {
            name: true,
            employeeId: true
          }
        }
      }
    });

    // 신청 현황을 스케줄 데이터에 병합
    const scheduleData = monthlySchedule.sheetData as any;
    
    // 신청 현황 맵 생성 (성능 최적화)
    const applicationMap = new Map();
    applications.forEach(app => {
      const key = `${app.schedule.date}-${app.schedule.type}-${app.schedule.classType}-${app.slot}`;
      if (!applicationMap.has(key)) {
        applicationMap.set(key, []);
      }
      applicationMap.get(key).push({
        employeeId: app.user.employeeId,
        name: app.user.name,
        appliedAt: app.appliedAt
      });
    });

    // 스케줄 데이터에 신청 현황 추가
    if (scheduleData?.dates) {
      Object.values(scheduleData.dates).forEach((dayData: any) => {
        if (dayData.educations) {
          dayData.educations.forEach((education: any) => {
            education.availableSlots.forEach((slot: number) => {
              const key = `${dayData.date}-${education.type}-${education.classType}-${slot}`;
              const applicants = applicationMap.get(key) || [];
              
              // 신청 현황 정보 추가
              education.applications = education.applications || {};
              education.applications[slot] = applicants;
              education.availability = education.availability || {};
              education.availability[slot] = {
                current: applicants.length,
                capacity: getCapacityByType(education.type, education.classType),
                available: getCapacityByType(education.type, education.classType) - applicants.length > 0
              };
            });
          });
        }
      });
    }

    console.log(`✅ [schedules-database] ${month} 스케줄 조회 완료 (신청 ${applications.length}건 포함)`);

    return NextResponse.json({
      success: true,
      data: scheduleData,
      meta: {
        month,
        syncedAt: monthlySchedule.syncedAt,
        totalApplications: applications.length,
        dataSource: "database"
      }
    });

  } catch (error: any) {
    console.error("❌ [schedules-database] 조회 실패:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Database 조회 중 오류가 발생했습니다.",
        dataSource: "database"
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// 타입별 수용 인원 계산
function getCapacityByType(type: string, classType: string): number {
  if (classType === "small") {
    return 4; // 소그룹은 4명
  }
  return 1; // 1:1은 1명
}

