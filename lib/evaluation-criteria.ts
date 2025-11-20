// v85 평가 기준 완전 복원 - 정확한 점수 배분

export interface SubCriteria {
  [key: string]: number
}

export interface EvaluationCriteria {
  [category: string]: SubCriteria | number
}

// v85 정확한 평가 기준
export const evaluationCriteria = {
  korean: {
    발음: {
      자음: 3,
      모음: 3,
      이중모음: 3,
      ㅎ음가: 3,
      받침발음: 3,
      장음: 3,
      "발음기호 준수": 2,
    }, // 총 20점
    억양: {
      "자연스러운 억양": 5,
      "상승, 하강, 평어조의 적절한 사용": 5,
      "꾸밈없는 조사와 어미": 5,
      "표준 억양 사용": 5,
    }, // 총 20점
    전달력: {
      "의미상 주요단어의 강세": 5,
      "의미 단위의 끊어읽기": 5,
      "부드러운 연결": 5,
      "문안의 숙련도": 5,
    }, // 총 20점
    음성: {
      "친절한 분위기": 5,
      "전문적이고 정성스러운 방송": 5,
      "방송문 성격에 맞는 적절한 연출": 5,
      "자신감있고 안정적인 발성": 5,
    }, // 총 20점
    속도: {
      "전체적인 속도": 10,
      "일관된 속도 유지": 5,
      "Pause의 적절한 길이 조절": 5,
    }, // 총 20점
  }, // 한국어 총 100점
  english: {
    발음_자음: {
      "P / F": 4,
      "B / V": 4,
      "R / L": 4,
      "기타 자음": 4,
      변이음: 4,
    }, // 총 20점
    발음_모음: {
      모음: 10,
      "장모음 / 단모음": 5,
      "음절의 이해": 5,
    }, // 총 20점
    억양: {
      "언어적 유창성": 5,
      "음 높낮이의 효과적인 사용": 5,
      "문맥 / 문장 유형에 맞는 적절한 억양 표현": 5,
      연음: 5,
    }, // 총 20점
    강세: {
      "단어 고유의 강세": 10,
      "의미상 주요단어의 강세": 5,
      "강세의 이해": 5,
    }, // 총 20점
    전달력: {
      "자연스러운 연결": 4,
      "자신감있고 안정적인 발성": 4,
      "Pause의 활용": 4,
      "전체적인 속도": 4,
      "일관된 속도 유지": 4,
    }, // 총 20점
  }, // 영어 총 100점 (한/영 총 200점)

  // 일본어/중국어 기존 6개 항목 유지
  japanese: {
    발음: 30,
    억양: 20,
    Pause: 25,
    Speed: 10,
    Tone: 10,
    Volume: 5,
  }, // 총 100점
  chinese: {
    한어병음: 30,
    억양: 20,
    PAUSE: 20,
    속도: 10,
    Tone: 10,
    Volume: 10,
  }, // 총 100점
}

// v85 등급 판정 시스템 완전 복원
export function getGradeInfo(
  totalScore: number,
  categoryScores: { [key: string]: number },
  language: string,
  category: string,
) {
  if (language === "korean-english") {
    // 한/영의 경우: 모든 대분류 항목에서 16점 이상이어야 함
    const koreanCategories = ["korean-발음", "korean-억양", "korean-전달력", "korean-음성", "korean-속도"]
    const englishCategories = [
      "english-발음_자음",
      "english-발음_모음",
      "english-억양",
      "english-강세",
      "english-전달력",
    ]

    // FAIL 조건 확인 - 하나라도 16점 미만이면 FAIL
    for (const cat of [...koreanCategories, ...englishCategories]) {
      const score = categoryScores[cat] || 0
      if (score < 16) {
        return {
          grade: "FAIL",
          color: "text-red-600",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          reason: `${cat.replace("korean-", "").replace("english-", "")} 항목 점수 부족`,
        }
      }
    }

    // 총점 160점 미만이면 FAIL
    if (totalScore < 160) {
      return {
        grade: "FAIL",
        color: "text-red-600",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        reason: "총점 부족",
      }
    }

    // S/A/B 등급 결정
    let hasBelow17 = false
    let hasBelow18 = false

    for (const cat of [...koreanCategories, ...englishCategories]) {
      const score = categoryScores[cat] || 0
      if (score < 17) {
        hasBelow17 = true
        break
      }
      if (score < 18) {
        hasBelow18 = true
      }
    }

    if (hasBelow17) {
      return {
        grade: "B등급",
        color: "text-yellow-600",
        bgColor: "bg-yellow-50",
        borderColor: "border-yellow-200",
      }
    } else if (hasBelow18) {
      return {
        grade: "A등급",
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
      }
    } else {
      return {
        grade: "S등급",
        color: "text-green-600",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
      }
    }
  } else {
    // 일본어/중국어의 경우
    const majorCategories = Object.keys(evaluationCriteria[language as keyof typeof evaluationCriteria] || {})

    // 🔥 일본어 특수 항목 판정 추적 변수
    let japanesePauseLevel: 'pass' | 'fail' | null = null  // pass면 통과, fail이면 불합격
    let japaneseVolumeLevel: 'pass' | 'fail' | null = null
    let japanesePauseForGrade: 'A' | 'B' | null = null  // A/B 자격 구분용
    let japaneseVolumeForGrade: 'A' | 'B' | null = null

    // 각 항목별 80% 이상 체크
    for (const cat of majorCategories) {
      const score = categoryScores[cat] || 0
      const criteria = evaluationCriteria[language as keyof typeof evaluationCriteria] as { [key: string]: number }
      const maxScore = criteria[cat] || 0
      
      // 🔥 일본어 Pause 항목: 개별 점수 기준 적용
      if (language === "japanese" && cat === "Pause") {
        if (score >= 23) {
          japanesePauseLevel = 'pass'
          japanesePauseForGrade = 'A'
        } else if (score >= 21) {
          japanesePauseLevel = 'pass'
          japanesePauseForGrade = 'B'
        } else {
          japanesePauseLevel = 'fail'
          return {
            grade: "F",
            color: "text-red-600",
            bgColor: "bg-red-50",
            borderColor: "border-red-200",
            reason: `${cat} 항목 점수 부족 (${score}/25, 최소 21점 필요)`,
          }
        }
        continue // 80% 체크 건너뛰기
      }

      // 🔥 일본어 Volume 항목: 개별 점수 기준 적용
      if (language === "japanese" && cat === "Volume") {
        if (score >= 4) {
          japaneseVolumeLevel = 'pass'
          japaneseVolumeForGrade = 'A'
        } else if (score >= 3) {
          japaneseVolumeLevel = 'pass'
          japaneseVolumeForGrade = 'B'
        } else {
          japaneseVolumeLevel = 'fail'
          return {
            grade: "F",
            color: "text-red-600",
            bgColor: "bg-red-50",
            borderColor: "border-red-200",
            reason: `${cat} 항목 점수 부족 (${score}/5, 최소 3점 필요)`,
          }
        }
        continue // 80% 체크 건너뛰기
      }

      // 나머지 항목은 기존대로 80% 기준 적용
      const minRequired = maxScore * 0.8 // 80% 기준
      if (score < minRequired) {
        return {
          grade: "F",
          color: "text-red-600",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          reason: `${cat} 항목 점수 부족 (${score}/${maxScore}, 최소 ${minRequired}점 필요)`,
        }
      }
    }

    if (totalScore < 80) {
      return {
        grade: "F",
        color: "text-red-600",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        reason: "총점 부족",
      }
    }

    // 신규: 90점 이상이면 A, 80점 이상이면 B, 80점 미만이면 F
    // 상위: 90점 이상이면 A, 90점 미만이면 F (기존 로직 유지)
    if (category === "신규") {
      // 🔥 일본어의 경우 Pause/Volume 항목의 개별 기준도 확인
      if (language === "japanese") {
        // Pause나 Volume 중 하나라도 B 기준만 충족하면 최대 B등급
        const hasOnlyBLevel = japanesePauseForGrade === 'B' || japaneseVolumeForGrade === 'B'
        
        if (totalScore >= 90 && !hasOnlyBLevel) {
          return {
            grade: "A",
            color: "text-green-600",
            bgColor: "bg-green-50",
            borderColor: "border-green-200",
          } // 신규 A등급
        } else if (totalScore >= 80) {
          return {
            grade: "B",
            color: "text-blue-600",
            bgColor: "bg-blue-50",
            borderColor: "border-blue-200",
          } // 신규 B등급 (Pause/Volume이 B 기준이거나 총점이 80-89점)
        } else {
          return {
            grade: "F",
            color: "text-red-600",
            bgColor: "bg-red-50",
            borderColor: "border-red-200",
            reason: "신규 자격 기준 미달",
          }
        }
      } else {
        // 중국어 등 기존 로직
        if (totalScore >= 90) {
          return {
            grade: "A",
            color: "text-green-600",
            bgColor: "bg-green-50",
            borderColor: "border-green-200",
          } // 신규 A등급
        } else if (totalScore >= 80) {
          return {
            grade: "B",
            color: "text-blue-600",
            bgColor: "bg-blue-50",
            borderColor: "border-blue-200",
          } // 신규 B등급
        } else {
          return {
            grade: "F",
            color: "text-red-600",
            bgColor: "bg-red-50",
            borderColor: "border-red-200",
            reason: "신규 자격 기준 미달",
          }
        }
      }
    } else {
      // 🔥 상위 자격: 90점 이상이면 A, 90점 미만이면 F
      // 일본어의 경우 Pause/Volume이 A 기준을 충족해야 함
      if (language === "japanese") {
        const hasOnlyBLevel = japanesePauseForGrade === 'B' || japaneseVolumeForGrade === 'B'
        
        if (totalScore >= 90 && !hasOnlyBLevel) {
          return {
            grade: "A",
            color: "text-green-600",
            bgColor: "bg-green-50",
            borderColor: "border-green-200",
          } // 상위 A등급
        } else {
          return {
            grade: "F",
            color: "text-red-600",
            bgColor: "bg-red-50",
            borderColor: "border-red-200",
            reason: hasOnlyBLevel 
              ? "상위 자격은 Pause 23점 이상, Volume 4점 이상 필요" 
              : "상위 자격은 90점 이상 필요",
          }
        }
      } else {
        // 중국어 등 기존 로직
        if (totalScore >= 90) {
          return {
            grade: "A",
            color: "text-green-600",
            bgColor: "bg-green-50",
            borderColor: "border-green-200",
          } // 상위 A등급
        } else {
          return {
            grade: "F",
            color: "text-red-600",
            bgColor: "bg-red-50",
            borderColor: "border-red-200",
            reason: "상위 자격은 90점 이상 필요",
          }
        }
      }
    }
  }
}

// 카테고리별 점수 계산
export function calculateCategoryScore(scores: { [key: string]: number }, category: string): number {
  return Object.entries(scores)
    .filter(([key]) => key.startsWith(category + "-") || key === category)
    .reduce((sum, [, score]) => sum + score, 0)
}

// 총점 계산
export function calculateTotalScore(scores: { [key: string]: number }): number {
  return Object.values(scores).reduce((sum, score) => sum + score, 0)
}

// 언어별 평가 기준 가져오기
export function getEvaluationCriteria(language: string) {
  return evaluationCriteria[language as keyof typeof evaluationCriteria] || {}
}
