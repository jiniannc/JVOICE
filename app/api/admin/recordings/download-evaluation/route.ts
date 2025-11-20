import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "../../../../../lib/generated/prisma";
import archiver from 'archiver';

// 파일 시그니처로 실제 파일 형식 감지
function detectFileType(buffer: Buffer): { mimeType: string; extension: string } {
  const signature = buffer.slice(0, 12);
  
  if (signature[0] === 0x1A && signature[1] === 0x45 && signature[2] === 0xDF && signature[3] === 0xA3) {
    return { mimeType: 'audio/webm', extension: '.webm' };
  }
  if ((signature[0] === 0x49 && signature[1] === 0x44 && signature[2] === 0x33) ||
      (signature[0] === 0xFF && (signature[1] === 0xFB || signature[1] === 0xFA))) {
    return { mimeType: 'audio/mpeg', extension: '.mp3' };
  }
  if (signature[4] === 0x66 && signature[5] === 0x74 && signature[6] === 0x79 && signature[7] === 0x70) {
    return { mimeType: 'audio/mp4', extension: '.m4a' };
  }
  if (signature[0] === 0x52 && signature[1] === 0x49 && signature[2] === 0x46 && signature[3] === 0x46) {
    return { mimeType: 'audio/wav', extension: '.wav' };
  }
  if (signature[0] === 0x4F && signature[1] === 0x67 && signature[2] === 0x67 && signature[3] === 0x53) {
    return { mimeType: 'audio/ogg', extension: '.ogg' };
  }
  
  return { mimeType: 'audio/webm', extension: '.webm' };
}

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const evaluationIds = searchParams.get("evaluationIds"); // 쉼표로 구분된 ID 목록

    if (!evaluationIds) {
      return NextResponse.json(
        { success: false, error: "evaluationIds 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    const idList = evaluationIds.split(',').filter(id => id.trim());
    console.log(`🔍 [API] 평가별 ZIP 다운로드 요청: ${idList.length}개 평가`);

    if (idList.length === 0) {
      return NextResponse.json(
        { success: false, error: "유효한 평가 ID가 없습니다." },
        { status: 400 }
      );
    }

    // 녹음 파일 데이터 조회
    const recordings = await prisma.recording.findMany({
      where: {
        evaluationId: {
          in: idList,
        },
      },
      select: {
        id: true,
        fileName: true,
        filePath: true,
        fileSize: true,
        fileData: true,
        url: true,
        evaluationId: true,
        scriptNumber: true,
        language: true,
        createdAt: true,
        evaluation: {
          select: {
            id: true,
            submittedAt: true,
            language: true,
            user: {
              select: {
                name: true,
                employeeId: true,
              },
            },
          },
        },
      },
      orderBy: [
        { evaluationId: 'asc' },
        { scriptNumber: 'asc' },
        { language: 'asc' },
      ],
    });

    console.log(`📊 [API] ZIP에 포함할 녹음 파일: ${recordings.length}건`);

    if (recordings.length === 0) {
      return NextResponse.json(
        { success: false, error: "해당 평가에 녹음 파일이 없습니다." },
        { status: 404 }
      );
    }

    // ZIP 파일 생성
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    const chunks: Buffer[] = [];
    
    archive.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    archive.on('error', (err: Error) => {
      console.error('❌ [API] Archive 에러:', err);
      throw err;
    });

    let addedFiles = 0;
    let skippedFiles = 0;

    // 평가별로 그룹화하여 폴더 구조 생성
    const evaluationGroups = new Map<string, typeof recordings>();
    recordings.forEach(recording => {
      if (!recording.evaluationId) return;
      if (!evaluationGroups.has(recording.evaluationId)) {
        evaluationGroups.set(recording.evaluationId, []);
      }
      evaluationGroups.get(recording.evaluationId)!.push(recording);
    });

    for (const [evaluationId, groupRecordings] of evaluationGroups.entries()) {
      const firstRecording = groupRecordings[0];
      const userName = firstRecording.evaluation?.user?.name || '알수없음';
      const employeeId = firstRecording.evaluation?.user?.employeeId || 'unknown';
      const evalLanguage = firstRecording.evaluation?.language || 'unknown';
      const submittedDate = firstRecording.evaluation?.submittedAt?.toISOString().split('T')[0] || firstRecording.createdAt.toISOString().split('T')[0];
      
      // 폴더명: 날짜_사번_이름_언어
      const folderName = `${submittedDate}_${employeeId}_${userName}_${evalLanguage}`;

      for (const recording of groupRecordings) {
        try {
          let fileBuffer: Buffer | null = null;
          
          // Base64 데이터 확인 및 변환
          if (recording.fileData && recording.fileData.length > 0) {
            let base64Data = recording.fileData;
            if (base64Data.startsWith('data:audio/')) {
              base64Data = base64Data.split(',')[1];
            }
            fileBuffer = Buffer.from(base64Data, 'base64');
          } else if (recording.url && recording.url.length > 0) {
            let base64Data = recording.url;
            if (base64Data.startsWith('data:audio/')) {
              base64Data = base64Data.split(',')[1];
            }
            fileBuffer = Buffer.from(base64Data, 'base64');
          }

          if (fileBuffer) {
            const detectedType = detectFileType(fileBuffer);
            const originalFileName = recording.fileName || `${recording.id}.wav`;
            const baseFileName = originalFileName.replace(/\.[^/.]+$/, "");
            const correctedFileName = baseFileName + detectedType.extension;
            
            // 파일명: 스크립트번호_언어_파일명
            const langDisplay = recording.language === 'korean' ? '한국어' : recording.language === 'english' ? '영어' : recording.language;
            const safeFileName = `${recording.scriptNumber}번_${langDisplay}_${correctedFileName}`;
            
            // 폴더/파일 구조로 추가
            archive.append(fileBuffer, { name: `${folderName}/${safeFileName}` });
            addedFiles++;
            
            console.log(`📁 [API] ZIP에 추가: ${folderName}/${safeFileName} (${fileBuffer.length} bytes)`);
          } else {
            console.warn(`⚠️ [API] 파일을 찾을 수 없음: ${recording.id}`);
            skippedFiles++;
          }
        } catch (error) {
          console.error(`❌ [API] 파일 처리 오류 (${recording.id}):`, error);
          skippedFiles++;
        }
      }
    }

    // ZIP 완료
    await new Promise<void>((resolve, reject) => {
      archive.on('end', () => {
        console.log(`📦 [API] Archive 완료됨`);
        resolve();
      });
      archive.on('error', reject);
      archive.finalize();
    });

    const zipBuffer = Buffer.concat(chunks);
    const fileName = idList.length === 1 
      ? `평가_${recordings[0]?.evaluation?.user?.employeeId || 'unknown'}.zip`
      : `평가_${idList.length}건.zip`;

    console.log(`✅ [API] ZIP 파일 생성 완료: ${fileName} (${addedFiles}개 파일, ${skippedFiles}개 건너뜀, ${zipBuffer.length} bytes)`);

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Content-Length': zipBuffer.length.toString(),
      },
    });

  } catch (error: any) {
    console.error("❌ [API] ZIP 다운로드 실패:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: "ZIP 파일 생성 중 오류가 발생했습니다.",
        details: error.message,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}


