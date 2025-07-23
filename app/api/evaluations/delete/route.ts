import { NextRequest, NextResponse } from "next/server";
import dropboxService from "@/lib/dropbox-service";

export async function POST(request: NextRequest) {
  try {
    const { submissionId, dropboxPath } = await request.json();
    
    console.log("🗑️ [API] 삭제 요청:", { submissionId, dropboxPath });

    if (!dropboxPath) {
      return NextResponse.json(
        { success: false, error: "Dropbox 경로가 없습니다." },
        { status: 400 }
      );
    }

    // 1. 기존 파일을 deleted 폴더로 이동
    const fileName = dropboxPath.split('/').pop();
    const deletedPath = `/evaluations/deleted/${fileName}`;
    
    console.log("📁 [API] 파일 이동:", { from: dropboxPath, to: deletedPath });

    // Dropbox에서 파일 이동
    const moveResult = await dropboxService.move({
      from: dropboxPath,
      to: deletedPath,
    });

    console.log("✅ [API] 파일 이동 완료:", moveResult);

    return NextResponse.json({
      success: true,
      message: "녹음 제출이 삭제되었습니다.",
      deletedPath: deletedPath,
    });

  } catch (error: any) {
    console.error("❌ [API] 삭제 처리 실패:", error);
    
    const errorMessage = error.response?.data?.error_summary || 
                        error.message || 
                        "알 수 없는 오류";
    
    return NextResponse.json(
      {
        success: false,
        error: "삭제 처리 중 오류가 발생했습니다.",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
} 