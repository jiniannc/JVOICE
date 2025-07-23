"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Maximize2, AlertCircle, RefreshCw } from "lucide-react"
import { pdfSyncService } from "@/lib/pdf-sync-service"

interface PDFViewerProps {
  language: string
  scriptNumber: number
  currentLanguageMode?: "korean" | "english"
  className?: string
}

export function PDFViewer({ language, scriptNumber, currentLanguageMode, className = "" }: PDFViewerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPDF()
  }, [language, scriptNumber, currentLanguageMode])

  const loadPDF = () => {
    setIsLoading(true)
    setError(null)

    try {
      console.log(`🔍 PDF 로드 시도: ${language} ${scriptNumber}번`)
      
      const url = pdfSyncService.getPDFUrl(language, scriptNumber, currentLanguageMode)
      console.log(`📄 PDF URL: ${url}`)
      
      if (url && !url.includes("placeholder.svg")) {
        setPdfUrl(url)
        console.log("✅ Google Drive Preview URL 설정됨")
      } else {
        console.warn("⚠️ 플레이스홀더 URL 반환됨")
        setError(`${language} 언어의 문안 ${scriptNumber}을(를) 찾을 수 없습니다.`)
      }
      
      setTimeout(() => setIsLoading(false), 1000)
    } catch (err) {
      console.error("❌ PDF 로드 오류:", err)
      setError("PDF 로딩 중 오류가 발생했습니다.")
      setIsLoading(false)
    }
  }

  const handleIframeError = () => {
    console.error("❌ PDF iframe 로드 실패 - CSP 정책 또는 권한 문제")
    setError("PDF 파일에 접근할 수 없습니다. 새 탭에서 열어보세요.")
    setIsLoading(false)
  }

  const openInNewTab = () => {
    if (pdfUrl) {
      // preview URL을 view URL로 변환하여 새 탭에서 열기
      const viewUrl = pdfUrl.replace('/preview', '/view')
      window.open(viewUrl, '_blank')
    }
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const retryLoad = () => {
    loadPDF()
  }

  if (error) {
    return (
      <div className={`relative ${className}`}>
        <div className="flex items-center justify-center bg-red-50 rounded-lg p-8 min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-700 font-medium mb-2">PDF를 불러올 수 없습니다</p>
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <div className="space-y-2">
              <div className="flex gap-2 justify-center">
                <Button onClick={retryLoad} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  다시 시도
                </Button>
                {pdfUrl && (
                  <Button onClick={openInNewTab} variant="outline" size="sm">
                    새 탭에서 열기
                  </Button>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-4 p-3 bg-gray-100 rounded">
                <p className="font-medium mb-2">해결 방법:</p>
                <p>1. "새 탭에서 열기" 버튼으로 PDF 직접 확인</p>
                <p>2. Google Drive 폴더를 "링크가 있는 모든 사용자"로 공유</p>
                <p>3. 파일명 형식 확인: {language === "korean-english" ? "한영_문안1.pdf" : language === "japanese" ? "일본어_문안1.pdf" : "중국어_문안1.pdf"}</p>
                <p>4. 브라우저 보안 정책으로 인해 iframe에서 차단될 수 있음</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">PDF 로딩 중...</p>
            <p className="text-xs text-gray-500 mt-1">{language} {scriptNumber}번</p>
          </div>
        </div>
      )}

      {/* PDF 컨트롤 */}
      <div className="flex items-center justify-between p-2 bg-gray-50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{scriptNumber}번 문안</span>
          {currentLanguageMode && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              {currentLanguageMode === "korean" ? "🇰🇷 한국어" : "🇺🇸 English"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={toggleFullscreen}>
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* PDF iframe */}
      <div className={`bg-white rounded-b-lg overflow-hidden ${isFullscreen ? "fixed inset-0 z-50" : ""}`}>
        {isFullscreen && (
          <div className="flex justify-end p-2 bg-gray-50">
            <Button size="sm" variant="outline" onClick={toggleFullscreen}>
              닫기
            </Button>
          </div>
        )}
        {pdfUrl && (
          <iframe
            src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
            className={`w-full border-0 ${isFullscreen ? "h-screen" : "h-96 md:h-[500px] lg:h-[600px]"}`}
            title={`PDF Viewer - ${language} ${scriptNumber}번`}
            onLoad={() => {
              console.log("✅ PDF iframe 로드 완료")
              setIsLoading(false)
            }}
            onError={handleIframeError}
            style={isFullscreen ? { transform: "scale(1.2)", transformOrigin: "center" } : {}}
          />
        )}
      </div>
    </div>
  )
}
