/**
 * 평가 데이터의 evaluatedBy 필드를 이름에서 사번으로 마이그레이션하는 관리자 API
 * 교관 통계에서 평가/교육 데이터를 올바르게 통합하기 위함
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from '../../../../lib/database';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 [마이그레이션] evaluatedBy 필드 마이그레이션 시작...');
    
    // 1. 교육 일지에서 교관 정보 조회 (이름 -> 사번 매핑)
    const educationJournals = await prisma.educationJournal.findMany({
      where: {
        instructorEmployeeId: {
          not: null,
        },
        instructorName: {
          not: null,
        },
      },
      select: {
        instructorEmployeeId: true,
        instructorName: true,
      },
      distinct: ['instructorEmployeeId'], // 중복 제거
    });

    console.log(`👨‍🏫 [마이그레이션] 교육 일지에서 교관 ${educationJournals.length}명 조회됨`);

    const nameToEmployeeIdMap = new Map<string, string>();
    educationJournals.forEach(journal => {
      if (journal.instructorEmployeeId && journal.instructorName) {
        nameToEmployeeIdMap.set(journal.instructorName, journal.instructorEmployeeId);
      }
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
    const notFoundNames: string[] = [];

    for (const evaluation of evaluations) {
      const currentEvaluatedBy = evaluation.evaluatedBy!;
      
      // 이미 사번 형식인지 확인 (숫자 + 선택적 알파벳으로 구성: 172639K, 120483K 등)
      const isAlreadyEmployeeId = /^\d+[A-Z]?$/i.test(currentEvaluatedBy);
      
      if (isAlreadyEmployeeId) {
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
        if (!notFoundNames.includes(currentEvaluatedBy)) {
          notFoundNames.push(currentEvaluatedBy);
        }
      }
    }

    const result = {
      success: true,
      message: '마이그레이션 완료',
      stats: {
        totalEvaluations: evaluations.length,
        updated: updatedCount,
        skipped: skippedCount,
        notFound: notFoundCount,
        notFoundNames: notFoundNames,
      },
    };

    console.log('\n✅ [마이그레이션] 완료!', result.stats);

    if (notFoundCount > 0) {
      console.warn('\n⚠️  교관 정보를 찾을 수 없는 평가가 있습니다:');
      console.warn(`   찾을 수 없는 이름들: ${notFoundNames.join(', ')}`);
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('❌ [마이그레이션] 오류:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: '마이그레이션 중 오류가 발생했습니다.',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
