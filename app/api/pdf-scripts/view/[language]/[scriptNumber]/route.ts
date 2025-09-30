import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'

// 특정 언어와 문안 번호로 PDF 파일 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { language: string; scriptNumber: string } }
) {
  try {
    const { language, scriptNumber } = params
    const scriptNum = parseInt(scriptNumber)

    if (isNaN(scriptNum)) {
      return NextResponse.json(
        { error: '유효하지 않은 문안 번호입니다.' },
        { status: 400 }
      )
    }

    const file = await prisma.pdfScript.findUnique({
      where: {
        language_scriptNumber: {
          language,
          scriptNumber: scriptNum
        }
      }
    })

    if (!file) {
      return NextResponse.json(
        { error: `${language} 언어의 ${scriptNum}번 문안을 찾을 수 없습니다.` },
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
        'X-Script-Info': `${language}-${scriptNum}`,
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






