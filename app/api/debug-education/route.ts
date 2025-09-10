import { NextResponse } from 'next/server'
import { prisma } from '../../../lib/database'

export async function GET() {
  try {
    console.log('🔍 [debug-education] 소규모 교육 신청 현황 조회 시작');

    // 모든 교육 신청 조회
    const applications = await prisma.scheduleApplication.findMany({
      where: {
        schedule: {
          OR: [
            { classType: '1:1' },
            { classType: 'small' }
          ]
        },
        status: 'ACTIVE'
      },
      select: {
        id: true,
        slot: true,
        details: true,
        schedule: {
          select: {
            date: true,
            classType: true,
            type: true
          }
        },
        user: {
          select: {
            name: true,
            employeeId: true
          }
        }
      },
      orderBy: [
        { schedule: { date: 'desc' } },
        { slot: 'asc' }
      ]
    });

    console.log(`🔍 [debug-education] 전체 교육 신청: ${applications.length}건`);

    // 소규모 교육만 필터링
    const smallGroupApplications = applications.filter(app => {
      const educationType = app.details?.educationType || (app.schedule.classType === 'small' ? 'small-group' : '1:1');
      return educationType === 'small-group' || app.schedule.classType === 'small';
    });

    console.log(`🔍 [debug-education] 소규모 교육 신청: ${smallGroupApplications.length}건`);

    // 상세 정보 로그
    const debugData = applications.map(app => {
      const educationType = app.details?.educationType || (app.schedule.classType === 'small' ? 'small-group' : '1:1');
      const classType = educationType === 'small-group' ? '소규모' : '1:1';
      
      return {
        user: `${app.user.name}(${app.user.employeeId})`,
        date: app.schedule.date,
        slot: app.slot,
        scheduleClassType: app.schedule.classType,
        detailsEducationType: app.details?.educationType,
        finalClassType: classType,
        isSmallGroup: classType === '소규모'
      };
    });

    return NextResponse.json({
      totalApplications: applications.length,
      smallGroupApplications: smallGroupApplications.length,
      debugData: debugData,
      smallGroupOnly: debugData.filter(d => d.isSmallGroup)
    });

  } catch (error) {
    console.error('🔍 [debug-education] 오류:', error);
    return NextResponse.json({ 
      error: '디버깅 조회 실패', 
      details: error instanceof Error ? error.message : '알 수 없는 오류' 
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
