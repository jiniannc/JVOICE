#!/bin/bash
echo "🚀 기내 방송 평가 시스템 설정 시작..."

# 환경변수 파일 생성
cat > .env.local << 'EOF'
# Google API 설정
NEXT_PUBLIC_GOOGLE_API_KEY=여기에_본인의_API_키_입력
NEXT_PUBLIC_GOOGLE_CLIENT_ID=여기에_본인의_클라이언트_ID_입력

# Google Drive 폴더 ID  
NEXT_PUBLIC_SCRIPTS_FOLDER_ID=여기에_PDF_폴더_ID_입력
NEXT_PUBLIC_RECORDINGS_FOLDER_ID=여기에_녹음_폴더_ID_입력

# Google Sheets ID
NEXT_PUBLIC_SPREADSHEET_ID=여기에_스프레드시트_ID_입력

# WebSocket 서버 URL
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# 관리자 계정
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# 기본 교관 계정
DEFAULT_INSTRUCTOR_USERNAME=instructor
DEFAULT_INSTRUCTOR_PASSWORD=eval123
EOF

# .gitignore 설정
cat > .gitignore << 'EOF'
# 환경변수
.env.local
.env

# Node.js
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Next.js
.next/
out/

# 기타
.DS_Store
*.log
EOF

echo "✅ 환경변수 파일 생성 완료!"
echo "📝 .env.local 파일을 열어서 본인의 API 키를 입력하세요."
echo ""
echo "🔧 다음 단계:"
echo "1. .env.local 파일 편집"
echo "2. npm install"
echo "3. npm run dev"
