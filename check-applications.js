const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkApplications() {
  try {
    console.log('🔍 녹음 신청 데이터 조회 중...\n')

    // 최근 녹음 신청 데이터 조회
    const applications = await prisma.scheduleApplication.findMany({
      where: {
        status: 'ACTIVE',
        schedule: {
          type: 'recording'
        }
      },
      include: {
        schedule: true,
        user: {
          select: {
            name: true,
            employeeId: true
          }
        }
      },
      orderBy: {
        schedule: { date: 'desc' }
      },
      take: 10
    })

    console.log(`📊 최근 녹음 신청 ${applications.length}건:\n`)

    applications.forEach((app, idx) => {
      console.log(`\n[${idx + 1}] ==================`)
      console.log(`👤 신청자: ${app.user?.name} (${app.user?.employeeId})`)
      console.log(`📅 신청 날짜 (DB 원본): ${app.schedule.date}`)
      
      const scheduleDate = new Date(app.schedule.date)
      console.log(`📅 신청 날짜 (Date 객체): ${scheduleDate.toISOString()}`)
      
      const kstOffset = 9 * 60 * 60 * 1000
      const kstDate = new Date(scheduleDate.getTime() + kstOffset)
      console.log(`📅 신청 날짜 (KST 변환): ${kstDate.toISOString()}`)
      console.log(`📅 신청 날짜 (KST 표시): ${kstDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}`)
      
      console.log(`🎯 차수: ${app.slot}차수`)
      console.log(`📝 신청 상태: ${app.status}`)
      
      // details 필드 확인 (JSON)
      console.log(`📋 Details (원본):`, app.details)
      
      if (app.details) {
        const details = typeof app.details === 'string' ? JSON.parse(app.details) : app.details
        console.log(`📋 Details (파싱):`, JSON.stringify(details, null, 2))
        console.log(`🌐 녹음 언어: ${details?.recordingLanguage || 'NULL'}`)
        console.log(`📂 평가 구분: ${details?.category || 'NULL'}`)
      }
    })

    // 오늘 날짜 확인
    console.log('\n\n🕐 현재 시간 정보:')
    const now = new Date()
    const kstOffset = 9 * 60 * 60 * 1000
    const kstNow = new Date(now.getTime() + kstOffset)
    const todayKST = new Date(kstNow.getFullYear(), kstNow.getMonth(), kstNow.getDate())
    const todayStart = new Date(todayKST.getTime() - kstOffset)
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
    
    console.log(`📅 현재 시간 (UTC): ${now.toISOString()}`)
    console.log(`📅 현재 시간 (KST): ${kstNow.toISOString()}`)
    console.log(`📅 오늘 (KST 표시): ${kstNow.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}`)
    console.log(`📅 오늘 범위 (UTC): ${todayStart.toISOString()} ~ ${todayEnd.toISOString()}`)

    // 오늘 신청자 필터링
    console.log('\n\n🎯 오늘 신청자 필터링 테스트:')
    const todayApplications = applications.filter(app => {
      const scheduleDate = new Date(app.schedule.date)
      const match = scheduleDate >= todayStart && scheduleDate < todayEnd
      console.log(`  - ${app.user?.name}: ${scheduleDate.toISOString()} → ${match ? '✅ 오늘' : '❌ 다른 날'}`)
      return match
    })

    console.log(`\n✅ 오늘 신청자: ${todayApplications.length}명`)
    todayApplications.forEach(app => {
      const details = typeof app.details === 'string' ? JSON.parse(app.details) : app.details
      console.log(`  - ${app.user?.name} (${app.user?.employeeId}): ${app.slot}차수 - ${details?.recordingLanguage || 'NULL'}`)
    })

  } catch (error) {
    console.error('❌ 오류:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkApplications()









