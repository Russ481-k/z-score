from sqlalchemy.orm import Session
from .. import models
from ..schemas import analysis as schemas_analysis
from typing import List

def get_product_by_barcode(db: Session, barcode: str):
    """
    바코드를 이용해 특정 제품 정보를 조회합니다.
    """
    return db.query(models.analysis.Product).filter(models.analysis.Product.barcode == barcode).first()

def create_product_with_measurements(db: Session, product: schemas_analysis.ProductCreate, measurements: List[schemas_analysis.CamMeasurementCreate]):
    """
    하나의 제품 정보와 여러 개의 캠 측정 데이터를 함께 DB에 저장합니다.
    """
    # 1. Product 객체 생성
    db_product = models.analysis.Product(
        barcode=product.barcode,
        model_name=product.model_name,
        line_info=product.line_info,
        timestamp=product.timestamp
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product) # 생성된 Product의 id 값을 가져오기 위해 refresh

    # 2. CamMeasurement 객체들 생성 및 연결
    db_measurements = []
    for measurement_data in measurements:
        db_measurement = models.analysis.CamMeasurement(
            **measurement_data.dict(),
            product_id=db_product.id  # 위에서 생성된 Product의 id를 외래 키로 사용
        )
        db_measurements.append(db_measurement)
    
    db.bulk_save_objects(db_measurements) # 여러 객체를 한 번에 저장
    db.commit()
    
    # 생성된 전체 Product 정보를 반환 (measurements 포함)
    db.refresh(db_product)
    return db_product 