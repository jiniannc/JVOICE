import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dropboxUrl = searchParams.get('url');

  if (!dropboxUrl) {
    return new NextResponse('URL is required', { status: 400 });
  }

  try {
    // 1. URL을 raw=1로 변경 (필수)
    const embeddableUrl = dropboxUrl.replace('dl=0', 'raw=1');

    // 2. Dropbox 서버에서 PDF 파일을 fetch (타임아웃 설정)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃
    
    const response = await fetch(embeddableUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PDF-Proxy/1.0)',
      }
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }

    // 3. 파일 내용을 ArrayBuffer로 가져옴
    const pdfBuffer = await response.arrayBuffer();

    // 4. 클라이언트에 PDF 파일로 응답
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="document.pdf"',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600', // 1시간 캐싱
        'X-Frame-Options': 'SAMEORIGIN',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('PDF Proxy Error:', error);
    return new NextResponse('Error fetching PDF from Dropbox', { status: 500 });
  }
} 