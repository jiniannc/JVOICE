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
  const [shouldStartRecording, setShouldStartRecording] = useState(false)

  // 컴포넌트 언마운트 시 interval 정리
  useEffect(() => {
    return () => {
      if (countdownInterval) {
        clearInterval(countdownInterval)
      }
    }
  }, [countdownInterval])

  // 녹음 시작 처리
  useEffect(() => {
    if (shouldStartRecording) {
      try {
        onStart()
      } catch (error) {
        console.error("녹음 시작 중 오류 발생:", error)
        setIsStarting(false)
        setCountdown(null)
      }
      setShouldStartRecording(false)
    }
  }, [shouldStartRecording, onStart])

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
          setShouldStartRecording(true)
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
      title: "시험 시간 및 구성",
      content: "녹음 시험은 총 <strong>50분</strong>으로 제한됩니다. 시간이 초과되면 자동으로 제출 페이지로 이동됩니다. 총 <strong>10개</strong>의 취득 문안 중 <strong>5개</strong>가 무작위로 선택되어 표시됩니다.",
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200"
    },
    {
      icon: Volume2,
      title: "방송 내용 및 평가",
      content: "방송문의 빈칸(<strong>편명, 도시명, 공항명, 비행시간, 지연 사유</strong> 등)은 자유롭게 설정하여 녹음하시면 됩니다. 방송문 내 <strong>필수 내용이 누락</strong>되거나, <strong>문안을 임의로 수정</strong>하거나, <strong>최신 문안이 아닌 경우</strong> 평가에서 제외될 수 있습니다.",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200"
    },
    {
      icon: RotateCcw,
      title: "녹음 진행 시 주의사항",
      content: "각 문안을 완료하고 다음으로 넘어가면 <strong>이전 문안으로 돌아갈 수 없습니다</strong>. <strong>'다음' 버튼</strong>을 누르기 전에 녹음 결과가 만족스러운지 꼭 확인해주세요. 녹음은 시간 내에서 원하는 만큼 반복할 수 있습니다. 시작 후 <strong>첫 번째 문안</strong>으로 음향 상태를 미리 확인해보시기 바랍니다.",
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200"
    },
    {
      icon: Shield,
      title: "기술적 주의사항",
      content: "<strong>브라우저를 닫거나, 뒤로가기 버튼을 누르거나, 새로고침</strong>을 하면 녹음 데이터가 <strong>모두 사라집니다</strong>. 주의해 주세요. 궁금한 점이나 문제가 발생하면 언제든지 <strong>방송교관</strong>에게 문의해 주세요.",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200"
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
        <Card className="mb-8 shadow-2xl border-0 relative overflow-hidden bg-gradient-to-r from-red-500 via-orange-500 to-red-500 bg-[length:400%_400%] animate-gradient-x">
          <CardContent className="p-8 relative z-10">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-2 text-white drop-shadow-lg">📢 주의사항 안내</h2>
              <p className="text-xl text-white drop-shadow-md">아래 내용을 꼼꼼히 읽고, 방송교관의 시작 신호를 기다려 주세요</p>
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
                <p 
                  className="text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: instruction.content }}
                />
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