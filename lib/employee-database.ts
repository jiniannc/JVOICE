import { getEnvValue } from "./env-config"

export interface Employee {
  email: string
  name: string
  employeeId: string
  department: string
  position: string
  lineTeam?: string // 라인팀 정보
  isActive: boolean
  isInstructor: boolean // 교관 여부 (관리자도 포함)
  isAdmin: boolean // 관리자 여부
  roles: string[] // 역할 목록 (교관, 관리자 등)
  koreanEnglishGrade?: string // G열: 한영 자격
  koreanEnglishExpiry?: string // H열: 한영 유효기간
  japaneseGrade?: string // I열: 일본어 자격
  chineseGrade?: string // J열: 중국어 자격
}

export class EmployeeDatabase {
  private spreadsheetId =
    getEnvValue("NEXT_PUBLIC_EMPLOYEE_SPREADSHEET_ID") || "1F1xWL9dv0vAFvMfZaf05nO_vZKpuz82WIJLLBHWgaes"
  private employees: Employee[] = []
  private lastFetchTime = 0
  private cacheTimeout = 5 * 60 * 1000 // 5분 캐시

  async fetchEmployees(): Promise<Employee[]> {
    const now = Date.now()

    // 캐시가 유효하면 캐시된 데이터 반환
    if (this.employees.length > 0 && now - this.lastFetchTime < this.cacheTimeout) {
      console.log("캐시된 승무원 정보 사용")
      return this.employees
    }

    try {
      console.log("스프레드시트에서 승무원 정보 로딩 중...")

      const apiKey = getEnvValue("NEXT_PUBLIC_GOOGLE_API_KEY")
      const range = "직원목록!A2:K1000" // A~K열까지 (라인팀 정보 포함)

      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${range}?key=${apiKey}`

      console.log("API 호출:", url.replace(apiKey, "***API_KEY***"))

      const response = await fetch(url)

      if (!response.ok) {
        console.warn(`스프레드시트 접근 실패 (${response.status}):`, response.statusText)
        return this.getLocalEmployeeData()
      }

      const data = await response.json()
      const rows = data.values || []

      console.log(`스프레드시트에서 ${rows.length}행 데이터 로드`)

      this.employees = rows
        .map((row: string[], index: number) => {
          const activeValue = (row[5] || "Y").trim()
          const isActive = !row[5] || activeValue === "Y" || activeValue.includes("교관") || activeValue.includes("관리자")
          
          // F컬럼에서 역할 파싱 (쉼표로 구분된 여러 역할 지원)
          const roles = activeValue.split(/[,，]/).map(role => role.trim()).filter(role => role && role !== "Y")
          const isAdmin = roles.includes("관리자")
          // 관리자는 교관 기능도 포함하므로, 관리자이거나 교관이면 isInstructor = true
          const isInstructor = roles.includes("교관") || isAdmin
          
          const employee = {
            email: (row[0] || "").trim().toLowerCase(),
            name: (row[1] || "").trim(),
            employeeId: (row[2] || "").trim(),
            department: (row[3] || "").trim(),
            position: (row[4] || "").trim(), // E열 값만!
            lineTeam: (row[10] || "").trim(), // K열: 라인팀 정보
            isActive,
            isInstructor, // 교관 여부 (관리자도 포함)
            isAdmin, // 관리자 여부
            roles, // 역할 목록
            koreanEnglishGrade: (row[6] || "").trim(), // G열: 한영 자격
            koreanEnglishExpiry: (row[7] || "").trim(), // H열: 한영 유효기간
            japaneseGrade: (row[8] || "").trim(), // I열: 일본어 자격
            chineseGrade: (row[9] || "").trim(), // J열: 중국어 자격
          }
          
          // 유대권 직원 데이터 디버깅
          if (employee.email === 'dkyou@jinair.com' || employee.name.includes('유대권')) {
            console.log('🔍 유대권 직원 원본 데이터:', {
              row: row,
              employee: employee
            })
          }
          // 유효성 검사
          if (!employee.email || !employee.name || !employee.employeeId) {
            console.warn(`${index + 2}행 데이터 불완전:`, employee)
            return null
          }
          return employee
        })
        .filter((emp: Employee): emp is Employee => emp !== null && emp.isActive)

      this.lastFetchTime = now

      // 로컬 스토리지에 백업 저장 (클라이언트에서만)
      if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
        localStorage.setItem(
          "employeeDatabase",
          JSON.stringify({
            employees: this.employees,
            timestamp: now,
          }),
        )
      }

      console.log(`✅ 승무원 정보 ${this.employees.length}명 로드 완료`)
      return this.employees
    } catch (error) {
      console.error("승무원 정보 로딩 실패:", error)
      return this.getLocalEmployeeData()
    }
  }

  private getLocalEmployeeData(): Employee[] {
    try {
      if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
        const stored = localStorage.getItem("employeeDatabase")
        if (stored) {
          const { employees, timestamp } = JSON.parse(stored)
          const now = Date.now()
          if (Array.isArray(employees) && now - timestamp < this.cacheTimeout) {
            console.log("로컬 데이터에서 승무원 정보 로드")
            return employees
          }
        }
      }
    } catch (error) {
      console.warn("로컬 데이터 로딩 실패:", error)
    }
    // 기본 테스트 데이터 사용
    console.warn("기본 테스트 데이터 사용")
    return [
      {
        email: "kim.seungmu@jinair.com",
        name: "김승무",
        employeeId: "100001",
        department: "객실승무팀",
        position: "A10",
        isActive: true,
        isInstructor: false,
        isAdmin: false,
        roles: [],
      },
      {
        email: "park.hanggong@jinair.com",
        name: "박항공",
        employeeId: "100002",
        department: "운항팀",
        position: "B20",
        isActive: true,
        isInstructor: false,
        isAdmin: false,
        roles: [],
      },
      {
        email: "test@gmail.com",
        name: "테스트",
        employeeId: "999999",
        department: "테스트팀",
        position: "T99",
        isActive: true,
        isInstructor: false,
        isAdmin: false,
        roles: [],
      },
    ]
  }

  async findEmployeeByEmail(email: string): Promise<Employee | null> {
    const employees = await this.fetchEmployees()
    const normalizedEmail = email.toLowerCase().trim()

    const found = employees.find((emp) => emp.email === normalizedEmail)

    if (found) {
      console.log("✅ 승무원 정보 찾음:", found.name, found.employeeId, "역할:", found.roles)
    } else {
      console.warn("❌ 등록되지 않은 이메일:", email)
      console.log(
        "등록된 이메일 목록:",
        employees.map((emp) => emp.email),
      )
    }

    return found || null
  }

  async getAllEmployees(): Promise<Employee[]> {
    return await this.fetchEmployees()
  }

  // 관리자용: 승무원 정보 새로고침
  async refreshEmployeeData(): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      this.employees = []
      this.lastFetchTime = 0

      const employees = await this.fetchEmployees()

      return {
        success: true,
        count: employees.length,
      }
    } catch (error) {
      return {
        success: false,
        count: 0,
        error: error instanceof Error ? error.message : "알 수 없는 오류",
      }
    }
  }
}

export const employeeDB = new EmployeeDatabase()
