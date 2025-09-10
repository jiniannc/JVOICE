import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '../../../../lib/generated/prisma';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { evaluationId, approvedBy } = await request.json();
    
    console.log(`📝 [API] 승인: ${evaluationId}, 승인자: ${approvedBy}`);

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

    return NextResponse.json({
      success: true,
      message: "승인이 완료되었습니다.",
      evaluation: evaluation
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