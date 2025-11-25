"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  X,
  Users,
  BookOpen,
  CheckCircle,
  Calendar,
  Clock,
  BarChart3,
  TrendingUp,
  Award,
  RefreshCw
} from "lucide-react"
import { SemesterActivityChartModal } from "./semester-activity-chart-modal"

interface InstructorStats {
  instructorName: string;
  instructorId: string;
  evaluationStats: {
    totalEvaluations: number;
    byDate: { [date: string]: number };
    byLanguage: { [language: string]: number };
  };
  educationStats: {
    totalHours: number;
    totalSessions: number;
    onlineHours: number;
    smallGroupHours: number;
    byDate: { [date: string]: { sessions: number; hours: number } };
  };
}

interface InstructorStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InstructorStatsModal({ isOpen, onClose }: InstructorStatsModalProps) {
  const [instructorStats, setInstructorStats] = useState<InstructorStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [sortBy, setSortBy] = useState<"evaluations" | "education">("evaluations");
  const [monthOptions, setMonthOptions] = useState<{ value: string; label: string }[]>([]);
  const [isLoadingMonths, setIsLoadingMonths] = useState(false);
  const [showSemesterChart, setShowSemesterChart] = useState(false);

  // 사용 가능한 월 목록 로드
  const loadAvailableMonths = async () => {
    console.log("🔍 [교관관리] 사용 가능한 월 목록 로드 시작");
    setIsLoadingMonths(true);
    try {
      const response = await fetch('/api/admin/instructor-stats/available-months');
      console.log("📡 [교관관리] API 응답 상태:", response.status);
      const data = await response.json();
      console.log("📊 [교관관리] API 응답 데이터:", data);
      
      if (data.success && data.months && data.months.length > 0) {
        console.log("✅ [교관관리] 실제 데이터 기반 월 목록 사용:", data.months);
        setMonthOptions(data.months);
        // 첫 번째 월을 기본 선택
        if (!selectedMonth) {
          setSelectedMonth(data.months[0].value);
          console.log("📅 [교관관리] 기본 월 선택:", data.months[0].value);
        }
      } else {
        console.warn("⚠️ [교관관리] API 실패 또는 데이터 없음, 폴백 사용");
        console.log("📋 [교관관리] 실패 원인:", data.error || "데이터 없음");
        // 실패 시 기본 월 옵션 사용
        const fallbackOptions = [];
        const now = new Date();
        for (let i = 0; i < 6; i++) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const value = date.toISOString().slice(0, 7);
          const label = date.toLocaleDateString("ko-KR", { year: "numeric", month: "long" });
          fallbackOptions.push({ value, label });
        }
        console.log("🔄 [교관관리] 폴백 옵션:", fallbackOptions);
        setMonthOptions(fallbackOptions);
        if (!selectedMonth) {
          setSelectedMonth(fallbackOptions[0].value);
        }
      }
    } catch (error) {
      console.error("❌ [교관관리] 사용 가능한 월 로드 중 오류:", error);
      // 실패 시 기본 월 옵션 사용
      const fallbackOptions = [];
      const now = new Date();
      for (let i = 0; i < 6; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const value = date.toISOString().slice(0, 7);
        const label = date.toLocaleDateString("ko-KR", { year: "numeric", month: "long" });
        fallbackOptions.push({ value, label });
      }
      console.log("🔄 [교관관리] 오류 시 폴백 옵션:", fallbackOptions);
      setMonthOptions(fallbackOptions);
      if (!selectedMonth) {
        setSelectedMonth(fallbackOptions[0].value);
      }
    } finally {
      setIsLoadingMonths(false);
    }
  };

  // 모달이 열릴 때 월 목록 로드
  useEffect(() => {
    if (isOpen) {
      loadAvailableMonths();
    }
  }, [isOpen]);

  // 교관 통계 데이터 로드
  const loadInstructorStats = async () => {
    if (!selectedMonth) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/instructor-stats?month=${selectedMonth}`);
      const data = await response.json();
      
      if (data.success) {
        setInstructorStats(data.stats);
      } else {
        console.error("교관 통계 로드 실패:", data.error);
      }
    } catch (error) {
      console.error("교관 통계 로드 중 오류:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && selectedMonth) {
      loadInstructorStats();
    }
  }, [isOpen, selectedMonth]);

  // 정렬된 교관 목록
  const sortedInstructors = React.useMemo(() => {
    return [...instructorStats].sort((a, b) => {
      if (sortBy === "evaluations") {
        return b.evaluationStats.totalEvaluations - a.evaluationStats.totalEvaluations;
      } else {
        return b.educationStats.totalHours - a.educationStats.totalHours;
      }
    });
  }, [instructorStats, sortBy]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-indigo-600" />
            <h2 className="text-2xl font-bold text-gray-800">교관 관리</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* 컨트롤 패널 */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-600" />
              <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={isLoadingMonths}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={isLoadingMonths ? "로딩 중..." : "월 선택"} />
                </SelectTrigger>
                <SelectContent className="z-[999999]">
                  {monthOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-600" />
              <Select value={sortBy} onValueChange={(value: "evaluations" | "education") => setSortBy(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[999999]">
                  <SelectItem value="evaluations">평가 순</SelectItem>
                  <SelectItem value="education">교육 순</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={loadInstructorStats}
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
            
            <Button
              onClick={() => setShowSemesterChart(true)}
              variant="default"
              size="sm"
              className="bg-purple-600 hover:bg-purple-700"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              반기별 활동 DATA
            </Button>
          </div>
        </div>

        {/* 통계 내용 */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">교관 통계를 불러오는 중...</p>
            </div>
          ) : sortedInstructors.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">해당 월의 교관 활동 데이터가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 요약 카드 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-8 h-8 text-blue-600" />
                      <div>
                        <p className="text-sm text-blue-700">총 평가 건수</p>
                        <p className="text-2xl font-bold text-blue-800">
                          {sortedInstructors.reduce((sum, instructor) => sum + instructor.evaluationStats.totalEvaluations, 0)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Clock className="w-8 h-8 text-green-600" />
                      <div>
                        <p className="text-sm text-green-700">총 교육 시간</p>
                        <p className="text-2xl font-bold text-green-800">
                          {sortedInstructors.reduce((sum, instructor) => sum + instructor.educationStats.totalHours, 0)}시간
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Award className="w-8 h-8 text-purple-600" />
                      <div>
                        <p className="text-sm text-purple-700">활동 교관 수</p>
                        <p className="text-2xl font-bold text-purple-800">
                          {sortedInstructors.length}명
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 교관별 상세 통계 테이블 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    교관별 상세 통계
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-32">교관명</TableHead>
                          <TableHead className="w-24 text-center">사번</TableHead>
                          <TableHead className="w-24 text-center">평가 건수</TableHead>
                          <TableHead className="w-32 text-center">언어별 평가</TableHead>
                          <TableHead className="w-24 text-center">교육 시간</TableHead>
                          <TableHead className="w-24 text-center">교육 차수</TableHead>
                          <TableHead className="w-32 text-center">교육 유형별</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedInstructors.map((instructor) => (
                          <TableRow key={instructor.instructorId}>
                            <TableCell className="font-medium">
                              {instructor.instructorName}
                            </TableCell>
                            <TableCell className="text-center text-sm">
                              {instructor.instructorId}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                {instructor.evaluationStats.totalEvaluations}건
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex flex-wrap gap-1 justify-center">
                                {Object.entries(instructor.evaluationStats.byLanguage).map(([lang, count]) => (
                                  <Badge key={lang} variant="secondary" className="text-xs">
                                    {lang === 'korean-english' ? '한/영' : 
                                     lang === 'japanese' ? '일본어' : 
                                     lang === 'chinese' ? '중국어' : lang}: {count}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="bg-green-50 text-green-700">
                                {instructor.educationStats.totalHours}시간
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="bg-purple-50 text-purple-700">
                                {instructor.educationStats.totalSessions}차수
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex flex-col gap-1">
                                <Badge variant="secondary" className="text-xs">
                                  온라인: {instructor.educationStats.onlineHours}시간
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  소규모: {instructor.educationStats.smallGroupHours}시간
                                </Badge>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
      
      {/* 반기별 활동 차트 모달 */}
      <SemesterActivityChartModal
        isOpen={showSemesterChart}
        onClose={() => setShowSemesterChart(false)}
      />
    </div>
  );
}
