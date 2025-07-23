import { type NextRequest, NextResponse } from "next/server"
import { employeeDatabase } from "@/lib/employee-database"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  console.log("🔄 OAuth callback received:", { code: !!code, state, error })

  if (error) {
    console.error("❌ OAuth error:", error)
    return NextResponse.redirect(new URL(`/?error=${error}`, request.url))
  }

  if (!code) {
    console.error("❌ No authorization code received")
    return NextResponse.redirect(new URL("/?error=no_code", request.url))
  }

  try {
    // Google에서 액세스 토큰 교환
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: "authorization_code",
        redirect_uri: `${new URL(request.url).origin}/api/auth/server/callback`,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error("❌ Token exchange failed:", errorData)
      return NextResponse.redirect(new URL("/?error=token_exchange_failed", request.url))
    }

    const tokens = await tokenResponse.json()
    console.log("✅ Tokens received:", { access_token: !!tokens.access_token })

    // 사용자 정보 가져오기
    const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    if (!userResponse.ok) {
      console.error("❌ Failed to fetch user info")
      return NextResponse.redirect(new URL("/?error=user_info_failed", request.url))
    }

    const googleUser = await userResponse.json()
    console.log("✅ User info received:", { email: googleUser.email, name: googleUser.name })

    // 직원 정보 조회
    const employee = employeeDatabase.findByEmail(googleUser.email)
    console.log("👤 Employee lookup:", { found: !!employee, email: googleUser.email })

    // 사용자 세션 데이터 생성
    const userData = {
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture,
      employee: employee || null,
      verified: googleUser.verified_email || false,
      authenticatedAt: new Date().toISOString(),
    }

    // 세션 쿠키 설정 (HttpOnly, Secure)
    const response = NextResponse.redirect(new URL("/?auth=success", request.url))

    // JWT 토큰 생성 (간단한 방식)
    const sessionData = Buffer.from(JSON.stringify(userData)).toString("base64")

    response.cookies.set("auth-session", sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7일
      path: "/",
    })

    console.log("✅ Session created successfully")
    return response
  } catch (error) {
    console.error("❌ OAuth callback error:", error)
    return NextResponse.redirect(new URL("/?error=callback_error", request.url))
  }
}
