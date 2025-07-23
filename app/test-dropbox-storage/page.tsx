"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Upload, Download, CheckCircle, XCircle, AlertTriangle } from "lucide-react"

export default function TestDropboxStoragePage() {
  const [testData, setTestData] = useState({
    candidateId: `test-${Date.now()}`,
    candidateInfo: {
      name: "테스트 승무원",
      employeeId: "TEST001",
      language: "korean-english",
      category: "신규",
      submittedAt: new Date().toISOString(),
    },
    scores: {
      "korean-발음-자음": 8,
      "korean-발음-모음": 7,
      "korean-억양-억양": 9,
      "korean-전달력-전달력": 8,
      "english-발음_자음-자음": 7,
      "english-발음_모음-모음": 8,
    },
    categoryScores: {
      "korean-발음": 15,
      "korean-억양": 9,
      "korean-전달력": 8,
      "english-발음_자음": 7,
      "english-발음_모음": 8,
    },
    totalScore: 55,
    grade: "A등급",
    comments: {
      korean: "테스트 평가 결과입니다.",
      english: "This is a test evaluation result.",
    },
    evaluatedAt: new Date().toISOString(),
    evaluatedBy: "테스트 교관",
  })

  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadedEvaluations, setLoadedEvaluations] = useState<any[]>([])

  const handleSaveTest = async () => {
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/evaluations/save-dropbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testData),
      })

      if (!response.ok) {
        throw new Error(`저장 실패: ${response.status}`)
      }

      const data = await response.json()
      setResult(data)
      console.log("✅ 테스트 데이터 저장 성공:", data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류")
      console.error("❌ 테스트 데이터 저장 실패:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoadTest = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/evaluations/load-dropbox?limit=10")
      
      if (!response.ok) {
        throw new Error(`로드 실패: ${response.status}`)
      }

      const data = await response.json()
      setLoadedEvaluations(data.evaluations || [])
      console.log("✅ 평가 결과 로드 성공:", data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류")
      console.error("❌ 평가 결과 로드 실패:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="w-5 h-5 text-green-600" />
    ) : (
      <XCircle className="w-5 h-5 text-red-600" />
    )
  }

  const goBack = () => {
    window.location.href = "/"
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" onClick={goBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            뒤로가기
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dropbox 저장소 테스트</h1>
            <p className="text-gray-600">평가 결과의 Dropbox 저장 및 로드 기능을 테스트합니다.</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* 저장 테스트 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                저장 테스트
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  테스트 데이터
                </label>
                <Textarea
                  value={JSON.stringify(testData, null, 2)}
                  onChange={(e) => {
                    try {
                      setTestData(JSON.parse(e.target.value))
                    } catch (error) {
                      // JSON 파싱 실패 시 무시
                    }
                  }}
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>

              <Button 
                onClick={handleSaveTest} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? "저장 중..." : "Dropbox에 저장"}
              </Button>

              {result && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(true)}
                    <span className="font-medium text-green-800">저장 성공</span>
                  </div>
                  <div className="text-sm text-green-700">
                    <p>파일명: {result.fileName}</p>
                    <p>파일 ID: {result.fileId}</p>
                    <p>경로: {result.path}</p>
                    <p>생성 시간: {new Date(result.createdTime).toLocaleString()}</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(false)}
                    <span className="font-medium text-red-800">저장 실패</span>
                  </div>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 로드 테스트 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                로드 테스트
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={handleLoadTest} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? "로드 중..." : "Dropbox에서 로드"}
              </Button>

              {loadedEvaluations.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="font-medium">로드된 평가 결과 ({loadedEvaluations.length}개)</span>
                  </div>
                  
                  {loadedEvaluations.slice(0, 5).map((evaluation, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{evaluation.candidateInfo?.name}</span>
                        <Badge variant="secondary">{evaluation.grade}</Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>사번: {evaluation.candidateInfo?.employeeId}</p>
                        <p>총점: {evaluation.totalScore}</p>
                        <p>평가일: {new Date(evaluation.evaluatedAt).toLocaleDateString()}</p>
                        <p>Dropbox 파일: {evaluation.dropboxFileName}</p>
                      </div>
                    </div>
                  ))}
                  
                  {loadedEvaluations.length > 5 && (
                    <p className="text-sm text-gray-500">
                      ... 외 {loadedEvaluations.length - 5}개 더
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 설정 정보 */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              설정 정보
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">필요한 환경 변수</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• DROPBOX_TOKEN (필수)</li>
                  <li>• DROPBOX_APP_KEY (OAuth용)</li>
                  <li>• DROPBOX_APP_SECRET (OAuth용)</li>
                </ul>
                <p className="text-xs text-gray-500 mt-2">
                  이미 Dropbox OAuth가 설정되어 있으므로 바로 사용 가능합니다.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">API 엔드포인트</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• POST /api/evaluations/save-dropbox</li>
                  <li>• GET /api/evaluations/load-dropbox</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 