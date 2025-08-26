import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

// 한글을 ASCII-safe 문자열로 변환하는 함수
function escapeUnicode(str: string): string {
  return str.replace(/[\u007F-\uFFFF]/g, function(ch) {
    return '\\u' + ('0000' + ch.charCodeAt(0).toString(16)).slice(-4);
  });
}

// Dropbox API Arg를 ASCII-safe로 변환하는 함수
function createDropboxApiArg(args: any): string {
  const jsonString = JSON.stringify(args);
  return escapeUnicode(jsonString);
}

export async function POST(request: NextRequest) {
  try {
    // Dropbox 토큰 확인
    const dropboxToken = process.env.DROPBOX_TOKEN;
    console.log('Dropbox 토큰 존재 여부:', !!dropboxToken);
    console.log('Dropbox 토큰 길이:', dropboxToken?.length);
    
    if (!dropboxToken) {
      console.error('DROPBOX_TOKEN이 설정되지 않았습니다.');
      return NextResponse.json(
        { error: 'Dropbox 토큰이 설정되지 않았습니다' },
        { status: 500 }
      )
    }

    // 토큰 유효성 확인 및 자동 갱신
    let validToken = dropboxToken;
    try {
      const checkTokenResponse = await axios.post('https://api.dropboxapi.com/2/check/user', {}, {
        headers: {
          'Authorization': `Bearer ${dropboxToken}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('토큰 유효성 확인 성공:', checkTokenResponse.data);
    } catch (tokenError: any) {
      console.error('토큰 유효성 확인 실패, 갱신 시도:', tokenError.response?.data || tokenError.message);
      
      // 토큰 갱신 시도
      try {
        const refreshToken = process.env.DROPBOX_REFRESH_TOKEN;
        const dropboxAppKey = process.env.DROPBOX_APP_KEY;
        const dropboxAppSecret = process.env.DROPBOX_APP_SECRET;
        
        if (!refreshToken || !dropboxAppKey || !dropboxAppSecret) {
          throw new Error('Refresh token 또는 앱 설정이 누락되었습니다');
        }
        
        const tokenResponse = await axios.post('https://api.dropbox.com/oauth2/token', 
          new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: dropboxAppKey,
            client_secret: dropboxAppSecret,
            refresh_token: refreshToken
          }), {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );
        
        if (tokenResponse.status === 200) {
          validToken = tokenResponse.data.access_token;
          console.log('토큰 갱신 성공');
        } else {
          throw new Error('토큰 갱신 실패');
        }
      } catch (refreshError: any) {
        console.error('토큰 갱신 실패:', refreshError.response?.data || refreshError.message);
        return NextResponse.json(
          { error: 'Dropbox 토큰이 만료되었고 갱신에 실패했습니다. OAuth를 다시 실행해주세요.' },
          { status: 401 }
        )
      }
    }

    const contentType = request.headers.get('content-type') || ''
    
    let buffer: Buffer
    let dropboxPath: string
    
    if (contentType.includes('application/json')) {
      // JSON 데이터 처리 (신청 데이터)
      const body = await request.json()
      const { path, content, mode = 'add' } = body
      
      if (!path || !content) {
        return NextResponse.json(
          { error: 'path와 content가 필요합니다' },
          { status: 400 }
        )
      }
      
      buffer = Buffer.from(content, 'utf-8')
      dropboxPath = `/${path}`
      
      console.log('JSON 업로드:', path)
    } else {
      // 파일 업로드 처리 (기존 로직)
      const formData = await request.formData()
      const file = formData.get('file') as File
      const fileName = formData.get('fileName') as string

      if (!file || !fileName) {
        return NextResponse.json(
          { error: '파일과 파일명이 필요합니다' },
          { status: 400 }
        )
      }

      // Blob/File → ArrayBuffer → Buffer 변환
      const arrayBuffer = await file.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)

      // 파일명 처리
      const timestamp = Date.now()
      
      // 디버깅: 원본 파일명 확인
      console.log('원본 fileName:', fileName)
      console.log('원본 fileName 타입:', typeof fileName)
      console.log('원본 fileName 길이:', fileName.length)
      
      // 한글 파일명을 JSON 내부에 유지 (UTF-8 인코딩)
      dropboxPath = `/recordings/${timestamp}_${fileName}`
    }
    
    console.log('dropboxPath:', dropboxPath)

    // Dropbox API Arg 생성 (ASCII-safe)
    const dropboxArgs = {
      path: dropboxPath,
      mode: 'overwrite', // JSON 파일은 덮어쓰기 모드
      autorename: false,
      mute: false
    };
    
    const dropboxApiArg = createDropboxApiArg(dropboxArgs);
    console.log('Dropbox-API-Arg (ASCII-safe):', dropboxApiArg);

    // Dropbox API 호출 (axios 사용으로 UTF-8 인코딩 보장)
    const dropboxResponse = await axios.post('https://content.dropboxapi.com/2/files/upload', buffer, {
      headers: {
        'Authorization': `Bearer ${validToken}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': dropboxApiArg
      }
    })

    let dropboxResult: any

    if (dropboxResponse.status !== 200) {
      console.error('Dropbox API 에러:', dropboxResponse.data)
      
      try {
        const errorData = dropboxResponse.data
        
        // Dropbox API 제한 처리
        if (errorData.error?.reason?.['.tag'] === 'too_many_write_operations') {
          const retryAfter = errorData.error?.retry_after || 1
          console.log(`Dropbox API 제한, ${retryAfter}초 후 재시도...`)
          
          // 재시도
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
          
          const retryResponse = await axios.post('https://content.dropboxapi.com/2/files/upload', buffer, {
            headers: {
              'Authorization': `Bearer ${validToken}`,
              'Content-Type': 'application/octet-stream',
              'Dropbox-API-Arg': dropboxApiArg
            }
          })
          
          if (retryResponse.status !== 200) {
            console.error('Dropbox API 재시도 에러:', retryResponse.data)
            return NextResponse.json(
              { error: 'Dropbox 업로드 실패 (재시도 후)' },
              { status: 500 }
            )
          }
          
          // 재시도 성공 시 결과 저장
          dropboxResult = retryResponse.data
        } else {
          return NextResponse.json(
            { error: 'Dropbox 업로드 실패' },
            { status: 500 }
          )
        }
      } catch (parseError) {
        console.error('에러 응답 파싱 실패:', parseError)
        return NextResponse.json(
          { error: 'Dropbox 업로드 실패' },
          { status: 500 }
        )
      }
    } else {
      // 원래 요청이 성공한 경우
      dropboxResult = dropboxResponse.data
    }
    
    let downloadUrl = ''
    
    // 파일 업로드인 경우에만 공유 링크 생성
    if (!contentType.includes('application/json')) {
      // 공유 링크 생성
      const shareResponse = await axios.post('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
        path: dropboxResult.path_display,
        settings: {
          requested_visibility: 'public',
          audience: 'public',
          access: 'viewer'
        }
      }, {
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (shareResponse.status !== 200) {
        console.error('Dropbox 공유 링크 생성 실패')
        return NextResponse.json(
          { error: '공유 링크 생성 실패' },
          { status: 500 }
        )
      }

      const shareResult = shareResponse.data
      
      // 다운로드 URL로 변환 (공유 링크를 다운로드 URL로)
      downloadUrl = shareResult.url.replace('www.dropbox.com', 'dl.dropboxusercontent.com')
    }

    const responseData = {
      success: true,
      fileId: dropboxResult.id,
      path: dropboxResult.path_display, // Dropbox 내 실제 경로
      dropboxPath: dropboxPath // Dropbox 경로도 함께 반환
    }
    
    // 파일 업로드인 경우에만 파일 관련 정보 추가
    if (!contentType.includes('application/json')) {
      const fileName = dropboxPath.split('/').pop() || ''
      const timestamp = fileName.split('_')[0]
      const originalFileName = fileName.substring(timestamp.length + 1)
      
      Object.assign(responseData, {
        fileName: fileName,
        url: downloadUrl,
        originalFileName: originalFileName
      })
    }
    
    console.log('응답 데이터:', responseData)
    
    return NextResponse.json(responseData)

  } catch (error) {
    console.error('Dropbox 업로드 에러:', error)
    return NextResponse.json(
      { error: 'Dropbox 업로드 실패' },
      { status: 500 }
    )
  }
} 