# 🐳 Z-Score Docker 완전 가이드

캠샤프트 제조 라인 불량률 예측 시스템을 Docker로 설치, 빌드, 배포하는 종합 가이드입니다.

## 📚 목차

1. [Docker 설치](#-docker-설치)
2. [POC 빠른 시작](#-poc-빠른-시작)
3. [이미지 빌드](#-이미지-빌드)
4. [Docker Hub 배포](#-docker-hub-배포)
5. [오프라인 배포](#-오프라인-배포)
6. [운영 환경 배포](#-운영-환경-배포)
7. [문제 해결](#-문제-해결)

---

## 🔧 Docker 설치

### Windows 사용자

#### 1. Docker Desktop 다운로드 및 설치

1. **Docker Desktop 다운로드**
   - 공식 사이트: https://www.docker.com/products/docker-desktop/
   - "Download for Windows" 클릭

2. **시스템 요구사항 확인**
   - Windows 10 64-bit: Pro, Enterprise, Education (Build 16299 이상)
   - 또는 Windows 11 64-bit: Home, Pro, Enterprise, Education
   - WSL 2 기능 활성화 필요
   - 4GB RAM 권장

3. **설치 실행**
   ```cmd
   # 다운로드한 Docker Desktop Installer.exe 실행
   # "Use WSL 2 instead of Hyper-V" 옵션 체크 (권장)
   ```

#### 2. WSL 2 설정 (필요시)

```powershell
# PowerShell을 관리자 권한으로 실행

# WSL 기능 활성화
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart

# Virtual Machine Platform 기능 활성화
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

# 재부팅
shutdown /r /t 0
```

재부팅 후:

```powershell
# WSL 2를 기본 버전으로 설정
wsl --set-default-version 2

# 설치된 WSL 배포판 확인
wsl --list --verbose
```

#### 3. Docker Desktop 시작

1. **Docker Desktop 실행**
   - 시작 메뉴에서 "Docker Desktop" 검색 후 실행
   - 트레이에 Docker 아이콘이 나타날 때까지 대기

2. **Docker 설정 확인**
   - Docker Desktop이 실행되면 트레이 아이콘이 초록색으로 변경됨
   - "Docker Desktop is running" 메시지 확인

### Linux 사용자

#### Ubuntu/Debian:

```bash
# 이전 버전 제거
sudo apt-get remove docker docker-engine docker.io containerd runc

# Docker 저장소 설정
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Docker 설치
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 사용자를 docker 그룹에 추가
sudo usermod -aG docker $USER

# 재로그인 후 테스트
docker --version
```

#### CentOS/RHEL:

```bash
# Docker 저장소 추가
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# Docker 설치
sudo yum install docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Docker 서비스 시작
sudo systemctl start docker
sudo systemctl enable docker

# 사용자를 docker 그룹에 추가
sudo usermod -aG docker $USER
```

### macOS 사용자

1. **Docker Desktop for Mac 다운로드**
   - https://www.docker.com/products/docker-desktop/

2. **설치 및 실행**
   ```bash
   # 설치 후 Applications에서 Docker 실행
   # 메뉴바에 Docker 아이콘이 나타날 때까지 대기
   
   # 터미널에서 확인
   docker --version
   docker-compose --version
   ```

### Docker 설치 확인

```cmd
# CMD 또는 PowerShell에서 실행
docker --version
docker-compose --version

# Docker 실행 테스트
docker run hello-world
```

---

## ⚡ POC 빠른 시작

### 🎯 POC 목적

캠샤프트 제조 라인 불량률 예측 시스템의 핵심 기능을 빠르게 검증하기 위한 최소한의 Docker 환경입니다.

### 1. 프로젝트 클론

```bash
git clone <repository-url>
cd z-score
```

### 2. 환경 설정

```bash
# 환경변수 파일 생성
copy env.example .env    # Windows
cp env.example .env      # Linux/macOS

# .env 파일에서 Oracle 연결 정보 수정
ORACLE_USER=your_username
ORACLE_PASSWORD=your_password
ORACLE_DSN=your_host:1521/your_service
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. 배포 실행

```bash
# Windows
deploy.bat

# Linux/macOS
chmod +x deploy.sh
./deploy.sh
```

### 4. 접속 확인

- **프론트엔드**: http://localhost:3000
- **백엔드 API**: http://localhost:8000
- **API 문서**: http://localhost:8000/docs

### 5. 핵심 기능 확인

✅ **구현된 기능**
- 📊 **실시간 대시보드**: 생산 라인 모니터링
- 🔍 **Raw Data 탭**: 원본 데이터 조회 및 분석
- ⚙️ **Column Mapper**: 데이터 매핑 관리
- 📈 **백테스팅**: 모델 기반 실시간 예측 시뮬레이션
- ⚠️ **실시간 알림**: 불량률 예측 토스트 알림

---

## 🏗️ 이미지 빌드

### 로컬에서 이미지 빌드

#### Windows:

```cmd
# 이미지 빌드 스크립트 실행
build-images.bat

# 수동으로 태그 지정하여 빌드
build-images.bat v1.0.0
```

#### Linux/macOS:

```bash
# 실행 권한 부여
chmod +x build-images.sh

# 기본 태그로 빌드 (latest)
./build-images.sh

# 특정 태그로 빌드
./build-images.sh v1.0.0
./build-images.sh production
```

### 빌드 결과 확인

```bash
# 생성된 이미지 확인
docker images | grep zscore

# 예상 결과:
# zscore-frontend    latest    abc123def456    5 minutes ago    200MB
# zscore-backend     latest    def456ghi789    6 minutes ago    150MB
```

---

## 📤 Docker Hub 배포

### 1. Docker Hub 계정 준비

- Docker Hub 계정 생성: https://hub.docker.com
- 로컬에서 로그인:

```bash
docker login
# Username과 Password 입력
```

### 2. 이미지 푸시

#### Windows:

```cmd
# 기본 태그로 푸시
push-images.bat

# 사용자명을 지정하여 푸시
push-images.bat myusername
```

#### Linux/macOS:

```bash
# 실행 권한 부여
chmod +x push-images.sh

# 기본 태그로 푸시
./push-images.sh latest myusername

# 특정 태그와 사용자명으로 푸시
./push-images.sh v1.0.0 mycompany
```

### 3. Docker Hub에서 확인

- https://hub.docker.com 에서 본인 계정으로 로그인
- `myusername/zscore-frontend`, `myusername/zscore-backend` 저장소 확인

---

## 💾 오프라인 배포

인터넷이 없는 환경에서 사용할 수 있도록 이미지를 파일로 내보냅니다.

### 1. 이미지 내보내기

#### Windows:

```cmd
# 기본 디렉토리로 내보내기
export-images.bat

# 특정 디렉토리로 내보내기
export-images.bat production-images
```

#### Linux/macOS:

```bash
# 실행 권한 부여
chmod +x export-images.sh

# 기본 태그로 내보내기
./export-images.sh latest

# 특정 태그와 디렉토리로 내보내기
./export-images.sh v1.0.0 production-images
```

### 2. 대상 서버에서 이미지 로드

#### Windows:

```cmd
# 이미지 파일들을 대상 서버로 복사 후
load-images.bat
```

#### Linux/macOS:

```bash
# 실행 권한 부여
chmod +x load-images.sh

# 이미지 로드
./load-images.sh
```

### 3. 로드된 이미지 확인

```bash
docker images | grep zscore
```

---

## 🚀 운영 환경 배포

### 방법 1: Docker Hub에서 직접 사용

```yaml
# docker-compose.prod.yml
version: "3.8"
services:
  frontend:
    image: myusername/zscore-frontend:latest
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000

  backend:
    image: myusername/zscore-backend:latest
    ports:
      - "8000:8000"
    environment:
      - ORACLE_USER=${ORACLE_USER}
      - ORACLE_PASSWORD=${ORACLE_PASSWORD}
      - ORACLE_DSN=${ORACLE_DSN}
```

```bash
# 환경변수 설정 후 실행
docker-compose -f docker-compose.prod.yml up -d
```

### 방법 2: 오프라인 이미지 사용

```bash
# 1. 이미지 로드
./load-images.sh

# 2. 로컬 이미지로 실행
docker-compose -f docker-compose.prod.yml up -d
```

### 방법 3: 자동 배포 스크립트

#### Windows:

```cmd
# 운영 환경 자동 배포
deploy.bat
```

#### Linux/macOS:

```bash
# 운영 환경 자동 배포
./deploy.sh
```

---

## 🔧 문제 해결

### Docker 관련 문제

#### 1. "Docker 명령어가 인식되지 않는 경우"

```bash
# Docker 설치 확인
docker --version

# Windows: Docker Desktop 재시작
# Linux/macOS: Docker 서비스 재시작
sudo systemctl restart docker
```

#### 2. "Docker Desktop requires a newer WSL kernel version"

```powershell
# WSL 2 Linux 커널 업데이트 패키지 다운로드 및 설치
# https://docs.microsoft.com/en-us/windows/wsl/install-manual#step-4---download-the-linux-kernel-update-package
```

#### 3. "Hardware assisted virtualization must be enabled"

- BIOS/UEFI 설정에서 가상화 기능 활성화 필요
- Intel: Intel VT-x 활성화
- AMD: AMD-V 활성화

#### 4. Docker Desktop이 시작되지 않는 경우

```cmd
# Docker Desktop 완전 제거 및 재설치
# 1. Docker Desktop 제거
# 2. %APPDATA%\Docker 폴더 삭제
# 3. 재부팅 후 재설치
```

### 애플리케이션 관련 문제

#### 1. Oracle 연결 오류

```bash
# 연결 정보 확인
docker-compose logs backend

# 환경변수 확인
cat .env  # Linux/macOS
type .env # Windows
```

#### 2. 포트 충돌

```bash
# 포트 사용 확인
netstat -ano | findstr :3000  # Windows
lsof -i :3000                 # Linux/macOS

# 다른 포트로 변경
# docker-compose.yml에서 포트 수정
```

#### 3. 메모리 부족

```bash
# Docker 리소스 정리
docker system prune -a

# Docker Desktop에서 메모리 할당량 증가
# Settings > Resources > Advanced > Memory: 4GB 이상
```

#### 4. 컨테이너 상태 확인

```bash
# 실행 중인 컨테이너 확인
docker ps

# 모든 컨테이너 확인
docker ps -a

# 특정 컨테이너 로그 확인
docker logs <container_name>

# 컨테이너 재시작
docker restart <container_name>
```

### 로그 확인

```bash
# 모든 서비스 로그
docker-compose logs -f

# 특정 서비스 로그
docker-compose logs -f backend
docker-compose logs -f frontend

# 마지막 100줄만 확인
docker-compose logs --tail=100 backend
```

---

## 📞 추가 지원

### 공식 문서

- **Windows**: https://docs.docker.com/desktop/windows/install/
- **Linux**: https://docs.docker.com/engine/install/
- **macOS**: https://docs.docker.com/desktop/mac/install/

### 시스템 요구사항

- **가상화 기능 활성화** (BIOS/UEFI 설정)
- **충분한 디스크 공간** (20GB 이상)
- **메모리** 4GB 이상 권장

### 재부팅 후 재시도

Docker 설치 후 시스템 재부팅을 권장합니다.

---

## 🎯 요약

1. **Docker 설치**: 플랫폼별 Docker Desktop 또는 Docker Engine 설치
2. **POC 실행**: `deploy.bat` 또는 `./deploy.sh`로 빠른 시작
3. **이미지 빌드**: `build-images.bat` 또는 `./build-images.sh`
4. **배포**: Docker Hub, 오프라인, 또는 운영 환경별 배포 방법 선택
5. **문제 해결**: 로그 확인 및 시스템 요구사항 점검

---

💡 **Docker 설치 완료 후 Z-Score 시스템으로 스마트한 제조 라인 모니터링을 시작하세요!** 🚀