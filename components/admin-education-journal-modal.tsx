"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { 
  X, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  RefreshCw,
  FileText,
  User,
  Calendar,
  Clock,
  Star,
  AlertCircle,
  Loader2,
  Users,
  GraduationCap,
  CheckCircle,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react"

interface EducationJournal {
  id: string
  educationSessionId?: string
  traineeEmployeeId: string
  traineeName: string
  instructorEmployeeId: string
  instructorName: string
  educationDate: string
  educationType: string
  educationLanguage: string
  educationSlot: number
  contentCategories: string[]
  detailedContent: string
  feedback?: string
  rating?: number
  createdAt: string
  updatedAt: string
}

interface EducationRecord {
  id: string
  employeeId: string
  name: string
  department?: string
  date: string
  slot: number
  educationType: '1:1' | 'small-group'
  language: string
  category?: string
  isCheckedIn: boolean
  checkinTime?: string
  instructorName?: string
  location?: string
}

interface AdminEducationJournalModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AdminEducationJournalModal({ isOpen, onClose }: AdminEducationJournalModalProps) {
  const [activeTab, setActiveTab] = useState<'records' | 'journals'>('records')
  const [journals, setJournals] = useState<EducationJournal[]>([])
  const [educationRecords, setEducationRecords] = useState<EducationRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [languageFilter, setLanguageFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [selectedMonth, setSelectedMonth] = useState<string>("all")
  const [selectedJournal, setSelectedJournal] = useState<EducationJournal | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [sortField, setSortField] = useState<'name' | 'employeeId' | 'date' | 'slot' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [exportLoading, setExportLoading] = useState(false)

  // 교육 이수 기록 로드
  const loadEducationRecords = async () => {
    setRecordsLoading(true)
    try {
      // 교육 체크인 데이터 로드
      const response = await fetch('/api/education/checkin')
      const data = await response.json()
      
      if (data.success && data.checkins) {
        const records: EducationRecord[] = data.checkins.map((checkin: any) => ({
          id: checkin.id,
          employeeId: checkin.employeeId,
          name: checkin.name,
          department: checkin.department,
          date: checkin.educationDate || checkin.date,
          slot: checkin.slot || 1,
          educationType: checkin.educationType || '1:1',
          language: checkin.language || 'korean-english',
          category: checkin.category,
          isCheckedIn: true,
          checkinTime: checkin.checkinTime,
          instructorName: checkin.instructorName,
          location: checkin.location
        }))
        
        setEducationRecords(records)
        console.log('📊 [관리자] 교육 이수 기록 로드 완료:', records.length)
      } else {
        console.error('📊 [관리자] 교육 이수 기록 로드 실패:', data.error)
      }
    } catch (error) {
      console.error('📊 [관리자] 교육 이수 기록 로드 오류:', error)
    } finally {
      setRecordsLoading(false)
    }
  }

  // 교육 일지 목록 로드
  const loadJournals = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/education-journals?limit=1000')
      const data = await response.json()
      
      if (data.success) {
        setJournals(data.journals || [])
        console.log('📚 [관리자] 교육 일지 로드 완료:', data.journals?.length || 0)
      } else {
        console.error('📚 [관리자] 교육 일지 로드 실패:', data.error)
        alert('교육 일지를 불러오는데 실패했습니다.')
      }
    } catch (error) {
      console.error('📚 [관리자] 교육 일지 로드 오류:', error)
      alert('교육 일지를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 교육 이수 기록 삭제
  const handleDeleteRecord = async (recordId: string) => {
    const record = educationRecords.find(r => r.id === recordId)
    if (!record) return

    const confirmed = window.confirm(
      `정말로 "${record.name}"의 교육 이수 기록을 삭제하시겠습니까?\n\n삭제된 데이터는 복구할 수 없습니다.`
    )
    if (!confirmed) return

    try {
      const response = await fetch(`/api/education/checkin?id=${recordId}`, {
        method: 'DELETE'
      })
      const result = await response.json()

      if (result.success) {
        alert('교육 이수 기록이 성공적으로 삭제되었습니다.')
        await loadEducationRecords() // 목록 새로고침
      } else {
        alert(`삭제 실패: ${result.error}`)
      }
    } catch (error) {
      console.error('교육 이수 기록 삭제 오류:', error)
      alert('교육 이수 기록 삭제 중 오류가 발생했습니다.')
    }
  }

  // Excel 내보내기
  const handleExportExcel = async () => {
    setExportLoading(true)
    try {
      const params = new URLSearchParams({
        month: selectedMonth,
        language: languageFilter,
        educationType: typeFilter
      })

      const response = await fetch(`/api/education/checkin/export?${params}`)
      
      if (!response.ok) {
        throw new Error('Excel 파일 생성에 실패했습니다.')
      }

      // 파일 다운로드
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // 파일명 설정
      const fileName = selectedMonth && selectedMonth !== 'all' 
        ? `교육이수기록_${selectedMonth}_${new Date().toISOString().split('T')[0]}.xlsx`
        : `교육이수기록_전체_${new Date().toISOString().split('T')[0]}.xlsx`
      
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      console.log('📊 Excel 파일 다운로드 완료:', fileName)
    } catch (error) {
      console.error('Excel 내보내기 오류:', error)
      alert('Excel 파일 생성 중 오류가 발생했습니다.')
    } finally {
      setExportLoading(false)
    }
  }

  // 교육 일지 삭제
  const handleDelete = async (journalId: string) => {
    const journal = journals.find(j => j.id === journalId)
    if (!journal) return

    const confirmed = window.confirm(
      `정말로 "${journal.traineeName}"의 교육 일지를 삭제하시겠습니까?\n\n삭제된 데이터는 복구할 수 없습니다.`
    )
    if (!confirmed) return

    try {
      const response = await fetch(`/api/education-journals?id=${journalId}`, {
        method: 'DELETE'
      })
      const result = await response.json()

      if (result.success) {
        alert('교육 일지가 성공적으로 삭제되었습니다.')
        await loadJournals() // 목록 새로고침
      } else {
        alert(`삭제 실패: ${result.error}`)
      }
    } catch (error) {
      console.error('교육 일지 삭제 오류:', error)
      alert('삭제 처리 중 오류가 발생했습니다.')
    }
  }

  // 교육 일지 편집
  const handleEdit = (journal: EducationJournal) => {
    setSelectedJournal(journal)
    setShowEditModal(true)
  }

  // 정렬 함수
  const handleSort = (field: 'name' | 'employeeId' | 'date' | 'slot') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // 필터링된 교육 이수 기록 목록
  const filteredEducationRecords = useMemo(() => {
    let filtered = educationRecords.filter(record => {
      // 이름, 사번, 부서 검색
      if (searchTerm && 
          !record.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !record.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !(record.department && record.department.toLowerCase().includes(searchTerm.toLowerCase()))) {
        return false
      }

      // 언어 필터
      if (languageFilter !== "all" && record.language !== languageFilter) {
        return false
      }

      // 교육 타입 필터
      if (typeFilter !== "all" && record.educationType !== typeFilter) {
        return false
      }

      // 월별 필터링
      if (selectedMonth && selectedMonth !== "all") {
        const recordMonth = record.date.slice(0, 7)
        if (recordMonth !== selectedMonth) {
          return false
        }
      }

      return true
    })

    // 정렬 적용
    if (sortField) {
      filtered.sort((a, b) => {
        let aValue: any, bValue: any
        
        switch (sortField) {
          case 'name':
            aValue = a.name
            bValue = b.name
            break
          case 'employeeId':
            aValue = a.employeeId
            bValue = b.employeeId
            break
          case 'date':
            aValue = new Date(a.date).getTime()
            bValue = new Date(b.date).getTime()
            break
          case 'slot':
            aValue = a.slot
            bValue = b.slot
            break
          default:
            return 0
        }

        if (sortDirection === 'asc') {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
        } else {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
        }
      })
    } else {
      // 기본 정렬: 교육일 순 (가장 최신이 위로)
      filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }

    return filtered
  }, [educationRecords, searchTerm, languageFilter, typeFilter, selectedMonth, sortField, sortDirection])

  // 필터링된 일지 목록
  const filteredJournals = useMemo(() => {
    return journals.filter(journal => {
      // 이름, 사번, 교관 이름 검색
      if (searchTerm && 
          !journal.traineeName.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !journal.traineeEmployeeId.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !journal.instructorName.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }

      // 언어 필터
      if (languageFilter !== "all" && journal.educationLanguage !== languageFilter) {
        return false
      }

      // 교육 타입 필터
      if (typeFilter !== "all" && journal.educationType !== typeFilter) {
        return false
      }

      return true
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [journals, searchTerm, languageFilter, typeFilter])

  // 언어 표시 함수
  const getLanguageDisplay = (language: string) => {
    const displays: { [key: string]: string } = {
      "korean-english": "한/영",
      "japanese": "일본어", 
      "chinese": "중국어"
    }
    return displays[language] || language
  }

  // 언어별 색상
  const getLanguageColor = (language: string) => {
    const colorMap: { [key: string]: string } = {
      "korean-english": "border-blue-300 bg-blue-50 text-blue-700",
      "japanese": "border-purple-300 bg-purple-50 text-purple-700",
      "chinese": "border-red-300 bg-red-50 text-red-700"
    }
    return colorMap[language] || "border-gray-300 bg-gray-50 text-gray-700"
  }

  // 교육 타입 표시
  const getTypeDisplay = (type: string) => {
    return type === "1:1" ? "1:1" : "소규모"
  }

  // 날짜 포맷팅
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'records') {
        loadEducationRecords()
      } else {
        loadJournals()
      }
    }
  }, [isOpen, activeTab])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-7xl w-full h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-bold text-gray-900">교육 기록 관리</h2>
            <Badge variant="outline" className="text-sm">
              총 {activeTab === 'records' ? filteredEducationRecords.length : filteredJournals.length}개
            </Badge>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex bg-gray-100 mx-6 mt-4 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('records')}
            className={`flex-1 text-center px-4 py-3 rounded-lg text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
              activeTab === 'records'
                ? 'bg-red-600 text-white shadow-lg'
                : 'text-gray-600 hover:bg-white hover:shadow-md'
            }`}
          >
            <Users className="w-4 h-4" />
            교육 이수 기록
          </button>
          <button
            onClick={() => setActiveTab('journals')}
            className={`flex-1 text-center px-4 py-3 rounded-lg text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
              activeTab === 'journals'
                ? 'bg-red-600 text-white shadow-lg'
                : 'text-gray-600 hover:bg-white hover:shadow-md'
            }`}
          >
            <FileText className="w-4 h-4" />
            교육 일지
          </button>
        </div>

        {/* 필터 및 검색 */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex items-center gap-4">
            {/* 검색 */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder={activeTab === 'records' ? "이름, 사번, 부서로 검색..." : "교육생 이름, 사번 또는 교관 이름으로 검색..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* 월별 필터 (교육 이수 기록 탭에서만 표시) */}
            {activeTab === 'records' && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="월 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 월</SelectItem>
                    {Array.from({length: 12}, (_, i) => {
                      const date = new Date()
                      date.setMonth(date.getMonth() - i)
                      const monthValue = date.toISOString().slice(0, 7)
                      const monthLabel = date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })
                      return (
                        <SelectItem key={monthValue} value={monthValue}>
                          {monthLabel}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 언어 필터 */}
            <Select value={languageFilter} onValueChange={setLanguageFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="언어" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 언어</SelectItem>
                <SelectItem value="korean-english">한/영</SelectItem>
                <SelectItem value="japanese">일본어</SelectItem>
                <SelectItem value="chinese">중국어</SelectItem>
              </SelectContent>
            </Select>

            {/* 교육 타입 필터 */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="타입" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 타입</SelectItem>
                <SelectItem value="1:1">1:1</SelectItem>
                <SelectItem value="small-group">소규모</SelectItem>
              </SelectContent>
            </Select>

            {/* 새로고침 버튼 */}
            <Button
              onClick={activeTab === 'records' ? loadEducationRecords : loadJournals}
              disabled={activeTab === 'records' ? recordsLoading : loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${(activeTab === 'records' ? recordsLoading : loading) ? 'animate-spin' : ''}`} />
              새로고침
            </Button>

            {/* Excel 내보내기 (교육 이수 기록 탭에서만) */}
            {activeTab === 'records' && (
              <Button
                onClick={handleExportExcel}
                disabled={exportLoading}
                variant="outline"
                size="sm"
                className="text-green-600 border-green-600 hover:bg-green-50"
              >
                {exportLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Excel 내보내기
              </Button>
            )}

            {/* 필터 초기화 */}
            <Button
              onClick={() => {
                setSearchTerm("")
                setLanguageFilter("all")
                setTypeFilter("all")
                if (activeTab === 'records') {
                  setSelectedMonth("all")
                  setSortField(null)
                  setSortDirection('asc')
                }
              }}
              variant="outline"
              size="sm"
            >
              <Filter className="w-4 h-4 mr-2" />
              초기화
            </Button>
          </div>
        </div>

        {/* 테이블 */}
        <div className="flex-1 overflow-auto min-h-0">
          {activeTab === 'records' ? (
            /* 교육 이수 기록 테이블 */
            recordsLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-500">교육 이수 기록을 불러오는 중...</p>
                </div>
              </div>
            ) : filteredEducationRecords.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">
                    {searchTerm || languageFilter !== "all" || typeFilter !== "all" || (selectedMonth && selectedMonth !== "all")
                      ? "검색 조건에 맞는 교육 이수 기록이 없습니다."
                      : "교육 이수 기록이 없습니다."}
                  </p>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('name')}
                        className="h-auto p-1 font-semibold"
                      >
                        이름
                        {sortField === 'name' && (
                          sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />
                        )}
                        {sortField !== 'name' && <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />}
                      </Button>
                    </TableHead>
                    <TableHead className="w-20 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('employeeId')}
                        className="h-auto p-1 font-semibold"
                      >
                        사번
                        {sortField === 'employeeId' && (
                          sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />
                        )}
                        {sortField !== 'employeeId' && <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />}
                      </Button>
                    </TableHead>
                    <TableHead className="w-20 text-center">부서</TableHead>
                    <TableHead className="w-20 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('date')}
                        className="h-auto p-1 font-semibold"
                      >
                        교육일
                        {sortField === 'date' && (
                          sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />
                        )}
                        {sortField !== 'date' && <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />}
                      </Button>
                    </TableHead>
                    <TableHead className="w-16 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('slot')}
                        className="h-auto p-1 font-semibold"
                      >
                        차수
                        {sortField === 'slot' && (
                          sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />
                        )}
                        {sortField !== 'slot' && <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />}
                      </Button>
                    </TableHead>
                    <TableHead className="w-16 text-center">언어</TableHead>
                    <TableHead className="w-16 text-center">타입</TableHead>
                    <TableHead className="w-24 text-center">체크인 시간</TableHead>
                    <TableHead className="w-16 text-center">상태</TableHead>
                    <TableHead className="w-16 text-center">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEducationRecords.map((record) => (
                    <TableRow key={record.id} className="hover:bg-gray-50">
                      <TableCell className="text-center font-medium">
                        {record.name}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {record.employeeId}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {record.department || '-'}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {new Date(record.date).toLocaleDateString("ko-KR")}
                      </TableCell>
                      <TableCell className="text-center">
                        {record.slot}차
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={`text-xs ${getLanguageColor(record.language)}`}>
                          {getLanguageDisplay(record.language)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs">
                          {record.educationType === '1:1' ? '1:1' : '소규모'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {record.checkinTime ? new Date(record.checkinTime).toLocaleString("ko-KR") : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          이수완료
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          onClick={() => handleDeleteRecord(record.id)}
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          ) : (
            /* 교육 일지 테이블 */
            loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-500">교육 일지를 불러오는 중...</p>
                </div>
              </div>
            ) : filteredJournals.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">
                    {searchTerm || languageFilter !== "all" || typeFilter !== "all"
                      ? "검색 조건에 맞는 교육 일지가 없습니다."
                      : "등록된 교육 일지가 없습니다."}
                  </p>
                </div>
              </div>
            ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24 text-center">교육생</TableHead>
                  <TableHead className="w-20 text-center">사번</TableHead>
                  <TableHead className="w-16 text-center">언어</TableHead>
                  <TableHead className="w-16 text-center">타입</TableHead>
                  <TableHead className="w-20 text-center">교육일</TableHead>
                  <TableHead className="w-16 text-center">차수</TableHead>
                  <TableHead className="w-24 text-center">교관</TableHead>
                  <TableHead className="w-32 text-center">교육 내용</TableHead>
                  <TableHead className="w-32 text-center">세부 내용</TableHead>
                  <TableHead className="w-24 text-center">특이사항</TableHead>
                  <TableHead className="w-24 text-center">작성일</TableHead>
                  <TableHead className="w-20 text-center">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJournals.map((journal) => (
                  <TableRow key={journal.id} className="hover:bg-gray-50">
                    <TableCell className="text-center font-medium">
                      {journal.traineeName}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {journal.traineeEmployeeId}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={`text-xs ${getLanguageColor(journal.educationLanguage)}`}>
                        {getLanguageDisplay(journal.educationLanguage)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs">
                        {getTypeDisplay(journal.educationType)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {new Date(journal.educationDate).toLocaleDateString("ko-KR")}
                    </TableCell>
                    <TableCell className="text-center">
                      {journal.educationSlot}차
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {journal.instructorName}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {journal.contentCategories.slice(0, 2).map((category, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {category}
                          </Badge>
                        ))}
                        {journal.contentCategories.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{journal.contentCategories.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center max-w-32">
                      <div className="truncate text-sm" title={journal.detailedContent}>
                        {journal.detailedContent.length > 30 
                          ? `${journal.detailedContent.substring(0, 30)}...`
                          : journal.detailedContent}
                      </div>
                    </TableCell>
                    <TableCell className="text-center max-w-24">
                      {journal.feedback ? (
                        <div className="truncate text-sm" title={journal.feedback}>
                          {journal.feedback.length > 20 
                            ? `${journal.feedback.substring(0, 20)}...`
                            : journal.feedback}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-xs">
                      {formatDateTime(journal.createdAt)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          onClick={() => handleEdit(journal)}
                          variant="outline"
                          size="sm"
                          className="h-8 px-2"
                        >
                          <Edit3 className="w-3 h-3" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(journal.id)}
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            )
          )}
        </div>

        {/* 푸터 */}
        <div className="p-4 border-t bg-gray-50 text-center text-sm text-gray-600">
          총 {activeTab === 'records' ? filteredEducationRecords.length : filteredJournals.length}개의 {activeTab === 'records' ? '교육 이수 기록' : '교육 일지'}
        </div>
      </div>

      {/* 편집 모달 */}
      {showEditModal && selectedJournal && (
        <JournalEditModal
          journal={selectedJournal}
          onClose={() => {
            setShowEditModal(false)
            setSelectedJournal(null)
          }}
          onSave={async () => {
            await loadJournals()
            setShowEditModal(false)
            setSelectedJournal(null)
          }}
        />
      )}
    </div>
  )
}

// 일지 편집 모달 컴포넌트
function JournalEditModal({ 
  journal, 
  onClose, 
  onSave 
}: { 
  journal: EducationJournal
  onClose: () => void
  onSave: () => void
}) {
  const [formData, setFormData] = useState({
    contentCategories: journal.contentCategories || [],
    detailedContent: journal.detailedContent || '',
    feedback: journal.feedback || ''
  })
  const [saving, setSaving] = useState(false)

  // 언어별 교육 내용 카테고리
  const getPredefinedCategories = (language: string) => {
    const commonCategories = ['취득문안', '취득문안 외 방송', '사무장 방송', '기타']
    
    if (language === 'korean-english') {
      return ['한국어 방송', '영어 방송', ...commonCategories]
    } else {
      // 중국어, 일본어는 한국어/영어 방송 옵션 제외
      return commonCategories
    }
  }

  const predefinedCategories = getPredefinedCategories(journal.educationLanguage)

  // 카테고리 토글
  const toggleCategory = (category: string) => {
    setFormData(prev => ({
      ...prev,
      contentCategories: prev.contentCategories.includes(category)
        ? prev.contentCategories.filter(c => c !== category)
        : [...prev.contentCategories, category]
    }))
  }

  // 저장 처리
  const handleSave = async () => {
    if (!formData.detailedContent.trim()) {
      alert('세부 내용을 입력해주세요.')
      return
    }

    if (formData.contentCategories.length === 0) {
      alert('교육 내용을 최소 1개 이상 선택해주세요.')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/education-journals', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: journal.id,
          contentCategories: formData.contentCategories,
          detailedContent: formData.detailedContent.trim(),
          feedback: formData.feedback.trim()
        })
      })

      const result = await response.json()

      if (result.success) {
        alert('교육 일지가 성공적으로 수정되었습니다.')
        onSave()
      } else {
        alert(`수정 실패: ${result.error}`)
      }
    } catch (error) {
      console.error('교육 일지 수정 오류:', error)
      alert('수정 처리 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-60 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-bold text-gray-900">
            교육 일지 편집 - {journal.traineeName}
          </h3>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* 내용 */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* 교육 정보 (읽기 전용) */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">교육 정보</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">교육일:</span>
                <span className="ml-2 font-medium">
                  {new Date(journal.educationDate).toLocaleDateString("ko-KR")}
                </span>
              </div>
              <div>
                <span className="text-gray-600">차수:</span>
                <span className="ml-2 font-medium">{journal.educationSlot}차</span>
              </div>
              <div>
                <span className="text-gray-600">언어:</span>
                <span className="ml-2 font-medium">{getLanguageDisplay(journal.educationLanguage)}</span>
              </div>
              <div>
                <span className="text-gray-600">타입:</span>
                <span className="ml-2 font-medium">{getTypeDisplay(journal.educationType)}</span>
              </div>
              <div>
                <span className="text-gray-600">교관:</span>
                <span className="ml-2 font-medium">{journal.instructorName}</span>
              </div>
            </div>
          </div>

          {/* 교육 내용 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              교육 내용 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {predefinedCategories.map((category) => (
                <label
                  key={category}
                  className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={formData.contentCategories.includes(category)}
                    onChange={() => toggleCategory(category)}
                    className="mr-2"
                  />
                  <span className="text-sm">{category}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 세부 내용 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              세부 내용 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.detailedContent}
              onChange={(e) => setFormData(prev => ({ ...prev, detailedContent: e.target.value }))}
              placeholder="예) R/L 발음 구분, 한국어식 음절 표현 교정을 집중적으로 학습..."
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
          </div>

          {/* 특이사항 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              특이사항
            </label>
            <textarea
              value={formData.feedback}
              onChange={(e) => setFormData(prev => ({ ...prev, feedback: e.target.value }))}
              placeholder="예) 교육 시작 시간보다 5분 늦게 Show-up..."
              className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={saving}
          >
            취소
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-red-600 hover:bg-red-700"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                저장 중...
              </>
            ) : (
              '저장'
            )}
          </Button>
        </div>
      </div>
    </div>
  )

  function getLanguageDisplay(language: string) {
    const displays: { [key: string]: string } = {
      "korean-english": "한/영",
      "japanese": "일본어", 
      "chinese": "중국어"
    }
    return displays[language] || language
  }

  function getTypeDisplay(type: string) {
    return type === "1:1" ? "1:1" : "소규모"
  }
}
