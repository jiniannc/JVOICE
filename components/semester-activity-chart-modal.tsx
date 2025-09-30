import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Calendar, TrendingUp, Users, Award, Clock, Filter, BarChart3 } from "lucide-react";

interface SemesterActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MonthlyData {
  month: string;
  monthLabel: string;
  evaluationHours: number;
  educationHours: number;
  totalHours: number;
}

interface InstructorSemesterData {
  instructorId: string;
  instructorName: string;
  semesterLabel: string;
  totalEvaluationHours: number;
  totalEducationHours: number;
  totalHours: number;
  monthlyData: MonthlyData[];
}

export function SemesterActivityChartModal({ isOpen, onClose }: SemesterActivityModalProps) {
  const [semesterData, setSemesterData] = useState<InstructorSemesterData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [selectedInstructor, setSelectedInstructor] = useState<string>("all");
  const [selectedDataType, setSelectedDataType] = useState<string>("all"); // all, evaluation, education
  const [semesterOptions, setSemesterOptions] = useState<{ value: string; label: string }[]>([]);

  // 반기 옵션 생성
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const options = [];
    
    // 최근 3년간의 반기 옵션 생성
    for (let year = currentYear; year >= currentYear - 2; year--) {
      options.push({
        value: `${year}-H2`,
        label: `${year}년 하반기 (7~12월)`
      });
      options.push({
        value: `${year}-H1`,
        label: `${year}년 상반기 (1~6월)`
      });
    }
    
    setSemesterOptions(options);
    if (options.length > 0) {
      setSelectedSemester(options[0].value);
    }
  }, []);

  // 반기별 데이터 로드
  const loadSemesterData = async (semester: string) => {
    if (!semester) return;
    
    setIsLoading(true);
    try {
      console.log(`🔍 [반기별차트] 데이터 로드 시작: ${semester}`);
      
      const response = await fetch(`/api/admin/instructor-stats/semester?semester=${semester}`);
      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ [반기별차트] 데이터 로드 성공:`, data.data);
        setSemesterData(data.data);
      } else {
        console.error("❌ [반기별차트] 데이터 로드 실패:", data.error);
        setSemesterData([]);
      }
    } catch (error) {
      console.error("❌ [반기별차트] 데이터 로드 중 오류:", error);
      setSemesterData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 반기 변경 시 데이터 로드
  useEffect(() => {
    if (selectedSemester && isOpen) {
      loadSemesterData(selectedSemester);
    }
  }, [selectedSemester, isOpen]);

  // 필터링된 데이터
  const filteredData = useMemo(() => {
    let filtered = semesterData;
    
    // 교관 필터
    if (selectedInstructor !== "all") {
      filtered = filtered.filter(item => item.instructorId === selectedInstructor);
    }
    
    return filtered;
  }, [semesterData, selectedInstructor]);

  // 차트용 데이터 변환
  const chartData = useMemo(() => {
    if (filteredData.length === 0) return [];
    
    // 모든 월을 수집
    const allMonths = new Set<string>();
    filteredData.forEach(instructor => {
      instructor.monthlyData.forEach(month => {
        allMonths.add(month.month);
      });
    });
    
    const sortedMonths = Array.from(allMonths).sort();
    
    return sortedMonths.map(month => {
      const monthData: any = {
        month: month,
        monthLabel: filteredData[0]?.monthlyData.find(m => m.month === month)?.monthLabel || month
      };
      
      let totalEvaluationHours = 0;
      let totalEducationHours = 0;
      
      filteredData.forEach(instructor => {
        const monthInfo = instructor.monthlyData.find(m => m.month === month);
        if (monthInfo) {
          totalEvaluationHours += monthInfo.evaluationHours;
          totalEducationHours += monthInfo.educationHours;
          
          // 교관별 데이터도 추가 (개별 교관 선택 시)
          if (selectedInstructor !== "all") {
            monthData[`${instructor.instructorName}_평가`] = monthInfo.evaluationHours;
            monthData[`${instructor.instructorName}_교육`] = monthInfo.educationHours;
          }
        }
      });
      
      monthData.평가시간 = totalEvaluationHours;
      monthData.교육시간 = totalEducationHours;
      monthData.총시간 = totalEvaluationHours + totalEducationHours;
      
      return monthData;
    });
  }, [filteredData, selectedInstructor]);

  // 교관 목록
  const instructorOptions = useMemo(() => {
    const instructors = Array.from(new Set(semesterData.map(item => ({
      id: item.instructorId,
      name: item.instructorName
    }))));
    
    return [
      { value: "all", label: "전체 교관" },
      ...instructors.map(instructor => ({
        value: instructor.id,
        label: instructor.name
      }))
    ];
  }, [semesterData]);

  // 총합 계산
  const totalSummary = useMemo(() => {
    const summary = filteredData.reduce((acc, instructor) => {
      acc.totalEvaluationHours += instructor.totalEvaluationHours;
      acc.totalEducationHours += instructor.totalEducationHours;
      acc.totalHours += instructor.totalHours;
      return acc;
    }, {
      totalEvaluationHours: 0,
      totalEducationHours: 0,
      totalHours: 0
    });
    
    return summary;
  }, [filteredData]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            반기별 교관 활동 데이터
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 필터 컨트롤 */}
          <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="반기 선택" />
                </SelectTrigger>
                <SelectContent>
                  {semesterOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <Select value={selectedInstructor} onValueChange={setSelectedInstructor}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="교관 선택" />
                </SelectTrigger>
                <SelectContent>
                  {instructorOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <Select value={selectedDataType} onValueChange={setSelectedDataType}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="데이터 유형" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="evaluation">평가만</SelectItem>
                  <SelectItem value="education">교육만</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 로딩 상태 */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">데이터를 불러오는 중...</div>
            </div>
          )}

          {/* 데이터가 없는 경우 */}
          {!isLoading && filteredData.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">선택한 반기에 활동 데이터가 없습니다.</div>
            </div>
          )}

          {/* 데이터가 있는 경우 */}
          {!isLoading && filteredData.length > 0 && (
            <>
              {/* 총합 카드 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">총 평가 시간</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {totalSummary.totalEvaluationHours.toFixed(1)}시간
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">총 교육 시간</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {totalSummary.totalEducationHours.toFixed(1)}시간
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">총 활동 시간</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                      {totalSummary.totalHours.toFixed(1)}시간
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">활동 교관 수</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {selectedInstructor === "all" ? filteredData.length : 1}명
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 차트 */}
              <Tabs defaultValue="bar" className="w-full">
                <TabsList>
                  <TabsTrigger value="bar">막대 차트</TabsTrigger>
                  <TabsTrigger value="line">선 차트</TabsTrigger>
                </TabsList>
                
                <TabsContent value="bar" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>월별 활동 시간 (막대 차트)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="monthLabel" />
                          <YAxis />
                          <Tooltip 
                            formatter={(value: number, name: string) => [
                              `${value.toFixed(1)}시간`, 
                              name
                            ]}
                          />
                          <Legend />
                          {(selectedDataType === "all" || selectedDataType === "evaluation") && (
                            <Bar dataKey="평가시간" fill="#3B82F6" name="평가 시간" />
                          )}
                          {(selectedDataType === "all" || selectedDataType === "education") && (
                            <Bar dataKey="교육시간" fill="#10B981" name="교육 시간" />
                          )}
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="line" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>월별 활동 시간 (선 차트)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="monthLabel" />
                          <YAxis />
                          <Tooltip 
                            formatter={(value: number, name: string) => [
                              `${value.toFixed(1)}시간`, 
                              name
                            ]}
                          />
                          <Legend />
                          {(selectedDataType === "all" || selectedDataType === "evaluation") && (
                            <Line 
                              type="monotone" 
                              dataKey="평가시간" 
                              stroke="#3B82F6" 
                              strokeWidth={3}
                              name="평가 시간" 
                            />
                          )}
                          {(selectedDataType === "all" || selectedDataType === "education") && (
                            <Line 
                              type="monotone" 
                              dataKey="교육시간" 
                              stroke="#10B981" 
                              strokeWidth={3}
                              name="교육 시간" 
                            />
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* 교관별 상세 데이터 테이블 */}
              {selectedInstructor === "all" && (
                <Card>
                  <CardHeader>
                    <CardTitle>교관별 상세 데이터</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">교관명</th>
                            <th className="text-right p-2">평가 시간</th>
                            <th className="text-right p-2">교육 시간</th>
                            <th className="text-right p-2">총 시간</th>
                            <th className="text-center p-2">비율</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredData.map((instructor) => (
                            <tr key={instructor.instructorId} className="border-b hover:bg-gray-50">
                              <td className="p-2 font-medium">{instructor.instructorName}</td>
                              <td className="p-2 text-right text-blue-600">
                                {instructor.totalEvaluationHours.toFixed(1)}시간
                              </td>
                              <td className="p-2 text-right text-green-600">
                                {instructor.totalEducationHours.toFixed(1)}시간
                              </td>
                              <td className="p-2 text-right font-medium">
                                {instructor.totalHours.toFixed(1)}시간
                              </td>
                              <td className="p-2 text-center">
                                <Badge variant="outline">
                                  {totalSummary.totalHours > 0 
                                    ? ((instructor.totalHours / totalSummary.totalHours) * 100).toFixed(1)
                                    : 0}%
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

