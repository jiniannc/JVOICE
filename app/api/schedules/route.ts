import { NextRequest, NextResponse } from "next/server"
import { fetchMonthSchedule } from "@/lib/schedule-service"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const month = searchParams.get("month") || new Date().toISOString().slice(0,7)
    const data = await fetchMonthSchedule(month)
    return NextResponse.json({ success: true, data })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 })
  }
}



