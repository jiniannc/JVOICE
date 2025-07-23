"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { RefreshCw, FileText, CheckCircle, AlertCircle, Download, Clock, DatabaseZap } from "lucide-react"
import { pdfSyncService } from "@/lib/pdf-sync-service"
import { ScrollArea } from "@/components/ui/scroll-area"

export function PDFSyncManager() {
  const [syncStatus, setSyncStatus] = useState({
    isUpToDate: false,
    lastSync: null as string | null,
    totalFiles: 0,
    isLoading: false,
    progress: 0,
  })
  const [syncedFiles, setSyncedFiles] = useState([] as { name: string; lastModified: string }[])

  useEffect(() => {
    checkSyncStatus()
    // 동기화된 파일 목록도 불러오기
    const files = pdfSyncService.getSyncedFiles()
    setSyncedFiles(files.map(f => ({ name: f.name, lastModified: f.lastModified })))
  }, [])

  const checkSyncStatus = async () => {
    try {
      const lastSync = pdfSyncService.getLastSyncTime()
      const totalFiles = pdfSyncService.getSyncedFiles().length
      const isUpToDate = lastSync ? new Date().getTime() - new Date(lastSync).getTime() < 24 * 60 * 60 * 1000 : false

      setSyncStatus({
        isUpToDate,
        lastSync,
        totalFiles,
        isLoading: false,
        progress: 0,
      })
    } catch (error) {
      console.error("PDF 동기화 상태 확인 실패:", error)
    }
  }

  const handleSync = async () => {
    setSyncStatus((prev) => ({ ...prev, isLoading: true, progress: 0 }))

    try {
      // 진행률 시뮬레이션
      const progressInterval = setInterval(() => {
        setSyncStatus((prev) => ({
          ...prev,
          progress: Math.min(prev.progress + Math.random() * 20, 90),
        }))
      }, 500)

      // 실제 동기화 실행
      await pdfSyncService.syncPDFFiles()

      clearInterval(progressInterval)
      setSyncStatus((prev) => ({ ...prev, progress: 100 }))

      // 상태 업데이트
      setTimeout(() => {
        checkSyncStatus()
      }, 1000)

      console.log("✅ PDF 동기화 완료")
    } catch (error) {
      console.error("❌ PDF 동기화 실패:", error)
      setSyncStatus((prev) => ({ ...prev, isLoading: false, progress: 0 }))
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "동기화 필요"
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
          <DatabaseZap className="w-6 h-6 text-purple-600" />
          <span className="text-xl font-bold text-gray-800">PDF 문안 동기화</span>
          </CardTitle>
        </CardHeader>
      <CardContent className="pt-4">
        <div className="grid md:grid-cols-4 gap-3 mb-4 text-sm">
          <div className="text-center p-3 bg-blue-50 border border-blue-100 rounded-lg">
            <div className="font-bold text-lg text-blue-600">{syncStatus.totalFiles}</div>
            <div className="text-xs text-gray-600">총 문안 파일</div>
            </div>
          <div className="text-center p-3 bg-green-50 border border-green-100 rounded-lg">
              <div className="flex items-center justify-center gap-1">
                {syncStatus.isUpToDate ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                )}
              <div className="text-sm font-semibold text-green-700">{syncStatus.isUpToDate ? "최신" : "업데이트 필요"}</div>
            </div>
            <div className="text-xs text-gray-600">동기화 상태</div>
          </div>
          <div className="text-center p-3 bg-gray-100 border rounded-lg">
              <div className="flex items-center justify-center gap-1">
              <Clock className="w-4 h-4 text-gray-500" />
              <div className="text-sm font-semibold text-gray-600">{formatDate(syncStatus.lastSync)}</div>
            </div>
            <div className="text-xs text-gray-600">마지막 동기화</div>
          </div>
          <div className="text-center p-3 bg-purple-50 border border-purple-100 rounded-lg">
            <div className="text-sm font-semibold text-purple-700">자동 동기화</div>
            <div className="text-xs text-purple-600">24시간마다</div>
            </div>
          </div>

          {syncStatus.isLoading && (
            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span>동기화 진행률</span>
                <span className="font-bold">{Math.round(syncStatus.progress)}%</span>
              </div>
              <Progress value={syncStatus.progress} className="h-3" />
              <p className="text-sm text-gray-600 text-center">PDF 문안을 동기화하고 있습니다...</p>
            </div>
          )}

          <Button
            onClick={handleSync}
            disabled={syncStatus.isLoading}
          className="w-full h-12 text-lg font-semibold mt-2"
            variant={syncStatus.isUpToDate ? "outline" : "default"}
          >
            {syncStatus.isLoading ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                동기화 중...
              </>
            ) : (
              <>
                <Download className="w-5 h-5 mr-2" />
                PDF 문안 동기화
              </>
            )}
          </Button>

          {/* 동기화된 PDF 파일 목록 Sub카드 */}
        <div className="mt-4 p-4 bg-gray-50/80 rounded-lg border">
          <h4 className="font-semibold text-gray-800 mb-2">동기화된 PDF 파일 목록</h4>
            <ScrollArea className="h-48 rounded-md border bg-white p-2">
              {syncedFiles.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-8">동기화된 파일이 없습니다.</div>
              ) : (
                <ul className="text-sm text-gray-800 space-y-1">
                  {syncedFiles.map((file, idx) => (
                    <li key={idx} className="flex justify-between items-center border-b last:border-b-0 py-1 px-1">
                      <span className="truncate max-w-xs" title={file.name}>{file.name}</span>
                      <span className="text-xs text-gray-400 ml-2">{file.lastModified ? new Date(file.lastModified).toLocaleDateString("ko-KR") : "-"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
  )
}
