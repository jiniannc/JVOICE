import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

export async function POST(request: NextRequest) {
  try {
    const dropboxAppKey = process.env.DROPBOX_APP_KEY;
    const dropboxAppSecret = process.env.DROPBOX_APP_SECRET;
    const currentRefreshToken = process.env.DROPBOX_REFRESH_TOKEN;

    if (!dropboxAppKey || !dropboxAppSecret || !currentRefreshToken) {
      return NextResponse.json(
        { error: 'Dropbox 앱 설정이 누락되었습니다' },
        { status: 500 }
      )
    }

    // Refresh token을 사용하여 새로운 access token 발급
    const tokenResponse = await axios.post('https://api.dropbox.com/oauth2/token', 
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: dropboxAppKey,
        client_secret: dropboxAppSecret,
        refresh_token: currentRefreshToken
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    if (tokenResponse.status !== 200) {
      console.error('토큰 갱신 실패:', tokenResponse.data);
      return NextResponse.json(
        { error: '토큰 갱신 실패' },
        { status: 500 }
      )
    }

    const tokenData = tokenResponse.data;
    console.log('토큰 갱신 성공:', { 
      access_token: !!tokenData.access_token,
      expires_in: tokenData.expires_in 
    });

    return NextResponse.json({
      success: true,
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in
    });

  } catch (error: any) {
    console.error('토큰 갱신 에러:', error.response?.data || error.message);
    return NextResponse.json(
      { error: '토큰 갱신 실패' },
      { status: 500 }
    )
  }
} 