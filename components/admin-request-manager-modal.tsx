"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { 
  Trash2, 
  Calendar, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Search,
  Filter,
  Users,
  Mic,
  GraduationCap,
  Download
} from "lucide-react"

interface RequestEntry {
  id: string
  type: 'education' | 'recording'
  date: string
  slot: number
  employeeId: string
  name: string
  details: any
  status: string
  createdAt: string
}

interface MonthlyStats {
  month: string
  education: number
  recording: number
  total: number
  requests: RequestEntry[]
}

interface AdminRequestManagerModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AdminRequestManagerModal({ isOpen, onClose }: AdminRequestManagerModalProps) {
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedType, setSelectedType] = useState<'all' | 'education' | 'recording'>('all')
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [cleanupLoading, setCleanupLoading] = useState<Record<string, boolean>>({})
  const [cleanupResults, setCleanupResults] = useState<Record<string, any>>({})
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [exportLoading, setExportLoading] = useState(false)

  // 모든 활성 신청 내역 로드
  const loadAllRequests = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/load-all-requests')
      if (response.ok) {
        const data = await response.json()
        
        // 월별로 그룹화
        const monthlyData: Record<string, MonthlyStats> = {}
        
        data.requests?.forEach((request: RequestEntry) => {
          const month = request.date.substring(0, 7) // YYYY-MM
          
          if (!monthlyData[month]) {
            monthlyData[month] = {
              month,
              education: 0,
              recording: 0,
              total: 0,
              requests: []
            }
          }
          
          monthlyData[month].requests.push(request)
          monthlyData[month].total++
          
          if (request.type === 'education') {
            monthlyData[month].education++
          } else {
            monthlyData[month].recording++
          }
        })
        
        // 월별로 정렬 (최신순)
        const sortedStats = Object.values(monthlyData).sort((a, b) => b.month.localeCompare(a.month))
        setMonthlyStats(sortedStats)
      }
    } catch (error) {
      console.error('신청 내역 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadAllRequests()
    }
  }, [isOpen])

  // 필터링된 데이터
  const filteredStats = monthlyStats.filter(stat => {
    if (selectedMonth && stat.month !== selectedMonth) return false
    return true
  })

  const filteredRequests = filteredStats.flatMap(stat => 
    stat.requests.filter(request => {
      if (selectedType !== 'all' && request.type !== selectedType) return false
      if (searchTerm && !request.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !request.employeeId.includes(searchTerm)) return false
      return true
    })
  )

  // 월별 정리 실행
  const handleCleanupMonth = async (month: string, dryRun: boolean = false) => {
    const key = `${month}-${dryRun ? 'test' : 'real'}`
    setCleanupLoading(prev => ({ ...prev, [key]: true }))
    
    try {
      const response = await fetch(`/api/admin/cleanup-requests?month=${month}${dryRun ? '&dryRun=true' : ''}`, {
        method: 'POST'
      })
      
      if (response.ok) {
        const result = await response.json()
        setCleanupResults(prev => ({ ...prev, [key]: result }))
        
        // 실제 삭제 후 데이터 새로고침
        if (!dryRun && result.success) {
          await loadAllRequests()
        }
      } else {
        const error = await response.json()
        setCleanupResults(prev => ({ ...prev, [key]: { success: false, message: error.error } }))
      }
    } catch (error) {
      setCleanupResults(prev => ({ 
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

  const getLanguageDisplay = (request: any) => {
    if (!request.details) return 'N/A'
    
    // 교육의 경우
    if (request.type === 'education') {
      const language = request.details.language || request.schedule?.type
      switch (language) {
        case 'korean-english': return '한/영'
        case 'japanese': return '일본어'
        case 'chinese': return '중국어'
        default: return language || 'N/A'
      }
    }
    
    // 녹음의 경우
    if (request.type === 'recording') {
      const language = request.details.recordingLanguage || request.details.language
      switch (language) {
        case 'korean-english': return '한/영 녹음'
        case 'japanese': return '일본어 녹음'
        case 'chinese': return '중국어 녹음'
        default: return '녹음'
      }
    }
    
    return 'N/A'
  }

  // 월 표시 함수 (10 → 10월)
  const formatMonth = (dateStr: string) => {
    const month = dateStr.substring(5, 7) // YYYY-MM-DD에서 MM 추출
    return `${parseInt(month)}월`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ko-KR', { 
      month: '2-digit', 
      day: '2-digit',
      weekday: 'short'
    })
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit'
    })
  }

  // slot을 차수와 시간으로 변환하는 함수 (my page와 동일한 로직)
  const getSlotTimeInfo = (type: string, slot: number, educationMode?: string): string => {
    if (type === 'recording') {
      // 녹음용 시간표
      const times: Record<number, string> = {
        1: "08:30-09:20",
        2: "09:30-10:20", 
        3: "10:30-11:20",
        4: "11:30-12:20",
        5: "13:40-14:30",
        6: "14:40-15:30",
        7: "15:40-16:30",
        8: "16:40-17:30"
      }
      return times[slot] || ""
    } else if (type === 'education') {
      if (educationMode === '1:1') {
        // 1:1 교육용 시간표 (25분 단위, 총 16차수)
        const times: Record<number, string> = {
          // 오전 세션 (1-8차수)
          1: "08:30-08:55",
          2: "09:00-09:25",
          3: "09:30-09:55",
          4: "10:00-10:25",
          5: "10:30-10:55",
          6: "11:00-11:25",
          7: "11:30-11:55",
          8: "12:00-12:25",
          // 오후 세션 (9-16차수, 13:35부터 시작)
          9: "13:35-14:00",
          10: "14:05-14:30",
          11: "14:35-15:00",
          12: "15:05-15:30",
          13: "15:35-16:00",
          14: "16:05-16:30",
          15: "16:35-17:00",
          16: "17:05-17:30"
        }
        return times[slot] || ""
      } else {
        // 소규모 교육용 시간표 (2시간 단위)
        const times: Record<number, string> = {
          1: "08:30-10:20",
          2: "10:30-12:20", 
          3: "13:40-15:30",
          4: "15:40-17:30"
        }
        return times[slot] || ""
      }
    }
    return ""
  }

  // 교육 모드 추출 함수
  const getEducationMode = (request: any): string => {
    if (request.type !== 'education') return ''
    
    // details에서 mode 추출
    const mode = request.details?.mode || request.details?.educationType || request.schedule?.classType
    if (mode === 'small' || mode === 'small-group') return 'small'
    if (mode === '1:1') return '1:1'
    
    // 기본값은 1:1
    return '1:1'
  }

  // 개별 신청 내역 삭제 함수
  const handleDeleteSingleRequest = async (requestId: string, requestInfo: any) => {
    if (!confirm(`정말로 이 신청 내역을 삭제하시겠습니까?\n\n${requestInfo.name} (${requestInfo.employeeId})\n${requestInfo.date} ${requestInfo.slot}차수 ${requestInfo.type === 'education' ? '교육' : '녹음'}`)) {
      return
    }

    setDeletingIds(prev => new Set(prev).add(requestId))
    
    try {
      const response = await fetch(`/api/admin/delete-single-request?requestId=${requestId}`, {
        method: 'DELETE'
      })
      
      const result = await response.json()
      
      if (result.success) {
        alert(`신청 내역이 삭제되었습니다.\n\n${result.deletedRequest.user} (${result.deletedRequest.employeeId})\n${result.deletedRequest.date} ${result.deletedRequest.slot}차수`)
        
        // 목록 새로고침
        await loadAllRequests()
      } else {
        alert(`삭제 실패: ${result.error}`)
      }
    } catch (error) {
      console.error('개별 삭제 오류:', error)
      alert('삭제 중 오류가 발생했습니다.')
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(requestId)
        return newSet
      })
    }
  }

  // 엑셀 내보내기 함수
  const handleExportToExcel = async () => {
    setExportLoading(true)
    try {
      // 현재 필터링된 데이터를 CSV 형태로 변환
      const csvData = filteredRequests.map(request => ({
        '신청일': request.date,
        '유형': request.type === 'education' ? '교육' : '녹음',
        '시간대': `${request.slot}교시`,
        '사번': request.employeeId,
        '이름': request.name,
        '상태': request.status,
        '신청시간': new Date(request.createdAt).toLocaleString('ko-KR'),
        '세부정보': JSON.stringify(request.details)
      }))

      // CSV 문자열 생성
      const headers = Object.keys(csvData[0] || {})
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => 
          headers.map(header => {
            const value = row[header as keyof typeof row]
            // CSV에서 쉼표와 따옴표 처리
            return `"${String(value).replace(/"/g, '""')}"`
          }).join(',')
        )
      ].join('\n')

      // BOM 추가 (한글 깨짐 방지)
      const BOM = '\uFEFF'
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
      
      // 파일 다운로드
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      
      const now = new Date()
      const dateStr = now.toISOString().split('T')[0]
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '')
      const filename = `신청내역_${dateStr}_${timeStr}.csv`
      
      link.setAttribute('download', filename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      console.log(`✅ 엑셀 내보내기 완료: ${filteredRequests.length}건`)
    } catch (error) {
      console.error('❌ 엑셀 내보내기 실패:', error)
      alert('엑셀 내보내기 중 오류가 발생했습니다.')
    } finally {
      setExportLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-[90vw] h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg">
              <Calendar className="w-5 h-5" />
              신청 내역 관리
              <Badge variant="outline" className="ml-2">
                총 {filteredRequests.length}개
              </Badge>
            </div>
            
            {/* 엑셀 내보내기 버튼 */}
            <Button
              onClick={handleExportToExcel}
              disabled={exportLoading || filteredRequests.length === 0}
              size="sm"
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {exportLoading ? '내보내는 중...' : '엑셀 내보내기'}
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* 안전 경고 */}
        <Alert className="mb-3">
          <Shield className="w-4 h-4" />
          <AlertDescription className="text-xs">
            <strong>안전 보장:</strong> 신청 내역만 정리하며, <strong className="text-green-600">평가 파일과 녹음 파일은 절대 건드리지 않습니다.</strong>
          </AlertDescription>
        </Alert>

        {/* 필터 및 검색 */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1">
            <Input
              placeholder="이름 또는 사번으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          
          {/* 타입 필터 버튼 */}
          <div className="flex gap-1">
            <Button
              onClick={() => setSelectedType('all')}
              variant={selectedType === 'all' ? 'default' : 'outline'}
              size="sm"
              className="h-8 text-xs px-3"
            >
              전체
            </Button>
            <Button
              onClick={() => setSelectedType('education')}
              variant={selectedType === 'education' ? 'default' : 'outline'}
              size="sm"
              className="h-8 text-xs px-3"
            >
              <GraduationCap className="w-3 h-3 mr-1" />
              교육
            </Button>
            <Button
              onClick={() => setSelectedType('recording')}
              variant={selectedType === 'recording' ? 'default' : 'outline'}
              size="sm"
              className="h-8 text-xs px-3"
            >
              <Mic className="w-3 h-3 mr-1" />
              녹음
            </Button>
          </div>
          
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-2 py-1 border rounded text-xs h-8"
          >
            <option value="">전체 월</option>
            {monthlyStats.map(stat => (
              <option key={stat.month} value={stat.month}>{stat.month}</option>
            ))}
          </select>
          <Button onClick={loadAllRequests} disabled={loading} variant="outline" size="sm" className="h-8">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* 월별 통계 요약 */}
        <div className="grid grid-cols-6 gap-2 mb-3">
          {filteredStats.slice(0, 6).map((stat) => (
            <div key={stat.month} className="border rounded p-2 bg-gray-50">
              <div className="text-xs font-semibold mb-1">{stat.month}</div>
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1">
                  <GraduationCap className="w-3 h-3" />
                  {stat.education}
                </span>
                <span className="flex items-center gap-1">
                  <Mic className="w-3 h-3" />
                  {stat.recording}
                </span>
              </div>
              <div className="flex gap-1 mt-1">
                <Button
                  onClick={() => handleCleanupMonth(stat.month, true)}
                  disabled={cleanupLoading[`${stat.month}-test`]}
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs flex-1"
                >
                  {cleanupLoading[`${stat.month}-test`] ? '...' : '미리보기'}
                </Button>
                <Button
                  onClick={() => handleCleanupMonth(stat.month, false)}
                  disabled={cleanupLoading[`${stat.month}-real`]}
                  variant="destructive"
                  size="sm"
                  className="h-6 text-xs flex-1"
                >
                  {cleanupLoading[`${stat.month}-real`] ? '...' : '삭제'}
                </Button>
              </div>
              
              {/* 결과 표시 */}
              {(cleanupResults[`${stat.month}-test`] || cleanupResults[`${stat.month}-real`]) && (
                <div className="mt-1 text-xs">
                  {cleanupResults[`${stat.month}-test`] && (
                    <div className="text-blue-600 mb-1">
                      미리보기: {cleanupResults[`${stat.month}-test`].wouldDelete || 0}개
                    </div>
                  )}
                  {cleanupResults[`${stat.month}-real`] && (
                    <div className={cleanupResults[`${stat.month}-real`].success ? "text-green-600" : "text-red-600"}>
                      {cleanupResults[`${stat.month}-real`].success ? '완료' : '실패'}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 상세 목록 */}
        <div className="flex-1 overflow-auto border rounded">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              <span className="text-sm">로딩 중...</span>
            </div>
          ) : (
            <div className="text-xs">
              {/* 헤더 */}
              <div className="sticky top-0 bg-gray-100 border-b grid grid-cols-12 gap-1 p-2 font-semibold">
                <div className="col-span-1">월</div>
                <div className="col-span-1">일</div>
                <div className="col-span-1">타입</div>
                <div className="col-span-1">차수</div>
                <div className="col-span-1">시간</div>
                <div className="col-span-2">이름</div>
                <div className="col-span-1">사번</div>
                <div className="col-span-2">언어/상세</div>
                <div className="col-span-1">상태</div>
                <div className="col-span-1">삭제</div>
              </div>
              
              {/* 데이터 행 */}
              {filteredRequests.map((request, index) => {
                const educationMode = getEducationMode(request)
                const timeInfo = getSlotTimeInfo(request.type, request.slot, educationMode)
                
                const isDeleting = deletingIds.has(request.id)
                
                return (
                  <div 
                    key={request.id} 
                    className={`grid grid-cols-12 gap-1 p-2 border-b hover:bg-gray-50 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-25'
                    } ${isDeleting ? 'opacity-50' : ''}`}
                  >
                    <div className="col-span-1 font-mono">
                      {formatMonth(request.date)}
                    </div>
                    <div className="col-span-1">
                      {formatDate(request.date)}
                    </div>
                    <div className="col-span-1">
                      <Badge 
                        variant={request.type === 'education' ? 'default' : 'secondary'}
                        className="text-xs px-1 py-0"
                      >
                        {request.type === 'education' ? '교육' : '녹음'}
                      </Badge>
                    </div>
                    <div className="col-span-1 font-mono text-left">
                      {request.slot}차수
                    </div>
                    <div className="col-span-1 text-gray-500 text-xs">
                      {timeInfo}
                    </div>
                    <div className="col-span-2 font-medium truncate">
                      {request.name}
                    </div>
                    <div className="col-span-1 font-mono text-gray-600">
                      {request.employeeId}
                    </div>
                    <div className="col-span-2 truncate text-gray-600">
                      {getLanguageDisplay(request)}
                    </div>
                    <div className="col-span-1">
                      <Badge 
                        variant={request.status === 'ACTIVE' ? 'default' : 'outline'}
                        className="text-xs px-1 py-0"
                      >
                        {request.status}
                      </Badge>
                    </div>
                    <div className="col-span-1 flex flex-col items-center">
                      <Button
                        onClick={() => handleDeleteSingleRequest(request.id, {
                          name: request.name,
                          employeeId: request.employeeId,
                          date: request.date,
                          slot: request.slot,
                          type: request.type
                        })}
                        disabled={isDeleting || request.status === 'DELETED'}
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 mb-1"
                      >
                        {isDeleting ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                      </Button>
                      <div className="text-xs text-gray-400 text-center">
                        <div>{formatDate(request.createdAt)}</div>
                        <div className="opacity-75">{formatTime(request.createdAt)}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
              
              {filteredRequests.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  조건에 맞는 신청 내역이 없습니다.
                </div>
              )}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex justify-between items-center pt-3 border-t">
          <div className="text-xs text-gray-600">
            총 {filteredRequests.length}개 항목 표시 중
          </div>
          <Button onClick={onClose} variant="outline" size="sm">
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
