"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Monitor, Smartphone, Settings, CheckCircle, AlertTriangle } from "lucide-react"
import { deviceDetector } from "@/lib/device-detector"

export function CompanyDeviceManager() {
  const [deviceInfo, setDeviceInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)

  useEffect(() => {
    checkCurrentDevice()
    setIsRegistered(localStorage.getItem("isCompanyDevice") === "true")
  }, [])

  const checkCurrentDevice = async () => {
    setIsLoading(true)
    try {
      const info = await deviceDetector.isCompanyDevice()
      setDeviceInfo(info)
    } catch (error) {
      console.error("디바이스 확인 실패:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const registerAsCompanyDevice = () => {
    localStorage.setItem("isCompanyDevice", "true")
    localStorage.setItem("deviceRegisteredAt", new Date().toISOString())
    setIsRegistered(true)
    alert("이 컴퓨터가 회사 컴퓨터로 등록되었습니다.")
  }

  const unregisterDevice = () => {
    localStorage.removeItem("isCompanyDevice")
    localStorage.removeItem("deviceRegisteredAt")
    setIsRegistered(false)
    alert("회사 컴퓨터 등록이 해제되었습니다.")
  }

  return (
    <Card className="jinair-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          회사 컴퓨터 관리
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 현재 디바이스 상태 */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            {deviceInfo?.isCompany ? (
              <Monitor className="w-4 h-4 text-green-600" />
            ) : (
              <Smartphone className="w-4 h-4 text-orange-600" />
            )}
            현재 디바이스 상태
          </h4>

          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">디바이스 확인 중...</span>
            </div>
          ) : deviceInfo ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge
                  className={deviceInfo.isCompany ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}
                >
                  {deviceInfo.reason}
                </Badge>
                {isRegistered && (
                  <Badge className="bg-blue-100 text-blue-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    등록됨
                  </Badge>
                )}
              </div>

              {deviceInfo.details && (
                <div className="text-xs text-gray-600 space-y-1">
                  {deviceInfo.details.network?.ip && <div>IP: {deviceInfo.details.network.ip}</div>}
                  {deviceInfo.details.browser?.details?.platform && (
                    <div>플랫폼: {deviceInfo.details.browser.details.platform}</div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* 수동 등록/해제 */}
        <div className="space-y-3">
          <Alert className="border-blue-200 bg-blue-50">
            <AlertTriangle className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-800 text-sm">
              관리자는 수동으로 회사 컴퓨터를 등록할 수 있습니다. 등록된 컴퓨터에서는 녹음 기능을 사용할 수 있습니다.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            {!isRegistered ? (
              <Button onClick={registerAsCompanyDevice} className="flex-1 jinair-button">
                <Monitor className="w-4 h-4 mr-2" />
                회사 컴퓨터로 등록
              </Button>
            ) : (
              <Button onClick={unregisterDevice} variant="outline" className="flex-1 bg-transparent">
                등록 해제
              </Button>
            )}

            <Button onClick={checkCurrentDevice} variant="outline" className="bg-transparent">
              다시 확인
            </Button>
          </div>
        </div>

        {/* 등록 정보 */}
        {isRegistered && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">회사 컴퓨터로 등록됨</span>
            </div>
            <div className="text-xs text-green-700">
              등록일:{" "}
              {localStorage.getItem("deviceRegisteredAt")
                ? new Date(localStorage.getItem("deviceRegisteredAt")!).toLocaleString("ko-KR")
                : "알 수 없음"}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
