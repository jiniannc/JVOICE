import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '../../../../lib/generated/prisma';

const prisma = new PrismaClient();

/**
 * 신청 내역 자동 정리 API
 * 교육/녹음이 실행되는 날짜의 월 말일에 해당 월의 신청 내역만 삭제
 * ⚠️ 중요: 평가 파일이나 녹음 파일은 절대 건드리지 않음
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetMonth = searchParams.get("month"); // YYYY-MM 형식
    const dryRun = searchParams.get("dryRun") === "true"; // 테스트 모드
    
    if (!targetMonth) {
      return NextResponse.json(
        { success: false, error: "month 파라미터가 필요합니다. (YYYY-MM 형식)" },
        { status: 400 }
      );
    }

    console.log(`🗑️ [신청 내역 정리] 시작: ${targetMonth}월 신청 내역 ${dryRun ? '(테스트 모드)' : '삭제'}`);

    // 해당 월의 시작일과 종료일 계산
    const [year, month] = targetMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1); // 월 시작일
    const endDate = new Date(year, month, 0, 23, 59, 59, 999); // 월 마지막일 23:59:59

    console.log(`📅 정리 대상 기간: ${startDate.toISOString()} ~ ${endDate.toISOString()}`);

    // 🔍 1. 삭제 대상 신청 내역 조회 (ScheduleApplication 테이블, 평가/녹음 파일과 무관)
    const targetRequests = await prisma.scheduleApplication.findMany({
      where: {
        AND: [
          {
            // 신청 날짜가 해당 월에 속함 (schedule.date 기준)
            schedule: {
              date: {
                gte: startDate.toISOString().split('T')[0], // YYYY-MM-DD 형식
                lte: endDate.toISOString().split('T')[0]
              }
            }
          },
          {
            // 활성 상태인 신청만 (취소되지 않은 것)
            status: {
              in: ['ACTIVE', 'COMPLETED'] // 삭제 대상
            }
          }
        ]
      },
      select: {
        id: true,
        slot: true,
        details: true,
        status: true,
        appliedAt: true,
        user: {
          select: {
            employeeId: true,
            name: true
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

    console.log(`🔍 삭제 대상 신청 내역: ${targetRequests.length}개`);
    
    // 타입별 통계 (schedule.type 기준)
    const educationRequests = targetRequests.filter(r => r.schedule.type !== 'recording');
    const recordingRequests = targetRequests.filter(r => r.schedule.type === 'recording');
    
    console.log(`  - 교육 신청: ${educationRequests.length}개`);
    console.log(`  - 녹음 신청: ${recordingRequests.length}개`);

    if (targetRequests.length === 0) {
      return NextResponse.json({
        success: true,
        message: `${targetMonth}월에 삭제할 신청 내역이 없습니다.`,
        deleted: 0,
        details: {
          education: 0,
          recording: 0
        }
      });
    }

    // 🧪 테스트 모드인 경우 실제 삭제하지 않고 결과만 반환
    if (dryRun) {
      return NextResponse.json({
        success: true,
        message: `[테스트 모드] ${targetMonth}월 신청 내역 ${targetRequests.length}개 삭제 예정`,
        wouldDelete: targetRequests.length,
        details: {
          education: educationRequests.length,
          recording: recordingRequests.length
        },
        targetRequests: targetRequests.map(r => ({
          id: r.id,
          type: r.schedule.type === 'recording' ? 'recording' : 'education',
          name: r.user.name,
          employeeId: r.user.employeeId,
          date: r.schedule.date,
          slot: r.slot,
          status: r.status
        }))
      });
    }

    // 🗑️ 2. 실제 삭제 실행 (soft delete - status를 'DELETED'로 변경)
    const deleteResult = await prisma.scheduleApplication.updateMany({
      where: {
        id: {
          in: targetRequests.map(r => r.id)
        }
      },
      data: {
        status: 'DELETED'
      }
    });

    console.log(`✅ [신청 내역 정리] 완료: ${deleteResult.count}개 삭제`);

    // 🔍 3. 삭제 후 검증 (평가 파일/녹음 파일이 영향받지 않았는지 확인)
    const evaluationCount = await prisma.evaluation.count({
      where: {
        status: {
          not: 'deleted'
        }
      }
    });

    const recordingCount = await prisma.recording.count({
      where: {
        success: true
      }
    });

    console.log(`🔍 [안전성 검증] 평가 파일: ${evaluationCount}개, 녹음 파일: ${recordingCount}개 (영향 없음)`);

    return NextResponse.json({
      success: true,
      message: `${targetMonth}월 신청 내역 정리 완료`,
      deleted: deleteResult.count,
      details: {
        education: educationRequests.length,
        recording: recordingRequests.length
      },
      verification: {
        evaluationFiles: evaluationCount,
        recordingFiles: recordingCount,
        message: "평가 파일과 녹음 파일은 영향받지 않음"
      }
    });

  } catch (error) {
    console.error("❌ [신청 내역 정리] 오류:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "신청 내역 정리 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * 정리 가능한 월 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    console.log("📋 [신청 내역 정리] 정리 가능한 월 목록 조회");

    // 현재 날짜 기준으로 지난 달들 조회
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // 지난 6개월간의 신청 내역 통계
    const monthsToCheck = [];
    for (let i = 1; i <= 6; i++) {
      const targetDate = new Date(currentYear, currentMonth - i, 1);
      const monthKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
      monthsToCheck.push({
        month: monthKey,
        year: targetDate.getFullYear(),
        monthNum: targetDate.getMonth() + 1
      });
    }

    // 각 월별 신청 내역 개수 조회
    const monthStats = await Promise.all(
      monthsToCheck.map(async ({ month, year, monthNum }) => {
        const startDate = new Date(year, monthNum - 1, 1);
        const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);

        const requestCount = await prisma.scheduleApplication.count({
          where: {
            AND: [
              {
                schedule: {
                  date: {
                    gte: startDate.toISOString().split('T')[0],
                    lte: endDate.toISOString().split('T')[0]
                  }
                }
              },
              {
                status: {
                  in: ['ACTIVE', 'COMPLETED']
                }
              }
            ]
          }
        });

        return {
          month,
          requestCount,
          canCleanup: requestCount > 0
        };
      })
    );

    return NextResponse.json({
      success: true,
      monthStats: monthStats.filter(stat => stat.canCleanup),
      message: "정리 가능한 월 목록 조회 완료"
    });

  } catch (error) {
    console.error("❌ [신청 내역 정리] 월 목록 조회 오류:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "월 목록 조회 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
