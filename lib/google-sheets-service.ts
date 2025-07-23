"use client"

export interface SheetData {
  번호: number
  사번: string
  이름: string
  구분: string
  언어: string
  총점: number
  결과: "Pass" | "Fail"
  Comment: string
  평가상세: string // JSON 형태로 저장
  평가일시: string
}

export class GoogleSheetsService {
  private gapi: any = null
  private isInitialized = false
  private spreadsheetId: string

  constructor(spreadsheetId: string) {
    this.spreadsheetId = spreadsheetId
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    // Google API 스크립트 로드
    await this.loadGoogleAPI()

    await this.gapi.load("client:auth2", async () => {
      await this.gapi.client.init({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
        clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
        scope: "https://www.googleapis.com/auth/spreadsheets",
      })

      this.isInitialized = true
    })
  }

  private loadGoogleAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window !== "undefined" && (window as any).gapi) {
        this.gapi = (window as any).gapi
        resolve()
        return
      }

      const script = document.createElement("script")
      script.src = "https://apis.google.com/js/api.js"
      script.onload = () => {
        this.gapi = (window as any).gapi
        resolve()
      }
      script.onerror = reject
      document.head.appendChild(script)
    })
  }

  async addEvaluationResult(data: SheetData): Promise<boolean> {
    if (!this.isInitialized) await this.initialize()

    try {
      // 다음 행 번호 찾기
      const response = await this.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: "A:A",
      })

      const nextRow = (response.result.values?.length || 1) + 1

      // 데이터 추가
      const values = [
        [
          data.번호,
          data.사번,
          data.이름,
          data.구분,
          data.언어,
          data.총점,
          data.결과,
          data.Comment,
          data.평가상세,
          data.평가일시,
        ],
      ]

      await this.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `A${nextRow}:J${nextRow}`,
        valueInputOption: "RAW",
        resource: { values },
      })

      return true
    } catch (error) {
      console.error("스프레드시트 업데이트 실패:", error)
      return false
    }
  }

  async getEvaluationResults(): Promise<SheetData[]> {
    if (!this.isInitialized) await this.initialize()

    try {
      const response = await this.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: "A2:J1000", // 헤더 제외하고 데이터만
      })

      const rows = response.result.values || []
      return rows.map((row: any[], index: number) => ({
        번호: Number.parseInt(row[0]) || index + 1,
        사번: row[1] || "",
        이름: row[2] || "",
        구분: row[3] || "",
        언어: row[4] || "",
        총점: Number.parseInt(row[5]) || 0,
        결과: (row[6] as "Pass" | "Fail") || "Fail",
        Comment: row[7] || "",
        평가상세: row[8] || "{}",
        평가일시: row[9] || "",
      }))
    } catch (error) {
      console.error("스프레드시트 읽기 실패:", error)
      return []
    }
  }

  async updateEvaluationResult(rowIndex: number, data: Partial<SheetData>): Promise<boolean> {
    if (!this.isInitialized) await this.initialize()

    try {
      const values = [
        [
          data.번호,
          data.사번,
          data.이름,
          data.구분,
          data.언어,
          data.총점,
          data.결과,
          data.Comment,
          data.평가상세,
          data.평가일시,
        ],
      ]

      await this.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `A${rowIndex + 2}:J${rowIndex + 2}`, // +2는 헤더 고려
        valueInputOption: "RAW",
        resource: { values },
      })

      return true
    } catch (error) {
      console.error("스프레드시트 업데이트 실패:", error)
      return false
    }
  }
}

// 싱글톤 인스턴스
export const sheetsService = new GoogleSheetsService(
  "1u821kL8BFQb0Z0Y4YfpqDXw6f_geKmFe-QAw3gHeZts", // 제공된 스프레드시트 ID
)
