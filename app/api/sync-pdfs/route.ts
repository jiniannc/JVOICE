import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🔄 PDF Sync - Starting automatic sync")

    // Google Drive에서 최신 PDF 파일들 가져오기
    const scriptsResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=parents in '${process.env.NEXT_PUBLIC_SCRIPTS_FOLDER_ID}' and mimeType='application/pdf'&orderBy=modifiedTime desc`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GOOGLE_ACCESS_TOKEN}`,
        },
      },
    )

    if (!scriptsResponse.ok) {
      throw new Error("Failed to fetch scripts from Google Drive")
    }

    const scriptsData = await scriptsResponse.json()
    console.log("📄 Found PDF files:", scriptsData.files?.length || 0)

    // 로컬 스토리지에 저장 (브라우저에서 실행될 때)
    const syncData = {
      files: scriptsData.files || [],
      lastSync: new Date().toISOString(),
      status: "success",
    }

    return NextResponse.json({
      success: true,
      data: syncData,
      message: `${scriptsData.files?.length || 0}개의 PDF 파일이 동기화되었습니다.`,
    })
  } catch (error) {
    console.error("❌ PDF Sync Error:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Sync failed",
      },
      { status: 500 },
    )
  }
}
