import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '../../../../lib/generated/prisma';
import { fetchMonthSchedule } from "@/lib/schedule-service";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    console.log(`🔍 [sync-schedules] API 호출 시작`);
    
    const { month, forceUpdate = false } = await request.json();
    console.log(`🔍 [sync-schedules] 요청 파라미터:`, { month, forceUpdate });
    
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "올바른 월 형식이 필요합니다 (YYYY-MM)" }, { status: 400 });
    }

    console.log(`📅 [sync-schedules] ${month} 스케줄 동기화 시작`);

    // 1. 기존 Database 데이터 확인
    const existingSchedule = await prisma.monthlySchedule.findUnique({
      where: { month }
    });

    if (existingSchedule && !forceUpdate) {
      console.log(`⚠️ [sync-schedules] ${month} 이미 존재 (강제 업데이트 안함)`);
      return NextResponse.json({
        success: true,
        message: "이미 동기화된 데이터가 있습니다.",
        lastSynced: existingSchedule.syncedAt,
        scheduleCount: existingSchedule.schedules.length
      });
    }

    // 2. Google Sheets에서 데이터 로드
    let sheetData;
    try {
      sheetData = await fetchMonthSchedule(month);
      console.log(`📊 [sync-schedules] Google Sheets에서 데이터 로드 완료`);
    } catch (error) {
      console.error(`❌ [sync-schedules] Google Sheets 로드 실패:`, error);
      return NextResponse.json({ 
        error: "Google Sheets에서 데이터를 가져올 수 없습니다.",
        details: error.message 
      }, { status: 500 });
    }

    // 3. Database 형식으로 변환
    const schedules = [];
    
    if (sheetData.days) {
      for (const day of sheetData.days) {
        // 교육 스케줄 처리
        if (day.education) {
          for (const education of day.education) {
            const type = mapEducationTypeToString(education.type);
            const classType = education.type.mode === "1:1" ? "1:1" : "small";
            
            schedules.push({
              date: day.date,
              type: type, // "korean-english", "japanese", "chinese"
              classType: classType, // "1:1", "small"
              slots: education.slots || [],
              capacity: getCapacityByType(type, classType),
              classroom: day.classroomInfo || "",
              visible: sheetData.visible || false
            });
          }
        }
        
        // 녹음 스케줄 처리 (education으로 분류)
        if (day.recording) {
          schedules.push({
            date: day.date,
            type: "recording", // 특별 타입
            classType: "recording",
            slots: day.recording.slots || [],
            capacity: 1, // 녹음은 1명씩
            classroom: day.classroomInfo || "",
            visible: sheetData.visible || false
          });
        }
      }
    }

    console.log(`🔄 [sync-schedules] ${schedules.length}개 스케줄 변환 완료`);

    // 4. Database에 저장 (Upsert)
    await prisma.monthlySchedule.upsert({
      where: { month },
      update: {
        schedules,
        active: true, // 새로 동기화할 때는 활성화
        syncedAt: new Date(),
        sheetData: sheetData as any // 원본 시트 데이터도 보존
      },
      create: {
        month,
        schedules,
        active: true, // 새로 생성할 때는 활성화
        syncedAt: new Date(),
        sheetData: sheetData as any
      }
    });

    console.log(`✅ [sync-schedules] ${month} 동기화 완료: ${schedules.length}개 스케줄`);

    return NextResponse.json({
      success: true,
      message: `${month} 스케줄이 성공적으로 동기화되었습니다.`,
      scheduleCount: schedules.length,
      syncedAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("❌ [sync-schedules] 동기화 실패:", error);
    console.error("❌ [sync-schedules] 에러 스택:", error.stack);
    return NextResponse.json(
      { 
        error: error.message || "동기화 중 오류가 발생했습니다.",
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// EducationType을 문자열로 변환
function mapEducationTypeToString(eduType: any): string {
  if (eduType.lang === "korean-english") return "korean-english";
  if (eduType.lang === "japanese") return "japanese";  
  if (eduType.lang === "chinese") return "chinese";
  return "korean-english"; // 기본값
}

// 타입별 수용 인원 계산
function getCapacityByType(type: string, classType: string): number {
  if (classType === "small") {
    return 4; // 소그룹은 4명
  }
  return 1; // 1:1은 1명
}

// GET: 동기화 상태 확인
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    if (month) {
      // 특정 월 동기화 상태
      const schedule = await prisma.monthlySchedule.findUnique({
        where: { month },
        select: {
          month: true,
          syncedAt: true,
          schedules: true,
          active: true
        }
      });

      return NextResponse.json({
        success: true,
        synced: !!schedule,
        data: schedule
      });
    } else {
      // 전체 동기화 상태
      const allSchedules = await prisma.monthlySchedule.findMany({
        select: {
          month: true,
          syncedAt: true,
          schedules: true,
          active: true
        },
        orderBy: { month: 'desc' }
      });

      // schedules 배열 길이를 직접 계산
      const processedSchedules = allSchedules.map(schedule => ({
        month: schedule.month,
        syncedAt: schedule.syncedAt,
        scheduleCount: Array.isArray(schedule.schedules) ? schedule.schedules.length : 0,
        active: schedule.active
      }));

      return NextResponse.json({
        success: true,
        schedules: processedSchedules
      });
    }

  } catch (error: any) {
    console.error("❌ [sync-schedules] 상태 조회 실패:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// PATCH: 스케줄 활성화 상태 변경 (스케줄 종료/재개)
export async function PATCH(request: NextRequest) {
  try {
    const { month, active } = await request.json();
    
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "올바른 월 형식이 필요합니다 (YYYY-MM)" }, { status: 400 });
    }
    
    if (typeof active !== 'boolean') {
      return NextResponse.json({ error: "active 값은 boolean이어야 합니다" }, { status: 400 });
    }

    console.log(`🔄 [schedule-toggle] ${month} 스케줄 상태 변경: ${active ? '활성화' : '비활성화'}`);

    // 해당 월의 스케줄이 존재하는지 확인
    const existingSchedule = await prisma.monthlySchedule.findUnique({
      where: { month }
    });

    if (!existingSchedule) {
      return NextResponse.json({ 
        error: "해당 월의 스케줄이 동기화되지 않았습니다. 먼저 동기화를 실행하세요." 
      }, { status: 404 });
    }

    // 활성화 상태 업데이트
    await prisma.monthlySchedule.update({
      where: { month },
      data: { 
        active,
        updatedAt: new Date()
      }
    });

    console.log(`✅ [schedule-toggle] ${month} 스케줄 ${active ? '활성화' : '비활성화'} 완료`);

    return NextResponse.json({
      success: true,
      message: `${month} 스케줄이 ${active ? '활성화' : '비활성화'}되었습니다.`,
      month,
      active
    });

  } catch (error: any) {
    console.error("❌ [schedule-toggle] 상태 변경 실패:", error);
    return NextResponse.json(
      { error: error.message || "상태 변경 중 오류가 발생했습니다." },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
