"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  User,
  Mail,
  IdCard,
  Briefcase,
  Award,
  Calendar,
  FileText,
  GraduationCap,
  ArrowLeft,
  Edit,
  RefreshCw,
} from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"

interface Employee {
  id: string
  email: string
  name: string
  employeeId: string
  department: string
  position: string
  lineTeam?: string | null
  isActive: boolean
  isInstructor: boolean
  isAdmin: boolean
  roles: string[]
  koreanEnglishGrade?: string | null
  koreanEnglishExpiry?: string | null
  japaneseGrade?: string | null
  chineseGrade?: string | null
  createdAt: string
  updatedAt: string
  _count?: {
    evaluations: number
    requests: number
    educationCheckins: number
  }
}

interface Evaluation {
  id: string
  language: string
  category: string
  status: string
  finalGrade?: string | null
  totalScore?: number | null
  evaluatedBy?: string | null
  evaluatedAt?: string | null
  createdAt: string
  recordingCheckin?: {
    id: string
    flightNumber: string
    date: string
    crewPosition: string
  } | null
}

interface EducationCheckin {
  id: string
  checkInAt: string
  status: string
  educationJournal?: {
    id: string
    educationDate: string
    educationType: string
    educationSlot: number
    instructorName: string
    sessionContent?: string | null
  } | null
}

export default function EmployeeDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [employee, setEmployee] = useState<Employee | null>(null)
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [educationCheckins, setEducationCheckins] = useState<EducationCheckin[]>([])
  const [evaluationStats, setEvaluationStats] = useState<any>(null)
  const [educationStats, setEducationStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("info")

  // 직원 정보 조회
  const fetchEmployee = async () => {
    try {
      const response = await fetch(`/api/admin/employees/${id}`)
      const data = await response.json()

      if (data.success) {
        setEmployee(data.employee)
      }
    } catch (error) {
      console.error("직원 정보 조회 실패:", error)
    }
  }

  // 평가 이력 조회
  const fetchEvaluations = async () => {
    try {
      const response = await fetch(`/api/admin/employees/${id}/evaluations`)
      const data = await response.json()

      if (data.success) {
        setEvaluations(data.evaluations)
        setEvaluationStats(data.stats)
      }
    } catch (error) {
      console.error("평가 이력 조회 실패:", error)
    }
  }

  // 교육 이력 조회
  const fetchEducation = async () => {
    try {
      const response = await fetch(`/api/admin/employees/${id}/education`)
      const data = await response.json()

      if (data.success) {
        setEducationCheckins(data.educationCheckins)
        setEducationStats(data.stats)
      }
    } catch (error) {
      console.error("교육 이력 조회 실패:", error)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await Promise.all([fetchEmployee(), fetchEvaluations(), fetchEducation()])
      setIsLoading(false)
    }

    loadData()
  }, [id])

  const handleRefresh = async () => {
    setIsLoading(true)
    await Promise.all([fetchEmployee(), fetchEvaluations(), fetchEducation()])
    setIsLoading(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">로딩 중...</div>
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">직원을 찾을 수 없습니다.</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/employees">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                목록으로
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">직원 상세 정보</h1>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              새로고침
            </Button>
            <Link href={`/admin/employees/${id}/edit`}>
              <Button size="sm">
                <Edit className="mr-2 h-4 w-4" />
                수정
              </Button>
            </Link>
          </div>
        </div>

        {/* 기본 정보 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              기본 정보
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-gray-600 mb-1">이름</div>
                <div className="font-semibold text-lg">{employee.name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">사번</div>
                <div className="font-semibold">{employee.employeeId}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">이메일</div>
                <div className="font-semibold text-sm">{employee.email}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">부서</div>
                <div className="font-semibold">{employee.department}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">직급</div>
                <div className="font-semibold">{employee.position || "-"}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">라인팀</div>
                <div className="font-semibold">{employee.lineTeam || "-"}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">상태</div>
                <Badge variant={employee.isActive ? "default" : "secondary"}>
                  {employee.isActive ? "활성" : "비활성"}
                </Badge>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">권한</div>
                <div className="flex gap-1 flex-wrap">
                  {employee.isAdmin && (
                    <Badge variant="default" className="bg-purple-600">관리자</Badge>
                  )}
                  {employee.isInstructor && (
                    <Badge variant="default" className="bg-blue-600">교관</Badge>
                  )}
                  {!employee.isAdmin && !employee.isInstructor && (
                    <span className="text-gray-500">-</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 기내방송 자격 정보 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              기내방송 자격 정보
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-gray-600 mb-2">한/영 방송</div>
                {employee.koreanEnglishGrade ? (
                  <div>
                    <Badge className="mb-2">{employee.koreanEnglishGrade}</Badge>
                    {employee.koreanEnglishExpiry && (
                      <div className="text-xs text-gray-500">
                        만료일: {new Date(employee.koreanEnglishExpiry).toLocaleDateString("ko-KR")}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-400">미취득</div>
                )}
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-2">일본어 방송</div>
                {employee.japaneseGrade ? (
                  <Badge>{employee.japaneseGrade}</Badge>
                ) : (
                  <div className="text-gray-400">미취득</div>
                )}
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-2">중국어 방송</div>
                {employee.chineseGrade ? (
                  <Badge>{employee.chineseGrade}</Badge>
                ) : (
                  <div className="text-gray-400">미취득</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 활동 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">평가 응시</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{evaluationStats?.total || 0}회</div>
              {evaluationStats && evaluationStats.averageScore > 0 && (
                <div className="text-sm text-gray-500 mt-1">
                  평균: {evaluationStats.averageScore}점
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">교육 이수</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{educationStats?.completedEducation || 0}회</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">마지막 활동</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-semibold">
                {educationStats?.recentEducation
                  ? new Date(educationStats.recentEducation).toLocaleDateString("ko-KR")
                  : "-"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 탭: 평가 이력 / 교육 이력 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="evaluations">
              <FileText className="mr-2 h-4 w-4" />
              평가 이력 ({evaluations.length})
            </TabsTrigger>
            <TabsTrigger value="education">
              <GraduationCap className="mr-2 h-4 w-4" />
              교육 이력 ({educationCheckins.length})
            </TabsTrigger>
          </TabsList>

          {/* 평가 이력 탭 */}
          <TabsContent value="evaluations">
            <Card>
              <CardContent className="pt-6">
                {evaluations.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">평가 이력이 없습니다.</div>
                ) : (
                  <>
                    {/* 평가 통계 */}
                    {evaluationStats && (
                      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-gray-600">총 평가</div>
                            <div className="font-semibold text-lg">{evaluationStats.total}회</div>
                          </div>
                          {evaluationStats.byLanguage && Object.keys(evaluationStats.byLanguage).length > 0 && (
                            <div>
                              <div className="text-gray-600">언어별</div>
                              <div className="font-semibold">
                                {Object.entries(evaluationStats.byLanguage).map(([lang, count]: [string, any]) => (
                                  <div key={lang} className="text-xs">
                                    {lang}: {count}회
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {evaluationStats.byGrade && Object.keys(evaluationStats.byGrade).length > 0 && (
                            <div>
                              <div className="text-gray-600">등급별</div>
                              <div className="font-semibold">
                                {Object.entries(evaluationStats.byGrade).map(([grade, count]: [string, any]) => (
                                  <div key={grade} className="text-xs">
                                    {grade}: {count}회
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {evaluationStats.averageScore > 0 && (
                            <div>
                              <div className="text-gray-600">평균 점수</div>
                              <div className="font-semibold text-lg">{evaluationStats.averageScore}점</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>날짜</TableHead>
                            <TableHead>언어</TableHead>
                            <TableHead>구분</TableHead>
                            <TableHead>상태</TableHead>
                            <TableHead>등급</TableHead>
                            <TableHead>점수</TableHead>
                            <TableHead>평가자</TableHead>
                            <TableHead>편명</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {evaluations.map((evaluation) => (
                            <TableRow key={evaluation.id}>
                              <TableCell className="text-sm">
                                {new Date(evaluation.createdAt).toLocaleDateString("ko-KR")}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{evaluation.language}</Badge>
                              </TableCell>
                              <TableCell>{evaluation.category}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    evaluation.status === "approved"
                                      ? "default"
                                      : evaluation.status === "submitted"
                                      ? "secondary"
                                      : "outline"
                                  }
                                >
                                  {evaluation.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {evaluation.finalGrade ? (
                                  <Badge
                                    variant={
                                      evaluation.finalGrade === "Fail" ? "destructive" : "default"
                                    }
                                  >
                                    {evaluation.finalGrade}
                                  </Badge>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                              <TableCell className="font-semibold">
                                {evaluation.totalScore !== null && evaluation.totalScore !== undefined
                                  ? `${evaluation.totalScore}점`
                                  : "-"}
                              </TableCell>
                              <TableCell className="text-sm">{evaluation.evaluatedBy || "-"}</TableCell>
                              <TableCell className="text-sm">
                                {evaluation.recordingCheckin?.flightNumber || "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 교육 이력 탭 */}
          <TabsContent value="education">
            <Card>
              <CardContent className="pt-6">
                {educationCheckins.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">교육 이력이 없습니다.</div>
                ) : (
                  <>
                    {/* 교육 통계 */}
                    {educationStats && (
                      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-gray-600">총 체크인</div>
                            <div className="font-semibold text-lg">{educationStats.totalCheckins}회</div>
                          </div>
                          <div>
                            <div className="text-gray-600">완료</div>
                            <div className="font-semibold text-lg">{educationStats.completedEducation}회</div>
                          </div>
                          {educationStats.byType && Object.keys(educationStats.byType).length > 0 && (
                            <div className="md:col-span-2">
                              <div className="text-gray-600">유형별</div>
                              <div className="font-semibold">
                                {Object.entries(educationStats.byType).map(([type, count]: [string, any]) => (
                                  <span key={type} className="text-xs mr-3">
                                    {type === "1:1" ? "1:1" : "소그룹"}: {count}회
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>체크인 날짜</TableHead>
                            <TableHead>교육 날짜</TableHead>
                            <TableHead>유형</TableHead>
                            <TableHead>차수</TableHead>
                            <TableHead>교관</TableHead>
                            <TableHead>상태</TableHead>
                            <TableHead>내용</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {educationCheckins.map((checkin) => (
                            <TableRow key={checkin.id}>
                              <TableCell className="text-sm">
                                {new Date(checkin.checkInAt).toLocaleString("ko-KR")}
                              </TableCell>
                              <TableCell className="text-sm">
                                {checkin.educationJournal
                                  ? new Date(checkin.educationJournal.educationDate).toLocaleDateString(
                                      "ko-KR"
                                    )
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                {checkin.educationJournal?.educationType === "1:1" ? (
                                  <Badge>1:1</Badge>
                                ) : checkin.educationJournal?.educationType === "small-group" ? (
                                  <Badge variant="secondary">소그룹</Badge>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                              <TableCell>
                                {checkin.educationJournal?.educationSlot
                                  ? `${checkin.educationJournal.educationSlot}차`
                                  : "-"}
                              </TableCell>
                              <TableCell className="text-sm">
                                {checkin.educationJournal?.instructorName || "-"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={checkin.status === "completed" ? "default" : "secondary"}
                                >
                                  {checkin.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs max-w-xs truncate">
                                {checkin.educationJournal?.sessionContent || "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

