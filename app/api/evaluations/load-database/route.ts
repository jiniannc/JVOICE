import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '../../../../lib/generated/prisma';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const page = parseInt(searchParams.get("page") || "1");
    const month = searchParams.get("month"); // 'YYYY-MM'
    const status = searchParams.get("status") || "pending"; // pending, completed, all
    const offset = (page - 1) * limit;

    console.log(`📊 [API] Database 평가 결과 로드 시작 (Page: ${page}, Limit: ${limit}, Status: ${status})`);

    // 1. 기본 쿼리 구성
    let whereClause: any = {};
    
    // status 필터링
    if (status !== "all") {
      whereClause.status = status;
    }
    
    // month 필터링
    if (month) {
      const startDate = new Date(`${month}-01T00:00:00.000Z`);
      const endDate = new Date(`${month}-31T23:59:59.999Z`);
      whereClause.submittedAt = {
        gte: startDate,
        lte: endDate
      };
    }

    // 2. 평가 데이터 조회 (사용자 정보 포함)
    const evaluations = await prisma.evaluation.findMany({
      where: whereClause,
      include: {
        user: true,
        scores: true,
        recordings: true
      },
      orderBy: [
        { status: 'asc' }, // pending이 먼저
        { submittedAt: 'desc' }
      ],
      skip: offset,
      take: limit
    });

    // 3. 전체 개수 조회
    const totalCount = await prisma.evaluation.count({
      where: whereClause
    });

    // 4. 기존 Dropbox 형식과 호환되는 형태로 변환
    const formattedEvaluations = evaluations.map(evaluation => {
      // 점수를 기존 형식으로 변환
      const scores: Record<string, number> = {};
      const categoryScores: Record<string, number> = {};
      
      evaluation.scores.forEach(score => {
        scores[score.criteriaKey] = score.score;
        
        // 카테고리별 점수 계산
        const category = score.criteriaKey.split('-')[0];
        if (!categoryScores[category]) {
          categoryScores[category] = 0;
        }
        categoryScores[category] += score.score;
      });

      // 녹음 파일 정보 변환
      const dropboxFiles = evaluation.recordings.map(recording => ({
        scriptKey: `${recording.scriptNumber}-${recording.language}`,
        success: recording.success,
        fileId: recording.dropboxFileId || '',
        fileName: recording.fileName,
        url: recording.url,
        path: recording.filePath,
        originalFileName: recording.originalFileName,
        dropboxPath: recording.dropboxPath
      }));

      return {
        id: evaluation.id,
        candidateInfo: {
          name: evaluation.user.name,
          employeeId: evaluation.user.employeeId,
          language: evaluation.language,
          category: evaluation.category,
          submittedAt: evaluation.submittedAt.toISOString(),
          recordingCount: evaluation.recordingCount,
          scriptNumbers: evaluation.scriptNumbers,
          comment: evaluation.comment,
          duration: evaluation.duration
        },
        scores,
        categoryScores,
        totalScore: evaluation.totalScore,
        koreanTotalScore: evaluation.koreanTotalScore,
        englishTotalScore: evaluation.englishTotalScore,
        grade: evaluation.grade,
        comments: evaluation.comments as Record<string, string>,
        evaluatedAt: evaluation.evaluatedAt?.toISOString(),
        evaluatedBy: evaluation.evaluatedBy,
        status: evaluation.status,
        recordings: {}, // 기존 형식 호환을 위해 빈 객체
        dropboxFiles,
        approved: evaluation.approved,
        isFileUpload: evaluation.isFileUpload
      };
    });

    const hasNextPage = offset + limit < totalCount;

    const result = {
      success: true,
      evaluations: formattedEvaluations,
      totalCount,
      hasNextPage,
      message: `${formattedEvaluations.length}개의 평가 결과를 데이터베이스에서 로드했습니다.`,
    };

    console.log(`✅ [API] Database 평가 결과 로드 완료: ${formattedEvaluations.length}개`);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("❌ [API] Database 평가 결과 로드 실패:", error);
    return NextResponse.json(
      { success: false, error: error.message || "알 수 없는 오류" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

