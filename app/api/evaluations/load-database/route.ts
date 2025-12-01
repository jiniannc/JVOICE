import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '../../../../lib/generated/prisma';
import { evaluationCriteria } from '../../../../lib/evaluation-criteria';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "1000");
    const page = parseInt(searchParams.get("page") || "1");
    const month = searchParams.get("month"); // 'YYYY-MM'
    const status = searchParams.get("status") || "all"; // pending, review_requested, completed, approved, all
    const includeRecordings = searchParams.get("includeRecordings") === "true"; // 🔥 새로운 파라미터
    const offset = (page - 1) * limit;

    console.log(`📊 [API] Database 평가 결과 로드 시작 (Page: ${page}, Limit: ${limit}, Status: ${status}, IncludeRecordings: ${includeRecordings})`);

    // 1. 기본 쿼리 구성
    let whereClause: any = {};
    
    // status 필터링
    if (status !== "all") {
      whereClause.status = status;
    }
    
    // month 필터링
    if (month) {
      const [year, monthNum] = month.split('-').map(Number);
      const startDate = new Date(year, monthNum - 1, 1, 0, 0, 0, 0); // 해당 월 1일
      const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999); // 해당 월 마지막 날 (다음 달 0일 = 이번 달 마지막 날)
      whereClause.submittedAt = {
        gte: startDate,
        lte: endDate
      };
    }

    // 2. 평가 데이터 조회 (사용자 정보 포함, 삭제된 항목 제외)
    const evaluations = await prisma.evaluation.findMany({
      where: {
        ...whereClause,
        status: {
          not: 'deleted' // 🔥 삭제된 항목 제외
        }
      },
      include: {
        user: true,
        scores: true,
        recordings: includeRecordings // 🔥 조건부 녹음 데이터 로딩
      },
      orderBy: [
        { status: 'asc' }, // pending -> review_requested -> completed -> approved 순
        { submittedAt: 'desc' }
      ],
      skip: offset,
      take: limit
    });

    // 3. 전체 개수 조회 (삭제된 항목 제외)
    const totalCount = await prisma.evaluation.count({
      where: {
        ...whereClause,
        status: {
          not: 'deleted' // 🔥 삭제된 항목 제외
        }
      }
    });

    // 4. 기존 Dropbox 형식과 호환되는 형태로 변환
    const formattedEvaluations = await Promise.all(evaluations.map(async evaluation => {
      // 점수를 기존 형식으로 변환
      const scores: Record<string, number> = {};
      const categoryScores: Record<string, number> = {};
      

      
      evaluation.scores.forEach(score => {
        scores[score.criteriaKey] = score.score;
      });

      // 🔥 categoryScores는 개별 소항목 점수 + 대분류 합계를 함께 제공 (상세/관리 화면 공통)
      console.log("🔍 [API DEBUG] 평가 데이터:", {
        id: evaluation.id,
        language: evaluation.language,
        scoresCount: evaluation.scores?.length || 0,
        scoresExists: !!evaluation.scores,
        firstScore: evaluation.scores?.[0]
      });
      
      if (evaluation.language === 'korean-english') {
        // 1) 소항목 점수 유지
        evaluation.scores.forEach(score => {
          categoryScores[score.criteriaKey] = score.score;
        });
        
        // 🔥 강여울 승무원 디버깅
        if (evaluation.id === 'cmhstiybx005zpc015r07116f') {
          console.log(`🚨🚨🚨 [강여울] 평가 상태: ${evaluation.status}, 소항목 개수: ${evaluation.scores.length}`);
          console.log(`🚨🚨🚨 [강여울] 첫 5개 점수:`, evaluation.scores.slice(0, 5).map(s => `${s.criteriaKey}=${s.score}`));
        }

        // 🔥 중요: 평가가 완료되지 않은 경우(pending)에만 80% 기본값 추가
        // completed나 approved 상태에서는 실제 점수만 사용
        if (evaluation.status === 'pending') {
          const addMissingSubItems = (langPrefix: string, langCriteria: any) => {
            Object.entries(langCriteria).forEach(([category, subCriteria]) => {
              if (typeof subCriteria === 'object') {
                // 소항목이 있는 경우
                Object.entries(subCriteria).forEach(([subKey, maxScore]) => {
                  const scoreKey = `${langPrefix}-${category}-${subKey}`;
                  // ✅ undefined일 때만 기본값 설정 (0점은 유지)
                  if (categoryScores[scoreKey] === undefined) {
                    categoryScores[scoreKey] = Math.round((Number(maxScore) * 0.8) * 2) / 2;
                    console.log(`🔥 [API] 한/영 ${scoreKey} 기본값 설정: ${categoryScores[scoreKey]} (80% of ${maxScore})`);
                  }
                });
              } else {
                // 직접 점수인 경우
                const scoreKey = `${langPrefix}-${category}`;
                // ✅ undefined일 때만 기본값 설정 (0점은 유지)
                if (categoryScores[scoreKey] === undefined) {
                  categoryScores[scoreKey] = Math.round((Number(subCriteria) * 0.8) * 2) / 2;
                  console.log(`🔥 [API] 한/영 ${scoreKey} 기본값 설정: ${categoryScores[scoreKey]} (80% of ${subCriteria})`);
                }
              }
            });
          };

          // 한국어 및 영어 누락 소항목 보정
          addMissingSubItems('korean', evaluationCriteria.korean);
          addMissingSubItems('english', evaluationCriteria.english);
        }

        // 2) 대분류 합계 생성: korean-발음, korean-억양, ..., english-전달력
        const koreanCategories = Object.keys(evaluationCriteria.korean);
        koreanCategories.forEach((cat) => {
          const sum = Object.entries(categoryScores)
            .filter(([key]) => key.startsWith(`korean-${cat}-`))
            .reduce((acc, [, score]) => acc + (score || 0), 0);
          categoryScores[`korean-${cat}`] = sum;
          console.log(`🔍 [API] korean-${cat} 합계: ${sum}`);
        });

        const englishCategories = Object.keys(evaluationCriteria.english);
        englishCategories.forEach((cat) => {
          const sum = Object.entries(categoryScores)
            .filter(([key]) => key.startsWith(`english-${cat}-`))
            .reduce((acc, [, score]) => acc + (score || 0), 0);
          categoryScores[`english-${cat}`] = sum;
          console.log(`🔍 [API] english-${cat} 합계: ${sum}`);
        });

        // 3) 언어별 총합 (100+100)
        const koreanTotal = koreanCategories.reduce((acc, cat) => acc + (categoryScores[`korean-${cat}`] || 0), 0);
        const englishTotal = englishCategories.reduce((acc, cat) => acc + (categoryScores[`english-${cat}`] || 0), 0);
        categoryScores['korean'] = koreanTotal;
        categoryScores['english'] = englishTotal;
        
        // 🔥 강여울 승무원 디버깅
        if (evaluation.id === 'cmhstiybx005zpc015r07116f') {
          console.log(`🚨🚨🚨 [강여울] 최종 총점: 한국어=${koreanTotal}, 영어=${englishTotal}`);
        } else {
          console.log(`🔥 [API] 한/영 최종 총점: 한국어=${koreanTotal}, 영어=${englishTotal}, 상태=${evaluation.status}, 소항목수=${evaluation.scores.length}`);
        }
      } else {
        // 일본어/중국어: 개별 카테고리별 점수를 저장 + 누락된 카테고리 기본값 보정
        evaluation.scores.forEach(score => {
          categoryScores[score.criteriaKey] = score.score;
        });
        
        // 🔥 중요: 평가가 완료되지 않은 경우(pending)에만 80% 기본값 추가
        if (evaluation.status === 'pending') {
          const languageCriteria = evaluationCriteria[evaluation.language as keyof typeof evaluationCriteria];
          if (languageCriteria) {
            Object.entries(languageCriteria).forEach(([category, maxScore]) => {
              // ✅ undefined일 때만 기본값 설정 (0점은 유지)
              if (categoryScores[category] === undefined) {
                // 누락된 카테고리는 80% 기본값으로 설정
                categoryScores[category] = Math.round((Number(maxScore) * 0.8) * 2) / 2;
                console.log(`🔥 [API] ${evaluation.language} ${category} 기본값 설정: ${categoryScores[category]} (80% of ${maxScore})`);
              }
            });
          }
        }
        
        console.log("🔍 [API DEBUG] 일본어/중국어 categoryScores (기본값 포함):", {
          language: evaluation.language,
          scoresCount: evaluation.scores.length,
          categoryScoresKeys: Object.keys(categoryScores),
          categoryScoresValues: categoryScores
        });
      }
      
      console.log("🔍 [API DEBUG] 최종 categoryScores:", {
        id: evaluation.id,
        language: evaluation.language,
        categoryScoresKeys: Object.keys(categoryScores),
        categoryScoresCount: Object.keys(categoryScores).length
      });

      // 녹음 파일 정보 변환 (조건부)
      const dropboxFiles = includeRecordings && evaluation.recordings 
        ? evaluation.recordings.map(recording => ({
            scriptKey: `${recording.scriptNumber}-${recording.language}`,
            success: recording.success,
            fileId: recording.dropboxFileId || '',
            fileName: recording.fileName,
            url: recording.url,
            path: recording.filePath,
            originalFileName: recording.originalFileName,
            dropboxPath: recording.dropboxPath
          }))
        : []; // 🔥 녹음 데이터 미포함 시 빈 배열

      // 평가자 정보 조회 (최초 평가자, 최종 평가자)
      let initialEvaluatorName = null;
      let finalEvaluatorName = null;

      console.log(`🔍 [평가자 조회] 평가 ID: ${evaluation.id}`);
      console.log(`🔍 [평가자 조회] initialEvaluatedBy: ${evaluation.initialEvaluatedBy}`);
      console.log(`🔍 [평가자 조회] evaluatedBy: ${evaluation.evaluatedBy}`);

      if (evaluation.initialEvaluatedBy) {
        const initialEvaluator = await prisma.user.findUnique({
          where: { employeeId: evaluation.initialEvaluatedBy },
          select: { name: true, employeeId: true }
        });
        initialEvaluatorName = initialEvaluator?.name || null;
        console.log(`✅ [평가자 조회] 최초 평가자 조회: ${evaluation.initialEvaluatedBy} -> ${initialEvaluatorName}`);
      }

      if (evaluation.evaluatedBy) {
        const finalEvaluator = await prisma.user.findUnique({
          where: { employeeId: evaluation.evaluatedBy },
          select: { name: true, employeeId: true }
        });
        finalEvaluatorName = finalEvaluator?.name || null;
        console.log(`✅ [평가자 조회] 최종 평가자 조회: ${evaluation.evaluatedBy} -> ${finalEvaluatorName}`);
      }

      console.log(`📊 [평가자 결과] initialEvaluatedBy: ${evaluation.initialEvaluatedBy}, Name: ${initialEvaluatorName}`);
      console.log(`📊 [평가자 결과] evaluatedBy: ${evaluation.evaluatedBy}, Name: ${finalEvaluatorName}`);

      return {
        id: evaluation.id,
        candidateInfo: {
          id: evaluation.user.id, // 사용자 ID 추가
          name: evaluation.user.name,
          employeeId: evaluation.user.employeeId,
          language: evaluation.language,
          category: evaluation.category,
          submittedAt: evaluation.submittedAt.toISOString(),
          recordingCount: includeRecordings && evaluation.recordings ? evaluation.recordings.length : evaluation.recordingCount || 0, // 🔥 조건부 녹음 파일 수
          scriptNumbers: evaluation.scriptNumbers,
          comment: evaluation.comment,
          duration: evaluation.duration,
          // 자격 정보 추가
          koreanEnglishGrade: evaluation.user.koreanEnglishGrade,
          koreanEnglishExpiry: evaluation.user.koreanEnglishExpiry,
          japaneseGrade: evaluation.user.japaneseGrade,
          chineseGrade: evaluation.user.chineseGrade
        },
        scores,
        categoryScores,
        totalScore: evaluation.totalScore,
        koreanTotalScore: evaluation.koreanTotalScore,
        englishTotalScore: evaluation.englishTotalScore,
        grade: evaluation.grade,
        comments: evaluation.comments as Record<string, string>,
        evaluatedAt: evaluation.evaluatedAt?.toISOString(),
        evaluatedBy: evaluation.evaluatedBy, // 최종 평가자 (사번)
        evaluatedByName: finalEvaluatorName, // 최종 평가자 (이름)
        initialEvaluatedBy: evaluation.initialEvaluatedBy, // 최초 평가자 (사번)
        initialEvaluatedByName: initialEvaluatorName, // 최초 평가자 (이름)
        initialEvaluatedAt: evaluation.initialEvaluatedAt?.toISOString(), // 최초 평가 시간 추가
        status: evaluation.status === 'completed' ? 'submitted' : evaluation.status, // completed만 submitted로 매핑, review_requested는 그대로 유지
        reviewRequestedBy: evaluation.reviewRequestedBy,
        reviewRequestedAt: evaluation.reviewRequestedAt?.toISOString(),
        recordings: {}, // 기존 형식 호환을 위해 빈 객체
        dropboxFiles,
        approved: evaluation.approved,
        isFileUpload: evaluation.isFileUpload
      };
    }));

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

