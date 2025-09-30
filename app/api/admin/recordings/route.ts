import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "../../../../lib/generated/prisma";

// 파일 시그니처로 실제 파일 형식 감지
function detectFileType(buffer: Buffer): { mimeType: string; extension: string } {
  const signature = buffer.slice(0, 12);
  
  // WebM 파일 (1A 45 DF A3)
  if (signature[0] === 0x1A && signature[1] === 0x45 && signature[2] === 0xDF && signature[3] === 0xA3) {
    return { mimeType: 'audio/webm', extension: '.webm' };
  }
  
  // MP3 파일 (ID3 태그: 49 44 33 또는 MPEG 헤더: FF FB/FF FA)
  if ((signature[0] === 0x49 && signature[1] === 0x44 && signature[2] === 0x33) ||
      (signature[0] === 0xFF && (signature[1] === 0xFB || signature[1] === 0xFA))) {
    return { mimeType: 'audio/mpeg', extension: '.mp3' };
  }
  
  // M4A 파일 (ftyp 박스: 00 00 00 XX 66 74 79 70)
  if (signature[4] === 0x66 && signature[5] === 0x74 && signature[6] === 0x79 && signature[7] === 0x70) {
    return { mimeType: 'audio/mp4', extension: '.m4a' };
  }
  
  // WAV 파일 (RIFF 헤더: 52 49 46 46)
  if (signature[0] === 0x52 && signature[1] === 0x49 && signature[2] === 0x46 && signature[3] === 0x46) {
    return { mimeType: 'audio/wav', extension: '.wav' };
  }
  
  // OGG 파일 (4F 67 67 53)
  if (signature[0] === 0x4F && signature[1] === 0x67 && signature[2] === 0x67 && signature[3] === 0x53) {
    return { mimeType: 'audio/ogg', extension: '.ogg' };
  }
  
  // 기본값 (감지 실패시)
  return { mimeType: 'audio/webm', extension: '.webm' };
}

const prisma = new PrismaClient();

interface RecordingFile {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  duration?: number;
  submittedAt: string;
  userId: string;
  userName: string;
  employeeId: string;
  language: string;
  category: string;
  status: string;
  evaluationId?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month"); // YYYY-MM 형식

    if (!month) {
      return NextResponse.json(
        { success: false, error: "월 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    console.log(`🔍 [API] 녹음 파일 조회: ${month}`);

    // 월 범위 설정
    const startDate = new Date(`${month}-01T00:00:00Z`);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59, 999);

    console.log(`📅 [API] 조회 범위: ${startDate.toISOString()} ~ ${endDate.toISOString()}`);

    // 먼저 전체 녹음 파일 수 확인
    const totalRecordings = await prisma.recording.count();
    console.log(`📊 [API] 전체 녹음 파일 수: ${totalRecordings}건`);

    // 최근 녹음 파일 몇 개 확인
    const recentRecordings = await prisma.recording.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        createdAt: true,
        fileName: true,
        evaluationId: true,
      },
    });
    console.log(`📋 [API] 최근 녹음 파일 샘플:`, recentRecordings.map(r => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      fileName: r.fileName,
      evaluationId: r.evaluationId,
    })));

    // 최근 evaluation의 submittedAt도 확인
    const recentEvaluations = await prisma.evaluation.findMany({
      take: 5,
      orderBy: {
        submittedAt: 'desc',
      },
      select: {
        id: true,
        submittedAt: true,
        userId: true,
        language: true,
        status: true,
      },
    });
    console.log(`📋 [API] 최근 평가 제출일 샘플:`, recentEvaluations.map(e => ({
      id: e.id,
      submittedAt: e.submittedAt.toISOString(),
      userId: e.userId,
      language: e.language,
      status: e.status,
    })));

    // 녹음 파일 데이터 조회 (evaluation의 submittedAt 기준으로 변경)
    const recordings = await prisma.recording.findMany({
      where: {
        evaluation: {
          submittedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
        select: {
          id: true,
          fileName: true,
          filePath: true,
          fileSize: true,
          fileData: true, // 명시적으로 fileData 포함 (크기 확인용)
          url: true, // Base64 데이터가 url 필드에 저장되어 있을 수 있음
          evaluationId: true,
          scriptNumber: true,
          language: true,
          createdAt: true,
          evaluation: {
            select: {
              id: true,
              submittedAt: true,
              language: true,
              duration: true,
              status: true,        // 상태 필드 추가
              category: true,      // 카테고리 필드 추가
              userId: true,        // 사용자 ID 필드 추가
              user: {
                select: {
                  name: true,
                  employeeId: true,
                },
              },
            },
          },
        },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`📊 [API] 녹음 파일 ${recordings.length}건 조회됨`);

    // 데이터 변환 (파일 형식 감지하여 올바른 확장자로 표시)
    const recordingFiles: RecordingFile[] = recordings.map((recording) => {
      let displayFileName = recording.fileName || `recording_${recording.id}.wav`;
      let fileSize = recording.fileSize || 0;
      
      // Base64 데이터가 있으면 파일 형식 감지하여 올바른 확장자로 표시
      if (recording.fileData || recording.url) {
        try {
          const base64Data = recording.fileData || recording.url;
          if (base64Data) {
            const fileBuffer = Buffer.from(base64Data, 'base64');
            fileSize = fileBuffer.length;
            
            // 파일 형식 감지
            const detectedType = detectFileType(fileBuffer);
            
            // 파일명에서 확장자 제거하고 감지된 확장자로 교체
            const baseFileName = displayFileName.replace(/\.[^/.]+$/, "");
            displayFileName = baseFileName + detectedType.extension;
            
            console.log(`🔍 [API] ${recording.id}: ${detectedType.extension} 감지 → ${displayFileName}`);
          }
        } catch (error) {
          console.warn(`⚠️ [API] 파일 형식 감지 실패 (${recording.id}):`, error);
        }
      }
      
      return {
        id: recording.id,
        fileName: displayFileName, // 올바른 확장자로 표시
        filePath: recording.filePath || '',
        fileSize: fileSize,
        duration: recording.evaluation?.duration || 0,
        submittedAt: recording.evaluation?.submittedAt?.toISOString() || recording.createdAt.toISOString(),
        userId: recording.evaluation?.userId || '',
        userName: recording.evaluation?.user?.name || '알 수 없음',
        employeeId: recording.evaluation?.user?.employeeId || '',
        language: recording.evaluation?.language || '',
        category: recording.evaluation?.category || '',
        status: recording.evaluation?.status || 'pending',
        evaluationId: recording.evaluationId,
      };
    });

    console.log(`✅ [API] 녹음 파일 조회 완료: ${recordingFiles.length}건`);

    return NextResponse.json({
      success: true,
      recordings: recordingFiles,
      summary: {
        totalCount: recordingFiles.length,
        totalSize: recordingFiles.reduce((sum, r) => sum + r.fileSize, 0),
        month: month,
      },
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
