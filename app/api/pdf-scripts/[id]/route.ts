import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'

// PDF 파일 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // 파일 존재 확인
    const existingFile = await prisma.pdfScript.findUnique({
      where: { id }
    })

    if (!existingFile) {
      return NextResponse.json(
        { error: '파일을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 파일 삭제
    await prisma.pdfScript.delete({
      where: { id }
    })

    console.log(`✅ PDF 파일 삭제 완료: ${existingFile.language} 문안 ${existingFile.scriptNumber}번`)
    console.log(`🗑️ PDF 삭제 완료 - 캐시 초기화 필요: ${existingFile.language} 문안 ${existingFile.scriptNumber}번`)

    return NextResponse.json({
      success: true,
      message: '파일이 삭제되었습니다.',
      clearCache: true, // 캐시 초기화 신호
      file: {
        language: existingFile.language,
        scriptNumber: existingFile.scriptNumber
      }
    })

  } catch (error) {
    console.error('PDF 파일 삭제 실패:', error)
    return NextResponse.json(
      { error: 'PDF 파일 삭제에 실패했습니다.' },
      { status: 500 }
    )
  }
}

// PDF 파일 다운로드/조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const file = await prisma.pdfScript.findUnique({
      where: { id }
    })

    if (!file) {
      return NextResponse.json(
        { error: '파일을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // PDF 파일 반환
    return new NextResponse(file.fileData, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${encodeURIComponent(file.fileName)}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    })

  } catch (error) {
    console.error('PDF 파일 조회 실패:', error)
    return NextResponse.json(
      { error: 'PDF 파일 조회에 실패했습니다.' },
      { status: 500 }
    )
  }
}
