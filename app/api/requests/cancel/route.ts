import { NextRequest, NextResponse } from "next/server"
import { getEnvValue } from "@/lib/env-config"

/**
 * 신청 취소 API
 * POST { type: 'education'|'recording', date: 'YYYY-MM-DD', slot: number, employeeId: string }
 * 규칙: 교육/녹음 시작 48시간 전까지만 취소 허용
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, date, slot, employeeId } = body || {}
    if (!type || !date || !slot || !employeeId) return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 })

    // 48시간 규칙 체크: slot 시간을 고정 맵으로 계산
    const slotTimes: Record<number, string> = {
      1: '08:30', 2: '09:30', 3: '10:30', 4: '11:30', 5: '13:40', 6: '14:40', 7: '15:40', 8: '16:40'
    }
    const target = new Date(`${date}T${slotTimes[slot]}:00+09:00`)
    const now = new Date()
    if (target.getTime() - now.getTime() < 48*60*60*1000) {
      return NextResponse.json({ success: false, error: '시작 48시간 전 이후에는 취소할 수 없습니다.' }, { status: 400 })
    }

    const apiKey = getEnvValue('NEXT_PUBLIC_GOOGLE_API_KEY')
    const sheetId = type === 'education' ? getEnvValue('NEXT_PUBLIC_EDU_APP_SHEET_ID') : getEnvValue('NEXT_PUBLIC_REC_APP_SHEET_ID')
    const title = date

    // 시트 로드
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(title)}!A1:Z1000?key=${apiKey}`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return NextResponse.json({ success: false, error: 'Sheet not found' }, { status: 404 })
    const json = await res.json()
    const rows: string[][] = json?.values || []
    if (rows.length === 0) return NextResponse.json({ success: false, error: 'No data' }, { status: 404 })
    const header = rows[0]
    const idxId = header.indexOf('사번')
    const idxSlot = header.indexOf('슬롯')
    const idxStatus = header.indexOf('상태')
    if (idxId < 0 || idxSlot < 0) return NextResponse.json({ success: false, error: 'Invalid sheet' }, { status: 500 })

    // 대상 row 찾기 (직원, 슬롯 일치 + ACTIVE)
    let targetRow = -1
    for (let i=1;i<rows.length;i++){
      const r = rows[i]
      if (r[idxId] === employeeId && parseInt(r[idxSlot]||'0',10) === Number(slot) && (idxStatus<0 || (r[idxStatus]||'ACTIVE')==='ACTIVE')) {
        targetRow = i
        break
      }
    }
    if (targetRow < 0) return NextResponse.json({ success: false, error: '신청 내역을 찾을 수 없습니다.' }, { status: 404 })

    // 상태를 CANCELED 로 업데이트 (헤더 포함하여 targetRow+1 행)
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(title)}!A${targetRow+1}:Z${targetRow+1}?valueInputOption=RAW&key=${apiKey}`
    const row = rows[targetRow]
    if (idxStatus >= 0){
      row[idxStatus] = 'CANCELED'
    } else {
      row.push('CANCELED')
    }
    await fetch(updateUrl, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ values: [row] }) })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 })
  }
}



