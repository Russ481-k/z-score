import pandas as pd
from typing import Tuple

def transform_data(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    정제된 데이터프레임을 Product와 CamMeasurement 테이블 형식에 맞게 변환합니다.
    """
    if df.empty or '바코드' not in df.columns:
        return pd.DataFrame(), pd.DataFrame()

    # '일시' 컬럼의 형식을 표준화 (YYYY-MM-DD HH:MM:SS)
    # 날짜와 시간 사이의 '_'를 공백으로 치환하여 다양한 형식을 지원
    if '일시' in df.columns:
        df['일시'] = df['일시'].str.replace('_', ' ', regex=False)

    # '일시' 컬럼을 datetime으로 변환, 실패 시 해당 행 제거
    df['created_at'] = pd.to_datetime(df['일시'], errors='coerce')
    df.dropna(subset=['created_at'], inplace=True)
    if df.empty:
        return pd.DataFrame(), pd.DataFrame()

    # Product 데이터 추출
    product_cols = {
        '바코드': 'barcode', '모델명': 'model_name', 'line_info': 'line_info',
        '최종위치': 'final_position', '압입력': 'final_press_force',
        '종합판정': 'result', 'created_at': 'created_at'
    }
    # 일부 컬럼이 없을 수 있으므로, 존재하는 컬럼만 선택
    product_cols_exist = {k: v for k, v in product_cols.items() if k in df.columns}
    products_df = df[list(product_cols_exist.keys())].rename(columns=product_cols_exist)
    
    if products_df.empty:
        return pd.DataFrame(), pd.DataFrame()

    # NaN 값을 None으로 변환 (DB에러 방지)
    products_df = products_df.where(pd.notna(products_df), None)
    
    # CamMeasurement 데이터 추출
    # CAM 관련 컬럼만 필터링
    measurement_cols = {col: col for col in df.columns if 'CAM' in col}
    if not measurement_cols:
        return products_df, pd.DataFrame()

    measurements_df = df[['바코드', 'created_at'] + list(measurement_cols.keys())]
    
    # Melt를 사용하여 데이터를 긴 형식으로 변환
    measurements_df = measurements_df.melt(
        id_vars=['바코드', 'created_at'],
        value_vars=list(measurement_cols.keys()),
        var_name='measurement_name',
        value_name='value'
    )
    
    measurements_df.rename(columns={'바코드': 'product_barcode'}, inplace=True)

    # NaN 값을 None으로 변환
    measurements_df = measurements_df.where(pd.notna(measurements_df), None)
    # 비어있는 value를 가진 행은 제거
    measurements_df.dropna(subset=['value'], inplace=True)

    return products_df, measurements_df 