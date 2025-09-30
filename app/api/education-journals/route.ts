import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/database'
import { employeeDB } from '../../../lib/employee-database'

// 교육 일지 조회 (GET)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const traineeEmployeeId = searchParams.get('traineeEmployeeId')
  const instructorEmployeeId = searchParams.get('instructorEmployeeId')
  const educationDate = searchParams.get('educationDate')
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50

  try {
    console.log('📚 [education-journals] 교육 일지 조회 시작:', {
      traineeEmployeeId,
      instructorEmployeeId,
      educationDate,
      limit
    })

    const whereCondition: any = {}

    // 교육생별 조회
    if (traineeEmployeeId) {
      whereCondition.traineeEmployeeId = traineeEmployeeId
    }

    // 교관별 조회
    if (instructorEmployeeId) {
      whereCondition.instructorEmployeeId = instructorEmployeeId
    }

    // 날짜별 조회
    if (educationDate) {
      const startDate = new Date(educationDate)
      const endDate = new Date(educationDate)
      endDate.setDate(endDate.getDate() + 1)
      
      whereCondition.educationDate = {
        gte: startDate,
        lt: endDate
      }
    }

    const journals = await prisma.educationJournal.findMany({
      where: whereCondition,
      orderBy: [
        { educationDate: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit
    })

    console.log(`📚 [education-journals] 찾은 일지: ${journals.length}개`)

    return NextResponse.json({
      success: true,
      journals: journals,
      count: journals.length
    })

  } catch (error) {
    console.error('📚 [education-journals] 조회 실패:', error)
    return NextResponse.json({
      success: false,
      error: '교육 일지 조회에 실패했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 })
  }
}

// 교육 일지 생성 (POST)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      educationSessionId,
      traineeEmployeeId,
      traineeName,
      instructorEmployeeId,
      instructorName,
      educationDate,
      educationType,
      educationLanguage,
      educationSlot,
      contentCategories,
      detailedContent,
      feedback,
      rating
    } = body

    console.log('📚 [education-journals] 일지 생성 요청:', {
      traineeEmployeeId,
      instructorEmployeeId,
      educationDate,
      educationType
    })

    // 필수 필드 검증
    if (!traineeEmployeeId || !traineeName || !instructorEmployeeId || !instructorName || 
        !educationDate || !educationType || !educationLanguage || !educationSlot || 
        !contentCategories || !detailedContent) {
      return NextResponse.json({
        success: false,
        error: '필수 필드가 누락되었습니다.'
      }, { status: 400 })
    }

    // 교육 일지 생성
    const journal = await prisma.educationJournal.create({
      data: {
        educationSessionId,
        traineeEmployeeId,
        traineeName,
        instructorEmployeeId,
        instructorName,
        educationDate: new Date(educationDate),
        educationType,
        educationLanguage,
        educationSlot: parseInt(educationSlot),
        contentCategories: Array.isArray(contentCategories) ? contentCategories : [contentCategories],
        detailedContent,
        feedback: feedback || '',
        rating: rating ? parseInt(rating) : null
      }
    })

    console.log('📚 [education-journals] 일지 생성 완료:', journal.id)

    return NextResponse.json({
      success: true,
      journal: journal
    })

  } catch (error) {
    console.error('📚 [education-journals] 생성 실패:', error)
    return NextResponse.json({
      success: false,
      error: '교육 일지 생성에 실패했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 })
  }
}

// 교육 일지 수정 (PUT)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      id,
      contentCategories,
      detailedContent,
      feedback,
      rating
    } = body

    console.log('📚 [education-journals] 일지 수정 요청:', id)

    if (!id) {
      return NextResponse.json({
        success: false,
        error: '일지 ID가 필요합니다.'
      }, { status: 400 })
    }

    // 교육 일지 수정
    const journal = await prisma.educationJournal.update({
      where: { id },
      data: {
        contentCategories: Array.isArray(contentCategories) ? contentCategories : [contentCategories],
        detailedContent,
        feedback: feedback || '',
        rating: rating ? parseInt(rating) : null,
        updatedAt: new Date()
      }
    })

    console.log('📚 [education-journals] 일지 수정 완료:', journal.id)

    return NextResponse.json({
      success: true,
      journal: journal
    })

  } catch (error) {
    console.error('📚 [education-journals] 수정 실패:', error)
    return NextResponse.json({
      success: false,
      error: '교육 일지 수정에 실패했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 })
  }
}

// 교육 일지 삭제 (DELETE)
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  try {
    console.log('📚 [education-journals] 일지 삭제 요청:', id)

    if (!id) {
      return NextResponse.json({
        success: false,
        error: '일지 ID가 필요합니다.'
      }, { status: 400 })
    }

    // 교육 일지 삭제
    await prisma.educationJournal.delete({
      where: { id }
    })

    console.log('📚 [education-journals] 일지 삭제 완료:', id)

    return NextResponse.json({
      success: true,
      message: '교육 일지가 삭제되었습니다.'
    })

  } catch (error) {
    console.error('📚 [education-journals] 삭제 실패:', error)
    return NextResponse.json({
      success: false,
      error: '교육 일지 삭제에 실패했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 })
  }
}
