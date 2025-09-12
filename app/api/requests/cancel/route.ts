import { NextRequest, NextResponse } from "next/server"
import { getEnvValue } from "@/lib/env-config"
import { prisma } from '@/lib/database'

/**
 * 신청 취소 API (Database 우선, Google Sheets fallback)
 * POST { type: 'education'|'recording', date: 'YYYY-MM-DD', slot: number, employeeId: string }
 * 규칙: 해당 날짜 기준  오후 2시까지만 취소 허용
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, date, slot, employeeId } = body || {}
    if (!type || !date || !slot || !employeeId) return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 })

    console.log(`🗑️ [취소 요청] type: ${type}, date: ${date}, slot: ${slot}, employeeId: ${employeeId}`)

    // 관리자가 시간 제한을 비활성화했는지 확인
    let timeRestrictionsDisabled = false
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/time-restrictions`)
      const result = await response.json()
      if (result.success) {
        timeRestrictionsDisabled = result.disabled
      }
    } catch (error) {
      console.warn('시간 제한 상태 확인 실패:', error)
    }

    // 취소 시간 제한 체크: 교육/녹음 날짜 이틀 전 오후 2시까지만 취소 가능
    if (!timeRestrictionsDisabled) {
      const scheduleDate = new Date(date)
      const twoDaysBefore = new Date(scheduleDate)
      twoDaysBefore.setDate(twoDaysBefore.getDate() - 2)
      twoDaysBefore.setHours(14, 0, 0, 0) // 오후 2시로 설정
      
      const now = new Date()
      
      if (now > twoDaysBefore) {
        return NextResponse.json({ 
          success: false, 
          error: '기간만료',
          message: '취소 기간이 만료되었습니다.',
          contactRequired: true,
          scheduleDate: date,
          deadline: twoDaysBefore.toISOString()
        }, { status: 400 })
      }
    } else {
      console.log('🔧 [Admin] 시간 제한이 비활성화되어 있어 취소 시간 제한 무시')
    }

    // 1. Database에서 먼저 취소 시도
    console.log('📋 [취소] Database에서 신청 찾기 중...')
    
    // type과 slot으로 신청 찾기 (더 넓은 검색)
    let application = null
    
    if (type === 'recording') {
      // 녹음인 경우 type이 'recording'인 스케줄 찾기
      application = await prisma.scheduleApplication.findFirst({
        where: {
          employeeId,
          slot: Number(slot),
          status: 'ACTIVE',
          schedule: {
            date: date,
            type: 'recording'
          }
        },
        include: {
          schedule: true
        }
      })
    } else {
      // 교육인 경우 모든 교육 타입에서 찾기 (korean-english, japanese, chinese)
      const educationTypes = ['korean-english', 'japanese', 'chinese']
      for (const eduType of educationTypes) {
        application = await prisma.scheduleApplication.findFirst({
          where: {
            employeeId,
            slot: Number(slot),
            status: 'ACTIVE',
            schedule: {
              date: date,
              type: eduType
            }
          },
          include: {
            schedule: true
          }
        })
        if (application) break
      }
    }

    if (application) {
      console.log(`✅ [취소] Database에서 신청 발견: ${application.id}`)
      
      // Database에서 취소 처리
      await prisma.scheduleApplication.update({
        where: { id: application.id },
        data: {
          status: 'CANCELED',
          canceledAt: new Date()
        }
      })
      
      console.log(`✅ [취소] Database 취소 완료: ${application.id}`)
      return NextResponse.json({ success: true, source: 'database' })
    }

    console.log('⚠️ [취소] Database에서 신청을 찾을 수 없음, Google Sheets 확인 중...')

    // 2. Database에서 찾지 못하면 Google Sheets에서 취소 시도 (fallback)

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
    if (targetRow < 0) {
      console.log('❌ [취소] Google Sheets에서도 신청을 찾을 수 없음')
      return NextResponse.json({ success: false, error: '신청 내역을 찾을 수 없습니다.' }, { status: 404 })
    }

    console.log(`✅ [취소] Google Sheets에서 신청 발견: row ${targetRow}`)

    // 상태를 CANCELED 로 업데이트 (헤더 포함하여 targetRow+1 행)
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(title)}!A${targetRow+1}:Z${targetRow+1}?valueInputOption=RAW&key=${apiKey}`
    const row = rows[targetRow]
    if (idxStatus >= 0){
      row[idxStatus] = 'CANCELED'
    } else {
      row.push('CANCELED')
    }
    await fetch(updateUrl, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ values: [row] }) })

    console.log(`✅ [취소] Google Sheets 취소 완료`)
    return NextResponse.json({ success: true, source: 'sheets' })
  } catch (e: any) {
    console.error('❌ [취소] 오류:', e)
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}



