@echo off
REM export-images.bat - Docker 이미지 내보내기 스크립트 (Windows)

echo 💾 Z-Score Docker 이미지 내보내기 스크립트
echo ==========================================

set IMAGE_TAG=latest
set OUTPUT_DIR=docker-images

REM 설정
set /p IMAGE_TAG="이미지 태그를 입력하세요 (기본값: latest): " || set IMAGE_TAG=latest
set /p OUTPUT_DIR="출력 디렉토리를 입력하세요 (기본값: docker-images): " || set OUTPUT_DIR=docker-images

echo [INFO] 이미지 태그: %IMAGE_TAG%
echo [INFO] 출력 디렉토리: %OUTPUT_DIR%

REM 출력 디렉토리 생성
if not exist "%OUTPUT_DIR%" (
    mkdir "%OUTPUT_DIR%"
    echo [INFO] 디렉토리 생성: %OUTPUT_DIR%
)

REM 백엔드 이미지 내보내기
echo [INFO] 백엔드 이미지 내보내기 중...
docker save -o "%OUTPUT_DIR%\zscore-backend-%IMAGE_TAG%.tar" zscore-backend:%IMAGE_TAG%
if errorlevel 1 (
    echo [ERROR] 백엔드 이미지 내보내기 실패
    pause
    exit /b 1
)

REM 프론트엔드 이미지 내보내기
echo [INFO] 프론트엔드 이미지 내보내기 중...
docker save -o "%OUTPUT_DIR%\zscore-frontend-%IMAGE_TAG%.tar" zscore-frontend:%IMAGE_TAG%
if errorlevel 1 (
    echo [ERROR] 프론트엔드 이미지 내보내기 실패
    pause
    exit /b 1
)

REM 배포용 docker-compose 파일 복사
echo [INFO] 배포 파일 복사 중...
copy docker-compose.prod.yml "%OUTPUT_DIR%\docker-compose.yml"
copy env.example "%OUTPUT_DIR%\env.example"

REM 로드 스크립트 생성
echo [INFO] 로드 스크립트 생성 중...
(
echo @echo off
echo echo 🔄 Z-Score 이미지 로드 스크립트
echo echo ============================
echo.
echo echo [INFO] 백엔드 이미지 로드 중...
echo docker load -i zscore-backend-%IMAGE_TAG%.tar
echo.
echo echo [INFO] 프론트엔드 이미지 로드 중...
echo docker load -i zscore-frontend-%IMAGE_TAG%.tar
echo.
echo echo [SUCCESS] 모든 이미지 로드 완료! ✅
echo.
echo echo 다음 단계:
echo echo 1. env.example을 .env로 복사하고 Oracle 설정 수정
echo echo 2. docker-compose up -d 명령으로 서비스 시작
echo.
echo pause
) > "%OUTPUT_DIR%\load-images.bat"

echo [SUCCESS] 이미지 내보내기 완료! ✅

echo.
echo 생성된 파일:
dir "%OUTPUT_DIR%"

echo.
echo 사용 방법:
echo 1. %OUTPUT_DIR% 폴더를 대상 서버로 복사
echo 2. 대상 서버에서 load-images.bat 실행
echo 3. env.example을 .env로 복사하고 설정 수정
echo 4. docker-compose up -d 명령으로 서비스 시작

pause