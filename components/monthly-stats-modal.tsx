"use client"

import { useState, useMemo, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { TrendingUp, Award, Loader2, Calendar } from "lucide-react"
import { getGradeInfo } from "@/lib/evaluation-criteria"

interface Submission {
  id: string
  name: string
  employeeId: string
  language: string
  category: string
  submittedAt: string
  status: "pending" | "review_requested" | "submitted" | "completed" | "deleted" | "re_evaluation"
  grade?: string
  approved?: boolean
  totalScore?: number
  koreanTotalScore?: number
  englishTotalScore?: number
  categoryScores?: { [key: string]: any }
}

interface MonthlyStatsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function MonthlyStatsModal({ isOpen, onClose }: MonthlyStatsModalProps) {
  const [activeTab, setActiveTab] = useState("submissions")
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [startMonth, setStartMonth] = useState<string>("all")
  const [endMonth, setEndMonth] = useState<string>("all")

  // 모달이 열릴 때 모든 월의 데이터 로드
  useEffect(() => {
    if (isOpen) {
      loadAllData()
    }
  }, [isOpen])

  const loadAllData = async () => {
    setIsLoading(true)
    try {
      // 모든 월의 데이터를 로드 (month 파라미터 없이)
      const response = await fetch('/api/evaluations/load-database?limit=50000')
      if (response.ok) {
        const data = await response.json()
        const evaluations = (data.evaluations || []) as any[]
        
        // Submission 형식으로 변환 (Admin 페이지처럼 grade 계산)
        const formattedSubmissions: Submission[] = evaluations
          .filter(ev => ev && ev.id && ev.candidateInfo)
          .map(ev => {
            // Admin 페이지와 동일하게 grade 계산
            const gradeInfo = getGradeInfo(
              typeof ev.totalScore === 'number' ? ev.totalScore : 0,
              ev.categoryScores || {},
              ev.candidateInfo.language || '',
              ev.candidateInfo.category || ''
            );
            
            return {
              id: ev.id,
              name: ev.candidateInfo.name || '',
              employeeId: ev.candidateInfo.employeeId || '',
              language: ev.candidateInfo.language || '',
              category: ev.candidateInfo.category || '',
              submittedAt: ev.candidateInfo.submittedAt || '',
              status: ev.status || 'pending',
              grade: gradeInfo.grade, // 계산된 grade 사용!
              approved: ev.approved || false,
              totalScore: ev.totalScore,
              koreanTotalScore: ev.koreanTotalScore,
              englishTotalScore: ev.englishTotalScore,
              categoryScores: ev.categoryScores,
            }
          })
        
        console.log('✅ [통계 모달] 전체 데이터:', formattedSubmissions.length)
        console.log('✅ [통계 모달] 평가 완료 데이터:', formattedSubmissions.filter(s => s.status === 'submitted' || s.status === 'completed' || s.approved).length)
        console.log('✅ [통계 모달] 계산된 등급 분포:', {
          'S등급': formattedSubmissions.filter(s => s.grade === 'S등급').length,
          'A등급': formattedSubmissions.filter(s => s.grade === 'A등급').length,
          'B등급': formattedSubmissions.filter(s => s.grade === 'B등급').length,
          'FAIL': formattedSubmissions.filter(s => s.grade === 'FAIL').length,
          'A': formattedSubmissions.filter(s => s.grade === 'A').length,
          'B': formattedSubmissions.filter(s => s.grade === 'B').length,
          'F': formattedSubmissions.filter(s => s.grade === 'F').length,
        })
        console.log('✅ [통계 모달] 샘플 데이터 (계산된 grade):', formattedSubmissions.slice(0, 3).map(s => ({ 
          language: s.language, 
          totalScore: s.totalScore, 
          grade: s.grade,
          status: s.status
        })))
        
        setSubmissions(formattedSubmissions)
      }
    } catch (error) {
      console.error('❌ 통계 데이터 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 사용 가능한 월 목록 추출
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>()
    submissions.forEach(sub => {
      if (sub.submittedAt) {
        monthSet.add(sub.submittedAt.slice(0, 7))
      }
    })
    return Array.from(monthSet).sort()
  }, [submissions])

  // 기간 필터링된 submissions
  const filteredSubmissions = useMemo(() => {
    if (startMonth === "all" && endMonth === "all") {
      return submissions
    }
    
    return submissions.filter(sub => {
      if (!sub.submittedAt) return false
      const month = sub.submittedAt.slice(0, 7)
      
      if (startMonth !== "all" && month < startMonth) return false
      if (endMonth !== "all" && month > endMonth) return false
      
      return true
    })
  }, [submissions, startMonth, endMonth])

  // 월별 언어별 제출 인원 데이터
  const submissionData = useMemo(() => {
    const monthMap = new Map<string, { month: string; "한/영": number; "일본어": number; "중국어": number; total: number }>()

    filteredSubmissions.forEach((sub) => {
      if (!sub.submittedAt) return
      const month = sub.submittedAt.slice(0, 7) // YYYY-MM
      
      if (!monthMap.has(month)) {
        monthMap.set(month, { month, "한/영": 0, "일본어": 0, "중국어": 0, total: 0 })
      }

      const data = monthMap.get(month)!
      if (sub.language === "korean-english") {
        data["한/영"]++
      } else if (sub.language === "japanese") {
        data["일본어"]++
      } else if (sub.language === "chinese") {
        data["중국어"]++
      }
      data.total++
    })

    return Array.from(monthMap.values())
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(item => ({
        ...item,
        month: new Date(item.month + '-01').toLocaleDateString("ko-KR", { year: "numeric", month: "short" })
      }))
  }, [filteredSubmissions])

  // 월별 언어별 등급 분포 데이터 (Admin 페이지 로직과 동일)
  const gradeData = useMemo(() => {
    const languages = [
      { key: "korean-english", label: "한/영" },
      { key: "japanese", label: "일본어" },
      { key: "chinese", label: "중국어" },
    ]

    return languages.map((lang) => {
      // 평가 완료된 데이터만 필터링 (Admin 로직과 동일)
      const langSubmissions = filteredSubmissions.filter(
        (sub) => sub.language === lang.key && (sub.status === "submitted" || sub.status === "completed" || sub.approved)
      )
      
      console.log(`✅ [통계 모달] ${lang.label} 등급별 데이터:`, langSubmissions.length, "건")
      if (langSubmissions.length > 0) {
        console.log(`✅ [통계 모달] ${lang.label} 샘플 (계산된 grade):`, langSubmissions.slice(0, 2).map(s => ({ 
          month: s.submittedAt?.slice(0, 7), 
          grade: s.grade,
          totalScore: s.totalScore
        })))
      }

      const monthMap = new Map<string, any>()

      langSubmissions.forEach((sub) => {
        if (!sub.submittedAt) return
        const month = sub.submittedAt.slice(0, 7)
        const grade = sub.grade

        if (!monthMap.has(month)) {
          if (lang.key === "korean-english") {
            monthMap.set(month, { month, "S등급": 0, "A등급": 0, "B등급": 0, "FAIL": 0 })
          } else {
            monthMap.set(month, { month, "A": 0, "B": 0, "F": 0 })
          }
        }

        const data = monthMap.get(month)!
        // Admin 페이지 로직 그대로 적용
        if (lang.key === "korean-english") {
          if (grade === "S등급") data["S등급"]++
          else if (grade === "A등급") data["A등급"]++
          else if (grade === "B등급") data["B등급"]++
          else if (grade === "FAIL" || grade === "F") data["FAIL"]++
        } else {
          if (grade === "A") data["A"]++
          else if (grade === "B") data["B"]++
          else if (grade === "F" || grade === "FAIL") data["F"]++
        }
      })

      const chartData = Array.from(monthMap.values())
        .sort((a, b) => a.month.localeCompare(b.month))
        .map(item => ({
          ...item,
          month: new Date(item.month + '-01').toLocaleDateString("ko-KR", { year: "numeric", month: "short" })
        }))

      console.log(`✅ [통계 모달] ${lang.label} 차트 데이터:`, chartData)

      return {
        language: lang.label,
        data: chartData,
        isKoreanEnglish: lang.key === "korean-english"
      }
    })
  }, [filteredSubmissions])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            월별 제출 인원 통계
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <p className="text-gray-600">모든 월의 통계 데이터를 불러오는 중...</p>
          </div>
        ) : (
          <>
            {/* 기간 필터 */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <Calendar className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">기간 선택:</span>
              <Select value={startMonth} onValueChange={setStartMonth}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="시작 월" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {availableMonths.map(month => (
                    <SelectItem key={month} value={month}>
                      {new Date(month + '-01').toLocaleDateString("ko-KR", { year: "numeric", month: "long" })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-gray-500">~</span>
              <Select value={endMonth} onValueChange={setEndMonth}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="종료 월" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {availableMonths.map(month => (
                    <SelectItem key={month} value={month}>
                      {new Date(month + '-01').toLocaleDateString("ko-KR", { year: "numeric", month: "long" })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="submissions">언어별 제출 인원</TabsTrigger>
            <TabsTrigger value="grades">등급별 세부 분석</TabsTrigger>
          </TabsList>

          <TabsContent value="submissions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  월별 언어별 제출 인원 추이
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={submissionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="한/영" stroke="#8b5cf6" strokeWidth={2} />
                    <Line type="monotone" dataKey="일본어" stroke="#3b82f6" strokeWidth={2} />
                    <Line type="monotone" dataKey="중국어" stroke="#ef4444" strokeWidth={2} />
                    <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 요약 통계 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">전체 제출</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{filteredSubmissions.length}명</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">한/영</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {filteredSubmissions.filter(s => s.language === "korean-english").length}명
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">일본어</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {filteredSubmissions.filter(s => s.language === "japanese").length}명
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">중국어</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {filteredSubmissions.filter(s => s.language === "chinese").length}명
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="grades" className="space-y-4">
            {gradeData.map((langData) => {
              console.log(`🎨 [차트 렌더링] ${langData.language}:`, {
                데이터개수: langData.data.length,
                데이터: langData.data,
                isKoreanEnglish: langData.isKoreanEnglish
              });
              
              return (
                <Card key={langData.language}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Award className="w-5 h-5 text-yellow-600" />
                      {langData.language} - 월별 등급 분포 ({langData.data.length}개월)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {langData.data.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        평가 완료된 데이터가 없습니다.
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {langData.data.map((monthData, index) => {
                          // 등급별 데이터 추출
                          const grades = langData.isKoreanEnglish 
                            ? [
                                { key: 'S등급', label: 'S등급', value: monthData['S등급'] || 0, color: 'bg-green-500' },
                                { key: 'A등급', label: 'A등급', value: monthData['A등급'] || 0, color: 'bg-blue-500' },
                                { key: 'B등급', label: 'B등급', value: monthData['B등급'] || 0, color: 'bg-orange-500' },
                                { key: 'FAIL', label: 'FAIL', value: monthData['FAIL'] || 0, color: 'bg-red-500' },
                              ]
                            : [
                                { key: 'A', label: 'A', value: monthData['A'] || 0, color: 'bg-blue-500' },
                                { key: 'B', label: 'B', value: monthData['B'] || 0, color: 'bg-orange-500' },
                                { key: 'F', label: 'F', value: monthData['F'] || 0, color: 'bg-red-500' },
                              ];
                          
                          const total = grades.reduce((sum, g) => sum + g.value, 0);
                          
                          return (
                            <div key={index} className="space-y-3">
                              <h4 className="font-semibold text-gray-700">{monthData.month}</h4>
                              
                              {/* 스택 바 차트 (CSS) */}
                              <div className="w-full h-16 flex rounded-lg overflow-hidden border border-gray-200">
                                {grades.map((grade) => {
                                  const percentage = total > 0 ? (grade.value / total) * 100 : 0;
                                  if (percentage === 0) return null;
                                  
                                  return (
                                    <div
                                      key={grade.key}
                                      className={`${grade.color} flex items-center justify-center text-white font-bold text-sm transition-all hover:opacity-80`}
                                      style={{ width: `${percentage}%` }}
                                      title={`${grade.label}: ${grade.value}명 (${percentage.toFixed(1)}%)`}
                                    >
                                      {percentage > 10 && `${grade.value}`}
                                    </div>
                                  );
                                })}
                              </div>
                              
                              {/* 범례 */}
                              <div className="flex flex-wrap gap-4">
                                {grades.map((grade) => (
                                  <div key={grade.key} className="flex items-center gap-2">
                                    <div className={`w-4 h-4 ${grade.color} rounded`}></div>
                                    <span className="text-sm text-gray-700">
                                      <strong>{grade.label}:</strong> {grade.value}명
                                      {total > 0 && ` (${((grade.value / total) * 100).toFixed(1)}%)`}
                                    </span>
                                  </div>
                                ))}
                                <div className="ml-auto text-sm font-bold text-gray-700">
                                  총 {total}명
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

