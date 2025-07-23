"use client"

export interface EmployeeInfo {
  email: string
  name: string
  employeeId: string
  department: string
  position: string
  isActive: boolean
}

export class EmployeeServiceFixed {
  private spreadsheetId: string
  private apiKey: string

  constructor(spreadsheetId: string) {
    this.spreadsheetId = spreadsheetId
    this.apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || ""
  }

  async getEmployeeByEmail(email: string): Promise<EmployeeInfo | null> {
    try {
      console.log(`🔍 직원 정보 조회: ${email}`)

      if (!this.apiKey) {
        console.error("❌ Google API 키가 설정되지 않았습니다.")
        return null
      }

      if (!this.spreadsheetId) {
        console.error("❌ 직원 스프레드시트 ID가 설정되지 않았습니다.")
        return null
      }

      // Google Sheets API 직접 호출
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/A2:F1000?key=${this.apiKey}`

      console.log(`📡 API 호출: ${url.replace(this.apiKey, "***API_KEY***")}`)

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ API 호출 실패 (${response.status}):`, errorText)

        if (response.status === 403) {
          throw new Error("스프레드시트 접근 권한이 없습니다. 공유 설정을 확인하세요.")
        } else if (response.status === 404) {
          throw new Error("스프레드시트를 찾을 수 없습니다. ID를 확인하세요.")
        } else {
          throw new Error(`API 호출 실패: ${response.status} ${response.statusText}`)
        }
      }

      const data = await response.json()
      console.log(`📋 스프레드시트 데이터 조회 완료: ${data.values?.length || 0}행`)

      const rows = data.values || []

      // 이메일로 직원 찾기
      for (const row of rows) {
        if (row[0] && row[0].toLowerCase() === email.toLowerCase()) {
          const employeeInfo: EmployeeInfo = {
            email: row[0],
            name: row[1] || "",
            employeeId: row[2] || "",
            department: row[3] || "",
            position: row[4] || "",
            isActive: row[5] !== "비활성" && row[5] !== "false",
          }

          console.log(`✅ 직원 정보 발견:`, employeeInfo)
          return employeeInfo
        }
      }

      console.log(`❌ 직원 정보 없음: ${email}`)
      return null
    } catch (error) {
      console.error("❌ 직원 정보 조회 실패:", error)
      return null
    }
  }

  async getAllEmployees(): Promise<EmployeeInfo[]> {
    try {
      if (!this.apiKey || !this.spreadsheetId) {
        return []
      }

      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/A2:F1000?key=${this.apiKey}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`API 호출 실패: ${response.status}`)
      }

      const data = await response.json()
      const rows = data.values || []

      return rows
        .filter((row: any[]) => row[0]) // 이메일이 있는 행만
        .map((row: any[]) => ({
          email: row[0],
          name: row[1] || "",
          employeeId: row[2] || "",
          department: row[3] || "",
          position: row[4] || "",
          isActive: row[5] !== "비활성" && row[5] !== "false",
        }))
        .filter((emp: EmployeeInfo) => emp.isActive) // 활성 직원만
    } catch (error) {
      console.error("직원 목록 조회 실패:", error)
      return []
    }
  }
}

// 싱글톤 인스턴스
export const employeeServiceFixed = new EmployeeServiceFixed(
  process.env.NEXT_PUBLIC_EMPLOYEE_SPREADSHEET_ID || "1F1xWL9dv0vAFvMfZaf05nO_vZKpuz82WIJLLBHWgaes",
)
