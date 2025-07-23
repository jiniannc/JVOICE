import { DropboxOAuthSetup } from '@/components/dropbox-oauth-setup'

export default function DropboxSetupPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Dropbox OAuth 설정
            </h1>
            <p className="text-gray-600">
              Dropbox 앱을 생성하고 OAuth 인증을 설정하여 파일 업로드 기능을 활성화하세요
            </p>
          </div>
          
          <DropboxOAuthSetup />
          
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">왜 OAuth가 필요한가요?</h3>
            <p className="text-sm text-blue-800">
              Dropbox는 보안상의 이유로 모든 API 요청에 OAuth 인증을 요구합니다. 
              서버에서 자동으로 파일을 업로드하려면 사전에 OAuth 인증을 거쳐 
              access_token을 발급받아야 합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 