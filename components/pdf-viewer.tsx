"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { pdfDatabaseService } from "@/lib/pdf-database-service"
import { Maximize2, AlertCircle, RefreshCw } from "lucide-react"

interface PDFViewerProps {
  language: string
  scriptNumber: number
  currentLanguageMode?: "korean" | "english"
  className?: string
  onLoadComplete?: () => void
}

export function PDFViewer({ language, scriptNumber, currentLanguageMode, className = "", onLoadComplete }: PDFViewerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPDF()
  }, [language, scriptNumber])

  const loadPDF = async () => {
    setIsLoading(true)
    setError(null)

    try {
      console.log(`🔍 PDF 로드 시도: ${language} ${scriptNumber}번 (현재 모드: ${currentLanguageMode || 'N/A'})`)
      
      const pdfUrl = await pdfDatabaseService.getPDFUrl(language, scriptNumber)
      
      console.log(`✅ PDF URL 생성 성공: ${pdfUrl}`)
      setPdfUrl(pdfUrl)
      setIsLoading(false)
      onLoadComplete?.()
      
    } catch (error) {
      console.error("❌ PDF 로드 실패:", error)
      setError(error instanceof Error ? error.message : "PDF 로드 중 오류가 발생했습니다")
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
      window.open(pdfUrl, '_blank')
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
                <p>2. Dropbox scripts 폴더에 파일이 올바르게 업로드되었는지 확인</p>
                <p>3. 파일명 형식 확인: {language === "korean-english" ? "한영_문안1_KR.pdf / 한영_문안1_EN.pdf" : language === "japanese" ? "일본어_문안1.pdf" : "중국어_문안1.pdf"}</p>
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
      {/* PDF 컨테이너 */}
      <div className={`bg-white rounded-lg overflow-hidden ${isFullscreen ? "fixed inset-0 z-50" : ""}`}>
        {isFullscreen && (
          <div className="flex justify-end p-2 bg-gray-50">
            <Button size="sm" variant="outline" onClick={toggleFullscreen}>
              닫기
            </Button>
          </div>
        )}
        <div className="relative">
          {/* 로딩 오버레이 */}
          {isLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-200 border-t-blue-600 mb-3"></div>
              <div className="text-sm text-gray-600">문안을 불러오는 중입니다...</div>
            </div>
          )}

          {/* PDF iframe */}
          {pdfUrl && (
            <div className={`${isFullscreen ? "h-[calc(100vh-60px)]" : "h-[760px] md:h-[860px] lg:h-[960px]"}`}>
              <iframe
                src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1&statusbar=0&menubar=0&view=Fit`}
                className="w-full h-full border-0"
                title={`PDF Viewer - ${language} ${scriptNumber}번`}
                onLoad={() => {
                  console.log("✅ PDF iframe 로드 완료")
                  setIsLoading(false)
                }}
                onError={handleIframeError}
                style={{ backgroundColor: 'white' }}
              />
            </div>
          )}

          {/* 전체화면 버튼 */}
          {pdfUrl && !isFullscreen && (
            <div className="absolute top-4 right-4 z-20">
              <Button size="sm" variant="outline" onClick={toggleFullscreen}>
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}