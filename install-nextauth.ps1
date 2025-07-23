# PowerShell 스크립트
Write-Host "🔧 PowerShell에서 NextAuth 설치 시작..." -ForegroundColor Green

Write-Host "📁 기존 node_modules 및 package-lock.json 삭제 중..." -ForegroundColor Yellow
if (Test-Path "node_modules") { Remove-Item -Recurse -Force "node_modules" }
if (Test-Path "package-lock.json") { Remove-Item -Force "package-lock.json" }

Write-Host "📦 date-fns 버전 다운그레이드..." -ForegroundColor Yellow
npm install date-fns@3.6.0

Write-Host "🔐 NextAuth 설치 중..." -ForegroundColor Yellow
npm install next-auth@4.24.5 --legacy-peer-deps

Write-Host "📦 전체 의존성 재설치 중..." -ForegroundColor Yellow
npm install --legacy-peer-deps

Write-Host "✅ 설치 완료!" -ForegroundColor Green
Write-Host "🚀 이제 'npm run dev'로 실행하세요." -ForegroundColor Cyan
