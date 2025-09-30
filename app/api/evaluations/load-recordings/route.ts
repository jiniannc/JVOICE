import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '../../../../lib/generated/prisma';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const evaluationId = searchParams.get("evaluationId");

    if (!evaluationId) {
      return NextResponse.json(
        { success: false, error: "평가 ID가 필요합니다." },
        { status: 400 }
      );
    }

    console.log(`🎵 [API] 평가 녹음 데이터 로드 시작: ${evaluationId}`);

    // 특정 평가의 녹음 데이터만 조회
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: {
        recordings: true // 녹음 데이터만 포함
      }
    });

    if (!evaluation) {
      return NextResponse.json(
        { success: false, error: "평가 데이터를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 녹음 파일 정보 변환
    const recordings: { [key: string]: string } = {};
    const dropboxFiles = evaluation.recordings.map(recording => {
      // Base64 데이터를 recordings 객체에 추가 (기존 형식 호환)
      const key = `${recording.scriptNumber}-${recording.language}`;
      recordings[key] = recording.url || '';

      return {
        scriptKey: key,
        success: recording.success,
        fileId: recording.dropboxFileId || '',
        fileName: recording.fileName,
        url: recording.url,
        path: recording.filePath,
        originalFileName: recording.originalFileName,
        dropboxPath: recording.dropboxPath
      };
    });

    console.log(`✅ [API] 평가 녹음 데이터 로드 완료: ${evaluation.recordings.length}개 파일`);

    return NextResponse.json({
      success: true,
      recordings,
      dropboxFiles,
      message: `${evaluation.recordings.length}개의 녹음 파일을 로드했습니다.`
    });

  } catch (error: any) {
    console.error("❌ [API] 평가 녹음 데이터 로드 실패:", error);
    return NextResponse.json(
      { success: false, error: error.message || "알 수 없는 오류" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}





