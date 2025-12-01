const { PrismaClient } = require('./lib/generated/prisma');
const { updateCertificationFromEvaluation } = require('./lib/update-certification');

const prisma = new PrismaClient();

async function updateAllCertifications() {
  try {
    console.log('🔄 11월 승인 평가의 자격 업데이트 시작...\n');

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
        user: {
          select: { name: true, employeeId: true }
        }
      },
      orderBy: { approvedAt: 'desc' }
    });

    console.log(`📊 대상 평가: ${approvedEvaluations.length}개\n`);

    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;

    for (const ev of approvedEvaluations) {
      try {
        console.log(`🔄 처리 중: ${ev.user.name} (${ev.user.employeeId}) - ${ev.language}...`);
        
        const result = await updateCertificationFromEvaluation(ev.id);
        
        if (result.success) {
          console.log(`✅ ${ev.user.name}: ${result.message}`);
          successCount++;
        } else {
          console.log(`⏭️ ${ev.user.name}: ${result.message || result.error}`);
          skipCount++;
        }

      } catch (error) {
        console.error(`❌ ${ev.user.name} 실패:`, error.message);
        failCount++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`✅ 성공: ${successCount}개`);
    console.log(`⏭️ 스킵: ${skipCount}개`);
    console.log(`❌ 실패: ${failCount}개`);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ 전체 오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateAllCertifications();



