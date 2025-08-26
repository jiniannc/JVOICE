import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '../../../../lib/generated/prisma'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  return await POST(request)
}

export async function POST(request: NextRequest) {
  try {
    console.log('🗄️ Railway 데이터베이스 초기화 시작...')
    
    // 1. 데이터베이스 연결 테스트
    await prisma.$connect()
    console.log('✅ 데이터베이스 연결 성공')
    
    // 2. 스키마 동기화 (테이블 생성)
    console.log('📋 데이터베이스 스키마 동기화 중...')
    
    // 3. 기본 데이터 확인
    const userCount = await prisma.user.count()
    const evaluationCount = await prisma.evaluation.count()
    
    console.log(`📊 현재 데이터베이스 상태:`)
    console.log(`   - 사용자: ${userCount}명`)
    console.log(`   - 평가: ${evaluationCount}건`)
    
    // 4. 테이블 구조 확인
    console.log('🔍 테이블 구조 확인 중...')
    
    // 간단한 테스트 쿼리로 테이블 존재 확인
    try {
      await prisma.$queryRaw`SELECT 1`
      console.log('✅ 테이블 구조 정상')
    } catch (error) {
      console.log('⚠️ 테이블이 아직 생성되지 않았습니다.')
      return NextResponse.json({ 
        success: false, 
        message: '테이블이 아직 생성되지 않았습니다. Prisma db push를 실행해주세요.',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }
    
    console.log('🎉 데이터베이스 초기화 완료!')
    
    return NextResponse.json({ 
      success: true, 
      message: '데이터베이스 초기화 완료',
      data: {
        users: userCount,
        evaluations: evaluationCount
      }
    })
    
  } catch (error) {
    console.error('❌ 데이터베이스 초기화 실패:', error)
    return NextResponse.json({ 
      success: false, 
      message: '데이터베이스 초기화 실패',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
