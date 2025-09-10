/**
 * 스케줄 스프레드시트 파싱 유틸
 * - Row 2: 각 컬럼의 날짜(YYYY-MM-DD)
 * - Row 4,5: 녹음 차수
 * - Row 6: 한/영 1:1
 * - Row 7: 한/영 소규모 (신규/재자격/공통/PUS 포함)
 * - Row 8: 교관 목록 (표시는 안함)
 * - Row 9: 일본어 1:1
 * - Row 10: 일본어 소규모
 * - Row 12: 중국어 1:1
 * - Row 13: 중국어 소규모
 * - Row 15: 학과장/장소 등 안내 텍스트
 * - 임의 행: "결 과 공 지"를 포함하는 라인의 날짜를 결과 공지로 사용
 */
import { getEnvValue } from "@/lib/env-config"

export type SessionSlot = 1|2|3|4|5|6|7|8

export type RecordingLanguage = "korean-english" | "japanese" | "chinese"

export type EducationType =
  | { lang: "korean-english"; mode: "1:1" }
  | { lang: "korean-english"; mode: "small"; category: "신규" | "재자격" | "공통" | "PUS" }
  | { lang: "japanese"; mode: "1:1" }
  | { lang: "japanese"; mode: "small" }
  | { lang: "chinese"; mode: "1:1" }
  | { lang: "chinese"; mode: "small" }

export interface DaySchedule {
  date: string // YYYY-MM-DD
  recording: { slots: SessionSlot[]; note?: string } | null
  education: Array<{ type: EducationType; slots: SessionSlot[] }>
  resultAnnouncement?: boolean
  classroomInfo?: string // 교육용 교실/장소 정보
}

export interface MonthScheduleResponse {
  month: string // YYYY-MM
  visible: boolean
  days: DaySchedule[]
}

function parseSlots(cell: string | undefined): SessionSlot[] {
  if (!cell) return []
  const normalized = String(cell).replace(/\s/g, "").replace(/[^0-9,~.-]/g, "")
  if (!normalized) return []
  // 지원: "1,2,3" 또는 "1-4" 형태 모두
  const parts = normalized.split(",").filter(Boolean)
  const result = new Set<SessionSlot>()
  for (const part of parts) {
    const rangeMatch = part.match(/^(\d)[~-](\d)$/)
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10)
      const end = parseInt(rangeMatch[2], 10)
      for (let s = Math.min(start, end); s <= Math.max(start, end); s++) {
        if (s >= 1 && s <= 8) result.add(s as SessionSlot)
      }
      continue
    }
    const n = parseInt(part, 10)
    if (!Number.isNaN(n) && n >= 1 && n <= 8) result.add(n as SessionSlot)
  }
  return Array.from(result).sort((a,b)=>a-b)
}

function normalizeKoreanSpaces(text: string): string {
  return text.replace(/\s+/g, "").trim()
}

export async function fetchMonthSchedule(month: string): Promise<MonthScheduleResponse> {
  const apiKey = getEnvValue("NEXT_PUBLIC_GOOGLE_API_KEY")
  const sheetId = getEnvValue("NEXT_PUBLIC_SCHEDULE_SHEET_ID")
  
  // 탭 이름 후보들 (우선순위 순서)
  const [y, m] = month.split("-")
  const monthNum = parseInt(m, 10)
  const tabCandidates = [
    `${y}년 ${monthNum}월`,     // 2025년 9월
    `${y}/${monthNum}`,         // 2025/9  
    `${y}-${monthNum}`,         // 2025-9
    `${y}년${monthNum}월`,      // 2025년9월 (공백 없음)
    `${y}.${monthNum}`,         // 2025.9
    `${monthNum}월 ${y}`,       // 9월 2025
    `${monthNum}월${y}`,        // 9월2025
  ]
  
  console.log(`🗓️ 스케줄 요청: month=${month}, 탭 후보들: [${tabCandidates.join(', ')}]`)
  
  let validTab: string | null = null
  let values: string[][] = []
  
  // 각 탭 이름 후보를 시도
  for (const tab of tabCandidates) {
    const range = `${encodeURIComponent(tab)}!A1:GR50`
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`
    
    console.log(`📊 시도 중: 탭="${tab}", URL=${url.replace(apiKey, '***API_KEY***')}`)
    
    const res = await fetch(url, { cache: "no-store" })
    console.log(`📥 응답: status=${res.status}, statusText=${res.statusText}`)
    
    if (res.ok) {
      const json = await res.json()
      const sheetValues: string[][] = json?.values || []
      
      if (sheetValues.length > 0) {
        console.log(`✅ 성공! 탭="${tab}"에서 ${sheetValues.length}행 발견`)
        validTab = tab
        values = sheetValues
        break
      } else {
        console.log(`⚠️ 탭="${tab}"은 존재하지만 데이터가 없음`)
      }
    } else {
      const errorText = await res.text()
      console.log(`❌ 탭="${tab}" 실패: ${res.status} - ${errorText}`)
    }
  }
  
  if (!validTab) {
    console.error(`❌ 모든 탭 후보에서 실패. 시도한 탭들: [${tabCandidates.join(', ')}]`)
    throw new Error(`스케줄 시트를 찾을 수 없습니다. 다음 이름들을 시도했습니다: [${tabCandidates.join(', ')}]`)
  }
  
  console.log(`📋 스프레드시트 데이터: ${values.length}행 읽음 (탭: ${validTab})`)
  if (values.length === 0) {
    console.warn(`⚠️ 시트 '${validTab}'에 데이터가 없습니다.`)
  }

  // 보호: 최소 행 체크
  const get = (r: number, c: number) => (values[r] && values[r][c]) || ""

  // 날짜 라인: 2행(인덱스 1) → "1(월)" 형태에서 일자 추출
  const dateRow = values[1] || []
  // 교실/장소 안내: 15행(인덱스 14) - 각 컬럼별로 파싱 (교육용)
  const classroomRow = values[14] || []


  // 결과 공지 라인 인덱스 탐색 ("결 과 공 지" 유사 매칭)
  let resultAnnounceRowIndex = -1
  for (let r = 0; r < values.length; r++) {
    const rowText = normalizeKoreanSpaces((values[r] || []).join(" "))
    if (rowText.includes(normalizeKoreanSpaces("결 과 공 지"))) {
      resultAnnounceRowIndex = r
      break
    }
  }

  // 가시성 설정: Config 시트가 있다면 읽어오고, 없으면 기본적으로 "오픈일(2행) <= 오늘"이면 true
  // Config 시트 포맷: A열=YYYY-MM, B열=ON/OFF 또는 TRUE/FALSE
  const cfgUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent("Config")}!A1:B100?key=${apiKey}`
  console.log(`🔧 Config 시트 확인: ${cfgUrl.replace(apiKey, '***API_KEY***')}`)
  
  const cfgRes = await fetch(cfgUrl, { cache: "no-store" })
  let configVisible: boolean | undefined
  
  console.log(`📋 Config 시트 응답: status=${cfgRes.status}`)
  
  if (cfgRes.ok) {
    const cfg = await cfgRes.json()
    const rows: string[][] = cfg?.values || []
    console.log(`📋 Config 데이터: ${rows.length}행 읽음`)
    
    for (let i = 1; i < rows.length; i++) {
      const ym = (rows[i]?.[0] || "").trim()
      const v = (rows[i]?.[1] || "").trim().toUpperCase()
      console.log(`📋 Config 행 ${i}: ${ym} = ${v}`)
      
      if (ym === month) {
        console.log(`✅ Config에서 ${month} 발견: ${v}`)
        if (v === "ON" || v === "TRUE" || v === "1" || v === "OPEN") configVisible = true
        if (v === "OFF" || v === "FALSE" || v === "0" || v === "CLOSE") configVisible = false
        break
      }
    }
    
    if (configVisible === undefined) {
      console.log(`⚠️ Config에서 ${month}에 대한 설정을 찾지 못했습니다.`)
    }
  } else {
    console.log(`⚠️ Config 시트가 존재하지 않거나 접근할 수 없습니다.`)
  }
  const todayStr = new Date().toISOString().slice(0,10)
  const thisMonthCols: number[] = []
  const columnDates: Record<number,string> = {}
  for (let c = 0; c < dateRow.length; c++) {
    const d = dateRow[c]
    if (!d) continue
    console.log(`🗓️ 컬럼 ${c}: "${d}"`)
    
    // 단순히 숫자만 추출해서 해당 월의 날짜로 매핑
    const dayNumber = parseInt(String(d).replace(/[^\d]/g, ''), 10)
    if (!isNaN(dayNumber) && dayNumber >= 1 && dayNumber <= 31) {
      const iso = `${y}-${String(parseInt(m,10)).padStart(2,'0')}-${String(dayNumber).padStart(2,'0')}`
      thisMonthCols.push(c)
      columnDates[c] = iso
      console.log(`📅 날짜 매핑: 컬럼 ${c} "${d}" -> ${iso}`)
      continue
    }
    
    // 기존 방식도 유지 (fallback)
    const m1 = String(d).match(/(\d{1,2})\s*\(/)
    if (m1) {
      const day = parseInt(m1[1], 10)
      const iso = `${y}-${String(parseInt(m,10)).padStart(2,'0')}-${String(day).padStart(2,'0')}`
      thisMonthCols.push(c)
      columnDates[c] = iso
      console.log(`📅 날짜 매핑 (기존방식): 컬럼 ${c} -> ${iso}`)
      continue
    }
    
    const iso = parseToISO(d)
    if (iso && iso.startsWith(month)) {
      thisMonthCols.push(c)
      columnDates[c] = iso
      console.log(`📅 날짜 매핑 (parseToISO): 컬럼 ${c} -> ${iso}`)
    }
  }

  // 월 오픈 여부 판단: 2행 중 해당 월의 가장 빠른 날짜가 오늘 이후면 숨김
  let visible = true
  const minDate = thisMonthCols
    .map(c => columnDates[c])
    .filter(Boolean)
    .sort()[0]
    
  console.log(`📅 날짜 분석: today=${todayStr}, minDate=${minDate}, thisMonthCols=${thisMonthCols.length}개`)
  console.log(`📅 발견된 날짜들:`, Object.values(columnDates))
  
  if (minDate && todayStr < minDate) {
    console.log(`🔒 날짜 기준으로 숨김: ${minDate} > ${todayStr}`)
    visible = false
  }
  
  if (typeof configVisible === 'boolean') {
    console.log(`🔧 Config 설정으로 override: ${configVisible}`)
    visible = configVisible
  }
  
  console.log(`👁️ 최종 visible 상태: ${visible}`)

  // 각 날짜에 대해 교육/녹음 파싱
  const daysByDate: Record<string, DaySchedule> = {}
  
  for (const col of thisMonthCols) {
    const dateIso = columnDates[col]
    const recordingSlots = [4,5].flatMap(r => parseSlots(get(r-1, col))) // r-1: 0-index
    const eduItems: Array<{ type: EducationType; slots: SessionSlot[] }> = []

    const addEdu = (type: EducationType, fromRow: number) => {
      const cellValue = get(fromRow-1, col)
      const slots = parseSlots(cellValue)
      console.log(`📚 교육 파싱 - 날짜: ${dateIso}, 행: ${fromRow}, 컬럼: ${col}, 값: "${cellValue}", 슬롯: [${slots.join(',')}], 타입: ${type.lang} ${type.mode}`)
      if (slots.length > 0) eduItems.push({ type, slots })
    }

    // 한/영 1:1
    addEdu({ lang: "korean-english", mode: "1:1" }, 6)
    // 한/영 소규모 (신규/재자격/공통/PUS)
    const koSmallCell = get(7-1, col)
    const koSmallSlots = parseSlots(koSmallCell)
    
    // PUS 특별 처리: PUS가 포함되면 실제 파싱된 슬롯 사용 (다른 카테고리와 중복 방지)
    if (normalizeKoreanSpaces(koSmallCell).toUpperCase().includes("PUS")) {
      if (koSmallSlots.length > 0) {
        eduItems.push({ type: { lang: "korean-english", mode: "small", category: "PUS" }, slots: koSmallSlots })
        console.log(`🎯 PUS 특별 처리: 날짜 ${dateIso}, 컬럼 ${col}, 슬롯 [${koSmallSlots.join(',')}]`)
      }
    } else {
      // 일반 카테고리 처리 (PUS가 아닌 경우만)
      const categories: Array<"신규"|"재자격"|"공통"> = []
      if (/신규/.test(koSmallCell)) categories.push("신규")
      if (/재자격/.test(koSmallCell)) categories.push("재자격")
      if (/공통/.test(koSmallCell)) categories.push("공통")
      
      for (const cat of categories) {
        if (koSmallSlots.length > 0) {
          eduItems.push({ type: { lang: "korean-english", mode: "small", category: cat }, slots: koSmallSlots })
          console.log(`📚 일반 카테고리 처리: 날짜 ${dateIso}, 컬럼 ${col}, 카테고리 ${cat}, 슬롯 [${koSmallSlots.join(',')}]`)
        }
      }
    }

    // 일/중
    addEdu({ lang: "japanese", mode: "1:1" }, 9)
    addEdu({ lang: "japanese", mode: "small" }, 10)
    addEdu({ lang: "chinese", mode: "1:1" }, 12)
    addEdu({ lang: "chinese", mode: "small" }, 13)

    // 공지 텍스트는 보통 녹음 행(4,5)에 들어옴 → 해당 칸 텍스트에 '결 과 공 지'가 포함되면 표시
    const cellText = `${get(4-1, col)} ${get(5-1, col)}`
    const resultAnnouncement = normalizeKoreanSpaces(cellText).includes(normalizeKoreanSpaces("결 과 공 지"))
    
    // 각 교육 항목에 교실 정보 추가
    const classroomInfo = (classroomRow[col] || "").trim()
    if (classroomInfo && eduItems.length > 0) {
      eduItems.forEach(eduItem => {
        (eduItem as any).classroomInfo = classroomInfo
      })
    }
    console.log(`🏫 날짜 ${dateIso} (컬럼 ${col}): classroomInfo = "${classroomInfo || ''}", 교육 ${eduItems.length}개`)
    
    // 같은 날짜가 이미 있으면 병합, 없으면 새로 생성
    if (daysByDate[dateIso]) {
      // 기존 날짜에 교육 정보 추가
      daysByDate[dateIso].education.push(...eduItems)
      
      // 녹음 슬롯 병합
      if (recordingSlots.length > 0) {
        if (daysByDate[dateIso].recording) {
          daysByDate[dateIso].recording!.slots.push(...recordingSlots)
          // 중복 제거
          daysByDate[dateIso].recording!.slots = [...new Set(daysByDate[dateIso].recording!.slots)]
        } else {
          daysByDate[dateIso].recording = { slots: recordingSlots }
        }
      }
      
      // 결과 발표 정보 병합
      if (resultAnnouncement) {
        daysByDate[dateIso].resultAnnouncement = true
      }
      
      // 전체 교실 정보는 첫 번째 컬럼의 정보로 설정 (호환성 유지)
      if (classroomInfo && !daysByDate[dateIso].classroomInfo) {
        daysByDate[dateIso].classroomInfo = classroomInfo
      }
      
      console.log(`🔄 날짜 병합: ${dateIso} - 기존 교육 ${daysByDate[dateIso].education.length - eduItems.length}개 + 새 교육 ${eduItems.length}개`)
    } else {
      // 새 날짜 생성
      daysByDate[dateIso] = {
        date: dateIso,
        recording: recordingSlots.length > 0 ? { slots: recordingSlots } : null,
        education: eduItems,
        resultAnnouncement,
        classroomInfo,
      }
      console.log(`✨ 새 날짜 생성: ${dateIso} - 교육 ${eduItems.length}개`)
    }
  }

  // 날짜별로 정렬된 배열로 변환
  const days = Object.values(daysByDate).sort((a, b) => a.date.localeCompare(b.date))
  console.log(`📅 최종 날짜 수: ${days.length}개`)

  return { month, visible, days }
}

function parseToISO(text: string): string | null {
  if (!text) return null
  const t = String(text).trim()
  // Already ISO or yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t
  // e.g., 9/12, 2025-9-1, 2025.09.01, 2025년 9월 1일
  let m = t.match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/)
  if (m) {
    const y = parseInt(m[1], 10)
    const mo = parseInt(m[2], 10)
    const d = parseInt(m[3], 10)
    return `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  }
  m = t.match(/(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/)
  if (m) {
    const y = parseInt(m[1], 10)
    const mo = parseInt(m[2], 10)
    const d = parseInt(m[3], 10)
    return `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  }
  // MM/DD with unknown year: 가정하지 않음
  return null
}


