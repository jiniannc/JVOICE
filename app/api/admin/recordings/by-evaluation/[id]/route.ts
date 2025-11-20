import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/lib/generated/prisma";

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const evaluationId = params.id;

    console.log(`🔍 [API] 평가 ID로 녹음 파일 조회: ${evaluationId}`);

    // 해당 평가의 녹음 파일들 조회
    const recordings = await prisma.recording.findMany({
      where: {
        evaluationId: evaluationId,
      },
      select: {
        id: true,
        scriptNumber: true,
        language: true,
        fileName: true,
        filePath: true,
        createdAt: true,
      },
      orderBy: [
        { scriptNumber: 'asc' },
        { language: 'asc' },
      ],
    });

    console.log(`✅ [API] 녹음 파일 ${recordings.length}건 조회됨`);

    return NextResponse.json({
      success: true,
      recordings: recordings,
    });

  } catch (error: any) {
    console.error("❌ [API] 녹음 파일 조회 실패:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: "녹음 파일 조회 중 오류가 발생했습니다.",
        details: error.message,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}




