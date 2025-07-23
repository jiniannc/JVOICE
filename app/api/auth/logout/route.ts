import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🔍 [Logout API] 로그아웃 요청 받음")

    const res = NextResponse.json({ success: true, message: "로그아웃 완료" })

    const expire = { path: "/", maxAge: 0 }
    res.cookies.set("auth_user", "", expire)
    res.cookies.set("auth_status", "", expire)
    res.cookies.set("google_access_token", "", expire)
    res.cookies.set("google_refresh_token", "", expire)

    console.log("✅ [Logout API] 모든 쿠키 삭제 완료")
    return res
  } catch (error) {
    console.error("❌ [Logout API] 로그아웃 실패:", error)
    return NextResponse.json(
      { success: false, error: "로그아웃 처리 중 오류가 발생했습니다" },
      { status: 500 },
    )
  }
}
