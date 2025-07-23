'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, CheckCircle, AlertCircle } from 'lucide-react'

export default function TestDropboxUploadPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string>('')

  const handleTestUpload = async () => {
    setIsLoading(true)
    setResult(null)
    setError('')

    try {
      // 간단한 테스트 파일 생성
      const testContent = 'This is a test file for Dropbox upload'
      const blob = new Blob([testContent], { type: 'text/plain' })
      const file = new File([blob], 'test-file.txt', { type: 'text/plain' })

      const formData = new FormData()
      formData.append('file', file)
      formData.append('fileName', 'test-file.txt')

      const response = await fetch('/api/dropbox-upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '업로드 실패')
      }

      const data = await response.json()
      setResult(data)
      console.log('업로드 성공:', data)
    } catch (err: any) {
      setError(err.message)
      console.error('업로드 실패:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Dropbox 업로드 테스트
            </h1>
            <p className="text-gray-600">
              Dropbox API를 사용한 파일 업로드 기능을 테스트합니다
            </p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                파일 업로드 테스트
              </CardTitle>
              <CardDescription>
                간단한 텍스트 파일을 Dropbox에 업로드하여 기능을 확인합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={handleTestUpload}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? '업로드 중...' : '테스트 파일 업로드'}
              </Button>

              {result && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p><strong>업로드 성공!</strong></p>
                      <p>파일명: {result.fileName}</p>
                      <p>파일 ID: {result.fileId}</p>
                      <p>경로: {result.path}</p>
                      <p>URL: <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{result.url}</a></p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {error}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 