"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
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
  }, [language, scriptNumber]) // currentLanguageMode 제거 - 한/영 언어에서 한국어/영어 전환 시 PDF 리로드 방지

    const loadPDF = async () => {
    setIsLoading(true)
    setError(null)

    try {
      console.log(`🔍 PDF 로드 시도: ${language} ${scriptNumber}번 (현재 모드: ${currentLanguageMode || 'N/A'})`)
      
      // 파일명 생성 (한/영 언어는 동일한 PDF 파일 사용)
      let fileName = ""
      if (language === "korean-english") {
        fileName = `한영_문안${scriptNumber}.pdf`
      } else if (language === "japanese") {
        fileName = `일본어_문안${scriptNumber}.pdf`
      } else if (language === "chinese") {
        fileName = `중국어_문안${scriptNumber}.pdf`
      }

      console.log(`🔍 찾는 파일명: ${fileName}`)
      
      // 파일 존재 확인을 건너뛰고 바로 공유 링크 생성 시도
      const dropboxPath = `/scripts/${fileName}`
      
      try {
        // 새로운 공유 링크 생성 API 사용
        const shareResponse = await fetch('/api/dropbox-share', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            path: dropboxPath
          })
        })
        
        if (shareResponse.ok) {
          const shareData = await shareResponse.json()
          if (shareData.url) {
            // Proxy API를 통해 PDF를 가져오도록 URL 설정
            const proxyUrl = `/api/pdf-proxy?url=${encodeURIComponent(shareData.url)}`
            setPdfUrl(proxyUrl)
            console.log("✅ PDF Proxy URL 설정됨")
          } else {
            throw new Error('공유 링크를 생성할 수 없습니다.')
          }
        } else {
          throw new Error(`공유 링크 생성 실패: ${shareResponse.status}`)
        }
      } catch (shareError) {
        console.warn("⚠️ PDF 공유 링크 생성 실패:", shareError)
        setError("PDF 공유 링크 생성 중 오류가 발생했습니다.")
      }
      
      // 로딩 종료는 iframe onLoad에서 처리
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
      // Dropbox URL을 새 탭에서 열기
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

          {/* iframe 또는 플레이스홀더 */}
          {pdfUrl ? (
            <iframe
              src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1&statusbar=0&menubar=0&view=Fit`}
              className={`w-full border-0 ${isFullscreen ? "h-screen" : "h-[760px] md:h-[860px] lg:h-[960px]"}`}
              title={`PDF Viewer - ${language} ${scriptNumber}번`}
              onLoad={() => {
                console.log("✅ PDF iframe 로드 완료")
                setIsLoading(false)
                onLoadComplete?.() // 부모 컴포넌트에 로딩 완료 알림
              }}
              onError={handleIframeError}
              style={{
                ...(isFullscreen ? { transform: "scale(1.2)", transformOrigin: "center" } : {}),
                backgroundColor: 'white'
              }}
            />
          ) : (
            <div className={`${isFullscreen ? "h-screen" : "h-[400px]"}`}></div>
          )}
        </div>
      </div>
    </div>
  )
}
