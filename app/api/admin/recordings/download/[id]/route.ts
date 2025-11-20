import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "../../../../../../lib/generated/prisma";
import fs from 'fs';
import path from 'path';

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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const recordingId = params.id;

    console.log(`🔍 [API] 녹음 파일 다운로드 요청: ${recordingId}`);

    // 녹음 파일 정보 조회
    const recording = await prisma.recording.findUnique({
      where: {
        id: recordingId,
      },
        select: {
          id: true,
          fileName: true,
          filePath: true,
          fileSize: true,
          fileData: true, // 명시적으로 fileData 포함
          url: true, // Base64 데이터가 url 필드에 저장되어 있을 수 있음
          evaluationId: true,
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
    });

    if (!recording) {
      return NextResponse.json(
        { success: false, error: "녹음 파일을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    console.log(`📁 [API] 녹음 파일 정보:`, {
      id: recording.id,
      fileName: recording.fileName,
      filePath: recording.filePath,
      fileSize: recording.fileSize,
      hasFileData: !!recording.fileData,
      fileDataLength: recording.fileData?.length || 0,
      hasUrl: !!recording.url,
      urlLength: recording.url?.length || 0,
    });

    // 데이터베이스에서 직접 fileData 확인
    console.log(`🔍 [API] 데이터베이스에서 직접 fileData 확인...`);
    const rawRecording = await prisma.$queryRaw`
      SELECT id, "fileName", "fileData" IS NOT NULL as has_file_data, 
             LENGTH("fileData") as file_data_length,
             "url" IS NOT NULL as has_url,
             LENGTH("url") as url_length
      FROM recordings 
      WHERE id = ${recordingId}
    `;
    console.log(`📊 [API] Raw 데이터베이스 결과:`, rawRecording);

    // 최신 녹음 파일들도 확인 (fileData가 있는지)
    console.log(`🔍 [API] 최신 녹음 파일들의 fileData 상태 확인...`);
    const recentRecordings = await prisma.$queryRaw`
      SELECT id, "fileName", "fileData" IS NOT NULL as has_file_data, 
             LENGTH("fileData") as file_data_length, "createdAt",
             "url" IS NOT NULL as has_url,
             LENGTH("url") as url_length
      FROM recordings 
      ORDER BY "createdAt" DESC 
      LIMIT 5
    `;
    console.log(`📊 [API] 최신 5개 녹음 파일 fileData 상태:`, recentRecordings);

    // 파일 데이터 확인
    let fileBuffer: Buffer | null = null;
    
    console.log(`🔍 [API] 파일 데이터 검색 시작...`);
    
    // 1. Base64 데이터 확인 (fileData 우선, url 필드 백업)
    if (recording.fileData && recording.fileData.length > 0) {
      console.log(`📦 [API] fileData에서 Base64 데이터 발견: ${recording.fileData.length} 문자`);
      try {
        let base64Data = recording.fileData;
        
        // data:audio/webm;base64, 형식인지 확인하고 제거
        if (base64Data.startsWith('data:audio/')) {
          console.log(`🔄 [API] data URL 접두사 제거 중...`);
          base64Data = base64Data.split(',')[1];
          console.log(`✅ [API] data URL 접두사 제거 완료, 새 길이: ${base64Data.length}`);
        }
        
        fileBuffer = Buffer.from(base64Data, 'base64');
        console.log(`✅ [API] fileData Base64 변환 성공: ${fileBuffer.length} bytes`);
      } catch (error) {
        console.error(`❌ [API] fileData Base64 변환 실패:`, error);
      }
    } else if (recording.url && recording.url.length > 0) {
      console.log(`📦 [API] url 필드에서 Base64 데이터 발견: ${recording.url.length} 문자`);
      try {
        let base64Data = recording.url;
        
        // data:audio/webm;base64, 형식인지 확인하고 제거
        if (base64Data.startsWith('data:audio/')) {
          console.log(`🔄 [API] data URL 접두사 제거 중...`);
          base64Data = base64Data.split(',')[1];
          console.log(`✅ [API] data URL 접두사 제거 완료, 새 길이: ${base64Data.length}`);
        }
        
        fileBuffer = Buffer.from(base64Data, 'base64');
        console.log(`✅ [API] url Base64 변환 성공: ${fileBuffer.length} bytes`);
      } catch (error) {
        console.error(`❌ [API] url Base64 변환 실패:`, error);
      }
    } else {
      console.log(`⚠️ [API] Base64 데이터 없음 (fileData와 url 모두 없음)`);
    }
    
    // 2. 파일 시스템에서 찾기
    if (!fileBuffer) {
      console.log(`🔍 [API] 파일 시스템에서 검색...`);
      let filePath = recording.filePath;
      
      // filePath에서 database:// 제거
      if (filePath && filePath.startsWith('database://')) {
        filePath = filePath.replace('database://', '');
        console.log(`🔄 [API] database:// 제거: ${filePath}`);
      }
      
      const possiblePaths = [
        filePath,
        // 일반적인 업로드 경로들
        path.join(process.cwd(), 'uploads', 'recordings', `${recording.id}.wav`),
        path.join(process.cwd(), 'uploads', 'recordings', `${recording.id}.webm`),
        path.join(process.cwd(), 'uploads', 'recordings', recording.fileName || `${recording.id}.wav`),
        path.join('/tmp', 'recordings', `${recording.id}.wav`),
        path.join('/tmp', 'recordings', `${recording.id}.webm`),
        path.join('/tmp', 'recordings', recording.fileName || `${recording.id}.wav`),
        // 추가 가능한 경로들
        path.join(process.cwd(), 'public', 'recordings', `${recording.id}.wav`),
        path.join(process.cwd(), 'public', 'recordings', `${recording.id}.webm`),
        path.join(process.cwd(), 'storage', 'recordings', `${recording.id}.wav`),
        path.join(process.cwd(), 'storage', 'recordings', `${recording.id}.webm`),
        // evaluation ID 기반 경로
        path.join(process.cwd(), 'uploads', 'recordings', recording.evaluationId, `${recording.id}.wav`),
        path.join(process.cwd(), 'uploads', 'recordings', recording.evaluationId, `${recording.id}.webm`),
        path.join(process.cwd(), 'uploads', 'recordings', recording.evaluationId, recording.fileName || `${recording.id}.wav`),
      ].filter(Boolean);

      console.log(`🔍 [API] 검색할 경로들:`, possiblePaths);

      for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
          console.log(`✅ [API] 파일 발견: ${testPath}`);
          try {
            fileBuffer = fs.readFileSync(testPath);
            console.log(`✅ [API] 파일 읽기 성공: ${fileBuffer.length} bytes`);
            break;
          } catch (error) {
            console.error(`❌ [API] 파일 읽기 실패 (${testPath}):`, error);
          }
        } else {
          console.log(`❌ [API] 파일 없음: ${testPath}`);
        }
      }
    }
    
    // 파일을 찾지 못한 경우 404 반환 (더미 데이터 생성 안 함)
    if (!fileBuffer || fileBuffer.length === 0) {
      console.error(`❌ [API] 파일을 찾을 수 없음:`, {
        id: recording.id,
        fileName: recording.fileName,
        filePath: recording.filePath,
        hasFileData: !!recording.fileData,
        hasUrl: !!recording.url,
        evaluationId: recording.evaluationId,
      });
      return NextResponse.json(
        { 
          success: false, 
          error: "파일 데이터를 찾을 수 없습니다. 데이터베이스나 파일 시스템에 파일이 존재하지 않습니다.",
          recordingId: recording.id,
          fileName: recording.fileName,
        },
        { status: 404 }
      );
    }
    const fileName = recording.fileName || `recording_${recording.id}.wav`;

    console.log(`✅ [API] 파일 다운로드 준비 완료: ${fileName} (${fileBuffer.length} bytes)`);

    // 파일의 실제 형식 감지
    const detectedType = detectFileType(fileBuffer);
    console.log(`🔍 [API] 감지된 파일 형식: ${detectedType.mimeType} (${detectedType.extension})`);
    
    // 파일명에서 확장자 제거하고 감지된 확장자로 교체
    const baseFileName = fileName.replace(/\.[^/.]+$/, ""); // 기존 확장자 제거
    const correctedFileName = baseFileName + detectedType.extension;
    
    // 파일명을 안전하게 인코딩 (한글 문제 해결)
    const safeFileName = encodeURIComponent(correctedFileName);

    console.log(`📁 [API] 최종 파일명: ${correctedFileName} (MIME: ${detectedType.mimeType})`);

    // 쿼리 파라미터로 다운로드 모드 확인
    const download = new URL(request.url).searchParams.get('download') === 'true';
    
    // 파일 응답 (다운로드 모드일 때만 attachment, 기본은 inline으로 재생 가능하게)
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': detectedType.mimeType,
        'Content-Disposition': download 
          ? `attachment; filename*=UTF-8''${safeFileName}`
          : `inline; filename*=UTF-8''${safeFileName}`,
        'Content-Length': fileBuffer.length.toString(),
        'Accept-Ranges': 'bytes', // 스트리밍 지원
        'Cache-Control': 'public, max-age=3600', // 1시간 캐싱
      },
    });

  } catch (error: any) {
    console.error("❌ [API] 녹음 파일 다운로드 실패:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: "파일 다운로드 중 오류가 발생했습니다.",
        details: error.message,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
