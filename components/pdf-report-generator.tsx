"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Download } from "lucide-react"

interface EvaluationSummary {
  id: string
  name: string
  employeeId: string
  language: string
  totalScore: number
  result: "Pass" | "Fail"
  evaluationDetails: any
  evaluatedAt: string
  evaluatorName: string
}

interface PDFReportGeneratorProps {
  evaluation: EvaluationSummary
}

export function PDFReportGenerator({ evaluation }: PDFReportGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const generatePDFReport = async () => {
    setIsGenerating(true)

    try {
      // jsPDF 라이브러리 동적 로드
      const { jsPDF } = await import("jspdf")

      // 한글 폰트 지원을 위한 설정
      const doc = new jsPDF()

      // 제목
      doc.setFontSize(20)
      doc.text("기내 방송 평가 결과서", 20, 30)

      // 기본 정보
      doc.setFontSize(12)
      doc.text(`평가 대상자: ${evaluation.name} (${evaluation.employeeId})`, 20, 50)
      doc.text(`언어: ${evaluation.language}`, 20, 60)
      doc.text(`평가 일시: ${evaluation.evaluatedAt}`, 20, 70)
      doc.text(`평가자: ${evaluation.evaluatorName}`, 20, 80)

      // 총점 및 결과
      doc.setFontSize(14)
      doc.text(`총점: ${evaluation.totalScore}/100`, 20, 100)
      doc.text(`결과: ${evaluation.result}`, 20, 110)

      // 상세 평가 항목
      doc.setFontSize(12)
      doc.text("상세 평가 항목:", 20, 130)

      let yPosition = 140
      const details = JSON.parse(evaluation.evaluationDetails)

      Object.entries(details).forEach(([category, scores]: [string, any]) => {
        doc.text(`${category}:`, 25, yPosition)
        yPosition += 10

        if (typeof scores === "object") {
          Object.entries(scores).forEach(([subcategory, score]: [string, any]) => {
            doc.text(`  - ${subcategory}: ${score}점`, 30, yPosition)
            yPosition += 8
          })
        } else {
          doc.text(`  점수: ${scores}점`, 30, yPosition)
          yPosition += 8
        }
        yPosition += 5
      })

      // 평가 의견 (있는 경우)
      if (evaluation.evaluationDetails.comment) {
        doc.text("평가 의견:", 20, yPosition + 10)
        doc.text(evaluation.evaluationDetails.comment, 20, yPosition + 20)
      }

      // PDF 다운로드
      doc.save(`평가결과서_${evaluation.name}_${evaluation.employeeId}.pdf`)
    } catch (error) {
      console.error("PDF 생성 오류:", error)
      alert("PDF 생성 중 오류가 발생했습니다.")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          평가 결과서 생성
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">평가 대상자:</span>
              <p>
                {evaluation.name} ({evaluation.employeeId})
              </p>
            </div>
            <div>
              <span className="font-medium">언어:</span>
              <p>{evaluation.language}</p>
            </div>
            <div>
              <span className="font-medium">총점:</span>
              <p className={`font-bold ${evaluation.result === "Pass" ? "text-green-600" : "text-red-600"}`}>
                {evaluation.totalScore}/100 ({evaluation.result})
              </p>
            </div>
            <div>
              <span className="font-medium">평가 일시:</span>
              <p>{evaluation.evaluatedAt}</p>
            </div>
          </div>

          <Button onClick={generatePDFReport} disabled={isGenerating} className="w-full">
            <Download className="w-4 h-4 mr-2" />
            {isGenerating ? "PDF 생성 중..." : "PDF 다운로드"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
