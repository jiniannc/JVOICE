/**
 * 기존 평가 데이터의 evaluatedBy를 initialEvaluatedBy로 복사하는 관리자 API
 * 목적: 기존 평가 데이터도 교관 통계에 집계되도록 함
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from '../../../../lib/database';

export async function POST(request: NextRequest) {
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
      return NextResponse.json({
        success: true,
        message: '마이그레이션이 필요한 데이터가 없습니다.',
        migrated: 0,
        total: 0,
      });
    }

    // 2. 각 평가의 evaluatedBy를 initialEvaluatedBy로 복사
    let successCount = 0;
    let errorCount = 0;
    const errors: any[] = [];

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
      } catch (error: any) {
        console.error(`❌ [마이그레이션] 실패 - ID: ${evaluation.id}`, error);
        errorCount++;
        errors.push({
          evaluationId: evaluation.id,
          error: error.message,
        });
      }
    }

    console.log('✅ [마이그레이션] 완료!');
    console.log(`   - 성공: ${successCount}건`);
    console.log(`   - 실패: ${errorCount}건`);

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

    const remainingCount = await prisma.evaluation.count({
      where: {
        evaluatedBy: {
          not: null,
        },
        initialEvaluatedBy: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: '마이그레이션이 완료되었습니다.',
      migrated: successCount,
      failed: errorCount,
      total: evaluationsToMigrate.length,
      verified: verifyCount,
      remaining: remainingCount,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error: any) {
    console.error('❌ [마이그레이션] 치명적 오류:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || '마이그레이션 중 알 수 없는 오류가 발생했습니다.' 
      },
      { status: 500 }
    );
  }
}

// GET 요청: 마이그레이션 대상 개수 확인
export async function GET(request: NextRequest) {
  try {
    const needsMigration = await prisma.evaluation.count({
      where: {
        evaluatedBy: {
          not: null,
        },
        initialEvaluatedBy: null,
      },
    });

    const alreadyMigrated = await prisma.evaluation.count({
      where: {
        evaluatedBy: {
          not: null,
        },
        initialEvaluatedBy: {
          not: null,
        },
      },
    });

    return NextResponse.json({
      success: true,
      needsMigration,
      alreadyMigrated,
      total: needsMigration + alreadyMigrated,
    });

  } catch (error: any) {
    console.error('❌ [마이그레이션 확인] 오류:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || '확인 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    );
  }
}

