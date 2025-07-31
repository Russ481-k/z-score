#!/bin/bash
# build-images.sh - Docker 이미지 빌드 스크립트 (Linux/macOS)

set -e

echo "🏗️ Z-Score Docker 이미지 빌드 스크립트"
echo "======================================"

# 색상 정의
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 이미지 태그 설정
IMAGE_TAG=${1:-latest}
REGISTRY=${2:-""}

echo -e "${GREEN}[INFO]${NC} 이미지 태그: ${IMAGE_TAG}"

# 백엔드 이미지 빌드
echo -e "${GREEN}[INFO]${NC} 백엔드 이미지 빌드 중..."
if docker build -f backend/Dockerfile -t zscore-backend:${IMAGE_TAG} .; then
    echo -e "${GREEN}[SUCCESS]${NC} 백엔드 이미지 빌드 완료"
else
    echo -e "${RED}[ERROR]${NC} 백엔드 이미지 빌드 실패"
    exit 1
fi

# 프론트엔드 이미지 빌드
echo -e "${GREEN}[INFO]${NC} 프론트엔드 이미지 빌드 중..."
if docker build -f frontend/Dockerfile -t zscore-frontend:${IMAGE_TAG} ./frontend; then
    echo -e "${GREEN}[SUCCESS]${NC} 프론트엔드 이미지 빌드 완료"
else
    echo -e "${RED}[ERROR]${NC} 프론트엔드 이미지 빌드 실패"
    exit 1
fi

echo -e "${GREEN}[SUCCESS]${NC} 모든 이미지 빌드 완료! ✅"

# 빌드된 이미지 확인
echo ""
echo "빌드된 이미지 목록:"
docker images | grep zscore

echo ""
echo "다음 단계:"
echo "1. Docker Hub에 푸시하려면: ./push-images.sh ${IMAGE_TAG}"
echo "2. 로컬에서 테스트하려면: ./deploy.sh"
echo "3. 이미지 내보내기: ./export-images.sh ${IMAGE_TAG}"