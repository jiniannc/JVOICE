import { NextRequest, NextResponse } from "next/server"
import { getEnvValue } from "@/lib/env-config"

type Item = {
  type: 'education' | 'recording'
  date: string
  slot: number
  detail: string
}

/**
 * 신청 내역 조회 API
 * GET /api/requests/list?employeeId=XXXX
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const employeeId = searchParams.get('employeeId')
    if (!employeeId) return NextResponse.json({ success: false, error: 'employeeId required' }, { status: 400 })

    const apiKey = getEnvValue('NEXT_PUBLIC_GOOGLE_API_KEY')
    const eduId = getEnvValue('NEXT_PUBLIC_EDU_APP_SHEET_ID')
    const recId = getEnvValue('NEXT_PUBLIC_REC_APP_SHEET_ID')

    const readSheet = async (sheetId: string) => {
      const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties(title)&key=${apiKey}`, { cache: 'no-store' })
      if (!metaRes.ok) return [] as { title: string }[]
      const meta = await metaRes.json()
      return (meta?.sheets || []).map((s: any)=>({ title: s?.properties?.title })).filter((s: any)=>!!s.title)
    }

    const [eduSheets, recSheets] = await Promise.all([readSheet(eduId), readSheet(recId)])

    const fetchRows = async (sheetId: string, title: string) => {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(title)}!A1:Z1000?key=${apiKey}`
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) return [] as string[][]
      const json = await res.json()
      return json?.values || []
    }

    const parseEdu = (rows: string[][], date: string): Item[] => {
      const header = rows[0] || []
      const body = rows.slice(1)
      const idx = {
        id: header.indexOf('사번'),
        name: header.indexOf('이름'),
        type: header.indexOf('타입'),
        slot: header.indexOf('슬롯'),
        status: header.indexOf('상태'),
      }
      return body.filter(r => r[idx.id] === employeeId && (r[idx.status]||'ACTIVE') === 'ACTIVE').map(r => ({
        type: 'education' as const,
        date,
        slot: parseInt(r[idx.slot]||'0',10),
        detail: r[idx.type] || ''
      }))
    }

    const parseRec = (rows: string[][], date: string): Item[] => {
      const header = rows[0] || []
      const body = rows.slice(1)
      const idx = {
        id: header.indexOf('사번'),
        name: header.indexOf('이름'),
        lang: header.indexOf('언어'),
        slot: header.indexOf('슬롯'),
        status: header.indexOf('상태'),
      }
      return body.filter(r => r[idx.id] === employeeId && (r[idx.status]||'ACTIVE') === 'ACTIVE').map(r => ({
        type: 'recording' as const,
        date,
        slot: parseInt(r[idx.slot]||'0',10),
        detail: r[idx.lang] || ''
      }))
    }

    const eduItemsNested = await Promise.all(eduSheets.map(async s => parseEdu(await fetchRows(eduId, s.title), s.title)))
    const recItemsNested = await Promise.all(recSheets.map(async s => parseRec(await fetchRows(recId, s.title), s.title)))
    const items = [...eduItemsNested.flat(), ...recItemsNested.flat()].sort((a,b)=> (a.date + String(a.slot).padStart(2,'0')).localeCompare(b.date + String(b.slot).padStart(2,'0')))

    return NextResponse.json({ success: true, items })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 })
  }
}



