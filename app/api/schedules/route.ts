import { NextRequest, NextResponse } from "next/server"
import { fetchMonthSchedule } from "@/lib/schedule-service"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const month = searchParams.get("month") || new Date().toISOString().slice(0,7)
    const forceSheets = searchParams.get("forceSheets") === "true"
    
    console.log(`📅 [schedules] ${month} 조회 (forceSheets: ${forceSheets})`)

    // Database 우선 조회 (forceSheets가 아닌 경우)
    if (!forceSheets) {
      try {
        // 직접 데이터베이스 API 로직 실행
        const { PrismaClient } = await import('@/lib/generated/prisma')
        const prisma = new PrismaClient()
        
        console.log(`📅 [schedules-database] ${month} 스케줄 조회`)
        
        // Database에서 월별 스케줄 조회
        const monthlySchedule = await prisma.monthlySchedule.findUnique({
          where: { month }
        })
        
        if (monthlySchedule) {
          // 신청 현황도 함께 조회 (실시간)
          const applications = await prisma.scheduleApplication.findMany({
            where: {
              schedule: {
                month: month
              },
              status: "ACTIVE"
            },
            include: {
              schedule: {
                select: {
                  date: true,
                  type: true,
                  classType: true
                }
              },
              user: {
                select: {
                  name: true,
                  employeeId: true
                }
              }
            }
          })
          
          // 신청 현황을 스케줄 데이터에 병합
          const scheduleData = monthlySchedule.sheetData as any
          
          // 신청 현황 맵 생성 (성능 최적화)
          const applicationMap = new Map()
          applications.forEach(app => {
            const key = `${app.schedule.date}-${app.schedule.type}-${app.schedule.classType}-${app.slot}`
            if (!applicationMap.has(key)) {
              applicationMap.set(key, [])
            }
            applicationMap.get(key).push({
              employeeId: app.user.employeeId,
              name: app.user.name,
              appliedAt: app.appliedAt
            })
          })
          
          // 타입별 수용 인원 계산 함수
          const getCapacityByType = (type: string, classType: string): number => {
            if (classType === "small") {
              return 4 // 소그룹은 4명
            }
            return 1 // 1:1은 1명
          }
          
          // 스케줄 데이터에 신청 현황 추가
          if (scheduleData?.dates) {
            Object.values(scheduleData.dates).forEach((dayData: any) => {
              if (dayData.educations) {
                dayData.educations.forEach((education: any) => {
                  education.availableSlots.forEach((slot: number) => {
                    const key = `${dayData.date}-${education.type}-${education.classType}-${slot}`
                    const applicants = applicationMap.get(key) || []
                    
                    // 신청 현황 정보 추가
                    education.applications = education.applications || {}
                    education.applications[slot] = applicants
                    education.availability = education.availability || {}
                    education.availability[slot] = {
                      current: applicants.length,
                      capacity: getCapacityByType(education.type, education.classType),
                      available: getCapacityByType(education.type, education.classType) - applicants.length > 0
                    }
                  })
                })
              }
            })
          }
          
          console.log(`✅ [schedules] Database에서 ${month} 조회 완료 (신청 ${applications.length}건 포함)`)
          
          await prisma.$disconnect()
          
          return NextResponse.json({ 
            success: true, 
            data: scheduleData,
            meta: { 
              month,
              syncedAt: monthlySchedule.syncedAt,
              totalApplications: applications.length,
              source: "database"
            }
          })
        } else {
          console.log(`❌ [schedules] ${month} 스케줄이 Database에 없음`)
          await prisma.$disconnect()
        }
        
      } catch (dbError) {
        console.error(`❌ [schedules] Database 조회 중 오류:`, dbError)
      }
    }

    // Google Sheets에서 조회 (fallback 또는 강제)
    console.log(`📊 [schedules] Google Sheets에서 ${month} 조회`)
    const data = await fetchMonthSchedule(month)
    
    return NextResponse.json({ 
      success: true, 
      data,
      meta: { source: "sheets", needsSync: !forceSheets }
    })
    
  } catch (e: any) {
    console.error(`❌ [schedules] 조회 실패:`, e)
    return NextResponse.json({ 
      success: false, 
      error: e?.message || String(e),
      meta: { source: "error" }
    }, { status: 500 })
  }
}



