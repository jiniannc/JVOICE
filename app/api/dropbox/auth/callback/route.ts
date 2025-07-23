import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.error('Dropbox OAuth 에러:', error);
      return NextResponse.redirect(new URL(`/?error=dropbox_oauth_${error}`, request.url));
    }

    if (!code) {
      console.error('Dropbox OAuth 코드가 없습니다.');
      return NextResponse.redirect(new URL('/?error=dropbox_no_code', request.url));
    }

    const dropboxAppKey = process.env.DROPBOX_APP_KEY;
    const dropboxAppSecret = process.env.DROPBOX_APP_SECRET;

    if (!dropboxAppKey || !dropboxAppSecret) {
      console.error('Dropbox 앱 설정이 누락되었습니다.');
      return NextResponse.redirect(new URL('/?error=dropbox_missing_config', request.url));
    }

    // 토큰 교환
    const baseUrl = request.nextUrl.origin;
    const redirectUri = `${baseUrl}/api/dropbox/auth/callback`;

    console.log('Dropbox 토큰 교환 시작...');

    const tokenResponse = await axios.post('https://api.dropbox.com/oauth2/token', 
      new URLSearchParams({
        code: code,
        grant_type: 'authorization_code',
        client_id: dropboxAppKey,
        client_secret: dropboxAppSecret,
        redirect_uri: redirectUri
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    if (tokenResponse.status !== 200) {
      console.error('Dropbox 토큰 교환 실패:', tokenResponse.data);
      return NextResponse.redirect(new URL('/?error=dropbox_token_exchange_failed', request.url));
    }

    const tokenData = tokenResponse.data;
    console.log('Dropbox 토큰 받음:', { 
      access_token: !!tokenData.access_token, 
      refresh_token: !!tokenData.refresh_token 
    });

    // 토큰을 환경 변수에 저장 (실제로는 데이터베이스나 안전한 저장소 사용 권장)
    // 여기서는 간단히 콘솔에 출력
    console.log('=== Dropbox 토큰 정보 ===');
    console.log('Access Token:', tokenData.access_token);
    console.log('Refresh Token:', tokenData.refresh_token);
    console.log('Token Type:', tokenData.token_type);
    console.log('Expires In:', tokenData.expires_in);
    console.log('========================');
    
    // 환경 변수 업데이트 안내
    console.log('=== 환경 변수 업데이트 필요 ===');
    console.log('다음 내용을 .env.local 파일에 추가하세요:');
    console.log('DROPBOX_TOKEN=' + tokenData.access_token);
    console.log('DROPBOX_REFRESH_TOKEN=' + tokenData.refresh_token);
    console.log('========================');

    // 성공 페이지로 리다이렉트
    return NextResponse.redirect(new URL('/?dropbox_auth=success', request.url));

  } catch (error: any) {
    console.error('Dropbox OAuth 콜백 에러:', error.response?.data || error.message);
    return NextResponse.redirect(new URL('/?error=dropbox_callback_error', request.url));
  }
} 