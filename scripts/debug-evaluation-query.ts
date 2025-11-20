/**
 * 평가 데이터 조회 디버깅 스크립트
 * 교육 일지와 평가 데이터를 비교하여 문제점 파악
 */

import { PrismaClient } from '../lib/generated/prisma';

const prisma = new PrismaClient();

async function debugEvaluationQueries() {
  try {
    const month = '2025-10'; // 10월 데이터 확인
    console.log(`\n🔍 [디버깅] ${month} 데이터 비교\n`);
    
    // 1. 교육 일지 쿼리 (잘 작동하는 쿼리)
    const startDate = new Date(`${month}-01T00:00:00Z`);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59, 999);
    
    console.log('📅 날짜 범위:');
    console.log(`  startDate: ${startDate.toISOString()}`);
    console.log(`  endDate: ${endDate.toISOString()}\n`);
    
    const educationJournals = await prisma.educationJournal.findMany({
      where: {
        educationDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
    
    console.log(`✅ [교육 일지] ${educationJournals.length}건 조회됨\n`);
    
    // 2. 기존 평가 쿼리 (문제 있는 쿼리)
    const evaluationsOld = await prisma.evaluation.findMany({
      where: {
        OR: [
          {
            initialEvaluatedAt: {
              gte: new Date(`${month}-01`),
              lt: new Date(`${month}-31T23:59:59`),
            },
          },
          {
            initialEvaluatedAt: null,
            evaluatedAt: {
              gte: new Date(`${month}-01`),
              lt: new Date(`${month}-31T23:59:59`),
            },
          }
        ],
        status: {
          in: ["submitted", "completed"],
        },
        initialEvaluatedBy: {
          not: null,
        },
      },
    });
    
    console.log(`❌ [기존 쿼리] ${evaluationsOld.length}건 조회됨\n`);
    
    // 3. 개선된 평가 쿼리 (교육 일지와 동일한 날짜 범위 사용)
    const evaluationsNew = await prisma.evaluation.findMany({
      where: {
        OR: [
          {
            initialEvaluatedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            initialEvaluatedAt: null,
            evaluatedAt: {
              gte: startDate,
              lte: endDate,
            },
          }
        ],
        status: {
          in: ["submitted", "completed"],
        },
        initialEvaluatedBy: {
          not: null,
        },
      },
    });
    
    console.log(`✅ [개선 쿼리] ${evaluationsNew.length}건 조회됨\n`);
    
    // 4. 전체 10월 평가 조회 (조건 없이)
    const allOctoberEvaluations = await prisma.evaluation.findMany({
      where: {
        OR: [
          {
            initialEvaluatedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            evaluatedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            submittedAt: {
              gte: startDate,
              lte: endDate,
            },
          }
        ],
      },
      select: {
        id: true,
        status: true,
        initialEvaluatedBy: true,
        evaluatedBy: true,
        initialEvaluatedAt: true,
        evaluatedAt: true,
        submittedAt: true,
      },
    });
    
    console.log(`📊 [전체 10월 평가] ${allOctoberEvaluations.length}건\n`);
    
    // 상태별 분류
    const statusGroups: Record<string, number> = {};
    const withInitial = allOctoberEvaluations.filter(e => e.initialEvaluatedBy);
    const withoutInitial = allOctoberEvaluations.filter(e => !e.initialEvaluatedBy && e.evaluatedBy);
    const submitted = allOctoberEvaluations.filter(e => e.status === 'submitted' || e.status === 'completed');
    
    allOctoberEvaluations.forEach(e => {
      statusGroups[e.status] = (statusGroups[e.status] || 0) + 1;
    });
    
    console.log('📋 상태별 분류:');
    Object.keys(statusGroups).sort().forEach(status => {
      console.log(`  ${status}: ${statusGroups[status]}건`);
    });
    console.log('');
    
    console.log('👥 평가자 정보:');
    console.log(`  ✅ initialEvaluatedBy 있음: ${withInitial.length}건`);
    console.log(`  ❌ initialEvaluatedBy 없음: ${withoutInitial.length}건`);
    console.log(`  📝 submitted/completed: ${submitted.length}건\n`);
    
    // 5. 샘플 데이터 출력
    console.log('📋 [샘플] 10월 평가 데이터 (최근 10건):\n');
    allOctoberEvaluations.slice(0, 10).forEach((e, idx) => {
      console.log(`${idx + 1}. ID: ${e.id.substring(0, 8)}...`);
      console.log(`   상태: ${e.status}`);
      console.log(`   최초 평가자: ${e.initialEvaluatedBy || 'NULL'}`);
      console.log(`   최종 평가자: ${e.evaluatedBy || 'NULL'}`);
      console.log(`   최초 평가 시간: ${e.initialEvaluatedAt?.toISOString() || 'NULL'}`);
      console.log(`   최종 평가 시간: ${e.evaluatedAt?.toISOString() || 'NULL'}`);
      console.log(`   제출 시간: ${e.submittedAt.toISOString()}`);
      console.log('');
    });
    
    // 6. 문제 진단
    console.log('🔍 [진단 결과]\n');
    
    if (evaluationsOld.length === 0 && allOctoberEvaluations.length > 0) {
      console.log('❌ 문제 발견!');
      console.log('  → 10월 평가 데이터는 존재하지만, API 쿼리 조건에 맞지 않음\n');
      
      console.log('🔧 [원인 분석]');
      
      if (withInitial.length === 0) {
        console.log('  1️⃣ initialEvaluatedBy가 모두 NULL');
      } else {
        console.log(`  1️⃣ initialEvaluatedBy 있음: ${withInitial.length}건`);
      }
      
      if (submitted.length < allOctoberEvaluations.length) {
        console.log(`  2️⃣ submitted/completed 상태가 아닌 데이터: ${allOctoberEvaluations.length - submitted.length}건`);
      }
      
      // 날짜 필드 확인
      const withInitialDate = allOctoberEvaluations.filter(e => e.initialEvaluatedAt);
      const withEvaluatedDate = allOctoberEvaluations.filter(e => e.evaluatedAt);
      console.log(`  3️⃣ initialEvaluatedAt 있음: ${withInitialDate.length}건`);
      console.log(`  4️⃣ evaluatedAt 있음: ${withEvaluatedDate.length}건`);
    } else if (evaluationsNew.length > evaluationsOld.length) {
      console.log('✅ 개선된 쿼리가 더 많은 데이터를 조회했습니다!');
      console.log(`  차이: ${evaluationsNew.length - evaluationsOld.length}건`);
    } else if (evaluationsNew.length === 0) {
      console.log('❌ 두 쿼리 모두 0건 - 근본적인 문제가 있습니다!');
    }
    
  } catch (error) {
    console.error('❌ [오류]:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

debugEvaluationQueries()
  .then(() => {
    console.log('\n🎉 디버깅 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 디버깅 실패:', error);
    process.exit(1);
  });




