from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.database import engine
from .models import analysis # 우리가 생성한 모델 파일
from fastapi import Depends
from sqlalchemy.orm import Session
from .core.database import get_db
from .services import transformation as transformation_service
from .crud import raw_data as raw_data_crud # raw_data crud 필요
from .api import data as data_router # 데이터 라우터 추가
from .api import analysis as analysis_router # 분석 라우터 추가
from .api import backtest as backtest_router # 백테스팅 라우터 추가
from .api import raw_data as raw_data_router # 로우 데이터 라우터 추가
import socketio
import asyncio
from datetime import datetime, timedelta
import random
from contextlib import asynccontextmanager

# 실시간 분석 데이터를 생성하고 전송하는 백그라운드 태스크
async def generate_realtime_analysis():
    """주기적으로 실시간 분석 데이터를 생성하고 클라이언트에게 전송"""
    while True:
        try:
            # 캠별 실시간 분석 데이터 생성 (시뮬레이션)
            for cam_number in range(1, 10):  # 캠 1-9
                for metric in ["angle", "torque"]:
                    # 실제로는 데이터베이스에서 최신 데이터를 분석
                    analysis_data = {
                        "analyzed_at": datetime.now().isoformat(),
                        "cam_number": cam_number,
                        "metric": metric,
                        "predicted_ppm": round(random.uniform(100, 600), 2),
                        "mean": round(random.uniform(-0.1, 0.1), 4),
                        "std_dev": round(random.uniform(0.03, 0.08), 4),
                        "ppm_slope": round(random.uniform(-5, 5), 2)
                    }
                    
                    # 웹소켓으로 실시간 데이터 전송
                    await sio.emit("analysis_updated", analysis_data)
            
            # 5초 간격으로 실행
            await asyncio.sleep(5)
            
        except Exception as e:
            print(f"실시간 분석 데이터 생성 중 오류: {e}")
            await asyncio.sleep(10)  # 오류 시 10초 대기

@asynccontextmanager
async def lifespan(app: FastAPI):
    """애플리케이션 생명주기 관리"""
    # 시작 시 실행
    print("실시간 분석 데이터 전송 서비스 시작...")
    task = asyncio.create_task(generate_realtime_analysis())
    yield
    # 종료 시 실행
    task.cancel()
    print("실시간 분석 데이터 전송 서비스 종료...")

# 애플리케이션 시작 시 DB에 필요한 테이블들을 생성합니다.
# 우리가 정의한 Product, CamMeasurement, DistributionAnalysis 테이블이 생성됩니다.
analysis.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Z-Score Defect Prediction API",
    description="캠샤프트 제조 라인 불량률 예측 및 알람 시스템 API",
    version="0.1.0",
    lifespan=lifespan,  # lifespan 추가
)

# CORS 설정 추가
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js 개발 서버
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Socket.IO 서버 생성
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=["http://localhost:3000"]
)

# FastAPI와 Socket.IO 결합
socket_app = socketio.ASGIApp(sio, app)

# API 라우터 등록
app.include_router(data_router.router)
app.include_router(analysis_router.router)
app.include_router(backtest_router.router)
app.include_router(raw_data_router.router)

# Socket.IO 이벤트 핸들러
@sio.event
async def connect(sid, environ):
    print(f"클라이언트 연결됨: {sid}")
    await sio.emit("connected", {"message": "웹소켓 연결 성공"}, room=sid)

@sio.event
async def disconnect(sid):
    print(f"클라이언트 연결 해제됨: {sid}")

# 실시간 분석 결과 전송 함수
async def broadcast_analysis_update(analysis_data):
    """실시간 분석 결과를 모든 연결된 클라이언트에게 전송"""
    await sio.emit("analysis_updated", analysis_data)

@app.get("/", tags=["Root"])
def read_root():
    """
    API 서버의 상태를 확인하는 기본 엔드포인트입니다.
    """
    return {"message": "Z-Score API is running."}

@app.post("/api/v1/process-raw-data-range", summary="지정된 범위의 원본 데이터를 변환하여 저장")
def process_raw_data_range(
    start_id: int,
    end_id: int,
    db: Session = Depends(get_db)
):
    """
    HANDY_ZSCORE_RAW_DATA 테이블에서 start_id부터 end_id까지의 데이터를 읽어,
    가공 후 HANDY_PRODUCTS와 HANDY_CAM_MEASUREMENTS에 저장합니다.
    """
    # 1. 컬럼 매퍼 정보 가져오기
    column_mapper = raw_data_crud.get_column_mapper(db)

    # 2. 지정된 범위의 원본 데이터 가져오기
    raw_data_rows = raw_data_crud.get_raw_data_by_id_range(db, start_id, end_id)

    processed_count = 0
    skipped_count = 0

    # 3. 각 행을 순회하며 변환 및 저장 서비스 호출
    for row in raw_data_rows:
        # DB 레코드를 딕셔너리로 변환 (더 안전한 방식)
        row_dict = {c.name: getattr(row, c.name) for c in row.__table__.columns}

        result = transformation_service.transform_and_load_raw_data(
            db=db,
            raw_data_row=row_dict,
            column_mapper=column_mapper
        )
        if result:
            processed_count += 1
        else:
            skipped_count += 1

    return {
        "message": "Processing complete",
        "total_rows_fetched": len(raw_data_rows),
        "newly_processed_count": processed_count,
        "skipped_count (already_exists_or_error)": skipped_count
    }

# Socket.IO와 FastAPI가 결합된 앱을 메인 앱으로 설정
app = socket_app 