import { NextRequest, NextResponse } from "next/server"
import dropboxService from "@/lib/dropbox-service"
import { randomUUID } from "crypto"

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    console.log("파일 업로드 제출:", data)
    
    // 평가 데이터 검증
    if (!data.name || !data.employeeId || !data.language || !data.category) {
      return NextResponse.json(
        { error: "필수 정보가 누락되었습니다." },
        { status: 400 }
      )
    }

    if (!data.recordings || Object.keys(data.recordings).length === 0) {
      return NextResponse.json(
        { error: "녹음 파일이 없습니다." },
        { status: 400 }
      )
    }

    // 1. 초기 평가 데이터 생성 ('평가 대기' 상태)
    const initialEvaluationData = {
      candidateInfo: {
        name: data.name,
        employeeId: data.employeeId,
        language: data.language,
        category: data.category,
        submittedAt: data.submittedAt,
        recordingCount: data.recordingCount,
        scriptNumbers: data.scriptNumbers,
        comment: data.comment || "",
        duration: 0, // 파일 업로드의 경우 0으로 설정
        dropboxFiles: data.dropboxFiles || [], // 🔑 녹음 파일 메타데이터 포함
      },
      scores: {},
      categoryScores: {},
      totalScore: 0,
      grade: "N/A",
      comments: { korean: "", english: "" },
      evaluatedAt: new Date().toISOString(),
      evaluatedBy: null,
      status: "pending",
      recordings: data.recordings,
      dropboxFiles: data.dropboxFiles || [],
      isFileUpload: true,
    }

    // 2. Dropbox에 파일 업로드 (기존 녹음 제출과 동일한 로직)
    const uniqueId = randomUUID()
    const fileName = `evaluation_${data.employeeId}_${uniqueId}.json`
    const dropboxPath = `/evaluations/pending/${fileName}`

    const fileContent = JSON.stringify(initialEvaluationData, null, 2)
    const buffer = Buffer.from(fileContent, "utf-8")

    const dropboxResponse = await dropboxService.upload({
      path: dropboxPath,
      content: buffer,
    })

    console.log(`✅ [API] 파일 업로드 평가 파일 생성 완료: ${fileName}`)

    // 업로드된 실제 경로를 evaluationData에 반영 (검토요청 등에 필요)
    const savedPath = dropboxResponse?.path_display || dropboxResponse?.path_lower || dropboxPath;
    (initialEvaluationData as any).dropboxPath = savedPath
    if ((initialEvaluationData as any).candidateInfo) {
      (initialEvaluationData as any).candidateInfo.dropboxPath = savedPath
    }

    // 3. index.json에 메타데이터 append (동시성 안전하게, 최대 3회 재시도)
    const indexPath = "/evaluations/index.json"
    const newEntry = {
      employeeId: data.employeeId,
      name: data.name,
      language: data.language,
      category: data.category,
      submittedAt: data.submittedAt,
      dropboxPath: savedPath
    }
    let retry = 0
    let success = false
    while (retry < 3 && !success) {
      try {
        let indexData: any[] = []
        let rev = undefined
        try {
          const indexResult = await dropboxService.getIndexJson({ path: indexPath })
          indexData = Array.isArray(indexResult.entries) ? indexResult.entries : []
          rev = indexResult.rev
        } catch (e) {
          // index.json이 없으면 새로 생성
          indexData = []
          rev = undefined
        }
        indexData.push(newEntry)
        const indexBuffer = Buffer.from(JSON.stringify(indexData, null, 2), "utf-8")
        if (rev) {
          await dropboxService.overwriteIndexJson({ path: indexPath, content: indexBuffer, rev })
        } else {
          await dropboxService.overwrite({ path: indexPath, content: indexBuffer })
        }
        success = true
      } catch (e) {
        retry++
        if (retry >= 3) {
          console.error("index.json 업데이트 실패 (최대 재시도)", e)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "파일 업로드가 완료되었고, 평가 대기 목록에 추가되었습니다.",
      dropboxFile: dropboxResponse,
      evaluationId: `${data.employeeId}-${uniqueId}`,
    })

  } catch (error: any) {
    console.error("파일 업로드 처리 실패:", error)
    const errorMessage =
      error.response?.data?.error_summary ||
      error.message ||
      "알 수 없는 오류"
    return NextResponse.json(
      {
        success: false,
        error: "파일 업로드 처리 중 오류가 발생했습니다.",
        details: errorMessage,
      },
      { status: 500 }
    )
  }
} 