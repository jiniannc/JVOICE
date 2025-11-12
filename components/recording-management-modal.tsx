"use client"

import React, { useState, useEffect, useMemo } from "react"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  FileAudio, 
  Download, 
  Archive, 
  Search, 
  Calendar,
  User,
  Clock,
  HardDrive,
  Filter,
  RefreshCw,
  X,
  Play,
  Pause,
  Volume2
} from "lucide-react"

interface RecordingFile {
  id: string
  fileName: string
  filePath: string
  fileSize: number
  duration?: number
  submittedAt: string
  userId: string
  userName: string
  employeeId: string
  language: string
  category: string
  status: string
  evaluationId?: string
}

interface RecordingManagementModalProps {
  isOpen: boolean
  onClose: () => void
}

export function RecordingManagementModal({ isOpen, onClose }: RecordingManagementModalProps) {
  const [recordings, setRecordings] = useState<RecordingFile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")
  const [languageFilter, setLanguageFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [monthOptions, setMonthOptions] = useState<{ value: string; label: string }[]>([])
  const [isDownloading, setIsDownloading] = useState<string | null>(null)
  const [playingRecordingId, setPlayingRecordingId] = useState<string | null>(null)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | HTMLVideoElement | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [isLoadingAudio, setIsLoadingAudio] = useState(false)

  // 월 옵션 생성
  useEffect(() => {
    const currentDate = new Date()
    const options = []
    
    console.log(`🗓️ [녹음관리] 현재 날짜: ${currentDate.toISOString()}`)
    
    // 최근 12개월 옵션 생성 (현재 월부터 과거로)
    for (let i = 0; i < 12; i++) {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth() - i
      
      // 월이 음수가 되면 이전 연도로 조정
      const adjustedYear = month < 0 ? year - 1 : year
      const adjustedMonth = month < 0 ? 12 + month : month
      
      const value = `${adjustedYear}-${String(adjustedMonth + 1).padStart(2, '0')}` // YYYY-MM
      const date = new Date(adjustedYear, adjustedMonth, 1)
      const label = date.toLocaleDateString("ko-KR", { year: "numeric", month: "long" })
      options.push({ value, label })
      console.log(`📅 [녹음관리] 월 옵션 ${i}: ${value} (${label})`)
    }
    
    setMonthOptions(options)
    
    // 9월 데이터가 있으므로 2025-09를 기본값으로 설정
    const septemberOption = options.find(opt => opt.value === "2025-09")
    if (septemberOption) {
      console.log(`✅ [녹음관리] 9월 데이터가 있어 기본 선택: 2025-09`)
      setSelectedMonth("2025-09")
    } else if (options.length > 0) {
      console.log(`✅ [녹음관리] 기본 선택 월: ${options[0].value}`)
      setSelectedMonth(options[0].value)
    }
  }, [])

  // 녹음 파일 데이터 로드
  const loadRecordings = async () => {
    if (!selectedMonth) return
    
    setIsLoading(true)
    try {
      console.log(`🔍 [녹음관리] 데이터 로드 시작: ${selectedMonth}`)
      
      const response = await fetch(`/api/admin/recordings?month=${selectedMonth}`)
      const data = await response.json()
      
      if (data.success) {
        console.log(`✅ [녹음관리] 데이터 로드 성공: ${data.recordings.length}개`)
        setRecordings(data.recordings)
      } else {
        console.error("❌ [녹음관리] 데이터 로드 실패:", data.error)
        setRecordings([])
      }
    } catch (error) {
      console.error("❌ [녹음관리] 데이터 로드 중 오류:", error)
      setRecordings([])
    } finally {
      setIsLoading(false)
    }
  }

  // 월 변경 시 데이터 로드
  useEffect(() => {
    if (selectedMonth && isOpen) {
      console.log(`🔄 [녹음관리] 선택된 월 변경: ${selectedMonth}`)
      loadRecordings()
    }
  }, [selectedMonth, isOpen])

  // 필터링된 데이터
  const filteredRecordings = useMemo(() => {
    return recordings.filter(recording => {
      const matchesSearch = searchTerm === "" || 
        recording.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recording.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recording.fileName.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesLanguage = languageFilter === "all" || recording.language === languageFilter
      const matchesStatus = statusFilter === "all" || recording.status === statusFilter
      
      return matchesSearch && matchesLanguage && matchesStatus
    })
  }, [recordings, searchTerm, languageFilter, statusFilter])

  // 파일 크기 포맷팅
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 시간 포맷팅 (초를 mm:ss 형식으로)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // 개별 파일 다운로드
  const downloadFile = async (recording: RecordingFile) => {
    setIsDownloading(recording.id)
    try {
      const response = await fetch(`/api/admin/recordings/download/${recording.id}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = recording.fileName
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert('파일 다운로드에 실패했습니다.')
      }
    } catch (error) {
      console.error('파일 다운로드 오류:', error)
      alert('파일 다운로드 중 오류가 발생했습니다.')
    } finally {
      setIsDownloading(null)
    }
  }

  // 월별 ZIP 다운로드
  const downloadMonthlyZip = async () => {
    if (!selectedMonth) return
    
    setIsDownloading('zip')
    try {
      const response = await fetch(`/api/admin/recordings/download-zip?month=${selectedMonth}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `recordings_${selectedMonth}.zip`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert('ZIP 파일 다운로드에 실패했습니다.')
      }
    } catch (error) {
      console.error('ZIP 다운로드 오류:', error)
      alert('ZIP 파일 다운로드 중 오류가 발생했습니다.')
    } finally {
      setIsDownloading(null)
    }
  }

  // 오디오 재생/일시정지
  const togglePlayPause = async (recording: RecordingFile) => {
    try {
      // 현재 재생 중인 파일을 일시정지
      if (playingRecordingId === recording.id) {
        if (audioElement) {
          audioElement.pause()
          setPlayingRecordingId(null)
        }
        return
      }

      // 기존 오디오 정지
      if (audioElement) {
        audioElement.pause()
        audioElement.src = ''
      }

      setIsLoadingAudio(true)
      setPlayingRecordingId(recording.id)

      // 새로운 오디오 로드 및 재생
      const response = await fetch(`/api/admin/recordings/download/${recording.id}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        
        // 파일 확장자 확인
        const fileExtension = recording.fileName.split('.').pop()?.toLowerCase()
        const isWebm = fileExtension === 'webm'
        
        console.log(`🎵 [재생] 파일: ${recording.fileName}, 확장자: ${fileExtension}, WebM: ${isWebm}`)
        
        // WebM 파일은 video 엘리먼트 사용, 나머지는 audio 엘리먼트 사용
        let mediaElement: HTMLAudioElement | HTMLVideoElement
        
        if (isWebm) {
          mediaElement = document.createElement('video')
          mediaElement.src = url
          // WebM의 경우 명시적으로 타입 지정
          const source = document.createElement('source')
          source.src = url
          source.type = 'audio/webm'
          mediaElement.appendChild(source)
        } else {
          mediaElement = new Audio(url)
        }
        
        mediaElement.addEventListener('loadedmetadata', () => {
          console.log(`✅ [재생] 메타데이터 로드 완료, 길이: ${mediaElement.duration}초`)
          setAudioDuration(mediaElement.duration)
          setIsLoadingAudio(false)
        })

        mediaElement.addEventListener('timeupdate', () => {
          setCurrentTime(mediaElement.currentTime)
        })

        mediaElement.addEventListener('ended', () => {
          console.log('✅ [재생] 재생 완료')
          setPlayingRecordingId(null)
          setCurrentTime(0)
          window.URL.revokeObjectURL(url)
        })

        mediaElement.addEventListener('error', (e) => {
          console.error('❌ [재생] 오류:', e)
          if (mediaElement.error) {
            console.error('❌ [재생] 에러 코드:', mediaElement.error.code)
            console.error('❌ [재생] 에러 메시지:', mediaElement.error.message)
          }
          alert(`오디오 파일을 재생할 수 없습니다.\n파일 형식: ${fileExtension}\n브라우저가 이 형식을 지원하지 않을 수 있습니다.`)
          setPlayingRecordingId(null)
          setIsLoadingAudio(false)
          window.URL.revokeObjectURL(url)
        })

        mediaElement.addEventListener('canplay', () => {
          console.log('✅ [재생] 재생 가능 상태')
        })

        console.log(`▶️ [재생] 재생 시작 시도: ${recording.fileName}`)
        await mediaElement.play()
        setAudioElement(mediaElement)
        console.log(`✅ [재생] 재생 시작 성공`)
      } else {
        alert('오디오 파일을 불러올 수 없습니다.')
        setPlayingRecordingId(null)
        setIsLoadingAudio(false)
      }
    } catch (error) {
      console.error('❌ [재생] 오류:', error)
      alert(`오디오 재생 중 오류가 발생했습니다.\n${error instanceof Error ? error.message : '알 수 없는 오류'}`)
      setPlayingRecordingId(null)
      setIsLoadingAudio(false)
    }
  }

  // 오디오 정리
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause()
        audioElement.src = ''
      }
    }
  }, [audioElement])

  // 모달이 닫힐 때 오디오 정지
  useEffect(() => {
    if (!isOpen && audioElement) {
      audioElement.pause()
      audioElement.src = ''
      setPlayingRecordingId(null)
      setAudioElement(null)
    }
  }, [isOpen])

  // 언어 표시명
  const getLanguageDisplay = (language: string) => {
    switch (language) {
      case 'korean-english': return '한영'
      case 'japanese': return '일본어'
      case 'chinese': return '중국어'
      default: return language
    }
  }

  // 상태 표시명 및 색상
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'pending': return { label: '대기중', color: 'bg-yellow-100 text-yellow-800' }
      case 'review_requested': return { label: '검토요청', color: 'bg-blue-100 text-blue-800' }
      case 'submitted': return { label: '제출완료', color: 'bg-green-100 text-green-800' }
      case 'completed': return { label: '평가완료', color: 'bg-purple-100 text-purple-800' }
      case 'approved': return { label: '승인완료', color: 'bg-emerald-100 text-emerald-800' }
      default: return { label: status, color: 'bg-gray-100 text-gray-800' }
    }
  }

  // 총 파일 크기 계산
  const totalSize = useMemo(() => {
    return filteredRecordings.reduce((sum, recording) => sum + recording.fileSize, 0)
  }, [filteredRecordings])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileAudio className="w-5 h-5" />
            녹음 파일 관리
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* 필터 및 컨트롤 */}
          <div className="flex-shrink-0 bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* 월 선택 */}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="월 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 검색 */}
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-500" />
                <Input
                  placeholder="이름, 사번, 파일명 검색"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-xs"
                />
              </div>

              {/* 언어 필터 */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <Select value={languageFilter} onValueChange={setLanguageFilter}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 언어</SelectItem>
                    <SelectItem value="korean-english">한영</SelectItem>
                    <SelectItem value="japanese">일본어</SelectItem>
                    <SelectItem value="chinese">중국어</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 상태 필터 */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 상태</SelectItem>
                    <SelectItem value="pending">대기중</SelectItem>
                    <SelectItem value="review_requested">검토요청</SelectItem>
                    <SelectItem value="submitted">제출완료</SelectItem>
                    <SelectItem value="completed">평가완료</SelectItem>
                    <SelectItem value="approved">승인완료</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 액션 버튼 */}
              <div className="flex gap-2">
                <Button
                  onClick={loadRecordings}
                  disabled={isLoading}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                  새로고침
                </Button>
                <Button
                  onClick={downloadMonthlyZip}
                  disabled={isDownloading === 'zip' || filteredRecordings.length === 0}
                  size="sm"
                  className="text-xs bg-blue-600 hover:bg-blue-700"
                >
                  <Archive className="w-3 h-3 mr-1" />
                  {isDownloading === 'zip' ? '압축중...' : 'ZIP 다운로드'}
                </Button>
              </div>
            </div>
          </div>

          {/* 통계 카드 */}
          <div className="flex-shrink-0 grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">총 파일 수</p>
                    <p className="text-lg font-bold">{filteredRecordings.length}</p>
                  </div>
                  <FileAudio className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">총 용량</p>
                    <p className="text-lg font-bold">{formatFileSize(totalSize)}</p>
                  </div>
                  <HardDrive className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">평균 파일 크기</p>
                    <p className="text-lg font-bold">
                      {filteredRecordings.length > 0 ? formatFileSize(totalSize / filteredRecordings.length) : '0 B'}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">선택된 월</p>
                    <p className="text-lg font-bold">
                      {monthOptions.find(m => m.value === selectedMonth)?.label || '-'}
                    </p>
                  </div>
                  <Calendar className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 테이블 */}
          <div className="flex-1 overflow-auto border rounded-lg">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                <span>데이터를 불러오는 중...</span>
              </div>
            ) : filteredRecordings.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-gray-500">
                선택한 조건에 해당하는 녹음 파일이 없습니다.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">제출일시</TableHead>
                    <TableHead className="text-xs">사용자</TableHead>
                    <TableHead className="text-xs">언어</TableHead>
                    <TableHead className="text-xs">카테고리</TableHead>
                    <TableHead className="text-xs">파일명</TableHead>
                    <TableHead className="text-xs">크기</TableHead>
                    <TableHead className="text-xs">상태</TableHead>
                    <TableHead className="text-xs">재생</TableHead>
                    <TableHead className="text-xs">다운로드</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecordings.map((recording) => {
                    const statusInfo = getStatusDisplay(recording.status)
                    return (
                      <TableRow key={recording.id} className="hover:bg-gray-50">
                        <TableCell className="text-xs">
                          {new Date(recording.submittedAt).toLocaleString('ko-KR')}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div>
                            <div className="font-medium">{recording.userName}</div>
                            <div className="text-gray-500">{recording.employeeId}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="text-xs">
                            {getLanguageDisplay(recording.language)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{recording.category}</TableCell>
                        <TableCell className="text-xs font-mono">
                          {recording.fileName}
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatFileSize(recording.fileSize)}
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge className={`text-xs ${statusInfo.color}`}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          <Button
                            onClick={() => togglePlayPause(recording)}
                            variant={playingRecordingId === recording.id ? "default" : "outline"}
                            size="sm"
                            className="text-xs h-7 px-2"
                            disabled={isLoadingAudio && playingRecordingId === recording.id}
                          >
                            {playingRecordingId === recording.id && isLoadingAudio ? (
                              <>
                                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                로딩중
                              </>
                            ) : playingRecordingId === recording.id ? (
                              <>
                                <Pause className="w-3 h-3 mr-1" />
                                일시정지
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3 mr-1" />
                                재생
                              </>
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="text-xs">
                          <Button
                            onClick={() => downloadFile(recording)}
                            disabled={isDownloading === recording.id}
                            variant="outline"
                            size="sm"
                            className="text-xs h-7 px-2"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            {isDownloading === recording.id ? '다운로드중...' : '다운로드'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          {/* 오디오 플레이어 바 */}
          {playingRecordingId && !isLoadingAudio && (
            <div className="flex-shrink-0 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-blue-200 rounded-b-lg p-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-900">재생 중</span>
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs text-blue-700 mb-1">
                    <span className="font-medium">
                      {filteredRecordings.find(r => r.id === playingRecordingId)?.fileName}
                    </span>
                    <span>
                      {formatTime(currentTime)} / {formatTime(audioDuration)}
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                      style={{ width: `${audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <Button
                  onClick={() => {
                    if (audioElement) {
                      audioElement.pause()
                      setPlayingRecordingId(null)
                    }
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 text-blue-700 hover:text-blue-900"
                >
                  <X className="w-3 h-3 mr-1" />
                  닫기
                </Button>
              </div>
            </div>
          )}
          {/* 로딩 중 표시 */}
          {playingRecordingId && isLoadingAudio && (
            <div className="flex-shrink-0 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-blue-200 rounded-b-lg p-3">
              <div className="flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                <span className="text-xs font-medium text-blue-900">오디오 로딩 중...</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
