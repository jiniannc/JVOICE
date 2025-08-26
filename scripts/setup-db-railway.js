const { execSync } = require('child_process');

console.log('🗄️ Railway 데이터베이스 스키마 설정 시작...');

try {
  // 1. Prisma 클라이언트 생성
  console.log('📋 Prisma 클라이언트 생성 중...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  // 2. 데이터베이스 스키마 푸시
  console.log('📊 데이터베이스 스키마 생성 중...');
  execSync('npx prisma db push', { stdio: 'inherit' });
  
  // 3. 데이터베이스 상태 확인
  console.log('✅ 데이터베이스 스키마 설정 완료!');
  
} catch (error) {
  console.error('❌ 오류 발생:', error.message);
  process.exit(1);
}

