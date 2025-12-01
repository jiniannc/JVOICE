import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/database"

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

    // 이메일로 사용자 찾기
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        employeeId: true,
        name: true,
        department: true
      }
    })

    // 로그인 기록을 DB에 저장
    const loginLog = await prisma.loginLog.create({
      data: {
        userId: user?.id,
        email,
        name: user?.name || name,
        employeeId: user?.employeeId,
        department: user?.department,
        loginTime: new Date(),
        ipAddress,
        userAgent,
        loginMethod,
        success,
        errorMessage
      }
    })

    console.log(`✅ [Login Log API] 로그인 기록 저장 완료: ${email} (${success ? '성공' : '실패'})`)

    return NextResponse.json({ 
      success: true, 
      logId: loginLog.id 
    })
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
    const limit = parseInt(searchParams.get("limit") || "20")
    
    console.log("📋 [Login Log API] 검색 파라미터:", { email, startDate, endDate, page, limit })

    // 필터 조건 구성
    const where: any = {}

    if (email) {
      where.email = {
        contains: email,
        mode: 'insensitive'
      }
    }

    if (startDate || endDate) {
      where.loginTime = {}
      if (startDate) {
        where.loginTime.gte = new Date(startDate)
      }
      if (endDate) {
        where.loginTime.lte = new Date(endDate)
      }
    }

    // 전체 레코드 수 조회
    const totalRecords = await prisma.loginLog.count({ where })

    // 페이지네이션 계산
    const totalPages = Math.ceil(totalRecords / limit)
    const offset = (page - 1) * limit

    // DB에서 로그인 기록 조회
    const logs = await prisma.loginLog.findMany({
      where,
      orderBy: {
        loginTime: 'desc'
      },
      skip: offset,
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        employeeId: true,
        department: true,
        loginTime: true,
        ipAddress: true,
        userAgent: true,
        loginMethod: true,
        success: true,
        errorMessage: true
      }
    })

    console.log("📊 [Login Log API] 조회된 로그 개수:", logs.length, "/ 전체:", totalRecords)
    console.log("📄 [Login Log API] 페이지네이션:", { page, limit, totalPages })
    
    return NextResponse.json({
      logs,
      total: logs.length,
      totalRecords,
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