'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'

export function DropboxOAuthSetup() {
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleDropboxAuth = async () => {
    setIsLoading(true)
    setStatus('idle')
    setErrorMessage('')

    try {
      // Dropbox OAuth 시작
      window.location.href = '/api/dropbox/auth'
    } catch (error) {
      console.error('Dropbox OAuth 시작 실패:', error)
      setStatus('error')
      setErrorMessage('Dropbox 인증을 시작할 수 없습니다.')
      setIsLoading(false)
    }
  }

  const openDropboxConsole = () => {
    window.open('https://www.dropbox.com/developers/apps', '_blank')
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-blue-600" />
          Dropbox OAuth 설정
        </CardTitle>
        <CardDescription>
          Dropbox 앱을 생성하고 OAuth 인증을 설정하세요
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h4 className="font-medium">1단계: Dropbox 앱 생성</h4>
          <p className="text-sm text-gray-600">
            Dropbox 개발자 콘솔에서 새 앱을 생성하세요
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={openDropboxConsole}
            className="w-full"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Dropbox 개발자 콘솔 열기
          </Button>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">2단계: 앱 설정</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• 앱 이름: <code className="bg-gray-100 px-1 rounded">cabin-recorder</code></p>
            <p>• 권한: <code className="bg-gray-100 px-1 rounded">Full Dropbox access</code></p>
            <p>• 리디렉션 URI: <code className="bg-gray-100 px-1 rounded">http://localhost:3003/api/dropbox/auth/callback</code></p>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">3단계: 환경 변수 설정</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>생성된 앱 키와 시크릿을 <code className="bg-gray-100 px-1 rounded">.env.local</code>에 추가:</p>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
{`DROPBOX_APP_KEY=your_app_key_here
DROPBOX_APP_SECRET=your_app_secret_here`}
            </pre>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">4단계: OAuth 인증</h4>
          <Button 
            onClick={handleDropboxAuth}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? '인증 중...' : 'Dropbox OAuth 시작'}
          </Button>
        </div>

        {status === 'success' && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Dropbox OAuth 인증이 성공했습니다! 콘솔에서 토큰 정보를 확인하세요.
            </AlertDescription>
          </Alert>
        )}

        {status === 'error' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
} 