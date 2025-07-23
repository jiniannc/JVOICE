import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { language: string; number: string } }) {
  try {
    const { language, number } = params

    // 클라이언트 사이드에서 동기화된 파일 정보를 가져오도록 리다이렉트
    // 실제로는 서버 사이드에서도 동기화 정보를 관리해야 하지만,
    // 현재는 클라이언트 사이드 localStorage를 사용

    return NextResponse.json({
      message: "PDF URL should be fetched from client-side sync service",
      language,
      number,
    })
  } catch (error) {
    console.error("Script fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch script" }, { status: 500 })
  }
}
