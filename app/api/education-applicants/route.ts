import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/database'

// 언어 표시명 변환 함수
function getLanguageDisplayName(language: string): string {
  const languageMap: Record<string, string> = {
    'korean-english': '한영',
    'japanese': '일본어',
    'chinese': '중국어'
  };
  return languageMap[language] || language;
}

// 교육 차수의 시간 정보를 반환하는 함수 (데스크톱과 동일)
function getEducationSlotTime(slot: number, classType: string): string {
  if (classType === '1:1') {
    // 1:1 교육 (25분 단위, 16차수)
    const timeMap: Record<number, string> = {
      1: '08:30-08:55', 2: '09:00-09:25', 3: '09:30-09:55', 4: '10:00-10:25',
      5: '10:30-10:55', 6: '11:00-11:25', 7: '11:30-11:55', 8: '12:00-12:25',
      9: '13:35-14:00', 10: '14:05-14:30', 11: '14:35-15:00', 12: '15:05-15:30',
      13: '15:35-16:00', 14: '16:05-16:30', 15: '16:35-17:00', 16: '17:05-17:30'
    };
    return timeMap[slot] || '시간미정';
  } else if (classType === 'small-group') {
    // 소규모 교육 (2시간 단위, 4차수)
    const timeMap: Record<number, string> = {
      1: '08:30-10:20', 2: '10:30-12:20', 3: '13:40-15:30', 4: '15:40-17:30'
    };
    return timeMap[slot] || '시간미정';
  }
  return '시간미정';
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const requestedDate = searchParams.get('date');
  const includeCheckins = searchParams.get('includeCheckins') === 'true';

  try {
    console.log(`📋 [education-applicants] 신청 기록 기반 세션 조회 시작`, { requestedDate });

    // 교육 신청 기록 조회 (날짜 필터링 포함)
    const whereCondition: any = {
      schedule: {
        OR: [
          { classType: '1:1' },
          { classType: 'small' }
        ]
      },
      status: 'ACTIVE'
    };

    // 날짜 필터링이 요청된 경우 추가
    if (requestedDate) {
      whereCondition.schedule.date = requestedDate;
      console.log(`📋 [education-applicants] 날짜 필터링 적용: ${requestedDate}`);
    }

    const applications = await prisma.scheduleApplication.findMany({
      where: whereCondition,
      select: {
        id: true,
        slot: true,
        details: true, // language, mode, category 정보가 details에 있음
        schedule: true,
        user: {
          select: {
            name: true,
            employeeId: true,
            department: true
          }
        }
      },
      orderBy: [
        { schedule: { date: 'asc' } },
        { slot: 'asc' }
      ]
    }).catch(error => {
      console.error('📋 [education-applicants] Database 조회 실패:', error);
      throw new Error(`Database 조회 실패: ${error.message}`);
    });

    // 체크인 정보 조회 (테이블이 없으면 빈 맵 사용)
    let checkinMap = new Map();
    let checkinTimeMap = new Map();
    try {
      const checkins = await prisma.educationCheckin.findMany({
        where: {
          requestId: {
            in: applications.map(app => app.id)
          }
        }
      });
      
      checkins.forEach(checkin => {
        checkinMap.set(checkin.requestId, checkin.status === 'CHECKED_IN');
        if (checkin.checkinTime) {
          checkinTimeMap.set(checkin.requestId, checkin.checkinTime);
        }
      });
    } catch (error) {
      console.warn('체크인 테이블을 찾을 수 없습니다. 모든 체크인 상태를 false로 설정합니다.');
      // 체크인 테이블이 없으면 모든 체크인 상태를 false로 설정
    }

    console.log(`📋 [education-applicants] 찾은 신청 데이터: ${applications.length}건`);

    // 신청 데이터를 그룹화하여 세션 생성
    const sessionMap = new Map();

    applications.forEach(app => {
      const schedule = app.schedule;
      // details에서 정보 추출
      const language = app.details?.language || schedule.type;
      const educationType = app.details?.educationType || (schedule.classType === 'small' ? 'small-group' : '1:1');
      
      // educationType을 표시용으로 변환
      const classType = educationType === 'small-group' ? '소규모' : '1:1';
      
      // slot은 이미 교육 차수임 (변환 불필요)
      const educationSlot = app.slot;

      console.log(`📋 [education-applicants] 처리 중: ${app.user.name}, slot: ${app.slot}, educationType: ${educationType}, classType: ${classType}`);
      console.log(`📋 [education-applicants] 원본 데이터:`, {
        scheduleClassType: schedule.classType,
        detailsEducationType: app.details?.educationType,
        detailsLanguage: app.details?.language,
        scheduleType: schedule.type,
        finalClassType: classType
      });

      const key = `${schedule.date}-${language}-${classType}-${educationSlot}`;

      if (!sessionMap.has(key)) {
        sessionMap.set(key, {
          date: schedule.date,
          sessionNumber: educationSlot,
          slotTime: getEducationSlotTime(educationSlot, educationType),
          applicants: [],
          language: getLanguageDisplayName(language),
          classType: classType
        });
      }

      const session = sessionMap.get(key);
      
      // 중복 신청자 확인 (같은 employeeId가 이미 있는지 체크)
      const existingApplicant = session.applicants.find(applicant => 
        applicant.employeeId === (app.user.employeeId || '사번없음')
      );
      
      if (!existingApplicant) {
        session.applicants.push({
          name: app.user.name || '이름없음',
          employeeId: app.user.employeeId || '사번없음',
          status: '신청완료',
          applicationId: app.id, // 구글 미트 생성을 위한 applicationId 추가
          isCheckedIn: checkinMap.get(app.id) || false, // 체크인 상태 추가
          googleMeetLink: app.details?.googleMeetLink || null // details에서 구글 미트 링크 추가
        });
        console.log(`📋 [education-applicants] ${educationSlot}차수 신청자 추가: ${app.user.name} (${app.user.employeeId})`);
      } else {
        console.log(`📋 [education-applicants] 중복 신청자 제외: ${app.user.name} (${app.user.employeeId}) - 이미 ${educationSlot}차수에 등록됨`);
      }
    });

    // Map에서 educationSessions로 변환
    const educationSessions = Array.from(sessionMap.values()).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.classType !== b.classType) return a.classType.localeCompare(b.classType);
      return a.sessionNumber - b.sessionNumber;
    });

    // 사용 가능한 날짜 목록 조회 (신청 기록이 있는 날짜만)
    const availableDates = await prisma.scheduleApplication.findMany({
      where: {
        schedule: {
          OR: [
            { classType: '1:1' },
            { classType: 'small' }
          ]
        },
        status: 'ACTIVE'
      },
      select: {
        schedule: {
          select: {
            date: true
          }
        }
      },
      distinct: ['scheduleId'],
      orderBy: {
        schedule: {
          date: 'asc'
        }
      }
    });

    // 날짜들을 중복 제거하고 정렬 (최신순)
    const uniqueDates = [...new Set(availableDates.map(app => app.schedule.date))]
      .sort((a, b) => b.localeCompare(a));

    // 초기 날짜 선택 로직 개선
    let selectedDate = requestedDate;
    if (!selectedDate && uniqueDates.length > 0) {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 형식
      
      // 1. 오늘 날짜에 신청자가 있는지 확인
      if (uniqueDates.includes(today)) {
        selectedDate = today;
        console.log(`📋 [education-applicants] 오늘 날짜로 설정: ${selectedDate}`);
      } else {
        // 2. 오늘 이후의 가장 가까운 미래 날짜 찾기
        const futureDates = uniqueDates.filter(date => date > today);
        if (futureDates.length > 0) {
          // 최신순 목록에서 가장 가까운 미래 날짜는 마지막
          selectedDate = futureDates[futureDates.length - 1];
          console.log(`📋 [education-applicants] 미래 가장 가까운 날짜로 설정: ${selectedDate}`);
        } else {
          // 3. 미래 날짜가 없으면 가장 최근 날짜 (최신순이므로 첫 번째)
          selectedDate = uniqueDates[0];
          console.log(`📋 [education-applicants] 가장 최근 날짜로 설정: ${selectedDate}`);
        }
      }
    }

    console.log(`📋 [education-applicants] 생성된 세션 수: ${educationSessions.length}`);
    console.log(`📋 [education-applicants] 사용 가능한 날짜 수: ${uniqueDates.length}`);

    // 교육 관리 모달용 응답 형식 (includeCheckins=true인 경우)
    if (includeCheckins) {
      const applicants = applications.map(app => {
        const schedule = app.schedule;
        const language = app.details?.language || schedule.type;
        const educationType = app.details?.educationType || (schedule.classType === 'small' ? 'small-group' : '1:1');
        
        return {
          id: app.id,
          name: app.user.name || '이름없음',
          employeeId: app.user.employeeId || '사번없음',
          department: app.user.department || '',
          date: schedule.date,
          slot: app.slot,
          details: {
            language: language,
            mode: educationType,
            category: app.details?.category
          },
          isCheckedIn: checkinMap.get(app.id) || false,
          checkinTime: checkinTimeMap.get(app.id) || null,
          googleMeetLink: app.details?.googleMeetLink || null,
          classroomInfo: schedule.classroom || '',
          location: schedule.classroom || ''
        };
      });

      return NextResponse.json({
        success: true,
        applicants: applicants,
        selectedDate: selectedDate,
        source: 'database'
      });
    }

    // 기존 응답 형식 (educationSessions)
    return NextResponse.json({
      educationSessions,
      dates: uniqueDates,
      selectedDate: selectedDate,
      source: 'database'
    });

  } catch (error) {
    console.error("📋 [education-applicants] 전체 프로세스 실패:", error);
    console.error("📋 [education-applicants] 오류 스택:", error instanceof Error ? error.stack : 'No stack trace');
    
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json({ 
      error: "교육 신청 목록 로드 실패", 
      details: errorMessage,
      requestedDate: requestedDate 
    }, { status: 500 });
  }
}