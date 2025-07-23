import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true, message: "Logged out successfully" })

    // 모든 인증 쿠키 삭제
    response.cookies.delete("workspace_session")
    response.cookies.delete("workspace_access_token")

    // Google 세션도 무효화 (선택사항)
    const sessionCookie = request.cookies.get("workspace_session")?.value
    if (sessionCookie) {
      try {
        const sessionData = JSON.parse(Buffer.from(sessionCookie, "base64").toString())
        // Google 토큰 무효화 API 호출 (선택사항)
        // await revokeGoogleToken(sessionData.accessToken)
      } catch (error) {
        console.error("Token revocation failed:", error)
      }
    }

    return response
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json({ success: false, error: "Logout failed" }, { status: 500 })
  }
}
