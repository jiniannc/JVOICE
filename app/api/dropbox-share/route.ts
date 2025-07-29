import { NextRequest, NextResponse } from 'next/server'
import dropboxService from '@/lib/dropbox-service'

export async function POST(request: NextRequest) {
  console.log("🚀 dropbox-share API 호출됨!")
  
  try {
    const body = await request.json()
    const { path } = body

    console.log(`📝 받은 요청 데이터:`, body)

    if (!path) {
      console.error("❌ 파일 경로가 누락됨")
      return NextResponse.json({ error: '파일 경로가 필요합니다.' }, { status: 400 })
    }

    console.log(`🔗 공유 링크 생성 시도: ${path}`)

    // Dropbox 토큰 가져오기
    console.log("🔑 Dropbox 토큰 가져오기 시도...")
    const token = await dropboxService.getAccessToken()
    console.log("✅ Dropbox 토큰 획득 성공")

    // Dropbox API를 통해 공유 링크 생성
    console.log("🌐 Dropbox API 호출 시도...")
    const shareResponse = await fetch('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: path,
        settings: {
          requested_visibility: 'public',
          audience: 'public',
          access: 'viewer'
        }
      })
    })

    console.log(`📊 Dropbox API 응답 상태: ${shareResponse.status}`)

    if (shareResponse.ok) {
      const shareData = await shareResponse.json()
      console.log("📄 Dropbox API 응답 데이터:", shareData)
      
      // 응답 구조 확인 - Dropbox API는 직접 url을 반환함
      if (shareData.url) {
        // Dropbox 임베드 URL - 원본 URL 그대로 사용 (iframe에서 표시용)
        const directUrl = shareData.url
        
        console.log("✅ 공유 링크 생성 성공")
        console.log("🔗 생성된 URL:", directUrl)
        return NextResponse.json({ url: directUrl })
      } else {
        console.error("❌ 응답에 URL이 없음:", shareData)
        return NextResponse.json({ error: '응답에 URL이 없습니다.' }, { status: 500 })
      }
    } else if (shareResponse.status === 409) {
      // 이미 공유 링크가 존재하는 경우, 기존 링크를 가져옴
      console.log("🔄 기존 공유 링크 조회 시도...")
      
      const listResponse = await fetch('https://api.dropboxapi.com/2/sharing/list_shared_links', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: path,
          direct_only: false
        })
      })
      
      if (listResponse.ok) {
        const listData = await listResponse.json()
        console.log("📄 기존 공유 링크 목록:", listData)
        
                 if (listData.links && listData.links.length > 0) {
           const existingUrl = listData.links[0].url
           // Dropbox 임베드 URL로 변환 (iframe에서 표시용, 다운로드 방지)
           // Dropbox 임베드 URL - 원본 URL 그대로 사용 (iframe에서 표시용)
           const embedUrl = existingUrl
           
           console.log("✅ 기존 공유 링크 사용")
           console.log("🔗 임베드 URL:", embedUrl)
           return NextResponse.json({ url: embedUrl })
         }
      }
      
      console.error("❌ 기존 공유 링크 조회 실패")
      return NextResponse.json({ error: '기존 공유 링크를 찾을 수 없습니다.' }, { status: 500 })
    } else {
      const errorText = await shareResponse.text()
      console.error("❌ 공유 링크 생성 실패:", shareResponse.status)
      console.error("❌ 에러 응답:", errorText)
      return NextResponse.json({ error: `공유 링크 생성에 실패했습니다. (${shareResponse.status})` }, { status: 500 })
    }
  } catch (error) {
    console.error("❌ 공유 링크 생성 오류:", error)
    console.error("❌ 오류 상세:", error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json({ error: "공유 링크 생성 중 오류가 발생했습니다." }, { status: 500 })
  }
} 