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

    console.log(`✅ 교육 체크인 완료: ${name} (${employeeId}) - requestId: ${educationId}`)

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

    if (employeeId) {
      // 특정 직원의 체크인 내역 조회
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
    } else {
      // 모든 체크인 내역 조회 (관리자용) - 교육 신청 정보와 사용자 정보 포함
      const checkins = await prisma.educationCheckin.findMany({
        include: {
          user: true // 사용자 정보 포함
        },
        orderBy: {
          checkinTime: 'desc'
        }
      })

      // 각 체크인에 대해 교육 신청 정보를 조회
      const enrichedCheckins = await Promise.all(
        checkins.map(async (checkin) => {
          let educationInfo = {
            date: checkin.checkinTime.toISOString().split('T')[0],
            slot: 1,
            educationType: '1:1' as const,
            language: 'korean-english',
            category: null
          }

          // 1. 먼저 새로운 ScheduleApplication 테이블에서 조회
          const scheduleApplication = await prisma.scheduleApplication.findUnique({
            where: { id: checkin.requestId },
            include: {
              schedule: true
            }
          })

          if (scheduleApplication) {
            // 새로운 시스템 데이터
            const details = scheduleApplication.details as any || {}
            educationInfo = {
              date: scheduleApplication.schedule.date,
              slot: scheduleApplication.slot,
              educationType: details.mode === 'small-group' || details.mode === 'small' ? 'small-group' : '1:1',
              language: details.language || 'korean-english',
              category: details.category || null
            }
            console.log(`📊 [체크인 조회] ScheduleApplication 매칭: ${checkin.requestId} → ${educationInfo.date}, ${educationInfo.slot}차, ${educationInfo.language}, ${educationInfo.educationType}`)
          } else {
            // 2. 기존 Request 테이블에서 조회 (fallback)
            const request = await prisma.request.findUnique({
              where: { id: checkin.requestId }
            })

            if (request) {
              const details = request.details as any || {}
              educationInfo = {
                date: request.date,
                slot: request.slot,
                educationType: details.mode === 'small-group' || details.mode === 'small' ? 'small-group' : '1:1',
                language: details.language || 'korean-english',
                category: details.category || null
              }
              console.log(`📊 [체크인 조회] Request 매칭: ${checkin.requestId} → ${educationInfo.date}, ${educationInfo.slot}차, ${educationInfo.language}, ${educationInfo.educationType}`)
            } else {
              // 3. 체크인 날짜 기준으로 해당 사용자의 교육 신청 찾기
              const checkinDate = checkin.checkinTime.toISOString().split('T')[0]
              
              // 먼저 ScheduleApplication에서 찾기
              const userScheduleApp = await prisma.scheduleApplication.findFirst({
                where: {
                  employeeId: checkin.employeeId,
                  schedule: {
                    date: checkinDate,
                    type: 'education'
                  },
                  status: 'ACTIVE'
                },
                include: {
                  schedule: true
                },
                orderBy: {
                  appliedAt: 'desc'
                }
              })

              if (userScheduleApp) {
                const details = userScheduleApp.details as any || {}
                educationInfo = {
                  date: userScheduleApp.schedule.date,
                  slot: userScheduleApp.slot,
                  educationType: details.mode === 'small-group' || details.mode === 'small' ? 'small-group' : '1:1',
                  language: details.language || 'korean-english',
                  category: details.category || null
                }
                console.log(`📊 [체크인 조회] 날짜 기반 ScheduleApplication 매칭: ${checkin.employeeId} ${checkinDate} → ${educationInfo.date}, ${educationInfo.slot}차, ${educationInfo.language}, ${educationInfo.educationType}`)
              } else {
                // 마지막으로 Request 테이블에서 날짜 기준 찾기
                const userRequest = await prisma.request.findFirst({
                  where: {
                    userId: checkin.employeeId,
                    date: checkinDate,
                    type: 'education',
                    status: 'ACTIVE'
                  },
                  orderBy: {
                    applicationTime: 'desc'
                  }
                })

                if (userRequest) {
                  const details = userRequest.details as any || {}
                  educationInfo = {
                    date: userRequest.date,
                    slot: userRequest.slot,
                    educationType: details.mode === 'small-group' || details.mode === 'small' ? 'small-group' : '1:1',
                    language: details.language || 'korean-english',
                    category: details.category || null
                  }
                  console.log(`📊 [체크인 조회] 날짜 기반 Request 매칭: ${checkin.employeeId} ${checkinDate} → ${educationInfo.date}, ${educationInfo.slot}차, ${educationInfo.language}, ${educationInfo.educationType}`)
                } else {
                  console.warn(`⚠️ [체크인 조회] ${checkin.employeeId}의 ${checkinDate} 교육 신청 정보를 찾을 수 없음 (기본값 사용)`)
                }
              }
            }
          }

          return {
            id: checkin.id,
            employeeId: checkin.employeeId,
            name: checkin.user.name, // 실제 사용자 이름
            department: checkin.user.department, // 사용자 부서
            date: educationInfo.date, // 교육 신청일
            slot: educationInfo.slot, // 실제 차수
            educationType: educationInfo.educationType,
            language: educationInfo.language,
            category: educationInfo.category,
            isCheckedIn: true,
            checkinTime: checkin.checkinTime.toISOString(),
            instructorName: null, // 교관 정보는 별도로 조회 필요
            location: null
          }
        })
      )

      return NextResponse.json({
        success: true,
        checkins: enrichedCheckins
      })
    }

  } catch (error) {
    console.error('교육 체크인 내역 조회 오류:', error)
    return NextResponse.json(
      { error: '체크인 내역 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const checkinId = searchParams.get('id')

    if (!checkinId) {
      return NextResponse.json(
        { error: '체크인 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    // 체크인 기록 삭제
    await prisma.educationCheckin.delete({
      where: {
        id: checkinId
      }
    })

    console.log(`✅ 교육 체크인 기록 삭제 완료: ${checkinId}`)

    return NextResponse.json({
      success: true,
      message: '교육 이수 기록이 삭제되었습니다.'
    })

  } catch (error) {
    console.error('교육 체크인 기록 삭제 오류:', error)
    return NextResponse.json(
      { error: '교육 이수 기록 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}