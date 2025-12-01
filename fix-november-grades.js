const { PrismaClient } = require('./lib/generated/prisma');
const { getGradeInfo, evaluationCriteria } = require('./lib/evaluation-criteria');

const prisma = new PrismaClient();

async function fixNovemberGrades() {
  try {
    console.log('🔄 11월 승인 평가의 grade 재계산 시작...\n');

    // 11월 승인된 평가들 조회
    const approvedEvaluations = await prisma.evaluation.findMany({
      where: {
        status: 'approved',
        approvedAt: {
          gte: new Date('2025-11-01'),
          lt: new Date('2025-12-01')
        }
      },
      include: {
        scores: true,
        user: {
          select: { name: true, employeeId: true }
        }
      },
      orderBy: { approvedAt: 'desc' }
    });

    console.log(`📊 대상 평가: ${approvedEvaluations.length}개\n`);

    let successCount = 0;
    let failCount = 0;

    for (const ev of approvedEvaluations) {
      try {
        // categoryScores 재구성
        const categoryScores = {};
        ev.scores.forEach(score => {
          categoryScores[score.criteriaKey] = score.score;
        });

        // 한/영의 경우 대분류 합계 계산
        if (ev.language === 'korean-english') {
          const koreanCategories = Object.keys(evaluationCriteria.korean);
          koreanCategories.forEach((cat) => {
            const sum = Object.entries(categoryScores)
              .filter(([key]) => key.startsWith(`korean-${cat}-`))
              .reduce((acc, [, score]) => acc + (score || 0), 0);
            categoryScores[`korean-${cat}`] = sum;
          });

          const englishCategories = Object.keys(evaluationCriteria.english);
          englishCategories.forEach((cat) => {
            const sum = Object.entries(categoryScores)
              .filter(([key]) => key.startsWith(`english-${cat}-`))
              .reduce((acc, [, score]) => acc + (score || 0), 0);
            categoryScores[`english-${cat}`] = sum;
          });
        }

        // grade 재계산
        const gradeInfo = getGradeInfo(
          ev.totalScore || 0,
          categoryScores,
          ev.language,
          ev.category || '신규'
        );
        const newGrade = gradeInfo.grade;

        // DB 업데이트
        await prisma.evaluation.update({
          where: { id: ev.id },
          data: { grade: newGrade }
        });

        console.log(`✅ ${ev.user.name} (${ev.user.employeeId}): ${ev.grade} → ${newGrade} (총점: ${ev.totalScore})`);
        successCount++;

      } catch (error) {
        console.error(`❌ ${ev.user.name} 실패:`, error.message);
        failCount++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`✅ 성공: ${successCount}개`);
    console.log(`❌ 실패: ${failCount}개`);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ 전체 오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixNovemberGrades();

