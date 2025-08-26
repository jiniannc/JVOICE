import { NextRequest, NextResponse } from "next/server"
import { getEnvValue } from "@/lib/env-config"

/**
 * 교육 신청 저장 API
 * 요청 바디: { date: string(YYYY-MM-DD), slot: number(1~8), type: object, employee: { id, name, dept? }, note? }
 * Google Sheets에 날짜별 시트로 분류 저장
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { date, slot, type, employee, note } = body || {}
    if (!date || !slot || !type || !employee?.id || !employee?.name) {
      return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 })
    }

    const apiKey = getEnvValue("NEXT_PUBLIC_GOOGLE_API_KEY")
    const sheetId = getEnvValue("NEXT_PUBLIC_EDU_APP_SHEET_ID")
    const title = `${date}`
    // 시트 존재 확인 후 없으면 생성
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties(title)&key=${apiKey}`, { cache: "no-store" })
    if (!metaRes.ok) throw new Error(`meta ${metaRes.status}`)
    const meta = await metaRes.json()
    const titles: string[] = (meta?.sheets || []).map((s: any) => s?.properties?.title).filter(Boolean)
    if (!titles.includes(title)) {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requests: [{ addSheet: { properties: { title } } }] })
      })
    }
    // Append values
    const headers = ["사번", "이름", "부서", "타입", "슬롯", "비고", "신청시각", "상태"]
    await ensureHeaderRow(sheetId, title, headers, apiKey)
    const row = [employee.id, employee.name, employee.dept || "", JSON.stringify(type), String(slot), note || "", new Date().toISOString(), "ACTIVE"]
    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(title)}!A1:Z1:append?valueInputOption=RAW&key=${apiKey}`
    const res = await fetch(appendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values: [row] })
    })
    if (!res.ok) throw new Error(`append ${res.status}`)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 })
  }
}

async function ensureHeaderRow(sheetId: string, title: string, headers: string[], apiKey: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(title)}!A1:Z1?key=${apiKey}`
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) return
  const json = await res.json()
  const current = json?.values?.[0] || []
  const same = headers.length === current.length && headers.every((h, i) => current[i] === h)
  if (!same) {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(title)}!A1:Z1?valueInputOption=RAW&key=${apiKey}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values: [headers] })
    })
  }
}


