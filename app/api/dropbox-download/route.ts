import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

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

    const body = await request.json()
    const { filePath } = body

    if (!filePath) {
      return NextResponse.json(
        { error: '파일 경로가 필요합니다' },
        { status: 400 }
      )
    }

    console.log('파일 다운로드 시작:', filePath)

    // Dropbox API Arg 생성 (절대 경로로 변환)
    const absolutePath = filePath.startsWith('/') ? filePath : `/${filePath}`
    const dropboxArgs = {
      path: absolutePath
    };
    const dropboxApiArg = JSON.stringify(dropboxArgs);
    console.log('Dropbox-API-Arg:', dropboxApiArg);

    // Node.js fetch를 사용해서 한글 헤더 문제 해결
    const response = await fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${validToken}`,
        'Dropbox-API-Arg': dropboxApiArg,
        'Content-Type': 'text/plain'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Dropbox 다운로드 실패:', response.status, errorText);
      
      if (response.status === 409 || errorText.includes('not_found') || errorText.includes('path/not_found')) {
        // 파일이 없는 경우
        console.log('파일 없음:', filePath);
        return NextResponse.json(
          { error: '파일을 찾을 수 없습니다', notFound: true },
          { status: 404 }
        )
      }
      
      return NextResponse.json(
        { error: '파일 다운로드 실패' },
        { status: 500 }
      )
    }

    // JSON 파일인 경우 텍스트로, 음성 파일인 경우 Base64로 처리
    if (filePath.endsWith('.json')) {
      const text = await response.text();
      console.log('JSON 파일 다운로드 완료:', filePath, '크기:', text.length, 'chars');
      
      return NextResponse.json({
        success: true,
        content: text,
        fileSize: text.length
      });
    } else {
      // ArrayBuffer로 받아서 Base64로 변환 (음성 파일용)
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');
      const base64Data = `data:audio/webm;base64,${base64}`;

      console.log('파일 다운로드 완료:', filePath, '크기:', buffer.length, 'bytes');

      return NextResponse.json({
        success: true,
        base64Data: base64Data,
        fileSize: buffer.length
      });
    }

  } catch (error: any) {
    console.error('Dropbox 다운로드 오류:', error.response?.data || error.message)
    return NextResponse.json(
      { error: '파일 다운로드 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
} 