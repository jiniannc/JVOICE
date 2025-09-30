import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import crypto from 'crypto'

// PDF 파일 업로드
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const language = formData.get('language') as string
    const scriptNumber = parseInt(formData.get('scriptNumber') as string)

    if (!file || !language || !scriptNumber) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      )
    }

    // 파일 타입 검증
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'PDF 파일만 업로드할 수 있습니다.' },
        { status: 400 }
      )
    }

    // 파일 크기 제한 (10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: '파일 크기는 10MB를 초과할 수 없습니다.' },
        { status: 400 }
      )
    }

    // 파일 데이터 읽기
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // 파일 체크섬 생성
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex')

    // 기존 파일이 있는지 확인하고 덮어쓰기
    const existingFile = await prisma.pdfScript.findUnique({
      where: {
        language_scriptNumber: {
          language,
          scriptNumber
        }
      }
    })

    let result
    if (existingFile) {
      // 기존 파일 업데이트 (덮어쓰기)
      result = await prisma.pdfScript.update({
        where: {
          id: existingFile.id
        },
        data: {
          fileName: file.name,
          fileData: buffer,
          fileSize: file.size,
          checksum,
          version: existingFile.version + 1,
          updatedAt: new Date()
        }
      })
      console.log(`✅ PDF 파일 업데이트 완료: ${language} 문안 ${scriptNumber}번 (v${result.version})`)
    } else {
      // 새 파일 생성
      result = await prisma.pdfScript.create({
        data: {
          language,
          scriptNumber,
          fileName: file.name,
          fileData: buffer,
          fileSize: file.size,
          checksum,
          version: 1
        }
      })
      console.log(`✅ PDF 파일 업로드 완료: ${language} 문안 ${scriptNumber}번`)
    }

    // PDF 업로드 완료 후 캐시 초기화 신호 전송
    console.log(`🗑️ PDF 업로드 완료 - 캐시 초기화 필요: ${language} 문안 ${scriptNumber}번`)

    return NextResponse.json({
      success: true,
      message: existingFile ? '파일이 업데이트되었습니다.' : '파일이 업로드되었습니다.',
      file: {
        id: result.id,
        language: result.language,
        scriptNumber: result.scriptNumber,
        fileName: result.fileName,
        fileSize: result.fileSize,
        version: result.version
      },
      clearCache: true // 캐시 초기화 신호
    })

  } catch (error) {
    console.error('PDF 파일 업로드 실패:', error)
    return NextResponse.json(
      { error: 'PDF 파일 업로드에 실패했습니다.' },
      { status: 500 }
    )
  }
}
