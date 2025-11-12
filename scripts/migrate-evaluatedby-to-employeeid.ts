/**
 * 평가 데이터의 evaluatedBy 필드를 이름에서 사번으로 마이그레이션
 * 교관 통계에서 평가/교육 데이터를 올바르게 통합하기 위함
 */

import { PrismaClient } from '../lib/generated/prisma';

const prisma = new PrismaClient();

async function migrateEvaluatedBy() {
  console.log('🔄 [마이그레이션] evaluatedBy 필드 마이그레이션 시작...');
  
  try {
    // 1. 모든 교관 정보 조회 (이름 -> 사번 매핑)
    const instructors = await prisma.user.findMany({
      where: {
        isInstructor: true,
      },
      select: {
        name: true,
        employeeId: true,
      },
    });

    console.log(`👨‍🏫 [마이그레이션] 교관 ${instructors.length}명 조회됨`);

    const nameToEmployeeIdMap = new Map<string, string>();
    instructors.forEach(instructor => {
      nameToEmployeeIdMap.set(instructor.name, instructor.employeeId);
    });

    console.log('📋 [마이그레이션] 이름 -> 사번 매핑:', Array.from(nameToEmployeeIdMap.entries()));

    // 2. evaluatedBy가 null이 아닌 모든 평가 조회
    const evaluations = await prisma.evaluation.findMany({
      where: {
        evaluatedBy: {
          not: null,
        },
        status: {
          in: ['submitted', 'completed'],
        },
      },
      select: {
        id: true,
        evaluatedBy: true,
      },
    });

    console.log(`📊 [마이그레이션] 평가 ${evaluations.length}건 조회됨`);

    // 3. evaluatedBy가 이름인지 사번인지 확인하고 변환
    let updatedCount = 0;
    let skippedCount = 0;
    let notFoundCount = 0;

    for (const evaluation of evaluations) {
      const currentEvaluatedBy = evaluation.evaluatedBy!;
      
      // 이미 사번 형식인지 확인 (숫자로만 구성되어 있으면 사번으로 간주)
      const isAlreadyEmployeeId = /^\d+$/.test(currentEvaluatedBy);
      
      if (isAlreadyEmployeeId) {
        console.log(`⏭️  [마이그레이션] 이미 사번 형식: ${currentEvaluatedBy}`);
        skippedCount++;
        continue;
      }

      // 이름을 사번으로 변환
      const employeeId = nameToEmployeeIdMap.get(currentEvaluatedBy);
      
      if (employeeId) {
        console.log(`✏️  [마이그레이션] 변환: "${currentEvaluatedBy}" -> "${employeeId}"`);
        
        await prisma.evaluation.update({
          where: { id: evaluation.id },
          data: { evaluatedBy: employeeId },
        });
        
        updatedCount++;
      } else {
        console.warn(`⚠️  [마이그레이션] 교관을 찾을 수 없음: "${currentEvaluatedBy}"`);
        notFoundCount++;
      }
    }

    console.log('\n✅ [마이그레이션] 완료!');
    console.log(`   - 업데이트됨: ${updatedCount}건`);
    console.log(`   - 건너뜀 (이미 사번): ${skippedCount}건`);
    console.log(`   - 교관 미발견: ${notFoundCount}건`);

    if (notFoundCount > 0) {
      console.warn('\n⚠️  교관 정보를 찾을 수 없는 평가가 있습니다.');
      console.warn('   User 테이블에 해당 교관이 등록되어 있는지 확인하세요.');
    }

  } catch (error) {
    console.error('❌ [마이그레이션] 오류:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
migrateEvaluatedBy()
  .then(() => {
    console.log('\n🎉 마이그레이션 성공!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 마이그레이션 실패:', error);
    process.exit(1);
  });

