#!/bin/bash
# deploy.sh - POC deployment script

set -e  # Exit on any error

echo "🚀 Z-Score POC 배포 스크립트"
echo "==========================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env exists
if [ ! -f ".env" ]; then
    log_error ".env 파일이 없습니다!"
    log_info "env.example 파일을 .env로 복사하고 Oracle 설정을 수정해주세요:"
    log_info "cp env.example .env"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    log_error "Docker가 실행되지 않았습니다. Docker를 시작해주세요."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    log_error "docker-compose가 설치되지 않았습니다."
    exit 1
fi

log_info "환경 확인 완료 ✅"

# Build and start services
log_info "Docker 이미지 빌드 중..."
docker-compose -f docker-compose.prod.yml build

log_info "서비스 시작 중..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
log_info "서비스 시작 대기 중..."
sleep 15

log_info "POC 배포 완료! 🎉"
log_info "프론트엔드: http://localhost:3000"
log_info "백엔드 API: http://localhost:8000"

echo ""
echo "유용한 명령어:"
echo "  로그 확인: docker-compose -f docker-compose.prod.yml logs -f"
echo "  서비스 중지: docker-compose -f docker-compose.prod.yml down"
echo "  서비스 재시작: docker-compose -f docker-compose.prod.yml restart"