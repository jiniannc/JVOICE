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

    console.log('Dropbox 파일 목록 조회 시작');

    // Dropbox에서 파일 목록 조회
    const response = await axios.post('https://api.dropboxapi.com/2/files/list_folder', {
      path: '',
      recursive: true,
      include_media_info: false,
      include_deleted: false,
      include_has_explicit_shared_members: false,
      include_mounted_folders: true,
      include_non_downloadable_files: true
    }, {
      headers: {
        'Authorization': `Bearer ${dropboxToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status !== 200) {
      console.error('Dropbox 파일 목록 조회 실패:', response.status);
      return NextResponse.json(
        { error: '파일 목록 조회 실패' },
        { status: 500 }
      )
    }

    const files = response.data.entries || [];
    console.log('Dropbox 파일 목록 조회 성공:', files.length, '개 파일');
    
    // 파일 정보 로깅
    files.forEach((file: any, index: number) => {
      console.log(`파일 ${index + 1}:`, {
        name: file.name,
        path_display: file.path_display,
        path_lower: file.path_lower,
        id: file.id
      });
    });

    return NextResponse.json({
      success: true,
      files: files,
      count: files.length
    });

  } catch (error: any) {
    console.error('Dropbox 파일 목록 조회 오류:', error.response?.data || error.message);
    return NextResponse.json(
      { error: '파일 목록 조회 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
} 