"use client"

export interface EmployeeInfo {
  email: string
  name: string
  employeeId: string
  department: string
  position: string
  isActive: boolean
}

export class EmployeeService {
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
        scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
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

  async getEmployeeByEmail(email: string): Promise<EmployeeInfo | null> {
    if (!this.isInitialized) await this.initialize()

    try {
      const response = await this.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: "A2:F1000", // 헤더 제외하고 데이터만 (이메일, 이름, 사번, 부서, 직급, 활성상태)
      })

      const rows = response.result.values || []

      for (const row of rows) {
        if (row[0] && row[0].toLowerCase() === email.toLowerCase()) {
          return {
            email: row[0],
            name: row[1] || "",
            employeeId: row[2] || "",
            department: row[3] || "",
            position: row[4] || "",
            isActive: row[5] !== "비활성" && row[5] !== "false",
          }
        }
      }

      return null
    } catch (error) {
      console.error("직원 정보 조회 실패:", error)
      return null
    }
  }

  async getAllEmployees(): Promise<EmployeeInfo[]> {
    if (!this.isInitialized) await this.initialize()

    try {
      const response = await this.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: "A2:F1000",
      })

      const rows = response.result.values || []
      return rows
        .filter((row) => row[0]) // 이메일이 있는 행만
        .map((row) => ({
          email: row[0],
          name: row[1] || "",
          employeeId: row[2] || "",
          department: row[3] || "",
          position: row[4] || "",
          isActive: row[5] !== "비활성" && row[5] !== "false",
        }))
        .filter((emp) => emp.isActive) // 활성 직원만
    } catch (error) {
      console.error("직원 목록 조회 실패:", error)
      return []
    }
  }
}

// 싱글톤 인스턴스
export const employeeService = new EmployeeService(
  process.env.NEXT_PUBLIC_EMPLOYEE_SPREADSHEET_ID || "1F1xWL9dv0vAFvMfZaf05nO_vZKpuz82WIJLLBHWgaes",
)
