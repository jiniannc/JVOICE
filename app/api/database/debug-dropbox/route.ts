import { NextRequest, NextResponse } from 'next/server'
import dropboxService from '../../../../lib/dropbox-service'

export async function GET(request: NextRequest) {
  return await POST(request)
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Dropbox 데이터 구조 디버깅 시작...')
    
    // 1. index.json 가져오기
    console.log('📋 Dropbox에서 평가 데이터 목록 가져오는 중...')
    
    const indexData = await dropboxService.getIndexJson({ path: '/evaluations/index.json' })
    console.log(`📊 총 ${indexData.entries.length}개의 평가 데이터 발견`)
    
    // 2. 첫 번째 항목의 데이터 구조 확인
    if (indexData.entries.length > 0) {
      const firstEntry = indexData.entries[0]
      console.log('📝 첫 번째 항목:', firstEntry)
      
      // 3. 첫 번째 항목의 상세 데이터 가져오기
      try {
        const evaluationData = await dropboxService.getIndexJson({ path: firstEntry.dropboxPath })
        console.log('📄 평가 데이터 구조:', evaluationData)
        
        return NextResponse.json({ 
          success: true, 
          message: 'Dropbox 데이터 구조 확인 완료',
          indexEntry: firstEntry,
          evaluationData: evaluationData,
          totalEntries: indexData.entries.length
        })
        
      } catch (error) {
        console.error('❌ 평가 데이터 가져오기 실패:', error)
        return NextResponse.json({ 
          success: false, 
          message: '평가 데이터 가져오기 실패',
          error: error instanceof Error ? error.message : 'Unknown error',
          indexEntry: firstEntry
        }, { status: 500 })
      }
    } else {
      return NextResponse.json({ 
        success: false, 
        message: '평가 데이터가 없습니다',
        totalEntries: 0
      }, { status: 404 })
    }
    
  } catch (error) {
    console.error('❌ 디버깅 실패:', error)
    return NextResponse.json({ 
      success: false, 
      message: '디버깅 실패',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

