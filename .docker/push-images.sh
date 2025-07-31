#!/bin/bash
# push-images.sh - Docker 이미지 푸시 스크립트 (Linux/macOS)

set -e

echo "📤 Z-Score Docker 이미지 푸시 스크립트"
echo "===================================="

# 색상 정의
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 파라미터 확인
IMAGE_TAG=${1:-latest}
REGISTRY=${2}

if [ -z "$REGISTRY" ]; then
    echo -e "${YELLOW}사용법: ./push-images.sh [태그] [레지스트리]${NC}"
    echo "예시: ./push-images.sh latest myusername"
    echo "또는: ./push-images.sh v1.0.0 mycompany"
    read -p "Docker Hub 사용자명/조직명을 입력하세요: " REGISTRY
    
    if [ -z "$REGISTRY" ]; then
        echo -e "${RED}[ERROR]${NC} 레지스트리가 입력되지 않았습니다."
        exit 1
    fi
fi

echo -e "${GREEN}[INFO]${NC} 레지스트리: ${REGISTRY}"
echo -e "${GREEN}[INFO]${NC} 태그: ${IMAGE_TAG}"

# Docker Hub 로그인 확인
echo -e "${GREEN}[INFO]${NC} Docker Hub 로그인 상태 확인..."
if ! docker info | grep -q "Username"; then
    echo -e "${YELLOW}[INFO]${NC} Docker Hub에 로그인해주세요."
    docker login
    if [ $? -ne 0 ]; then
        echo -e "${RED}[ERROR]${NC} Docker Hub 로그인 실패"
        exit 1
    fi
fi

# 백엔드 이미지 태깅 및 푸시
echo -e "${GREEN}[INFO]${NC} 백엔드 이미지 태깅 및 푸시 중..."
docker tag zscore-backend:${IMAGE_TAG} ${REGISTRY}/zscore-backend:${IMAGE_TAG}
docker push ${REGISTRY}/zscore-backend:${IMAGE_TAG}

# 프론트엔드 이미지 태깅 및 푸시
echo -e "${GREEN}[INFO]${NC} 프론트엔드 이미지 태깅 및 푸시 중..."
docker tag zscore-frontend:${IMAGE_TAG} ${REGISTRY}/zscore-frontend:${IMAGE_TAG}
docker push ${REGISTRY}/zscore-frontend:${IMAGE_TAG}

echo -e "${GREEN}[SUCCESS]${NC} 모든 이미지 푸시 완료! ✅"

echo ""
echo "배포 정보:"
echo "- 백엔드: ${REGISTRY}/zscore-backend:${IMAGE_TAG}"
echo "- 프론트엔드: ${REGISTRY}/zscore-frontend:${IMAGE_TAG}"

echo ""
echo "다른 환경에서 사용하려면:"
echo "docker pull ${REGISTRY}/zscore-backend:${IMAGE_TAG}"
echo "docker pull ${REGISTRY}/zscore-frontend:${IMAGE_TAG}"