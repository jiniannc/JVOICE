import { NextResponse } from "next/server"

export async function POST() {
  try {
    const response = NextResponse.json({ success: true })

    // 세션 쿠키 삭제
    response.cookies.set("auth-session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    })

    console.log("✅ User logged out successfully")
    return response
  } catch (error) {
    console.error("❌ Logout error:", error)
    return NextResponse.json({ success: false, error: "Logout failed" }, { status: 500 })
  }
}
