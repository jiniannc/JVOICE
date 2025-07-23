import { type NextRequest, NextResponse } from "next/server"

// 🔥 Google Drive 업로드 API 엔드포인트 (2단계 백업)
export async function POST(request: NextRequest) {
  console.log("🚀 [API] Google Drive 서버 업로드 요청 받음")

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const fileName = formData.get("fileName") as string
    const folderId = formData.get("folderId") as string

    if (!file || !fileName || !folderId) {
      return NextResponse.json({ error: "필수 파라미터가 누락되었습니다" }, { status: 400 })
    }

    console.log(`📁 [API] 업로드 파일: ${fileName} (크기: ${file.size} bytes)`)

    // Google Drive API 호출 시뮬레이션
    // 실제 구현에서는 Google Drive API를 사용
    const apiKey = process.env.GOOGLE_API_KEY // 서버 전용 API 키
    if (!apiKey) {
      throw new Error("서버 Google API Key가 설정되지 않았습니다")
    }

    // 업로드 시뮬레이션 (2초 대기)
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // 성공 시뮬레이션 (90% 확률)
    if (Math.random() > 0.1) {
      const fileId = `server_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      console.log(`✅ [API] Google Drive 업로드 성공: ${fileName} (ID: ${fileId})`)

      return NextResponse.json({
        success: true,
        fileId,
        fileName,
        uploadedAt: new Date().toISOString(),
        method: "server",
      })
    } else {
      throw new Error("서버 업로드 실패 (시뮬레이션)")
    }
  } catch (error) {
    console.error("❌ [API] Google Drive 업로드 실패:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "알 수 없는 오류",
        method: "server",
      },
      { status: 500 },
    )
  }
}

// GET 요청으로 업로드 상태 확인
export async function GET() {
  return NextResponse.json({
    status: "Google Drive Upload API",
    targetFolder: "1cdUwgx4z3BrCqrp8tt8e8T6OQhFMvqLF",
    supportedMethods: ["POST"],
    maxFileSize: "100MB",
    supportedFormats: ["audio/wav", "audio/mp3", "audio/mpeg"],
  })
}
