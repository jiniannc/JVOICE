import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@/lib/generated/prisma'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')

    if (!employeeId) {
      return NextResponse.json({ error: 'employeeId is required' }, { status: 400 })
    }

    console.log('🚀 [Bulk Availability] 전체 가용성 데이터 조회 시작')

    // 1. 전체 교육 신청 현황 조회
    const educationApplications = await prisma.scheduleApplication.findMany({
      where: {
        type: 'education',
        status: 'ACTIVE'
      },
      select: {
        date: true,
        slot: true,
        language: true,
        educationType: true,
        employeeId: true
      }
    })

    // 2. 전체 녹음 신청 현황 조회
    const recordingApplications = await prisma.scheduleApplication.findMany({
      where: {
        type: 'recording',
        status: 'ACTIVE'
      },
      select: {
        date: true,
        slot: true,
        language: true,
        employeeId: true
      }
    })

    console.log(`📊 [Bulk Availability] 교육 신청: ${educationApplications.length}건, 녹음 신청: ${recordingApplications.length}건`)

    // 3. 날짜별로 그룹화하여 가용성 계산
    const availabilityData: Record<string, any> = {}

    // 날짜 목록 추출 (중복 제거)
    const allDates = [...new Set([
      ...educationApplications.map(app => app.date),
      ...recordingApplications.map(app => app.date)
    ])].sort()

    console.log(`📅 [Bulk Availability] 처리할 날짜: ${allDates.length}개`)

    // 각 날짜별로 가용성 계산
    for (const date of allDates) {
      const dateEducationApps = educationApplications.filter(app => app.date === date)
      const dateRecordingApps = recordingApplications.filter(app => app.date === date)

      // 교육 가용성 계산
      const educationSlots: Record<string, any> = {}
      const educationLanguages = ['korean-english', 'korean-chinese', 'korean-japanese']

      educationLanguages.forEach(language => {
        const languageApps = dateEducationApps.filter(app => app.language === language)

        if (language === 'korean-english') {
          // 1:1 교육 (슬롯 1-4)
          for (let slot = 1; slot <= 4; slot++) {
            const slotApps = languageApps.filter(app => app.slot === slot && app.educationType === '1:1')
            educationSlots[`${language}-1:1-${slot}`] = {
              slot,
              language,
              educationType: '1:1',
              currentCount: slotApps.length,
              maxCount: 1,
              available: slotApps.length < 1,
              applicants: slotApps.map(app => app.employeeId)
            }
          }

          // 소규모 그룹 교육 (슬롯 3)
          const smallGroupApps = languageApps.filter(app => app.educationType === 'small')
          educationSlots[`${language}-small-3`] = {
            slot: 3,
            language,
            educationType: 'small',
            currentCount: smallGroupApps.length,
            maxCount: 4,
            available: smallGroupApps.length < 4,
            applicants: smallGroupApps.map(app => app.employeeId)
          }
        } else if (language === 'korean-chinese') {
          // 중국어 1:1 교육 (슬롯 5-8)
          for (let slot = 5; slot <= 8; slot++) {
            const slotApps = languageApps.filter(app => app.slot === slot && app.educationType === '1:1')
            educationSlots[`${language}-1:1-${slot}`] = {
              slot,
              language,
              educationType: '1:1',
              currentCount: slotApps.length,
              maxCount: 1,
              available: slotApps.length < 1,
              applicants: slotApps.map(app => app.employeeId)
            }
          }
        } else if (language === 'korean-japanese') {
          // 일본어 1:1 교육 (슬롯 5-8)
          for (let slot = 5; slot <= 8; slot++) {
            const slotApps = languageApps.filter(app => app.slot === slot && app.educationType === '1:1')
            educationSlots[`${language}-1:1-${slot}`] = {
              slot,
              language,
              educationType: '1:1',
              currentCount: slotApps.length,
              maxCount: 1,
              available: slotApps.length < 1,
              applicants: slotApps.map(app => app.employeeId)
            }
          }

          // 일본어 소규모 그룹 교육 (슬롯 3)
          const smallGroupApps = languageApps.filter(app => app.educationType === 'small')
          educationSlots[`${language}-small-3`] = {
            slot: 3,
            language,
            educationType: 'small',
            currentCount: smallGroupApps.length,
            maxCount: 4,
            available: smallGroupApps.length < 4,
            applicants: smallGroupApps.map(app => app.employeeId)
          }
        }
      })

      // 녹음 가용성 계산
      const recordingSlots: Record<string, any> = {}
      const recordingLanguages = ['korean-english', 'korean-chinese', 'korean-japanese', 'chinese', 'japanese']

      recordingLanguages.forEach(language => {
        const languageApps = dateRecordingApps.filter(app => app.language === language)

        // 각 언어별 슬롯 계산
        if (language === 'korean-english') {
          // 슬롯 1-4 (1:1), 슬롯 3 (소규모)
          for (let slot = 1; slot <= 4; slot++) {
            const slotApps = languageApps.filter(app => app.slot === slot)
            recordingSlots[`${language}-${slot}`] = {
              slot,
              language,
              currentCount: slotApps.length,
              maxCount: 8,
              available: slotApps.length < 8,
              applicants: slotApps.map(app => app.employeeId)
            }
          }
          // 소규모 슬롯 3
          const smallSlot3Apps = languageApps.filter(app => app.slot === 3)
          recordingSlots[`${language}-small-3`] = {
            slot: 3,
            language,
            currentCount: smallSlot3Apps.length,
            maxCount: 8,
            available: smallSlot3Apps.length < 8,
            applicants: smallSlot3Apps.map(app => app.employeeId)
          }
        } else if (language === 'korean-chinese') {
          // 슬롯 5-8 (1:1), 슬롯 3 (소규모)
          for (let slot = 5; slot <= 8; slot++) {
            const slotApps = languageApps.filter(app => app.slot === slot)
            recordingSlots[`${language}-${slot}`] = {
              slot,
              language,
              currentCount: slotApps.length,
              maxCount: 8,
              available: slotApps.length < 8,
              applicants: slotApps.map(app => app.employeeId)
            }
          }
          // 소규모 슬롯 2
          const smallSlot2Apps = languageApps.filter(app => app.slot === 2)
          recordingSlots[`${language}-small-2`] = {
            slot: 2,
            language,
            currentCount: smallSlot2Apps.length,
            maxCount: 8,
            available: smallSlot2Apps.length < 8,
            applicants: smallSlot2Apps.map(app => app.employeeId)
          }
        } else if (language === 'korean-japanese') {
          // 슬롯 5-8 (1:1), 슬롯 1 (소규모)
          for (let slot = 5; slot <= 8; slot++) {
            const slotApps = languageApps.filter(app => app.slot === slot)
            recordingSlots[`${language}-${slot}`] = {
              slot,
              language,
              currentCount: slotApps.length,
              maxCount: 8,
              available: slotApps.length < 8,
              applicants: slotApps.map(app => app.employeeId)
            }
          }
          // 소규모 슬롯 1
          const smallSlot1Apps = languageApps.filter(app => app.slot === 1)
          recordingSlots[`${language}-small-1`] = {
            slot: 1,
            language,
            currentCount: smallSlot1Apps.length,
            maxCount: 8,
            available: smallSlot1Apps.length < 8,
            applicants: smallSlot1Apps.map(app => app.employeeId)
          }
        } else if (language === 'chinese') {
          // 슬롯 5-8
          for (let slot = 5; slot <= 8; slot++) {
            const slotApps = languageApps.filter(app => app.slot === slot)
            recordingSlots[`${language}-${slot}`] = {
              slot,
              language,
              currentCount: slotApps.length,
              maxCount: 8,
              available: slotApps.length < 8,
              applicants: slotApps.map(app => app.employeeId)
            }
          }
        } else if (language === 'japanese') {
          // 슬롯 1-4, 9-12
          for (let slot = 1; slot <= 4; slot++) {
            const slotApps = languageApps.filter(app => app.slot === slot)
            recordingSlots[`${language}-${slot}`] = {
              slot,
              language,
              currentCount: slotApps.length,
              maxCount: 8,
              available: slotApps.length < 8,
              applicants: slotApps.map(app => app.employeeId)
            }
          }
          for (let slot = 9; slot <= 12; slot++) {
            const slotApps = languageApps.filter(app => app.slot === slot)
            recordingSlots[`${language}-${slot}`] = {
              slot,
              language,
              currentCount: slotApps.length,
              maxCount: 8,
              available: slotApps.length < 8,
              applicants: slotApps.map(app => app.employeeId)
            }
          }
          // 소규모 슬롯 1
          const smallSlot1Apps = languageApps.filter(app => app.slot === 1)
          recordingSlots[`${language}-small-1`] = {
            slot: 1,
            language,
            currentCount: smallSlot1Apps.length,
            maxCount: 8,
            available: smallSlot1Apps.length < 8,
            applicants: smallSlot1Apps.map(app => app.employeeId)
          }
        }
      })

      // 사용자의 신청 내역 확인
      const userEducationApps = dateEducationApps.filter(app => app.employeeId === employeeId)
      const userRecordingApps = dateRecordingApps.filter(app => app.employeeId === employeeId)

      availabilityData[date] = {
        education: {
          slots: Object.values(educationSlots),
          hasExistingApplication: userEducationApps.length > 0,
          userApplications: userEducationApps
        },
        recording: {
          slots: Object.values(recordingSlots),
          hasExistingApplication: userRecordingApps.length > 0,
          userApplications: userRecordingApps
        },
        lastUpdated: new Date().toISOString()
      }
    }

    console.log('✅ [Bulk Availability] 전체 가용성 데이터 조회 완료')

    return NextResponse.json({
      success: true,
      data: availabilityData,
      totalDates: allDates.length,
      totalEducationApplications: educationApplications.length,
      totalRecordingApplications: recordingApplications.length
    })

  } catch (error) {
    console.error('❌ [Bulk Availability] 에러:', error)
    return NextResponse.json(
      { error: '전체 가용성 데이터 조회 실패' },
      { status: 500 }
    )
  }
}
