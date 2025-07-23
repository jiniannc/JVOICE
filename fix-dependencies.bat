@echo off
echo 🔧 의존성 충돌 해결 중...

echo 📁 완전 초기화...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json
if exist yarn.lock del yarn.lock

echo 🧹 npm 캐시 정리...
npm cache clean --force

echo 📦 문제가 되는 패키지 제거 후 재설치...
npm install --legacy-peer-deps

echo ✅ 의존성 해결 완료!
echo 🚀 이제 'npm run dev'로 실행하세요.
pause
