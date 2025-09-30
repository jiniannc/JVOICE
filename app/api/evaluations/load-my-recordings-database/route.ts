import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '../../../../lib/generated/prisma';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const includeRecordings = searchParams.get("includeRecordings") === "true"; // 🔥 새로운 파라미터
    
    if (!employeeId) {
      return NextResponse.json({ error: "employeeId 쿼리 파라미터가 필요합니다." }, { status: 400 });
    }
    
    console.log(`📄 [load-my-recordings-database] 사용자 평가 결과 조회: ${employeeId} (includeRecordings: ${includeRecordings})`);

    // 먼저 해당 사용자의 모든 평가 상태를 확인
    const allEvaluations = await prisma.evaluation.findMany({
      where: {
        user: {
          employeeId: employeeId
        }
      },
      select: {
        id: true,
        status: true,
        approved: true,
        submittedAt: true,
        language: true,
        category: true
      }
    });
    
    console.log(`🔍 [load-my-recordings-database] 사용자의 전체 평가 내역 (${allEvaluations.length}개):`, 
      allEvaluations.map(e => ({ 
        id: e.id, 
        status: e.status, 
        approved: e.approved, 
        submittedAt: e.submittedAt?.toISOString().slice(0, 10),
        language: e.language,
        category: e.category
      })));
    
    // 상태별 개수 집계
    const statusCounts = allEvaluations.reduce((acc: any, e) => {
      acc[e.status] = (acc[e.status] || 0) + 1;
      return acc;
    }, {});
    console.log(`📊 [load-my-recordings-database] 상태별 개수:`, statusCounts);

    // 해당 사용자의 모든 제출된 평가 조회 (deleted 제외)
    const evaluations = await prisma.evaluation.findMany({
      where: {
        user: {
          employeeId: employeeId
        },
        NOT: {
          status: 'deleted'  // 삭제된 항목만 제외
        }
      },
      include: {
        user: true,
        scores: true,
        recordings: includeRecordings // 🔥 조건부 녹음 데이터 로딩
      },
      orderBy: {
        submittedAt: 'desc'
      }
    });

    console.log(`✅ [load-my-recordings-database] 조회 완료: ${evaluations.length}개`);

    // Dropbox 형식과 호환되는 형태로 변환
    const records = evaluations.map(evaluation => {
      // 점수를 기존 형식으로 변환
      const scores: Record<string, number> = {};
      const categoryScores: Record<string, number> = {};
      
      evaluation.scores.forEach(score => {
        scores[score.criteriaKey] = score.score;
      });

      // 한/영 평가인 경우 categoryScores 계산
      if (evaluation.language === 'korean-english') {
        // 소항목 점수 저장
        evaluation.scores.forEach(score => {
          categoryScores[score.criteriaKey] = score.score;
        });

        // 대분류 합계 계산
        const koreanCategories = ["발음", "억양", "전달력", "음성", "속도"];
        koreanCategories.forEach((cat) => {
          const sum = evaluation.scores.reduce((acc, s) => {
            return acc + (s.criteriaKey.startsWith(`korean-${cat}-`) ? s.score : 0);
          }, 0);
          categoryScores[`korean-${cat}`] = sum;
        });

        const englishCategories = ["발음_자음", "발음_모음", "억양", "강세", "전달력"];
        englishCategories.forEach((cat) => {
          const sum = evaluation.scores.reduce((acc, s) => {
            return acc + (s.criteriaKey.startsWith(`english-${cat}-`) ? s.score : 0);
          }, 0);
          categoryScores[`english-${cat}`] = sum;
        });

        // 언어별 총합
        const koreanTotal = koreanCategories.reduce((acc, cat) => acc + (categoryScores[`korean-${cat}`] || 0), 0);
        const englishTotal = englishCategories.reduce((acc, cat) => acc + (categoryScores[`english-${cat}`] || 0), 0);
        categoryScores['korean'] = koreanTotal;
        categoryScores['english'] = englishTotal;
      } else {
        // 일본어/중국어: 개별 카테고리별 점수
        evaluation.scores.forEach(score => {
          categoryScores[score.criteriaKey] = score.score;
        });
      }

      // 녹음 파일 정보 변환 (조건부)
      const recordings: Record<string, string> = {};
      if (includeRecordings && evaluation.recordings) {
        evaluation.recordings.forEach(recording => {
          const scriptKey = `${recording.scriptNumber}-${recording.language}`;
          if (recording.url) {
            recordings[scriptKey] = recording.url;
          }
        });
      }

      return {
        // 기본 정보
        id: evaluation.id,
        employeeId: evaluation.user.employeeId,
        name: evaluation.user.name,
        language: evaluation.language,
        category: evaluation.category,
        submittedAt: evaluation.submittedAt.toISOString(),
        recordingCount: includeRecordings && evaluation.recordings ? evaluation.recordings.length : evaluation.recordingCount || 0, // 🔥 조건부 녹음 파일 수
        scriptNumbers: evaluation.scriptNumbers,
        comment: evaluation.comment,
        duration: evaluation.duration,
        
        // 평가 결과
        status: evaluation.status,
        approved: evaluation.approved,
        totalScore: evaluation.totalScore,
        koreanTotalScore: evaluation.koreanTotalScore,
        englishTotalScore: evaluation.englishTotalScore,
        grade: evaluation.grade,
        scores,
        categoryScores,
        comments: evaluation.comments as Record<string, string>,
        evaluatedAt: evaluation.evaluatedAt?.toISOString(),
        evaluatedBy: evaluation.evaluatedBy,
        approvedAt: evaluation.approvedAt?.toISOString(),
        approvedBy: evaluation.approvedBy,
        
        // 호환성을 위한 필드
        dropboxPath: `/evaluations/completed/${evaluation.user.employeeId}_${evaluation.language}_${evaluation.submittedAt.toISOString().slice(0, 10)}.json`,
        recordings: recordings
      };
    });

    return NextResponse.json({ 
      success: true, 
      records: records,
      message: `${records.length}개의 승인된 평가 결과를 로드했습니다.`
    });

  } catch (error: any) {
    console.error("❌ [load-my-recordings-database] 오류:", error);
    return NextResponse.json(
      { error: error.message || "알 수 없는 오류" }, 
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
