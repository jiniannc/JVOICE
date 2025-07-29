import { NextRequest, NextResponse } from 'next/server'
import dropboxService from '@/lib/dropbox-service'

export async function GET(request: NextRequest) {
  console.log("🚀 API 라우트 호출됨!")
  try {
    const { searchParams } = new URL(request.url)
    const language = searchParams.get('language')
    const scriptNumber = searchParams.get('scriptNumber')
    const currentLanguageMode = searchParams.get('currentLanguageMode')

    console.log(`📝 받은 파라미터: language=${language}, scriptNumber=${scriptNumber}, currentLanguageMode=${currentLanguageMode}`)

    if (!language || !scriptNumber) {
      return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 })
    }

    // Dropbox에서 PDF 파일 경로 생성
               let fileName = ""
           if (language === "korean-english") {
             fileName = `한영_문안${scriptNumber}.pdf`
           } else if (language === "japanese") {
             fileName = `일본어_문안${scriptNumber}.pdf`
           } else if (language === "chinese") {
             fileName = `중국어_문안${scriptNumber}.pdf`
           }
    
    const dropboxPath = `/scripts/${fileName}`
    console.log(`📄 Dropbox 경로: ${dropboxPath}`)
    console.log(`🔍 찾는 파일명: ${fileName}`)

    // Dropbox API를 통해 파일 존재 여부 확인 및 공유 링크 생성
    try {
      // 먼저 파일 존재 여부 확인
      console.log(`📥 Dropbox 다운로드 시도: ${dropboxPath}`)
      await dropboxService.download({ path: dropboxPath })
      
      // 파일이 존재하면 Dropbox 공유 링크 생성
      const token = await dropboxService.getAccessToken()
      const shareResponse = await fetch('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: dropboxPath,
          settings: {
            requested_visibility: 'public',
            audience: 'public',
            access: 'viewer'
          }
        })
      })
      
      if (shareResponse.ok) {
        const shareData = await shareResponse.json()
        // 공유 링크를 직접 다운로드 링크로 변환
        const directUrl = shareData.result.url.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace('?dl=0', '?dl=1')
        console.log("✅ Dropbox PDF URL 생성 성공")
        return NextResponse.json({ url: directUrl })
      } else {
        throw new Error('공유 링크 생성 실패')
      }
    } catch (downloadError) {
      console.warn("⚠️ Dropbox에서 파일을 찾을 수 없음")
      return NextResponse.json({ error: `${language} 언어의 문안 ${scriptNumber}을(를) 찾을 수 없습니다.` }, { status: 404 })
    }
  } catch (error) {
    console.error("❌ PDF URL 생성 오류:", error)
    return NextResponse.json({ error: "PDF URL 생성 중 오류가 발생했습니다." }, { status: 500 })
  }
} 