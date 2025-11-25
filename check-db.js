const { PrismaClient } = require('./lib/generated/prisma');

const prisma = new PrismaClient();

async function checkEvaluation() {
  try {
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: 'cmhstiybx005zpc015r07116f' },
      include: {
        scores: {
          orderBy: { criteriaKey: 'asc' }
        },
        user: {
          select: { name: true, employeeId: true }
        }
      }
    });

    if (!evaluation) {
      console.log('평가를 찾을 수 없습니다!');
      return;
    }

    const zeroScores = evaluation.scores.filter(s => s.score === 0);
    const nonZeroScores = evaluation.scores.filter(s => s.score !== 0);

    console.log('='.repeat(80));
    console.log(`👤 이름: ${evaluation.user.name} (${evaluation.user.employeeId})`);
    console.log(`📊 상태: ${evaluation.status}`);
    console.log(`📝 총 소항목 개수: ${evaluation.scores.length}개`);
    console.log(`❌ 0점 항목: ${zeroScores.length}개`);
    console.log(`✅ 0점 아닌 항목: ${nonZeroScores.length}개`);
    console.log(`🇰🇷 한국어 총점 (DB): ${evaluation.koreanTotalScore}`);
    console.log(`🇬🇧 영어 총점 (DB): ${evaluation.englishTotalScore}`);
    console.log(`💯 전체 총점 (DB): ${evaluation.totalScore}`);
    console.log('='.repeat(80));
    
    if (zeroScores.length > 0) {
      console.log('\n❌ 0점 항목 (첫 10개):');
      zeroScores.slice(0, 10).forEach(s => {
        console.log(`  - ${s.criteriaKey}: ${s.score}`);
      });
    }
    
    if (nonZeroScores.length > 0) {
      console.log('\n✅ 0점 아닌 항목 (첫 10개):');
      nonZeroScores.slice(0, 10).forEach(s => {
        console.log(`  - ${s.criteriaKey}: ${s.score}`);
      });
    }

  } catch (error) {
    console.error('에러:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEvaluation();

