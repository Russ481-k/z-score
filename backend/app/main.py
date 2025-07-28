from fastapi import FastAPI
from .core.database import engine
from .models import analysis # 우리가 생성한 모델 파일
from fastapi import Depends
from sqlalchemy.orm import Session
from .core.database import get_db
from .services import transformation as transformation_service
from .crud import raw_data as raw_data_crud # raw_data crud 필요

# 애플리케이션 시작 시 DB에 필요한 테이블들을 생성합니다.
# 우리가 정의한 Product, CamMeasurement, DistributionAnalysis 테이블이 생성됩니다.
analysis.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Z-Score Defect Prediction API",
    description="캠샤프트 제조 라인 불량률 예측 및 알람 시스템 API",
    version="0.1.0",
)

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

# --- 기존에 존재하던 API 엔드포인트들은 잠시 주석 처리합니다. ---
# --- 향후 단계에서 라우터로 분리하여 다시 구현할 예정입니다. ---
# from sqlalchemy.orm import Session
# from pydantic import BaseModel
# from pathlib import Path
# from datetime import datetime
# from typing import Optional, List
# from .core.config import settings
# from .processing import reader, transformer, loader
# from . import schemas

# class FileProcessRequest(BaseModel):
#     file_path: str

# @app.get("/api/data/products", response_model=schemas.ProductResponse, summary="제품 정보 조회")
# ... 등등 