export interface PDFScript {
  id: string
  language: string
  scriptNumber: number
  fileName: string
  fileSize: number
  uploadedAt: string
}

export class PDFDatabaseService {
  constructor() {
    console.log("📦 PDFDatabaseService 초기화")
  }

  // 캐시는 사용하지 않음 - 항상 데이터베이스에서 최신 데이터 조회
  clearScriptCache(): void {
    console.log("🗑️ 캐시 미사용 (항상 데이터베이스 조회)")
  }

  // 데이터베이스에서 PDF 파일 목록 조회
  async getAvailableScripts(language: string): Promise<number[]> {
    try {
      console.log(`🔍 getAvailableScripts 호출: language="${language}"`)
      
      const response = await fetch('/api/pdf-scripts')
      if (!response.ok) {
        throw new Error('PDF 파일 목록 조회 실패')
      }
      
      const data = await response.json()
      const files = data.files || []
      
      console.log(`📋 전체 PDF 파일 개수: ${files.length}`)
      
      // 해당 언어의 파일들만 필터링
      const languageFiles = files.filter((file: PDFScript) => file.language === language)
      console.log(`🔍 ${language} 언어 파일 개수: ${languageFiles.length}`)
      
      // 문안 번호 추출 및 정렬
      const scriptNumbers = languageFiles
        .map((file: PDFScript) => file.scriptNumber)
        .sort((a, b) => a - b)
      
      // 중복 제거
      const uniqueNumbers = [...new Set(scriptNumbers)]
      
      console.log(`📋 ${language} 언어 사용 가능한 스크립트 번호:`, uniqueNumbers)
      return uniqueNumbers
      
    } catch (error) {
      console.error('PDF 파일 목록 조회 실패:', error)
      return []
    }
  }

  // 랜덤 스크립트 선택 (1번/9번 우선순위 유지)
  async getRandomScripts(language: string, count: number): Promise<number[]> {
    console.log(`🔍 getRandomScripts 호출: ${language}, 요청 개수: ${count}`)
    
    // 실제 데이터베이스에서 해당 언어의 스크립트 번호들을 가져옴
    const availableScripts = await this.getAvailableScripts(language)
    
    if (availableScripts.length === 0) {
      console.warn(`⚠️ ${language} 언어의 스크립트가 없습니다.`)
      return []
    }

    console.log(`📋 데이터베이스에서 가져온 ${language} 스크립트:`, availableScripts)

    // 업로드된 문안 수가 요청된 개수보다 적으면 가능한 만큼만 선택
    const actualCount = Math.min(count, availableScripts.length)
    console.log(`📊 요청된 문안 수: ${count}개, 사용 가능한 문안 수: ${availableScripts.length}개, 실제 선택할 문안 수: ${actualCount}개`)

    // 실제 파일에서 1번 또는 9번이 포함되도록 선택
    const result = this.selectScriptsWithRequiredNumbers(availableScripts, actualCount, language)
    
    console.log(`✅ 최종 선택된 스크립트 (정렬됨):`, result)
    return result
  }

  private selectScriptsWithRequiredNumbers(availableScripts: number[], count: number, language?: string): number[] {
    console.log(`\n🎲 [선택 시작] 사용 가능한 스크립트:`, availableScripts)
    console.log(`🎲 [선택 시작] 선택할 개수: ${count}개`)
    
    // 1번과 9번이 사용 가능한지 확인
    const hasScript1 = availableScripts.includes(1)
    const hasScript9 = availableScripts.includes(9)
    
    console.log(`🔍 1번 문안 사용 가능: ${hasScript1}, 9번 문안 사용 가능: ${hasScript9}`)
    
    // 1번과 9번 중 하나를 랜덤하게 선택 (둘 다 있으면 랜덤, 하나만 있으면 그걸 사용)
    let requiredScript: number | null = null
    if (hasScript1 && hasScript9) {
      // 둘 다 있으면 랜덤하게 하나 선택
      requiredScript = Math.random() > 0.5 ? 1 : 9
      console.log(`🎯 필수 문안 랜덤 선택: ${requiredScript}번 (1번과 9번 중)`)
    } else if (hasScript1) {
      requiredScript = 1
      console.log(`🎯 필수 문안: 1번 (9번 없음)`)
    } else if (hasScript9) {
      requiredScript = 9
      console.log(`🎯 필수 문안: 9번 (1번 없음)`)
    } else {
      console.log(`⚠️ 1번과 9번 모두 없음, 일반 랜덤 선택`)
    }
    
    // 필수 문안을 제외한 나머지 문안들
    const remainingScripts = availableScripts.filter(script => script !== 1 && script !== 9)
    console.log(`📋 1번/9번 제외한 나머지:`, remainingScripts)
    
    // 나머지에서 랜덤하게 (count - 1)개 선택 (필수 문안이 있는 경우)
    const targetCount = requiredScript !== null ? count - 1 : count
    const shuffled = [...remainingScripts].sort(() => 0.5 - Math.random())
    const selectedRemaining = shuffled.slice(0, Math.min(targetCount, shuffled.length))
    
    console.log(`🎲 나머지에서 ${targetCount}개 랜덤 선택 (정렬 전):`, selectedRemaining)
    
    // 필수 문안과 선택된 문안들을 합치고 정렬
    let finalScripts: number[]
    if (requiredScript !== null) {
      finalScripts = [requiredScript, ...selectedRemaining]
      console.log(`🔗 필수 문안 + 랜덤 문안 결합 (정렬 전):`, finalScripts)
    } else {
      // 1번과 9번이 모두 없는 경우 기존 로직 사용
      const shuffled = [...availableScripts].sort(() => 0.5 - Math.random())
      finalScripts = shuffled.slice(0, Math.min(count, shuffled.length))
      console.log(`🔗 일반 랜덤 선택 (정렬 전):`, finalScripts)
    }
    
    // 번호 순서대로 정렬
    const sortedScripts = finalScripts.sort((a, b) => a - b)
    
    console.log(`✅ 최종 선택 완료 (오름차순 정렬):`, sortedScripts)
    console.log(``)
    return sortedScripts
  }

  // PDF URL 생성 (데이터베이스에서 직접 조회)
  async getPDFUrl(language: string, scriptNumber: number): Promise<string> {
    try {
      console.log(`📄 PDF URL 요청: ${language} ${scriptNumber}번`)
      
      // 데이터베이스 API를 통해 PDF 파일 조회
      const response = await fetch(`/api/pdf-scripts/view/${language}/${scriptNumber}`)
      
      if (response.ok) {
        // PDF 파일이 성공적으로 조회되면 해당 URL 반환
        const url = `/api/pdf-scripts/view/${language}/${scriptNumber}`
        console.log(`✅ PDF URL 생성 성공: ${url}`)
        return url
      } else {
        throw new Error(`PDF 파일을 찾을 수 없음: ${language} ${scriptNumber}번`)
      }
      
    } catch (error) {
      console.error('PDF URL 생성 실패:', error)
      
      // 플레이스홀더 반환
      console.warn(`⚠️ PDF 파일을 찾을 수 없음: ${language} ${scriptNumber}번`)
      const baseUrl = "/placeholder.svg"
      const params = new URLSearchParams({
        height: "800",
        width: "600",
        text: `${language.toUpperCase()}_Script_${scriptNumber}`,
      })

      return `${baseUrl}?${params.toString()}`
    }
  }

  // 특정 언어의 총 문안 수 조회
  async getTotalScriptCount(language: string): Promise<number> {
    const availableScripts = await this.getAvailableScripts(language)
    return availableScripts.length
  }

  // 모든 언어의 문안 통계 조회
  async getAllScriptStats(): Promise<{ [language: string]: number }> {
    try {
      const response = await fetch('/api/pdf-scripts')
      if (!response.ok) {
        throw new Error('PDF 파일 목록 조회 실패')
      }
      
      const data = await response.json()
      const files = data.files || []
      
      // 언어별 통계 계산
      const stats = files.reduce((acc: { [key: string]: number }, file: PDFScript) => {
        acc[file.language] = (acc[file.language] || 0) + 1
        return acc
      }, {})
      
      console.log("📊 언어별 문안 통계:", stats)
      return stats
      
    } catch (error) {
      console.error('문안 통계 조회 실패:', error)
      return {}
    }
  }
}

// 싱글톤 인스턴스
export const pdfDatabaseService = new PDFDatabaseService()
