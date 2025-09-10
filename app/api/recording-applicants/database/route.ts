import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '../../../../lib/generated/prisma';

const prisma = new PrismaClient();

function formatTodayKR(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  return `${y}년 ${m}월 ${d}일`;
}

// 'YYYY년 M월 D일' 형태를 'YYYY-MM-DD' 형태로 변환
function koreanDateToISO(koreanDate: string): string | null {
  const m = koreanDate.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  return `${y}-${mo.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
}

// 'YYYY-MM-DD' 형태를 'YYYY년 M월 D일' 형태로 변환
function isoToKoreanDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${y}년 ${parseInt(m, 10)}월 ${parseInt(d, 10)}일`;
}

function parseBatchOrder(batchStr: string | undefined): number {
  if (!batchStr) return Number.MAX_SAFE_INTEGER;
  // slot 숫자를 차수로 변환
  const slot = parseInt(batchStr.toString(), 10);
  if (!isNaN(slot)) return slot;
  
  // 기존 '차수' 형태도 지원
  const match = batchStr.match(/(\d+)\s*차/);
  if (match) return parseInt(match[1], 10);
  return Number.MAX_SAFE_INTEGER;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedDate = searchParams.get("date") || undefined;
    
    console.log('📋 [recording-applicants/database] 조회 요청:', { requestedDate });

    // 1) 데이터베이스에서 녹음 신청 데이터 조회
    let targetDate: string | null = null;

    if (requestedDate) {
      // 한국어 날짜 형태를 ISO 형태로 변환
      targetDate = koreanDateToISO(requestedDate);
      if (!targetDate) {
        // 이미 ISO 형태라면 그대로 사용
        targetDate = requestedDate;
      }
    }

    // 모든 녹음 신청의 날짜 목록 조회 (중복 제거)
    const allApplications = await prisma.scheduleApplication.findMany({
      where: {
        schedule: {
          type: 'recording'
        },
        status: 'ACTIVE'
      },
      include: {
        schedule: {
          select: {
            date: true
          }
        },
        user: {
          select: {
            name: true,
            employeeId: true,
            email: true
          }
        }
      },
      orderBy: [
        { schedule: { date: 'desc' } },
        { slot: 'asc' },
        { user: { employeeId: 'asc' } }
      ]
    });

    // 날짜 목록 추출 (중복 제거, 한국어 형태로 변환)
    const uniqueDates = [...new Set(allApplications.map(app => app.schedule.date))];
    const koreanDates = uniqueDates
      .map(date => isoToKoreanDate(date))
      .sort((a, b) => {
        const timeA = koreanDateToISO(a);
        const timeB = koreanDateToISO(b);
        if (!timeA || !timeB) return 0;
        return new Date(timeB).getTime() - new Date(timeA).getTime(); // 내림차순 (최신 먼저)
      });

    // 기본 선택 날짜 결정
    const today = formatTodayKR();
    const selectedDate = requestedDate && koreanDates.includes(requestedDate)
      ? requestedDate
      : (koreanDates.includes(today) ? today : (koreanDates[0] || ""));

    if (!selectedDate) {
      console.log('📋 [recording-applicants/database] 선택된 날짜 없음');
      return NextResponse.json({ 
        applicants: [], 
        dates: koreanDates, 
        selectedDate: null 
      });
    }

    // 선택된 날짜의 ISO 형태 변환
    const selectedISODate = koreanDateToISO(selectedDate);
    if (!selectedISODate) {
      console.log('📋 [recording-applicants/database] 날짜 변환 실패:', selectedDate);
      return NextResponse.json({ 
        applicants: [], 
        dates: koreanDates, 
        selectedDate 
      });
    }

    console.log('📋 [recording-applicants/database] 선택된 날짜:', { selectedDate, selectedISODate });

    // 2) 선택된 날짜의 녹음 신청자 조회
    const dayApplications = await prisma.scheduleApplication.findMany({
      where: {
        schedule: {
          date: selectedISODate,
          type: 'recording'
        },
        status: 'ACTIVE'
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
            employeeId: true,
            email: true
          }
        }
      },
      orderBy: [
        { slot: 'asc' },
        { user: { employeeId: 'asc' } }
      ]
    });

    // 3) 응답 형태 변환 (기존 API와 호환)
    const applicants = dayApplications.map(app => {
      // details에서 언어 정보 추출
      const details = app.details as any;
      const language = details?.recordingLanguage || 'korean-english';
      
      return {
        name: app.user.name,
        employeeId: app.user.employeeId,
        email: app.user.email || '',
        language: language,
        batch: app.slot.toString(), // slot을 차수로 표시
        status: '신청완료' // Database에 있는 것은 모두 신청완료 상태
      };
    });

    // 정렬: 차수(슬롯) 오름차순 → 사번 오름차순
    applicants.sort((a, b) => {
      const ba = parseBatchOrder(a.batch);
      const bb = parseBatchOrder(b.batch);
      if (ba !== bb) return ba - bb;
      return (a.employeeId || "").localeCompare(b.employeeId || "");
    });

    console.log(`📋 [recording-applicants/database] 조회 완료: ${applicants.length}명 (날짜: ${selectedDate})`);

    return NextResponse.json({
      applicants,
      dates: koreanDates,
      selectedDate,
      meta: {
        source: 'database',
        totalApplications: applicants.length,
        targetDate: selectedISODate
      }
    });

  } catch (error) {
    console.error("❌ [recording-applicants/database] 조회 실패:", error);
    return NextResponse.json({ 
      error: "데이터베이스 조회 중 오류가 발생했습니다.",
      source: 'database' 
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

