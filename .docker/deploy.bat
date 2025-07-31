@echo off
REM deploy.bat - Windows POC deployment script

echo 🚀 Z-Score POC 배포 스크립트 (Windows)
echo ================================

REM Check if .env exists
if not exist ".env" (
    echo [ERROR] .env 파일이 없습니다!
    echo [INFO] env.example 파일을 .env로 복사하고 Oracle 설정을 수정해주세요:
    echo [INFO] copy env.example .env
    pause
    exit /b 1
)

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker가 실행되지 않았습니다. Docker Desktop을 시작해주세요.
    pause
    exit /b 1
)

echo [INFO] 환경 확인 완료 ✅

REM Build and start services
echo [INFO] Docker 이미지 빌드 중...
docker-compose -f docker-compose.prod.yml build

echo [INFO] 서비스 시작 중...
docker-compose -f docker-compose.prod.yml up -d

REM Wait for services to be ready
echo [INFO] 서비스 시작 대기 중...
timeout /t 15 /nobreak >nul

echo [INFO] POC 배포 완료! 🎉
echo [INFO] 프론트엔드: http://localhost:3000
echo [INFO] 백엔드 API: http://localhost:8000

echo.
echo 유용한 명령어:
echo   로그 확인: docker-compose -f docker-compose.prod.yml logs -f
echo   서비스 중지: docker-compose -f docker-compose.prod.yml down
echo   서비스 재시작: docker-compose -f docker-compose.prod.yml restart

pause