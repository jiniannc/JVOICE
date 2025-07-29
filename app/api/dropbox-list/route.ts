import { NextRequest, NextResponse } from 'next/server'
import dropboxService from '@/lib/dropbox-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path') || '/scripts'

    console.log(`📁 Dropbox 폴더 목록 조회: ${path}`)

    // Dropbox 폴더 내용 조회
    const entries = await dropboxService.listFolder({ path })
    
    console.log(`✅ Dropbox 폴더 조회 성공: ${entries.length}개 파일/폴더`)
    console.log('📋 파일 목록:', entries.map(entry => entry.name))

    return NextResponse.json({ 
      entries,
      count: entries.length,
      path 
    })
  } catch (error) {
    console.error("❌ Dropbox 폴더 조회 오류:", error)
    return NextResponse.json({ 
      error: "폴더 조회 중 오류가 발생했습니다.",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 