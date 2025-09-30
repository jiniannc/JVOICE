import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '../../../../lib/generated/prisma';
import { EmployeeDatabase } from '@/lib/employee-database';

const prisma = new PrismaClient();

/**
 * 모든 사용자 정보를 구글 스프레드시트 정보로 동기화
 */
export async function POST(request: NextRequest) {
  try {
    console.log("🔄 [관리자] 사용자 정보 동기화 시작");

    // 구글 스프레드시트에서 직원 정보 조회
    const employeeDB = new EmployeeDatabase();
    const employees = await employeeDB.fetchEmployees();
    console.log(`📊 [관리자] 구글 스프레드시트 직원 정보: ${employees.length}명`);

    // 모든 사용자 조회
    const users = await prisma.user.findMany({
      select: {
        id: true,
        employeeId: true,
        name: true,
        department: true,
        position: true
      }
    });
    console.log(`👥 [관리자] Database 사용자: ${users.length}명`);

    let updatedCount = 0;
    let notFoundCount = 0;
    const updateResults = [];

    // 각 사용자별로 구글 스프레드시트 정보와 동기화
    for (const user of users) {
      const employeeInfo = employees.find(emp => emp.employeeId === user.employeeId);
      
      if (employeeInfo) {
        // 구글 스프레드시트 정보로 업데이트
        const updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: {
            name: employeeInfo.name,
            department: employeeInfo.lineTeam || employeeInfo.department || user.department,
            position: employeeInfo.position || user.position,
          }
        });

        updateResults.push({
          employeeId: user.employeeId,
          before: {
            name: user.name,
            department: user.department,
            position: user.position
          },
          after: {
            name: updatedUser.name,
            department: updatedUser.department,
            position: updatedUser.position
          },
          changed: user.name !== updatedUser.name || 
                  user.department !== updatedUser.department || 
                  user.position !== updatedUser.position
        });

        if (user.name !== updatedUser.name || 
            user.department !== updatedUser.department || 
            user.position !== updatedUser.position) {
          updatedCount++;
          console.log(`✅ [동기화] ${user.employeeId}: ${user.name} → ${updatedUser.name}`);
        }
      } else {
        notFoundCount++;
        updateResults.push({
          employeeId: user.employeeId,
          before: {
            name: user.name,
            department: user.department,
            position: user.position
          },
          after: null,
          changed: false,
          error: '구글 스프레드시트에서 찾을 수 없음'
        });
        console.warn(`⚠️ [동기화] ${user.employeeId} (${user.name}): 구글 스프레드시트에서 찾을 수 없음`);
      }
    }

    console.log(`✅ [관리자] 사용자 정보 동기화 완료: ${updatedCount}명 업데이트, ${notFoundCount}명 미발견`);

    return NextResponse.json({
      success: true,
      message: `사용자 정보 동기화 완료: ${updatedCount}명 업데이트`,
      stats: {
        totalUsers: users.length,
        totalEmployees: employees.length,
        updatedCount,
        notFoundCount
      },
      details: updateResults
    });

  } catch (error) {
    console.error("❌ [관리자] 사용자 정보 동기화 실패:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "사용자 정보 동기화 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * 동기화 상태 조회
 */
export async function GET(request: NextRequest) {
  try {
    console.log("📊 [관리자] 사용자 정보 동기화 상태 조회");

    // 구글 스프레드시트에서 직원 정보 조회
    const employeeDB = new EmployeeDatabase();
    const employees = await employeeDB.fetchEmployees();

    // 모든 사용자 조회
    const users = await prisma.user.findMany({
      select: {
        employeeId: true,
        name: true,
        department: true,
        position: true
      }
    });

    // 동기화 상태 분석
    const syncStatus = users.map(user => {
      const employeeInfo = employees.find(emp => emp.employeeId === user.employeeId);
      
      return {
        employeeId: user.employeeId,
        database: {
          name: user.name,
          department: user.department,
          position: user.position
        },
        spreadsheet: employeeInfo ? {
          name: employeeInfo.name,
          department: employeeInfo.lineTeam || employeeInfo.department,
          position: employeeInfo.position
        } : null,
        needsSync: employeeInfo ? (
          user.name !== employeeInfo.name ||
          user.department !== (employeeInfo.lineTeam || employeeInfo.department) ||
          user.position !== employeeInfo.position
        ) : false,
        found: !!employeeInfo
      };
    });

    const needsSyncCount = syncStatus.filter(s => s.needsSync).length;
    const notFoundCount = syncStatus.filter(s => !s.found).length;

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers: users.length,
        totalEmployees: employees.length,
        needsSyncCount,
        notFoundCount,
        syncedCount: users.length - needsSyncCount - notFoundCount
      },
      details: syncStatus
    });

  } catch (error) {
    console.error("❌ [관리자] 동기화 상태 조회 실패:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "동기화 상태 조회 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}





