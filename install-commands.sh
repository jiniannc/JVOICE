#!/bin/bash
echo "🔧 의존성 충돌 해결 및 NextAuth 설치..."

# 1. 기존 node_modules와 package-lock.json 삭제
rm -rf node_modules
rm -f package-lock.json

# 2. date-fns 버전 다운그레이드
npm install date-fns@3.6.0

# 3. NextAuth 설치 (--legacy-peer-deps 플래그 사용)
npm install next-auth@4.24.5 --legacy-peer-deps

# 4. 나머지 의존성 설치
npm install --legacy-peer-deps

echo "✅ 설치 완료!"
echo "🚀 'npm run dev'로 실행하세요."
