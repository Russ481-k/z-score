@echo off
REM push-images.bat - Docker 이미지 푸시 스크립트 (Windows)

echo 📤 Z-Score Docker 이미지 푸시 스크립트
echo ======================================

set IMAGE_TAG=latest
set REGISTRY=

REM 설정 입력 받기
set /p REGISTRY="Docker Hub 사용자명/조직명을 입력하세요: "
if "%REGISTRY%"=="" (
    echo [ERROR] 레지스트리가 입력되지 않았습니다.
    pause
    exit /b 1
)

set /p IMAGE_TAG="이미지 태그를 입력하세요 (기본값: latest): " || set IMAGE_TAG=latest

echo [INFO] 레지스트리: %REGISTRY%
echo [INFO] 태그: %IMAGE_TAG%

REM Docker Hub 로그인 확인
echo [INFO] Docker Hub 로그인 상태 확인...
docker info | findstr "Username" >nul
if errorlevel 1 (
    echo [INFO] Docker Hub에 로그인해주세요.
    docker login
    if errorlevel 1 (
        echo [ERROR] Docker Hub 로그인 실패
        pause
        exit /b 1
    )
)

REM 백엔드 이미지 태깅 및 푸시
echo [INFO] 백엔드 이미지 태깅 및 푸시 중...
docker tag zscore-backend:%IMAGE_TAG% %REGISTRY%/zscore-backend:%IMAGE_TAG%
docker push %REGISTRY%/zscore-backend:%IMAGE_TAG%
if errorlevel 1 (
    echo [ERROR] 백엔드 이미지 푸시 실패
    pause
    exit /b 1
)

REM 프론트엔드 이미지 태깅 및 푸시
echo [INFO] 프론트엔드 이미지 태깅 및 푸시 중...
docker tag zscore-frontend:%IMAGE_TAG% %REGISTRY%/zscore-frontend:%IMAGE_TAG%
docker push %REGISTRY%/zscore-frontend:%IMAGE_TAG%
if errorlevel 1 (
    echo [ERROR] 프론트엔드 이미지 푸시 실패
    pause
    exit /b 1
)

echo [SUCCESS] 모든 이미지 푸시 완료! ✅

echo.
echo 배포 정보:
echo - 백엔드: %REGISTRY%/zscore-backend:%IMAGE_TAG%
echo - 프론트엔드: %REGISTRY%/zscore-frontend:%IMAGE_TAG%

echo.
echo 다른 환경에서 사용하려면:
echo docker pull %REGISTRY%/zscore-backend:%IMAGE_TAG%
echo docker pull %REGISTRY%/zscore-frontend:%IMAGE_TAG%

pause