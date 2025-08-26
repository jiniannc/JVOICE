"use client"

import { useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Home as HomeIcon, Calendar, Mic, Eye, ClipboardCheck, Settings, Bell, Moon, Sun, User, ChevronDown, LogOut } from "lucide-react"

type SessionSlot = 1|2|3|4|5|6|7|8

export default function RequestPage(){
  useEffect(() => {
    // Request 기능이 메인 앱으로 통합되었으므로 리다이렉트
    localStorage.setItem('jvoice_pending_mode', 'request')
    window.location.href = "/"
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Request 모드로 이동 중...</p>
      </div>
    </div>
  )
}


