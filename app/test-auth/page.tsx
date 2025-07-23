"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SimpleGoogleAuth } from "@/components/simple-google-auth"
import { employeeDB } from "@/lib/employee-database"
import { CheckCircle, AlertTriangle, RefreshCw } from "lucide-react"

export default function TestAuthPage() {
  const [authResult, setAuthResult] = useState<any>(null)
  const [employees, setEmployees] = useState<any[]>([])
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false)

  const handleAuthSuccess = (user: any, deviceInfo: any) => {
    setAuthResult({ user, deviceInfo })
    console.log("인증 성공:", user)
    console.log("디바이스 정보:", deviceInfo)
  }

  const loadEmployees = async () => {
    setIsLoadingEmployees(true)
    try {
      const result = await employeeDB.refreshEmployeeData()
      const allEmployees = await employeeDB.getAllEmployees()
      setEmployees(allEmployees)
      console.log("승무원 데이터 로드 결과:", result)
    } catch (error) {
      console.error("승무원 데이터 로드 실패:", error)
    } finally {
      setIsLoadingEmployees(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">🧪 인증 시스템 테스트</h1>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* 인증 테스트 */}
          <div>
            <h2 className="text-xl font-bold mb-4">Google 인증 테스트</h2>
            {!authResult ? (
              <SimpleGoogleAuth onAuthSuccess={handleAuthSuccess} requireCompanyDevice={false} />
            ) : (
              <Card className="jinair-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    인증 성공!
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold">사용자 정보:</h4>
                    <div className="p-3 bg-gray-50 rounded text-sm">
                      <p>
                        <strong>이름:</strong> {authResult.user.name}
                      </p>
                      <p>
                        <strong>이메일:</strong> {authResult.user.email}
                      </p>
                      <p>
                        <strong>사번:</strong> {authResult.user.employee?.employeeId}
                      </p>
                      <p>
                        <strong>부서:</strong> {authResult.user.employee?.department}
                      </p>
                    </div>
                  </div>

                  {authResult.deviceInfo && (
                    <div>
                      <h4 className="font-semibold">디바이스 정보:</h4>
                      <div className="p-3 bg-gray-50 rounded text-sm">
                        <Badge
                          className={
                            authResult.deviceInfo.isCompany
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }
                        >
                          {authResult.deviceInfo.reason}
                        </Badge>
                      </div>
                    </div>
                  )}

                  <Button onClick={() => setAuthResult(null)} variant="outline" className="w-full bg-transparent">
                    다시 테스트
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 승무원 데이터 테스트 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">승무원 데이터 테스트</h2>
              <Button onClick={loadEmployees} disabled={isLoadingEmployees} size="sm">
                {isLoadingEmployees ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    로딩중
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    새로고침
                  </>
                )}
              </Button>
            </div>

            <Card className="jinair-card">
              <CardHeader>
                <CardTitle>등록된 승무원 목록</CardTitle>
              </CardHeader>
              <CardContent>
                {employees.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>승무원 데이터를 불러오려면 "새로고침" 버튼을 클릭하세요</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {employees.map((emp, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold">{emp.name}</p>
                            <p className="text-sm text-gray-600">{emp.email}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline">{emp.employeeId}</Badge>
                            <p className="text-xs text-gray-500 mt-1">{emp.department}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 환경변수 상태 */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>환경변수 상태 확인</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-gray-50 rounded">
                <p>
                  <strong>Google Client ID:</strong>
                </p>
                <p className="font-mono text-xs break-all">
                  {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? "✅ 설정됨" : "❌ 미설정"}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <p>
                  <strong>Google API Key:</strong>
                </p>
                <p className="font-mono text-xs">
                  {process.env.NEXT_PUBLIC_GOOGLE_API_KEY ? "✅ 설정됨" : "❌ 미설정"}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <p>
                  <strong>Employee Spreadsheet ID:</strong>
                </p>
                <p className="font-mono text-xs break-all">
                  {process.env.NEXT_PUBLIC_EMPLOYEE_SPREADSHEET_ID ? "✅ 설정됨" : "❌ 미설정"}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <p>
                  <strong>Scripts Folder ID:</strong>
                </p>
                <p className="font-mono text-xs break-all">
                  {process.env.NEXT_PUBLIC_SCRIPTS_FOLDER_ID ? "✅ 설정됨" : "❌ 미설정"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
