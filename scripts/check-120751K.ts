/**
 * 120751K 사번 사용자 데이터베이스 확인
 */

import { PrismaClient } from '../lib/generated/prisma';

const prisma = new PrismaClient();

async function checkUser120751K() {
  try {
    console.log('🔍 [확인] 120751K 사용자 데이터 조회\n');
    
    // 1. User 테이블에서 120751K 확인
    const user = await prisma.user.findUnique({
      where: { employeeId: '120751K' },
      select: {
        employeeId: true,
        name: true,
        email: true,
        isInstructor: true,
        isAdmin: true,
        createdAt: true,
      }
    });
    
    console.log('👤 [User 테이블] 120751K 정보:');
    if (user) {
      console.log('  ✅ 존재함');
      console.log('  - 사번:', user.employeeId);
      console.log('  - 이름:', user.name);
      console.log('  - 이메일:', user.email);
      console.log('  - 교관:', user.isInstructor);
      console.log('  - 관리자:', user.isAdmin);
      console.log('  - 생성일:', user.createdAt.toISOString());
    } else {
      console.log('  ❌ User 테이블에 없음!');
    }
    console.log('');
    
    // 2. 11월 평가 데이터에서 120751K 확인
    const evaluations = await prisma.evaluation.findMany({
      where: {
        submittedAt: {
          gte: new Date('2025-11-01'),
          lt: new Date('2025-12-01'),
        },
        OR: [
          { initialEvaluatedBy: '120751K' },
          { evaluatedBy: '120751K' },
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
    
    console.log(`📊 [11월 평가] 120751K 관련 평가: ${evaluations.length}건\n`);
    
    evaluations.slice(0, 5).forEach((e, idx) => {
      console.log(`${idx + 1}. ID: ${e.id.substring(0, 8)}...`);
      console.log(`   상태: ${e.status}`);
      console.log(`   최초 평가자: ${e.initialEvaluatedBy}`);
      console.log(`   최종 평가자: ${e.evaluatedBy}`);
      console.log(`   제출일: ${e.submittedAt.toISOString().split('T')[0]}`);
      console.log('');
    });
    
    // 3. 모든 평가 데이터에서 '120751K'가 name으로 잘못 저장된 케이스 확인
    console.log('🔍 [전체 확인] 평가자 필드에 "120751K"가 있는 모든 평가:\n');
    
    const allWithEmployeeId = await prisma.evaluation.findMany({
      where: {
        OR: [
          { initialEvaluatedBy: '120751K' },
          { evaluatedBy: '120751K' },
        ],
      },
      select: {
        id: true,
        status: true,
        initialEvaluatedBy: true,
        evaluatedBy: true,
        submittedAt: true,
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });
    
    console.log(`📊 총 ${allWithEmployeeId.length}건 발견\n`);
    
    const asInitial = allWithEmployeeId.filter(e => e.initialEvaluatedBy === '120751K');
    const asFinal = allWithEmployeeId.filter(e => e.evaluatedBy === '120751K');
    
    console.log(`  - 최초 평가자로: ${asInitial.length}건`);
    console.log(`  - 최종 평가자로: ${asFinal.length}건`);
    console.log('');
    
    // 4. 교관 통계 API 쿼리 시뮬레이션 (11월)
    console.log('📊 [교관 통계] 11월 평가 집계 (API 쿼리 시뮬레이션)\n');
    
    const statsEvaluations = await prisma.evaluation.findMany({
      where: {
        OR: [
          {
            initialEvaluatedAt: {
              gte: new Date('2025-11-01'),
              lte: new Date('2025-11-30T23:59:59'),
            },
          },
          {
            initialEvaluatedAt: null,
            evaluatedAt: {
              gte: new Date('2025-11-01'),
              lte: new Date('2025-11-30T23:59:59'),
            },
          }
        ],
        status: {
          in: ["submitted", "completed", "approved"],
        },
        initialEvaluatedBy: {
          not: null,
        },
      },
      select: {
        initialEvaluatedBy: true,
        language: true,
      },
    });
    
    // 교관별 집계
    const instructorMap = new Map<string, number>();
    statsEvaluations.forEach(e => {
      const id = e.initialEvaluatedBy!;
      instructorMap.set(id, (instructorMap.get(id) || 0) + 1);
    });
    
    console.log('교관별 11월 평가 건수 (initialEvaluatedBy 기준):\n');
    Array.from(instructorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([id, count]) => {
        console.log(`  ${id}: ${count}건`);
      });
    
    console.log('');
    if (instructorMap.has('120751K')) {
      console.log(`✅ 120751K: ${instructorMap.get('120751K')}건이 교관 통계에 집계됨`);
    } else {
      console.log('❌ 120751K: 교관 통계에 집계되지 않음');
    }
    
  } catch (error) {
    console.error('❌ [오류]:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkUser120751K()
  .then(() => {
    console.log('\n🎉 확인 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 확인 실패:', error);
    process.exit(1);
  });

