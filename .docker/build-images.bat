@echo off
REM build-images.bat - Docker 이미지 빌드 스크립트 (Windows)

echo 🏗️ Z-Score Docker 이미지 빌드 스크립트
echo ========================================

set IMAGE_TAG=latest
set REGISTRY=your-registry

REM 이미지 태그 입력 받기
set /p IMAGE_TAG="이미지 태그를 입력하세요 (기본값: latest): " || set IMAGE_TAG=latest

echo [INFO] 이미지 태그: %IMAGE_TAG%

REM 백엔드 이미지 빌드
echo [INFO] 백엔드 이미지 빌드 중...
docker build -f backend/Dockerfile -t zscore-backend:%IMAGE_TAG% .
if errorlevel 1 (
    echo [ERROR] 백엔드 이미지 빌드 실패
    pause
    exit /b 1
)

REM 프론트엔드 이미지 빌드
echo [INFO] 프론트엔드 이미지 빌드 중...
docker build -f frontend/Dockerfile -t zscore-frontend:%IMAGE_TAG% ./frontend
if errorlevel 1 (
    echo [ERROR] 프론트엔드 이미지 빌드 실패
    pause
    exit /b 1
)

echo [SUCCESS] 모든 이미지 빌드 완료! ✅

REM 빌드된 이미지 확인
echo.
echo 빌드된 이미지 목록:
docker images | findstr zscore

echo.
echo 다음 단계:
echo 1. Docker Hub에 푸시하려면: push-images.bat
echo 2. 로컬에서 테스트하려면: deploy.bat
echo 3. 이미지 내보내기: export-images.bat

pause