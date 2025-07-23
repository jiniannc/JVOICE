"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Shield, User, CheckCircle } from "lucide-react"

interface SimpleUser {
  email: string
  name: string
  employeeId: string
  department: string
  position: string
}

interface SimpleLoginProps {
  onAuthSuccess: (user: SimpleUser) => void
}

// 테스트용 승무원 데이터
const TEST_EMPLOYEES: SimpleUser[] = [
  {
    email: "kim.seungmu@jinair.com",
    name: "김승무",
    employeeId: "CA001",
    department: "객실승무",
    position: "승무원",
  },
  {
    email: "park.hanggong@jinair.com",
    name: "박항공",
    employeeId: "CA002",
    department: "객실승무",
    position: "수석승무원",
  },
  {
    email: "test@gmail.com",
    name: "테스트승무원",
    employeeId: "TEST001",
    department: "객실승무",
    position: "승무원",
  },
  {
    email: "admin@jinair.com",
    name: "관리자",
    employeeId: "ADMIN001",
    department: "운항관리",
    position: "관리자",
  },
]

export function SimpleLogin({ onAuthSuccess }: SimpleLoginProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = () => {
    if (!selectedEmployee) return

    setIsLoading(true)

    // 실제 로그인 시뮬레이션 (1초 대기)
    setTimeout(() => {
      const employee = TEST_EMPLOYEES.find((emp) => emp.employeeId === selectedEmployee)
      if (employee) {
        onAuthSuccess(employee)
      }
      setIsLoading(false)
    }, 1000)
  }

  return (
    <Card className="w-full max-w-md mx-auto jinair-card">
      <CardHeader className="text-center">
        <div className="w-16 h-16 jinair-gradient rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <CardTitle>직원 로그인 (테스트)</CardTitle>
        <p className="text-sm text-gray-600">테스트용 간단 로그인</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="employee">직원 선택</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="로그인할 직원을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {TEST_EMPLOYEES.map((emp) => (
                  <SelectItem key={emp.employeeId} value={emp.employeeId}>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>
                        {emp.name} ({emp.employeeId})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedEmployee && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              {(() => {
                const emp = TEST_EMPLOYEES.find((e) => e.employeeId === selectedEmployee)
                return emp ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-blue-900">{emp.name}</span>
                    </div>
                    <div className="text-sm text-blue-700">
                      <p>이메일: {emp.email}</p>
                      <p>부서: {emp.department}</p>
                      <p>직급: {emp.position}</p>
                    </div>
                  </div>
                ) : null
              })()}
            </div>
          )}
        </div>

        <Button onClick={handleLogin} disabled={!selectedEmployee || isLoading} className="w-full h-12 jinair-button">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              로그인 중...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              로그인
            </div>
          )}
        </Button>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            🧪 테스트용 로그인 시스템
            <br />
            Google OAuth 문제 해결 후 교체 예정
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
