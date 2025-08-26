# 🚀 Fly.io 마이그레이션 가이드

## 📋 사전 준비사항

### 1. Fly.io 계정 생성
- [fly.io](https://fly.io) 에서 GitHub 계정으로 가입
- 신용카드 등록 (무료 플랜 사용을 위해 필요)

### 2. Fly.io CLI 설치 (Windows)
```powershell
# PowerShell에서 실행
iwr https://fly.io/install.ps1 -useb | iex
```

### 3. 로그인
```bash
fly auth login
```

## 🚀 배포 과정

### 1. 앱 생성 및 초기 설정
```bash
# 프로젝트 폴더에서 실행
fly launch
```

**설정 옵션:**
- App name: `jvoice-evaluation` (또는 원하는 이름)
- Region: `nrt` (도쿄, 한국에서 빠름)
- Overwrite fly.toml: `Yes`

### 2. 환경 변수 설정
```bash
# Google OAuth 설정
fly secrets set NEXTAUTH_URL=https://jvoice-evaluation.fly.dev
fly secrets set NEXTAUTH_SECRET=your_nextauth_secret

# Google OAuth
fly secrets set GOOGLE_CLIENT_ID=your_google_client_id
fly secrets set GOOGLE_CLIENT_SECRET=your_google_client_secret

# Dropbox 설정
fly secrets set DROPBOX_APP_KEY=your_dropbox_app_key
fly secrets set DROPBOX_APP_SECRET=your_dropbox_app_secret
fly secrets set DROPBOX_REFRESH_TOKEN=your_dropbox_refresh_token

# Google Sheets 설정
fly secrets set GOOGLE_SHEETS_PRIVATE_KEY=your_google_sheets_private_key
fly secrets set GOOGLE_SHEETS_CLIENT_EMAIL=your_google_sheets_client_email
fly secrets set GOOGLE_SHEETS_SPREADSHEET_ID=your_google_sheets_spreadsheet_id

# Google Drive 설정
fly secrets set GOOGLE_DRIVE_CLIENT_ID=your_google_drive_client_id
fly secrets set GOOGLE_DRIVE_CLIENT_SECRET=your_google_drive_client_secret
fly secrets set GOOGLE_DRIVE_REFRESH_TOKEN=your_google_drive_refresh_token
fly secrets set GOOGLE_DRIVE_FOLDER_ID=your_google_drive_folder_id
```

### 3. 배포
```bash
fly deploy
```

### 4. 앱 상태 확인
```bash
fly status
fly logs
```

## 🔧 Google OAuth 설정 업데이트

### Google Cloud Console에서:
1. **OAuth 2.0 클라이언트 ID** 편집
2. **승인된 리디렉션 URI**에 추가:
   ```
   https://jvoice-evaluation.fly.dev/api/auth/google/callback
   ```

## 📊 성능 비교

| 항목 | Render | Fly.io |
|------|--------|--------|
| **부팅 시간** | 3-5분 | 10-30초 |
| **6MB 파일** | ✅ 지원 | ✅ 지원 |
| **무료 플랜** | ✅ | ✅ |
| **글로벌 성능** | ⚠️ 제한적 | ✅ 우수 |

## 🛠️ 유용한 명령어

### 앱 관리
```bash
# 앱 상태 확인
fly status

# 로그 확인
fly logs

# 앱 재시작
fly apps restart

# 앱 중지
fly apps suspend

# 앱 재개
fly apps resume
```

### 환경 변수 관리
```bash
# 환경 변수 확인
fly secrets list

# 환경 변수 추가
fly secrets set KEY=value

# 환경 변수 삭제
fly secrets unset KEY
```

### 배포 관리
```bash
# 최신 배포
fly deploy

# 특정 배포로 롤백
fly deploy --image-label v1

# 배포 히스토리
fly releases
```

## 🚨 문제 해결

### 1. 배포 실패 시
```bash
# 빌드 로그 확인
fly logs

# 로컬 빌드 테스트
npm run build
```

### 2. 환경 변수 문제
```bash
# 환경 변수 확인
fly secrets list

# 앱 재시작
fly apps restart
```

### 3. 메모리 부족
```bash
# fly.toml에서 메모리 증가
memory_mb = 1024  # 512MB → 1024MB
```

## 🎉 마이그레이션 완료 후

### 확인사항:
1. ✅ 앱이 정상 배포되었는지 확인
2. ✅ Google OAuth 로그인이 작동하는지 확인
3. ✅ 평가 파일 업로드/다운로드가 작동하는지 확인
4. ✅ 부팅 시간이 개선되었는지 확인 (10-30초)

### 기존 Render 앱:
- 마이그레이션 완료 후 Render 앱을 중지하거나 삭제 가능
- 또는 백업용으로 유지

## 📞 지원

문제가 발생하면:
1. `fly logs`로 로그 확인
2. Fly.io 문서: https://fly.io/docs
3. Fly.io Discord 커뮤니티 