/**
 * 전체 평가 데이터 월별 분포 및 평가자 정보 상태 확인
 */

import { PrismaClient } from '../lib/generated/prisma';

const prisma = new PrismaClient();

async function checkAllData() {
  try {
    console.log('🔍 [전체 진단] 평가 데이터 상태 확인...\n');
    
    // 1. 전체 평가 통계
    const totalEvaluations = await prisma.evaluation.count();
    console.log(`📊 전체 평가: ${totalEvaluations}건\n`);

    // 2. 월별 분포
    const evaluations = await prisma.evaluation.findMany({
      select: {
        submittedAt: true,
        evaluatedBy: true,
        initialEvaluatedBy: true,
        status: true,
      }
    });

    const monthlyStats: Record<string, any> = {};
    
    evaluations.forEach(e => {
      const month = e.submittedAt.toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyStats[month]) {
        monthlyStats[month] = {
          total: 0,
          withInitial: 0,
          withoutInitial: 0,
          noEvaluator: 0
        };
      }
      
      monthlyStats[month].total++;
      
      if (e.initialEvaluatedBy) {
        monthlyStats[month].withInitial++;
      } else if (e.evaluatedBy) {
        monthlyStats[month].withoutInitial++;
      } else {
        monthlyStats[month].noEvaluator++;
      }
    });

    console.log('📅 월별 평가 데이터 분포:\n');
    Object.keys(monthlyStats).sort().forEach(month => {
      const stats = monthlyStats[month];
      console.log(`${month}: 총 ${stats.total}건`);
      console.log(`  ✅ initialEvaluatedBy 있음: ${stats.withInitial}건`);
      console.log(`  ❌ initialEvaluatedBy 없음: ${stats.withoutInitial}건`);
      console.log(`  ⚠️  평가자 정보 없음: ${stats.noEvaluator}건\n`);
    });

    // 3. 복구 필요한 데이터 (evaluatedBy는 있지만 initialEvaluatedBy가 없는 경우)
    const needsFix = evaluations.filter(e => e.evaluatedBy && !e.initialEvaluatedBy);
    
    if (needsFix.length > 0) {
      console.log(`\n🔧 [복구 필요] ${needsFix.length}건 발견!\n`);
      console.log('복구를 실행하시겠습니까? (Y/N)');
      console.log('이 스크립트는 자동으로 복구를 실행합니다...\n');
      
      const evaluationsToFix = await prisma.evaluation.findMany({
        where: {
          evaluatedBy: {
            not: null
          },
          initialEvaluatedBy: null
        },
        select: {
          id: true,
          evaluatedBy: true,
          evaluatedAt: true,
          submittedAt: true,
        }
      });

      console.log(`🔧 [복구 시작] ${evaluationsToFix.length}건 복구 중...\n`);
      
      let fixedCount = 0;
      for (const evaluation of evaluationsToFix) {
        await prisma.evaluation.update({
          where: { id: evaluation.id },
          data: {
            initialEvaluatedBy: evaluation.evaluatedBy,
            initialEvaluatedAt: evaluation.evaluatedAt || evaluation.submittedAt
          }
        });
        fixedCount++;
        
        if (fixedCount % 10 === 0) {
          console.log(`  📝 진행 중: ${fixedCount}/${evaluationsToFix.length}건`);
        }
      }
      
      console.log(`\n✅ [복구 완료] ${fixedCount}건 복구됨!\n`);
    } else {
      console.log('\n✅ 복구 필요한 데이터가 없습니다!\n');
    }

    // 4. 최종 검증
    const finalStats = {
      total: await prisma.evaluation.count(),
      withBoth: await prisma.evaluation.count({
        where: {
          evaluatedBy: { not: null },
          initialEvaluatedBy: { not: null }
        }
      }),
      onlyFinal: await prisma.evaluation.count({
        where: {
          evaluatedBy: { not: null },
          initialEvaluatedBy: null
        }
      }),
      none: await prisma.evaluation.count({
        where: {
          evaluatedBy: null,
          initialEvaluatedBy: null
        }
      })
    };

    console.log('🎯 [최종 검증]');
    console.log(`  전체 평가: ${finalStats.total}건`);
    console.log(`  ✅ 최초+최종 평가자 모두 있음: ${finalStats.withBoth}건`);
    console.log(`  ❌ 최종 평가자만 있음: ${finalStats.onlyFinal}건`);
    console.log(`  ⚠️  평가자 정보 없음: ${finalStats.none}건`);

  } catch (error) {
    console.error('❌ [오류]:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkAllData()
  .then(() => {
    console.log('\n🎉 스크립트 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 스크립트 실패:', error);
    process.exit(1);
  });




