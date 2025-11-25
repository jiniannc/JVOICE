import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '../../../../lib/generated/prisma';
import { updateCertificationFromEvaluation } from '../../../../lib/update-certification';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { evaluationId, approvedBy } = await request.json();
    
    console.log(`📝 [API] 승인: ${evaluationId}, 승인자: ${approvedBy}`);

    // 승인 전 평가 정보 확인
    const evaluationBefore = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: {
        user: {
          select: {
            name: true,
            employeeId: true,
            email: true
          }
        }
      }
    });

    if (!evaluationBefore) {
      return NextResponse.json(
        { success: false, error: "평가를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 평가 승인 처리
    const evaluation = await prisma.evaluation.update({
      where: { id: evaluationId },
      data: {
        status: 'approved',
        approved: true,
        approvedAt: new Date(),
        approvedBy: approvedBy
      }
    });

    console.log(`✅ [API] 승인 완료: ${evaluationId}`);

    // 🔥 자격증 자동 업데이트 로직 호출
    console.log(`🔄 [API] 승무원 자격 업데이트 시작...`);
    const certResult = await updateCertificationFromEvaluation(evaluationId);
    
    if (certResult.success) {
      console.log(`✅ [API] 승무원 자격 업데이트 완료:`, certResult.message);
    } else {
      console.log(`⚠️ [API] 승무원 자격 업데이트 실패 또는 스킵:`, certResult.message || certResult.error);
    }

    return NextResponse.json({
      success: true,
      message: "승인이 완료되었습니다.",
      evaluation: evaluation,
      certificationUpdate: certResult // 자격 업데이트 결과도 함께 반환
    });

  } catch (error: any) {
    console.error("❌ [API] 승인 실패:", error);
    return NextResponse.json(
      { success: false, error: error.message || "알 수 없는 오류" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 