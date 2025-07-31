#!/bin/bash
# export-images.sh - Docker 이미지 내보내기 스크립트 (Linux/macOS)

set -e

echo "💾 Z-Score Docker 이미지 내보내기 스크립트"
echo "========================================"

# 색상 정의
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 설정
IMAGE_TAG=${1:-latest}
OUTPUT_DIR=${2:-docker-images}

echo -e "${GREEN}[INFO]${NC} 이미지 태그: ${IMAGE_TAG}"
echo -e "${GREEN}[INFO]${NC} 출력 디렉토리: ${OUTPUT_DIR}"

# 출력 디렉토리 생성
mkdir -p "${OUTPUT_DIR}"
echo -e "${GREEN}[INFO]${NC} 디렉토리 생성: ${OUTPUT_DIR}"

# 백엔드 이미지 내보내기
echo -e "${GREEN}[INFO]${NC} 백엔드 이미지 내보내기 중..."
docker save -o "${OUTPUT_DIR}/zscore-backend-${IMAGE_TAG}.tar" zscore-backend:${IMAGE_TAG}

# 프론트엔드 이미지 내보내기
echo -e "${GREEN}[INFO]${NC} 프론트엔드 이미지 내보내기 중..."
docker save -o "${OUTPUT_DIR}/zscore-frontend-${IMAGE_TAG}.tar" zscore-frontend:${IMAGE_TAG}

# 배포용 파일 복사
echo -e "${GREEN}[INFO]${NC} 배포 파일 복사 중..."
cp docker-compose.prod.yml "${OUTPUT_DIR}/docker-compose.yml"
cp env.example "${OUTPUT_DIR}/env.example"

# 로드 스크립트 생성
echo -e "${GREEN}[INFO]${NC} 로드 스크립트 생성 중..."
cat > "${OUTPUT_DIR}/load-images.sh" << EOF
#!/bin/bash
# 이미지 로드 스크립트

set -e

echo "🔄 Z-Score 이미지 로드 스크립트"
echo "=========================="

echo "[INFO] 백엔드 이미지 로드 중..."
docker load -i zscore-backend-${IMAGE_TAG}.tar

echo "[INFO] 프론트엔드 이미지 로드 중..."
docker load -i zscore-frontend-${IMAGE_TAG}.tar

echo "[SUCCESS] 모든 이미지 로드 완료! ✅"

echo ""
echo "다음 단계:"
echo "1. env.example을 .env로 복사하고 Oracle 설정 수정:"
echo "   cp env.example .env"
echo "2. 서비스 시작:"
echo "   docker-compose up -d"
echo "3. 로그 확인:"
echo "   docker-compose logs -f"
EOF

chmod +x "${OUTPUT_DIR}/load-images.sh"

echo -e "${GREEN}[SUCCESS]${NC} 이미지 내보내기 완료! ✅"

echo ""
echo "생성된 파일:"
ls -la "${OUTPUT_DIR}"

echo ""
echo "사용 방법:"
echo "1. ${OUTPUT_DIR} 폴더를 대상 서버로 복사"
echo "2. 대상 서버에서 ./load-images.sh 실행"
echo "3. env.example을 .env로 복사하고 설정 수정"
echo "4. docker-compose up -d 명령으로 서비스 시작"