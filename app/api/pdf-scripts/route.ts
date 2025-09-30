import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'

// PDF 파일 목록 조회
export async function GET(request: NextRequest) {
  try {
    const files = await prisma.pdfScript.findMany({
      select: {
        id: true,
        language: true,
        scriptNumber: true,
        fileName: true,
        fileSize: true,
        uploadedAt: true,
      },
      orderBy: [
        { language: 'asc' },
        { scriptNumber: 'asc' }
      ]
    })

    return NextResponse.json({
      success: true,
      files: files
    })
  } catch (error) {
    console.error('PDF 파일 목록 조회 실패:', error)
    return NextResponse.json(
      { success: false, error: 'PDF 파일 목록 조회에 실패했습니다.' },
      { status: 500 }
    )
  }
}
