import pandas as pd
from sqlalchemy.orm import Session
from ..db import models

def load_data_to_db(db: Session, products_df: pd.DataFrame, measurements_df: pd.DataFrame):
    """
    변환된 데이터프레임을 데이터베이스에 저장합니다.
    - 중복된 product 데이터는 건너뜁니다.
    - SQLAlchemy의 bulk_insert_mappings를 사용하여 대량 삽입을 수행합니다.
    - commit은 상위 호출자에서 처리해야 합니다.
    """
    if products_df.empty:
        return 0

    # 1. 중복되지 않은 새로운 Product 데이터만 필터링
    input_barcodes = products_df['barcode'].tolist()
    
    existing_barcodes_query = db.query(models.Product.barcode).filter(
        models.Product.barcode.in_(input_barcodes)
    ).all()
    existing_barcodes = {barcode for (barcode,) in existing_barcodes_query}

    new_products_df = products_df[~products_df['barcode'].isin(existing_barcodes)]

    if not new_products_df.empty:
        # 2. 새로운 Product 데이터를 DB에 저장 (Bulk Insert)
        new_products_records = new_products_df.to_dict(orient="records")
        db.bulk_insert_mappings(models.Product, new_products_records)
        db.flush()

    # 3. Product ID를 가져와서 Measurement 데이터프레임에 매핑
    all_products_in_db_query = db.query(models.Product.id, models.Product.barcode).filter(
        models.Product.barcode.in_(input_barcodes)
    ).all()
    product_id_map = {barcode: id for id, barcode in all_products_in_db_query}
    
    measurements_df['product_id'] = measurements_df['barcode'].map(product_id_map)

    # 4. Measurement 데이터를 DB에 저장 (Bulk Insert)
    measurements_to_load = measurements_df.dropna(subset=['product_id'])
    if not measurements_to_load.empty:
        measurements_records = measurements_to_load.to_dict(orient="records")
        db.bulk_insert_mappings(models.CamMeasurement, measurements_records)

    return len(new_products_df) 