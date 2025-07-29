"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Download, User, Award, FileText } from "lucide-react"

interface EvaluationResultReportProps {
  evaluation: any
  onBack: () => void
  mode?: "evaluate" | "review" | "manage"
}

export function EvaluationResultReport({ evaluation, onBack, mode }: EvaluationResultReportProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getLanguageDisplay = (language: string) => {
    const displays: { [key: string]: string } = {
      "korean-english": "한/영",
      japanese: "일본어",
      chinese: "중국어",
    }
    return displays[language] || language
  }

  const getGradeColor = (grade: string) => {
    if (grade === "S등급") return "text-green-600 bg-green-50 border-green-200"
    if (grade === "A등급" || grade === "A") return "text-blue-600 bg-blue-50 border-blue-200"
    if (grade === "B등급" || grade === "B") return "text-yellow-600 bg-yellow-50 border-yellow-200"
    return "text-red-600 bg-red-50 border-red-200"
  }

  const downloadReport = () => {
    const reportData = {
      candidate: evaluation.candidateInfo,
      evaluation: {
        totalScore: evaluation.totalScore,
        grade: evaluation.grade,
        koreanScore: evaluation.koreanTotalScore,
        englishScore: evaluation.englishTotalScore,
        comments: evaluation.comments,
        evaluatedAt: evaluation.evaluatedAt,
        evaluatedBy: evaluation.evaluatedBy,
      },
      scores: evaluation.scores,
      categoryScores: evaluation.categoryScores,
    }

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `v85-evaluation-report-${evaluation.candidateInfo.employeeId}-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button onClick={onBack} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              목록으로
            </Button>
            <div className="flex items-center gap-3">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/JINAIR-kF1VjaXV8q3dDiZzY400yM6Ln9BiJ3.png"
                alt="JINAIR Logo"
                className="h-8 w-8 object-contain"
              />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">v85 평가 결과 보고서</h1>
                <p className="text-gray-600">상세 평가 결과 및 피드백</p>
              </div>
            </div>
          </div>
          <Button onClick={downloadReport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            보고서 다운로드
          </Button>
        </div>

        {/* 후보자 정보 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              후보자 정보
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">이름:</span>
                  <span className="font-semibold">{evaluation.candidateInfo.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">사번:</span>
                  <span className="font-semibold">{evaluation.candidateInfo.employeeId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">언어:</span>
                  <Badge variant="outline">{getLanguageDisplay(evaluation.candidateInfo.language)}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">구분:</span>
                  <span className="font-semibold">{evaluation.candidateInfo.category}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">제출일시:</span>
                  <span className="font-semibold">{formatDate(evaluation.candidateInfo.submittedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">평가일시:</span>
                  <span className="font-semibold">{formatDate(evaluation.evaluatedAt)}</span>
                </div>
                {mode !== "review" && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">평가자:</span>
                    <span className="font-semibold">{evaluation.evaluatedBy}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">평가 기준:</span>
                  <Badge className="bg-blue-100 text-blue-800">v85</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 평가 결과 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              v85 평가 결과
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                <div className="text-3xl font-bold text-blue-600 mb-2">{evaluation.totalScore}</div>
                <div className="text-blue-700">
                  총점 ({evaluation.candidateInfo.language === "korean-english" ? "200점 만점" : "100점 만점"})
                </div>
              </div>

              {evaluation.candidateInfo.language === "korean-english" && (
                <>
                  <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                    <div className="text-3xl font-bold text-green-600 mb-2">{evaluation.koreanTotalScore || 0}</div>
                    <div className="text-green-700">한국어 점수 (100점 만점)</div>
                  </div>
                  <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
                    <div className="text-3xl font-bold text-purple-600 mb-2">{evaluation.englishTotalScore || 0}</div>
                    <div className="text-purple-700">영어 점수 (100점 만점)</div>
                  </div>
                </>
              )}

              <div
                className={`text-center p-6 rounded-xl border-2 ${
                  evaluation.candidateInfo.language === "korean-english" ? "md:col-span-3" : "md:col-span-2"
                }`}
              >
                <Badge className={`text-2xl px-6 py-3 ${getGradeColor(evaluation.grade)}`}>{evaluation.grade}</Badge>
                <div className="text-gray-700 mt-2">최종 등급</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 카테고리별 점수 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>v85 카테고리별 상세 점수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(evaluation.categoryScores || {}).map(([category, score]) => (
                <div key={category} className="p-4 border rounded-lg bg-gray-50">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{category.replace("korean-", "").replace("english-", "")}</span>
                    <Badge variant="outline" className="font-bold">
                      {score}/20
                    </Badge>
                  </div>
                  <div className="mt-2 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${((score as number) / 20) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 평가 의견 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              v85 평가 의견
            </CardTitle>
          </CardHeader>
          <CardContent>
            {typeof evaluation.comments === "string" ? (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="whitespace-pre-wrap">{evaluation.comments}</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">한국어 평가 의견</h4>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="whitespace-pre-wrap">{evaluation.comments.korean}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">영어 평가 의견</h4>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="whitespace-pre-wrap">{evaluation.comments.english}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 푸터 */}
        <div className="text-center text-sm text-gray-600">
          <p>JINAIR 기내 방송 평가 시스템 v85 | 생성일: {formatDate(new Date().toISOString())}</p>
        </div>
      </div>
    </div>
  )
}
