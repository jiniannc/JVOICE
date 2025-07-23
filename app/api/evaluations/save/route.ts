import { NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import path from "path"
import { Readable } from "stream"

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
    const evaluationData = await request.json()
    
    if (!evaluationData.candidateId || !evaluationData.candidateInfo) {
      return NextResponse.json({ error: "필수 평가 데이터가 누락되었습니다." }, { status: 400 })
    }

    console.log(`📊 [API] 평가 결과 저장 시작: ${evaluationData.candidateInfo.name}`)

    // 평가 결과를 JSON 파일로 변환
    const fileName = `evaluation_${evaluationData.candidateId}_${Date.now()}.json`
    const fileContent = JSON.stringify(evaluationData, null, 2)
    const buffer = Buffer.from(fileContent, 'utf-8')

    // Google Drive 폴더 ID (개인 드라이브 또는 공유 드라이브)
    let evaluationsFolderId = process.env.NEXT_PUBLIC_EVALUATIONS_FOLDER_ID
    
    // URL에서 폴더 ID 추출 (전체 URL이 입력된 경우)
    if (evaluationsFolderId && evaluationsFolderId.includes('drive.google.com')) {
      const match = evaluationsFolderId.match(/folders\/([a-zA-Z0-9_-]+)/)
      if (match) {
        evaluationsFolderId = match[1]
        console.log(`📁 URL에서 폴더 ID 추출: ${evaluationsFolderId}`)
      }
    }

    // Google Drive에 파일 업로드
    const drive = getDriveClient()
    
    // 파일 생성 요청 본문
    const requestBody: any = {
      name: fileName,
      description: `평가 결과 - ${evaluationData.candidateInfo.name} (${evaluationData.candidateInfo.employeeId})`,
    }

    // 폴더 ID가 있으면 해당 폴더에 저장, 없으면 루트에 저장
    if (evaluationsFolderId) {
      requestBody.parents = [evaluationsFolderId]
      console.log(`📁 지정된 폴더에 저장: ${evaluationsFolderId}`)
    } else {
      console.log(`📁 루트 폴더에 저장 (폴더 ID 미설정)`)
    }

    const res = await drive.files.create({
      requestBody,
      media: {
        mimeType: 'application/json',
        body: Readable.from(buffer),
      },
      fields: "id, name, webViewLink, createdTime, parents",
    })

    const uploaded = res.data

    console.log(`✅ [API] 평가 결과 저장 완료: ${fileName} (ID: ${uploaded.id})`)

    return NextResponse.json({
      success: true,
      fileId: uploaded.id,
      fileName: uploaded.name,
      webViewLink: uploaded.webViewLink,
      createdTime: uploaded.createdTime,
      folderId: evaluationsFolderId || "root",
      message: "평가 결과가 Google Drive에 성공적으로 저장되었습니다.",
    })
  } catch (error) {
    console.error("❌ [API] 평가 결과 저장 실패:", error)
    return NextResponse.json({ 
      error: "평가 결과 저장 중 오류가 발생했습니다.",
      details: error instanceof Error ? error.message : "알 수 없는 오류"
    }, { status: 500 })
  }
} 