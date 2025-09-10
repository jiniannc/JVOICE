import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL || 
                 process.env.NEXT_PUBLIC_BASE_URL || 
                 `${request.nextUrl.protocol}//${request.nextUrl.host}`

  try {
    console.log("🗓️ [Google Calendar Callback] Calendar OAuth 콜백 처리 시작...")

    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const error = searchParams.get("error")

    if (error) {
      console.error("❌ [Google Calendar Callback] OAuth 오류:", error)
      return NextResponse.redirect(new URL(`/?error=${error}`, baseUrl))
    }

    if (!code) {
      console.error("❌ [Google Calendar Callback] 인증 코드가 없음")
      return NextResponse.redirect(new URL("/?error=no_code", baseUrl))
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      console.error("❌ [Google Calendar Callback] Google 설정이 누락됨")
      return NextResponse.redirect(new URL("/?error=missing_config", baseUrl))
    }

    const redirectUri = `${baseUrl}/api/auth/google-calendar/callback`

    console.log("🔄 [Google Calendar Callback] 토큰 교환 시작...")

    // 토큰 교환
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error("❌ [Google Calendar Callback] 토큰 교환 실패:", errorData)
      return NextResponse.redirect(new URL("/?error=token_exchange_failed", baseUrl))
    }

    const tokens = await tokenResponse.json()
    console.log("✅ [Google Calendar Callback] 토큰 받음:", {
      access_token: !!tokens.access_token,
      refresh_token: !!tokens.refresh_token,
      expires_in: tokens.expires_in
    })

    // 사용자 정보 확인
    const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    if (!userResponse.ok) {
      console.error("❌ [Google Calendar Callback] 사용자 정보 조회 실패")
      return NextResponse.redirect(new URL("/?error=user_info_failed", baseUrl))
    }

    const userInfo = await userResponse.json()
    console.log("✅ [Google Calendar Callback] 사용자 정보:", {
      email: userInfo.email,
      name: userInfo.name,
      domain: userInfo.email?.split('@')[1]
    })

    // JINAIR 도메인 확인
    if (!userInfo.email?.endsWith('@jinair.com')) {
      console.error("❌ [Google Calendar Callback] 허용되지 않은 도메인:", userInfo.email)
      return NextResponse.redirect(new URL("/?error=invalid_domain", baseUrl))
    }

    // Calendar 토큰을 쿠키에 저장 (보안을 위해 HttpOnly)
    const cookieStore = cookies()
    
    // 액세스 토큰 (짧은 수명)
    cookieStore.set("google_calendar_access_token", tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: tokens.expires_in || 3600, // 기본 1시간
    })

    // 리프레시 토큰 (긴 수명)
    if (tokens.refresh_token) {
      cookieStore.set("google_calendar_refresh_token", tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60, // 30일
      })
    }

    // 사용자 정보도 저장
    cookieStore.set("google_calendar_user", JSON.stringify({
      email: userInfo.email,
      name: userInfo.name
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30일
    })

    console.log("✅ [Google Calendar Callback] Calendar 권한 설정 완료")

    // 성공 메시지와 함께 메인 페이지로 리다이렉트
    return NextResponse.redirect(new URL("/?calendar_auth=success", baseUrl))

  } catch (error) {
    console.error("❌ [Google Calendar Callback] 콜백 처리 실패:", error)
    return NextResponse.redirect(new URL("/?error=callback_failed", baseUrl))
  }
}
