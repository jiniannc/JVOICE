import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("auth-session")

    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false, user: null })
    }

    // 세션 데이터 디코딩
    const userData = JSON.parse(Buffer.from(sessionCookie.value, "base64").toString())

    return NextResponse.json({
      authenticated: true,
      user: userData,
    })
  } catch (error) {
    console.error("Session status check error:", error)
    return NextResponse.json({ authenticated: false, user: null })
  }
}
