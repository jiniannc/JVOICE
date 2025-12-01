const { PrismaClient } = require('./lib/generated/prisma');

const prisma = new PrismaClient();

async function findByName() {
  try {
    // 이름으로 사용자 찾기
    const user = await prisma.user.findFirst({
      where: { name: { contains: '강여울' } }
    });

    if (!user) {
      console.log('❌ "강여울" 이름을 가진 사용자를 찾을 수 없습니다!');
      return;
    }

    console.log(`✅ 사용자 찾음: ${user.name} (${user.employeeId})`);

    // 해당 사용자의 최근 평가 찾기
    const evaluations = await prisma.evaluation.findMany({
      where: { userId: user.id },
      include: {
        scores: true
      },
      orderBy: { submittedAt: 'desc' },
      take: 5
    });

    console.log(`\n📊 평가 개수: ${evaluations.length}개\n`);

    evaluations.forEach((ev, idx) => {
      const zeroCount = ev.scores.filter(s => s.score === 0).length;
      console.log(`${idx + 1}. ID: ${ev.id}`);
      console.log(`   상태: ${ev.status}`);
      console.log(`   제출일: ${ev.submittedAt.toISOString().split('T')[0]}`);
      console.log(`   소항목: ${ev.scores.length}개 (0점: ${zeroCount}개)`);
      console.log(`   한국어: ${ev.koreanTotalScore}, 영어: ${ev.englishTotalScore}`);
      console.log('');
    });

  } catch (error) {
    console.error('에러:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findByName();




