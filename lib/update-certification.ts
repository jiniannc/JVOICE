import { PrismaClient } from './generated/prisma';

const prisma = new PrismaClient();

// 등급 매핑: 평가 등급 → DB 자격 코드
const GRADE_MAPPING = {
  'korean-english': {
    'S': 'ANNC_S',
    'A': 'ANNC_A',
    'B': 'ANNC_B',
  },
  'japanese': {
    'A': 'JP_A',
    'B': 'JP_B',
  },
  'chinese': {
    'A': 'CN_A',
    'B': 'CN_B',
  },
};

// 등급 우선순위 (숫자가 높을수록 상위 등급)
const GRADE_PRIORITY: { [key: string]: number } = {
  'ANNC_S': 3,
  'ANNC_A': 2,
  'ANNC_B': 1,
  'JP_A': 2,
  'JP_B': 1,
  'CN_A': 2,
  'CN_B': 1,
};

/**
 * 유효기간 계산: approved 날짜 + 3년 1개월, 그 달의 마지막 날
 * 예: 2025년 7월 승인 → 2028년 8월 31일
 * 예: 2025-11-28 → 2028-12-31
 */
function calculateExpiryDate(approvedDate: Date): Date {
  const expiry = new Date(approvedDate);
  const originalYear = expiry.getFullYear();
  const originalMonth = expiry.getMonth() + 1; // 1-based month
  
  // 3년 추가
  expiry.setFullYear(expiry.getFullYear() + 3);
  
  // 1개월 추가
  expiry.setMonth(expiry.getMonth() + 1);
  
  // 그 달의 마지막 날로 설정
  expiry.setMonth(expiry.getMonth() + 1, 0); // 다음 달 0일 = 이번 달 마지막 날
  expiry.setHours(23, 59, 59, 999);
  
  console.log(`📅 [Certification] 유효기간 계산: ${originalYear}년 ${originalMonth}월 승인 → ${expiry.getFullYear()}년 ${expiry.getMonth() + 1}월 ${expiry.getDate()}일까지`);
  
  return expiry;
}

/**
 * 등급 비교: 새 등급이 기존 등급보다 상위인지 확인
 */
function isHigherGrade(newGrade: string, currentGrade: string | null): boolean {
  if (!currentGrade) return true; // 기존 등급 없으면 무조건 업데이트
  
  const newPriority = GRADE_PRIORITY[newGrade] || 0;
  const currentPriority = GRADE_PRIORITY[currentGrade] || 0;
  
  return newPriority > currentPriority;
}

/**
 * 평가 결과를 기반으로 직원의 자격증 정보를 자동으로 업데이트합니다
 * @param evaluationId 평가 ID
 */
export async function updateCertificationFromEvaluation(evaluationId: string) {
  try {
    // 평가 정보 조회
    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      select: {
        id: true,
        userId: true,
        language: true,
        category: true,
        status: true,
        grade: true,
        totalScore: true,
        koreanTotalScore: true,
        englishTotalScore: true,
        evaluatedAt: true,
        approvedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            email: true,
            koreanEnglishGrade: true,
            koreanEnglishExpiry: true,
            japaneseGrade: true,
            chineseGrade: true,
          }
        },
        scores: true  // ← categoryScores 계산을 위해 scores도 가져오기
      },
    });

    if (!evaluation) {
      console.error(`❌ [Certification] 평가를 찾을 수 없습니다: ${evaluationId}`);
      return { success: false, error: '평가를 찾을 수 없습니다' };
    }

    // approved 상태가 아니면 업데이트하지 않음
    if (evaluation.status !== 'approved') {
      console.log(`⏭️ [Certification] 평가 상태가 approved가 아님: ${evaluation.status}`);
      return { success: false, message: 'approved 상태가 아닙니다' };
    }

    // 🔥 DB의 grade가 아닌 categoryScores로 등급 재계산
    const categoryScores: Record<string, number> = {};
    evaluation.scores.forEach(score => {
      categoryScores[score.criteriaKey] = score.score;
    });
    
    // 한/영의 경우 대분류 합계 생성
    if (evaluation.language === 'korean-english') {
      const { evaluationCriteria } = await import('./evaluation-criteria');
      
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
    
    // getGradeInfo로 실제 등급 계산
    let actualGrade = evaluation.grade;
    try {
      const { getGradeInfo } = await import('./evaluation-criteria');
      const gradeInfo = getGradeInfo(
        evaluation.totalScore || 0,
        categoryScores,
        evaluation.language,
        evaluation.category
      );
      actualGrade = gradeInfo.grade;
      console.log(`🔍 [Certification] 등급 재계산: DB=${evaluation.grade}, 실제=${actualGrade}`);
    } catch (e) {
      console.error(`❌ [Certification] 등급 계산 실패:`, e);
      actualGrade = evaluation.grade; // fallback
    }

    // Fail 등급이면 업데이트하지 않음
    if (!actualGrade || actualGrade === 'Fail' || actualGrade === 'FAIL' || actualGrade === 'N/A' || actualGrade.toUpperCase() === 'F') {
      console.log(`⏭️ [Certification] Fail 또는 N/A 등급은 자격증을 부여하지 않음: ${actualGrade}`);
      return { success: false, message: 'Fail 등급은 자격증을 부여하지 않습니다' };
    }

    const user = evaluation.user;

    if (!user) {
      console.error(`❌ [Certification] 직원을 찾을 수 없습니다: ${evaluation.userId}`);
      return { success: false, error: '직원을 찾을 수 없습니다' };
    }

    // 평가 등급을 DB 자격 코드로 매핑
    const rawGrade = (actualGrade || '').toUpperCase().trim();
    // "A등급" → "A", "B등급" → "B" 등으로 변환
    const gradeOnly = rawGrade.replace('등급', '').replace('GRADE', '').trim();
    const gradeMapping = GRADE_MAPPING[evaluation.language as keyof typeof GRADE_MAPPING];
    
    if (!gradeMapping) {
      console.log(`⚠️ [Certification] 알 수 없는 언어: ${evaluation.language}`);
      return { success: false, error: '지원하지 않는 언어입니다' };
    }
    
    const newGrade = gradeMapping[gradeOnly as keyof typeof gradeMapping];
    
    if (!newGrade) {
      console.log(`⚠️ [Certification] 유효하지 않은 등급: ${rawGrade} → ${gradeOnly} (${evaluation.language})`);
      return { success: false, error: `유효하지 않은 등급: ${rawGrade}` };
    }

    const evaluatedDate = evaluation.approvedAt || evaluation.evaluatedAt || new Date();
    const updateData: any = {};
    let shouldUpdate = false;
    let updateReason = '';

    // 언어별로 자격증 업데이트 로직
    if (evaluation.language === 'korean-english') {
      const currentGrade = user.koreanEnglishGrade;
      
      console.log(`🔍 [Certification] 한/영 자격 비교: 현재=${currentGrade}, 신규=${newGrade}`);
      
      if (isHigherGrade(newGrade, currentGrade)) {
        // 상위 등급 취득 → 등급 + 유효기간 업데이트
        updateData.koreanEnglishGrade = newGrade;
        updateData.koreanEnglishExpiry = calculateExpiryDate(evaluatedDate);
        shouldUpdate = true;
        updateReason = '상위 등급 취득';
        console.log(`✅ [Certification] 한/영 상위 등급 취득: ${currentGrade || '없음'} → ${newGrade} (등급+유효기간 업데이트)`);
      } else if (newGrade === currentGrade) {
        // 같은 등급 취득 → 유효기간만 갱신
        updateData.koreanEnglishExpiry = calculateExpiryDate(evaluatedDate);
        shouldUpdate = true;
        updateReason = '유효기간 갱신';
        console.log(`✅ [Certification] 한/영 같은 등급 갱신: ${newGrade} (유효기간만 갱신)`);
      } else {
        // 하위 등급 취득 → 업데이트 안함 (기존 등급 유지)
        console.log(`🛡️ [Certification] 한/영 하위 등급 취득으로 기존 등급 유지: 현재 ${currentGrade} > 신규 ${newGrade}`);
        return {
          success: false,
          message: `하위 등급(${newGrade})은 업데이트되지 않습니다. 기존 등급(${currentGrade})을 유지합니다.`,
        };
      }
    } else if (evaluation.language === 'japanese') {
      const currentGrade = user.japaneseGrade;
      
      console.log(`🔍 [Certification] 일본어 자격 비교: 현재=${currentGrade}, 신규=${newGrade}`);
      
      if (isHigherGrade(newGrade, currentGrade)) {
        // 상위 등급 취득 → 등급 업데이트 (유효기간 없음)
        updateData.japaneseGrade = newGrade;
        shouldUpdate = true;
        updateReason = '상위 등급 취득';
        console.log(`✅ [Certification] 일본어 상위 등급 취득: ${currentGrade || '없음'} → ${newGrade}`);
      } else if (newGrade === currentGrade) {
        // 같은 등급 취득 → 업데이트 안함 (유효기간 없으므로)
        console.log(`⏭️ [Certification] 일본어 같은 등급, 유효기간 없으므로 업데이트 안함: ${newGrade}`);
        return {
          success: false,
          message: `같은 등급(${newGrade})이며 유효기간이 없어 업데이트되지 않습니다`,
        };
      } else {
        // 하위 등급 취득 → 업데이트 안함 (기존 등급 유지)
        console.log(`🛡️ [Certification] 일본어 하위 등급 취득으로 기존 등급 유지: 현재 ${currentGrade} > 신규 ${newGrade}`);
        return {
          success: false,
          message: `하위 등급(${newGrade})은 업데이트되지 않습니다. 기존 등급(${currentGrade})을 유지합니다.`,
        };
      }
    } else if (evaluation.language === 'chinese') {
      const currentGrade = user.chineseGrade;
      
      console.log(`🔍 [Certification] 중국어 자격 비교: 현재=${currentGrade}, 신규=${newGrade}`);
      
      if (isHigherGrade(newGrade, currentGrade)) {
        // 상위 등급 취득 → 등급 업데이트 (유효기간 없음)
        updateData.chineseGrade = newGrade;
        shouldUpdate = true;
        updateReason = '상위 등급 취득';
        console.log(`✅ [Certification] 중국어 상위 등급 취득: ${currentGrade || '없음'} → ${newGrade}`);
      } else if (newGrade === currentGrade) {
        // 같은 등급 취득 → 업데이트 안함 (유효기간 없으므로)
        console.log(`⏭️ [Certification] 중국어 같은 등급, 유효기간 없으므로 업데이트 안함: ${newGrade}`);
        return {
          success: false,
          message: `같은 등급(${newGrade})이며 유효기간이 없어 업데이트되지 않습니다`,
        };
      } else {
        // 하위 등급 취득 → 업데이트 안함 (기존 등급 유지)
        console.log(`🛡️ [Certification] 중국어 하위 등급 취득으로 기존 등급 유지: 현재 ${currentGrade} > 신규 ${newGrade}`);
        return {
          success: false,
          message: `하위 등급(${newGrade})은 업데이트되지 않습니다. 기존 등급(${currentGrade})을 유지합니다.`,
        };
      }
    }

    if (!shouldUpdate) {
      return { success: false, message: '업데이트할 내용이 없습니다' };
    }

    // DB 업데이트
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    console.log(`✅ [Certification] 자격증 자동 업데이트 완료: ${user.name} (${user.employeeId}) - ${updateReason}`);

    return {
      success: true,
      message: `자격증이 성공적으로 업데이트되었습니다 (${updateReason})`,
      user: {
        name: updatedUser.name,
        employeeId: updatedUser.employeeId,
        language: evaluation.language,
        grade: newGrade,
        expiryDate: updateData.koreanEnglishExpiry || null,
        updateReason,
      },
    };
  } catch (error: any) {
    console.error('❌ [Certification] 자격증 업데이트 실패:', error);
    return { success: false, error: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

