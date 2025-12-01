const { PrismaClient } = require('./lib/generated/prisma');

const prisma = new PrismaClient();

async function checkApprovedEvaluations() {
  try {
    // 11월에 승인된 평가들 조회
    const approvedEvaluations = await prisma.evaluation.findMany({
      where: {
        status: 'approved',
        approvedAt: {
          gte: new Date('2025-11-01'),
          lt: new Date('2025-12-01')
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            koreanEnglishGrade: true,
            koreanEnglishExpiry: true,
            japaneseGrade: true,
            chineseGrade: true
          }
        }
      },
      orderBy: { approvedAt: 'desc' },
      take: 20
    });

    console.log('='.repeat(80));
    console.log(`📊 11월 승인된 평가: ${approvedEvaluations.length}개`);
    console.log('='.repeat(80));

    if (approvedEvaluations.length === 0) {
      console.log('❌ 11월에 승인된 평가가 없습니다!');
      return;
    }

    approvedEvaluations.forEach((ev, idx) => {
      console.log(`\n${idx + 1}. ${ev.user.name} (${ev.user.employeeId})`);
      console.log(`   평가 ID: ${ev.id}`);
      console.log(`   언어: ${ev.language}`);
      console.log(`   평가 등급: ${ev.grade || 'N/A'}`);
      console.log(`   총점: ${ev.totalScore}`);
      console.log(`   승인일: ${ev.approvedAt?.toISOString().split('T')[0] || 'N/A'}`);
      console.log(`   현재 자격:`);
      
      if (ev.language === 'korean-english') {
        const expiry = ev.user.koreanEnglishExpiry ? (typeof ev.user.koreanEnglishExpiry === 'string' ? ev.user.koreanEnglishExpiry : ev.user.koreanEnglishExpiry.toISOString().split('T')[0]) : 'N/A';
        console.log(`     - 한/영: ${ev.user.koreanEnglishGrade || '없음'} (만료: ${expiry})`);
      } else if (ev.language === 'japanese') {
        console.log(`     - 일본어: ${ev.user.japaneseGrade || '없음'}`);
      } else if (ev.language === 'chinese') {
        console.log(`     - 중국어: ${ev.user.chineseGrade || '없음'}`);
      }
    });

    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('❌ 오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkApprovedEvaluations();

