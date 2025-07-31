# 🚀 Z-Score POC 도커 배포 가이드

캠샤프트 제조 라인 불량률 예측 시스템 POC를 Docker를 사용하여 간단하게 배포할 수 있습니다.

## 📋 사전 요구사항

### 시스템 요구사항

- **Docker**: 20.10 이상
- **Docker Compose**: 2.0 이상
- **메모리**: 최소 2GB RAM
- **저장공간**: 최소 5GB 여유 공간
- **Oracle DB**: 접근 가능한 Oracle 데이터베이스

### 설치 확인

```bash
docker --version
docker-compose --version
```

## 🔧 설정

### 1. 환경변수 설정

```bash
# env.example을 .env로 복사
cp env.example .env

# .env 파일 편집 (Oracle 연결 정보 수정 필요!)
```

### 2. Oracle 데이터베이스 설정

```bash
# .env 파일에서 Oracle 연결 정보 수정
ORACLE_USER=your_oracle_user
ORACLE_PASSWORD=your_oracle_password
ORACLE_DSN=your_host:1521/your_service_name
```

## 🚀 배포 방법

### 자동 배포 (권장)

#### Windows:

```cmd
deploy.bat
```

#### Linux/macOS:

```bash
./deploy.sh
```

### 수동 배포

```bash
# 1. 이미지 빌드
docker-compose -f docker-compose.prod.yml build

# 2. 서비스 시작
docker-compose -f docker-compose.prod.yml up -d

# 3. 로그 확인
docker-compose -f docker-compose.prod.yml logs -f
```

## 🌐 접속 정보

배포 완료 후 다음 URL로 접속할 수 있습니다:

- **프론트엔드**: http://localhost:3000
- **백엔드 API**: http://localhost:8000
- **API 문서**: http://localhost:8000/docs

## 📊 서비스 구성

### 컨테이너 구성

| 서비스   | 포트 | 설명               |
| -------- | ---- | ------------------ |
| frontend | 3000 | Next.js 프론트엔드 |
| backend  | 8000 | FastAPI 백엔드     |

### 네트워크 구성

```
Internet → Frontend (3000) → Backend (8000) → Oracle DB (외부)
```

## 🔧 관리 명령어

### 서비스 관리

```bash
# 서비스 상태 확인
docker-compose -f docker-compose.prod.yml ps

# 로그 실시간 확인
docker-compose -f docker-compose.prod.yml logs -f

# 특정 서비스 로그 확인
docker-compose -f docker-compose.prod.yml logs -f backend

# 서비스 재시작
docker-compose -f docker-compose.prod.yml restart

# 서비스 중지
docker-compose -f docker-compose.prod.yml down

# 볼륨까지 완전 삭제
docker-compose -f docker-compose.prod.yml down -v
```

### 데이터베이스 관리

```bash
# 데이터베이스 접속
docker exec -it zscore-mariadb mysql -u root -p

# 백업 생성
docker exec zscore-mariadb mysqldump -u root -p zscore_db > backup.sql

# 백업 복원
docker exec -i zscore-mariadb mysql -u root -p zscore_db < backup.sql
```

### 컨테이너 디버깅

```bash
# 백엔드 컨테이너 접속
docker exec -it zscore-backend bash

# 프론트엔드 컨테이너 접속
docker exec -it zscore-frontend sh

# 리소스 사용량 확인
docker stats
```

## 🔒 보안 설정

### 프로덕션 환경 보안 체크리스트

- [ ] 모든 기본 비밀번호 변경
- [ ] SECRET_KEY 32자 이상 랜덤 문자열로 설정
- [ ] CORS_ORIGINS에 실제 도메인만 추가
- [ ] SSL/TLS 인증서 설정 (HTTPS)
- [ ] 방화벽 설정 (필요한 포트만 개방)
- [ ] 정기적인 보안 업데이트

### SSL/TLS 설정 (HTTPS)

```bash
# SSL 인증서 디렉토리 생성
mkdir -p nginx/ssl

# Let's Encrypt 사용 예시 (실제 도메인 필요)
certbot certonly --standalone -d yourdomain.com

# 인증서 파일 복사
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem
```

## 📈 모니터링

### 헬스체크

모든 서비스에는 헬스체크가 설정되어 있습니다:

```bash
# 전체 서비스 상태 확인
docker-compose -f docker-compose.prod.yml ps

# 특정 서비스 헬스체크
curl http://localhost/health
curl http://localhost/api/health
```

### 로그 모니터링

```bash
# 에러 로그만 필터링
docker-compose -f docker-compose.prod.yml logs | grep ERROR

# 실시간 백엔드 로그
docker-compose -f docker-compose.prod.yml logs -f backend
```

## 🔄 업데이트

### 애플리케이션 업데이트

```bash
# 1. 최신 코드 가져오기
git pull

# 2. 이미지 재빌드
docker-compose -f docker-compose.prod.yml build --no-cache

# 3. 서비스 재시작
docker-compose -f docker-compose.prod.yml up -d
```

### 무중단 업데이트 (Blue-Green 배포)

```bash
# 1. 새 버전 빌드
docker-compose -f docker-compose.prod.yml build

# 2. 새 서비스 시작 (다른 포트)
docker-compose -f docker-compose.prod.yml up -d --scale frontend=2

# 3. 헬스체크 후 기존 서비스 종료
# 4. 트래픽 라우팅 변경
```

## 🐛 문제 해결

### 일반적인 문제들

#### 1. 포트 충돌

```bash
# 사용 중인 포트 확인
netstat -tulpn | grep :80
lsof -i :80

# 기존 프로세스 종료 후 재시작
```

#### 2. 메모리 부족

```bash
# Docker 메모리 사용량 확인
docker stats

# 불필요한 컨테이너/이미지 정리
docker system prune -a
```

#### 3. 데이터베이스 연결 오류

```bash
# 데이터베이스 로그 확인
docker-compose -f docker-compose.prod.yml logs mariadb

# 데이터베이스 재시작
docker-compose -f docker-compose.prod.yml restart mariadb
```

### 로그 분석

```bash
# 에러 패턴 검색
docker-compose -f docker-compose.prod.yml logs | grep -i "error\|exception\|failed"

# 특정 시간대 로그
docker-compose -f docker-compose.prod.yml logs --since="2024-01-01T00:00:00"
```

## 💾 백업 및 복구

### 자동 백업 설정

```bash
# 백업 스크립트 예시 (crontab에 추가)
0 2 * * * /path/to/backup-script.sh
```

### 데이터 볼륨 백업

```bash
# 데이터 볼륨 백업
docker run --rm -v zscore_mariadb-data:/data -v $(pwd):/backup alpine tar czf /backup/db-backup.tar.gz /data

# 데이터 볼륨 복원
docker run --rm -v zscore_mariadb-data:/data -v $(pwd):/backup alpine tar xzf /backup/db-backup.tar.gz
```

## 📞 지원

문제가 발생하거나 추가 지원이 필요한 경우:

1. **로그 확인**: 먼저 로그를 확인하여 오류 메시지를 파악
2. **문서 검토**: 이 가이드와 공식 Docker 문서 검토
3. **이슈 리포팅**: GitHub Issues에 로그와 함께 문제 상황 보고

---

🎉 **배포 완료!** Z-Score 불량률 예측 시스템이 성공적으로 실행되었습니다.
