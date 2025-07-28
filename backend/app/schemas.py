from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional

class ProductBase(BaseModel):
    barcode: str
    model_name: str = Field(..., alias='modelName')
    line_info: str = Field(..., alias='lineInfo')
    final_position: float = Field(..., alias='finalPosition')
    final_press_force: float = Field(..., alias='finalPressForce')
    result: str
    created_at: datetime = Field(..., alias='createdAt')

    class Config:
        from_attributes = True
        validate_by_name = True

class Product(ProductBase):
    id: int

class ProductResponse(BaseModel):
    total: int
    items: List[Product]

class Measurement(BaseModel):
    cam_number: int = Field(..., alias='camNumber')
    press_force_max: float = Field(..., alias='pressForceMax')
    press_force_final: float = Field(..., alias='pressForceFinal')
    press_result: str = Field(..., alias='pressResult')
    torque: float
    torque_result: str = Field(..., alias='torqueResult')
    angle: float
    angle_result: str = Field(..., alias='angleResult')
    angle_z_score: Optional[float] = Field(None, alias='angleZScore')
    torque_z_score: Optional[float] = Field(None, alias='torqueZScore')

    class Config:
        from_attributes = True
        validate_by_name = True 