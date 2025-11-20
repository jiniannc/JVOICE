import { NextRequest, NextResponse } from "next/server";
import { prisma } from '../../../lib/database';
import { EmployeeDatabase } from '../../../lib/employee-database';

const SPREADSHEET_ID = "1ge3OQ5lbpuB-rjiBafg44HkcZJlNqgHY_9GzfJZ8CgM";
const employeeDB = new EmployeeDatabase();

function formatTodayKR(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  return `${y}년 ${m}월 ${d}일`;
}

// 'YYYY년 M월 D일' 또는 'YYYY년M월D일' 형태를 실제 날짜 값으로 변환
function titleToTime(title: string): number {
  const m = title.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (!m) return Number.NEGATIVE_INFINITY;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const d = parseInt(m[3], 10);
  return new Date(y, mo, d).getTime();
}

function sortDateTitlesDesc(titles: string[]): string[] {
  return titles.slice().sort((a, b) => titleToTime(b) - titleToTime(a));
}

function parseBatchOrder(batchStr: string | undefined): number {
  if (!batchStr) return Number.MAX_SAFE_INTEGER;
  const match = batchStr.match(/(\d+)\s*차/);
  if (match) return parseInt(match[1], 10);
  return Number.MAX_SAFE_INTEGER;
}

function cleanName(raw: string | undefined): string {
  const s = (raw || '').toString();
  const idx = s.indexOf('[');
  return (idx >= 0 ? s.slice(0, idx) : s).trim();
}

// 언어 코드를 한국어로 변환
function getLanguageDisplayName(language: string): string {
  const languageMap: Record<string, string> = {
    'korean-english': '한영',
    'japanese': '일본어',
    'chinese': '중국어'
  };
  return languageMap[language] || language;
}

// 녹음용 차수별 시간 정보 - 데스크톱 녹음 캘린더와 완전히 동일
function getRecordingSlotTime(slot: number): string {
  const times: Record<number, string> = {
    1: "08:30-09:20",
    2: "09:30-10:20", 
    3: "10:30-11:20",
    4: "11:30-12:20",
    5: "13:40-14:30",
    6: "14:40-15:30",
    7: "15:40-16:30",
    8: "16:40-17:30"
  };
  return times[slot] || `${slot}차수`;
}

// 차수 + 시간 형태로 표시
function formatBatchDisplay(slot: number): string {
  const timeRange = getRecordingSlotTime(slot);
  return `${slot}차수 (${timeRange})`;
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

async function loadFromDatabase(requestedDate?: string) {
  try {
    console.log('📋 [recording-applicants] Database에서 조회 시작:', { requestedDate });

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

    if (allApplications.length === 0) {
      console.log('📋 [recording-applicants] Database에 데이터 없음');
      return null;
    }

    // 날짜 목록 추출 (중복 제거, 한국어 형태로 변환)
    const uniqueDates = [...new Set(allApplications.map(app => app.schedule.date))];
    const koreanDates = uniqueDates
      .map(date => isoToKoreanDate(date))
      .sort((a, b) => {
        const timeA = koreanDateToISO(a);
        const timeB = koreanDateToISO(b);
        if (!timeA || !timeB) return 0;
        return new Date(timeB).getTime() - new Date(timeA).getTime(); // 내림차순 (최신순)
      });

    // 기본 선택 날짜 결정 - 교육 신청자 목록과 동일한 로직
    const today = formatTodayKR();
    let selectedDate = requestedDate && koreanDates.includes(requestedDate) ? requestedDate : null;
    
    if (!selectedDate) {
      // 1. 오늘 날짜에 신청자가 있는지 확인
      if (koreanDates.includes(today)) {
        selectedDate = today;
        console.log(`📋 [recording-applicants] 오늘 날짜로 설정: ${selectedDate}`);
      } else {
        // 2. 오늘 이후의 가장 가까운 미래 날짜 찾기
        const todayISO = koreanDateToISO(today);
        if (todayISO) {
          const futureDates = koreanDates.filter(date => {
            const dateISO = koreanDateToISO(date);
            return dateISO && dateISO > todayISO;
          });
          if (futureDates.length > 0) {
            // 최신순 목록에서 가장 가까운 미래 날짜는 마지막
            selectedDate = futureDates[futureDates.length - 1];
            console.log(`📋 [recording-applicants] 미래 가장 가까운 날짜로 설정: ${selectedDate}`);
          } else {
            // 3. 미래 날짜가 없으면 가장 최근 날짜 (최신순이므로 첫 번째)
            selectedDate = koreanDates[0] || "";
            console.log(`📋 [recording-applicants] 가장 최근 날짜로 설정: ${selectedDate}`);
          }
        } else {
          selectedDate = koreanDates[0] || "";
          console.log(`📋 [recording-applicants] 첫 번째 날짜로 설정: ${selectedDate}`);
        }
      }
    }

    if (!selectedDate) {
      console.log('📋 [recording-applicants] 선택된 날짜 없음');
      return {
        applicants: [],
        dates: koreanDates,
        selectedDate: null
      };
    }

    // 선택된 날짜의 ISO 형태 변환
    const selectedISODate = koreanDateToISO(selectedDate);
    if (!selectedISODate) {
      console.log('📋 [recording-applicants] 날짜 변환 실패:', selectedDate);
      return {
        applicants: [],
        dates: koreanDates,
        selectedDate
      };
    }

    // 선택된 날짜의 녹음 신청자 조회
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
            id: true, // ✅ userId 매칭을 위해 필수
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

    // 모든 직원 정보를 미리 가져오기
    console.log('👥 [recording-applicants] 직원 정보 로딩 중...');
    const allEmployees = await employeeDB.fetchEmployees();
    const employeeMap = new Map();
    allEmployees.forEach(emp => {
      employeeMap.set(emp.employeeId, emp);
      employeeMap.set(emp.email, emp);
    });
    console.log(`👥 [recording-applicants] 직원 정보 로딩 완료: ${allEmployees.length}명`);

    // 해당 날짜의 시작과 끝 시간 계산 (한국 시간 기준) - 여기서 정의!
    const startOfDay = new Date(`${selectedISODate}T00:00:00+09:00`);
    const endOfDay = new Date(`${selectedISODate}T23:59:59+09:00`);

    // 응답 형태 변환 (기존 API와 호환)
    const applicants = await Promise.all(dayApplications.map(async (app) => {
      // details에서 언어 정보 추출
      const details = app.details as any;
      const language = details?.recordingLanguage || 'korean-english';
      
      // 정확한 직원 정보 찾기 (사번 우선, 이메일 fallback)
      let employeeInfo = employeeMap.get(app.user.employeeId);
      if (!employeeInfo && app.user.email) {
        employeeInfo = employeeMap.get(app.user.email);
      }
      
      // 직원 정보가 있으면 사용, 없으면 Database의 user 정보 사용
      const displayName = employeeInfo?.name || app.user.name || '이름없음';
      const displayEmployeeId = employeeInfo?.employeeId || app.user.employeeId || '사번없음';
      const displayEmail = employeeInfo?.email || app.user.email || '';
      
      // 해당 날짜에 출석 여부 확인
      let hasAttended = false;
      let attendedAt = null;

      try {
        const checkin = await prisma.recordingCheckin.findFirst({
          where: {
            employeeId: displayEmployeeId,
            language: language,
            checkinDate: {
              gte: startOfDay,
              lte: endOfDay
            }
          },
          select: {
            id: true,
            checkinDate: true,
            status: true
          },
          orderBy: {
            checkinDate: 'desc'
          }
        });

        hasAttended = !!checkin;
        attendedAt = checkin?.checkinDate;

        if (hasAttended) {
          console.log(`✅ [recording-applicants] ${displayName} (${displayEmployeeId}) - ${language}: 출석 완료 (${attendedAt?.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })})`);
        }
      } catch (checkinError) {
        console.error(`⚠️ [recording-applicants] RecordingCheckin 조회 실패 (${displayName}):`, checkinError);
      }

      // 해당 날짜에 제출된 Evaluation 확인
      let hasSubmitted = false;
      let submittedAt = null;

      // app.user.id가 있을 때만 Evaluation 조회
      if (app.user.id) {
        try {
          console.log(`🔍 [recording-applicants] ${displayName} Evaluation 조회:`, {
            userId: app.user.id,
            language: language,
            startOfDay: startOfDay.toISOString(),
            endOfDay: endOfDay.toISOString()
          });

          const evaluation = await prisma.evaluation.findFirst({
            where: {
              userId: app.user.id, // user.id (CUID) 사용
              language: language,
              submittedAt: {
                gte: startOfDay,
                lte: endOfDay
              }
            },
            select: {
              id: true,
              submittedAt: true,
              status: true
            },
            orderBy: {
              submittedAt: 'desc'
            }
          });

          hasSubmitted = !!evaluation;
          submittedAt = evaluation?.submittedAt;

          if (hasSubmitted) {
            console.log(`✅ [recording-applicants] ${displayName} (${displayEmployeeId}) - ${language}: 제출 완료 (${submittedAt?.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })})`);
          } else {
            // 제출 안 한 경우, 해당 사용자의 모든 Evaluation 조회
            const allEvals = await prisma.evaluation.findMany({
              where: { userId: app.user.id, language: language },
              select: { id: true, submittedAt: true },
              orderBy: { submittedAt: 'desc' },
              take: 3
            });
            console.log(`⚠️ [recording-applicants] ${displayName} (${displayEmployeeId}) - ${language}: 제출 안 함. 최근 제출 내역 ${allEvals.length}건:`, 
              allEvals.map(e => e.submittedAt?.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }))
            );
          }
        } catch (evalError) {
          console.error(`⚠️ [recording-applicants] Evaluation 조회 실패 (${displayName}):`, evalError);
          // 에러 발생해도 계속 진행
        }
      } else {
        console.log(`⚠️ [recording-applicants] ${displayName} (${displayEmployeeId}): user.id 없음`);
      }
      
      return {
        name: displayName,
        employeeId: displayEmployeeId,
        email: displayEmail,
        language: getLanguageDisplayName(language), // 한국어로 표시
        batch: formatBatchDisplay(app.slot), // "3차수 (09:30-09:55)" 형태
        status: '신청완료', // Database에 있는 것은 모두 신청완료 상태
        hasAttended, // 출석 완료 여부
        attendedAt, // 출석 시간
        hasSubmitted, // 제출 완료 여부
        submittedAt // 제출 시간
      };
    }));

    // 정렬: 차수(슬롯) 오름차순 → 사번 오름차순
    applicants.sort((a, b) => {
      const ba = parseBatchOrder(a.batch);
      const bb = parseBatchOrder(b.batch);
      if (ba !== bb) return ba - bb;
      return (a.employeeId || "").localeCompare(b.employeeId || "");
    });

    console.log(`📋 [recording-applicants] Database 조회 완료: ${applicants.length}명 (날짜: ${selectedDate})`);

    return {
      applicants,
      dates: koreanDates,
      selectedDate,
      source: 'database'
    };

  } catch (error: any) {
    console.error("❌ [recording-applicants] Database 조회 실패:", error);
    console.error("❌ [recording-applicants] 에러 상세:", {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack?.split('\n').slice(0, 3).join('\n')
    });
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedDate = searchParams.get("date") || undefined;

    // Database 우선 시도
    console.log('🔍 [recording-applicants] Database 조회 시도...');
    const databaseResult = await loadFromDatabase(requestedDate);
    if (databaseResult) {
      console.log('✅ [recording-applicants] Database에서 성공');
      return NextResponse.json(databaseResult);
    }

    // Google Sheets API 사용 (fallback)
    console.log('🔄 [recording-applicants] Database 조회 실패 → Google Sheets로 fallback');

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Google API Key 미설정" }, { status: 500 });
    }

    // 1) 시트(탭) 목록 가져오기
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties(title)&key=${apiKey}`,
      { cache: "no-store" }
    );
    if (!metaRes.ok) {
      const text = await metaRes.text();
      return NextResponse.json({ error: `시트 메타 로드 실패: ${text}` }, { status: metaRes.status });
    }
    const meta = await metaRes.json();
    const allTitles: string[] = (meta.sheets || [])
      .map((s: any) => s.properties?.title)
      .filter(Boolean);

    // 날짜 형태의 시트만 필터 (예: 2025년8월11일 또는 2025년 8월 11일)
    const dateTitles = allTitles.filter((t) => /\d{4}년\s*\d{1,2}월\s*\d{1,2}일/.test(t));
    const sortedDatesDesc = sortDateTitlesDesc(dateTitles);

    // 기본 선택 날짜 결정: 요청값 → 오늘 → 가장 최근(사전순 마지막)
    const today = formatTodayKR();
    const selectedDate = requestedDate && dateTitles.includes(requestedDate)
      ? requestedDate
      : (dateTitles.includes(today) ? today : (sortedDatesDesc[0] || ""));

    if (!selectedDate) {
      return NextResponse.json({ applicants: [], dates: sortedDatesDesc, selectedDate: null });
    }

    // 2) 선택 날짜 시트에서 데이터 가져오기
    const encodedTitle = encodeURIComponent(selectedDate);
    const valuesRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodedTitle}!A1:Z1000?key=${apiKey}`,
      { cache: "no-store" }
    );
    if (!valuesRes.ok) {
      const text = await valuesRes.text();
      return NextResponse.json({ error: `시트 데이터 로드 실패: ${text}` }, { status: valuesRes.status });
    }
    const valuesJson = await valuesRes.json();
    const rows: string[][] = valuesJson.values || [];
    if (rows.length === 0) {
      return NextResponse.json({ applicants: [], dates: sortedDatesDesc, selectedDate });
    }

    const header = rows[0].map((h: any) => (h || "").toString().trim());
    const findIndexFlexible = (candidates: string[], patterns: RegExp[] = []) => {
      for (const label of candidates) {
        const i = header.findIndex((h: string) => h === label);
        if (i >= 0) return i;
      }
      for (const p of patterns) {
        const i = header.findIndex((h: string) => p.test(h));
        if (i >= 0) return i;
      }
      return -1;
    };
    const idxName = findIndexFlexible(["이름"], [/이름/]);
    const idxEmp = findIndexFlexible(["사번"], [/사번/]);
    const idxEmail = findIndexFlexible(["이메일", "Email", "email"], [/이메일/i, /email/i]);
    const idxLang = findIndexFlexible([
      "교육/녹음 언어",
      "교육 / 녹음 언어",
      "녹음 언어",
      "교육 언어",
      "언어",
    ], [/언어/]);
    const idxBatch = findIndexFlexible(["차수"], [/차수/]);
    const idxStatus = findIndexFlexible(["상태"], [/상태/]);

    const dataRows = rows.slice(1).filter((r) => r.some((c) => (c || "").toString().trim() !== ""));

    // 직원 정보 로딩 (Google Sheets fallback에서도 사용)
    console.log('👥 [recording-applicants] Google Sheets - 직원 정보 로딩 중...');
    const allEmployees = await employeeDB.fetchEmployees();
    const employeeMap = new Map();
    allEmployees.forEach(emp => {
      employeeMap.set(emp.employeeId, emp);
      employeeMap.set(emp.email, emp);
      // 이름으로도 매칭 (같은 이름이 여러 명일 수 있으니 주의)
      if (emp.name) {
        employeeMap.set(emp.name, emp);
      }
    });
    console.log(`👥 [recording-applicants] 직원 정보 로딩 완료: ${allEmployees.length}명`);

    // 날짜 범위 계산 (Google Sheets fallback에서도 사용)
    const selectedISODate = koreanDateToISO(selectedDate);
    const startOfDay = selectedISODate ? new Date(`${selectedISODate}T00:00:00+09:00`) : null;
    const endOfDay = selectedISODate ? new Date(`${selectedISODate}T23:59:59+09:00`) : null;

    let applicants = await Promise.all(dataRows.map(async (r) => {
      const rawName = cleanName((r[idxName] || "").toString().trim());
      const rawEmployeeId = (r[idxEmp] || "").toString().trim();
      const rawEmail = (idxEmail >= 0 ? (r[idxEmail] || "").toString().trim() : "");
      const rawLanguage = (r[idxLang] || "").toString().trim();
      const rawBatch = (r[idxBatch] || "").toString().trim();
      const rawStatus = (idxStatus >= 0 ? (r[idxStatus] || "").toString().trim() : "");
      
      // 정확한 직원 정보 찾기 (사번 우선, 이메일 fallback, 이름 fallback)
      let employeeInfo = employeeMap.get(rawEmployeeId);
      if (!employeeInfo && rawEmail) {
        employeeInfo = employeeMap.get(rawEmail);
      }
      if (!employeeInfo && rawName) {
        employeeInfo = employeeMap.get(rawName);
      }
      
      // 직원 정보가 있으면 사용, 없으면 원본 데이터 사용
      const displayName = employeeInfo?.name || rawName || '이름없음';
      const displayEmployeeId = employeeInfo?.employeeId || rawEmployeeId || '사번없음';
      const displayEmail = employeeInfo?.email || rawEmail || '';
      
      // 언어와 차수 표시 개선
      const displayLanguage = getLanguageDisplayName(rawLanguage);
      const batchNumber = parseInt(rawBatch) || 0;
      const displayBatch = batchNumber > 0 ? formatBatchDisplay(batchNumber) : rawBatch;
      
      // 언어 코드 변환 (한글 → 코드)
      let languageCode = rawLanguage;
      if (rawLanguage?.includes('한')) languageCode = 'korean-english';
      else if (rawLanguage?.includes('일')) languageCode = 'japanese';
      else if (rawLanguage?.includes('중')) languageCode = 'chinese';

      // 해당 날짜에 출석 여부 확인
      let hasAttended = false;
      let attendedAt = null;

      if (startOfDay && endOfDay && displayEmployeeId !== '사번없음') {
        try {
          const checkin = await prisma.recordingCheckin.findFirst({
            where: {
              employeeId: displayEmployeeId,
              language: languageCode,
              checkinDate: {
                gte: startOfDay,
                lte: endOfDay
              }
            },
            select: {
              id: true,
              checkinDate: true,
              status: true
            },
            orderBy: {
              checkinDate: 'desc'
            }
          });

          hasAttended = !!checkin;
          attendedAt = checkin?.checkinDate;

          if (hasAttended) {
            console.log(`✅ [recording-applicants] Google Sheets - ${displayName} (${displayEmployeeId}) - ${languageCode}: 출석 완료`);
          }
        } catch (checkinError) {
          console.error(`⚠️ [recording-applicants] Google Sheets - RecordingCheckin 조회 실패 (${displayName}):`, checkinError);
        }
      }

      // 해당 날짜에 제출된 Evaluation 확인
      let hasSubmitted = false;
      let submittedAt = null;

      if (startOfDay && endOfDay && displayEmployeeId !== '사번없음') {
        try {
          const evaluation = await prisma.evaluation.findFirst({
            where: {
              user: {
                employeeId: displayEmployeeId
              },
              language: languageCode,
              submittedAt: {
                gte: startOfDay,
                lte: endOfDay
              }
            },
            select: {
              id: true,
              submittedAt: true,
              status: true
            },
            orderBy: {
              submittedAt: 'desc'
            }
          });

          hasSubmitted = !!evaluation;
          submittedAt = evaluation?.submittedAt;

          if (hasSubmitted) {
            console.log(`✅ [recording-applicants] Google Sheets - ${displayName} (${displayEmployeeId}) - ${languageCode}: 제출 완료`);
          }
        } catch (evalError) {
          console.error(`⚠️ [recording-applicants] Google Sheets - Evaluation 조회 실패 (${displayName}):`, evalError);
          // 에러 발생해도 계속 진행
        }
      }
      
      return {
        name: displayName,
        employeeId: displayEmployeeId,
        email: displayEmail,
        language: displayLanguage,
        batch: displayBatch,
        status: rawStatus,
        hasAttended, // 출석 완료 여부
        attendedAt, // 출석 시간
        hasSubmitted, // 제출 완료 여부
        submittedAt // 제출 시간
      };
    }));

    // 상태가 있으면 신청완료만 표시
    applicants = applicants.filter((a) => a.name || a.employeeId);
    if (idxStatus >= 0) {
      applicants = applicants.filter((a) => a.status === "신청완료");
    }

    // 정렬: 차수(숫자 오름차순) → 사번 오름차순
    applicants.sort((a, b) => {
      const ba = parseBatchOrder(a.batch);
      const bb = parseBatchOrder(b.batch);
      if (ba !== bb) return ba - bb;
      return (a.employeeId || "").localeCompare(b.employeeId || "");
    });

    return NextResponse.json({
      applicants,
      dates: sortedDatesDesc,
      selectedDate,
    });
  } catch (error) {
    console.error("녹음 응시 목록 로드 실패:", error);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

