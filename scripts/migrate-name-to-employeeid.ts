/**
 * evaluatedBy와 initialEvaluatedBy에 이름이 저장된 경우를 사번으로 변환하는 마이그레이션
 */

import { PrismaClient } from '../lib/generated/prisma';

const prisma = new PrismaClient();

// 이름 -> 사번 매핑 (실제 데이터 기반)
const NAME_TO_EMPLOYEE_ID: Record<string, string> = {
  '김다나': '172800K',
  '유대권': '172789K',
  '곽혜미': '120483K',
  '이은경': '151891K',
  '한은정': '120751K',
  '황승연': '162441K',
  '김보민': '120483K',
  '김아란': '', // 사번 확인 필요
};

async function migrateNameToEmployeeId() {
  try {
    console.log('🔄 [마이그레이션] 이름 → 사번 변환 시작...');
    
    // 1. 모든 평가 데이터 조회
    const evaluations = await prisma.evaluation.findMany({
      where: {
        OR: [
          { evaluatedBy: { not: null } },
          { initialEvaluatedBy: { not: null } }
        ]
      },
      select: {
        id: true,
        evaluatedBy: true,
        initialEvaluatedBy: true,
      },
    });

    console.log(`📊 [마이그레이션] 전체 평가 ${evaluations.length}건 조회됨`);

    let updatedCount = 0;
    let skippedCount = 0;
    const errors: any[] = [];

    // 2. 각 평가 확인 및 변환
    for (const evaluation of evaluations) {
      let needsUpdate = false;
      const updateData: any = {};

      // initialEvaluatedBy 확인
      if (evaluation.initialEvaluatedBy) {
        const initialId = evaluation.initialEvaluatedBy;
        // 사번 형식인지 확인 (숫자+K)
        if (!/^\d+K$/i.test(initialId)) {
          // 이름인 경우
          const employeeId = NAME_TO_EMPLOYEE_ID[initialId];
          if (employeeId) {
            updateData.initialEvaluatedBy = employeeId;
            needsUpdate = true;
            console.log(`  ✅ initialEvaluatedBy: ${initialId} → ${employeeId}`);
          } else {
            console.warn(`  ⚠️  이름 "${initialId}"에 대한 사번을 찾을 수 없습니다`);
            errors.push({ id: evaluation.id, field: 'initialEvaluatedBy', name: initialId });
          }
        }
      }

      // evaluatedBy 확인
      if (evaluation.evaluatedBy) {
        const finalId = evaluation.evaluatedBy;
        // 사번 형식인지 확인
        if (!/^\d+K$/i.test(finalId)) {
          // 이름인 경우
          const employeeId = NAME_TO_EMPLOYEE_ID[finalId];
          if (employeeId) {
            updateData.evaluatedBy = employeeId;
            needsUpdate = true;
            console.log(`  ✅ evaluatedBy: ${finalId} → ${employeeId}`);
          } else {
            console.warn(`  ⚠️  이름 "${finalId}"에 대한 사번을 찾을 수 없습니다`);
            errors.push({ id: evaluation.id, field: 'evaluatedBy', name: finalId });
          }
        }
      }

      // 업데이트 필요한 경우
      if (needsUpdate) {
        try {
          await prisma.evaluation.update({
            where: { id: evaluation.id },
            data: updateData,
          });
          updatedCount++;
          
          if (updatedCount % 10 === 0) {
            console.log(`📝 [마이그레이션] 진행 중: ${updatedCount}건 업데이트됨`);
          }
        } catch (error) {
          console.error(`  ❌ 업데이트 실패 (ID: ${evaluation.id}):`, error);
          errors.push({ id: evaluation.id, error });
        }
      } else {
        skippedCount++;
      }
    }

    console.log('\n✅ [마이그레이션] 완료!');
    console.log(`   - 업데이트: ${updatedCount}건`);
    console.log(`   - 건너뜀: ${skippedCount}건`);
    console.log(`   - 오류: ${errors.length}건`);

    if (errors.length > 0) {
      console.warn('\n⚠️  처리 실패 항목:');
      errors.forEach(err => {
        console.warn(`  - ID: ${err.id}, Field: ${err.field}, Name: ${err.name}`);
      });
    }

    // 3. 검증
    const remainingNames = await prisma.evaluation.count({
      where: {
        OR: [
          { evaluatedBy: { notIn: Object.values(NAME_TO_EMPLOYEE_ID).filter(Boolean) } },
          { initialEvaluatedBy: { notIn: Object.values(NAME_TO_EMPLOYEE_ID).filter(Boolean) } }
        ]
      }
    });

    console.log(`\n🔍 [검증] 이름 형식이 남아있을 가능성: ${remainingNames}건`);

  } catch (error) {
    console.error('❌ [마이그레이션] 치명적 오류:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
migrateNameToEmployeeId()
  .then(() => {
    console.log('\n🎉 마이그레이션 스크립트 실행 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 마이그레이션 스크립트 실행 실패:', error);
    process.exit(1);
  });




