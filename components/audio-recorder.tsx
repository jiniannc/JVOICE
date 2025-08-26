"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Mic, Square, Play, Pause } from "lucide-react"

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob) => void
  existingRecording?: Blob | null
}

export function AudioRecorder({ onRecordingComplete, existingRecording }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null)
  const [isCheckingAllowed, setIsCheckingAllowed] = useState<boolean>(true)
  const [clientIp, setClientIp] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (existingRecording) {
      const url = URL.createObjectURL(existingRecording)
      setAudioUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [existingRecording])

  // 허용 IP 확인
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch("/api/devices/allowlist?mode=check", { cache: "no-store" })
        const data = await res.json()
        if (mounted) {
          setIsAllowed(!!data.allowed)
          setClientIp(data.ip || null)
        }
      } catch (e) {
        if (mounted) setIsAllowed(false)
      } finally {
        if (mounted) setIsCheckingAllowed(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const startRecording = async () => {
    if (isAllowed !== true) {
      alert("등록된 컴퓨터에서만 실시간 녹음이 가능합니다. 관리자에게 등록을 요청하세요.")
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      })

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      })

      chunksRef.current = []
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        onRecordingComplete(blob)

        const url = URL.createObjectURL(blob)
        setAudioUrl(url)

        // 스트림 정리
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start(100) // 100ms마다 데이터 수집
      setIsRecording(true)
      setRecordingTime(0)

      // 타이머 시작
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (error) {
      console.error("마이크 접근 오류:", error)
      alert("마이크에 접근할 수 없습니다. 브라우저 설정을 확인해주세요.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)

      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

  const playRecording = () => {
    if (audioUrl && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        audioRef.current.play()
        setIsPlaying(true)
      }
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="space-y-4">
      {/* 녹음 컨트롤 */}
      <div className="flex gap-2">
        {!isRecording ? (
          <Button onClick={startRecording} className="flex-1" disabled={isCheckingAllowed || isAllowed !== true}>
            <Mic className="w-4 h-4 mr-2" />
            {isCheckingAllowed ? "검증 중..." : isAllowed !== true ? "허용되지 않은 컴퓨터" : "녹음 시작"}
          </Button>
        ) : (
          <Button onClick={stopRecording} variant="destructive" className="flex-1">
            <Square className="w-4 h-4 mr-2" />
            녹음 중지 ({formatTime(recordingTime)})
          </Button>
        )}
      </div>

      {/* 재생 컨트롤 */}
      {audioUrl && (
        <div className="space-y-2">
          <Button onClick={playRecording} variant="outline" className="w-full bg-transparent">
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                일시정지
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                재생
              </>
            )}
          </Button>

          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
            className="w-full"
            controls
          />
        </div>
      )}

      {/* 녹음 상태 표시 */}
      {isRecording && (
        <div className="flex items-center justify-center p-4 bg-red-50 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-red-700 font-medium">녹음 중... {formatTime(recordingTime)}</span>
          </div>
        </div>
      )}

      {isAllowed === false && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
          이 컴퓨터({clientIp || "IP 확인 불가"})는 등록되지 않아 실시간 녹음을 사용할 수 없습니다. 관리자에게 등록을 요청하세요.
        </div>
      )}
    </div>
  )
}
