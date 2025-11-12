"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, Save, TestTube } from 'lucide-react'

interface EmailSettings {
  serviceType: string
  fromEmail: string
  fromName: string
  smtpHost: string
  smtpPort: string
  smtpUser: string
  smtpPassword: string
}

export default function EmailSettingsPage() {
  const [settings, setSettings] = useState<EmailSettings>({
    serviceType: 'company',
    fromEmail: '',
    fromName: '객실기내방송',
    smtpHost: 'mail.jinair.com',
    smtpPort: '587',
    smtpUser: '',
    smtpPassword: ''
  })
  
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState('')

  // 현재 설정 로드
  useEffect(() => {
    loadCurrentSettings()
  }, [])

  const loadCurrentSettings = async () => {
    try {
      const response = await fetch('/api/admin/email-settings')
      const data = await response.json()
      if (data.success) {
        setSettings(data.settings)
      }
    } catch (error) {
      console.error('설정 로드 실패:', error)
    }
  }

  // 설정 저장
  const saveSettings = async () => {
    setSaving(true)
    setMessage('')
    
    try {
      const response = await fetch('/api/admin/email-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      
      const data = await response.json()
      
      if (data.success) {
        setMessage('✅ 설정이 저장되었습니다.')
      } else {
        setMessage('❌ 저장 실패: ' + data.error)
      }
    } catch (error) {
      setMessage('❌ 저장 중 오류 발생')
    } finally {
      setSaving(false)
    }
  }

  // 이메일 테스트
  const testEmail = async () => {
    setTesting(true)
    setMessage('')
    
    try {
      const response = await fetch('/api/test-company-smtp')
      const data = await response.json()
      
      if (data.success) {
        setMessage('✅ 테스트 이메일 발송 성공!')
      } else {
        setMessage('❌ 테스트 실패: ' + data.error)
      }
    } catch (error) {
      setMessage('❌ 테스트 중 오류 발생')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📧 이메일 설정 관리
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* 서비스 타입 선택 */}
          <div className="space-y-2">
            <Label>이메일 서비스 타입</Label>
            <Select 
              value={settings.serviceType} 
              onValueChange={(value) => setSettings({...settings, serviceType: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="company">회사 내부 SMTP</SelectItem>
                <SelectItem value="workspace">Google Workspace</SelectItem>
                <SelectItem value="sendgrid">SendGrid</SelectItem>
                <SelectItem value="simulation">시뮬레이션</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 발신자 정보 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>발신자 이메일</Label>
              <Input 
                value={settings.fromEmail}
                onChange={(e) => setSettings({...settings, fromEmail: e.target.value})}
                placeholder="noreply@jinair.com"
              />
            </div>
            <div className="space-y-2">
              <Label>발신자 이름</Label>
              <Input 
                value={settings.fromName}
                onChange={(e) => setSettings({...settings, fromName: e.target.value})}
                placeholder="객실기내방송팀"
              />
            </div>
          </div>

          {/* SMTP 서버 설정 */}
          {settings.serviceType === 'company' && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>SMTP 서버</Label>
                  <Input 
                    value={settings.smtpHost}
                    onChange={(e) => setSettings({...settings, smtpHost: e.target.value})}
                    placeholder="mail.jinair.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>포트</Label>
                  <Input 
                    value={settings.smtpPort}
                    onChange={(e) => setSettings({...settings, smtpPort: e.target.value})}
                    placeholder="587"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>사용자 이메일</Label>
                <Input 
                  value={settings.smtpUser}
                  onChange={(e) => setSettings({...settings, smtpUser: e.target.value})}
                  placeholder="your-email@jinair.com"
                />
              </div>

              <div className="space-y-2">
                <Label>비밀번호 (앱 비밀번호 권장)</Label>
                <div className="relative">
                  <Input 
                    type={showPassword ? 'text' : 'password'}
                    value={settings.smtpPassword}
                    onChange={(e) => setSettings({...settings, smtpPassword: e.target.value})}
                    placeholder="앱 비밀번호 또는 이메일 비밀번호"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  💡 개인 비밀번호 대신 앱 전용 비밀번호 사용을 권장합니다.
                </p>
              </div>
            </>
          )}

          {/* 메시지 */}
          {message && (
            <Alert>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {/* 버튼들 */}
          <div className="flex gap-3">
            <Button 
              onClick={saveSettings} 
              disabled={saving}
              className="flex-1"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? '저장 중...' : '설정 저장'}
            </Button>
            
            <Button 
              onClick={testEmail} 
              disabled={testing}
              variant="outline"
              className="flex-1"
            >
              <TestTube className="w-4 h-4 mr-2" />
              {testing ? '테스트 중...' : '이메일 테스트'}
            </Button>
          </div>

          {/* 도움말 */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">💡 비밀번호 변경 걱정 없는 방법들:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>앱 비밀번호</strong>: 개인 비밀번호와 별개로 생성</li>
              <li>• <strong>OAuth 2.0</strong>: 토큰 기반 인증 (가장 안전)</li>
              <li>• <strong>웹 설정</strong>: 이 페이지에서 언제든 변경 가능</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
