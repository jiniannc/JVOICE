"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RefreshCw, Trash2, AlertTriangle, CheckCircle } from "lucide-react"

export function CacheBuster() {
  const [isClearing, setIsClearing] = useState(false)
  const [lastCleared, setLastCleared] = useState<string | null>(null)

  const clearAllCaches = async () => {
    setIsClearing(true)
    try {
      // 1. Service Worker 캐시 삭제
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        for (const registration of registrations) {
          await registration.unregister()
        }
      }

      // 2. Cache API 삭제
      if ("caches" in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)))
      }

      // 3. Local Storage 삭제
      localStorage.clear()

      // 4. Session Storage 삭제
      sessionStorage.clear()

      // 5. IndexedDB 삭제 (가능한 경우)
      if ("indexedDB" in window) {
        try {
          const databases = await indexedDB.databases()
          await Promise.all(
            databases.map((db) => {
              if (db.name) {
                const deleteReq = indexedDB.deleteDatabase(db.name)
                return new Promise((resolve, reject) => {
                  deleteReq.onsuccess = () => resolve(undefined)
                  deleteReq.onerror = () => reject(deleteReq.error)
                })
              }
            }),
          )
        } catch (error) {
          console.warn("IndexedDB 삭제 실패:", error)
        }
      }

      setLastCleared(new Date().toLocaleString())

      // 강제 새로고침
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error) {
      console.error("캐시 삭제 실패:", error)
      alert("캐시 삭제 중 오류가 발생했습니다. 수동으로 브라우저 캐시를 삭제해주세요.")
    } finally {
      setIsClearing(false)
    }
  }

  const hardRefresh = () => {
    // 강제 새로고침 (캐시 무시)
    window.location.reload()
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="w-5 h-5" />
          캐시 관리
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="w-4 h-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <div className="space-y-2">
              <p className="font-semibold">Google 인증 오류 해결</p>
              <p className="text-sm">구버전 캐시로 인한 인증 오류를 해결합니다.</p>
            </div>
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <Button
            onClick={clearAllCaches}
            disabled={isClearing}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            {isClearing ? (
              <>
                <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                캐시 삭제 중...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                모든 캐시 삭제 + 새로고침
              </>
            )}
          </Button>

          <Button onClick={hardRefresh} variant="outline" className="w-full bg-transparent">
            <RefreshCw className="w-4 h-4 mr-2" />
            강제 새로고침
          </Button>
        </div>

        {lastCleared && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <p className="text-sm">마지막 캐시 삭제: {lastCleared}</p>
            </AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-gray-500 space-y-1">
          <p>• Service Worker 캐시</p>
          <p>• Browser Cache API</p>
          <p>• Local/Session Storage</p>
          <p>• IndexedDB</p>
        </div>
      </CardContent>
    </Card>
  )
}
