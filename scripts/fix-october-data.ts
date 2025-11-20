/**
 * 10월 평가 데이터 상태 확인 및 복구 스크립트
 */

import { PrismaClient } from '../lib/generated/prisma';

const prisma = new PrismaClient();

async function checkAndFixOctoberData() {
  try {
    console.log('🔍 [진단] 10월 평가 데이터 상태 확인...');
    
    // 1. 10월 전체 평가 조회
    const octoberEvaluations = await prisma.evaluation.findMany({
      where: {
        submittedAt: {
          gte: new Date('2024-10-01T00:00:00.000Z'),
          lt: new Date('2024-11-01T00:00:00.000Z')
        }
      },
      select: {
        id: true,
        status: true,
        evaluatedBy: true,
        initialEvaluatedBy: true,
        evaluatedAt: true,
        submittedAt: true,
      },
      orderBy: {
        submittedAt: 'desc'
      }
    });

    console.log(`📊 [진단] 10월 전체 평가: ${octoberEvaluations.length}건`);

    // 2. 상태별 분류
    const withInitial = octoberEvaluations.filter(e => e.initialEvaluatedBy);
    const withoutInitial = octoberEvaluations.filter(e => !e.initialEvaluatedBy && e.evaluatedBy);
    const noEvaluator = octoberEvaluations.filter(e => !e.evaluatedBy && !e.initialEvaluatedBy);

    console.log(`\n✅ initialEvaluatedBy 있음: ${withInitial.length}건`);
    console.log(`❌ initialEvaluatedBy 없음 (evaluatedBy만 있음): ${withoutInitial.length}건`);
    console.log(`⚠️  평가자 정보 전혀 없음: ${noEvaluator.length}건`);

    // 3. 복구 필요한 데이터 (evaluatedBy는 있지만 initialEvaluatedBy가 없는 경우)
    if (withoutInitial.length > 0) {
      console.log(`\n🔧 [복구] ${withoutInitial.length}건 복구 시작...`);
      
      let fixedCount = 0;
      for (const evaluation of withoutInitial) {
        await prisma.evaluation.update({
          where: { id: evaluation.id },
          data: {
            initialEvaluatedBy: evaluation.evaluatedBy,
            initialEvaluatedAt: evaluation.evaluatedAt || evaluation.submittedAt
          }
        });
        fixedCount++;
        
        if (fixedCount % 10 === 0) {
          console.log(`  📝 진행 중: ${fixedCount}/${withoutInitial.length}건`);
        }
      }
      
      console.log(`✅ [복구] ${fixedCount}건 복구 완료!`);
    }

    // 4. 최종 검증
    const finalCheck = await prisma.evaluation.count({
      where: {
        submittedAt: {
          gte: new Date('2024-10-01T00:00:00.000Z'),
          lt: new Date('2024-11-01T00:00:00.000Z')
        },
        evaluatedBy: {
          not: null
        },
        initialEvaluatedBy: {
          not: null
        }
      }
    });

    console.log(`\n🎯 [검증] 평가자 정보 완전한 10월 평가: ${finalCheck}건 / ${octoberEvaluations.length}건`);

    // 5. 샘플 데이터 출력
    console.log('\n📋 [샘플] 10월 평가 데이터 (최근 5건):');
    const samples = await prisma.evaluation.findMany({
      where: {
        submittedAt: {
          gte: new Date('2024-10-01T00:00:00.000Z'),
          lt: new Date('2024-11-01T00:00:00.000Z')
        }
      },
      include: {
        user: {
          select: {
            name: true,
            employeeId: true
          }
        }
      },
      orderBy: {
        submittedAt: 'desc'
      },
      take: 5
    });

    samples.forEach((s, idx) => {
      console.log(`\n${idx + 1}. ${s.user.name} (${s.user.employeeId})`);
      console.log(`   제출일: ${s.submittedAt.toISOString().split('T')[0]}`);
      console.log(`   상태: ${s.status}`);
      console.log(`   최초 평가자: ${s.initialEvaluatedBy || 'NULL'}`);
      console.log(`   최종 평가자: ${s.evaluatedBy || 'NULL'}`);
    });

  } catch (error) {
    console.error('❌ [오류]:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkAndFixOctoberData()
  .then(() => {
    console.log('\n🎉 스크립트 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 스크립트 실패:', error);
    process.exit(1);
  });




