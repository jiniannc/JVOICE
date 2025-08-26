import { NextRequest, NextResponse } from "next/server";
import dropboxService from "@/lib/dropbox-service";
import { randomUUID } from "crypto";

async function isIpAllowed(request: NextRequest): Promise<boolean> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/devices/allowlist?mode=check`, {
      headers: {
        "x-forwarded-for": request.headers.get("x-forwarded-for") || "",
        "x-real-ip": request.headers.get("x-real-ip") || "",
      },
      cache: "no-store",
    });
    const data = await res.json();
    return !!data.allowed;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // 실시간 녹음 제출은 허용된 IP만 가능 (파일 업로드 경로는 별도 API로 예외)
    // 임시로 IP 체크 비활성화 - 녹음 제출 테스트용
    /*
    const allowed = await isIpAllowed(request);
    if (!allowed) {
      return NextResponse.json({ error: "허용되지 않은 컴퓨터에서의 녹음 제출입니다." }, { status: 403 });
    }
    */

    const submissionData = await request.json();
    console.log("녹음 제출:", submissionData);

    // 1. 초기 평가 데이터 생성 ('평가 대기' 상태)
    const initialEvaluationData = {
      // candidateId는 더 이상 사용하지 않으므로 제거
      candidateInfo: submissionData,
      scores: {},
      categoryScores: {},
      totalScore: 0,
      grade: "N/A",
      comments: { korean: "", english: "" },
      evaluatedAt: new Date().toISOString(),
      evaluatedBy: null,
      status: "pending",
    };

    // 2. Dropbox에 파일 업로드
    const uniqueId = randomUUID();
    const fileName = `evaluation_${submissionData.employeeId}_${uniqueId}.json`;
    const dropboxPath = `/evaluations/pending/${fileName}`;

    const fileContent = JSON.stringify(initialEvaluationData, null, 2);
    const buffer = Buffer.from(fileContent, "utf-8");

    const dropboxResponse = await dropboxService.upload({
      path: dropboxPath,
      content: buffer,
    });

    console.log(`✅ [API] 초기 평가 파일 생성 완료: ${fileName}`);

    // 3. index.json 업데이트 (동일 로직, 최대 3회 재시도)
    const indexPath = "/evaluations/index.json";
    const newEntry = {
      employeeId: submissionData.employeeId,
      name: submissionData.name,
      language: submissionData.language,
      category: submissionData.category,
      submittedAt: submissionData.submittedAt,
      dropboxPath: dropboxResponse?.path_display || dropboxResponse?.path_lower || dropboxPath,
    };
    let retry = 0;
    let success = false;
    while (retry < 3 && !success) {
      try {
        let indexData: any[] = [];
        let rev = undefined;
        try {
          const idx = await dropboxService.getIndexJson({ path: indexPath });
          indexData = Array.isArray(idx.entries) ? idx.entries : [];
          rev = idx.rev;
        } catch (e) {
          indexData = [];
          rev = undefined;
        }
        indexData.push(newEntry);
        const idxBuf = Buffer.from(JSON.stringify(indexData, null, 2), "utf-8");
        if (rev) {
          await dropboxService.overwriteIndexJson({ path: indexPath, content: idxBuf, rev });
        } else {
          await dropboxService.overwrite({ path: indexPath, content: idxBuf });
        }
        success = true;
      } catch (e) {
        retry++;
      }
    }

    // 녹음 제출 후 평가 목록 캐시 무효화
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/evaluations/load-dropbox?invalidate=true`, {
        method: "DELETE",
        cache: "no-store"
      });
      console.log("✅ [API] 평가 목록 캐시 무효화 요청 완료");
    } catch (error) {
      console.warn("⚠️ [API] 캐시 무효화 실패:", error);
    }

    return NextResponse.json({
      success: true,
      message: "녹음이 제출되었고, 평가 대기 목록에 추가되었습니다.",
      dropboxFile: dropboxResponse,
    });
  } catch (error: any) {
    console.error("녹음 제출 처리 실패:", error);
    const errorMessage =
      error.response?.data?.error_summary ||
      error.message ||
      "알 수 없는 오류";
    return NextResponse.json(
      {
        success: false,
        error: "녹음 제출 처리 중 오류가 발생했습니다.",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
