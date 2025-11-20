"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  FileAudio, 
  Download, 
  Archive, 
  Search, 
  Calendar,
  HardDrive,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Play,
  Pause,
  Square,
  Volume2,
  CheckSquare
} from "lucide-react"

interface RecordingFile {
  id: string
  fileName: string
  filePath: string
  fileSize: number
  duration?: number
  submittedAt: string
  scriptNumber: number
  language: string
  userId: string
  userName: string
  employeeId: string
  category: string
  status: string
  evaluationId: string
}

interface EvaluationGroup {
  evaluationId: string
  userName: string
  employeeId: string
  language: string
  category: string
  status: string
  submittedAt: string
  recordings: RecordingFile[]
  totalSize: number
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
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [duration, setDuration] = useState<number>(0)
  const audioElementsRef = useRef<{ [key: string]: HTMLAudioElement }>({})

  // 월 옵션 생성
  useEffect(() => {
    const currentDate = new Date()
    const options = []
    
    for (let i = 0; i < 12; i++) {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth() - i
      const adjustedYear = month < 0 ? year - 1 : year
      const adjustedMonth = month < 0 ? 12 + month : month
      const value = `${adjustedYear}-${String(adjustedMonth + 1).padStart(2, '0')}`
      const date = new Date(adjustedYear, adjustedMonth, 1)
      const label = date.toLocaleDateString("ko-KR", { year: "numeric", month: "long" })
      options.push({ value, label })
    }
    
    setMonthOptions(options)
    if (options.length > 0) {
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

  useEffect(() => {
    if (selectedMonth && isOpen) {
      loadRecordings()
    }
  }, [selectedMonth, isOpen])

  // 평가별로 그룹화
  const evaluationGroups = useMemo(() => {
    const groupMap = new Map<string, EvaluationGroup>()
    
    recordings.forEach(recording => {
      if (!recording.evaluationId) return
      
      if (!groupMap.has(recording.evaluationId)) {
        groupMap.set(recording.evaluationId, {
          evaluationId: recording.evaluationId,
          userName: recording.userName,
          employeeId: recording.employeeId,
          language: recording.language,
          category: recording.category,
          status: recording.status,
          submittedAt: recording.submittedAt,
          recordings: [],
          totalSize: 0
        })
      }
      
      const group = groupMap.get(recording.evaluationId)!
      group.recordings.push(recording)
      group.totalSize += recording.fileSize
    })
    
    return Array.from(groupMap.values())
      .filter(group => {
        const matchesSearch = searchTerm === "" || 
          group.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          group.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
        
        const matchesLanguage = languageFilter === "all" || group.language === languageFilter
        const matchesStatus = statusFilter === "all" || group.status === statusFilter
        
        return matchesSearch && matchesLanguage && matchesStatus
      })
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
  }, [recordings, searchTerm, languageFilter, statusFilter])

  // 녹음 파일 로딩
  useEffect(() => {
    const loadAllRecordings = async () => {
      console.log("🎵 [RecordingManagement] 녹음 파일 일괄 로딩 시작");
      console.log(`🎵 [RecordingManagement] 평가 그룹 개수: ${evaluationGroups.length}`);

      for (const group of evaluationGroups) {
        if (!group.evaluationId) continue;

        try {
          console.log(`📡 [API 요청] Evaluation ID: ${group.evaluationId}`);
          const response = await fetch(`/api/evaluations/load-recordings?evaluationId=${group.evaluationId}`);
          if (!response.ok) {
            console.error(`❌ [API 실패] ${group.evaluationId}: ${response.status}`);
            continue;
          }

          const result = await response.json();
          if (!result.success || !result.recordings) {
            console.error(`❌ [API 응답 실패] ${group.evaluationId}:`, result);
            continue;
          }

          console.log(`✅ [API 성공] ${group.evaluationId}:`, result.recordings);
          console.log(`📦 [녹음 키 목록]`, Object.keys(result.recordings));

          for (const recording of group.recordings) {
            try {
              const key = `${recording.scriptNumber}-${recording.language}`;
              console.log(`🔑 [키 매칭] Recording ID: ${recording.id}, Key: ${key}`);
              
              let base64Data = result.recordings[key];
              if (!base64Data) {
                console.error(`❌ [키 없음] ${key}는 API 응답에 없음`);
                continue;
              }

              if (base64Data.startsWith('data:audio/')) {
                base64Data = base64Data.split(',')[1];
              }

              const binaryString = atob(base64Data);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              const blob = new Blob([bytes], { type: 'audio/webm' });
              const audioUrl = URL.createObjectURL(blob);
              const audio = new Audio(audioUrl);

              audio.onended = () => {
                setCurrentlyPlaying(null);
                setCurrentTime(0);
                setDuration(0);
              };

              audio.ontimeupdate = () => {
                setCurrentTime(audio.currentTime);
              };

              audio.onloadedmetadata = () => {
                setDuration(audio.duration);
              };

              audioElementsRef.current[recording.id] = audio;
              console.log(`✅ [Audio 생성] ${recording.id} → ${key}`);
            } catch (error) {
              console.error(`❌ [Audio 생성 실패] ${recording.id}:`, error);
            }
          }
        } catch (error) {
          console.error(`❌ [평가 로딩 실패] ${group.evaluationId}:`, error);
        }
      }

      console.log("✅ [RecordingManagement] 모든 녹음 파일 로딩 완료");
      console.log(`📊 [최종 통계] 총 Audio 객체: ${Object.keys(audioElementsRef.current).length}`);
    };

    if (evaluationGroups.length > 0 && isOpen) {
      loadAllRecordings();
    }

    return () => {
      Object.values(audioElementsRef.current).forEach(audio => {
        audio.pause();
        URL.revokeObjectURL(audio.src);
      });
      audioElementsRef.current = {};
    };
  }, [evaluationGroups, isOpen])

  // 재생 함수
  const playRecording = async (recordingId: string) => {
    console.log(`🎵 [재생 요청] Recording ID: ${recordingId}`);
    console.log(`🎵 [Audio Elements] 로딩된 Audio 개수: ${Object.keys(audioElementsRef.current).length}`);
    console.log(`🎵 [Audio Elements] 로딩된 ID 목록:`, Object.keys(audioElementsRef.current));
    
    const audio = audioElementsRef.current[recordingId];
    if (!audio) {
      console.error(`❌ [재생 실패] Audio 객체를 찾을 수 없음: ${recordingId}`);
      return;
    }

    console.log(`✅ [재생] Audio 객체 발견, src: ${audio.src}`);

    try {
      if (currentlyPlaying && audioElementsRef.current[currentlyPlaying]) {
        audioElementsRef.current[currentlyPlaying].pause();
        audioElementsRef.current[currentlyPlaying].currentTime = 0;
      }

      if (currentlyPlaying === recordingId) {
        setCurrentlyPlaying(null);
        setCurrentTime(0);
        setDuration(0);
        return;
      }

      audio.currentTime = 0;
      setDuration(audio.duration || 0);
      await audio.play();
      setCurrentlyPlaying(recordingId);
      console.log(`✅ [재생 성공] ${recordingId}`);
    } catch (error) {
      console.error(`❌ [재생 실패] ${recordingId}`, error);
      setCurrentlyPlaying(null);
    }
  };

  const togglePlayPause = () => {
    if (!currentlyPlaying) return;
    const audio = audioElementsRef.current[currentlyPlaying];
    if (!audio) return;
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  };

  const stopRecording = () => {
    if (!currentlyPlaying) return;
    const audio = audioElementsRef.current[currentlyPlaying];
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setCurrentlyPlaying(null);
    setCurrentTime(0);
    setDuration(0);
  };

  // 파일 크기 포맷팅
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 그룹 펼치기/접기
  const toggleGroup = (evaluationId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(evaluationId)) {
        newSet.delete(evaluationId)
      } else {
        newSet.add(evaluationId)
      }
      return newSet
    })
  }

  // 그룹 선택/해제
  const toggleSelectGroup = (evaluationId: string) => {
    setSelectedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(evaluationId)) {
        newSet.delete(evaluationId)
      } else {
        newSet.add(evaluationId)
      }
      return newSet
    })
  }

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectedGroups.size === evaluationGroups.length) {
      setSelectedGroups(new Set())
    } else {
      setSelectedGroups(new Set(evaluationGroups.map(g => g.evaluationId)))
    }
  }

  // 선택된 그룹 다운로드
  const downloadSelectedGroups = async () => {
    if (selectedGroups.size === 0) {
      alert('다운로드할 평가를 선택해주세요.');
      return;
    }

    const selectedEvaluationIds = Array.from(selectedGroups);
    console.log('📦 선택된 평가 다운로드:', selectedEvaluationIds);

    try {
      const response = await fetch(`/api/admin/recordings/download-evaluation?evaluationIds=${selectedEvaluationIds.join(',')}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `평가_${selectedGroups.size}건.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        console.log(`✅ ${selectedGroups.size}개 평가 다운로드 완료`);
      } else {
        alert('다운로드에 실패했습니다.');
      }
    } catch (error) {
      console.error('다운로드 오류:', error);
      alert('다운로드 중 오류가 발생했습니다.');
    }
  }

  // 그룹별 다운로드
  const downloadGroup = async (group: EvaluationGroup) => {
    console.log('📦 그룹 다운로드:', group.evaluationId);
    
    try {
      const response = await fetch(`/api/admin/recordings/download-evaluation?evaluationIds=${group.evaluationId}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `평가_${group.employeeId}_${group.userName}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        console.log(`✅ ${group.userName} 평가 다운로드 완료`);
      } else {
        alert('다운로드에 실패했습니다.');
      }
    } catch (error) {
      console.error('다운로드 오류:', error);
      alert('다운로드 중 오류가 발생했습니다.');
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

  const totalSize = useMemo(() => {
    return evaluationGroups.reduce((sum, group) => sum + group.totalSize, 0)
  }, [evaluationGroups])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col z-[99999]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileAudio className="w-5 h-5" />
            녹음 파일 관리 (평가별)
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* 필터 및 컨트롤 */}
          <div className="flex-shrink-0 bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
              {/* 월 선택 */}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="text-xs h-9">
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
                  placeholder="이름, 사번 검색"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              {/* 언어 필터 */}
              <Select value={languageFilter} onValueChange={setLanguageFilter}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 언어</SelectItem>
                  <SelectItem value="korean-english">한영</SelectItem>
                  <SelectItem value="japanese">일본어</SelectItem>
                  <SelectItem value="chinese">중국어</SelectItem>
                </SelectContent>
              </Select>

              {/* 상태 필터 */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 상태</SelectItem>
                  <SelectItem value="submitted">제출완료</SelectItem>
                  <SelectItem value="completed">평가완료</SelectItem>
                  <SelectItem value="approved">승인완료</SelectItem>
                </SelectContent>
              </Select>

              {/* 새로고침 */}
              <Button
                onClick={loadRecordings}
                disabled={isLoading}
                variant="outline"
                size="sm"
                className="text-xs h-9"
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                새로고침
              </Button>

              {/* 선택 다운로드 */}
              <Button
                onClick={downloadSelectedGroups}
                disabled={selectedGroups.size === 0}
                size="sm"
                className="text-xs h-9 bg-blue-600 hover:bg-blue-700"
              >
                <Download className="w-3 h-3 mr-1" />
                선택 다운로드 ({selectedGroups.size})
              </Button>
            </div>
          </div>

          {/* 통계 */}
          <div className="flex-shrink-0 grid grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">총 평가</p>
                    <p className="text-lg font-bold">{evaluationGroups.length}</p>
                  </div>
                  <FileAudio className="w-7 h-7 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">총 파일</p>
                    <p className="text-lg font-bold">{recordings.length}</p>
                  </div>
                  <Archive className="w-7 h-7 text-green-500" />
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
                  <HardDrive className="w-7 h-7 text-purple-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">선택됨</p>
                    <p className="text-lg font-bold">{selectedGroups.size}</p>
                  </div>
                  <CheckSquare className="w-7 h-7 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 전체 선택 */}
          <div className="flex-shrink-0 flex items-center gap-2 bg-purple-50 px-3 py-2 rounded-lg border border-purple-100">
            <Checkbox
              checked={evaluationGroups.length > 0 && selectedGroups.size === evaluationGroups.length}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-sm font-medium text-purple-700">전체 선택</span>
          </div>

          {/* 평가 그룹 목록 */}
          <div className="flex-1 overflow-auto space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin mr-2 text-blue-500" />
                <span>데이터를 불러오는 중...</span>
              </div>
            ) : evaluationGroups.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-gray-500">
                선택한 조건에 해당하는 녹음 파일이 없습니다.
              </div>
            ) : (
              evaluationGroups.map((group) => {
                const isExpanded = expandedGroups.has(group.evaluationId)
                const isSelected = selectedGroups.has(group.evaluationId)
                const statusInfo = getStatusDisplay(group.status)
                
                return (
                  <Card key={group.evaluationId} className={`overflow-hidden transition-all ${isSelected ? 'ring-2 ring-blue-400' : ''}`}>
                    {/* 그룹 헤더 */}
                    <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 transition-colors">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelectGroup(group.evaluationId)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      
                      <button
                        onClick={() => toggleGroup(group.evaluationId)}
                        className="flex-1 flex items-center gap-3 text-left"
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-600" /> : <ChevronRight className="w-4 h-4 text-gray-600" />}
                        
                        <div className="flex-1 grid grid-cols-6 gap-3 items-center">
                          <div>
                            <p className="font-semibold text-sm text-gray-900">{group.userName}</p>
                            <p className="text-xs text-gray-500">{group.employeeId}</p>
                          </div>
                          
                          <Badge variant="outline" className="text-xs">
                            {getLanguageDisplay(group.language)}
                          </Badge>
                          
                          <Badge className={`text-xs ${statusInfo.color}`}>
                            {statusInfo.label}
                          </Badge>
                          
                          <div className="text-xs text-gray-600">
                            <p>{group.recordings.length}개 파일</p>
                            <p className="text-gray-500">{formatFileSize(group.totalSize)}</p>
                          </div>
                          
                          <div className="text-xs text-gray-500">
                            {new Date(group.submittedAt).toLocaleDateString('ko-KR')}
                          </div>
                          
                          <div className="flex gap-1 justify-end">
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                downloadGroup(group)
                              }}
                              variant="outline"
                              size="sm"
                              className="text-xs h-7 px-2"
                            >
                              <Download className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </button>
                    </div>

                    {/* 펼쳐진 내용 - 개별 파일 목록 */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-2">
                        {group.recordings
                          .sort((a, b) => {
                            if (a.scriptNumber !== b.scriptNumber) {
                              return a.scriptNumber - b.scriptNumber
                            }
                            const langOrder: {[key: string]: number} = { korean: 1, english: 2 }
                            return (langOrder[a.language] || 999) - (langOrder[b.language] || 999)
                          })
                          .map((recording) => {
                            const isPlaying = currentlyPlaying === recording.id
                            const langDisplay = recording.language === 'korean' ? '한국어' : recording.language === 'english' ? '영어' : recording.language
                            
                            return (
                              <div key={recording.id} className="flex items-center gap-2 bg-white p-3 rounded-lg border border-gray-200">
                                <Badge variant="outline" className="text-xs min-w-[50px] text-center">
                                  {recording.scriptNumber}번
                                </Badge>
                                
                                <Badge 
                                  className={`text-xs min-w-[60px] text-center ${
                                    recording.language === 'korean' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                                  }`}
                                >
                                  {langDisplay}
                                </Badge>
                                
                                <p className="flex-1 text-xs font-mono text-gray-600 truncate">
                                  {recording.fileName}
                                </p>
                                
                                <p className="text-xs text-gray-500 min-w-[60px] text-right">
                                  {formatFileSize(recording.fileSize)}
                                </p>
                                
                                <Button
                                  onClick={() => playRecording(recording.id)}
                                  variant={isPlaying ? "default" : "outline"}
                                  size="sm"
                                  className={`text-xs h-7 px-2 min-w-[70px] ${
                                    isPlaying ? 'bg-blue-600 hover:bg-blue-700' : ''
                                  }`}
                                >
                                  {isPlaying ? (
                                    <>
                                      <Pause className="w-3 h-3 mr-1" />
                                      재생중
                                    </>
                                  ) : (
                                    <>
                                      <Play className="w-3 h-3 mr-1" />
                                      재생
                                    </>
                                  )}
                                </Button>
                              </div>
                            )
                          })}
                      </div>
                    )}
                  </Card>
                )
              })
            )}
          </div>

          {/* 오디오 플레이어 바 */}
          {currentlyPlaying && (() => {
            const currentRecording = recordings.find(r => r.id === currentlyPlaying)
            if (!currentRecording) return null
            
            return (
              <div className="flex-shrink-0 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-4 h-4 text-blue-600" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-blue-900 mb-1">
                      {currentRecording.scriptNumber}번 - {currentRecording.language === 'korean' ? '한국어' : '영어'} | {currentRecording.userName}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-blue-200 rounded-full h-1.5">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full transition-all"
                          style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-blue-700 font-mono min-w-[80px] text-right">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-1">
                    <Button
                      onClick={togglePlayPause}
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 text-blue-700"
                    >
                      {audioElementsRef.current[currentlyPlaying]?.paused ? (
                        <Play className="w-3 h-3" />
                      ) : (
                        <Pause className="w-3 h-3" />
                      )}
                    </Button>
                    <Button
                      onClick={stopRecording}
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 text-red-600"
                    >
                      <Square className="w-3 h-3 fill-current" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      </DialogContent>
    </Dialog>
  )
}
