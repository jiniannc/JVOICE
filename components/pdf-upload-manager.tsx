"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Upload, FileText, CheckCircle, AlertCircle, Trash2, Database, FolderOpen, RefreshCw } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface UploadedFile {
  id: string
  language: string
  scriptNumber: number
  fileName: string
  fileSize: number
  uploadedAt: string
}

export function PDFUploadManager() {
  const [uploadStatus, setUploadStatus] = useState({
    isUploading: false,
    progress: 0,
    currentFile: "",
  })
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 컴포넌트 마운트 시 업로드된 파일 목록 로드
  useEffect(() => {
    loadUploadedFiles()
  }, [])

  const loadUploadedFiles = async () => {
    try {
      // 캐시 방지를 위해 타임스탬프 추가
      const timestamp = new Date().getTime()
      const response = await fetch(`/api/pdf-scripts?t=${timestamp}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      if (response.ok) {
        const data = await response.json()
        console.log('📋 PDF 파일 목록 새로고침:', data.files?.length || 0, '개 파일')
        setUploadedFiles(data.files || [])
      }
    } catch (error) {
      console.error("업로드된 파일 목록 로드 실패:", error)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const pdfFiles = files.filter(file => file.type === 'application/pdf')
    
    if (pdfFiles.length !== files.length) {
      alert("PDF 파일만 업로드할 수 있습니다.")
    }
    
    setSelectedFiles(pdfFiles)
  }

  const parseFileName = (fileName: string): { language: string; scriptNumber: number } | null => {
    // 하드코딩된 파일명 패턴: "한영_문안1.pdf", "일본어_문안2.pdf", "중국어_문안3.pdf"
    const patterns = [
      /^(한영|한국어영어)_문안(\d+)\.pdf$/i,
      /^(일본어|japanese)_문안(\d+)\.pdf$/i,
      /^(중국어|chinese)_문안(\d+)\.pdf$/i,
    ]

    for (const pattern of patterns) {
      const match = fileName.match(pattern)
      if (match) {
        const lang = match[1].toLowerCase()
        const number = parseInt(match[2])
        
        let language = ""
        if (lang.includes("한영") || lang.includes("한국어영어")) {
          language = "korean-english"
        } else if (lang.includes("일본어") || lang === "japanese") {
          language = "japanese"
        } else if (lang.includes("중국어") || lang === "chinese") {
          language = "chinese"
        }
        
        if (language && number > 0) {
          return { language, scriptNumber: number }
        }
      }
    }
    
    return null
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      alert("업로드할 파일을 선택해주세요.")
      return
    }

    setUploadStatus({ isUploading: true, progress: 0, currentFile: "" })

    try {
      const totalFiles = selectedFiles.length
      let successCount = 0
      let errorCount = 0
      const errors: string[] = []

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        const parsed = parseFileName(file.name)
        
        setUploadStatus(prev => ({
          ...prev,
          progress: (i / totalFiles) * 100,
          currentFile: file.name
        }))

        if (!parsed) {
          errors.push(`${file.name}: 파일명 형식이 올바르지 않습니다. (예: 한영_문안1.pdf)`)
          errorCount++
          continue
        }

        try {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('language', parsed.language)
          formData.append('scriptNumber', parsed.scriptNumber.toString())

          const response = await fetch('/api/pdf-scripts/upload', {
            method: 'POST',
            body: formData,
          })

          if (response.ok) {
            const responseData = await response.json()
            successCount++
            
            // 업로드 성공 시 캐시 초기화 신호가 있으면 처리
            if (responseData.clearCache) {
              console.log(`🗑️ PDF 업로드 완료 - 캐시 초기화: ${parsed.language} 문안 ${parsed.scriptNumber}번`)
              // 전역 이벤트 발송으로 모든 컴포넌트에 캐시 초기화 신호 전달
              window.dispatchEvent(new CustomEvent('pdfCacheInvalidate', {
                detail: { 
                  language: parsed.language, 
                  scriptNumber: parsed.scriptNumber,
                  action: 'upload'
                }
              }))
            }
          } else {
            const errorData = await response.json()
            errors.push(`${file.name}: ${errorData.error || '업로드 실패'}`)
            errorCount++
          }
        } catch (error) {
          errors.push(`${file.name}: 네트워크 오류`)
          errorCount++
        }
      }

      setUploadStatus({ isUploading: false, progress: 100, currentFile: "" })

      // 결과 메시지 표시
      let message = `업로드 완료!\n성공: ${successCount}개, 실패: ${errorCount}개`
      if (errors.length > 0) {
        message += `\n\n오류 내역:\n${errors.join('\n')}`
      }
      alert(message)

      // 파일 목록 새로고침 (약간의 지연 후)
      setTimeout(async () => {
        await loadUploadedFiles()
      }, 500)
      
      // 선택된 파일 초기화
      setSelectedFiles([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

    } catch (error) {
      console.error("업로드 중 오류:", error)
      setUploadStatus({ isUploading: false, progress: 0, currentFile: "" })
      alert("업로드 중 오류가 발생했습니다.")
    }
  }

  const handleDeleteFile = async (fileId: string, fileName: string) => {
    if (!confirm(`${fileName} 파일을 삭제하시겠습니까?`)) {
      return
    }

    try {
      const response = await fetch(`/api/pdf-scripts/${fileId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        const responseData = await response.json()
        alert("파일이 삭제되었습니다.")
        
        // 삭제 성공 시 캐시 초기화 신호가 있으면 처리
        if (responseData.clearCache && responseData.file) {
          console.log(`🗑️ PDF 삭제 완료 - 캐시 초기화: ${responseData.file.language} 문안 ${responseData.file.scriptNumber}번`)
          // 전역 이벤트 발송으로 모든 컴포넌트에 캐시 초기화 신호 전달
          window.dispatchEvent(new CustomEvent('pdfCacheInvalidate', {
            detail: { 
              language: responseData.file.language, 
              scriptNumber: responseData.file.scriptNumber,
              action: 'delete'
            }
          }))
        }
        
        // 파일 목록 새로고침 (약간의 지연 후)
        setTimeout(async () => {
          await loadUploadedFiles()
        }, 500)
      } else {
        const errorData = await response.json()
        alert(`삭제 실패: ${errorData.error || '알 수 없는 오류'}`)
      }
    } catch (error) {
      console.error("파일 삭제 중 오류:", error)
      alert("파일 삭제 중 오류가 발생했습니다.")
    }
  }

  const getLanguageDisplay = (language: string) => {
    switch (language) {
      case 'korean-english': return '한영'
      case 'japanese': return '일본어'
      case 'chinese': return '중국어'
      default: return language
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Card className="mb-6 bg-white shadow-lg rounded-2xl hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="pb-4 bg-gray-50/80 rounded-t-2xl">
        <CardTitle className="flex items-center gap-3 text-lg">
          <Database className="w-6 h-6 text-purple-600" />
          <span className="text-xl font-bold text-gray-800">PDF 문안 업로드</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {/* 통계 정보 */}
        <div className="grid md:grid-cols-3 gap-3 mb-4 text-sm">
          <div className="text-center p-3 bg-blue-50 border border-blue-100 rounded-lg">
            <div className="font-bold text-lg text-blue-600">{uploadedFiles.length}</div>
            <div className="text-xs text-gray-600">총 문안 파일</div>
          </div>
          <div className="text-center p-3 bg-green-50 border border-green-100 rounded-lg">
            <div className="font-bold text-lg text-green-600">
              {uploadedFiles.filter(f => f.language === 'korean-english').length}
            </div>
            <div className="text-xs text-gray-600">한영 문안</div>
          </div>
          <div className="text-center p-3 bg-purple-50 border border-purple-100 rounded-lg">
            <div className="font-bold text-lg text-purple-600">
              {uploadedFiles.filter(f => f.language === 'japanese').length + 
               uploadedFiles.filter(f => f.language === 'chinese').length}
            </div>
            <div className="text-xs text-gray-600">외국어 문안</div>
          </div>
        </div>

        {/* 파일 선택 영역 */}
        <div className="mb-4 p-4 bg-gray-50/80 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-center">
            <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-3">
              PDF 파일을 선택하여 업로드하세요
            </p>
            <p className="text-xs text-gray-500 mb-4">
              파일명 형식: 한영_문안1.pdf, 일본어_문안2.pdf, 중국어_문안3.pdf
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="mb-3"
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              파일 선택
            </Button>
            
            {selectedFiles.length > 0 && (
              <div className="mt-3 text-left">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  선택된 파일 ({selectedFiles.length}개):
                </p>
                <div className="max-h-32 overflow-y-auto bg-white rounded border p-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="text-xs text-gray-600 py-1">
                      {file.name} ({formatFileSize(file.size)})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 업로드 진행률 */}
        {uploadStatus.isUploading && (
          <div className="space-y-3 mb-4">
            <div className="flex justify-between text-sm">
              <span>업로드 진행률</span>
              <span className="font-bold">{Math.round(uploadStatus.progress)}%</span>
            </div>
            <Progress value={uploadStatus.progress} className="h-3" />
            <p className="text-sm text-gray-600 text-center">
              {uploadStatus.currentFile && `현재: ${uploadStatus.currentFile}`}
            </p>
          </div>
        )}

        {/* 업로드 버튼 */}
        <Button
          onClick={handleUpload}
          disabled={uploadStatus.isUploading || selectedFiles.length === 0}
          className="w-full h-12 text-lg font-semibold mb-4"
        >
          {uploadStatus.isUploading ? (
            <>
              <Upload className="w-5 h-5 mr-2 animate-pulse" />
              업로드 중...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5 mr-2" />
              PDF 파일 업로드 ({selectedFiles.length}개)
            </>
          )}
        </Button>

        {/* 업로드된 파일 목록 */}
        <div className="p-4 bg-gray-50/80 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-800">업로드된 PDF 파일 목록</h4>
            <Button
              onClick={loadUploadedFiles}
              variant="outline"
              size="sm"
              className="h-7 px-2"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              새로고침
            </Button>
          </div>
          <ScrollArea className="h-64 rounded-md border bg-white p-2">
            {uploadedFiles.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-8">
                업로드된 파일이 없습니다.
              </div>
            ) : (
              <div className="space-y-2">
                {uploadedFiles
                  .sort((a, b) => {
                    // 언어별로 먼저 정렬, 그 다음 문안 번호로 정렬
                    if (a.language !== b.language) {
                      return a.language.localeCompare(b.language)
                    }
                    return a.scriptNumber - b.scriptNumber
                  })
                  .map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-red-500" />
                        <div>
                          <div className="font-medium text-sm">
                            {getLanguageDisplay(file.language)} 문안 {file.scriptNumber}번
                          </div>
                          <div className="text-xs text-gray-500">
                            {file.fileName} • {formatFileSize(file.fileSize)}
                          </div>
                          <div className="text-xs text-gray-400">
                            {formatDate(file.uploadedAt)}
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleDeleteFile(file.id, file.fileName)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  )
}






