from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    ForeignKey,
    Sequence,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..core.database import Base


# Oracle의 NUMBER 타입에 대한 기본 정밀도 이슈를 피하기 위해 Integer 사용
# 필요 시 Numeric 또는 Float 사용 가능

class Product(Base):
    __tablename__ = "HANDY_PRODUCTS"
    
    id = Column(Integer, Sequence("HANDY_PRODUCTS_SEQ"), primary_key=True)
    barcode = Column(String(255), unique=True, index=True, nullable=False)
    model_name = Column(String(255), index=True)
    line_info = Column(String(255))
    timestamp = Column(DateTime, nullable=False)
    create_time = Column(DateTime, server_default=func.now())

    measurements = relationship("CamMeasurement", back_populates="product")


class CamMeasurement(Base):
    __tablename__ = "HANDY_CAM_MEASUREMENTS"

    id = Column(Integer, Sequence("HANDY_CAM_MEASUREMENTS_SEQ"), primary_key=True)
    product_id = Column(Integer, ForeignKey("HANDY_PRODUCTS.id"), nullable=False)
    cam_number = Column(Integer, nullable=False)
    
    # 측정 항목들
    press_force_max = Column(Float)
    press_force_final = Column(Float)
    torque_value = Column(Float) # 'torque'는 예약어일 수 있어 'torque_value'로 변경
    angle_value = Column(Float)  # 'angle'은 예약어일 수 있어 'angle_value'로 변경
    allowance = Column(Float)
    
    # Z-Score
    torque_z_score = Column(Float)
    angle_z_score = Column(Float)

    # 생성 시각
    create_time = Column(DateTime, server_default=func.now())

    product = relationship("Product", back_populates="measurements")


class DistributionAnalysis(Base):
    __tablename__ = "HANDY_DISTR_ANALYSIS"

    id = Column(Integer, Sequence("HANDY_DISTR_ANALYSIS_SEQ"), primary_key=True)
    analyzed_at = Column(DateTime, default=func.now(), nullable=False)
    cam_number = Column(Integer, nullable=False)
    metric_type = Column(String(50), nullable=False)  # "torque" or "angle"
    
    # 분석 결과
    mean = Column(Float)
    std_dev = Column(Float)
    predicted_ppm = Column(Float)
    ppm_slope = Column(Float)

    create_time = Column(DateTime, server_default=func.now()) 