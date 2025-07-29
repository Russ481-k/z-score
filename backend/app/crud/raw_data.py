from sqlalchemy.orm import Session
from ..models.handy_raw import HandyRawData, HandyColumnMapper
from ..models.analysis import Product
from typing import List, Optional, Tuple
from datetime import date

def get_column_mapper(db: Session):
    """
    HANDY_ZSCORE_COLUMN_MAPPER 테이블에서 모든 컬럼 매핑 정보를 조회하여 딕셔너리로 반환합니다.
    """
    results = db.query(HandyColumnMapper).all()
    
    # raw_column_name을 key로, mapped_column_name을 value로 하는 딕셔너리 생성
    column_mapper = {}
    for result in results:
        column_mapper[result.raw_column_name] = result.mapped_column_name
    
    return column_mapper


def get_raw_data_by_id_range(db: Session, start_id: int, end_id: int) -> List[HandyRawData]:
    """
    HANDY_ZSCORE_RAW_DATA 테이블에서 지정된 ID 범위의 모든 데이터를 조회합니다.
    """
    return db.query(HandyRawData).filter(HandyRawData.id >= start_id, HandyRawData.id <= end_id).all()

def get_products_with_count(
    db: Session,
    start_date: Optional[date],
    end_date: Optional[date],
    skip: int = 0,
    limit: int = 100
) -> Tuple[List[Product], int]:
    """
    기간 및 페이징을 기반으로 제품 목록과 총 개수를 조회합니다.
    """
    query = db.query(Product)
    
    # 실제 데이터베이스 구조에 맞게 timestamp 필드 사용
    if start_date:
        query = query.filter(Product.timestamp >= start_date)
    if end_date:
        # end_date는 해당 날짜의 시작이므로, 하루를 더해 그 다음 날의 시작 전까지로 범위를 설정합니다.
        from datetime import timedelta
        query = query.filter(Product.timestamp < end_date + timedelta(days=1))

    total_count = query.count()
    
    products = query.order_by(Product.timestamp.desc()).offset(skip).limit(limit).all()
    
    return products, total_count 