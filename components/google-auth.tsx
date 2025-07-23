"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, LogOut, User, Loader2 } from "lucide-react"

interface GoogleAuthProps {
  onAuthSuccess?: (user: any) => void
}

export function GoogleAuth({ onAuthSuccess }: GoogleAuthProps) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true)
      try {
        const res = await fetch("/api/auth/user")
        const data = await res.json()
        if (data.authenticated && data.user) {
          setUser(data.user)
          if (onAuthSuccess) onAuthSuccess(data.user)
        } else {
          setUser(null)
        }
      } catch (e) {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [])

  const handleLogin = () => {
    window.location.href = "/api/auth/google"
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      setUser(null)
      window.location.reload()
    } catch (e) {
      // ignore
    } finally {
      setIsLoggingOut(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">인증 상태 확인 중...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (user) {
    return (
      <div className="flex flex-col items-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>로그인됨</CardTitle>
            <CardDescription>Google 계정으로 인증되었습니다.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <img src={user.picture || "/placeholder.svg"} alt={user.name} className="w-16 h-16 rounded-full border" />
            <div className="text-center">
              <div className="font-semibold">{user.name}</div>
              <div className="text-xs text-gray-500">{user.email}</div>
            </div>
            <Button onClick={handleLogout} disabled={isLoggingOut} className="w-full bg-red-600 hover:bg-red-700">
              {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogOut className="w-4 h-4 mr-2" />}
                  로그아웃
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Google 로그인</CardTitle>
          <CardDescription>Google 계정으로 로그인하세요.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Button onClick={handleLogin} className="w-full bg-blue-600 hover:bg-blue-700">
            <User className="w-4 h-4 mr-2" /> Google 로그인
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
