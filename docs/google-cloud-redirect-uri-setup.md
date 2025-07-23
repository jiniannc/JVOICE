# Google Cloud Console 리디렉션 URI 설정 가이드

## 🔧 즉시 설정해야 할 항목

### 1. Google Cloud Console 접속
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 선택 (기존 프로젝트 또는 새 프로젝트 생성)

### 2. OAuth 클라이언트 ID 설정
1. **API 및 서비스** → **사용자 인증 정보** 메뉴 이동
2. 기존 **OAuth 클라이언트 ID** 선택 또는 **+ 사용자 인증 정보 만들기** → **OAuth 클라이언트 ID**

### 3. 리디렉션 URI 추가
**승인된 리디렉션 URI** 섹션에 다음 URL들을 추가:

#### 개발 환경 (localhost)
\`\`\`
http://localhost:3000/api/auth/server/callback
\`\`\`

#### 운영 환경 (배포 후)
\`\`\`
https://your-domain.com/api/auth/server/callback
https://your-vercel-app.vercel.app/api/auth/server/callback
\`\`\`

### 4. 환경변수 설정
`.env.local` 파일에 다음 내용 추가:

\`\`\`env
# Google OAuth 설정
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
\`\`\`

## 🚀 테스트 방법

### 1. 개발 환경 테스트
\`\`\`bash
npm run dev
\`\`\`
- `http://localhost:3000` 접속
- 서버사이드 OAuth 로그인 테스트

### 2. 테스트 페이지 활용
- `/test-server-auth` 페이지에서 상세한 인증 테스트
- 디버그 정보 및 사용자 데이터 확인

## ⚠️ 주의사항

### 보안 설정
- **Client Secret**은 절대 클라이언트 사이드에 노출하지 말 것
- 운영 환경에서는 HTTPS만 사용
- 리디렉션 URI는 정확히 일치해야 함

### 도메인 설정
- 새 도메인 배포 시 리디렉션 URI 추가 필요
- 서브도메인별로 각각 설정 필요

## 🔍 문제 해결

### 일반적인 오류들

#### 1. "redirect_uri_mismatch" 오류
- Google Cloud Console의 리디렉션 URI와 코드의 URI가 정확히 일치하는지 확인
- 프로토콜(http/https), 포트번호까지 정확히 일치해야 함

#### 2. "invalid_client" 오류
- Client ID와 Client Secret이 올바른지 확인
- 환경변수가 제대로 로드되는지 확인

#### 3. "access_denied" 오류
- 사용자가 권한을 거부한 경우
- Google 계정 설정에서 앱 권한 확인

## 📋 체크리스트

- [ ] Google Cloud Console에서 OAuth 클라이언트 ID 생성
- [ ] 리디렉션 URI 정확히 설정
- [ ] 환경변수 설정 완료
- [ ] 개발 환경에서 테스트 성공
- [ ] 운영 환경 리디렉션 URI 추가 (배포 시)
- [ ] HTTPS 설정 확인 (운영 환경)

## 🎯 완료 후 확인사항

1. **로그인 테스트**: 메인 페이지에서 Google 로그인 성공
2. **사용자 정보**: 이름, 이메일 정보 정상 표시
3. **직원 연동**: 직원 데이터베이스와 연동 확인
4. **로그아웃**: 로그아웃 기능 정상 작동
5. **세션 유지**: 페이지 새로고침 시 로그인 상태 유지

이 설정을 완료하면 서버사이드 OAuth가 완벽하게 작동합니다! 🎉
