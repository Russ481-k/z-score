from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel

from ..core.database import get_db
from ..models.handy_raw import HandyRawData, HandyColumnMapper
from ..models.analysis import Product, CamMeasurement

router = APIRouter(
    prefix="/raw-data",
    tags=["Raw Data"],
)

class RawDataResponse(BaseModel):
    id: int
    create_time: Optional[datetime] = None
    data_columns: Dict[str, Optional[str]] = {}
    
    class Config:
        from_attributes = True

class ColumnMapperResponse(BaseModel):
    id: int
    raw_column_name: str
    mapped_column_name: str
    description: Optional[str] = None
    display_order: int = 0
    is_active: bool = True
    
    class Config:
        from_attributes = True

class ColumnMapperCreate(BaseModel):
    raw_column_name: str
    mapped_column_name: str
    description: Optional[str] = None
    display_order: Optional[int] = 0
    is_active: Optional[bool] = True

class ColumnMapperUpdate(BaseModel):
    raw_column_name: Optional[str] = None
    mapped_column_name: Optional[str] = None
    description: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None

class DisplayOrderUpdate(BaseModel):
    id: int
    display_order: int

@router.get("/list", summary="로우 데이터 목록 조회")
def get_raw_data_list(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=1000),
    db: Session = Depends(get_db)
):
    """로우 데이터 목록을 페이징하여 조회합니다."""
    
    # 전체 개수 조회
    total = db.query(HandyRawData).count()
    
    # 페이징된 데이터 조회
    raw_data_list = db.query(HandyRawData).order_by(
        HandyRawData.id.desc()
    ).offset(skip).limit(limit).all()
    
    # 결과 변환 - 모든 d000~d149 컬럼을 포함
    items = []
    for raw_data in raw_data_list:
        # 모든 d000~d149 컬럼을 딕셔너리로 변환
        data_columns = {}
        for i in range(150):  # d000부터 d149까지
            column_name = f"d{i:03d}"
            column_value = getattr(raw_data, column_name, None)
            if column_value is not None:  # null이 아닌 값만 포함
                data_columns[column_name] = column_value
        
        items.append({
            "id": raw_data.id,
            "create_time": raw_data.create_time.isoformat() if raw_data.create_time else None,
            "data_columns": data_columns,
            "total_columns": len(data_columns)  # 실제 데이터가 있는 컬럼 수
        })
    
    return {
        "total": total,
        "items": items
    }

@router.get("/mapped", summary="매핑된 로우 데이터 조회")
def get_mapped_raw_data(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=1000),
    db: Session = Depends(get_db)
):
    """매핑된 컬럼 이름으로 로우 데이터를 조회합니다."""
    
    # 활성화된 컬럼 매퍼만 조회하고 display_order 순으로 정렬
    column_mappers = db.query(HandyColumnMapper).filter(
        HandyColumnMapper.is_active == True
    ).order_by(
        HandyColumnMapper.display_order.asc(),
        HandyColumnMapper.id.asc()
    ).all()
    
    mapper_dict = {mapper.raw_column_name: mapper.mapped_column_name for mapper in column_mappers}
    active_columns = set(mapper.raw_column_name for mapper in column_mappers)
    
    # 전체 개수 조회
    total = db.query(HandyRawData).count()
    
    # 페이징된 데이터 조회
    raw_data_list = db.query(HandyRawData).order_by(
        HandyRawData.id.desc()
    ).offset(skip).limit(limit).all()
    
    # 결과 변환 - 활성화된 컬럼만 매핑된 이름으로 변환
    items = []
    for raw_data in raw_data_list:
        mapped_data = {}
        
        # 활성화된 컬럼만 처리하고 display_order 순으로 정렬
        for mapper in column_mappers:
            raw_column_name = mapper.raw_column_name
            column_value = getattr(raw_data, raw_column_name, None)
            
            if column_value is not None:  # null이 아닌 값만 포함
                mapped_data[mapper.mapped_column_name] = column_value
        
        items.append(mapped_data)
    
    return {
        "total": total,
        "items": items,
        "column_mapping": mapper_dict  # 프론트엔드에서 컬럼 정의에 사용할 수 있도록
    }

@router.get("/processed", summary="가공된 데이터 목록 조회")
def get_processed_data_list(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=1000),
    db: Session = Depends(get_db)
):
    """가공된 제품 및 측정 데이터를 조회합니다."""
    
    # Product와 CamMeasurement 조인 조회
    query = db.query(Product, CamMeasurement).join(
        CamMeasurement, Product.id == CamMeasurement.product_id
    ).order_by(Product.timestamp.desc())
    
    total = query.count()
    results = query.offset(skip).limit(limit).all()
    
    processed_data = []
    for product, measurement in results:
        processed_data.append({
            "product_id": product.id,
            "barcode": product.barcode,
            "model_name": product.model_name,
            "line_info": product.line_info,
            "timestamp": product.timestamp.isoformat() if product.timestamp else None,
            "cam_number": measurement.cam_number,
            "angle_value": measurement.angle_value,
            "torque_value": measurement.torque_value,
            "allowance": measurement.allowance
        })
    
    return {
        "total": total,
        "items": processed_data
    }

@router.get("/column-mapper", summary="컬럼 매퍼 목록 조회")
def get_column_mappers(db: Session = Depends(get_db)):
    """컬럼 매퍼 목록을 조회합니다."""
    
    mappers = db.query(HandyColumnMapper).order_by(
        HandyColumnMapper.display_order.asc(),
        HandyColumnMapper.id.asc()
    ).all()
    
    return {
        "total": len(mappers),
        "items": [ColumnMapperResponse.from_orm(mapper) for mapper in mappers]
    }

@router.post("/column-mapper", summary="컬럼 매퍼 생성")
def create_column_mapper(
    mapper_data: ColumnMapperCreate,
    db: Session = Depends(get_db)
):
    """새로운 컬럼 매퍼를 생성합니다."""
    
    # 중복 체크
    existing = db.query(HandyColumnMapper).filter(
        HandyColumnMapper.raw_column_name == mapper_data.raw_column_name
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"Raw column '{mapper_data.raw_column_name}' already exists"
        )
    
    # 새 매퍼 생성
    new_mapper = HandyColumnMapper(
        raw_column_name=mapper_data.raw_column_name,
        mapped_column_name=mapper_data.mapped_column_name
    )
    
    db.add(new_mapper)
    db.commit()
    db.refresh(new_mapper)
    
    return ColumnMapperResponse.from_orm(new_mapper)

@router.put("/column-mapper/{mapper_id}", summary="컬럼 매퍼 수정")
def update_column_mapper(
    mapper_id: int,
    mapper_data: ColumnMapperUpdate,
    db: Session = Depends(get_db)
):
    """컬럼 매퍼를 수정합니다."""
    
    mapper = db.query(HandyColumnMapper).filter(HandyColumnMapper.id == mapper_id).first()
    if not mapper:
        raise HTTPException(status_code=404, detail="Column mapper not found")
    
    # 업데이트할 필드가 있는 경우만 수정
    if mapper_data.raw_column_name is not None:
        mapper.raw_column_name = mapper_data.raw_column_name
    if mapper_data.mapped_column_name is not None:
        mapper.mapped_column_name = mapper_data.mapped_column_name
    
    db.commit()
    db.refresh(mapper)
    
    return ColumnMapperResponse.from_orm(mapper)

@router.delete("/column-mapper/{mapper_id}", summary="컬럼 매퍼 삭제")
def delete_column_mapper(
    mapper_id: int,
    db: Session = Depends(get_db)
):
    """컬럼 매퍼를 삭제합니다."""
    
    mapper = db.query(HandyColumnMapper).filter(HandyColumnMapper.id == mapper_id).first()
    if not mapper:
        raise HTTPException(status_code=404, detail="Column mapper not found")
    
    db.delete(mapper)
    db.commit()
    
    return {"message": "Column mapper deleted successfully"}

@router.put("/column-mapper/display-order", summary="컬럼 매퍼 표시 순서 변경")
def update_column_mapper_display_order(
    updates: List[DisplayOrderUpdate],
    db: Session = Depends(get_db)
):
    """컬럼 매퍼의 표시 순서를 변경합니다."""
    
    for update in updates:
        mapper = db.query(HandyColumnMapper).filter(HandyColumnMapper.id == update.id).first()
        if not mapper:
            raise HTTPException(status_code=404, detail=f"Column mapper with ID {update.id} not found")
        mapper.display_order = update.display_order
    
    db.commit()
    return {"message": "Column mapper display orders updated successfully"}

@router.post("/column-mapper/reset-all", summary="모든 컬럼 매퍼 초기화")
def reset_all_column_mappers(db: Session = Depends(get_db)):
    """모든 컬럼 매퍼의 활성화 상태를 비활성화하고 표시 순서를 0으로 초기화합니다."""
    
    db.query(HandyColumnMapper).update({
        HandyColumnMapper.is_active: False,
        HandyColumnMapper.display_order: 0
    })
    db.commit()
    
    return {"message": "All column mappers reset successfully"}

@router.post("/column-mapper/initialize-all", summary="전체 컬럼 매퍼 초기화")
def initialize_all_column_mappers(db: Session = Depends(get_db)):
    """d000~d149 모든 컬럼에 대한 매퍼를 초기화합니다."""
    
    # 기존 매퍼 모두 삭제
    db.query(HandyColumnMapper).delete()
    
    # d000~d149 컬럼 매퍼 생성
    for i in range(150):
        column_name = f"d{i:03d}"
        mapper = HandyColumnMapper(
            raw_column_name=column_name,
            mapped_column_name=f"Column {i+1}",
            description=f"Data column {column_name}",
            display_order=i,
            is_active=False  # 기본적으로 비활성화
        )
        db.add(mapper)
    
    db.commit()
    
    return {"message": "All column mappers initialized successfully"}

@router.get("/sample/{record_id}", summary="특정 로우 데이터 상세 조회")
def get_raw_data_detail(
    record_id: int,
    db: Session = Depends(get_db)
):
    """특정 ID의 로우 데이터 상세 정보를 조회합니다."""
    
    raw_data = db.query(HandyRawData).filter(HandyRawData.id == record_id).first()
    if not raw_data:
        raise HTTPException(status_code=404, detail="Raw data not found")
    
    # 모든 컬럼을 딕셔너리로 변환
    all_columns = {}
    for i in range(150):  # d000부터 d149까지
        column_name = f"d{i:03d}"
        column_value = getattr(raw_data, column_name, None)
        all_columns[column_name] = column_value
    
    return {
        "id": raw_data.id,
        "create_time": raw_data.create_time.isoformat() if raw_data.create_time else None,
        "all_columns": all_columns
    }