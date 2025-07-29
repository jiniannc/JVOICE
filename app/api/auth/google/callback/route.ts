import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Google Callback] OAuth 콜백 처리 시작...")

    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const error = searchParams.get("error")

    if (error) {
      console.error("❌ [Google Callback] OAuth 오류:", error)
      return NextResponse.redirect(new URL(`/?error=${error}`, request.url))
    }

    if (!code) {
      console.error("❌ [Google Callback] 인증 코드가 없음")
      return NextResponse.redirect(new URL("/?error=no_code", request.url))
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      console.error("❌ [Google Callback] Google 설정이 누락됨")
      return NextResponse.redirect(new URL("/?error=missing_config", request.url))
    }

    // 동적 redirect_uri 생성
    const baseUrl = request.nextUrl.origin
    const redirectUri = `${baseUrl}/api/auth/google/callback`

    console.log("🔄 [Google Callback] 토큰 교환 시작...")

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
      console.error("❌ [Google Callback] 토큰 교환 실패:", errorData)
      return NextResponse.redirect(new URL("/?error=token_exchange_failed", request.url))
    }

    const tokenData = await tokenResponse.json()
    console.log("✅ [Google Callback] 토큰 교환 성공")

    // 사용자 정보 가져오기
    const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })

    if (!userResponse.ok) {
      console.error("❌ [Google Callback] 사용자 정보 가져오기 실패")
      return NextResponse.redirect(new URL("/?error=user_info_failed", request.url))
    }

    const userData = await userResponse.json()
    console.log("📊 [Google Callback] 사용자 정보:", userData.email)

    // JINAIR 도메인 확인
    if (!userData.email.endsWith("@jinair.com")) {
      console.error("❌ [Google Callback] 허용되지 않은 도메인:", userData.email)
      return NextResponse.redirect(new URL("/?error=domain_not_allowed", request.url))
    }

    // 쿠키에 사용자 정보 저장
    const cookieStore = await cookies()

    const userInfo = {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      picture: userData.picture,
      isTestAccount: false,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24시간
    }

    await cookieStore.set("auth_user", JSON.stringify(userInfo), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24시간
    })

    await cookieStore.set("auth_status", "authenticated", {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24시간
    })

    console.log("✅ [Google Callback] 로그인 완료:", userData.name)

    // 로그인 기록 저장
    try {
      await fetch(`${new URL(request.url).origin}/api/auth/login-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userData.email,
          name: userData.name,
          loginMethod: 'google',
          success: true
        })
      })
    } catch (error) {
      console.error("로그인 기록 저장 실패:", error)
    }

    return NextResponse.redirect(new URL("/?login=success", request.url))
  } catch (error) {
    console.error("❌ [Google Callback] 콜백 처리 실패:", error)
    return NextResponse.redirect(new URL("/?error=callback_failed", request.url))
  }
}
