import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '../../../../lib/generated/prisma';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    console.log("🔧 [push-schema] 스키마 적용 시작");

    // 1. MonthlySchedule 테이블 생성
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "monthly_schedules" (
        "id" TEXT NOT NULL,
        "month" TEXT NOT NULL,
        "schedules" JSONB NOT NULL,
        "sheetData" JSONB,
        "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "monthly_schedules_pkey" PRIMARY KEY ("id")
      );
    `;
    console.log("✅ monthly_schedules 테이블 생성 완료");

    // 2. MonthlySchedule 인덱스 생성
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "monthly_schedules_month_key" ON "monthly_schedules"("month");
    `;
    console.log("✅ monthly_schedules 인덱스 생성 완료");

    // 3. Schedule 테이블 생성
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "schedules" (
        "id" TEXT NOT NULL,
        "month" TEXT NOT NULL,
        "date" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "classType" TEXT NOT NULL,
        "slots" JSONB NOT NULL,
        "capacity" INTEGER NOT NULL,
        "classroom" TEXT,
        "visible" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
      );
    `;
    console.log("✅ schedules 테이블 생성 완료");

    // 4. Schedule 인덱스 생성
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "schedules_date_type_classType_key" ON "schedules"("date", "type", "classType");
    `;
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "schedules_month_idx" ON "schedules"("month");
    `;
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "schedules_date_type_idx" ON "schedules"("date", "type");
    `;
    console.log("✅ schedules 인덱스 생성 완료");

    // 5. ScheduleApplication 테이블 생성
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "schedule_applications" (
        "id" TEXT NOT NULL,
        "scheduleId" TEXT NOT NULL,
        "employeeId" TEXT NOT NULL,
        "slot" INTEGER NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "details" JSONB,
        "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "canceledAt" TIMESTAMP(3),

        CONSTRAINT "schedule_applications_pkey" PRIMARY KEY ("id")
      );
    `;
    console.log("✅ schedule_applications 테이블 생성 완료");

    // 6. ScheduleApplication 인덱스 생성
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "schedule_applications_scheduleId_employeeId_slot_status_key" 
      ON "schedule_applications"("scheduleId", "employeeId", "slot", "status");
    `;
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "schedule_applications_employeeId_idx" ON "schedule_applications"("employeeId");
    `;
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "schedule_applications_scheduleId_slot_idx" ON "schedule_applications"("scheduleId", "slot");
    `;
    console.log("✅ schedule_applications 인덱스 생성 완료");

    // 7. User 테이블에 scheduleApplications 관계 추가 (이미 있을 수 있음)
    // Foreign Key는 나중에 추가 (기존 데이터 때문에)

    // 8. 테이블 존재 확인
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('monthly_schedules', 'schedules', 'schedule_applications');
    `;
    
    console.log("📋 생성된 테이블:", tables);

    return NextResponse.json({
      success: true,
      message: "스케줄 관련 테이블이 성공적으로 생성되었습니다.",
      tables: tables
    });

  } catch (error: any) {
    console.error("❌ [push-schema] 스키마 적용 실패:", error);
    
    // 상세한 오류 정보 반환
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        code: error.code,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// GET: 테이블 상태 확인
export async function GET(request: NextRequest) {
  try {
    // 스케줄 관련 테이블 존재 확인 (BigInt 처리)
    const tablesRaw: any = await prisma.$queryRaw`
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND table_name IN ('monthly_schedules', 'schedules', 'schedule_applications')
      ORDER BY table_name;
    `;
    
    // BigInt를 Number로 변환
    const tables = tablesRaw.map((table: any) => ({
      table_name: table.table_name,
      column_count: Number(table.column_count || 0)
    }));

    // 각 테이블의 레코드 수 확인 (BigInt 처리)
    let recordCounts: any = {};
    
    try {
      const monthlyCount: any = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "monthly_schedules"`;
      recordCounts.monthly_schedules = Number(monthlyCount[0]?.count || 0);
    } catch (e) {
      recordCounts.monthly_schedules = "테이블 없음";
    }

    try {
      const schedulesCount: any = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "schedules"`;
      recordCounts.schedules = Number(schedulesCount[0]?.count || 0);
    } catch (e) {
      recordCounts.schedules = "테이블 없음";
    }

    try {
      const applicationsCount: any = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "schedule_applications"`;
      recordCounts.schedule_applications = Number(applicationsCount[0]?.count || 0);
    } catch (e) {
      recordCounts.schedule_applications = "테이블 없음";
    }

    return NextResponse.json({
      success: true,
      tables: tables,
      recordCounts: recordCounts,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("❌ [push-schema] 상태 확인 실패:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
