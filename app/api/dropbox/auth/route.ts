import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const dropboxAppKey = process.env.DROPBOX_APP_KEY;
    
    if (!dropboxAppKey) {
      console.error('DROPBOX_APP_KEY가 설정되지 않았습니다.');
      return NextResponse.json(
        { error: 'Dropbox 앱 키가 설정되지 않았습니다' },
        { status: 500 }
      )
    }

    // OAuth URL 생성
    const baseUrl = request.nextUrl.origin;
    const redirectUri = `${baseUrl}/api/dropbox/auth/callback`;
    
    // 상태값 생성 (CSRF 보호)
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // OAuth URL 구성
    const authUrl = new URL('https://www.dropbox.com/oauth2/authorize');
    authUrl.searchParams.set('client_id', dropboxAppKey);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('token_access_type', 'offline'); // refresh_token 받기 위해

    console.log('Dropbox OAuth URL:', authUrl.toString());

    return NextResponse.redirect(authUrl.toString());
    
  } catch (error) {
    console.error('Dropbox OAuth 시작 에러:', error);
    return NextResponse.json(
      { error: 'Dropbox OAuth 시작 실패' },
      { status: 500 }
    )
  }
} 