import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "../../../../lib/generated/prisma";

const prisma = new PrismaClient();

interface RecordingFile {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  duration?: number;
  submittedAt: string;
  scriptNumber: number;
  language: string;
  userId: string;
  userName: string;
  employeeId: string;
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
          // fileData와 url은 대용량 데이터이므로 로드하지 않음 (메모리 이슈 방지)
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

    // 파일 크기 정보만 가져오기 (Base64 데이터는 로드하지 않고 길이만 계산)
    const recordingIds = recordings.map(r => r.id);
    const fileSizes = await prisma.$queryRaw<{ id: string; file_size: number }[]>`
      SELECT id, 
             COALESCE(
               LENGTH("fileData"),
               LENGTH("url"),
               0
             ) as file_size
      FROM recordings 
      WHERE id = ANY(${recordingIds}::text[])
    `;
    
    // id를 key로 하는 Map 생성
    const fileSizeMap = new Map(fileSizes.map(fs => [fs.id, Number(fs.file_size)]));
    
    console.log(`📊 [API] 파일 크기 정보 ${fileSizes.length}건 조회됨`);

    // 데이터 변환 (대용량 파일 처리를 위해 Base64 데이터 로드 없이 처리)
    const recordingFiles: RecordingFile[] = recordings.map((recording) => {
      const displayFileName = recording.fileName || `recording_${recording.id}.wav`;
      // 실제 파일 크기 사용 (Base64 길이)
      const base64Length = fileSizeMap.get(recording.id) || 0;
      // Base64는 원본의 약 1.33배이므로 원본 크기 추정
      const actualFileSize = base64Length > 0 ? Math.floor(base64Length * 0.75) : (recording.fileSize || 0);
      
      return {
        id: recording.id,
        fileName: displayFileName,
        filePath: recording.filePath || '',
        fileSize: actualFileSize,
        duration: recording.evaluation?.duration || 0,
        submittedAt: recording.evaluation?.submittedAt?.toISOString() || recording.createdAt.toISOString(),
        scriptNumber: recording.scriptNumber || 0,
        language: recording.language || 'korean',
        userId: recording.evaluation?.userId || '',
        userName: recording.evaluation?.user?.name || '알 수 없음',
        employeeId: recording.evaluation?.user?.employeeId || '',
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
