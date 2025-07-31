from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text, func
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

class InfiniteScrollRequest(BaseModel):
    cursor: Optional[int] = None  # 마지막으로 받은 데이터의 ID
    limit: int = 50  # 한 번에 가져올 데이터 개수
    direction: str = "forward"  # forward(아래로) 또는 backward(위로)

class InfiniteScrollResponse(BaseModel):
    items: List[Dict[str, Any]]
    next_cursor: Optional[int] = None
    prev_cursor: Optional[int] = None
    has_more: bool = False
    total_count: Optional[int] = None
    column_mapping: Dict[str, str] = {}

class QueryRequest(BaseModel):
    sql_query: str
    model_name: Optional[str] = None
    date_range: Optional[Dict[str, str]] = None
    limit: Optional[int] = 1000

class ModelColumnMapping(BaseModel):
    model_name: str
    column_mappings: Dict[str, str]
    total_columns: int

class DynamicQueryResponse(BaseModel):
    items: List[Dict[str, Any]]
    column_definitions: List[Dict[str, str]]
    total_count: int
    model_info: Optional[Dict[str, Any]] = None

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

@router.get("/infinite-scroll", response_model=InfiniteScrollResponse, summary="무한스크롤용 매핑된 로우 데이터 조회")
def get_infinite_scroll_data(
    cursor: Optional[int] = Query(None, description="커서 (데이터 ID 또는 시작 행 번호)"),
    limit: int = Query(50, ge=10, le=200, description="가져올 데이터 개수"),
    direction: str = Query("forward", regex="^(forward|backward)$", description="스크롤 방향"),
    start_row: Optional[int] = Query(None, description="AG Grid 호환: 시작 행 번호"),
    db: Session = Depends(get_db)
):
    """
    무한스크롤을 위한 커서 기반 페이지네이션으로 매핑된 로우 데이터를 조회합니다.
    
    - cursor: 기준점이 되는 데이터 ID (None이면 처음부터)
    - limit: 한 번에 가져올 데이터 개수 (10-200)
    - direction: forward(아래로), backward(위로)
    """
    
    # 활성화된 컬럼 매퍼 조회
    column_mappers = db.query(HandyColumnMapper).filter(
        HandyColumnMapper.is_active == True
    ).order_by(
        HandyColumnMapper.display_order.asc(),
        HandyColumnMapper.id.asc()
    ).all()
    
    mapper_dict = {mapper.raw_column_name: mapper.mapped_column_name for mapper in column_mappers}
    
    # 전체 개수 (첫 요청시에만 필요)
    total_count = None
    if cursor is None and start_row is None:
        total_count = db.query(HandyRawData).count()
    
    # AG Grid 호환 모드 vs 커서 모드
    if start_row is not None:
        # AG Grid 모드: 오프셋 기반 페이지네이션
        query = db.query(HandyRawData).order_by(HandyRawData.id.desc())
        raw_data_list = query.offset(start_row).limit(limit + 1).all()
        
        has_more = len(raw_data_list) > limit
        if has_more:
            raw_data_list = raw_data_list[:limit]
            
    else:
        # 기존 커서 모드
        query = db.query(HandyRawData)
        
        if cursor is not None:
            if direction == "forward":
                # 아래로 스크롤: 커서보다 작은 ID (최신 순 정렬이므로)
                query = query.filter(HandyRawData.id < cursor)
            else:  # backward
                # 위로 스크롤: 커서보다 큰 ID
                query = query.filter(HandyRawData.id > cursor)
                query = query.order_by(HandyRawData.id.asc())  # 역순 정렬
        
        if direction == "forward" or cursor is None:
            query = query.order_by(HandyRawData.id.desc())
        
        # limit + 1개를 가져와서 has_more 판단
        raw_data_list = query.limit(limit + 1).all()
        
        has_more = len(raw_data_list) > limit
        if has_more:
            raw_data_list = raw_data_list[:limit]  # 실제로는 limit개만 반환
        
        # backward의 경우 원래 순서로 되돌리기
        if direction == "backward":
            raw_data_list = list(reversed(raw_data_list))
    
    # 결과 변환
    items = []
    for raw_data in raw_data_list:
        mapped_data = {"id": raw_data.id}  # ID는 항상 포함
        
        for mapper in column_mappers:
            raw_column_name = mapper.raw_column_name
            column_value = getattr(raw_data, raw_column_name, None)
            
            if column_value is not None:
                mapped_data[mapper.mapped_column_name] = column_value
        
        items.append(mapped_data)
    
    # 커서 설정
    next_cursor = None
    prev_cursor = None
    
    if items:
        next_cursor = items[-1]["id"] if has_more else None
        prev_cursor = items[0]["id"]
    
    return InfiniteScrollResponse(
        items=items,
        next_cursor=next_cursor,
        prev_cursor=prev_cursor,
        has_more=has_more,
        total_count=total_count,
        column_mapping=mapper_dict
    )

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
    if mapper_data.description is not None:
        mapper.description = mapper_data.description
    if mapper_data.display_order is not None:
        mapper.display_order = mapper_data.display_order
    if mapper_data.is_active is not None:
        mapper.is_active = mapper_data.is_active
    
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

@router.get("/models", summary="사용 가능한 모델 목록 조회")
def get_available_models(db: Session = Depends(get_db)):
    """Raw data에서 사용 가능한 모델 목록을 조회합니다."""
    try:
        # d001 컬럼에서 고유한 모델명 조회 (null이 아닌 값만)
        models = db.execute(
            text("SELECT DISTINCT d001 as model_name FROM HANDY_ZSCORE_RAW_DATA WHERE d001 IS NOT NULL ORDER BY d001")
        ).fetchall()
        
        model_list = [{"model_name": row.model_name, "display_name": row.model_name} for row in models]
        
        return {
            "total": len(model_list),
            "models": model_list
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch models: {str(e)}")

@router.get("/models/{model_name}/columns", response_model=ModelColumnMapping, summary="모델별 컬럼 매핑 조회")
def get_model_column_mapping(
    model_name: str,
    db: Session = Depends(get_db)
):
    """특정 모델에 대한 컬럼 매핑 정보를 조회합니다."""
    try:
        # 해당 모델의 샘플 데이터 조회 (1개만)
        sample_data = db.execute(
            text("SELECT * FROM HANDY_ZSCORE_RAW_DATA WHERE d001 = :model_name AND ROWNUM = 1"),
            {"model_name": model_name}
        ).fetchone()
        
        if not sample_data:
            raise HTTPException(status_code=404, detail=f"Model '{model_name}' not found")
        
        # 활성화된 컬럼 매퍼 조회
        column_mappers = db.query(HandyColumnMapper).filter(
            HandyColumnMapper.is_active == True
        ).order_by(
            HandyColumnMapper.display_order.asc(),
            HandyColumnMapper.id.asc()
        ).all()
        
        # 모델별 특화 매핑 (캠 위상각 데이터 기준)
        model_specific_mappings = {}
        
        # 기본 매핑 적용
        for mapper in column_mappers:
            raw_col = mapper.raw_column_name
            if hasattr(sample_data, raw_col):
                col_value = getattr(sample_data, raw_col, None)
                if col_value is not None and str(col_value).strip():
                    model_specific_mappings[raw_col] = mapper.mapped_column_name
        
        # 모델별 특화 처리 (제공된 표 기준)
        if "ATKINSON" in model_name.upper():
            # ATKINSON 모델의 경우 캠 위상각 특화 매핑
            cam_angle_mappings = {
                "d010": "Cam_Phase_Angle_1",  # 캠 위상각#1 - 52.08°
                "d011": "Cam_Phase_Angle_2",  # 캠 위상각#2 - 52.08°
                "d012": "Cam_Phase_Angle_3",  # 캠 위상각#3 - 172.08°
                "d013": "Cam_Phase_Angle_4",  # 캠 위상각#4 - 172.08°
                "d014": "Cam_Phase_Angle_5",  # 캠 위상각#5 - 292.08°
                "d015": "Cam_Phase_Angle_6",  # 캠 위상각#6 - 292.08°
            }
            
            # 샘플 데이터에서 실제 값이 있는 컬럼만 추가
            for raw_col, mapped_name in cam_angle_mappings.items():
                if hasattr(sample_data, raw_col):
                    col_value = getattr(sample_data, raw_col, None)
                    if col_value is not None and str(col_value).strip():
                        model_specific_mappings[raw_col] = mapped_name
        
        return ModelColumnMapping(
            model_name=model_name,
            column_mappings=model_specific_mappings,
            total_columns=len(model_specific_mappings)
        )
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to fetch column mapping: {str(e)}")

@router.post("/query", response_model=DynamicQueryResponse, summary="동적 쿼리 기반 Raw Data 조회")
def query_raw_data(
    request: QueryRequest,
    db: Session = Depends(get_db)
):
    """사용자 정의 쿼리로 Raw Data를 조회합니다."""
    try:
        # 기본 쿼리 안전성 검사
        sql_lower = request.sql_query.lower().strip()
        
        # 위험한 키워드 검사
        dangerous_keywords = ["drop", "delete", "update", "insert", "alter", "truncate", "create"]
        if any(keyword in sql_lower for keyword in dangerous_keywords):
            raise HTTPException(status_code=400, detail="Only SELECT queries are allowed")
        
        if not sql_lower.startswith("select"):
            raise HTTPException(status_code=400, detail="Query must start with SELECT")
        
        # 모델명이 지정된 경우 WHERE 조건 추가
        base_query = request.sql_query
        if request.model_name:
            if "where" in sql_lower:
                base_query += f" AND d001 = '{request.model_name}'"
            else:
                base_query += f" WHERE d001 = '{request.model_name}'"
        
        # 날짜 범위가 지정된 경우 추가
        if request.date_range:
            start_date = request.date_range.get("start_date")
            end_date = request.date_range.get("end_date")
            if start_date and end_date:
                if "where" in base_query.lower():
                    base_query += f" AND create_time BETWEEN '{start_date}' AND '{end_date}'"
                else:
                    base_query += f" WHERE create_time BETWEEN '{start_date}' AND '{end_date}'"
        
        # LIMIT 추가
        if "limit" not in sql_lower and "rownum" not in sql_lower:
            limit = min(request.limit or 1000, 5000)  # 최대 5000개로 제한
            base_query = f"SELECT * FROM ({base_query}) WHERE ROWNUM <= {limit}"
        
        # 쿼리 실행
        result = db.execute(text(base_query))
        rows = result.fetchall()
        columns = result.keys()
        
        # 결과를 딕셔너리 리스트로 변환
        items = []
        for row_idx, row in enumerate(rows):
            item = {}
            has_id = False
            
            for i, col_name in enumerate(columns):
                value = row[i]
                if col_name.lower() == 'id':
                    has_id = True
                    item['id'] = value if value is not None else f"query_row_{row_idx}"
                elif value is not None:
                    item[col_name] = str(value)
                else:
                    item[col_name] = None
            
            # id 컬럼이 없는 경우 고유 ID 생성
            if not has_id:
                item['id'] = f"query_row_{row_idx}"
                
            items.append(item)
        
        # 컬럼 정의 생성
        column_definitions = []
        for col_name in columns:
            # 컬럼 매퍼에서 매핑된 이름 찾기
            mapper = db.query(HandyColumnMapper).filter(
                HandyColumnMapper.raw_column_name == col_name.lower(),
                HandyColumnMapper.is_active == True
            ).first()
            
            display_name = mapper.mapped_column_name if mapper else col_name
            
            column_definitions.append({
                "field": col_name,
                "headerName": display_name,
                "raw_column": col_name.lower()
            })
        
        # 모델 정보 (모델명이 지정된 경우)
        model_info = None
        if request.model_name:
            model_info = {
                "model_name": request.model_name,
                "query_applied": True
            }
        
        return DynamicQueryResponse(
            items=items,
            column_definitions=column_definitions,
            total_count=len(items),
            model_info=model_info
        )
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Query execution failed: {str(e)}")

@router.get("/models/{model_name}/data", summary="모델별 데이터 조회")
def get_model_data(
    model_name: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=1000),
    date_from: Optional[str] = Query(None, description="시작 날짜 (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="종료 날짜 (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """특정 모델의 데이터를 조회합니다."""
    try:
        # 기본 쿼리
        base_query = "SELECT * FROM HANDY_ZSCORE_RAW_DATA WHERE d001 = :model_name"
        params = {"model_name": model_name}
        
        # 날짜 필터 추가
        if date_from and date_to:
            base_query += " AND create_time BETWEEN :date_from AND :date_to"
            params["date_from"] = date_from
            params["date_to"] = date_to
        elif date_from:
            base_query += " AND create_time >= :date_from"
            params["date_from"] = date_from
        elif date_to:
            base_query += " AND create_time <= :date_to"
            params["date_to"] = date_to
        
        # 총 개수 조회
        count_query = f"SELECT COUNT(*) as total FROM ({base_query})"
        total_result = db.execute(text(count_query), params)
        total = total_result.fetchone().total
        
        # 페이징된 데이터 조회
        paginated_query = f"""
        SELECT * FROM (
            SELECT ROW_NUMBER() OVER (ORDER BY id DESC) as rn, t.* 
            FROM ({base_query}) t
        ) WHERE rn > :skip AND rn <= :end_row
        """
        
        params["skip"] = skip
        params["end_row"] = skip + limit
        
        result = db.execute(text(paginated_query), params)
        rows = result.fetchall()
        columns = result.keys()
        
        # 모델별 컬럼 매핑 가져오기
        model_mapping = get_model_column_mapping(model_name, db)
        
        # 결과 변환
        items = []
        for row in rows:
            item = {}
            # 먼저 id 필드 확인 및 추가
            if hasattr(row, 'id') and row.id is not None:
                item['id'] = row.id
            
            for i, col_name in enumerate(columns):
                # id 필드는 별도 처리했으므로 여기서는 매핑된 컬럼만 처리
                if col_name.lower() == 'id':
                    if 'id' not in item:  # 위에서 추가되지 않은 경우만
                        item['id'] = row[i]
                elif col_name.lower() in model_mapping.column_mappings:
                    mapped_name = model_mapping.column_mappings[col_name.lower()]
                    value = row[i]
                    if value is not None:
                        item[mapped_name] = str(value)
            
            # id가 여전히 없는 경우 인덱스로 생성
            if 'id' not in item:
                item['id'] = f"model_row_{len(items)}"
                
            items.append(item)
        
        return {
            "total": total,
            "items": items,
            "model_name": model_name,
            "column_mapping": model_mapping.column_mappings
        }
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to fetch model data: {str(e)}")