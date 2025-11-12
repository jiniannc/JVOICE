"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Users,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Home,
  Download,
  Upload,
} from "lucide-react"
import Link from "next/link"

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
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("")
  const [lineTeamFilter, setLineTeamFilter] = useState("")
  const [isActiveFilter, setIsActiveFilter] = useState<string>("true")
  const [isInstructorFilter, setIsInstructorFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<any>(null)

  // 직원 목록 조회
  const fetchEmployees = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(departmentFilter && { department: departmentFilter }),
        ...(lineTeamFilter && { lineTeam: lineTeamFilter }),
        ...(isActiveFilter && isActiveFilter !== "all" && { isActive: isActiveFilter }),
      })

      // 권한 필터 처리
      if (isInstructorFilter === "instructor") {
        params.append("isInstructor", "true")
      } else if (isInstructorFilter === "admin") {
        params.append("isAdmin", "true")
      }

      const response = await fetch(`/api/admin/employees?${params}`)
      const data = await response.json()

      if (data.success) {
        setEmployees(data.employees)
        setTotal(data.pagination.total)
        setTotalPages(data.pagination.totalPages)
      }
    } catch (error) {
      console.error("직원 목록 조회 실패:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchEmployees()
  }, [page, searchTerm, departmentFilter, lineTeamFilter, isActiveFilter, isInstructorFilter])

  // 필터 초기화
  const resetFilters = () => {
    setSearchTerm("")
    setDepartmentFilter("")
    setLineTeamFilter("")
    setIsActiveFilter("true")
    setIsInstructorFilter("all")
    setPage(1)
  }

  // 직원 비활성화
  const handleDeactivate = async (id: string) => {
    if (!confirm("정말로 이 직원을 비활성화하시겠습니까?")) return

    try {
      const response = await fetch(`/api/admin/employees?id=${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        alert("직원이 비활성화되었습니다.")
        fetchEmployees()
      }
    } catch (error) {
      console.error("직원 비활성화 실패:", error)
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

    if (!confirm(`"${file.name}" 파일을 업로드하시겠습니까?\n\n기존 직원 정보는 업데이트되고, 새로운 직원은 추가됩니다.`)) {
      event.target.value = "" // 파일 선택 초기화
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
        alert(
          `✅ 업로드 완료!\n\n` +
          `• 생성: ${data.summary.created}명\n` +
          `• 업데이트: ${data.summary.updated}명\n` +
          `• 건너뜀: ${data.summary.skipped}명\n` +
          (data.summary.errors > 0 ? `• 오류: ${data.summary.errors}건` : "")
        )
        fetchEmployees() // 목록 새로고침
      } else {
        alert(`❌ 업로드 실패: ${data.error}`)
      }
    } catch (error) {
      console.error("엑셀 업로드 오류:", error)
      alert("엑셀 업로드 중 오류가 발생했습니다")
    } finally {
      setIsUploading(false)
      event.target.value = "" // 파일 선택 초기화
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="outline" size="sm">
                <Home className="mr-2 h-4 w-4" />
                Admin 홈
              </Button>
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" />
              User 정보 관리
            </h1>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchEmployees} variant="outline" size="sm">
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
              >
                <Upload className="mr-2 h-4 w-4" />
                {isUploading ? "업로드 중..." : "엑셀 업로드"}
              </Button>
            </div>
            <Link href="/admin/employees/new">
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                직원 추가
              </Button>
            </Link>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">전체 직원</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{total}명</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">활성 직원</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {employees.filter((e) => e.isActive).length}명
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">교관</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {employees.filter((e) => e.isInstructor).length}명
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">관리자</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {employees.filter((e) => e.isAdmin).length}명
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 검색 및 필터 */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="이름, 이메일, 사번 검색..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      setPage(1)
                    }}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={isActiveFilter} onValueChange={(v) => { setIsActiveFilter(v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="true">활성</SelectItem>
                  <SelectItem value="false">비활성</SelectItem>
                </SelectContent>
              </Select>
              <Select value={isInstructorFilter} onValueChange={(v) => { setIsInstructorFilter(v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="권한" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="instructor">교관</SelectItem>
                  <SelectItem value="admin">관리자</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={resetFilters} variant="outline" className="w-full">
                <Filter className="mr-2 h-4 w-4" />
                필터 초기화
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 직원 목록 테이블 */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="text-center py-8">로딩 중...</div>
            ) : employees.length === 0 ? (
              <div className="text-center py-8 text-gray-500">검색 결과가 없습니다.</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">상태</TableHead>
                        <TableHead>이름</TableHead>
                        <TableHead>사번</TableHead>
                        <TableHead>이메일</TableHead>
                        <TableHead>부서</TableHead>
                        <TableHead>라인팀</TableHead>
                        <TableHead className="text-center">권한</TableHead>
                        <TableHead className="text-center">자격증</TableHead>
                        <TableHead className="text-center w-32">액션</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.map((employee) => (
                        <TableRow key={employee.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div 
                                className={`w-3 h-3 rounded-full ${
                                  employee.isActive ? "bg-green-500" : "bg-orange-500"
                                }`}
                                title={employee.isActive ? "활성" : "비활성"}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{employee.name}</TableCell>
                          <TableCell>{employee.employeeId}</TableCell>
                          <TableCell className="text-sm text-gray-600">{employee.email}</TableCell>
                          <TableCell>{employee.department}</TableCell>
                          <TableCell>{employee.lineTeam || "-"}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex gap-1 justify-center flex-wrap">
                              {employee.isAdmin && (
                                <Badge variant="default" className="bg-purple-600">관리자</Badge>
                              )}
                              {employee.isInstructor && (
                                <Badge variant="default" className="bg-blue-600">교관</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col gap-1 text-xs">
                              {employee.koreanEnglishGrade && (
                                <Badge variant="outline" className="text-xs">
                                  한/영: {employee.koreanEnglishGrade}
                                </Badge>
                              )}
                              {employee.japaneseGrade && (
                                <Badge variant="outline" className="text-xs">
                                  일: {employee.japaneseGrade}
                                </Badge>
                              )}
                              {employee.chineseGrade && (
                                <Badge variant="outline" className="text-xs">
                                  중: {employee.chineseGrade}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 justify-center">
                              <Link href={`/admin/employees/${employee.id}`}>
                                <Button size="sm" variant="outline">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Link href={`/admin/employees/${employee.id}/edit`}>
                                <Button size="sm" variant="outline">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Link>
                              {employee.isActive && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeactivate(employee.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* 페이지네이션 */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-600">
                    전체 {total}명 중 {((page - 1) * limit) + 1}-{Math.min(page * limit, total)}명 표시
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      이전
                    </Button>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {page} / {totalPages}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage(page + 1)}
                      disabled={page === totalPages}
                    >
                      다음
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

