"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Mic, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Play, 
  ArrowRight,
  Volume2,
  FileText,
  Shield,
  Users,
  Timer,
  RotateCcw
} from "lucide-react"

interface UserInfo {
  name: string
  employeeId: string
  language: string
  category: string
  email?: string
}

interface RecordingWaitingPageProps {
  userInfo: UserInfo
  onStart: () => void
  onBack: () => void
}

export function RecordingWaitingPage({ userInfo, onStart, onBack }: RecordingWaitingPageProps) {
  const [hasReadInstructions, setHasReadInstructions] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [countdownInterval, setCountdownInterval] = useState<NodeJS.Timeout | null>(null)

  // 컴포넌트 언마운트 시 interval 정리
  useEffect(() => {
    return () => {
      if (countdownInterval) {
        clearInterval(countdownInterval)
      }
    }
  }, [countdownInterval])

  const getLanguageDisplay = (language: string) => {
    const displays: { [key: string]: string } = {
      "korean-english": "한/영",
      japanese: "일본어",
      chinese: "중국어",
    }
    return displays[language] || language
  }

  const handleStart = async () => {
    if (!hasReadInstructions) {
      alert("모든 주의사항을 읽고 확인 체크박스를 선택해 주세요.")
      return
    }
    
    setIsStarting(true)
    setCountdown(3)
    
    // 3초 카운트다운 후 시작
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval)
          setCountdownInterval(null)
          try {
            onStart()
          } catch (error) {
            console.error("녹음 시작 중 오류 발생:", error)
            setIsStarting(false)
            setCountdown(null)
          }
          return null
        }
        return prev - 1
      })
    }, 1000)
    
    setCountdownInterval(interval)
  }

  const instructions = [
    {
      icon: Timer,
      title: "시험 시간",
      content: "녹음 시험은 총 50분으로 제한됩니다. 시간이 초과되면 자동으로 제출 페이지로 이동됩니다.",
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200"
    },
    {
      icon: FileText,
      title: "문안 구성",
      content: "총 10개의 취득 문안 중 5개가 무작위로 선택되어 표시됩니다.",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200"
    },
    {
      icon: Volume2,
      title: "방송 내용",
      content: "방송문의 빈칸(편명, 도시명, 공항명, 비행시간, 지연 사유 등)은 자유롭게 설정하여 녹음하시면 됩니다.",
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200"
    },
    {
      icon: AlertTriangle,
      title: "평가 기준",
      content: "방송문 내 필수 내용이 누락되거나, 문안을 임의로 수정하거나, 최신 문안이 아닌 경우 평가에서 제외될 수 있습니다.",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200"
    },
    {
      icon: Shield,
      title: "브라우저 주의",
      content: "브라우저를 닫거나, 뒤로가기 버튼을 누르거나, 새로고침을 하면 녹음 데이터가 모두 사라집니다. 주의해 주세요.",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200"
    },
    {
      icon: Users,
      title: "문의 안내",
      content: "궁금한 점이나 문제가 발생하면 언제든지 방송교관에게 문의해 주세요.",
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      borderColor: "border-indigo-200"
    },
    {
      icon: RotateCcw,
      title: "녹음 진행",
      content: "각 문안별로 녹음을 완료한 후 넘어간 후에는 다시 돌아올 수 없습니다. 다음 문안으로 넘어가기 전에 원하는 결과물이 나왔는지 꼭 확인한 후에 '다음' 버튼을 눌러주세요. 녹음은 몇 번이고 할 수 있지만 시험 시간 안에만 끝내면 됩니다.",
      color: "text-teal-600",
      bgColor: "bg-teal-50",
      borderColor: "border-teal-200"
    },
    {
      icon: Mic,
      title: "음향 확인",
      content: "시작하면 첫 번째 문안을 녹음하고 재생하여 음향 상태가 좋은지 확인해주세요.",
      color: "text-pink-600",
      bgColor: "bg-pink-50",
      borderColor: "border-pink-200"
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-yellow-50">
      {/* 헤더 */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-orange-200/60 p-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
              <Mic className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">기내 방송 녹음 대기</h1>
              <p className="text-gray-600 text-sm">
                {userInfo?.name || '이름 없음'} ({userInfo?.employeeId || '사번 없음'}) - {getLanguageDisplay(userInfo?.language || '')} {userInfo?.category || ''}
              </p>
            </div>
          </div>
          
          <Button onClick={onBack} variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-50">
            뒤로가기
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
                {/* 메인 알림 카드 */}
        <Card className="mb-8 shadow-2xl border-0 relative overflow-hidden bg-gradient-to-r from-red-500 via-orange-500 to-red-500 animate-pulse">
          <CardContent className="p-8 relative z-10">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
              <div className="text-center">
                <h2 className="text-3xl font-bold mb-2 animate-pulse text-white drop-shadow-lg">📢 주의사항 안내</h2>
                <p className="text-xl text-white drop-shadow-md">아래 내용을 꼼꼼히 읽고, 방송교관의 시작 신호를 기다려 주세요</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 주의사항 카드들 */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {instructions.map((instruction, index) => (
            <Card 
              key={index} 
              className={`${instruction.bgColor} ${instruction.borderColor} border-2 hover:shadow-lg transition-all duration-300`}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className={`p-2 rounded-lg bg-white/50 ${instruction.color}`}>
                    <instruction.icon className="w-5 h-5" />
                  </div>
                  <span className={instruction.color}>{instruction.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">{instruction.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 확인 체크박스 */}
        <Card className="mb-8 bg-white shadow-lg border-2 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <input
                type="checkbox"
                id="read-instructions"
                checked={hasReadInstructions}
                onChange={(e) => setHasReadInstructions(e.target.checked)}
                className="w-5 h-5 text-green-600 border-green-300 rounded focus:ring-green-500"
              />
                             <label htmlFor="read-instructions" className="text-lg font-medium text-gray-700">
                 위의 모든 주의사항을 읽고 이해했습니다.
               </label>
            </div>
          </CardContent>
        </Card>

        {/* 시작 버튼 */}
        <div className="text-center">
          {isStarting && countdown !== null ? (
            <div className="space-y-4">
              <div className="text-6xl font-bold text-orange-600 animate-pulse">
                {countdown}
              </div>
                             <p className="text-xl text-gray-600">곧 녹음 시험이 시작됩니다...</p>
            </div>
                           ) : (
                   <Button
                     onClick={handleStart}
                     disabled={!hasReadInstructions}
                     size="lg"
                     className={`px-16 py-8 text-2xl font-bold rounded-3xl shadow-2xl transition-all duration-300 ${
                       hasReadInstructions
                         ? "bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white transform hover:scale-105"
                         : "bg-gray-300 text-gray-500 cursor-not-allowed"
                     }`}
                   >
                     <Play className="w-8 h-8 mr-4" />
                     녹음 시작하기
                     <ArrowRight className="w-8 h-8 ml-4" />
                   </Button>
                 )}
        </div>

        
      </div>
    </div>
  )
} 