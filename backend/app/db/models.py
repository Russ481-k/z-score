from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    ForeignKey,
)
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime

Base = declarative_base()

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    barcode = Column(String(50), unique=True, nullable=False, index=True)
    model_name = Column(String(50))
    line_info = Column(String(50))
    final_position = Column(Float)
    final_press_force = Column(Float)
    result = Column(String(10))
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    measurements = relationship("CamMeasurement", back_populates="product")

class CamMeasurement(Base):
    __tablename__ = "cam_measurements"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    cam_number = Column(Integer, nullable=False)
    press_force_max = Column(Float)
    press_force_final = Column(Float)
    press_result = Column(String(10))
    torque = Column(Float)
    torque_result = Column(String(10))
    angle = Column(Float)
    angle_result = Column(String(10))
    angle_z_score = Column(Float, index=True)
    torque_z_score = Column(Float, index=True)

    product = relationship("Product", back_populates="measurements")

class DistributionAnalysis(Base):
    __tablename__ = "distribution_analysis"

    id = Column(Integer, primary_key=True, index=True)
    analyzed_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    cam_number = Column(Integer, nullable=False)
    target_metric = Column(String(20), nullable=False)
    mean = Column(Float)
    std_dev = Column(Float)
    predicted_ppm = Column(Float, index=True)
    ppm_slope = Column(Float)

class Alarm(Base):
    __tablename__ = "alarms"

    id = Column(Integer, primary_key=True, index=True)
    alarm_type = Column(String(50), nullable=False)
    level = Column(String(20), nullable=False)
    message = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    cam_number = Column(Integer, nullable=True) 