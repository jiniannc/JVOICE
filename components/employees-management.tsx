"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import Link from "next/link"
import {
  Search,
  Filter,
  Users,
  Upload,
  Plus,
  Edit,
  Eye,
  Trash2,
  RefreshCw,
  Home,
  Building,
  Mail,
  Phone,
  Calendar,
  Award,
  BookOpen,
  TrendingUp,
  UserCheck,
  Shield,
  Briefcase,
  BarChart3,
  X,
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface Employee {
  id: string
  name: string
  email: string
  employeeId: string
  department: string
  position: string
  lineTeam?: string
  isActive: boolean
  isInstructor: boolean
  isAdmin: boolean
  roles: string[]
  koreanEnglishGrade?: string
  koreanEnglishExpiry?: string | Date
  japaneseGrade?: string
  chineseGrade?: string
  createdAt?: string
  updatedAt?: string
}

interface EmployeesManagementProps {
  showBackButton?: boolean
}

export function EmployeesManagement({ showBackButton = false }: EmployeesManagementProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("")
  const [koreanEnglishFilter, setKoreanEnglishFilter] = useState<string>("all")
  const [japaneseFilter, setJapaneseFilter] = useState<string>("all")
  const [chineseFilter, setChineseFilter] = useState<string>("all")
  const [isActiveFilter, setIsActiveFilter] = useState<string>("true")
  const [isInstructorFilter, setIsInstructorFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState({ total: 0, active: 0, instructors: 0, admins: 0 })
  const [allEmployees, setAllEmployees] = useState<Employee[]>([])
  const limit = 20
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<any>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [evaluations, setEvaluations] = useState<any[]>([])
  const [educationCheckins, setEducationCheckins] = useState<any[]>([])
  const [evaluationStats, setEvaluationStats] = useState<any>(null)
  const [educationStats, setEducationStats] = useState<any>(null)
  const [detailActiveTab, setDetailActiveTab] = useState("info")
  const [isChartModalOpen, setIsChartModalOpen] = useState(false)
  const [chartLanguage, setChartLanguage] = useState<string>("korean-english")

  // 전체 직원 통계 조회 (필터 없이)
  const fetchAllEmployeesForStats = async () => {
    try {
      const response = await fetch(`/api/admin/employees?limit=10000`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      })
      const data = await response.json()

      if (data.success) {
        setAllEmployees(data.employees)
        const active = data.employees.filter((e: Employee) => e.isActive).length
        const instructors = data.employees.filter((e: Employee) => e.isInstructor).length
        const admins = data.employees.filter((e: Employee) => e.isAdmin).length
        setStats({ total: data.employees.length, active, instructors, admins })
      }
    } catch (error) {
      console.error("전체 직원 통계 조회 실패:", error)
    }
  }

  // 직원 목록 조회 (페이지네이션)
  const fetchEmployees = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(departmentFilter && { department: departmentFilter }),
        ...(isActiveFilter && isActiveFilter !== "all" && { isActive: isActiveFilter }),
      })

      // 권한 필터 처리
      if (isInstructorFilter === "instructor") {
        params.append("isInstructor", "true")
      } else if (isInstructorFilter === "admin") {
        params.append("isAdmin", "true")
      }
      
      // 언어별 자격 필터 처리
      if (koreanEnglishFilter !== "all") {
        params.append("koreanEnglishGrade", koreanEnglishFilter)
      }
      if (japaneseFilter !== "all") {
        params.append("japaneseGrade", japaneseFilter)
      }
      if (chineseFilter !== "all") {
        params.append("chineseGrade", chineseFilter)
      }

      const response = await fetch(`/api/admin/employees?${params}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      })
      const data = await response.json()

      if (data.success) {
        // API에서 이미 사번 역순으로 정렬되어 옴
        setEmployees(data.employees)
        setTotalPages(data.totalPages)
        setTotal(data.total)
      }
    } catch (error) {
      console.error("직원 목록 조회 실패:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchEmployees()
  }, [page, searchTerm, departmentFilter, koreanEnglishFilter, japaneseFilter, chineseFilter, isActiveFilter, isInstructorFilter])

  useEffect(() => {
    fetchAllEmployeesForStats()
  }, [])

  const resetFilters = () => {
    setSearchTerm("")
    setSearchInput("")
    setDepartmentFilter("")
    setKoreanEnglishFilter("all")
    setJapaneseFilter("all")
    setChineseFilter("all")
    setIsActiveFilter("true")
    setIsInstructorFilter("all")
    setPage(1)
  }

  const handleRowClick = async (employee: Employee) => {
    setSelectedEmployee(employee)
    setIsViewModalOpen(true)
    setDetailActiveTab("info")
    
    // 평가 이력 조회
    try {
      const evalResponse = await fetch(`/api/admin/employees/${employee.employeeId}/evaluations?limit=100`)
      const evalData = await evalResponse.json()
      if (evalData.success) {
        setEvaluations(evalData.evaluations || [])
        setEvaluationStats(evalData.stats || null)
      }
    } catch (error) {
      console.error("평가 이력 조회 실패:", error)
    }

    // 교육 이력 조회
    try {
      const eduResponse = await fetch(`/api/admin/employees/${employee.employeeId}/education?limit=100`)
      const eduData = await eduResponse.json()
      if (eduData.success) {
        setEducationCheckins(eduData.educationCheckins || [])
        setEducationStats(eduData.stats || null)
      }
    } catch (error) {
      console.error("교육 이력 조회 실패:", error)
    }
  }

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee)
    setIsEditModalOpen(true)
  }

  const handleDeactivate = async (employee: Employee) => {
    if (!confirm(`${employee.name}을(를) 비활성화하시겠습니까?`)) return

    try {
      const response = await fetch(`/api/admin/employees/${employee.employeeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...employee, isActive: false }),
      })

      if (response.ok) {
        alert("직원이 비활성화되었습니다.")
        fetchEmployees()
        fetchAllEmployeesForStats()
      } else {
        alert("비활성화 중 오류가 발생했습니다.")
      }
    } catch (error) {
      console.error("비활성화 오류:", error)
      alert("직원 비활성화 중 오류가 발생했습니다.")
    }
  }

  // 엑셀 파일 업로드
  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith(".xlsx") && !file.name.toLowerCase().endsWith(".xls")) {
      alert("엑셀 파일(.xlsx, .xls)만 업로드 가능합니다")
      return
    }

    if (!confirm(`"${file.name}" 파일을 업로드하시겠습니까?\n\n• 기존 직원: 엑셀에 있는 정보만 업데이트 (자격증 빈 셀은 기존 값 유지)\n• 신규 직원: DB에 새로 추가`)) {
      event.target.value = ""
      return
    }

    try {
      setIsUploading(true)
      setUploadResult(null)

      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/admin/employees/upload", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        setUploadResult(data)
        let message = 
          `✅ 업로드 완료!\n\n` +
          `• 총 처리: ${data.summary.total}행\n` +
          `• 신규 생성: ${data.summary.created}명\n` +
          `• 업데이트: ${data.summary.updated}명\n` +
          `• 건너뜀: ${data.summary.skipped}명\n` +
          (data.summary.errors > 0 ? `• 오류: ${data.summary.errors}건\n` : "")
        
        if (data.errors && data.errors.length > 0) {
          message += `\n⚠️ 오류 상세:\n${data.errors.slice(0, 5).join('\n')}`
          if (data.errors.length > 5) {
            message += `\n... 외 ${data.errors.length - 5}개`
          }
        }
        
        alert(message)
        
        // 캐시 무효화 및 데이터 새로고침
        await Promise.all([
          fetchEmployees(),
          fetchAllEmployeesForStats()
        ])
      } else {
        alert(`❌ 업로드 실패: ${data.error}`)
      }
    } catch (error) {
      console.error("엑셀 업로드 오류:", error)
      alert("엑셀 업로드 중 오류가 발생했습니다")
    } finally {
      setIsUploading(false)
      event.target.value = ""
    }
  }

  return (
    <div className="space-y-6">
      {/* 🎨 개선된 Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showBackButton && (
            <Link href="/admin">
              <Button variant="outline" size="sm" className="shadow-sm">
                <Home className="mr-2 h-4 w-4" />
                Admin 홈
              </Button>
            </Link>
          )}
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              <Users className="h-8 w-8 text-blue-600" />
              User 정보 관리
            </h1>
            <p className="text-sm text-gray-500 mt-1">직원 정보 조회 및 관리</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button onClick={fetchEmployees} variant="outline" size="sm" className="shadow-sm hover:shadow-md transition-shadow">
            <RefreshCw className="mr-2 h-4 w-4" />
            새로고침
          </Button>
          <div className="relative">
            <input
              type="file"
              id="excelUpload"
              accept=".xlsx,.xls"
              onChange={handleExcelUpload}
              className="hidden"
              disabled={isUploading}
            />
            <Button
              onClick={() => document.getElementById("excelUpload")?.click()}
              variant="outline"
              size="sm"
              disabled={isUploading}
              className="shadow-sm hover:shadow-md transition-shadow"
            >
              <Upload className="mr-2 h-4 w-4" />
              {isUploading ? "업로드 중..." : "엑셀 업로드"}
            </Button>
          </div>
          <Button size="sm" onClick={() => setIsAddModalOpen(true)} className="shadow-md hover:shadow-lg transition-shadow bg-gradient-to-r from-blue-600 to-indigo-600">
            <Plus className="mr-2 h-4 w-4" />
            직원 추가
          </Button>
        </div>
      </div>

      {/* 🎨 개선된 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card 
          className="border-0 shadow-md hover:shadow-xl transition-all cursor-pointer transform hover:-translate-y-1 bg-gradient-to-br from-blue-50 to-blue-100"
          onClick={() => {
            resetFilters()
            setIsInstructorFilter("")
            setPage(1)
          }}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
              <Users className="h-4 w-4" />
              전체 직원
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">{stats.total}<span className="text-lg ml-1">명</span></div>
          </CardContent>
        </Card>
        <Card 
          className={`border-0 shadow-md hover:shadow-xl transition-all cursor-pointer transform hover:-translate-y-1 bg-gradient-to-br ${
            isActiveFilter === "true" ? "from-red-50 to-red-100" : "from-green-50 to-green-100"
          }`}
          onClick={() => {
            if (isActiveFilter === "true") {
              setIsActiveFilter("false")
            } else {
              setIsActiveFilter("true")
            }
            setIsInstructorFilter("")
            setPage(1)
          }}
        >
          <CardHeader className="pb-3">
            <CardTitle className={`text-sm font-medium flex items-center gap-2 ${
              isActiveFilter === "true" ? "text-red-700" : "text-green-700"
            }`}>
              <UserCheck className="h-4 w-4" />
              {isActiveFilter === "true" ? "비활성 직원" : "활성 직원"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${
              isActiveFilter === "true" ? "text-red-900" : "text-green-900"
            }`}>
              {isActiveFilter === "true" ? stats.total - stats.active : stats.active}
              <span className="text-lg ml-1">명</span>
            </div>
          </CardContent>
        </Card>
        <Card 
          className="border-0 shadow-md hover:shadow-xl transition-all cursor-pointer transform hover:-translate-y-1 bg-gradient-to-br from-purple-50 to-purple-100"
          onClick={() => {
            setIsInstructorFilter("instructor")
            setIsActiveFilter("")
            setPage(1)
          }}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
              <Award className="h-4 w-4" />
              교관
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900">{stats.instructors}<span className="text-lg ml-1">명</span></div>
          </CardContent>
        </Card>
        <Card 
          className="border-0 shadow-md hover:shadow-xl transition-all cursor-pointer transform hover:-translate-y-1 bg-gradient-to-br from-orange-50 to-orange-100"
          onClick={() => {
            setIsInstructorFilter("admin")
            setIsActiveFilter("")
            setPage(1)
          }}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-orange-700 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              관리자
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-900">{stats.admins}<span className="text-lg ml-1">명</span></div>
          </CardContent>
        </Card>
      </div>

      {/* 🎨 개선된 직원 목록 */}
      <Card className="border-none shadow-xl">
        <CardContent className="pt-6">
          {/* 검색 & 필터 */}
          <div className="mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative col-span-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="이름, 이메일, 사번으로 검색 (Enter)"
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setSearchTerm(searchInput)
                      setPage(1)
                    }
                  }}
                  className="pl-10 h-11 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <Button onClick={resetFilters} variant="outline" className="h-11 shadow-sm hover:shadow-md transition-shadow">
                <Filter className="mr-2 h-4 w-4" />
                필터 초기화
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 p-4 rounded-lg border border-gray-200">
              <Input
                placeholder="부서 필터"
                value={departmentFilter}
                onChange={(e) => {
                  setDepartmentFilter(e.target.value)
                  setPage(1)
                }}
                className="bg-white"
              />
              <Select value={koreanEnglishFilter} onValueChange={(v) => { setKoreanEnglishFilter(v); setPage(1); }}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="한/영" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">한/영</SelectItem>
                  <SelectItem value="ANNC_S">S</SelectItem>
                  <SelectItem value="ANNC_A">A</SelectItem>
                  <SelectItem value="ANNC_B">B</SelectItem>
                </SelectContent>
              </Select>
              <Select value={japaneseFilter} onValueChange={(v) => { setJapaneseFilter(v); setPage(1); }}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="일본어" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">일본어</SelectItem>
                  <SelectItem value="JP_A">A</SelectItem>
                  <SelectItem value="JP_B">B</SelectItem>
                </SelectContent>
              </Select>
              <Select value={chineseFilter} onValueChange={(v) => { setChineseFilter(v); setPage(1); }}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="중국어" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">중국어</SelectItem>
                  <SelectItem value="CN_A">A</SelectItem>
                  <SelectItem value="CN_B">B</SelectItem>
                </SelectContent>
              </Select>
              <Select value={isActiveFilter} onValueChange={(v) => { setIsActiveFilter(v); setPage(1); }}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      전체 상태
                    </div>
                  </SelectItem>
                  <SelectItem value="true">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      활성
                    </div>
                  </SelectItem>
                  <SelectItem value="false">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-400" />
                      비활성
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select value={isInstructorFilter} onValueChange={(v) => { setIsInstructorFilter(v); setPage(1); }}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="권한" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 권한</SelectItem>
                  <SelectItem value="instructor">🎓 교관</SelectItem>
                  <SelectItem value="admin">👑 관리자</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12 min-h-[600px] flex flex-col items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-4" />
              <p className="text-gray-500">데이터를 불러오는 중...</p>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <Table>
                  <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <TableRow>
                      <TableHead className="font-semibold text-gray-700 text-center">상태</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center">이름</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center">사번</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center">이메일</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center">부서</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center">방송코드</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center">자격</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center">권한</TableHead>
                      <TableHead className="text-center font-semibold text-gray-700">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => (
                      <TableRow 
                        key={employee.id}
                        onClick={() => handleRowClick(employee)}
                        className="cursor-pointer hover:bg-blue-50 transition-colors"
                      >
                        <TableCell className="text-center">
                          <div 
                            className={`w-3 h-3 rounded-full shadow-sm mx-auto ${
                              employee.isActive ? "bg-green-500 animate-pulse" : "bg-orange-400"
                            }`}
                            title={employee.isActive ? "활성" : "비활성"}
                          />
                        </TableCell>
                        <TableCell className="font-medium text-gray-900 text-center">{employee.name}</TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {employee.employeeId}
                          </span>
                        </TableCell>
                        <TableCell className="text-gray-600 text-center">{employee.email}</TableCell>
                        <TableCell className="text-gray-600 text-center">{employee.department}</TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md">
                            {employee.position || "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {employee.koreanEnglishGrade && (() => {
                              const grade = employee.koreanEnglishGrade.replace("ANNC_", "");
                              const isGlossy = grade === "S" || grade === "A";
                              return (
                                <span className={isGlossy 
                                  ? 'inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 text-white shadow-lg ring-2 ring-blue-300 ring-offset-1' 
                                  : 'inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border shadow-sm bg-blue-100 text-blue-800 border-blue-300'
                                }>
                                  한영: {grade}
                                </span>
                              );
                            })()}
                            {employee.japaneseGrade && (() => {
                              const grade = employee.japaneseGrade.replace("JP_", "");
                              const isGlossy = grade === "S" || grade === "A";
                              return (
                                <span className={isGlossy 
                                  ? 'inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 text-white shadow-lg ring-2 ring-purple-300 ring-offset-1' 
                                  : 'inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border shadow-sm bg-purple-100 text-purple-800 border-purple-300'
                                }>
                                  일: {grade}
                                </span>
                              );
                            })()}
                            {employee.chineseGrade && (() => {
                              const grade = employee.chineseGrade.replace("CN_", "");
                              const isGlossy = grade === "S" || grade === "A";
                              return (
                                <span className={isGlossy 
                                  ? 'inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-gradient-to-br from-red-400 via-red-500 to-red-600 text-white shadow-lg ring-2 ring-red-300 ring-offset-1' 
                                  : 'inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border shadow-sm bg-red-100 text-red-800 border-red-300'
                                }>
                                  중: {grade}
                                </span>
                              );
                            })()}
                            {!employee.koreanEnglishGrade && !employee.japaneseGrade && !employee.chineseGrade && (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-wrap gap-1 justify-center">
                            {employee.isAdmin && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                                👑 관리자
                              </span>
                            )}
                            {employee.isInstructor && !employee.isAdmin && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                🎓 교관
                              </span>
                            )}
                            {!employee.isInstructor && !employee.isAdmin && (
                              <span className="text-xs text-gray-400">일반</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex gap-1 justify-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRowClick(employee)
                              }}
                              className="h-8 w-8 p-0 hover:bg-blue-100"
                            >
                              <Eye className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEdit(employee)
                              }}
                              className="h-8 w-8 p-0 hover:bg-green-100"
                            >
                              <Edit className="h-4 w-4 text-green-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-600">
                  총 <span className="font-semibold text-gray-900">{total}</span>명 중 <span className="font-semibold text-gray-900">{(page - 1) * limit + 1}</span>-<span className="font-semibold text-gray-900">{Math.min(page * limit, total)}</span>명 표시
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="shadow-sm"
                  >
                    이전
                  </Button>
                  <div className="flex items-center gap-2 px-4">
                    <span className="text-sm font-medium">
                      {page} / {totalPages}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="shadow-sm"
                  >
                    다음
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 🎨 개선된 직원 상세 모달 */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                {selectedEmployee?.name.charAt(0)}
              </div>
              <div>
                <div>{selectedEmployee?.name}</div>
                <div className="text-sm font-normal text-gray-500 mt-1">
                  {selectedEmployee?.employeeId} · {selectedEmployee?.department}
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <Tabs value={detailActiveTab} onValueChange={setDetailActiveTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1 rounded-lg">
              <TabsTrigger value="info" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all">
                <Users className="h-4 w-4 mr-2" />
                기본 정보
              </TabsTrigger>
              <TabsTrigger value="evaluations" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all">
                <TrendingUp className="h-4 w-4 mr-2" />
                평가 이력
              </TabsTrigger>
              <TabsTrigger value="education" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all">
                <BookOpen className="h-4 w-4 mr-2" />
                교육 이력
              </TabsTrigger>
            </TabsList>

            {/* 기본 정보 탭 */}
            <TabsContent value="info" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-white">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      기본 정보
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <div className="text-xs text-gray-500">이메일</div>
                        <div className="text-sm font-medium text-gray-900">{selectedEmployee?.email}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Building className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <div className="text-xs text-gray-500">부서</div>
                        <div className="text-sm font-medium text-gray-900">{selectedEmployee?.department}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Briefcase className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <div className="text-xs text-gray-500">직급</div>
                        <div className="text-sm font-medium text-gray-900">{selectedEmployee?.position || "-"}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-md bg-gradient-to-br from-green-50 to-white">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-green-900 flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      기내방송 자격 정보
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="text-xs text-gray-500 mb-2">한/영 방송</div>
                      <div className="flex items-center gap-2">
                        {selectedEmployee?.koreanEnglishGrade ? (
                          <>
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800 border border-green-300">
                              {selectedEmployee.koreanEnglishGrade}
                            </span>
                            {selectedEmployee.koreanEnglishExpiry && (
                              <span className="text-xs text-gray-500">
                                ~ {new Date(selectedEmployee.koreanEnglishExpiry).toLocaleDateString("ko-KR")}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-2">일본어 방송</div>
                      {selectedEmployee?.japaneseGrade ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-purple-100 text-purple-800 border border-purple-300">
                          {selectedEmployee.japaneseGrade}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-2">중국어 방송</div>
                      {selectedEmployee?.chineseGrade ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800 border border-red-300">
                          {selectedEmployee.chineseGrade}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-md bg-gradient-to-br from-orange-50 to-white">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-orange-900 flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      권한 및 역할
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-gray-500 w-20">상태</div>
                      <div className="flex items-center gap-2">
                        <div 
                          className={`w-2 h-2 rounded-full ${
                            selectedEmployee?.isActive ? "bg-green-500" : "bg-orange-500"
                          }`}
                        />
                        <span className={`text-sm font-medium ${
                          selectedEmployee?.isActive ? "text-green-700" : "text-orange-700"
                        }`}>
                          {selectedEmployee?.isActive ? "활성" : "비활성"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-gray-500 w-20">권한</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedEmployee?.isAdmin && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                            👑 관리자
                          </span>
                        )}
                        {selectedEmployee?.isInstructor && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                            🎓 교관
                          </span>
                        )}
                        {!selectedEmployee?.isInstructor && !selectedEmployee?.isAdmin && (
                          <span className="text-sm text-gray-400">일반 사용자</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-md bg-gradient-to-br from-gray-50 to-white">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      시스템 정보
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="text-xs text-gray-500">등록일</div>
                      <div className="text-sm font-medium text-gray-900">
                        {selectedEmployee?.createdAt
                          ? new Date(selectedEmployee.createdAt).toLocaleString("ko-KR")
                          : "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">최종 수정일</div>
                      <div className="text-sm font-medium text-gray-900">
                        {selectedEmployee?.updatedAt
                          ? new Date(selectedEmployee.updatedAt).toLocaleString("ko-KR")
                          : "-"}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* 평가 이력 탭 */}
            <TabsContent value="evaluations" className="space-y-4 mt-6">
              {evaluationStats && (
                <>
                  {/* 평균 점수 및 언어별 평가 횟수 카드 - 한 행에 5개 */}
                  <div className="grid grid-cols-5 gap-3 mb-6">
                    <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-white min-h-[110px] flex flex-col">
                      <CardHeader className="pb-2 pt-3 flex flex-row items-center justify-between">
                        <CardTitle className="text-xs font-semibold text-blue-700">한국어 평균 점수</CardTitle>
                        <div className="w-7"></div>
                      </CardHeader>
                      <CardContent className="pb-3 flex-1 flex items-center justify-center">
                        <div className="text-2xl font-bold text-blue-900">
                          {evaluationStats.averageKoreanScore ? `${evaluationStats.averageKoreanScore}점` : "-"}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-none shadow-md bg-gradient-to-br from-green-50 to-white min-h-[110px] flex flex-col">
                      <CardHeader className="pb-2 pt-3 flex flex-row items-center justify-between">
                        <CardTitle className="text-xs font-semibold text-green-700">영어 평균 점수</CardTitle>
                        <div className="w-7"></div>
                      </CardHeader>
                      <CardContent className="pb-3 flex-1 flex items-center justify-center">
                        <div className="text-2xl font-bold text-green-900">
                          {evaluationStats.averageEnglishScore ? `${evaluationStats.averageEnglishScore}점` : "-"}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-white hover:shadow-xl transition-shadow min-h-[110px] flex flex-col">
                      <CardHeader className="pb-2 pt-3 flex flex-row items-center justify-between">
                        <CardTitle className="text-xs font-semibold text-purple-700">한/영 응시 횟수</CardTitle>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 hover:bg-purple-100"
                          onClick={() => {
                            setChartLanguage("korean-english")
                            setIsChartModalOpen(true)
                          }}
                          disabled={!evaluationStats.byLanguage?.["korean-english"]}
                        >
                          <BarChart3 className="h-3.5 w-3.5 text-purple-600" />
                        </Button>
                      </CardHeader>
                      <CardContent className="pb-3 flex-1 flex items-center justify-center">
                        <div className="text-2xl font-bold text-purple-900">{evaluationStats.byLanguage?.["korean-english"] || 0}회</div>
                      </CardContent>
                    </Card>
                    <Card className="border-none shadow-lg bg-gradient-to-br from-pink-50 to-white hover:shadow-xl transition-shadow min-h-[110px] flex flex-col">
                      <CardHeader className="pb-2 pt-3 flex flex-row items-center justify-between">
                        <CardTitle className="text-xs font-semibold text-pink-700">일본어 응시 횟수</CardTitle>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 hover:bg-pink-100"
                          onClick={() => {
                            setChartLanguage("japanese")
                            setIsChartModalOpen(true)
                          }}
                          disabled={!evaluationStats.byLanguage?.["japanese"]}
                        >
                          <BarChart3 className="h-3.5 w-3.5 text-pink-600" />
                        </Button>
                      </CardHeader>
                      <CardContent className="pb-3 flex-1 flex items-center justify-center">
                        <div className="text-2xl font-bold text-pink-900">{evaluationStats.byLanguage?.["japanese"] || 0}회</div>
                      </CardContent>
                    </Card>
                    <Card className="border-none shadow-lg bg-gradient-to-br from-red-50 to-white hover:shadow-xl transition-shadow min-h-[110px] flex flex-col">
                      <CardHeader className="pb-2 pt-3 flex flex-row items-center justify-between">
                        <CardTitle className="text-xs font-semibold text-red-700">중국어 응시 횟수</CardTitle>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 hover:bg-red-100"
                          onClick={() => {
                            setChartLanguage("chinese")
                            setIsChartModalOpen(true)
                          }}
                          disabled={!evaluationStats.byLanguage?.["chinese"]}
                        >
                          <BarChart3 className="h-3.5 w-3.5 text-red-600" />
                        </Button>
                      </CardHeader>
                      <CardContent className="pb-3 flex-1 flex items-center justify-center">
                        <div className="text-2xl font-bold text-red-900">{evaluationStats.byLanguage?.["chinese"] || 0}회</div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}

              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="text-center">언어</TableHead>
                      <TableHead className="text-center">구분</TableHead>
                      <TableHead className="text-center">등급</TableHead>
                      <TableHead className="text-center">점수</TableHead>
                      <TableHead className="text-center">평가일</TableHead>
                      <TableHead className="text-center">평가자</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evaluations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          평가 이력이 없습니다
                        </TableCell>
                      </TableRow>
                    ) : (
                      evaluations.map((evaluation) => (
                        <TableRow key={evaluation.id} className="hover:bg-gray-50">
                          <TableCell className="text-center">
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {evaluation.language === "korean-english" ? "한/영" : evaluation.language === "japanese" ? "일본어" : "중국어"}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              {evaluation.category}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold ${evaluation.gradeBgColor} ${evaluation.gradeColor}`}>
                              {evaluation.displayGrade || evaluation.grade}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {evaluation.scoreBreakdown ? (
                              <div className="text-sm flex flex-col items-center gap-0.5">
                                {evaluation.language === "korean-english" ? (
                                  <>
                                    <div className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">한: {evaluation.scoreBreakdown.korean}점</div>
                                    <div className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded">영: {evaluation.scoreBreakdown.english}점</div>
                                  </>
                                ) : (
                                  <div className="font-semibold text-gray-900">{evaluation.scoreBreakdown.total}점</div>
                                )}
                              </div>
                            ) : "-"}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600 text-center">
                            {evaluation.evaluatedAt
                              ? new Date(evaluation.evaluatedAt).toLocaleDateString("ko-KR")
                              : "-"}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600 text-center">{evaluation.evaluatedBy || "-"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* 교육 이력 탭 */}
            <TabsContent value="education" className="space-y-4 mt-6">
              {(() => {
                // 언어별, 타입별 통계 계산
                const langStats: Record<string, { total: number; small: number; oneOnOne: number }> = {}
                let totalEducation = educationCheckins.length

                educationCheckins.forEach((checkin) => {
                  const rawLang = checkin.educationLanguage || "기타"
                  // 영어 → 한국어 변환
                  const lang = rawLang === "korean-english" ? "한/영" : 
                               rawLang === "japanese" ? "일본어" : 
                               rawLang === "chinese" ? "중국어" : rawLang
                  if (!langStats[lang]) {
                    langStats[lang] = { total: 0, small: 0, oneOnOne: 0 }
                  }
                  langStats[lang].total++
                  
                  const type = checkin.educationType || ""
                  if (type === "small-group" || type.includes("소규모")) {
                    langStats[lang].small++
                  } else if (type === "one-on-one" || type.includes("1:1")) {
                    langStats[lang].oneOnOne++
                  }
                })

                return (
                  <>
                    {/* 교육 통계 - 한 행에 모든 카드 배치 */}
                    <div className="grid grid-cols-4 gap-3 mb-6">
                      {/* 총 교육 */}
                      <Card className="border-none shadow-md bg-gradient-to-br from-indigo-50 to-white min-h-[110px]">
                        <CardHeader className="pb-2 pt-3 flex flex-row items-center justify-between">
                          <CardTitle className="text-xs font-semibold text-indigo-700">총 교육</CardTitle>
                          <div className="w-7"></div>
                        </CardHeader>
                        <CardContent className="pb-3">
                          <div className="text-2xl font-bold text-indigo-900">{totalEducation}회</div>
                        </CardContent>
                      </Card>

                      {/* 언어별 통계 */}
                      {Object.entries(langStats).map(([lang, stats]) => (
                        <Card key={lang} className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-white hover:shadow-xl transition-shadow min-h-[110px]">
                          <CardHeader className="pb-2 pt-3 flex flex-row items-center justify-between">
                            <CardTitle className="text-xs font-semibold text-purple-700">{lang} 교육</CardTitle>
                            <div className="w-7"></div>
                          </CardHeader>
                          <CardContent className="pb-3">
                            <div className="text-2xl font-bold text-purple-900 mb-1">{stats.total}회</div>
                            <div className="text-xs text-purple-600 space-y-0.5">
                              <div className="flex justify-between">
                                <span>소규모 교정교육:</span>
                                <span className="font-semibold">{stats.small}회</span>
                              </div>
                              <div className="flex justify-between">
                                <span>1:1 온라인 교정교육:</span>
                                <span className="font-semibold">{stats.oneOnOne}회</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )
              })()}

              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="text-center">날짜</TableHead>
                      <TableHead className="text-center">종류</TableHead>
                      <TableHead className="text-center">교관</TableHead>
                      <TableHead className="text-center">언어</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {educationCheckins.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                          교육 이력이 없습니다
                        </TableCell>
                      </TableRow>
                    ) : (
                      educationCheckins.map((checkin) => {
                        // 종류 변환 (영어 → 한국어 풀네임)
                        const getEducationTypeLabel = (type: string) => {
                          if (!type) return "-";
                          if (type === "one-on-one" || type.includes("1:1")) return "1:1 온라인 교정교육";
                          if (type === "small-group" || type.includes("소규모")) return "소규모 교정교육";
                          return type;
                        };

                        // 언어 변환 (영어 → 한국어)
                        const getLanguageLabel = (lang: string) => {
                          if (!lang) return "-";
                          if (lang === "korean-english") return "한/영";
                          if (lang === "japanese") return "일본어";
                          if (lang === "chinese") return "중국어";
                          return lang;
                        };

                        return (
                          <TableRow key={checkin.id} className="hover:bg-gray-50">
                            <TableCell className="text-sm text-gray-900 text-center">
                              {checkin.educationDate
                                ? new Date(checkin.educationDate).toLocaleDateString("ko-KR")
                                : "-"}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                                {getEducationTypeLabel(checkin.educationType || "")}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600 text-center">{checkin.instructorName || "-"}</TableCell>
                            <TableCell className="text-center">
                              {checkin.educationLanguage && (
                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  {getLanguageLabel(checkin.educationLanguage)}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6 flex justify-between">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
                닫기
              </Button>
              <Button onClick={() => {
                setIsViewModalOpen(false)
                setIsEditModalOpen(true)
              }} className="bg-gradient-to-r from-blue-600 to-indigo-600">
                <Edit className="mr-2 h-4 w-4" />
                수정
              </Button>
            </div>
            <Button 
              variant="destructive" 
              onClick={async () => {
                if (!selectedEmployee) return;
                
                const confirmed = window.confirm(
                  `정말로 "${selectedEmployee.name}" 직원을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 데이터베이스에는 기록이 남습니다.`
                );
                
                if (!confirmed) return;
                
                try {
                  const response = await fetch(`/api/admin/employees/${selectedEmployee.employeeId}`, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      deletedBy: "ADMIN" // 실제로는 로그인한 사용자 정보 사용
                    }),
                  });
                  
                  const data = await response.json();
                  
                  if (data.success) {
                    alert("직원이 삭제되었습니다.");
                    setIsViewModalOpen(false);
                    fetchEmployees(); // 목록 새로고침
                    fetchAllEmployeesForStats(); // 통계 새로고침
                  } else {
                    alert(`삭제 실패: ${data.error}`);
                  }
                } catch (error) {
                  console.error("삭제 오류:", error);
                  alert("직원 삭제 중 오류가 발생했습니다.");
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 직원 수정 모달 */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Edit className="h-6 w-6 text-blue-600" />
              직원 정보 수정
            </DialogTitle>
          </DialogHeader>
          <EmployeeEditForm 
            employee={selectedEmployee}
            onClose={() => {
              setIsEditModalOpen(false)
              fetchEmployees()
              fetchAllEmployeesForStats()
            }}
          />
        </DialogContent>
      </Dialog>

      {/* 평가 점수 차트 모달 */}
      <Dialog open={isChartModalOpen} onOpenChange={setIsChartModalOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-blue-600" />
              {chartLanguage === "korean-english" ? "한/영" : chartLanguage === "japanese" ? "일본어" : "중국어"} 평가 점수 추이
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-6">
            {(() => {
              // 선택된 언어의 평가만 필터링
              const filteredEvals = evaluations
                .filter((ev) => ev.language === chartLanguage)
                .sort((a, b) => new Date(a.evaluatedAt).getTime() - new Date(b.evaluatedAt).getTime())

              if (filteredEvals.length === 0) {
                return (
                  <div className="text-center py-12 text-gray-500">
                    해당 언어의 평가 데이터가 없습니다
                  </div>
                )
              }

              // 차트 데이터 생성
              const chartData = filteredEvals.map((ev, index) => {
                const date = new Date(ev.evaluatedAt).toLocaleDateString("ko-KR", {
                  year: "2-digit",
                  month: "2-digit",
                  day: "2-digit",
                })

                if (chartLanguage === "korean-english") {
                  return {
                    name: `${index + 1}차`,
                    date,
                    한국어: ev.scoreBreakdown?.korean || 0,
                    영어: ev.scoreBreakdown?.english || 0,
                  }
                } else {
                  return {
                    name: `${index + 1}차`,
                    date,
                    점수: ev.scoreBreakdown?.total || 0,
                  }
                }
              })

              return (
                <>
                  {chartLanguage === "korean-english" ? (
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm font-semibold text-blue-700 mb-3">한국어 점수</div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <div className="text-xs text-gray-500">최고</div>
                              <div className="text-lg font-bold text-blue-600">
                                {Math.max(...filteredEvals.map((ev) => ev.scoreBreakdown?.korean || 0))}점
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500">평균</div>
                              <div className="text-lg font-bold text-blue-600">
                                {(
                                  filteredEvals.reduce((sum, ev) => sum + (ev.scoreBreakdown?.korean || 0), 0) /
                                  filteredEvals.length
                                ).toFixed(1)}점
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500">최근</div>
                              <div className="text-lg font-bold text-blue-600">
                                {filteredEvals[filteredEvals.length - 1]?.scoreBreakdown?.korean || 0}점
                              </div>
                            </div>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-green-700 mb-3">영어 점수</div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <div className="text-xs text-gray-500">최고</div>
                              <div className="text-lg font-bold text-green-600">
                                {Math.max(...filteredEvals.map((ev) => ev.scoreBreakdown?.english || 0))}점
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500">평균</div>
                              <div className="text-lg font-bold text-green-600">
                                {(
                                  filteredEvals.reduce((sum, ev) => sum + (ev.scoreBreakdown?.english || 0), 0) /
                                  filteredEvals.length
                                ).toFixed(1)}점
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500">최근</div>
                              <div className="text-lg font-bold text-green-600">
                                {filteredEvals[filteredEvals.length - 1]?.scoreBreakdown?.english || 0}점
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-xs text-gray-500">최고 점수</div>
                          <div className="text-xl font-bold text-green-600">
                            {Math.max(...filteredEvals.map((ev) => ev.scoreBreakdown?.total || 0))}점
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">평균 점수</div>
                          <div className="text-xl font-bold text-blue-600">
                            {(
                              filteredEvals.reduce((sum, ev) => sum + (ev.scoreBreakdown?.total || 0), 0) /
                              filteredEvals.length
                            ).toFixed(1)}점
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">최근 점수</div>
                          <div className="text-xl font-bold text-purple-600">
                            {filteredEvals[filteredEvals.length - 1]?.scoreBreakdown?.total || 0}점
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis
                        dataKey="name"
                        stroke="#666"
                        tick={{ fontSize: 12 }}
                        label={{ value: "평가 회차", position: "insideBottom", offset: -5 }}
                      />
                      <YAxis
                        stroke="#666"
                        tick={{ fontSize: 12 }}
                        domain={chartLanguage === "korean-english" ? [0, 100] : [0, 100]}
                        label={{ value: "점수", angle: -90, position: "insideLeft" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid #ccc",
                          borderRadius: "8px",
                          padding: "10px",
                        }}
                        formatter={(value: any) => [`${value}점`, ""]}
                        labelFormatter={(label, payload) => {
                          if (payload && payload[0]) {
                            return `${payload[0].payload.name} (${payload[0].payload.date})`
                          }
                          return label
                        }}
                      />
                      <Legend wrapperStyle={{ paddingTop: "20px" }} />
                      {chartLanguage === "korean-english" ? (
                        <>
                          <Line
                            type="monotone"
                            dataKey="한국어"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={{ r: 5, fill: "#3b82f6" }}
                            activeDot={{ r: 7 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="영어"
                            stroke="#10b981"
                            strokeWidth={2}
                            dot={{ r: 5, fill: "#10b981" }}
                            activeDot={{ r: 7 }}
                          />
                        </>
                      ) : (
                        <Line
                          type="monotone"
                          dataKey="점수"
                          stroke="#8b5cf6"
                          strokeWidth={2}
                          dot={{ r: 5, fill: "#8b5cf6" }}
                          activeDot={{ r: 7 }}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>

                  <div className="mt-6 text-center text-sm text-gray-500">
                    총 {filteredEvals.length}회 평가 기록
                  </div>
                </>
              )
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* 직원 추가 모달 */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Plus className="h-6 w-6 text-blue-600" />
              직원 추가
            </DialogTitle>
          </DialogHeader>
          <EmployeeAddForm 
            onClose={() => {
              setIsAddModalOpen(false)
              fetchEmployees()
              fetchAllEmployeesForStats()
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

// 🎨 직원 추가 폼 (개선됨)
function EmployeeAddForm({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    employeeId: '',
    department: '',
    position: '',
    lineTeam: '',
    isActive: true,
    isInstructor: false,
    isAdmin: false,
    koreanEnglishGrade: '',
    koreanEnglishExpiry: '',
    japaneseGrade: '',
    chineseGrade: '',
  })
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const response = await fetch(`/api/admin/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        alert('✅ 직원이 추가되었습니다.')
        onClose()
      } else {
        const error = await response.json()
        alert(`❌ 추가 실패: ${error.error}`)
      }
    } catch (error) {
      console.error('추가 실패:', error)
      alert('추가 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 기본 정보 */}
      <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-blue-900 flex items-center gap-2">
            <Users className="h-5 w-5" />
            기본 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name" className="text-sm font-medium">이름 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="employeeId" className="text-sm font-medium">사번 *</Label>
              <Input
                id="employeeId"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                required
                className="mt-1"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="email" className="text-sm font-medium">이메일 *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="department" className="text-sm font-medium">부서 *</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="position" className="text-sm font-medium">직급</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="lineTeam" className="text-sm font-medium">라인팀</Label>
              <Input
                id="lineTeam"
                value={formData.lineTeam}
                onChange={(e) => setFormData({ ...formData, lineTeam: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="flex items-center space-x-2 mt-4">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive" className="text-sm font-medium">활성 상태</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 권한 */}
      <Card className="border-none shadow-md bg-gradient-to-br from-orange-50 to-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-orange-900 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            권한
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-2">
            <Switch
              id="isInstructor"
              checked={formData.isInstructor}
              onCheckedChange={(checked) => setFormData({ ...formData, isInstructor: checked })}
            />
            <Label htmlFor="isInstructor" className="text-sm font-medium">교관</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="isAdmin"
              checked={formData.isAdmin}
              onCheckedChange={(checked) => setFormData({ ...formData, isAdmin: checked })}
            />
            <Label htmlFor="isAdmin" className="text-sm font-medium">관리자</Label>
          </div>
        </CardContent>
      </Card>

      {/* 기내방송 자격 정보 */}
      <Card className="border-none shadow-md bg-gradient-to-br from-green-50 to-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-green-900 flex items-center gap-2">
            <Award className="h-5 w-5" />
            기내방송 자격 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="koreanEnglishGrade" className="text-sm font-medium">한/영 방송 등급</Label>
              <Select
                value={formData.koreanEnglishGrade || "none"}
                onValueChange={(value) => setFormData({ ...formData, koreanEnglishGrade: value === "none" ? "" : value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="등급 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">없음</SelectItem>
                  <SelectItem value="ANNC_S">ANNC_S</SelectItem>
                  <SelectItem value="ANNC_A">ANNC_A</SelectItem>
                  <SelectItem value="ANNC_B">ANNC_B</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="koreanEnglishExpiry" className="text-sm font-medium">한/영 방송 만료일</Label>
              <Input
                id="koreanEnglishExpiry"
                type="date"
                value={formData.koreanEnglishExpiry}
                onChange={(e) => setFormData({ ...formData, koreanEnglishExpiry: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="japaneseGrade" className="text-sm font-medium">일본어 방송 등급</Label>
              <Select
                value={formData.japaneseGrade || "none"}
                onValueChange={(value) => setFormData({ ...formData, japaneseGrade: value === "none" ? "" : value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="등급 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">없음</SelectItem>
                  <SelectItem value="JP_A">JP_A</SelectItem>
                  <SelectItem value="JP_B">JP_B</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="chineseGrade" className="text-sm font-medium">중국어 방송 등급</Label>
              <Select
                value={formData.chineseGrade || "none"}
                onValueChange={(value) => setFormData({ ...formData, chineseGrade: value === "none" ? "" : value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="등급 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">없음</SelectItem>
                  <SelectItem value="CN_A">CN_A</SelectItem>
                  <SelectItem value="CN_B">CN_B</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          취소
        </Button>
        <Button type="submit" disabled={isSaving} className="bg-gradient-to-r from-blue-600 to-indigo-600">
          {isSaving ? '추가 중...' : '추가'}
        </Button>
      </DialogFooter>
    </form>
  )
}

// 🎨 직원 수정 폼 (개선됨)
function EmployeeEditForm({ employee, onClose }: { employee: Employee | null; onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: employee?.name || '',
    email: employee?.email || '',
    employeeId: employee?.employeeId || '',
    department: employee?.department || '',
    position: employee?.position || '',
    lineTeam: employee?.lineTeam || '',
    isActive: employee?.isActive || true,
    isInstructor: employee?.isInstructor || false,
    isAdmin: employee?.isAdmin || false,
    koreanEnglishGrade: employee?.koreanEnglishGrade || '',
    koreanEnglishExpiry: employee?.koreanEnglishExpiry 
      ? new Date(employee.koreanEnglishExpiry).toISOString().split('T')[0]
      : '',
    japaneseGrade: employee?.japaneseGrade || '',
    chineseGrade: employee?.chineseGrade || '',
  })
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employee) return
    setIsSaving(true)

    try {
      const response = await fetch(`/api/admin/employees/${employee.employeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        alert('✅ 직원 정보가 수정되었습니다.')
        onClose()
      } else {
        const error = await response.json()
        alert(`❌ 수정 실패: ${error.error}`)
      }
    } catch (error) {
      console.error('수정 실패:', error)
      alert('수정 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 동일한 스타일의 폼 카드들 */}
      <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-blue-900 flex items-center gap-2">
            <Users className="h-5 w-5" />
            기본 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-name" className="text-sm font-medium">이름 *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-employeeId" className="text-sm font-medium">사번 (변경 불가)</Label>
              <Input
                id="edit-employeeId"
                value={formData.employeeId}
                disabled
                className="mt-1 bg-gray-100"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="edit-email" className="text-sm font-medium">이메일 *</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-department" className="text-sm font-medium">부서 *</Label>
              <Input
                id="edit-department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-position" className="text-sm font-medium">직급</Label>
              <Input
                id="edit-position"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-lineTeam" className="text-sm font-medium">라인팀</Label>
              <Input
                id="edit-lineTeam"
                value={formData.lineTeam}
                onChange={(e) => setFormData({ ...formData, lineTeam: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="flex items-center space-x-2 mt-4">
              <Switch
                id="edit-isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="edit-isActive" className="text-sm font-medium">활성 상태</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-md bg-gradient-to-br from-orange-50 to-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-orange-900 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            권한
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-2">
            <Switch
              id="edit-isInstructor"
              checked={formData.isInstructor}
              onCheckedChange={(checked) => setFormData({ ...formData, isInstructor: checked })}
            />
            <Label htmlFor="edit-isInstructor" className="text-sm font-medium">교관</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="edit-isAdmin"
              checked={formData.isAdmin}
              onCheckedChange={(checked) => setFormData({ ...formData, isAdmin: checked })}
            />
            <Label htmlFor="edit-isAdmin" className="text-sm font-medium">관리자</Label>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-md bg-gradient-to-br from-green-50 to-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-green-900 flex items-center gap-2">
            <Award className="h-5 w-5" />
            기내방송 자격 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-koreanEnglishGrade" className="text-sm font-medium">한/영 방송 등급</Label>
              <Select
                value={formData.koreanEnglishGrade || "none"}
                onValueChange={(value) => setFormData({ ...formData, koreanEnglishGrade: value === "none" ? "" : value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="등급 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">없음</SelectItem>
                  <SelectItem value="ANNC_S">ANNC_S</SelectItem>
                  <SelectItem value="ANNC_A">ANNC_A</SelectItem>
                  <SelectItem value="ANNC_B">ANNC_B</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-koreanEnglishExpiry" className="text-sm font-medium">한/영 방송 만료일</Label>
              <Input
                id="edit-koreanEnglishExpiry"
                type="date"
                value={formData.koreanEnglishExpiry}
                onChange={(e) => setFormData({ ...formData, koreanEnglishExpiry: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-japaneseGrade" className="text-sm font-medium">일본어 방송 등급</Label>
              <Select
                value={formData.japaneseGrade || "none"}
                onValueChange={(value) => setFormData({ ...formData, japaneseGrade: value === "none" ? "" : value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="등급 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">없음</SelectItem>
                  <SelectItem value="JP_A">JP_A</SelectItem>
                  <SelectItem value="JP_B">JP_B</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-chineseGrade" className="text-sm font-medium">중국어 방송 등급</Label>
              <Select
                value={formData.chineseGrade || "none"}
                onValueChange={(value) => setFormData({ ...formData, chineseGrade: value === "none" ? "" : value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="등급 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">없음</SelectItem>
                  <SelectItem value="CN_A">CN_A</SelectItem>
                  <SelectItem value="CN_B">CN_B</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          취소
        </Button>
        <Button type="submit" disabled={isSaving} className="bg-gradient-to-r from-blue-600 to-indigo-600">
          {isSaving ? '수정 중...' : '수정'}
        </Button>
      </DialogFooter>
    </form>
  )
}
