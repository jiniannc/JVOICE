import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [Google OAuth] OAuth 시작...")

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId) {
      console.error("❌ [Google OAuth] Google Client ID가 설정되지 않음")
      return NextResponse.redirect(new URL("/?error=missing_client_id", request.url))
    }

    // 환경 변수에서 base URL 가져오기, 없으면 request.url에서 추출
    const baseUrl = process.env.NEXTAUTH_URL || 
                   process.env.NEXT_PUBLIC_BASE_URL || 
                   `${request.nextUrl.protocol}//${request.nextUrl.host}`
    const redirectUri = `${baseUrl}/api/auth/google/callback`

    console.log("📍 [Google OAuth] Redirect URI:", redirectUri)

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "consent",
      hd: "jinair.com", // JINAIR 도메인만 허용
    })

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

    console.log("🔗 [Google OAuth] 인증 URL로 리다이렉트:", authUrl)

    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error("❌ [Google OAuth] OAuth 시작 실패:", error)
    return NextResponse.redirect(new URL("/?error=oauth_start_failed", request.url))
  }
}
