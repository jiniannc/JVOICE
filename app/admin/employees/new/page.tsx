"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function NewEmployeePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    employeeId: "",
    department: "",
    position: "",
    lineTeam: "",
    isActive: true,
    isInstructor: false,
    isAdmin: false,
    koreanEnglishGrade: "",
    koreanEnglishExpiry: "",
    japaneseGrade: "",
    chineseGrade: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 필수 필드 검증
    if (!formData.email || !formData.name || !formData.employeeId) {
      alert("이메일, 이름, 사번은 필수 항목입니다.")
      return
    }

    try {
      setIsLoading(true)

      const response = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          koreanEnglishExpiry: formData.koreanEnglishExpiry || null,
          koreanEnglishGrade: formData.koreanEnglishGrade || null,
          japaneseGrade: formData.japaneseGrade || null,
          chineseGrade: formData.chineseGrade || null,
        }),
      })

      const data = await response.json()

      if (data.success) {
        alert("직원이 성공적으로 추가되었습니다.")
        router.push("/admin/employees")
      } else {
        alert(data.error || "직원 추가에 실패했습니다.")
      }
    } catch (error) {
      console.error("직원 추가 실패:", error)
      alert("직원 추가 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/employees">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                목록으로
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">신규 직원 추가</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 기본 정보 */}
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    이름 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="홍길동"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employeeId">
                    사번 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="employeeId"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    placeholder="172789K"
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="email">
                    이메일 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="hong@jinair.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">부서</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="객실운영팀"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position">직급</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="사원"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="lineTeam">라인팀</Label>
                  <Input
                    id="lineTeam"
                    value={formData.lineTeam}
                    onChange={(e) => setFormData({ ...formData, lineTeam: e.target.value })}
                    placeholder="A팀"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 권한 및 상태 */}
          <Card>
            <CardHeader>
              <CardTitle>권한 및 상태</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="isActive">활성 상태</Label>
                  <p className="text-sm text-gray-500">비활성화하면 시스템 사용이 제한됩니다</p>
                </div>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="isInstructor">교관 권한</Label>
                  <p className="text-sm text-gray-500">교육 및 평가를 진행할 수 있습니다</p>
                </div>
                <Switch
                  id="isInstructor"
                  checked={formData.isInstructor}
                  onCheckedChange={(checked) => setFormData({ ...formData, isInstructor: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="isAdmin">관리자 권한</Label>
                  <p className="text-sm text-gray-500">모든 관리 기능을 사용할 수 있습니다</p>
                </div>
                <Switch
                  id="isAdmin"
                  checked={formData.isAdmin}
                  onCheckedChange={(checked) => setFormData({ ...formData, isAdmin: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* 기내방송 자격 정보 */}
          <Card>
            <CardHeader>
              <CardTitle>기내방송 자격 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="koreanEnglishGrade">한/영 방송 등급</Label>
                  <Select
                    value={formData.koreanEnglishGrade}
                    onValueChange={(value) => setFormData({ ...formData, koreanEnglishGrade: value })}
                  >
                    <SelectTrigger id="koreanEnglishGrade">
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

                <div className="space-y-2">
                  <Label htmlFor="koreanEnglishExpiry">한/영 방송 만료일</Label>
                  <Input
                    id="koreanEnglishExpiry"
                    type="date"
                    value={formData.koreanEnglishExpiry}
                    onChange={(e) => setFormData({ ...formData, koreanEnglishExpiry: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="japaneseGrade">일본어 방송 등급</Label>
                  <Select
                    value={formData.japaneseGrade}
                    onValueChange={(value) => setFormData({ ...formData, japaneseGrade: value })}
                  >
                    <SelectTrigger id="japaneseGrade">
                      <SelectValue placeholder="등급 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">없음</SelectItem>
                      <SelectItem value="JP_A">JP_A</SelectItem>
                      <SelectItem value="JP_B">JP_B</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chineseGrade">중국어 방송 등급</Label>
                  <Select
                    value={formData.chineseGrade}
                    onValueChange={(value) => setFormData({ ...formData, chineseGrade: value })}
                  >
                    <SelectTrigger id="chineseGrade">
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

          {/* 제출 버튼 */}
          <div className="flex gap-2 justify-end">
            <Link href="/admin/employees">
              <Button type="button" variant="outline">
                취소
              </Button>
            </Link>
            <Button type="submit" disabled={isLoading}>
              <Save className="mr-2 h-4 w-4" />
              {isLoading ? "저장 중..." : "저장"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

