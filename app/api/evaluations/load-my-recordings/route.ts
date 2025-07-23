import { NextRequest, NextResponse } from "next/server";
import dropboxService from "@/lib/dropbox-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    if (!employeeId) {
      return NextResponse.json({ error: "employeeId 쿼리 파라미터가 필요합니다." }, { status: 400 });
    }
    // index.json 읽기
    let indexData: any[] = [];
    try {
      const indexResult = await dropboxService.getIndexJson({ path: "/evaluations/index.json" });
      indexData = Array.isArray(indexResult.entries) ? indexResult.entries : [];
    } catch (e) {
      // index.json이 없으면 빈 배열 반환
      indexData = [];
    }
    // employeeId로 필터링
    const myRecords = indexData.filter(entry => entry.employeeId === employeeId);
    return NextResponse.json({ success: true, records: myRecords });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "알 수 없는 오류" }, { status: 500 });
  }
} 