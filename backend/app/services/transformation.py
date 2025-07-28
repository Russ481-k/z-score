from sqlalchemy.orm import Session
from datetime import datetime
from typing import Dict, Any, List, Optional

from ..crud import analysis as crud_analysis
from ..schemas import analysis as schemas_analysis

def to_float_or_none(value: Any) -> Optional[float]:
    """
    주어진 값을 float으로 변환하려 시도하고, 실패하면 None을 반환합니다.
    'OK', 'NG' 같은 문자열이나 빈 문자열을 처리합니다.
    """
    if value is None:
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None

def transform_and_load_raw_data(db: Session, raw_data_row: Dict[str, Any], column_mapper: Dict[str, str]):
    """
    매핑된 단일 행의 원본 데이터를 받아 Product와 CamMeasurement로 변환 후 DB에 저장합니다.
    
    :param db: SQLAlchemy DB 세션
    :param raw_data_row: 'd000', 'd001'...을 key로 갖는 원본 데이터 한 행
    :param column_mapper: {'d000': 'barcode', ...} 형태의 컬럼 매퍼
    :return: 생성된 Product 객체 또는 이미 존재하는 경우 None
    """
    
    # --- 1. 원본 데이터(raw_data_row)를 사용하기 쉬운 mapped_data로 변환 ---
    mapped_data = {}
    for raw_col, mapped_col in column_mapper.items():
        if raw_col in raw_data_row:
            # 값이 없는 경우 None으로 처리
            mapped_data[mapped_col] = raw_data_row[raw_col]

    # --- 2. Product 정보 추출 및 중복 확인 ---
    barcode = mapped_data.get("barcode")
    if not barcode:
        # 바코드가 없는 데이터는 처리 불가
        return None
    
    # 이미 처리된 바코드인지 확인
    existing_product = crud_analysis.get_product_by_barcode(db, barcode=barcode)
    if existing_product:
        # 이미 존재하는 데이터면 건너뜀
        return None
        
    try:
        product_schema = schemas_analysis.ProductCreate(
            barcode=barcode,
            model_name=mapped_data.get("model_name"),
            line_info=mapped_data.get("line_info"),
            timestamp=datetime.strptime(mapped_data.get("timestamp"), '%Y-%m-%d %H:%M:%S')
        )
    except (ValueError, TypeError):
        # timestamp 파싱 실패 시 처리 중단
        return None
    
    # --- 3. 9개 CAM 측정 데이터 추출 ---
    measurements_to_create: List[schemas_analysis.CamMeasurementCreate] = []
    for i in range(1, 10): # CAM 1부터 9까지
        cam_data = {
            "cam_number": i,
            "press_force_max": to_float_or_none(mapped_data.get(f"cam{i}_press_force_max")),
            "press_force_final": to_float_or_none(mapped_data.get(f"cam{i}_press_force_final")),
            "torque_value": to_float_or_none(mapped_data.get(f"cam{i}_torque")),
            "angle_value": to_float_or_none(mapped_data.get(f"cam{i}_angle")),
            "allowance": to_float_or_none(mapped_data.get(f"cam{i}_allowance")),
        }
        
        # 모든 측정값이 비어있지 않은 경우에만 추가
        if any(v is not None for k, v in cam_data.items() if k != 'cam_number'):
             # Pydantic 모델로 변환 (데이터 타입 자동 변환 및 검증)
            measurements_to_create.append(schemas_analysis.CamMeasurementCreate(**cam_data))

    # --- 4. CRUD 함수를 호출하여 DB에 저장 ---
    if measurements_to_create:
        return crud_analysis.create_product_with_measurements(
            db=db,
            product=product_schema,
            measurements=measurements_to_create
        )
    
    return None 