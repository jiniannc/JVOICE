import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/database'
import * as XLSX from 'xlsx'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') // YYYY-MM 형식
    const language = searchParams.get('language') || 'all'
    const educationType = searchParams.get('educationType') || 'all'

    console.log(`📊 [Excel 내보내기] 요청: ${month}, 언어: ${language}, 타입: ${educationType}`)

    // 모든 체크인 내역 조회 (관리자용) - 교육 신청 정보와 사용자 정보 포함
    const checkins = await prisma.educationCheckin.findMany({
      include: {
        user: true // 사용자 정보 포함
      },
      orderBy: {
        checkinTime: 'desc'
      }
    })

    // 각 체크인에 대해 교육 신청 정보를 조회하고 필터링
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
              }
            }
          }
        }

        return {
          id: checkin.id,
          employeeId: checkin.employeeId,
          name: checkin.user.name,
          department: checkin.user.department,
          date: educationInfo.date,
          slot: educationInfo.slot,
          educationType: educationInfo.educationType,
          language: educationInfo.language,
          category: educationInfo.category,
          isCheckedIn: true,
          checkinTime: checkin.checkinTime.toISOString(),
          instructorName: null,
          location: null
        }
      })
    )

    // 필터링 적용
    let filteredRecords = enrichedCheckins.filter(record => {
      // 월별 필터링
      if (month && month !== "all") {
        const recordMonth = record.date.slice(0, 7)
        if (recordMonth !== month) {
          return false
        }
      }

      // 언어 필터
      if (language !== "all" && record.language !== language) {
        return false
      }

      // 교육 타입 필터
      if (educationType !== "all" && record.educationType !== educationType) {
        return false
      }

      return true
    })

    // 교육일 순으로 정렬 (가장 최신이 위로)
    filteredRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    console.log(`📊 [Excel 내보내기] 필터링된 기록: ${filteredRecords.length}건`)

    // Excel 데이터 준비
    const excelData = filteredRecords.map((record, index) => ({
      '번호': index + 1,
      '이름': record.name,
      '사번': record.employeeId,
      '부서': record.department || '-',
      '교육일': new Date(record.date).toLocaleDateString('ko-KR'),
      '차수': `${record.slot}차`,
      '언어': record.language === 'korean-english' ? '한/영' : 
              record.language === 'japanese' ? '일본어' : 
              record.language === 'chinese' ? '중국어' : record.language,
      '타입': record.educationType === '1:1' ? '1:1' : '소규모',
      '체크인 시간': new Date(record.checkinTime).toLocaleString('ko-KR'),
      '상태': '체크인 완료'
    }))

    // Excel 워크북 생성
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(excelData)

    // 컬럼 너비 설정
    const columnWidths = [
      { wch: 8 },  // 번호
      { wch: 12 }, // 이름
      { wch: 12 }, // 사번
      { wch: 15 }, // 부서
      { wch: 12 }, // 교육일
      { wch: 8 },  // 차수
      { wch: 10 }, // 언어
      { wch: 8 },  // 타입
      { wch: 20 }, // 체크인 시간
      { wch: 12 }  // 상태
    ]
    worksheet['!cols'] = columnWidths

    // 워크시트를 워크북에 추가
    const sheetName = month && month !== 'all' ? `교육이수기록_${month}` : '교육이수기록_전체'
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

    // Excel 파일을 버퍼로 생성
    const excelBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx' 
    })

    // 파일명 생성
    const fileName = month && month !== 'all' 
      ? `교육이수기록_${month}_${new Date().toISOString().split('T')[0]}.xlsx`
      : `교육이수기록_전체_${new Date().toISOString().split('T')[0]}.xlsx`

    console.log(`📊 [Excel 내보내기] 파일 생성 완료: ${fileName}`)

    // Excel 파일 응답
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Content-Length': excelBuffer.length.toString()
      }
    })

  } catch (error) {
    console.error('📊 [Excel 내보내기] 오류:', error)
    return NextResponse.json(
      { error: 'Excel 파일 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
