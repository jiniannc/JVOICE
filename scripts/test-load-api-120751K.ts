/**
 * load-database API 시뮬레이션 - 120751K 평가자 이름 조회 테스트
 */

import { PrismaClient } from '../lib/generated/prisma';

const prisma = new PrismaClient();

async function testLoadDatabaseAPI() {
  try {
    console.log('🔍 [테스트] load-database API 평가자 이름 조회 시뮬레이션\n');
    
    // 11월 120751K가 평가자인 평가 1건 가져오기
    const evaluation = await prisma.evaluation.findFirst({
      where: {
        submittedAt: {
          gte: new Date('2025-11-01'),
          lt: new Date('2025-12-01'),
        },
        initialEvaluatedBy: '120751K',
      },
      include: {
        user: true,
      },
    });
    
    if (!evaluation) {
      console.log('❌ 평가 데이터를 찾을 수 없습니다.');
      return;
    }
    
    console.log('📊 평가 데이터:');
    console.log(`  - ID: ${evaluation.id}`);
    console.log(`  - 피평가자: ${evaluation.user.name} (${evaluation.user.employeeId})`);
    console.log(`  - 최초 평가자 (사번): ${evaluation.initialEvaluatedBy}`);
    console.log(`  - 최종 평가자 (사번): ${evaluation.evaluatedBy}`);
    console.log('');
    
    // API 로직 시뮬레이션
    let initialEvaluatorName = null;
    let finalEvaluatorName = null;
    
    if (evaluation.initialEvaluatedBy) {
      console.log(`🔍 최초 평가자 조회 시도: ${evaluation.initialEvaluatedBy}`);
      const initialEvaluator = await prisma.user.findUnique({
        where: { employeeId: evaluation.initialEvaluatedBy },
        select: { name: true, employeeId: true }
      });
      
      if (initialEvaluator) {
        console.log(`  ✅ 조회 성공:`, initialEvaluator);
        initialEvaluatorName = initialEvaluator.name;
      } else {
        console.log(`  ❌ 조회 실패: User 테이블에 없음`);
      }
      console.log('');
    }
    
    if (evaluation.evaluatedBy) {
      console.log(`🔍 최종 평가자 조회 시도: ${evaluation.evaluatedBy}`);
      const finalEvaluator = await prisma.user.findUnique({
        where: { employeeId: evaluation.evaluatedBy },
        select: { name: true, employeeId: true }
      });
      
      if (finalEvaluator) {
        console.log(`  ✅ 조회 성공:`, finalEvaluator);
        finalEvaluatorName = finalEvaluator.name;
      } else {
        console.log(`  ❌ 조회 실패: User 테이블에 없음`);
      }
      console.log('');
    }
    
    console.log('📊 [최종 결과]');
    console.log(`  - initialEvaluatedBy: ${evaluation.initialEvaluatedBy}`);
    console.log(`  - initialEvaluatedByName: ${initialEvaluatorName}`);
    console.log(`  - evaluatedBy: ${evaluation.evaluatedBy}`);
    console.log(`  - evaluatedByName: ${finalEvaluatorName}`);
    
    if (!initialEvaluatorName || !finalEvaluatorName) {
      console.log('\n❌ 문제 발견: 이름이 null입니다!');
      console.log('   → 프론트엔드에서 사번만 표시될 것입니다.');
    } else {
      console.log('\n✅ 정상: 이름이 모두 조회되었습니다.');
    }
    
  } catch (error) {
    console.error('❌ [오류]:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testLoadDatabaseAPI()
  .then(() => {
    console.log('\n🎉 테스트 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 테스트 실패:', error);
    process.exit(1);
  });




