import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 [Test Login API] 테스트 로그인 요청 받음")

    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: "이메일이 필요합니다",
        },
        { status: 400 },
      )
    }

    console.log("🔍 [Test Login API] 테스트 로그인 시도:", email)

    // 테스트 계정 목록
    const testAccounts = [
      {
        email: "admin@jinair.com",
        name: "관리자",
        role: "관리자",
        isAdmin: true,
        employeeId: "ADMIN001",
        department: "시스템관리팀",
      },
      {
        email: "test@jinair.com",
        name: "테스트 승무원",
        role: "승무원",
        isAdmin: false,
        employeeId: "TEST001",
        department: "객실승무팀",
      },
      {
        email: "instructor@jinair.com",
        name: "평가 교관",
        role: "교관",
        isAdmin: false,
        employeeId: "INST001",
        department: "교육팀",
      },
      {
        email: "demo@jinair.com",
        name: "데모 사용자",
        role: "데모",
        isAdmin: false,
        employeeId: "DEMO001",
        department: "데모팀",
      },
    ]

    const testUser = testAccounts.find((account) => account.email.toLowerCase() === email.toLowerCase())

    if (!testUser) {
      console.log("❌ [Test Login API] 허용되지 않은 테스트 계정:", email)
      return NextResponse.json(
        {
          success: false,
          error: "허용되지 않은 테스트 계정입니다",
        },
        { status: 401 },
      )
    }

    // 사용자 정보 생성
    const userData = {
      id: `test_${testUser.employeeId}`,
      email: testUser.email,
      name: testUser.name,
      picture: "/placeholder.svg?height=48&width=48&text=User",
      employeeId: testUser.employeeId,
      department: testUser.department,
      role: testUser.role,
      isTestAccount: true,
      isAdmin: testUser.isAdmin,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24시간
    }

    // 쿠키에 사용자 정보 저장 (응답 객체 사용)
    const res = NextResponse.json({ success: true, user: userData })

    res.cookies.set("auth_user", JSON.stringify(userData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60,
      path: "/",
    })

    res.cookies.set("auth_status", "authenticated", {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60,
      path: "/",
    })

    console.log("✅ [Test Login API] 테스트 로그인 성공:", testUser.name)

    // 로그인 기록 저장
    try {
      await fetch(`${new URL(request.url).origin}/api/auth/login-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          name: testUser.name,
          loginMethod: 'test',
          success: true
        })
      })
    } catch (error) {
      console.error("로그인 기록 저장 실패:", error)
    }

    return res
  } catch (error) {
    console.error("❌ [Test Login API] 테스트 로그인 실패:", error)
    return NextResponse.json(
      {
        success: false,
        error: "테스트 로그인 처리 중 오류가 발생했습니다",
      },
      { status: 500 },
    )
  }
}
