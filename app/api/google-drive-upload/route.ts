import { type NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"

export async function POST(request: NextRequest) {
  try {
    console.log("🔧 Google Drive Upload API - Starting")

    const formData = await request.formData()
    const file = formData.get("file") as File
    const folderId = formData.get("folderId") as string

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Google Drive API 설정
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/drive.file"],
    })

    const drive = google.drive({ version: "v3", auth })

    console.log("📤 Uploading to folder:", folderId)

    // 파일 업로드
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const response = await drive.files.create({
      requestBody: {
        name: file.name,
        parents: [folderId],
      },
      media: {
        mimeType: file.type,
        body: buffer,
      },
    })

    console.log("✅ Upload successful:", response.data)

    return NextResponse.json({
      success: true,
      fileId: response.data.id,
      fileName: file.name,
      webViewLink: `https://drive.google.com/file/d/${response.data.id}/view`,
    })
  } catch (error) {
    console.error("❌ Google Drive Upload Error:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      },
      { status: 500 },
    )
  }
}
