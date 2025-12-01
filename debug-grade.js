const { PrismaClient } = require('./lib/generated/prisma');
const { getGradeInfo, evaluationCriteria } = require('./lib/evaluation-criteria');

const prisma = new PrismaClient();

async function debugGradeCalculation() {
  try {
    // 최다인의 평가 데이터 조회
    const user = await prisma.user.findFirst({
      where: { name: '최다인' }
    });

    if (!user) {
      console.log('사용자를 찾을 수 없습니다!');
      return;
    }

    const evaluation = await prisma.evaluation.findFirst({
      where: {
        userId: user.id,
        status: 'approved',
        approvedAt: {
          gte: new Date('2025-11-01'),
          lt: new Date('2025-12-01')
        }
      },
      include: {
        scores: true
      }
    });

    if (!evaluation) {
      console.log('평가를 찾을 수 없습니다!');
      return;
    }

    console.log('='.repeat(80));
    console.log(`👤 ${user.name} (${user.employeeId})`);
    console.log(`📊 평가 ID: ${evaluation.id}`);
    console.log(`💯 총점: ${evaluation.totalScore}`);
    console.log(`📝 소항목 개수: ${evaluation.scores.length}개`);
    console.log('='.repeat(80));

    // categoryScores 재구성
    const categoryScores = {};
    evaluation.scores.forEach(score => {
      categoryScores[score.criteriaKey] = score.score;
    });

    console.log('\n📋 소항목 점수 (샘플):');
    Object.entries(categoryScores).slice(0, 10).forEach(([key, score]) => {
      console.log(`  ${key}: ${score}`);
    });

    // 대분류 합계 계산
    if (evaluation.language === 'korean-english') {
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

      console.log('\n📊 대분류 합계:');
      console.log(`  korean-발음: ${categoryScores['korean-발음'] || 0}`);
      console.log(`  korean-억양: ${categoryScores['korean-억양'] || 0}`);
      console.log(`  korean-전달력: ${categoryScores['korean-전달력'] || 0}`);
      console.log(`  korean-음성: ${categoryScores['korean-음성'] || 0}`);
      console.log(`  korean-속도: ${categoryScores['korean-속도'] || 0}`);
      console.log(`  english-발음_자음: ${categoryScores['english-발음_자음'] || 0}`);
      console.log(`  english-발음_모음: ${categoryScores['english-발음_모음'] || 0}`);
      console.log(`  english-억양: ${categoryScores['english-억양'] || 0}`);
      console.log(`  english-강세: ${categoryScores['english-강세'] || 0}`);
      console.log(`  english-전달력: ${categoryScores['english-전달력'] || 0}`);
    }

    // getGradeInfo 호출
    const gradeInfo = getGradeInfo(
      evaluation.totalScore || 0,
      categoryScores,
      evaluation.language,
      evaluation.category || '신규'
    );

    console.log('\n🎯 등급 계산 결과:');
    console.log(`  grade: ${gradeInfo.grade}`);
    if (gradeInfo.reason) {
      console.log(`  reason: ${gradeInfo.reason}`);
    }
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ 오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugGradeCalculation();



