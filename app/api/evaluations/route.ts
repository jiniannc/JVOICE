import { type NextRequest, NextResponse } from "next/server"

export async function GET() {
  // 실제로는 데이터베이스에서 평가 대기 목록을 가져옵니다
  const pendingEvaluations = [
    {
      id: 1,
      name: "김승무",
      employeeId: "CA001",
      language: "korean-english",
      submittedAt: "2024-01-15 14:30",
      status: "pending",
    },
    {
      id: 2,
      name: "박항공",
      employeeId: "CA002",
      language: "japanese",
      submittedAt: "2024-01-15 15:15",
      status: "pending",
    },
  ]

  return NextResponse.json(pendingEvaluations)
}

export async function POST(request: NextRequest) {
  try {
    const evaluationData = await request.json()

    // 실제로는 데이터베이스에 평가 결과를 저장하고
    // Google Sheets API를 사용하여 스프레드시트에 업데이트합니다

    console.log("Evaluation submitted:", evaluationData)

    return NextResponse.json({ success: true, message: "Evaluation submitted successfully" })
  } catch (error) {
    console.error("Evaluation submission error:", error)
    return NextResponse.json({ success: false, error: "Submission failed" }, { status: 500 })
  }
}
