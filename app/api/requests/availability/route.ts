import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/lib/generated/prisma'

const prisma = new PrismaClient()

interface SlotAvailability {
  slot: number
  available: boolean
  currentCount: number
  maxCount: number
  language: string
  educationType: string
  category: string // 카테고리 추가
}

interface LanguageRestriction {
  language: string
  hasExistingApplication: boolean
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const date = searchParams.get('date')
    const employeeId = searchParams.get('employeeId')
    const email = searchParams.get('email')

    if (!month || !date) {
      return NextResponse.json(
        { error: '월과 날짜는 필수입니다.' },
        { status: 400 }
      )
    }

    console.log(`🔍 [availability] 데이터베이스에서 교육 가용성 조회: ${date}`)

    // 데이터베이스에서 해당 날짜의 교육 신청 현황 조회
    // ScheduleApplication과 Schedule을 조인하여 교육 타입 확인
    const dateApplications = await prisma.scheduleApplication.findMany({
      where: {
        status: 'ACTIVE',
        schedule: {
          date: date,
          OR: [
            { classType: '1:1' },
            { classType: 'small' }
          ]
        }
      },
      include: {
        schedule: {
          select: {
            type: true, // 언어 (korean-english, japanese, chinese)
            classType: true, // 1:1 또는 small
            category: true // 카테고리 (공통, PUS, 신규, 재자격)
          }
        }
      }
    })

    console.log(`📊 ${date} 교육 신청 현황: ${dateApplications.length}건`)

    // 실제 존재하는 스케줄만 가용성 계산
    // 먼저 해당 날짜의 모든 스케줄 조회
    const existingSchedules = await prisma.schedule.findMany({
      where: {
        date: date,
        visible: true
      },
      select: {
        type: true,
        classType: true,
        category: true,
        slots: true,
        capacity: true
      }
    })

    console.log(`📅 ${date} 존재하는 스케줄: ${existingSchedules.length}개`)

    // 차수별 가용성 계산
    const slotAvailability: SlotAvailability[] = []

    // 언어별 교육 타입별 카테고리별로 그룹화
    const requestsByLanguageTypeCategory = new Map<string, any[]>()

    dateApplications.forEach(app => {
      const language = app.schedule.type
      const educationType = app.schedule.classType
      // 1:1 교육은 카테고리 없음, 한/영 소규모만 카테고리 있음
      const category = (educationType === '1:1') ? null : (app.schedule.category || '공통')
      const key = `${language}-${educationType}-${category}`
      if (!requestsByLanguageTypeCategory.has(key)) {
        requestsByLanguageTypeCategory.set(key, [])
      }
      requestsByLanguageTypeCategory.get(key)!.push(app)
    })

    // 실제 존재하는 스케줄에 대해서만 가용성 계산
    for (const schedule of existingSchedules) {
      const language = schedule.type
      const educationType = schedule.classType
      // 1:1 교육은 카테고리 없음, 한/영 소규모만 카테고리 있음
      const category = (educationType === '1:1') ? null : (schedule.category || '공통')
      const availableSlots = Array.isArray(schedule.slots) ? schedule.slots : []
      
      // 카테고리별 정원 설정
      let maxCount = schedule.capacity
      if (!maxCount) {
        if (educationType === '1:1') {
          maxCount = 1
        } else if (educationType === 'small') {
          maxCount = (category === 'PUS') ? 3 : 4
        } else {
          maxCount = 4 // 기본값
        }
      }

      let categoryRequests: any[] = []

      // 교육 타입별 카테고리 처리 방식 분기
      if (educationType === '1:1') {
        // 1:1 교육: 카테고리 없음 (null)
        const key = `${language}-${educationType}-${null}`
        categoryRequests = requestsByLanguageTypeCategory.get(key) || []
        console.log(`🔍 [가용성] ${language}-${educationType}: ${categoryRequests.length}건 신청, 정원: ${maxCount}`)
      } else if (language === 'korean-english') {
        // 한/영 소규모: 카테고리별 독립 계산
        const key = `${language}-${educationType}-${category}`
        categoryRequests = requestsByLanguageTypeCategory.get(key) || []
        console.log(`🔍 [가용성] ${language}-${educationType}-${category}: ${categoryRequests.length}건 신청, 정원: ${maxCount}`)
      } else {
        // 일본어/중국어 소규모: 모든 카테고리 통합 계산
        const categories = ['공통', 'PUS', '신규', '재자격']
        categories.forEach(cat => {
          const key = `${language}-${educationType}-${cat}`
          const requests = requestsByLanguageTypeCategory.get(key) || []
          categoryRequests.push(...requests)
        })
        console.log(`🔍 [가용성] ${language}-${educationType}-통합: ${categoryRequests.length}건 신청, 정원: ${maxCount}`)
      }

      // 차수별로 그룹화
      const slotGroups = new Map<number, any[]>()
      categoryRequests.forEach(req => {
        if (!slotGroups.has(req.slot)) {
          slotGroups.set(req.slot, [])
        }
        slotGroups.get(req.slot)!.push(req)
      })

      // 해당 스케줄의 개설된 차수에 대해서만 가용성 확인
      for (const slotValue of availableSlots) {
        const slot = typeof slotValue === 'number' ? slotValue : parseInt(String(slotValue))
        if (isNaN(slot)) continue
        
        const currentRequests = slotGroups.get(slot) || []
        const currentCount = currentRequests.length

        const displayCategory = language === 'korean-english' ? category : '통합'
        console.log(`📊 [가용성] ${language}-${educationType}-${displayCategory} 차수${slot}: ${currentCount}/${maxCount}`)

        slotAvailability.push({
          slot,
          available: currentCount < maxCount,
          currentCount,
          maxCount,
          language,
          educationType,
          category: displayCategory
        })
      }
    }

    // 사용자의 언어별 신청 제한 확인
    const languageRestrictions: LanguageRestriction[] = []

    if (employeeId || email) {
      // 해당 사용자의 기존 교육 신청 확인
      const userApplications = await prisma.scheduleApplication.findMany({
        where: {
          employeeId: employeeId || (email ? email.split('@')[0] : ''),
          status: 'ACTIVE',
          schedule: {
            OR: [
              { classType: '1:1' },
              { classType: 'small' }
            ]
          }
        },
        include: {
          schedule: {
            select: {
              type: true // 언어 정보
            }
          }
        }
      })

      // 언어별 기존 신청 확인
      const languages = ['korean-english', 'japanese', 'chinese']
      for (const language of languages) {
        const hasExisting = userApplications.some(app => app.schedule.type === language)
        languageRestrictions.push({
          language,
          hasExistingApplication: hasExisting
        })
      }
    }

    return NextResponse.json({
      success: true,
      date,
      slotAvailability,
      languageRestrictions,
      totalRequests: dateApplications.length
    })

  } catch (error) {
    console.error('가용성 조회 실패:', error)
    return NextResponse.json(
      { error: '가용성 조회에 실패했습니다.' },
      { status: 500 }
    )
  }
}

