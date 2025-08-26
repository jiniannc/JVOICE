# 기내 방송 평가 시스템

## 🚀 빠른 시작

### 1. 초기 설정
```bash
# 실행 권한 부여
chmod +x setup.sh

# 설정 실행
./setup.sh

# .env.local 파일 편집 (본인의 API 키 입력)
nano .env.local  # 또는 텍스트 에디터로 열기

# 의존성 설치 및 실행
npm install
npm run dev
```

### 2. 업데이트할 때
```bash
# 새 버전 파일들을 현재 폴더에 덮어쓰기 후
./update.sh
npm run dev
```

## 🔧 환경변수 설정

`.env.local` 파일에서 다음 값들을 설정하세요:

### 기본 설정
- `NEXTAUTH_URL`: 로컬 개발 시 `http://localhost:3000`, 프로덕션 시 실제 도메인
- `NEXT_PUBLIC_BASE_URL`: 로컬 개발 시 `http://localhost:3000`, 프로덕션 시 실제 도메인

### Google OAuth 설정
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: Google OAuth 클라이언트 ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth 클라이언트 시크릿

### 기타 설정
- `NEXT_PUBLIC_GOOGLE_API_KEY`: Google API 키
- `NEXT_PUBLIC_SCRIPTS_FOLDER_ID`: PDF 문안이 저장된 Google Drive 폴더 ID
- `NEXT_PUBLIC_RECORDINGS_FOLDER_ID`: 녹음 파일이 저장될 Google Drive 폴더 ID
- `INSTRUCTOR_PASSWORD`: 교관 인증 비밀번호

## 🏠 로컬 개발 환경 설정

로컬에서 개발할 때 Fly.io로 리다이렉트되는 문제를 해결하려면:

1. `.env.local` 파일을 생성하고 다음 내용을 추가하세요:
```env
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

2. Google OAuth 콜백 URL을 Google Cloud Console에서 `http://localhost:3000/api/auth/google/callback`로 설정하세요.

## 👥 사용자 역할 설정

### 직원 스프레드시트 F컬럼 설정
직원 스프레드시트의 F컬럼에서 사용자의 역할을 설정할 수 있습니다:

- **`교관`**: 평가 모드에 자동 진입 가능
- **`관리자`**: 관리자 모드와 평가 모드 모두 자동 진입 가능 (교관 기능 포함)

### 역할별 기능
- **교관**: 녹음 파일 평가, 평가 대시보드 접근
- **관리자**: PDF 문안 동기화, 시스템 관리, 승무원 정보 관리 + 교관 기능 모두 포함

### 역할 우선순위
- 관리자가 더 높은 권한을 가지므로, 관리자로 설정된 사용자는 교관 기능도 자동으로 사용 가능
- UI에서는 우선순위에 따라 하나의 역할만 표시 (관리자 > 교관)

## 📱 사용법

1. **녹음 모드**: 승무원이 방송 녹음
2. **관리자 모드**: PDF 문안 동기화 및 시스템 관리  
3. **평가 모드**: 교관이 녹음 파일 평가

## 🔄 PDF 문안 동기화

관리자 모드에서 "문안 최신화" 버튼을 클릭하여 Google Drive의 최신 PDF 파일들을 동기화할 수 있습니다.
