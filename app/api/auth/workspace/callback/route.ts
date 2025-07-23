import { type NextRequest, NextResponse } from "next/server"
import { employeeDB } from "@/lib/employee-database"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  if (error) {
    console.error("OAuth error:", error)
    return NextResponse.redirect(new URL(`/?error=${error}`, request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL("/?error=no_code", request.url))
  }

  // State 검증 (CSRF 방지)
  // 실제로는 세션에서 state를 확인해야 함

  try {
    // 1. 코드를 토큰으로 교환
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_WORKSPACE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_WORKSPACE_CLIENT_SECRET || "",
        code,
        grant_type: "authorization_code",
        redirect_uri: `${request.nextUrl.origin}/api/auth/workspace/callback`,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error("Token exchange failed:", errorData)
      throw new Error("Failed to exchange code for tokens")
    }

    const tokens = await tokenResponse.json()

    // 2. ID 토큰 검증
    const tokenInfoResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${tokens.id_token}`)

    if (!tokenInfoResponse.ok) {
      throw new Error("Invalid ID token")
    }

    const tokenInfo = await tokenInfoResponse.json()

    // 3. Workspace 도메인 검증
    const allowedDomains = ["jinair.com"] // 환경변수로 관리 권장
    if (!tokenInfo.hd || !allowedDomains.includes(tokenInfo.hd)) {
      throw new Error(`Unauthorized domain: ${tokenInfo.hd || "none"}`)
    }

    // 4. 직원 정보 확인
    const employee = await employeeDB.findEmployeeByEmail(tokenInfo.email)
    if (!employee) {
      throw new Error(`Employee not found: ${tokenInfo.email}`)
    }

    // 5. 사용자 세션 생성
    const userSession = {
      email: tokenInfo.email,
      name: employee.name,
      picture: tokenInfo.picture,
      domain: tokenInfo.hd,
      employee: employee,
      verified: tokenInfo.email_verified,
      loginTime: new Date().toISOString(),
    }

    // 6. 보안 쿠키 설정
    const response = NextResponse.redirect(new URL("/", request.url))

    // JWT 토큰 생성 (실제로는 JWT 라이브러리 사용)
    const sessionToken = Buffer.from(JSON.stringify(userSession)).toString("base64")

    response.cookies.set("workspace_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 8 * 60 * 60, // 8시간
      path: "/",
    })

    // 액세스 토큰도 저장 (API 호출용)
    response.cookies.set("workspace_access_token", tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: tokens.expires_in || 3600,
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Workspace OAuth callback error:", error)
    const errorMessage = error instanceof Error ? error.message : "Authentication failed"
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(errorMessage)}`, request.url))
  }
}
