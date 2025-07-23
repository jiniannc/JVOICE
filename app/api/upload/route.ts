import { NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import { Readable } from "stream"
import path from "path"

const KEYFILEPATH = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || path.join(process.cwd(), "credentials/service-account.json")
const SCOPES = ["https://www.googleapis.com/auth/drive.file"]

function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: SCOPES,
  })
  return google.drive({ version: "v3", auth })
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const fileName = formData.get("fileName") as string
    const folderId = formData.get("folderId") as string

    if (!file || !fileName || !folderId) {
      return NextResponse.json({ error: "필수 파라미터가 누락되었습니다." }, { status: 400 })
    }

    // File → Buffer 변환
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Google Drive 업로드
    const drive = getDriveClient()
    const res = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType: file.type,
        body: Readable.from(buffer),
      },
      fields: "id, name, webViewLink, webContentLink",
    })

    const uploaded = res.data

    return NextResponse.json({
      success: true,
      fileId: uploaded.id,
      fileName: uploaded.name,
      webViewLink: uploaded.webViewLink,
      webContentLink: uploaded.webContentLink,
      message: "파일이 Google Drive에 성공적으로 업로드되었습니다.",
    })
  } catch (error) {
    console.error("Google Drive 업로드 오류:", error)
    return NextResponse.json({ error: "Google Drive 업로드 중 오류가 발생했습니다." }, { status: 500 })
  }
}
