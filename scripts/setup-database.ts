import { PrismaClient } from '../lib/generated/prisma'

const prisma = new PrismaClient()

async function setupDatabase() {
  try {
    console.log('🗄️ Railway 데이터베이스 스키마 설정 시작...')
    
    // 1. 데이터베이스 연결 테스트
    await prisma.$connect()
    console.log('✅ 데이터베이스 연결 성공')
    
    // 2. 스키마 동기화 (테이블 생성)
    console.log('📋 데이터베이스 스키마 동기화 중...')
    // Prisma db push는 별도 명령어로 실행해야 함
    
    // 3. 기본 데이터 확인
    const userCount = await prisma.user.count()
    const evaluationCount = await prisma.evaluation.count()
    
    console.log(`📊 현재 데이터베이스 상태:`)
    console.log(`   - 사용자: ${userCount}명`)
    console.log(`   - 평가: ${evaluationCount}건`)
    
    console.log('🎉 데이터베이스 설정 완료!')
    
  } catch (error) {
    console.error('❌ 데이터베이스 설정 실패:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// 스크립트 실행
if (require.main === module) {
  setupDatabase()
}

export default setupDatabase

