/**
 * 기존 평가 데이터의 evaluatedBy를 initialEvaluatedBy로 복사하는 마이그레이션 스크립트
 * 목적: 기존 평가 데이터도 교관 통계에 집계되도록 함
 */

import { PrismaClient } from '../lib/generated/prisma';

const prisma = new PrismaClient();

async function migrateInitialEvaluator() {
  try {
    console.log('🔄 [마이그레이션] initialEvaluatedBy 필드 마이그레이션 시작...');
    
    // 1. evaluatedBy는 있지만 initialEvaluatedBy가 NULL인 평가 조회
    const evaluationsToMigrate = await prisma.evaluation.findMany({
      where: {
        evaluatedBy: {
          not: null,
        },
        initialEvaluatedBy: null, // 마이그레이션이 필요한 레코드
      },
      select: {
        id: true,
        evaluatedBy: true,
        evaluatedAt: true,
        status: true,
      },
    });

    console.log(`📊 [마이그레이션] 마이그레이션 대상: ${evaluationsToMigrate.length}건`);

    if (evaluationsToMigrate.length === 0) {
      console.log('✅ [마이그레이션] 마이그레이션이 필요한 데이터가 없습니다.');
      return;
    }

    // 2. 각 평가의 evaluatedBy를 initialEvaluatedBy로 복사
    let successCount = 0;
    let errorCount = 0;

    for (const evaluation of evaluationsToMigrate) {
      try {
        await prisma.evaluation.update({
          where: { id: evaluation.id },
          data: {
            initialEvaluatedBy: evaluation.evaluatedBy,
            initialEvaluatedAt: evaluation.evaluatedAt || new Date(), // evaluatedAt이 없으면 현재 시간
          },
        });

        successCount++;
        
        if (successCount % 10 === 0) {
          console.log(`📝 [마이그레이션] 진행 중: ${successCount}/${evaluationsToMigrate.length}`);
        }
      } catch (error) {
        console.error(`❌ [마이그레이션] 실패 - ID: ${evaluation.id}`, error);
        errorCount++;
      }
    }

    console.log('\n✅ [마이그레이션] 완료!');
    console.log(`   - 성공: ${successCount}건`);
    console.log(`   - 실패: ${errorCount}건`);
    console.log(`   - 전체: ${evaluationsToMigrate.length}건`);

    // 3. 검증: 마이그레이션 결과 확인
    const verifyCount = await prisma.evaluation.count({
      where: {
        evaluatedBy: {
          not: null,
        },
        initialEvaluatedBy: {
          not: null,
        },
      },
    });

    console.log(`\n🔍 [검증] evaluatedBy와 initialEvaluatedBy가 모두 있는 평가: ${verifyCount}건`);

    const remainingCount = await prisma.evaluation.count({
      where: {
        evaluatedBy: {
          not: null,
        },
        initialEvaluatedBy: null,
      },
    });

    if (remainingCount > 0) {
      console.warn(`⚠️  [경고] 아직 마이그레이션이 필요한 평가가 ${remainingCount}건 남아있습니다.`);
    } else {
      console.log('✅ [검증] 모든 평가 데이터 마이그레이션 완료!');
    }

  } catch (error) {
    console.error('❌ [마이그레이션] 치명적 오류:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
migrateInitialEvaluator()
  .then(() => {
    console.log('\n🎉 마이그레이션 스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 마이그레이션 스크립트 실행 실패:', error);
    process.exit(1);
  });

