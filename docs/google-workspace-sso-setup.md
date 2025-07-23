# 🏢 Google Workspace SSO 완전 구현 가이드

## 1단계: Google Workspace Admin 설정

### 1.1 Google Admin Console 접속
- https://admin.google.com 접속
- JINAIR 도메인 관리자 계정으로 로그인

### 1.2 OAuth 앱 등록
1. **보안 > API 제어 > 도메인 전체 위임** 이동
2. "새로 추가" 클릭
3. 클라이언트 ID 입력 (Google Cloud Console에서 생성)
4. OAuth 범위 추가:
   \`\`\`
   https://www.googleapis.com/auth/userinfo.email
   https://www.googleapis.com/auth/userinfo.profile
   \`\`\`

### 1.3 앱 승인 설정
1. **보안 > API 제어 > OAuth 앱 액세스** 이동
2. "신뢰할 수 있는 앱 관리" 클릭
3. 앱을 "내부 및 신뢰할 수 있음"으로 설정

## 2단계: Google Cloud Console 설정

### 2.1 새 프로젝트 생성
- 프로젝트명: "JINAIR-Workspace-SSO"
- 조직: JINAIR Google Workspace 조직

### 2.2 OAuth 동의 화면 구성
- 사용자 유형: **"내부"** (중요!)
- 앱 이름: "JINAIR 기내방송 평가시스템"
- 사용자 지원 이메일: admin@jinair.com
- 승인된 도메인: jinair.com

### 2.3 OAuth 클라이언트 ID 생성
- 애플리케이션 유형: 웹 애플리케이션
- 승인된 JavaScript 원본: https://broadcast.jinair.com
- 승인된 리디렉션 URI: https://broadcast.jinair.com/api/auth/workspace/callback

## 3단계: 서비스 계정 생성 (선택사항)

### 3.1 서비스 계정 생성
1. IAM 및 관리자 > 서비스 계정
2. "서비스 계정 만들기" 클릭
3. 이름: "jinair-broadcast-service"

### 3.2 도메인 전체 위임 활성화
1. 서비스 계정 세부정보에서 "도메인 전체 위임 사용 설정" 체크
2. JSON 키 파일 다운로드

## 4단계: DNS 및 도메인 설정

### 4.1 서브도메인 생성
- broadcast.jinair.com → 애플리케이션 서버 IP

### 4.2 SSL 인증서 설정
- Let's Encrypt 또는 회사 SSL 인증서 적용

## 5단계: 환경변수 설정

\`\`\`env
# Google Workspace SSO
GOOGLE_WORKSPACE_DOMAIN=jinair.com
GOOGLE_WORKSPACE_CLIENT_ID=클라이언트_ID
GOOGLE_WORKSPACE_CLIENT_SECRET=클라이언트_시크릿

# 서비스 계정 (선택사항)
GOOGLE_SERVICE_ACCOUNT_EMAIL=jinair-broadcast-service@프로젝트ID.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=서비스_계정_프라이빗_키

# 기타
NEXTAUTH_URL=https://broadcast.jinair.com
NEXTAUTH_SECRET=랜덤_시크릿_키
\`\`\`

## 6단계: 배포 및 테스트

### 6.1 Vercel 배포
\`\`\`bash
vercel --prod
\`\`\`

### 6.2 도메인 연결
- Vercel에서 broadcast.jinair.com 도메인 연결

### 6.3 테스트 계정으로 확인
- test@jinair.com 계정으로 로그인 테스트
