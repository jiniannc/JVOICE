"use client"

import { GoogleOAuthDebugger } from "@/components/google-oauth-debugger"

export default function OAuthSetupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">🔧 Google OAuth 설정</h1>
          <p className="text-gray-600">단계별로 Google OAuth를 완전히 설정해보겠습니다</p>
        </div>

        <GoogleOAuthDebugger />

        {/* 설정 가이드 링크 */}
        <div className="mt-8 text-center">
          <div className="p-6 bg-white rounded-xl shadow-lg">
            <h3 className="text-xl font-bold mb-4">📋 설정 가이드</h3>
            <div className="space-y-2 text-sm">
              <p>
                1. <strong>Google Cloud Console</strong>에서 새 프로젝트 생성
              </p>
              <p>
                2. <strong>OAuth 동의 화면</strong> 구성 (외부 선택)
              </p>
              <p>
                3. <strong>OAuth 클라이언트 ID</strong> 생성 (웹 애플리케이션)
              </p>
              <p>
                4. <strong>환경변수</strong>에 클라이언트 ID 설정
              </p>
              <p>
                5. <strong>서버 재시작</strong> 후 테스트
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
