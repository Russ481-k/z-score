from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

# --- Measurement Schemas ---

class CamMeasurementBase(BaseModel):
    cam_number: int
    press_force_max: Optional[float] = None
    press_force_final: Optional[float] = None
    torque_value: Optional[float] = None
    angle_value: Optional[float] = None
    allowance: Optional[float] = None
    torque_z_score: Optional[float] = None
    angle_z_score: Optional[float] = None

class CamMeasurementCreate(CamMeasurementBase):
    pass

class CamMeasurement(CamMeasurementBase):
    id: int
    product_id: int
    create_time: datetime

    class Config:
        from_attributes = True


# --- Product Schemas ---

class ProductBase(BaseModel):
    barcode: str
    model_name: Optional[str] = None
    line_info: Optional[str] = None
    timestamp: datetime

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    id: int
    create_time: datetime
    measurements: List[CamMeasurement] = []

    class Config:
        from_attributes = True 