import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log("🗓️ [Google Calendar OAuth] Calendar API 권한 요청 시작...")

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId) {
      console.error("❌ [Google Calendar OAuth] Google Client ID가 설정되지 않음")
      return NextResponse.redirect(new URL("/?error=missing_client_id", request.url))
    }

    // 환경 변수에서 base URL 가져오기
    const baseUrl = process.env.NEXTAUTH_URL || 
                   process.env.NEXT_PUBLIC_BASE_URL || 
                   `${request.nextUrl.protocol}//${request.nextUrl.host}`
    const redirectUri = `${baseUrl}/api/auth/google-calendar/callback`

    console.log("📍 [Google Calendar OAuth] Redirect URI:", redirectUri)

    // Calendar API 권한 포함한 OAuth 스코프
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: [
        "openid", 
        "email", 
        "profile",
        "https://www.googleapis.com/auth/calendar",           // 캘린더 읽기/쓰기
        "https://www.googleapis.com/auth/calendar.events"     // 이벤트 생성/수정
      ].join(" "),
      access_type: "offline", // refresh_token 받기 위해 필요
      prompt: "consent",      // 매번 권한 승인 요청 (refresh_token 확보)
      hd: "jinair.com",       // JINAIR 도메인만 허용
    })

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

    console.log("🔗 [Google Calendar OAuth] 인증 URL로 리다이렉트:", authUrl)

    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error("❌ [Google Calendar OAuth] OAuth 시작 실패:", error)
    return NextResponse.redirect(new URL("/?error=calendar_oauth_failed", request.url))
  }
}


