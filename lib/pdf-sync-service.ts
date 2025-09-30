import dropboxService from "./dropbox-service"
import { getEnvValue } from "./env-config"

export interface PDFFile {
  id: string
  name: string
  language: string
  number: number
  url: string
  lastModified: string
}

export class PDFSyncService {
  private syncedFiles: PDFFile[] = []
  private lastSyncTime: string | null = null
  private scriptCache: { [key: string]: number[] } = {} // 스크립트 선택 결과 캐시

  constructor() {
    this.lastSyncTime = typeof window !== "undefined" ? localStorage.getItem("lastPDFSync") : null
    this.loadFromLocalStorage()
    
    // PDF 캐시 무효화 이벤트 리스너 등록 (브라우저 환경에서만)
    if (typeof window !== 'undefined') {
      window.addEventListener('pdfCacheInvalidate', this.handleCacheInvalidate.bind(this))
    }
  }

  // 캐시 무효화 이벤트 핸들러
  private handleCacheInvalidate = (event: CustomEvent) => {
    const { language, scriptNumber, action } = event.detail
    console.log(`🗑️ PDF Sync 캐시 무효화 이벤트 수신: ${language} 문안 ${scriptNumber}번 (${action})`)
    
    // 해당 언어의 모든 캐시 초기화
    const keysToRemove = Object.keys(this.scriptCache).filter(key => key.startsWith(language))
    keysToRemove.forEach(key => {
      delete this.scriptCache[key]
    })
    
    console.log(`🗑️ PDF Sync ${keysToRemove.length}개의 ${language} 언어 캐시 항목 제거됨`)
  }

  private loadFromLocalStorage() {
    try {
      const stored = typeof window !== "undefined" ? localStorage.getItem("pdfSyncedFiles") : null
      if (stored) {
        this.syncedFiles = JSON.parse(stored)
      }
    } catch (error) {
      console.error("로컬 스토리지 로드 실패:", error)
    }
  }

  private saveToLocalStorage() {
    try {
      localStorage.setItem("pdfSyncedFiles", JSON.stringify(this.syncedFiles))
      if (this.lastSyncTime) {
        localStorage.setItem("pdfLastSyncTime", this.lastSyncTime)
      }
    } catch (error) {
      console.error("로컬 스토리지 저장 실패:", error)
    }
  }

  async syncPDFFiles(): Promise<void> {
    console.log("🔄 PDF 파일 동기화 시작...")

    try {
      // API 라우트를 통해 Dropbox에서 PDF 파일 목록 가져오기
      const response = await fetch('/api/dropbox-list?path=/scripts')
      
      if (!response.ok) {
        throw new Error(`Dropbox API 호출 실패: ${response.status}`)
      }
      
      const data = await response.json()
      const files = data.entries || []
      const pdfFiles = files.filter((file: any) => 
        file[".tag"] === "file" && 
        file.name.toLowerCase().endsWith(".pdf")
      )

      console.log(`📄 총 ${pdfFiles.length}개의 PDF 파일 발견`)
      console.log(`📋 발견된 PDF 파일 목록:`, pdfFiles.map((f: any) => f.name))

      // 파일명 파싱하여 언어와 번호 추출
      const parsedFiles: PDFFile[] = []
      
      for (const file of pdfFiles) {
        console.log(`🔍 파일 분석 중: ${file.name}`)
        const parsed = this.parseFileName(file.name)
        
        if (parsed.language !== "unknown" && parsed.number > 0) {
          const pdfFile: PDFFile = {
            id: file.id,
            name: file.name,
            language: parsed.language,
            number: parsed.number,
            url: `/api/dropbox-share`, // 공유 링크는 필요할 때 생성
            lastModified: file.client_modified || new Date().toISOString(),
          }
          parsedFiles.push(pdfFile)
          console.log(`✅ 파싱 성공: ${file.name} → ${parsed.language} ${parsed.number}번`)
        } else {
          console.log(`❌ 파싱 실패: ${file.name} (언어: ${parsed.language}, 번호: ${parsed.number})`)
        }
      }

      this.syncedFiles = parsedFiles
      this.lastSyncTime = new Date().toISOString()
      this.saveToLocalStorage()

      console.log("✅ PDF 파일 동기화 완료:", parsedFiles.length, "개 파일")
      
      // 언어별 통계 출력
      const stats = parsedFiles.reduce((acc, file) => {
        acc[file.language] = (acc[file.language] || 0) + 1
        return acc
      }, {} as { [key: string]: number })
      
      console.log("📊 언어별 파일 통계:", stats)
    } catch (error) {
      console.error("❌ PDF 파일 동기화 실패:", error)
      throw error
    }
  }

  getSyncedFiles(): PDFFile[] {
    return this.syncedFiles
  }

  getLastSyncTime(): string | null {
    return this.lastSyncTime
  }

  // 스크립트 캐시 초기화 (언어 변경 시 호출)
  clearScriptCache(): void {
    this.scriptCache = {}
    console.log("🗑️ 스크립트 캐시 초기화됨")
  }

  getAvailableScripts(language: string): number[] {
    console.log(`🔍 getAvailableScripts 호출: language="${language}"`)
    console.log(`📋 syncedFiles 총 개수: ${this.syncedFiles.length}`)
    console.log(`📋 syncedFiles 언어별 분포:`, this.syncedFiles.reduce((acc, file) => {
      acc[file.language] = (acc[file.language] || 0) + 1
      return acc
    }, {} as { [key: string]: number }))
    
    const files = this.syncedFiles.filter((file) => file.language === language)
    console.log(`🔍 필터링된 파일 개수: ${files.length}`)
    
    const numbers = files.map((file) => file.number).sort((a, b) => a - b)
    const uniqueNumbers = [...new Set(numbers)] // 중복 제거
    
    console.log(`📋 사용 가능한 스크립트 번호:`, uniqueNumbers)
    return uniqueNumbers
  }

  getRandomScripts(language: string, count: number): number[] {
    // 캐시 키 생성
    const cacheKey = `${language}-${count}`
    
    // 캐시된 결과가 있으면 반환
    if (this.scriptCache[cacheKey]) {
      console.log(`📋 [캐시] ${language} 언어 스크립트 캐시 사용:`, this.scriptCache[cacheKey])
      return this.scriptCache[cacheKey]
    }
    
    // 실제 동기화된 파일에서 해당 언어의 스크립트 번호들을 가져옴
    const availableScripts = this.getAvailableScripts(language)
    
    console.log(`📋 ${language} 언어 사용 가능한 스크립트:`, availableScripts)
    
    if (availableScripts.length === 0) {
      console.warn(`⚠️ ${language} 언어의 스크립트가 없습니다. 하드코딩된 범위를 사용합니다.`)
      
      // 백업: 하드코딩된 범위 사용
      const scriptRanges: { [key: string]: number[] } = {
        "korean-english": Array.from({ length: 50 }, (_, i) => i + 1), // 1-50
        japanese: Array.from({ length: 30 }, (_, i) => i + 1), // 1-30
        chinese: Array.from({ length: 25 }, (_, i) => i + 1), // 1-25
      }
      
      const fallbackScripts = scriptRanges[language] || []
      const result = this.selectScriptsWithRequiredNumbers(fallbackScripts, count, language)
      this.scriptCache[cacheKey] = result
      return result
    }

    // 실제 파일에서 2번 또는 10번이 포함되도록 선택
    const result = this.selectScriptsWithRequiredNumbers(availableScripts, count, language)
    this.scriptCache[cacheKey] = result
    return result
  }

  private selectScriptsWithRequiredNumbers(availableScripts: number[], count: number, language?: string): number[] {
    // 1번과 9번이 사용 가능한지 확인
    const hasScript1 = availableScripts.includes(1)
    const hasScript9 = availableScripts.includes(9)
    
    console.log(`🔍 1번 문안 사용 가능: ${hasScript1}, 9번 문안 사용 가능: ${hasScript9}`)
    
    // 1번과 9번 중 하나를 랜덤하게 선택 (둘 다 있으면 랜덤, 하나만 있으면 그걸 사용)
    let requiredScript: number | null = null
    if (hasScript1 && hasScript9) {
      // 둘 다 있으면 랜덤하게 하나 선택
      requiredScript = Math.random() > 0.5 ? 1 : 9
    } else if (hasScript1) {
      requiredScript = 1
    } else if (hasScript9) {
      requiredScript = 9
    }
    
    console.log(`🎯 필수 포함 문안: ${requiredScript}번`)
    
    // 필수 문안을 제외한 나머지 문안들
    const remainingScripts = availableScripts.filter(script => script !== 1 && script !== 9)
    
    // 나머지에서 랜덤하게 (count - 1)개 선택
    const shuffled = [...remainingScripts].sort(() => 0.5 - Math.random())
    const selectedRemaining = shuffled.slice(0, Math.min(count - 1, shuffled.length))
    
    // 필수 문안과 선택된 문안들을 합치고 정렬
    let finalScripts: number[]
    if (requiredScript !== null) {
      finalScripts = [requiredScript, ...selectedRemaining]
    } else {
      // 1번과 9번이 모두 없는 경우 기존 로직 사용
      const shuffled = [...availableScripts].sort(() => 0.5 - Math.random())
      finalScripts = shuffled.slice(0, Math.min(count, shuffled.length))
    }
    
    // 번호 순서대로 정렬
    const sortedScripts = finalScripts.sort((a, b) => a - b)
    
    console.log(`🎯 ${language || '알 수 없는'} 언어 선택된 스크립트 (순서대로, 필수 포함):`, sortedScripts)
    return sortedScripts
  }

  async getPDFUrl(language: string, scriptNumber: number, mode?: "korean" | "english"): Promise<string> {
    // 실제 동기화된 파일에서 해당 스크립트의 URL을 찾음
    const file = this.syncedFiles.find(
      (f) => f.language === language && f.number === scriptNumber
    )
    
    if (file) {
      console.log(`📄 PDF URL 찾음: ${file.name}`)
      
      try {
        // Dropbox 공유 링크 생성
        const response = await fetch('/api/dropbox-share', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            path: `/scripts/${file.name}`
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.url) {
            console.log(`🔓 Dropbox 공유 URL 생성: ${data.url}`)
            return data.url
          }
        }
      } catch (error) {
        console.error('Dropbox 공유 링크 생성 실패:', error)
      }
    }
    
    // 파일을 찾지 못한 경우 플레이스홀더 반환
    console.warn(`⚠️ PDF 파일을 찾을 수 없음: ${language} ${scriptNumber}번`)
    const baseUrl = "/placeholder.svg"
    const params = new URLSearchParams({
      height: "800",
      width: "600",
      text: `${language.toUpperCase()}_Script_${scriptNumber}${mode ? `_${mode}` : ""}`,
    })

    return `${baseUrl}?${params.toString()}`
  }

  private parseFileName(fileName: string): { language: string; number: number } {
    // 파일명 패턴: "언어_문안번호.pdf" 형식
    const patterns = [
      // 한영 패턴
      /^(한영|한국어영어|korean-english)[-_]문안(\d+)\.pdf$/i,
      /^문안(\d+)[-_](한영|한국어영어|korean-english)\.pdf$/i,
      
      // 일본어 패턴
      /^(일본어|japanese|jp)[-_]문안(\d+)\.pdf$/i,
      /^문안(\d+)[-_](일본어|japanese|jp)\.pdf$/i,
      
      // 중국어 패턴
      /^(중국어|chinese|cn)[-_]문안(\d+)\.pdf$/i,
      /^문안(\d+)[-_](중국어|chinese|cn)\.pdf$/i,
      
      // 기존 패턴도 유지 (하위 호환성)
      /^(korean-english|한영|한국어영어)[-_](\d+)\.pdf$/i,
      /^(japanese|일본어|jp)[-_](\d+)\.pdf$/i,
      /^(chinese|중국어|cn)[-_](\d+)\.pdf$/i,
      /^(\d+)[-_](korean-english|한영|한국어영어)\.pdf$/i,
      /^(\d+)[-_](japanese|일본어|jp)\.pdf$/i,
      /^(\d+)[-_](chinese|중국어|cn)\.pdf$/i,
    ]

    for (const pattern of patterns) {
      const match = fileName.match(pattern)
      if (match) {
        console.log(`🔍 패턴 매치 성공: ${fileName} → 패턴: ${pattern}`)
        let language = ""
        let number = 0

        if (match[1] && isNaN(Number(match[1]))) {
          // 언어가 첫 번째 그룹
          const lang = match[1].toLowerCase()
          console.log(`🔍 첫 번째 그룹이 언어: ${lang}`)
          if (lang.includes("korean") || lang.includes("한영") || lang.includes("한국어영어")) {
            language = "korean-english"
          } else if (lang.includes("japanese") || lang.includes("일본어") || lang === "jp") {
            language = "japanese"
          } else if (lang.includes("chinese") || lang.includes("중국어") || lang === "cn") {
            language = "chinese"
          }
          number = Number.parseInt(match[2])
        } else {
          // 번호가 첫 번째 그룹
          number = Number.parseInt(match[1])
          const lang = match[2].toLowerCase()
          console.log(`🔍 첫 번째 그룹이 번호: ${number}, 두 번째 그룹이 언어: ${lang}`)
          if (lang.includes("korean") || lang.includes("한영") || lang.includes("한국어영어")) {
            language = "korean-english"
          } else if (lang.includes("japanese") || lang.includes("일본어") || lang === "jp") {
            language = "japanese"
          } else if (lang.includes("chinese") || lang.includes("중국어") || lang === "cn") {
            language = "chinese"
          }
        }

        if (language && number > 0) {
          console.log(`✅ 파일명 파싱 성공: ${fileName} → 언어: ${language}, 번호: ${number}`)
          return { language, number }
        } else {
          console.log(`❌ 언어 또는 번호 추출 실패: 언어=${language}, 번호=${number}`)
        }
      }
    }

    console.log(`❌ 파일명 파싱 실패: ${fileName} (모든 패턴과 매치되지 않음)`)
    return { language: "unknown", number: 0 }
  }

  private shuffleArray<T>(array: T[]): T[] {
    const result = [...array]
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
  }

  private seededShuffle<T>(array: T[], seed: number): T[] {
    const result = [...array]
    let currentSeed = seed

    for (let i = result.length - 1; i > 0; i--) {
      currentSeed = this.seededRandom(currentSeed)
      const j = Math.floor((currentSeed / 2147483647) * (i + 1))
      ;[result[i], result[j]] = [result[j], result[i]]
    }

    return result
  }

  private hashCode(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // 32비트 정수로 변환
    }
    return Math.abs(hash)
  }

  private seededRandom(seed: number): number {
    const x = Math.sin(seed) * 10000
    return Math.floor((x - Math.floor(x)) * 2147483647)
  }
}

// 싱글톤 인스턴스
export const pdfSyncService = new PDFSyncService()
