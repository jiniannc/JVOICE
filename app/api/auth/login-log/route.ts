import { type NextRequest, NextResponse } from "next/server"
import { EmployeeDatabase } from "@/lib/employee-database"

interface LoginLog {
  id: string
  email: string
  name: string
  employeeId?: string
  department?: string
  loginTime: string
  ipAddress?: string
  userAgent?: string
  loginMethod: "google" | "workspace" | "test"
  success: boolean
  errorMessage?: string
}

// 간단한 파일 잠금을 위한 Map
const fileLocks = new Map<string, Promise<any>>()

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Login Log API] POST 요청 받음")
    const body = await request.json()
    const { email, name, loginMethod, success, errorMessage } = body
    
    console.log("📝 [Login Log API] 로그인 데이터:", { email, name, loginMethod, success })

    // IP 주소와 User-Agent 가져오기
    const ipAddress = request.headers.get("x-forwarded-for") || 
                     request.headers.get("x-real-ip") || 
                     "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"

    // 직원 정보 조회
    const employeeDB = new EmployeeDatabase()
    const employee = await employeeDB.findEmployeeByEmail(email)
    
    const loginLog: LoginLog = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      email,
      name: employee?.name || name,
      employeeId: employee?.employeeId,
      department: employee?.department,
      loginTime: new Date().toISOString(),
      ipAddress,
      userAgent,
      loginMethod,
      success,
      errorMessage
    }

    // 파일 잠금을 사용하여 동시 요청 방지
    const lockKey = "login-history.json"
    const existingLock = fileLocks.get(lockKey)
    
    if (existingLock) {
      console.log("⏳ [Login Log API] 다른 요청이 진행 중입니다. 대기...")
      await existingLock
    }

    const lockPromise = (async () => {
      try {
        // 로그인 기록을 Dropbox에 저장
        const dropboxService = await import("@/lib/dropbox-service")
        const dropbox = dropboxService.default
        
        // 기존 로그 파일 읽기 (더 안전한 방식)
        let existingLogs: LoginLog[] = []
        try {
          console.log("📁 [Login Log API] 기존 로그 파일 읽기 시도")
          const logFileContent = await dropbox.download({ path: "/logs/login-history.json" })
          
          console.log("📄 [Login Log API] 다운로드된 원본 내용:", logFileContent)
          console.log("📄 [Login Log API] 원본 내용 타입:", typeof logFileContent)
          console.log("📄 [Login Log API] 원본 내용 길이:", logFileContent?.length || 0)
          
          // JSON 파싱 전에 유효성 검사
          if (logFileContent && typeof logFileContent === 'string' && logFileContent.trim()) {
            console.log("🔍 [Login Log API] JSON 파싱 시도...")
            const parsed = JSON.parse(logFileContent)
            console.log("🔍 [Login Log API] 파싱 결과:", parsed)
            console.log("🔍 [Login Log API] 파싱 결과 타입:", typeof parsed)
            console.log("�� [Login Log API] 배열인가?", Array.isArray(parsed))
            
            if (Array.isArray(parsed)) {
              existingLogs = parsed
              console.log("✅ [Login Log API] 기존 로그 파일 읽기 성공, 기존 로그 개수:", existingLogs.length)
            } else {
              console.warn("⚠️ [Login Log API] 로그 파일이 배열이 아닙니다. 빈 배열로 시작합니다.")
              existingLogs = []
            }
          } else {
            console.log("📝 [Login Log API] 로그 파일이 비어있어 새로 생성합니다.")
            existingLogs = []
          }
        } catch (error) {
          console.warn("⚠️ [Login Log API] 로그 파일 읽기 실패, 새로 생성합니다:", error)
          console.warn("⚠️ [Login Log API] 에러 상세:", error instanceof Error ? error.message : String(error))
          existingLogs = []
        }

        // 새 로그 추가 (최대 1000개 유지)
        existingLogs.unshift(loginLog)
        if (existingLogs.length > 1000) {
          existingLogs = existingLogs.slice(0, 1000)
        }

        // Dropbox에 저장 (덮어쓰기 모드로 중복 파일 방지)
        console.log("💾 [Login Log API] Dropbox에 로그 파일 저장 시도 (총 로그 개수:", existingLogs.length, ")")
        
        const jsonContent = JSON.stringify(existingLogs, null, 2)
        console.log("💾 [Login Log API] 저장할 JSON 내용 길이:", jsonContent.length)
        console.log("💾 [Login Log API] 저장할 JSON 내용 미리보기:", jsonContent.substring(0, 200) + "...")
        
        await dropbox.overwrite({
          path: "/logs/login-history.json",
          content: Buffer.from(jsonContent, 'utf-8')
        })

        console.log(`✅ [Login Log API] 로그인 기록 저장 완료: ${email} (${success ? '성공' : '실패'}), 총 로그 개수: ${existingLogs.length}`)

        return { success: true, totalLogs: existingLogs.length }
      } finally {
        // 잠금 해제
        fileLocks.delete(lockKey)
      }
    })()

    fileLocks.set(lockKey, lockPromise)
    const result = await lockPromise

    return NextResponse.json(result)
  } catch (error) {
    console.error("❌ 로그인 기록 저장 실패:", error)
    return NextResponse.json(
      { success: false, error: "로그인 기록 저장 실패" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Login Log API] GET 요청 받음")
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20") // 기본값을 20개로 변경
    
    console.log("📋 [Login Log API] 검색 파라미터:", { email, startDate, endDate, page, limit })

    // Dropbox에서 로그 파일 읽기
    const dropboxService = await import("@/lib/dropbox-service")
    const dropbox = dropboxService.default
    
    console.log("📁 [Login Log API] Dropbox에서 로그 파일 읽기 시도")
    
    let logs: LoginLog[] = []
    try {
      const logFileContent = await dropbox.download({ path: "/logs/login-history.json" })
      
      // JSON 파싱 전에 유효성 검사
      if (logFileContent && typeof logFileContent === 'string' && logFileContent.trim()) {
        const parsed = JSON.parse(logFileContent)
        if (Array.isArray(parsed)) {
          logs = parsed
          console.log("✅ [Login Log API] 로그 파일 읽기 성공, 로그 개수:", logs.length)
        } else {
          console.warn("⚠️ [Login Log API] 로그 파일이 배열이 아닙니다.")
          logs = []
        }
      } else {
        console.log("📝 [Login Log API] 로그 파일이 비어있습니다.")
        logs = []
      }
    } catch (error) {
      console.log("❌ [Login Log API] 로그 파일을 찾을 수 없습니다:", error)
      return NextResponse.json({ logs: [], total: 0, totalRecords: 0 })
    }

    // 필터링
    let filteredLogs = logs

    if (email) {
      filteredLogs = filteredLogs.filter(log => 
        log.email.toLowerCase().includes(email.toLowerCase())
      )
    }

    if (startDate) {
      filteredLogs = filteredLogs.filter(log => 
        new Date(log.loginTime) >= new Date(startDate)
      )
    }

    if (endDate) {
      filteredLogs = filteredLogs.filter(log => 
        new Date(log.loginTime) <= new Date(endDate)
      )
    }

    // 최신순 정렬
    filteredLogs = filteredLogs
      .sort((a, b) => new Date(b.loginTime).getTime() - new Date(a.loginTime).getTime())

    // 페이지네이션 계산
    const totalRecords = filteredLogs.length
    const totalPages = Math.ceil(totalRecords / limit)
    const offset = (page - 1) * limit
    const paginatedLogs = filteredLogs.slice(offset, offset + limit)

    console.log("📊 [Login Log API] 필터링된 로그 개수:", totalRecords)
    console.log("📄 [Login Log API] 페이지네이션:", { page, limit, totalPages, currentPageRecords: paginatedLogs.length })
    
    return NextResponse.json({
      logs: paginatedLogs,
      total: paginatedLogs.length,
      totalRecords: totalRecords,
      pagination: {
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    })
  } catch (error) {
    console.error("❌ 로그인 기록 조회 실패:", error)
    return NextResponse.json(
      { success: false, error: "로그인 기록 조회 실패" },
      { status: 500 }
    )
  }
} 