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
    barcode = Column(String(510), unique=True, index=True, nullable=False)  # VARCHAR2(510)
    model_name = Column(String(510), index=True)  # VARCHAR2(510)
    line_info = Column(String(510))  # VARCHAR2(510)
    timestamp = Column(DateTime, nullable=False)  # 실제 컬럼명은 TIMESTAMP
    create_time = Column(DateTime, server_default=func.now())

    measurements = relationship("CamMeasurement", back_populates="product")


class CamMeasurement(Base):
    __tablename__ = "HANDY_CAM_MEASUREMENTS"

    id = Column(Integer, Sequence("HANDY_CAM_MEASUREMENTS_SEQ"), primary_key=True)
    product_id = Column(Integer, ForeignKey("HANDY_PRODUCTS.id"), nullable=False)
    cam_number = Column(Integer, nullable=False)
    
    # 측정 항목들 (실제 Oracle 구조에 맞춤)
    press_force_max = Column(Float)
    press_force_final = Column(Float)
    torque_value = Column(Float)
    angle_value = Column(Float)
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
    metric_type = Column(String(100), nullable=False)  # VARCHAR2(100) - 실제 Oracle 구조
    
    # 분석 결과
    mean = Column(Float)
    std_dev = Column(Float)
    predicted_ppm = Column(Float)
    ppm_slope = Column(Float)

    create_time = Column(DateTime, server_default=func.now()) 