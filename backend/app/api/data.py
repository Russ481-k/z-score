from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime

from ..crud import raw_data as raw_data_crud
from ..core.database import get_db

router = APIRouter(
    prefix="/data",
    tags=["Data"],
)

@router.get("/products", summary="제품 정보 조회")
def get_products(
    start_date: Optional[str] = Query(None, description="조회 시작일"),
    end_date: Optional[str] = Query(None, description="조회 종료일"),
    page: int = Query(1, ge=1, description="페이지 번호"),
    size: int = Query(10, ge=1, le=1000, description="페이지 당 항목 수"),
    db: Session = Depends(get_db)
):
    """
    기간, 페이징을 기반으로 제품 목록과 총 개수를 반환합니다.
    """
    # 빈 문자열을 None으로 변환
    parsed_start_date = None
    parsed_end_date = None
    
    if start_date and start_date.strip():
        try:
            parsed_start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        except ValueError:
            parsed_start_date = None
    
    if end_date and end_date.strip():
        try:
            parsed_end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        except ValueError:
            parsed_end_date = None
    
    products, total_count = raw_data_crud.get_products_with_count(
        db,
        start_date=parsed_start_date,
        end_date=parsed_end_date,
        skip=(page - 1) * size,
        limit=size
    )
    return {"total": total_count, "items": products} 