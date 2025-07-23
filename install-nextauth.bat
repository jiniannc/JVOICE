@echo off
echo 🔧 Windows에서 NextAuth 설치 시작...

echo 📁 기존 node_modules 및 package-lock.json 삭제 중...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

echo 📦 date-fns 버전 다운그레이드...
npm install date-fns@3.6.0

echo 🔐 NextAuth 설치 중...
npm install next-auth@4.24.5 --legacy-peer-deps

echo 📦 전체 의존성 재설치 중...
npm install --legacy-peer-deps

echo ✅ 설치 완료!
echo 🚀 이제 'npm run dev'로 실행하세요.
pause
