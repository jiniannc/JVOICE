import { NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "1000")
    const pageToken = searchParams.get("pageToken") || undefined

    console.log(`📊 [API] 평가 결과 로드 시작 (제한: ${limit}개)`)

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

    // Google Drive에서 평가 결과 파일 목록 조회
    const drive = getDriveClient()
    
    // 쿼리 조건 설정
    let query = `name contains 'evaluation_' and mimeType='application/json'`
    
    if (evaluationsFolderId) {
      // 특정 폴더에서 검색
      query += ` and '${evaluationsFolderId}' in parents`
      console.log(`📁 지정된 폴더에서 검색: ${evaluationsFolderId}`)
    } else {
      // 전체 드라이브에서 검색
      console.log(`📁 전체 드라이브에서 검색 (폴더 ID 미설정)`)
    }

    const filesResponse = await drive.files.list({
      q: query,
      orderBy: 'createdTime desc',
      pageSize: limit,
      pageToken: pageToken,
      fields: 'files(id,name,createdTime,webViewLink,parents),nextPageToken',
    })

    const files = filesResponse.data.files || []
    console.log(`📋 [API] Google Drive에서 ${files.length}개 평가 결과 파일 발견`)

    // 각 파일의 내용을 읽어서 평가 결과 배열 생성
    const evaluations: any[] = []
    
    for (const file of files) {
      try {
        // 파일 내용 읽기
        const fileResponse = await drive.files.get({
          fileId: file.id!,
          alt: 'media',
        })

        const evaluationData = JSON.parse(fileResponse.data as string)
        evaluations.push({
          ...evaluationData,
          driveFileId: file.id,
          driveFileName: file.name,
          driveWebViewLink: file.webViewLink,
          driveCreatedTime: file.createdTime,
          driveParents: file.parents,
        })
      } catch (fileError) {
        console.warn(`⚠️ [API] 파일 읽기 실패 (${file.name}):`, fileError)
        // 파일 읽기 실패해도 계속 진행
      }
    }

    console.log(`✅ [API] 평가 결과 로드 완료: ${evaluations.length}개`)

    return NextResponse.json({
      success: true,
      evaluations,
      totalCount: evaluations.length,
      nextPageToken: filesResponse.data.nextPageToken,
      searchLocation: evaluationsFolderId ? "specific_folder" : "entire_drive",
      message: `${evaluations.length}개의 평가 결과를 로드했습니다.`,
    })
  } catch (error) {
    console.error("❌ [API] 평가 결과 로드 실패:", error)
    return NextResponse.json({ 
      error: "평가 결과 로드 중 오류가 발생했습니다.",
      details: error instanceof Error ? error.message : "알 수 없는 오류"
    }, { status: 500 })
  }
} 