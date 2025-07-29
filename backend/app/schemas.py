from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional

class ProductBase(BaseModel):
    barcode: str
    model_name: Optional[str] = None
    line_info: Optional[str] = None
    timestamp: datetime  # created_at -> timestamp로 변경

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    id: int
    create_time: datetime
    measurements: List[CamMeasurement] = []

    class Config:
        from_attributes = True 