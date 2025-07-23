"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

interface RealtimeContextType {
  pendingEvaluations: any[]
  completedEvaluations: any[]
  onlineUsers: string[]
  updatePendingEvaluations: (evaluations: any[]) => void
  updateCompletedEvaluations: (evaluations: any[]) => void
}

const RealtimeContext = createContext<RealtimeContextType | null>(null)

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [pendingEvaluations, setPendingEvaluations] = useState<any[]>([])
  const [completedEvaluations, setCompletedEvaluations] = useState<any[]>([])
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [ws, setWs] = useState<WebSocket | null>(null)

  useEffect(() => {
    // WebSocket 연결 설정
    const websocket = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001")

    websocket.onopen = () => {
      console.log("WebSocket 연결됨")
      setWs(websocket)
    }

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data)

      switch (data.type) {
        case "PENDING_EVALUATIONS_UPDATE":
          setPendingEvaluations(data.payload)
          break
        case "COMPLETED_EVALUATIONS_UPDATE":
          setCompletedEvaluations(data.payload)
          break
        case "ONLINE_USERS_UPDATE":
          setOnlineUsers(data.payload)
          break
        case "NEW_RECORDING_SUBMITTED":
          // 새 녹음 제출 알림
          setPendingEvaluations((prev) => [...prev, data.payload])
          break
        case "EVALUATION_COMPLETED":
          // 평가 완료 알림
          setPendingEvaluations((prev) => prev.filter((item) => item.id !== data.payload.id))
          setCompletedEvaluations((prev) => [...prev, data.payload])
          break
      }
    }

    websocket.onclose = () => {
      console.log("WebSocket 연결 종료")
      // 재연결 시도
      setTimeout(() => {
        setWs(null)
      }, 3000)
    }

    websocket.onerror = (error) => {
      console.error("WebSocket 오류:", error)
    }

    return () => {
      websocket.close()
    }
  }, [])

  const updatePendingEvaluations = (evaluations: any[]) => {
    setPendingEvaluations(evaluations)
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "UPDATE_PENDING_EVALUATIONS",
          payload: evaluations,
        }),
      )
    }
  }

  const updateCompletedEvaluations = (evaluations: any[]) => {
    setCompletedEvaluations(evaluations)
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "UPDATE_COMPLETED_EVALUATIONS",
          payload: evaluations,
        }),
      )
    }
  }

  return (
    <RealtimeContext.Provider
      value={{
        pendingEvaluations,
        completedEvaluations,
        onlineUsers,
        updatePendingEvaluations,
        updateCompletedEvaluations,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  )
}

export function useRealtime() {
  const context = useContext(RealtimeContext)
  if (!context) {
    throw new Error("useRealtime must be used within RealtimeProvider")
  }
  return context
}
