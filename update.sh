#!/bin/bash
echo "🔄 시스템 업데이트 시작..."

# 환경변수 백업
if [ -f .env.local ]; then
    cp .env.local .env.backup
    echo "✅ 환경변수 백업 완료"
fi

# Git 초기화 (처음이면)
if [ ! -d .git ]; then
    git init
    echo "📁 Git 저장소 초기화"
fi

# 변경사항 커밋
git add .
git commit -m "업데이트 $(date +%Y%m%d_%H%M%S)" 2>/dev/null || echo "📝 변경사항 저장"

# 환경변수 복원
if [ -f .env.backup ]; then
    cp .env.backup .env.local
    rm .env.backup
    echo "✅ 환경변수 복원 완료"
fi

echo "🎉 업데이트 완료!"
echo "🚀 'npm run dev'로 실행하세요."
