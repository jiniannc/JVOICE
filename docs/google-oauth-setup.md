# Google OAuth 설정 가이드

## 1. Google Cloud Console 설정

### 1.1 프로젝트 생성
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. 프로젝트 이름: "JINAIR 기내방송 평가시스템"

### 1.2 OAuth 동의 화면 설정
1. **APIs & Services** > **OAuth consent screen** 이동
2. **Internal** 선택 (G Suite 조직 내부용)
3. 앱 정보 입력:
   - 앱 이름: `JINAIR 기내방송 평가시스템`
   - 사용자 지원 이메일: `your-email@jinair.com`
   - 승인된 도메인: `jinair.com`
   - 개발자 연락처: `your-email@jinair.com`

### 1.3 OAuth 클라이언트 ID 생성
1. **APIs & Services** > **Credentials** 이동
2. **+ CREATE CREDENTIALS** > **OAuth client ID** 선택
3. 애플리케이션 유형: **Web application**
4. 이름: `JINAIR 기내방송 평가시스템`
5. 승인된 JavaScript 원본:
   \`\`\`
   http://localhost:3000
   https://your-domain.com
   \`\`\`
6. 승인된 리디렉션 URI:
   \`\`\`
   http://localhost:3000
   https://your-domain.com
   \`\`\`

### 1.4 필요한 API 활성화
1. **APIs & Services** > **Library** 이동
2. 다음 API들을 검색하여 활성화:
   - Google Sheets API
   - Google Drive API

## 2. 환경변수 설정

`.env.local` 파일에 다음 값들을 설정하세요:

\`\`\`env
# Google OAuth 설정
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# NextAuth 설정
NEXTAUTH_SECRET=your-random-secret-key
NEXTAUTH_URL=http://localhost:3000

# 직원 정보 스프레드시트
NEXT_PUBLIC_EMPLOYEE_SPREADSHEET_ID=1F1xWL9dv0vAFvMfZaf05nO_vZKpuz82WIJLLBHWgaes
\`\`\`

## 3. 직원 스프레드시트 구조

직원 정보 스프레드시트는 다음과 같은 구조여야 합니다:

| A (이메일) | B (이름) | C (사번) | D (부서) | E (직급) | F (상태) |
|------------|----------|----------|----------|----------|----------|
| john@jinair.com | 김승무 | CA001 | 객실승무 | 승무원 | 활성 |
| jane@jinair.com | 박항공 | CA002 | 객실승무 | 선임승무원 | 활성 |

## 4. 보안 설정

### 4.1 도메인 제한
- OAuth 설정에서 `jinair.com` 도메인만 허용
- 코드에서 이메일 도메인 검증 추가

### 4.2 스프레드시트 권한
1. 직원 정보 스프레드시트를 조직 내부에서만 접근 가능하도록 설정
2. 읽기 전용 권한으로 공유

## 5. 테스트

1. `@jinair.com` 계정으로 로그인 테스트
2. 다른 도메인 계정으로 로그인 시 차단 확인
3. 직원 정보 자동 입력 확인

## 6. 문제 해결

### 일반적인 오류들:
- **Error 403**: API 권한 또는 도메인 설정 확인
- **Error 400**: 리디렉션 URI 설정 확인
- **직원 정보 없음**: 스프레드시트 구조 및 권한 확인

### 디버깅:
- 브라우저 개발자 도구 콘솔 확인
- 네트워크 탭에서 API 호출 상태 확인
