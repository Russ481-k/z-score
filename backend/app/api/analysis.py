from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from ..core.database import get_db
from ..crud import analysis as analysis_crud
from .. import schemas

router = APIRouter(
    prefix="/analysis",
    tags=["Analysis"],
)

@router.get("/history", summary="분석 히스토리 조회")
def get_analysis_history(
    start_date: Optional[str] = Query(None, description="조회 시작일"),
    end_date: Optional[str] = Query(None, description="조회 종료일"),
    metric: str = Query(..., description="측정 항목 (angle 또는 torque)"),
    cam_number: int = Query(..., description="캠 번호"),
    db: Session = Depends(get_db)
):
    """
    지정된 기간과 캠 번호에 대한 분석 히스토리를 반환합니다.
    """
    history = analysis_crud.get_analysis_history(
        db,
        start_date=start_date,
        end_date=end_date,
        metric=metric,
        cam_number=cam_number
    )
    return {"data": history}

@router.get("/distribution", summary="공정 분포 조회")
def get_process_distribution(
    metric: str = Query(..., description="측정 항목 (angle 또는 torque)"),
    db: Session = Depends(get_db)
):
    """
    지정된 측정 항목에 대한 캠별 분포 데이터를 반환합니다.
    """
    distribution = analysis_crud.get_process_distribution(
        db,
        metric=metric
    )
    return {"data": distribution} 