# 기내 방송 평가 시스템

## 🚀 빠른 시작

### 1. 초기 설정
\`\`\`bash
# 실행 권한 부여
chmod +x setup.sh

# 설정 실행
./setup.sh

# .env.local 파일 편집 (본인의 API 키 입력)
nano .env.local  # 또는 텍스트 에디터로 열기

# 의존성 설치 및 실행
npm install
npm run dev
\`\`\`

### 2. 업데이트할 때
\`\`\`bash
# 새 버전 파일들을 현재 폴더에 덮어쓰기 후
./update.sh
npm run dev
\`\`\`

## 🔧 환경변수 설정

`.env.local` 파일에서 다음 값들을 설정하세요:

- `NEXT_PUBLIC_GOOGLE_API_KEY`: Google API 키
- `NEXT_PUBLIC_SCRIPTS_FOLDER_ID`: PDF 문안이 저장된 Google Drive 폴더 ID
- `NEXT_PUBLIC_RECORDINGS_FOLDER_ID`: 녹음 파일이 저장될 Google Drive 폴더 ID

## 📱 사용법

1. **녹음 모드**: 승무원이 방송 녹음
2. **관리자 모드**: PDF 문안 동기화 및 시스템 관리  
3. **평가 모드**: 교관이 녹음 파일 평가

## 🔄 PDF 문안 동기화

관리자 모드에서 "문안 최신화" 버튼을 클릭하여 Google Drive의 최신 PDF 파일들을 동기화할 수 있습니다.
