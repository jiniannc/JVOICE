"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Trash2, 
  Calendar, 
  RefreshCw,
  Search,
  Mic,
  GraduationCap,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
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

type SortField = 'month' | 'date' | 'type' | 'slot' | 'time' | 'name' | 'employeeId' | 'language' | 'status'
type SortDirection = 'asc' | 'desc' | null

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
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const [exportLoading, setExportLoading] = useState(false)
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

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

  // 필터링된 데이터
  const filteredStats = monthlyStats.filter(stat => {
    if (selectedMonth && stat.month !== selectedMonth) return false
    return true
  })

  let filteredRequests = filteredStats.flatMap(stat => 
    stat.requests.filter(request => {
      if (selectedType !== 'all' && request.type !== selectedType) return false
      if (searchTerm && !request.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !request.employeeId.includes(searchTerm)) return false
      return true
    })
  )

  // 정렬 함수
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // 같은 필드를 클릭하면 방향 변경 (asc -> desc -> null)
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortDirection(null)
        setSortField(null)
      }
    } else {
      // 새로운 필드를 클릭하면 오름차순으로 시작
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // 정렬 적용
  if (sortField && sortDirection) {
    filteredRequests = [...filteredRequests].sort((a, b) => {
      let valueA: any
      let valueB: any

      switch (sortField) {
        case 'month':
          valueA = a.date.substring(5, 7) // MM
          valueB = b.date.substring(5, 7)
          break
        case 'date':
          valueA = a.date
          valueB = b.date
          break
        case 'type':
          valueA = a.type
          valueB = b.type
          break
        case 'slot':
          valueA = a.slot
          valueB = b.slot
          break
        case 'time':
          const educationModeA = getEducationMode(a)
          const educationModeB = getEducationMode(b)
          valueA = getSlotTimeInfo(a.type, a.slot, educationModeA)
          valueB = getSlotTimeInfo(b.type, b.slot, educationModeB)
          break
        case 'name':
          valueA = a.name
          valueB = b.name
          break
        case 'employeeId':
          valueA = a.employeeId
          valueB = b.employeeId
          break
        case 'language':
          valueA = getLanguageDisplay(a)
          valueB = getLanguageDisplay(b)
          break
        case 'status':
          valueA = a.status
          valueB = b.status
          break
        default:
          return 0
      }

      if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1
      if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }

  // 정렬 아이콘 렌더링
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 opacity-30" />
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="w-3 h-3 text-blue-600" />
    }
    return <ArrowDown className="w-3 h-3 text-blue-600" />
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
      <DialogContent className="max-w-7xl w-[95vw] h-[90vh] overflow-hidden flex flex-col z-[99999]">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">신청 내역 관리</h2>
                <p className="text-xs text-gray-500 font-normal mt-0.5">
                  총 {filteredRequests.length}개의 신청 내역
                </p>
              </div>
            </div>
            
            {/* 엑셀 내보내기 버튼 */}
            <Button
              onClick={handleExportToExcel}
              disabled={exportLoading || filteredRequests.length === 0}
              size="sm"
              className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
            >
              <Download className="w-4 h-4" />
              {exportLoading ? '내보내는 중...' : 'Excel 내보내기'}
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* 필터 및 검색 */}
        <div className="flex gap-3 py-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="이름 또는 사번으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          
          {/* 월 필터 */}
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all bg-white min-w-[140px]"
          >
            <option value="">전체 월</option>
            {monthlyStats.map(stat => (
              <option key={stat.month} value={stat.month}>
                {stat.month} ({stat.total}건)
              </option>
            ))}
          </select>
          
          {/* 타입 필터 버튼 */}
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <Button
              onClick={() => setSelectedType('all')}
              variant={selectedType === 'all' ? 'default' : 'ghost'}
              size="sm"
              className={`h-8 px-4 text-sm font-medium transition-all ${
                selectedType === 'all' 
                  ? 'bg-white shadow-sm' 
                  : 'hover:bg-gray-50'
              }`}
            >
              전체
            </Button>
            <Button
              onClick={() => setSelectedType('education')}
              variant={selectedType === 'education' ? 'default' : 'ghost'}
              size="sm"
              className={`h-8 px-4 text-sm font-medium transition-all ${
                selectedType === 'education' 
                  ? 'bg-white shadow-sm' 
                  : 'hover:bg-gray-50'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5 mr-1.5" />
              교육
            </Button>
            <Button
              onClick={() => setSelectedType('recording')}
              variant={selectedType === 'recording' ? 'default' : 'ghost'}
              size="sm"
              className={`h-8 px-4 text-sm font-medium transition-all ${
                selectedType === 'recording' 
                  ? 'bg-white shadow-sm' 
                  : 'hover:bg-gray-50'
              }`}
            >
              <Mic className="w-3.5 h-3.5 mr-1.5" />
              녹음
            </Button>
          </div>
          
          <Button 
            onClick={loadAllRequests} 
            disabled={loading} 
            variant="outline" 
            size="sm" 
            className="h-10 px-4 border-gray-300 hover:border-gray-400"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* 상세 목록 */}
        <div className="flex-1 overflow-hidden border rounded-lg bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
                <span className="text-sm text-gray-600">로딩 중...</span>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-auto">
              {/* 헤더 */}
              <div className="sticky top-0 bg-gradient-to-r from-gray-50 to-gray-100 border-b grid grid-cols-12 gap-2 p-3 font-semibold text-xs text-gray-700 z-10">
                <button 
                  onClick={() => handleSort('month')}
                  className="col-span-1 flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  월 {getSortIcon('month')}
                </button>
                <button 
                  onClick={() => handleSort('date')}
                  className="col-span-1 flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  날짜 {getSortIcon('date')}
                </button>
                <button 
                  onClick={() => handleSort('type')}
                  className="col-span-1 flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  타입 {getSortIcon('type')}
                </button>
                <button 
                  onClick={() => handleSort('slot')}
                  className="col-span-1 flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  차수 {getSortIcon('slot')}
                </button>
                <button 
                  onClick={() => handleSort('time')}
                  className="col-span-1 flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  시간 {getSortIcon('time')}
                </button>
                <button 
                  onClick={() => handleSort('name')}
                  className="col-span-2 flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  이름 {getSortIcon('name')}
                </button>
                <button 
                  onClick={() => handleSort('employeeId')}
                  className="col-span-1 flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  사번 {getSortIcon('employeeId')}
                </button>
                <button 
                  onClick={() => handleSort('language')}
                  className="col-span-2 flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  언어/상세 {getSortIcon('language')}
                </button>
                <button 
                  onClick={() => handleSort('status')}
                  className="col-span-1 flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  상태 {getSortIcon('status')}
                </button>
                <div className="col-span-1 text-center">삭제</div>
              </div>
              
              {/* 데이터 행 */}
              {filteredRequests.map((request, index) => {
                const educationMode = getEducationMode(request)
                const timeInfo = getSlotTimeInfo(request.type, request.slot, educationMode)
                
                const isDeleting = deletingIds.has(request.id)
                
                return (
                  <div 
                    key={request.id} 
                    className={`grid grid-cols-12 gap-2 p-3 border-b hover:bg-blue-50/50 transition-colors text-xs ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    } ${isDeleting ? 'opacity-50' : ''}`}
                  >
                    <div className="col-span-1 font-medium text-gray-700">
                      {formatMonth(request.date)}
                    </div>
                    <div className="col-span-1 text-gray-600">
                      {formatDate(request.date)}
                    </div>
                    <div className="col-span-1">
                      <Badge 
                        variant={request.type === 'education' ? 'default' : 'secondary'}
                        className={`text-xs px-2 py-0.5 font-medium ${
                          request.type === 'education' 
                            ? 'bg-blue-100 text-blue-700 border-blue-200' 
                            : 'bg-purple-100 text-purple-700 border-purple-200'
                        }`}
                      >
                        {request.type === 'education' ? '교육' : '녹음'}
                      </Badge>
                    </div>
                    <div className="col-span-1 font-mono text-gray-700 font-medium">
                      {request.slot}차
                    </div>
                    <div className="col-span-1 text-gray-500 text-xs">
                      {timeInfo}
                    </div>
                    <div className="col-span-2 font-medium text-gray-900 truncate">
                      {request.name}
                    </div>
                    <div className="col-span-1 font-mono text-gray-600 text-xs">
                      {request.employeeId}
                    </div>
                    <div className="col-span-2 truncate text-gray-700">
                      {getLanguageDisplay(request)}
                    </div>
                    <div className="col-span-1">
                      <Badge 
                        variant={request.status === 'ACTIVE' ? 'default' : 'outline'}
                        className={`text-xs px-2 py-0.5 ${
                          request.status === 'ACTIVE' 
                            ? 'bg-green-100 text-green-700 border-green-200' 
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}
                      >
                        {request.status === 'ACTIVE' ? '활성' : request.status}
                      </Badge>
                    </div>
                    <div className="col-span-1 flex flex-col items-center justify-center gap-1">
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
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md"
                      >
                        {isDeleting ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </Button>
                      <div className="text-[10px] text-gray-400 text-center leading-tight">
                        <div>{formatDate(request.createdAt)}</div>
                        <div className="opacity-75">{formatTime(request.createdAt)}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
              
              {filteredRequests.length === 0 && (
                <div className="text-center py-16">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm text-gray-500 font-medium">조건에 맞는 신청 내역이 없습니다.</p>
                  <p className="text-xs text-gray-400 mt-1">필터를 조정하거나 검색어를 변경해보세요.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex justify-between items-center pt-4 border-t bg-gray-50/50 px-1">
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1.5 text-gray-600">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="font-medium">교육 {filteredRequests.filter(r => r.type === 'education').length}건</span>
            </div>
            <div className="w-px h-4 bg-gray-300"></div>
            <div className="flex items-center gap-1.5 text-gray-600">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="font-medium">녹음 {filteredRequests.filter(r => r.type === 'recording').length}건</span>
            </div>
            <div className="w-px h-4 bg-gray-300"></div>
            <span className="text-gray-500 text-xs">
              총 {filteredRequests.length}개 항목
            </span>
          </div>
          <Button 
            onClick={onClose} 
            variant="outline" 
            size="sm"
            className="px-6 hover:bg-gray-100"
          >
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
