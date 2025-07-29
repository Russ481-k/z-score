from sqlalchemy.orm import Session
from .. import models
from ..schemas import analysis as schemas_analysis
from typing import List, Optional
from datetime import datetime

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
        final_position=product.final_position,
        final_press_force=product.final_press_force,
        result=product.result,
        created_at=product.created_at
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

def get_analysis_history(
    db: Session,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    metric: str = "angle",
    cam_number: int = 1
):
    """
    지정된 기간과 캠 번호에 대한 분석 히스토리를 조회합니다.
    """
    query = db.query(models.analysis.DistributionAnalysis).filter(
        models.analysis.DistributionAnalysis.metric_type == metric,
        models.analysis.DistributionAnalysis.cam_number == cam_number
    )
    
    if start_date:
        start_datetime = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        query = query.filter(models.analysis.DistributionAnalysis.analyzed_at >= start_datetime)
    
    if end_date:
        end_datetime = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        query = query.filter(models.analysis.DistributionAnalysis.analyzed_at <= end_datetime)
    
    results = query.order_by(models.analysis.DistributionAnalysis.analyzed_at.desc()).limit(100).all()
    
    # 프론트엔드가 요구하는 형식으로 변환
    return [
        {
            "analyzed_at": result.analyzed_at.isoformat(),
            "predicted_ppm": result.predicted_ppm,
            "mean": result.mean,
            "std_dev": result.std_dev,
            "ppm_slope": result.ppm_slope
        }
        for result in results
    ]

def get_process_distribution(
    db: Session,
    metric: str = "angle"
):
    """
    지정된 측정 항목에 대한 캠별 분포 데이터를 조회합니다.
    """
    # 최신 분석 결과만 가져오기 위해 각 캠별로 최신 데이터 하나씩만 조회
    from sqlalchemy import func
    
    subquery = db.query(
        models.analysis.DistributionAnalysis.cam_number,
        func.max(models.analysis.DistributionAnalysis.analyzed_at).label('max_analyzed_at')
    ).filter(
        models.analysis.DistributionAnalysis.metric_type == metric
    ).group_by(models.analysis.DistributionAnalysis.cam_number).subquery()
    
    results = db.query(models.analysis.DistributionAnalysis).join(
        subquery,
        (models.analysis.DistributionAnalysis.cam_number == subquery.c.cam_number) &
        (models.analysis.DistributionAnalysis.analyzed_at == subquery.c.max_analyzed_at)
    ).filter(
        models.analysis.DistributionAnalysis.metric_type == metric
    ).all()
    
    # 프론트엔드가 요구하는 형식으로 변환
    return [
        {
            "cam_number": str(result.cam_number),
            "mean": result.mean,
            "std_dev": result.std_dev
        }
        for result in results
    ] 