from sqlalchemy.orm import Session
from ..models import handy_raw

def get_column_mapper(db: Session) -> dict:
    """
    HANDY_ZSCORE_COLUMN_MAPPER 테이블에서 모든 매핑 정보를 가져와
    {'d000': 'barcode', ...} 형태의 딕셔너리로 반환합니다.
    """
    mapper_rows = db.query(
        handy_raw.HandyColumnMapper.raw_column_name, 
        handy_raw.HandyColumnMapper.mapped_column_name
    ).all()
    return {raw.lower(): mapped.lower() for raw, mapped in mapper_rows}


def get_raw_data_by_id_range(db: Session, start_id: int, end_id: int) -> list:
    """
    HANDY_ZSCORE_RAW_DATA 테이블에서 지정된 ID 범위의 모든 데이터를 조회합니다.
    """
    return db.query(handy_raw.HandyRawData).filter(
        handy_raw.HandyRawData.id >= start_id, 
        handy_raw.HandyRawData.id <= end_id
    ).all() 