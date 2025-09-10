import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '../../../../lib/generated/prisma'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { educationId, employeeId, name, checkinTime } = body

    if (!educationId || !employeeId || !name || !checkinTime) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      )
    }

    // 이미 체크인했는지 확인
    const existingCheckin = await prisma.educationCheckin.findUnique({
      where: {
        requestId_employeeId: {
          requestId: educationId,
          employeeId: employeeId
        }
      }
    })

    if (existingCheckin) {
      return NextResponse.json(
        { error: '이미 체크인하셨습니다.' },
        { status: 409 }
      )
    }

    // 체크인 기록 생성
    const checkin = await prisma.educationCheckin.create({
      data: {
        requestId: educationId,
        employeeId: employeeId,
        checkinTime: new Date(checkinTime),
        status: 'CHECKED_IN',
        ipAddress: request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown',
        location: null, // GPS 좌표는 나중에 추가 가능
      }
    })

    console.log(`✅ 교육 체크인 완료: ${name} (${employeeId}) - ${educationId}`)

    return NextResponse.json({
      success: true,
      checkin: {
        id: checkin.id,
        checkinTime: checkin.checkinTime,
        status: checkin.status
      }
    })

  } catch (error) {
    console.error('교육 체크인 오류:', error)
    return NextResponse.json(
      { error: '체크인 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')

    if (!employeeId) {
      return NextResponse.json(
        { error: '직원 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    // 해당 직원의 체크인 내역 조회
    const checkins = await prisma.educationCheckin.findMany({
      where: {
        employeeId: employeeId
      },
      orderBy: {
        checkinTime: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      checkins
    })

  } catch (error) {
    console.error('교육 체크인 내역 조회 오류:', error)
    return NextResponse.json(
      { error: '체크인 내역 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}