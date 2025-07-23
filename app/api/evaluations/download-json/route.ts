import { NextRequest, NextResponse } from "next/server";
import dropboxService from "@/lib/dropbox-service";

export async function POST(request: NextRequest) {
  try {
    const { filePath } = await request.json();
    if (!filePath) {
      return NextResponse.json({ error: "filePath required" }, { status: 400 });
    }
    const evaluation = await dropboxService.download({ path: filePath });
    return NextResponse.json({ success: true, evaluation });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "download error" }, { status: 500 });
  }
} 