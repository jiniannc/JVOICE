import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

export async function GET(request: NextRequest) {
  try {
    const dropboxToken = process.env.DROPBOX_TOKEN;
    
    if (!dropboxToken) {
      return NextResponse.json(
        { error: 'DROPBOX_TOKEN이 설정되지 않았습니다.' },
        { status: 500 }
      )
    }

    console.log('Dropbox 토큰 존재 여부:', !!dropboxToken);
    console.log('Dropbox 토큰 길이:', dropboxToken.length);

    // 토큰 유효성 확인
    try {
      const response = await axios.post('https://api.dropboxapi.com/2/check/user', {}, {
        headers: {
          'Authorization': `Bearer ${dropboxToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('토큰 유효성 확인 성공:', response.data);
      
      return NextResponse.json({
        success: true,
        message: 'Dropbox 토큰이 유효합니다.',
        userInfo: response.data
      });
      
    } catch (error: any) {
      console.error('토큰 유효성 확인 실패:', error.response?.data || error.message);
      
      return NextResponse.json({
        success: false,
        error: 'Dropbox 토큰이 유효하지 않습니다.',
        details: error.response?.data || error.message
      }, { status: 401 });
    }
    
  } catch (error) {
    console.error('Dropbox 테스트 에러:', error);
    return NextResponse.json(
      { error: 'Dropbox 테스트 실패' },
      { status: 500 }
    )
  }
} 