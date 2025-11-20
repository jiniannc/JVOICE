/**
 * 수정된 쿼리 테스트
 */

import { PrismaClient } from '../lib/generated/prisma';

const prisma = new PrismaClient();

async function testFixedQuery() {
  try {
    const month = '2025-10';
    console.log(`\n🔍 [테스트] ${month} 데이터 조회 (수정된 쿼리)\n`);
    
    const evaluations = await prisma.evaluation.findMany({
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
          in: ["submitted", "completed", "approved"], // ✅ approved 추가!
        },
        initialEvaluatedBy: {
          not: null,
        },
      },
      select: {
        id: true,
        status: true,
        initialEvaluatedBy: true,
        initialEvaluatedAt: true,
        language: true,
      },
    });
    
    console.log(`✅ [수정된 쿼리] ${evaluations.length}건 조회됨\n`);
    
    // 교관별 집계
    const instructorMap = new Map<string, { count: number, languages: Record<string, number> }>();
    
    evaluations.forEach(e => {
      const id = e.initialEvaluatedBy!;
      if (!instructorMap.has(id)) {
        instructorMap.set(id, { count: 0, languages: {} });
      }
      const data = instructorMap.get(id)!;
      data.count++;
      
      const lang = e.language || 'unknown';
      data.languages[lang] = (data.languages[lang] || 0) + 1;
    });
    
    console.log('📊 교관별 평가 건수:\n');
    Array.from(instructorMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .forEach(([id, data]) => {
        const langStr = Object.entries(data.languages)
          .map(([lang, count]) => `${lang}: ${count}`)
          .join(', ');
        console.log(`  ${id}: ${data.count}건 (${langStr})`);
      });
    
    console.log(`\n✅ 총 교관: ${instructorMap.size}명`);
    console.log(`✅ 총 평가: ${evaluations.length}건`);
    console.log(`✅ 평가 시간: ${(evaluations.length * 0.25).toFixed(1)}시간 (4건당 1시간)`);
    
  } catch (error) {
    console.error('❌ [오류]:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testFixedQuery()
  .then(() => {
    console.log('\n🎉 테스트 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 테스트 실패:', error);
    process.exit(1);
  });




