import { NextRequest, NextResponse } from "next/server";
import { prisma } from '../../../../lib/database';
import { EmployeeDatabase } from '@/lib/employee-database';

/**
 * 구글 스프레드시트의 모든 직원 정보를 Railway DB로 완전 마이그레이션
 * 기존 사용자는 업데이트, 없는 사용자는 신규 생성
 */
export async function POST(request: NextRequest) {
  try {
    console.log("🚀 [마이그레이션] 전체 직원 정보 마이그레이션 시작");

    // 1. 구글 스프레드시트에서 전체 직원 정보 조회
    const employeeDB = new EmployeeDatabase();
    const employees = await employeeDB.fetchEmployees();
    console.log(`📊 [마이그레이션] 스프레드시트 직원 정보: ${employees.length}명`);

    if (employees.length === 0) {
      return NextResponse.json({
        success: false,
        error: "스프레드시트에서 직원 정보를 가져올 수 없습니다."
      }, { status: 500 });
    }

    // 2. 현재 DB 사용자 조회
    const existingUsers = await prisma.user.findMany({
      select: {
        employeeId: true,
        id: true,
      }
    });
    const existingEmployeeIds = new Set(existingUsers.map(u => u.employeeId));
    console.log(`👥 [마이그레이션] 기존 DB 사용자: ${existingUsers.length}명`);

    let createdCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    const results = [];

    // 3. 각 직원별로 처리
    for (const employee of employees) {
      try {
        const userData = {
          email: employee.email,
          name: employee.name,
          employeeId: employee.employeeId,
          department: employee.lineTeam || employee.department,
          position: employee.position || '',
          lineTeam: employee.lineTeam,
          isActive: employee.isActive,
          isInstructor: employee.isInstructor,
          isAdmin: employee.isAdmin,
          roles: employee.roles,
          koreanEnglishGrade: employee.koreanEnglishGrade,
          koreanEnglishExpiry: employee.koreanEnglishExpiry,
          japaneseGrade: employee.japaneseGrade,
          chineseGrade: employee.chineseGrade,
        };

        if (existingEmployeeIds.has(employee.employeeId)) {
          // 기존 사용자 업데이트
          await prisma.user.update({
            where: { employeeId: employee.employeeId },
            data: userData
          });
          updatedCount++;
          results.push({
            employeeId: employee.employeeId,
            name: employee.name,
            action: 'updated'
          });
          
          if (updatedCount % 50 === 0) {
            console.log(`🔄 [마이그레이션] ${updatedCount}명 업데이트 완료...`);
          }
        } else {
          // 새 사용자 생성
          await prisma.user.create({
            data: userData
          });
          createdCount++;
          results.push({
            employeeId: employee.employeeId,
            name: employee.name,
            action: 'created'
          });
          
          if (createdCount % 50 === 0) {
            console.log(`✨ [마이그레이션] ${createdCount}명 생성 완료...`);
          }
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ [마이그레이션] ${employee.employeeId} (${employee.name}) 처리 실패:`, error);
        results.push({
          employeeId: employee.employeeId,
          name: employee.name,
          action: 'error',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // 4. 마이그레이션 완료 후 검증
    const finalUserCount = await prisma.user.count();
    
    console.log(`✅ [마이그레이션] 완료!`);
    console.log(`   - 신규 생성: ${createdCount}명`);
    console.log(`   - 업데이트: ${updatedCount}명`);
    console.log(`   - 실패: ${errorCount}명`);
    console.log(`   - 최종 DB 사용자 수: ${finalUserCount}명`);

    return NextResponse.json({
      success: true,
      message: `마이그레이션 완료: ${createdCount}명 생성, ${updatedCount}명 업데이트`,
      stats: {
        totalEmployees: employees.length,
        existingUsers: existingUsers.length,
        createdCount,
        updatedCount,
        errorCount,
        finalUserCount
      },
      results: results.slice(0, 100) // 첫 100개만 반환 (응답 크기 제한)
    });

  } catch (error) {
    console.error("❌ [마이그레이션] 전체 직원 마이그레이션 실패:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "마이그레이션 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * 마이그레이션 상태 조회 (Dry Run)
 * 실제로 실행하지 않고 어떤 작업이 수행될지만 확인
 */
export async function GET(request: NextRequest) {
  try {
    console.log("📊 [마이그레이션] 상태 조회");

    const employeeDB = new EmployeeDatabase();
    const employees = await employeeDB.fetchEmployees();

    const existingUsers = await prisma.user.findMany({
      select: {
        employeeId: true,
      }
    });
    const existingEmployeeIds = new Set(existingUsers.map(u => u.employeeId));

    const toCreate = employees.filter(emp => !existingEmployeeIds.has(emp.employeeId));
    const toUpdate = employees.filter(emp => existingEmployeeIds.has(emp.employeeId));

    return NextResponse.json({
      success: true,
      stats: {
        totalSpreadsheetEmployees: employees.length,
        totalDatabaseUsers: existingUsers.length,
        toCreateCount: toCreate.length,
        toUpdateCount: toUpdate.length,
      },
      preview: {
        toCreate: toCreate.slice(0, 10).map(e => ({
          employeeId: e.employeeId,
          name: e.name,
          email: e.email,
          department: e.lineTeam || e.department
        })),
        toUpdate: toUpdate.slice(0, 10).map(e => ({
          employeeId: e.employeeId,
          name: e.name,
          email: e.email,
          department: e.lineTeam || e.department
        }))
      }
    });

  } catch (error) {
    console.error("❌ [마이그레이션] 상태 조회 실패:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "상태 조회 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
