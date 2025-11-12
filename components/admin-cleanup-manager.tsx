"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Trash2, 
  Calendar, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw
} from "lucide-react"

interface CleanupStats {
  month: string
  requestCount: number
  canCleanup: boolean
}

interface CleanupResult {
  success: boolean
  message: string
  deleted?: number
  details?: {
    education: number
    recording: number
  }
  verification?: {
    evaluationFiles: number
    recordingFiles: number
    message: string
  }
}

export function AdminCleanupManager() {
  const [cleanupStats, setCleanupStats] = useState<CleanupStats[]>([])
  const [loading, setLoading] = useState(false)
  const [cleanupLoading, setCleanupLoading] = useState<Record<string, boolean>>({})
  const [results, setResults] = useState<Record<string, CleanupResult>>({})
  const [schedulerStatus, setSchedulerStatus] = useState<any>(null)

  // 정리 가능한 월 목록 로드
  const loadCleanupStats = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/cleanup-requests')
      if (response.ok) {
        const data = await response.json()
        setCleanupStats(data.monthStats || [])
      }
    } catch (error) {
      console.error('정리 통계 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  // 스케줄러 상태 조회
  const loadSchedulerStatus = async () => {
    try {
      const response = await fetch('/api/admin/auto-cleanup-scheduler')
      if (response.ok) {
        const data = await response.json()
        setSchedulerStatus(data)
      }
    } catch (error) {
      console.error('스케줄러 상태 조회 실패:', error)
    }
  }

  useEffect(() => {
    loadCleanupStats()
    loadSchedulerStatus()
  }, [])

  // 특정 월 정리 실행
  const handleCleanupMonth = async (month: string, dryRun: boolean = false) => {
    const key = `${month}-${dryRun ? 'test' : 'real'}`
    setCleanupLoading(prev => ({ ...prev, [key]: true }))
    
    try {
      const response = await fetch(`/api/admin/cleanup-requests?month=${month}${dryRun ? '&dryRun=true' : ''}`, {
        method: 'POST'
      })
      
      if (response.ok) {
        const result = await response.json()
        setResults(prev => ({ ...prev, [key]: result }))
        
        // 실제 삭제 후 통계 새로고침
        if (!dryRun && result.success) {
          await loadCleanupStats()
        }
      } else {
        const error = await response.json()
        setResults(prev => ({ ...prev, [key]: { success: false, message: error.error } }))
      }
    } catch (error) {
      setResults(prev => ({ 
        ...prev, 
        [key]: { 
          success: false, 
          message: error instanceof Error ? error.message : '알 수 없는 오류' 
        } 
      }))
    } finally {
      setCleanupLoading(prev => ({ ...prev, [key]: false }))
    }
  }

  // 자동 스케줄러 강제 실행
  const handleForceScheduler = async () => {
    setCleanupLoading(prev => ({ ...prev, 'scheduler': true }))
    
    try {
      const response = await fetch('/api/admin/auto-cleanup-scheduler?force=true', {
        method: 'POST'
      })
      
      if (response.ok) {
        const result = await response.json()
        setResults(prev => ({ ...prev, 'scheduler': result }))
        await loadCleanupStats()
        await loadSchedulerStatus()
      } else {
        const error = await response.json()
        setResults(prev => ({ ...prev, 'scheduler': { success: false, message: error.error } }))
      }
    } catch (error) {
      setResults(prev => ({ 
        ...prev, 
        'scheduler': { 
          success: false, 
          message: error instanceof Error ? error.message : '알 수 없는 오류' 
        } 
      }))
    } finally {
      setCleanupLoading(prev => ({ ...prev, 'scheduler': false }))
    }
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">신청 내역 자동 정리</h2>
          <p className="text-gray-600 mt-1">교육/녹음 신청 내역을 월별로 자동 정리합니다</p>
        </div>
        <Button onClick={loadCleanupStats} disabled={loading} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </div>

      {/* 안전 경고 */}
      <Alert>
        <Shield className="w-4 h-4" />
        <AlertDescription>
          <strong>안전 보장:</strong> 이 기능은 <strong>신청 내역(Request)</strong>만 정리하며, 
          <strong className="text-green-600"> 평가 파일(Evaluation)과 녹음 파일(Recording)은 절대 건드리지 않습니다.</strong>
        </AlertDescription>
      </Alert>

      {/* 자동 스케줄러 상태 */}
      {schedulerStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              자동 스케줄러 상태
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">다음 실행 예정</p>
                <p className="font-semibold">{schedulerStatus.scheduler?.nextRun}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">오늘 실행 가능</p>
                <Badge variant={schedulerStatus.scheduler?.canRunToday ? "default" : "secondary"}>
                  {schedulerStatus.scheduler?.canRunToday ? "가능" : "불가능"}
                </Badge>
              </div>
            </div>
            
            {schedulerStatus.scheduler?.canRunToday && (
              <div className="mt-4">
                <Button 
                  onClick={handleForceScheduler}
                  disabled={cleanupLoading['scheduler']}
                  className="w-full"
                >
                  {cleanupLoading['scheduler'] ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      스케줄러 실행 중...
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4 mr-2" />
                      자동 스케줄러 강제 실행
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* 스케줄러 실행 결과 */}
            {results['scheduler'] && (
              <div className="mt-4">
                <Alert variant={results['scheduler'].success ? "default" : "destructive"}>
                  <AlertDescription>
                    {results['scheduler'].message}
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 월별 정리 관리 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            월별 신청 내역 정리
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p>정리 가능한 월 목록을 불러오는 중...</p>
            </div>
          ) : cleanupStats.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              정리할 신청 내역이 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              {cleanupStats.map((stat) => (
                <div key={stat.month} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{stat.month}월 신청 내역</h3>
                      <p className="text-sm text-gray-600">{stat.requestCount}개 항목</p>
                    </div>
                    <Badge variant="outline">
                      {stat.requestCount}개
                    </Badge>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleCleanupMonth(stat.month, true)}
                      disabled={cleanupLoading[`${stat.month}-test`]}
                      variant="outline"
                      size="sm"
                    >
                      {cleanupLoading[`${stat.month}-test`] ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        "미리보기"
                      )}
                    </Button>
                    
                    <Button
                      onClick={() => handleCleanupMonth(stat.month, false)}
                      disabled={cleanupLoading[`${stat.month}-real`]}
                      variant="destructive"
                      size="sm"
                    >
                      {cleanupLoading[`${stat.month}-real`] ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                          삭제 중...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-1" />
                          삭제 실행
                        </>
                      )}
                    </Button>
                  </div>

                  {/* 결과 표시 */}
                  {(results[`${stat.month}-test`] || results[`${stat.month}-real`]) && (
                    <div className="mt-3 space-y-2">
                      {results[`${stat.month}-test`] && (
                        <Alert>
                          <AlertTriangle className="w-4 h-4" />
                          <AlertDescription>
                            <strong>미리보기:</strong> {results[`${stat.month}-test`].message}
                            {results[`${stat.month}-test`].details && (
                              <div className="mt-1 text-xs">
                                교육: {results[`${stat.month}-test`].details.education}개, 
                                녹음: {results[`${stat.month}-test`].details.recording}개
                              </div>
                            )}
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      {results[`${stat.month}-real`] && (
                        <Alert variant={results[`${stat.month}-real`].success ? "default" : "destructive"}>
                          <CheckCircle className="w-4 h-4" />
                          <AlertDescription>
                            <strong>실행 결과:</strong> {results[`${stat.month}-real`].message}
                            {results[`${stat.month}-real`].verification && (
                              <div className="mt-1 text-xs text-green-600">
                                ✅ {results[`${stat.month}-real`].verification.message}
                              </div>
                            )}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


