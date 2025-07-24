from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from pathlib import Path

from .db import models
from .db.database import engine, get_db
from .core.config import settings
from .processing import reader, transformer, loader

# 데이터베이스 테이블 생성
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Z-Score 불량률 예측 시스템")

class FileProcessRequest(BaseModel):
    file_path: str

@app.post("/api/v1/process-file", summary="단일 CSV 파일 처리 테스트")
def process_single_file(request: FileProcessRequest, db: Session = Depends(get_db)):
    """
    지정된 경로의 CSV 파일을 읽어 데이터 파이프라인을 실행하고 DB에 저장합니다.
    """
    file_path = Path(request.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    # 1. Read and Parse
    raw_df = reader.read_and_parse_csv(file_path)
    if raw_df.empty:
        raise HTTPException(status_code=400, detail="Failed to parse CSV file.")

    # 2. Transform
    products_df, measurements_df = transformer.transform_data_for_db(raw_df)

    # 3. Load
    new_products_count = loader.load_data_to_db(db, products_df, measurements_df)

    return {
        "message": "File processed successfully",
        "file_path": request.file_path,
        "new_products_added": new_products_count,
    }

@app.get("/")
def read_root():
    return {"Hello": "World"} 