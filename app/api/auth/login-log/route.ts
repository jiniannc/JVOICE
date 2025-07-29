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

    // 로그인 기록을 Dropbox에 저장
    const dropboxService = await import("@/lib/dropbox-service")
    const dropbox = dropboxService.default
    
    // 기존 로그 파일 읽기
    let existingLogs: LoginLog[] = []
    try {
      console.log("📁 [Login Log API] 기존 로그 파일 읽기 시도")
      const logFileContent = await dropbox.download({ path: "/logs/login-history.json" })
      existingLogs = JSON.parse(logFileContent)
      console.log("✅ [Login Log API] 기존 로그 파일 읽기 성공, 기존 로그 개수:", existingLogs.length)
    } catch (error) {
      // 파일이 없으면 빈 배열로 시작
      console.log("📝 [Login Log API] 로그 파일이 없어 새로 생성합니다.")
    }

    // 새 로그 추가 (최대 1000개 유지)
    existingLogs.unshift(loginLog)
    if (existingLogs.length > 1000) {
      existingLogs = existingLogs.slice(0, 1000)
    }

    // Dropbox에 저장 (덮어쓰기 모드로 중복 파일 방지)
    console.log("💾 [Login Log API] Dropbox에 로그 파일 저장 시도 (덮어쓰기)")
    await dropbox.overwrite({
      path: "/logs/login-history.json",
      content: Buffer.from(JSON.stringify(existingLogs, null, 2), 'utf-8')
    })

    console.log(`✅ [Login Log API] 로그인 기록 저장 완료: ${email} (${success ? '성공' : '실패'})`)

    return NextResponse.json({ success: true })
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
    const limit = parseInt(searchParams.get("limit") || "100")
    
    console.log("📋 [Login Log API] 검색 파라미터:", { email, startDate, endDate, limit })

    // Dropbox에서 로그 파일 읽기
    const dropboxService = await import("@/lib/dropbox-service")
    const dropbox = dropboxService.default
    
    console.log("📁 [Login Log API] Dropbox에서 로그 파일 읽기 시도")
    
    let logs: LoginLog[] = []
    try {
      logs = await dropbox.download({ path: "/logs/login-history.json" })
      console.log("✅ [Login Log API] 로그 파일 읽기 성공, 로그 개수:", logs.length)
    } catch (error) {
      console.log("❌ [Login Log API] 로그 파일을 찾을 수 없습니다:", error)
      return NextResponse.json({ logs: [], total: 0 })
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

    // 최신순 정렬 및 제한
    filteredLogs = filteredLogs
      .sort((a, b) => new Date(b.loginTime).getTime() - new Date(a.loginTime).getTime())
      .slice(0, limit)

    console.log("📊 [Login Log API] 필터링된 로그 개수:", filteredLogs.length)
    
    return NextResponse.json({
      logs: filteredLogs,
      total: filteredLogs.length,
      totalRecords: logs.length
    })
  } catch (error) {
    console.error("❌ 로그인 기록 조회 실패:", error)
    return NextResponse.json(
      { success: false, error: "로그인 기록 조회 실패" },
      { status: 500 }
    )
  }
} 