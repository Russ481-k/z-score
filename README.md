# 🎯 Z-Score 프로젝트 - 캠샤프트 불량률 예측 시스템

캠샤프트 제조 라인의 불량률을 예측하고 실시간 알람을 제공하는 AI 기반 모니터링 시스템입니다.

## 🏗️ 기술 스택

- **Backend**: Python 3.12.10, FastAPI, SQLAlchemy
- **Frontend**: Next.js, React Query, AG-Grid, SCSS
- **Database**: Oracle, MariaDB 호환
- **Deployment**: Docker Compose

## 📋 주요 기능

- **📊 실시간 대시보드**: 생산 라인 모니터링 및 데이터 시각화
- **🔍 Raw Data 조회**: 원본 데이터 조회 및 무한 스크롤
- **⚙️ Column Mapper**: 데이터 매핑 관리 (CRUD, 드래그앤드롭)
- **📈 백테스팅**: 모델 기반 실시간 예측 시뮬레이션
- **⚠️ 실시간 알림**: 불량률 예측 토스트 알림
- **🎛️ 6개 위상각 모니터링**: 실시간 캠 위상각 분석

## 🚀 빠른 시작

### 0. Docker 설치 (필수)

**⚠️ Docker가 설치되지 않은 경우 먼저 설치하세요:**

- [Docker 완전 가이드](docs/DOCKER-GUIDE.md) 참조
- Windows: Docker Desktop 설치 필요
- 설치 후 `docker --version` 명령으로 확인

### 1. 저장소 클론

```bash
git clone <repository-url>
cd z-score
```

### 2. 환경설정

```bash
# 환경변수 파일 생성
copy env.example .env    # Windows
cp env.example .env      # Linux/macOS

# .env 파일 수정 (Oracle 연결 정보)
ORACLE_USER=your_username
ORACLE_PASSWORD=your_password
ORACLE_DSN=your_host:1521/your_service
```

### 3. Docker Compose로 실행

```bash
# 서비스 빌드 및 시작
docker-compose up --build

# 백그라운드 실행
docker-compose up -d

# 서비스 중지
docker-compose down
```

### 4. 접속

- **프론트엔드**: http://localhost:3000
- **백엔드 API**: http://localhost:8000
- **API 문서**: http://localhost:8000/docs

## 💻 개발 환경 실행

### Backend (Python)

```bash
# Poetry 환경 설정
poetry install
poetry shell

# FastAPI 서버 실행
poetry run uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000

# 또는 직접 실행
python -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend (Next.js)

```bash
cd frontend

# 의존성 설치
npm install
# 또는
pnpm install

# 개발 서버 실행
npm run dev
# 또는
pnpm dev
```

## 📊 데이터 관리

### 초기 데이터 로드

```bash
# CSV 데이터 일괄 로드
python scripts/load_data.py

# 개별 데이터 확인
python scripts/verify_data.py
```

### 실시간 데이터 처리

- 백엔드에서 자동으로 APScheduler를 통한 실시간 데이터 처리
- WebSocket 연결을 통한 프론트엔드 실시간 업데이트

## 🐳 Docker 이미지 배포

### 이미지 빌드

```bash
# Windows
.\build-images.bat

# Linux/macOS
./build-images.sh latest
```

### Docker Hub 배포

```bash
# Windows
.\push-images.bat

# Linux/macOS
./push-images.sh latest myusername
```

### 오프라인 배포

```bash
# 이미지 내보내기
.\export-images.bat        # Windows
./export-images.sh latest  # Linux/macOS

# 대상 서버에서 로드
.\load-images.bat          # Windows
./load-images.sh           # Linux/macOS
```

자세한 Docker 배포 가이드는 [DOCKER-GUIDE.md](docs/DOCKER-GUIDE.md)를 참조하세요.

## 🎮 사용 방법

### 1. Dashboard 탭

- 실시간 생산 데이터 모니터링
- PPM 차트, 공정 분포 차트 확인
- 제품별 측정 데이터 그리드 뷰

### 2. Raw Data 탭

- 원본 데이터 조회 및 검색
- 무한 스크롤로 대용량 데이터 처리
- 모델별 필터링 및 커스텀 쿼리

### 3. Column Mapper 탭

- 데이터 컬럼 매핑 관리
- 드래그앤드롭으로 순서 변경
- 실시간 CRUD 작업 및 토스트 알림

### 4. Backtesting 탭

- 모델 기반 실시간 예측 시뮬레이션
- 6개 위상각 실시간 모니터링
- PPM 예측 및 경고 알림

## 🔧 핵심 예측 로직

### Z-Score 분석

- 통계적 이상 감지를 통한 불량률 예측
- 정규분포 기반 PPM (Parts Per Million) 계산

### 위상각 모니터링

- 6개 캠 위상각 실시간 분석
- 중심값 기준 편차 측정 및 불량률 예측

### 기울기 분석

- 불량률 증가/감소 추세 예측
- 선형 회귀를 통한 기울기 계산

## 📈 API 엔드포인트

### 주요 API

- `GET /data/products` - 제품 데이터 조회
- `GET /raw-data/list` - Raw 데이터 목록
- `POST /backtest/model-realtime` - 실시간 백테스팅
- `GET /analysis/history` - 분석 이력
- `WebSocket /ws` - 실시간 데이터 스트리밍

자세한 API 명세는 http://localhost:8000/docs 에서 확인하세요.

## 🛠️ 개발 도구

### 코드 품질

```bash
# Python 린팅
black backend/
flake8 backend/

# TypeScript 린팅
cd frontend && npm run lint
```

### 테스트

```bash
# 백엔드 테스트
poetry run pytest

# 프론트엔드 테스트
cd frontend && npm test
```

## 📁 프로젝트 구조

```
z-score/
├── backend/                 # FastAPI 백엔드
│   ├── app/
│   │   ├── api/            # API 라우터
│   │   ├── core/           # 핵심 설정
│   │   ├── models/         # SQLAlchemy 모델
│   │   ├── schemas/        # Pydantic 스키마
│   │   └── services/       # 비즈니스 로직
│   └── Dockerfile
├── frontend/               # Next.js 프론트엔드
│   ├── src/
│   │   ├── components/     # React 컴포넌트
│   │   ├── hooks/          # Custom 훅
│   │   └── lib/           # 유틸리티
│   └── Dockerfile
├── scripts/               # 데이터 처리 스크립트
├── docker-compose.yml     # 개발용 Docker Compose
├── docker-compose.prod.yml # 운영용 Docker Compose
└── README.md
```

## 🔍 문제 해결

### 일반적인 문제들

1. **Docker 명령어가 인식되지 않는 경우**

   ```bash
   # Docker 설치 확인
   docker --version

   # Docker가 설치되지 않은 경우
   # docs/DOCKER-GUIDE.md 가이드 참조하여 Docker Desktop 설치
   ```

2. **Oracle 연결 오류**

   ```bash
   # 연결 정보 확인
   docker-compose logs backend
   ```

3. **포트 충돌**

   ```bash
   # 포트 사용 확인
   netstat -ano | findstr :3000  # Windows
   lsof -i :3000                 # Linux/macOS
   ```

4. **메모리 부족**
   ```bash
   # Docker 리소스 정리
   docker system prune -a
   ```

### 로그 확인

```bash
# 모든 서비스 로그
docker-compose logs -f

# 특정 서비스 로그
docker-compose logs -f backend
docker-compose logs -f frontend
```

## 📚 관련 문서

- [개발 계획서](docs/development_plan.md)
- [데이터베이스 스키마](docs/database_schema.md)
- [API 명세서](docs/api_specification.md)
- [예측 모델 설계](docs/prediction_model.md)
- [Docker 완전 가이드](docs/DOCKER-GUIDE.md)

## 🤝 기여하기

1. Fork 프로젝트
2. Feature 브랜치 생성 (`git checkout -b feature/AmazingFeature`)
3. 변경사항 커밋 (`git commit -m 'Add some AmazingFeature'`)
4. 브랜치에 Push (`git push origin feature/AmazingFeature`)
5. Pull Request 생성

## 📞 지원

프로젝트 사용 중 문제가 발생하면:

1. 로그 확인 후 오류 메시지 수집
2. Oracle 연결 정보 재확인
3. Docker 재시작 후 재배포

---

💡 **Z-Score 시스템으로 스마트한 제조 라인 모니터링을 시작하세요!** 🚀
