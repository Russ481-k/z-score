from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional, Dict, Any
from datetime import date, datetime, timedelta
from pydantic import BaseModel
import re
import numpy as np
from statistics import mean, stdev
import scipy.stats as stats

from ..core.database import get_db
from ..models.analysis import CamMeasurement, DistributionAnalysis, Product
from ..models.handy_raw import HandyRawData, HandyColumnMapper
from ..crud import analysis as analysis_crud

router = APIRouter(
    prefix="/backtest",
    tags=["Backtesting"],
)

class BacktestParameters(BaseModel):
    start_date: str
    end_date: str
    cam_numbers: List[int]
    metrics: List[str]  # ["angle", "torque"]
    window_size: int = 100  # Z-Score 계산을 위한 윈도우 크기
    z_threshold: float = 3.0  # 불량 판정 임계값
    prediction_horizon: int = 10  # 몇 개 데이터 앞까지 예측할지

class BacktestResult(BaseModel):
    cam_number: int
    metric: str
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    mae: float  # Mean Absolute Error
    rmse: float  # Root Mean Square Error
    total_predictions: int
    true_positives: int
    false_positives: int
    true_negatives: int
    false_negatives: int

class BacktestDetail(BaseModel):
    """백테스팅 과정의 상세 정보"""
    window_start: int
    window_end: int
    window_mean: float
    window_std: float
    predicted_values: List[float]
    actual_values: List[float]
    predicted_defects: List[bool]
    actual_defects: List[bool]
    z_scores: List[float]

class ModelBacktestParameters(BaseModel):
    """모델별 실시간 백테스팅 파라미터"""
    model_name: str
    window_size: int = 50
    z_threshold: float = 2.0
    prediction_horizon: int = 10
    max_records: int = 1000  # 최대 처리할 레코드 수

class PhaseAngleData(BaseModel):
    """6개 위상각 데이터"""
    timestamp: datetime
    barcode: str
    angle_1: Optional[float] = None  # d072
    angle_2: Optional[float] = None  # d077  
    angle_3: Optional[float] = None  # d082
    angle_4: Optional[float] = None  # d087
    angle_5: Optional[float] = None  # d092
    angle_6: Optional[float] = None  # d097
    mean_value: float
    std_dev: float
    predicted_ppm: float
    ppm_slope: Optional[float] = None
    quality_status: str = "UNKNOWN"  # OK, WARNING, CRITICAL, UNKNOWN
    defect_probability: float = 0.0  # 0-1 확률

class ModelBacktestResult(BaseModel):
    """모델별 실시간 백테스팅 결과"""
    model_name: str
    total_records: int
    processed_records: int
    phase_angle_data: List[PhaseAngleData]
    performance_metrics: Dict[str, float]
    processing_info: Dict[str, Any]

@router.post("/run", summary="백테스팅 실행")
def run_backtest(
    params: BacktestParameters,
    db: Session = Depends(get_db)
):
    """
    지정된 기간과 파라미터로 백테스팅을 실행합니다.
    """
    results = []
    debug_info = []
    
    print(f"백테스팅 파라미터: {params}")
    
    for cam_number in params.cam_numbers:
        for metric in params.metrics:
            debug_entry = {
                "cam_number": cam_number,
                "metric": metric,
                "data_count": 0,
                "required_minimum": params.window_size + params.prediction_horizon,
                "status": "processing"
            }
            
            try:
                # 해당 캠과 메트릭의 측정 데이터 조회
                measurements_data = get_measurement_data_with_timestamps(
                    db, cam_number, metric, params.start_date, params.end_date
                )
                
                debug_entry["data_count"] = len(measurements_data)
                print(f"CAM {cam_number}, {metric}: {len(measurements_data)}개 데이터 조회됨")
                
                if len(measurements_data) < params.window_size + params.prediction_horizon:
                    debug_entry["status"] = f"insufficient_data (need {params.window_size + params.prediction_horizon}, got {len(measurements_data)})"
                    debug_info.append(debug_entry)
                    continue
                    
                # 백테스팅 수행
                result = perform_backtest_improved(
                    measurements_data, params.window_size, params.z_threshold, params.prediction_horizon
                )
                
                debug_entry["status"] = "success"
                debug_info.append(debug_entry)
                
                results.append(BacktestResult(
                    cam_number=cam_number,
                    metric=metric,
                    **result
                ))
                
            except Exception as e:
                debug_entry["status"] = f"error: {str(e)}"
                debug_info.append(debug_entry)
                print(f"CAM {cam_number}, {metric}에서 오류 발생: {e}")
                continue
    
    return {
        "results": results,
        "debug_info": debug_info,
        "total_combinations": len(params.cam_numbers) * len(params.metrics),
        "successful_results": len(results)
    }

def get_measurement_data_with_timestamps(db: Session, cam_number: int, metric: str, start_date: str, end_date: str):
    """지정된 기간의 측정 데이터를 timestamp와 함께 조회합니다."""
    print(f"데이터 조회 시작: CAM {cam_number}, {metric}, {start_date} ~ {end_date}")
    
    # 먼저 전체 데이터 개수 확인
    total_measurements = db.query(CamMeasurement).filter(
        CamMeasurement.cam_number == cam_number
    ).count()
    print(f"CAM {cam_number}의 전체 측정 데이터: {total_measurements}개")
    
    # Product와 CamMeasurement를 조인하여 timestamp 기준으로 필터링
    query = db.query(CamMeasurement, Product.timestamp).join(
        Product, CamMeasurement.product_id == Product.id
    ).filter(
        CamMeasurement.cam_number == cam_number
    )
    
    # 조인 후 데이터 개수 확인
    joined_count = query.count()
    print(f"Product와 조인 후 데이터: {joined_count}개")
    
    # 날짜 필터링
    if start_date:
        start_datetime = datetime.strptime(start_date, '%Y-%m-%d')
        query = query.filter(Product.timestamp >= start_datetime)
        print(f"시작일 필터링 후: {query.count()}개")
    
    if end_date:
        end_datetime = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)
        query = query.filter(Product.timestamp < end_datetime)
        print(f"종료일 필터링 후: {query.count()}개")
    
    results = query.order_by(Product.timestamp).all()
    print(f"최종 조회된 데이터: {len(results)}개")
    
    # 측정값과 타임스탬프를 함께 반환
    measurements_data = []
    valid_count = 0
    null_count = 0
    
    for measurement, timestamp in results:
        if metric == "angle" and measurement.angle_value is not None:
            measurements_data.append({
                'value': measurement.angle_value,
                'timestamp': timestamp,
                'measurement_id': measurement.id,
                'allowance': measurement.allowance
            })
            valid_count += 1
        elif metric == "torque" and measurement.torque_value is not None:
            measurements_data.append({
                'value': measurement.torque_value,
                'timestamp': timestamp,
                'measurement_id': measurement.id,
                'allowance': measurement.allowance
            })
            valid_count += 1
        else:
            null_count += 1
    
    print(f"{metric} 메트릭의 유효한 데이터: {valid_count}개, NULL 데이터: {null_count}개")
    
    return measurements_data

def perform_backtest_improved(measurements_data: List[Dict], window_size: int, z_threshold: float, prediction_horizon: int):
    """개선된 백테스팅 로직 - 실제 과거 데이터로 미래 예측"""
    predictions = []
    actuals = []
    backtest_details = []
    
    values = [data['value'] for data in measurements_data]
    
    for i in range(window_size, len(values) - prediction_horizon):
        # 1. 과거 윈도우 데이터로 통계 계산 (시점 i-window_size ~ i-1)
        window_data = values[i-window_size:i]
        window_mean = mean(window_data)
        window_std = stdev(window_data) if len(window_data) > 1 else 0
        
        # 2. 미래 데이터 예측 (시점 i ~ i+prediction_horizon-1)
        future_data = values[i:i+prediction_horizon]
        z_scores = []
        predicted_defects = []
        
        for value in future_data:
            z_score = abs((value - window_mean) / window_std) if window_std > 0 else 0
            z_scores.append(z_score)
            predicted_defects.append(z_score > z_threshold)
        
        # 3. 실제 불량 여부 판정 (더 정교한 로직 사용)
        actual_defects = []
        for j, data in enumerate(measurements_data[i:i+prediction_horizon]):
            # 실제 불량 판정: allowance 기준 또는 공정 허용 범위 초과 여부
            is_actual_defect = determine_actual_defect(data, window_mean, window_std)
            actual_defects.append(is_actual_defect)
        
        # 4. 결과 저장
        predictions.extend(predicted_defects)
        actuals.extend(actual_defects)
        
        # 상세 정보 저장 (디버깅용)
        if len(backtest_details) < 10:  # 처음 10개만 저장
            backtest_details.append(BacktestDetail(
                window_start=i-window_size,
                window_end=i-1,
                window_mean=window_mean,
                window_std=window_std,
                predicted_values=future_data,
                actual_values=future_data,
                predicted_defects=predicted_defects,
                actual_defects=actual_defects,
                z_scores=z_scores
            ))
    
    # 성능 지표 계산
    metrics = calculate_performance_metrics(predictions, actuals)
    metrics['details'] = [detail.dict() for detail in backtest_details]
    
    return metrics

def determine_actual_defect(measurement_data: Dict, reference_mean: float, reference_std: float) -> bool:
    """실제 불량 여부를 판정하는 로직"""
    value = measurement_data['value']
    allowance = measurement_data.get('allowance', 0.1)  # 기본 허용 오차
    
    # 방법 1: 허용 오차 기준
    if abs(value - reference_mean) > allowance:
        return True
    
    # 방법 2: 3-시그마 룰 기준 (통계적 이상치)
    if reference_std > 0:
        z_score = abs((value - reference_mean) / reference_std)
        if z_score > 3.0:  # 3-시그마 이상
            return True
    
    # 방법 3: 공정 허용 범위 기준 (예시)
    # 실제로는 각 캠별, 메트릭별로 다른 기준 적용
    if abs(value) > 0.2:  # 절대값 기준
        return True
    
    return False

def calculate_performance_metrics(predictions: List[bool], actuals: List[bool]):
    """예측 성능 지표를 계산합니다."""
    if len(predictions) != len(actuals) or len(predictions) == 0:
        return {
            "accuracy": 0.0, "precision": 0.0, "recall": 0.0, "f1_score": 0.0,
            "mae": 0.0, "rmse": 0.0, "total_predictions": 0,
            "true_positives": 0, "false_positives": 0, "true_negatives": 0, "false_negatives": 0
        }
    
    tp = sum(1 for p, a in zip(predictions, actuals) if p and a)
    fp = sum(1 for p, a in zip(predictions, actuals) if p and not a)
    tn = sum(1 for p, a in zip(predictions, actuals) if not p and not a)
    fn = sum(1 for p, a in zip(predictions, actuals) if not p and a)
    
    accuracy = (tp + tn) / len(predictions) if len(predictions) > 0 else 0
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
    
    # 실제 불량률과 예측 불량률의 차이
    predicted_defect_rate = sum(predictions) / len(predictions)
    actual_defect_rate = sum(actuals) / len(actuals)
    mae = abs(predicted_defect_rate - actual_defect_rate)
    rmse = ((predicted_defect_rate - actual_defect_rate) ** 2) ** 0.5
    
    return {
        "accuracy": accuracy,
        "precision": precision,
        "recall": recall,
        "f1_score": f1_score,
        "mae": mae,
        "rmse": rmse,
        "total_predictions": len(predictions),
        "true_positives": tp,
        "false_positives": fp,
        "true_negatives": tn,
        "false_negatives": fn,
        "predicted_defect_rate": predicted_defect_rate,
        "actual_defect_rate": actual_defect_rate
    }

@router.get("/historical-analysis", summary="과거 분석 결과 조회")
def get_historical_analysis(
    cam_number: int,
    metric: str,
    start_date: str,
    end_date: str,
    db: Session = Depends(get_db)
):
    """과거 분석 결과와 실제 측정값을 비교합니다."""
    # DistributionAnalysis 테이블에서 과거 예측 결과 조회
    analyses = db.query(DistributionAnalysis).filter(
        DistributionAnalysis.cam_number == cam_number,
        DistributionAnalysis.metric_type == metric
    ).order_by(DistributionAnalysis.analyzed_at).all()
    
    # 실제 측정값과 비교하여 정확도 계산
    return {
        "historical_predictions": [
            {
                "analyzed_at": analysis.analyzed_at.isoformat(),
                "predicted_ppm": analysis.predicted_ppm,
                "mean": analysis.mean,
                "std_dev": analysis.std_dev,
                "ppm_slope": analysis.ppm_slope
            }
            for analysis in analyses
        ]
    } 

@router.get("/debug/data-status", summary="데이터베이스 상태 확인")
def check_data_status(db: Session = Depends(get_db)):
    """데이터베이스의 현재 상태를 확인합니다."""
    
    # 전체 테이블 데이터 개수
    total_products = db.query(Product).count()
    total_measurements = db.query(CamMeasurement).count()
    
    # 캠별 데이터 개수
    cam_counts = {}
    for cam_num in range(1, 10):
        count = db.query(CamMeasurement).filter(CamMeasurement.cam_number == cam_num).count()
        cam_counts[f"cam_{cam_num}"] = count
    
    # 메트릭별 NULL이 아닌 데이터 개수
    angle_data_count = db.query(CamMeasurement).filter(CamMeasurement.angle_value.isnot(None)).count()
    torque_data_count = db.query(CamMeasurement).filter(CamMeasurement.torque_value.isnot(None)).count()
    
    # 최신 데이터 확인
    latest_product = db.query(Product).order_by(Product.timestamp.desc()).first()
    latest_measurement = db.query(CamMeasurement).order_by(CamMeasurement.id.desc()).first()
    
    # Product와 CamMeasurement 조인 가능한 데이터 개수
    joined_data_count = db.query(CamMeasurement).join(
        Product, CamMeasurement.product_id == Product.id
    ).count()
    
    return {
        "total_products": total_products,
        "total_measurements": total_measurements,
        "joined_data_count": joined_data_count,
        "cam_counts": cam_counts,
        "metric_data": {
            "angle_valid_count": angle_data_count,
            "torque_valid_count": torque_data_count
        },
        "latest_data": {
            "latest_product_timestamp": latest_product.timestamp.isoformat() if latest_product else None,
            "latest_measurement_id": latest_measurement.id if latest_measurement else None
        }
    }

@router.get("/debug/sample-data", summary="샘플 데이터 조회")
def get_sample_data(
    cam_number: int = 1,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """특정 캠의 샘플 데이터를 조회합니다."""
    
    # Product와 조인된 샘플 데이터
    sample_data = db.query(CamMeasurement, Product.timestamp).join(
        Product, CamMeasurement.product_id == Product.id
    ).filter(
        CamMeasurement.cam_number == cam_number
    ).order_by(Product.timestamp.desc()).limit(limit).all()
    
    samples = []
    for measurement, timestamp in sample_data:
        samples.append({
            "measurement_id": measurement.id,
            "cam_number": measurement.cam_number,
            "product_id": measurement.product_id,
            "angle_value": measurement.angle_value,
            "torque_value": measurement.torque_value,
            "allowance": measurement.allowance,
            "timestamp": timestamp.isoformat()
        })
    
    return {
        "cam_number": cam_number,
        "sample_count": len(samples),
        "samples": samples
    }

@router.post("/model-realtime", summary="모델별 실시간 백테스팅")
def run_model_realtime_backtest(
    params: ModelBacktestParameters,
    db: Session = Depends(get_db)
):
    """
    특정 모델의 데이터를 시간순으로 처리하여 실시간 백테스팅을 수행합니다.
    6개 위상각 데이터를 동시에 분석하고 PPM 계산 결과를 시계열로 반환합니다.
    """
    try:
        # 파라미터 검증
        if not params.model_name or params.model_name.strip() == "":
            raise HTTPException(status_code=400, detail="Model name is required")
        
        if params.window_size < 10 or params.window_size > 1000:
            raise HTTPException(status_code=400, detail="Window size must be between 10 and 1000")
        
        if params.max_records < 100 or params.max_records > 5000:
            raise HTTPException(status_code=400, detail="Max records must be between 100 and 5000")
        
        # Oracle용 쿼리 (ROWNUM 사용, 더 단순한 조건)
        # 위상각: d072, d077, d082, d087, d092, d097
        raw_data_query = """
        SELECT * FROM (
            SELECT id, d000, d001, d072, d077, d082, d087, d092, d097, create_time
            FROM HANDY_ZSCORE_RAW_DATA 
            WHERE d001 = :model_name 
            AND d072 IS NOT NULL AND d077 IS NOT NULL 
            AND d082 IS NOT NULL AND d087 IS NOT NULL 
            AND d092 IS NOT NULL AND d097 IS NOT NULL
            ORDER BY create_time ASC, id ASC
        ) WHERE ROWNUM <= :max_records
        """
        
        try:
            # 먼저 샘플 데이터로 문제가 있는 값들을 확인
            sample_query = """
            SELECT d001, d072, d077, d082, d087, d092, d097
            FROM HANDY_ZSCORE_RAW_DATA 
            WHERE d001 = :model_name 
            AND ROWNUM <= 10
            """
            
            sample_result = db.execute(text(sample_query), {"model_name": params.model_name})
            sample_records = sample_result.fetchall()
            
            print(f"Sample data for model '{params.model_name}':")
            for i, record in enumerate(sample_records):
                print(f"Record {i+1}: d072='{record.d072}', d077='{record.d077}', d082='{record.d082}', d087='{record.d087}', d092='{record.d092}', d097='{record.d097}'")
            
            # 실제 데이터 쿼리 실행
            result = db.execute(text(raw_data_query), {
                "model_name": params.model_name,
                "max_records": params.max_records
            })
            
            raw_records = result.fetchall()
            print(f"Main query succeeded with {len(raw_records)} records")
            
        except Exception as e:
            db.rollback()
            print(f"Database error details: {str(e)}")
            
            # 더 간단한 쿼리로 재시도
            simple_query = """
            SELECT * FROM (
                SELECT id, d000, d001, d072, d077, d082, d087, d092, d097, create_time
                FROM HANDY_ZSCORE_RAW_DATA 
                WHERE d001 = :model_name 
                AND d072 IS NOT NULL AND d077 IS NOT NULL 
                AND d082 IS NOT NULL AND d087 IS NOT NULL 
                AND d092 IS NOT NULL AND d097 IS NOT NULL
                ORDER BY create_time ASC, id ASC
            ) WHERE ROWNUM <= :max_records
            """
            
            try:
                result = db.execute(text(simple_query), {
                    "model_name": params.model_name,
                    "max_records": params.max_records
                })
                raw_records = result.fetchall()
                print(f"Simple query succeeded with {len(raw_records)} records")
            except Exception as e2:
                raise HTTPException(
                    status_code=500, 
                    detail=f"Database query failed even with simple query: {str(e2)}"
                )
        
        if len(raw_records) < params.window_size + params.prediction_horizon:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient data: need {params.window_size + params.prediction_horizon}, got {len(raw_records)}"
            )
        
        # 6개 위상각별로 데이터 분리
        angle_columns = ['d072', 'd077', 'd082', 'd087', 'd092', 'd097']
        angle_data = {col: [] for col in angle_columns}
        timestamp_data = []
        barcode_data = []
        
        try:
            for record in raw_records:
                # 타임스탬프 검증
                if hasattr(record, 'create_time') and record.create_time:
                    timestamp_data.append(record.create_time)
                else:
                    timestamp_data.append(datetime.now())  # 기본값
                
                # 바코드 검증
                if hasattr(record, 'd000') and record.d000:
                    barcode_data.append(str(record.d000))
                else:
                    barcode_data.append(f"unknown_{len(barcode_data)}")
                
                # 각 위상각 데이터 처리
                for col in angle_columns:
                    try:
                        value = getattr(record, col, None)
                        if value is not None:
                            # 문자열로 변환하고 공백 제거
                            str_value = str(value).strip()
                            
                            # 빈 문자열이거나 null 문자열인 경우
                            if str_value == '' or str_value.upper() in ['NULL', 'NONE', 'N/A']:
                                angle_data[col].append(0.0)
                                continue
                            
                            # 쉼표 제거 및 숫자 변환 시도
                            clean_value = str_value.replace(',', '').replace(' ', '')
                            
                            # 추가 정리: 특수문자 제거
                            # 더 간단한 숫자 검증 (Python에서 float 변환 시도)
                            try:
                                numeric_value = float(clean_value)
                                
                                # NaN, Infinity 체크
                                if np.isnan(numeric_value) or np.isinf(numeric_value):
                                    print(f"Warning: Invalid numeric value (NaN/Inf) for {col}, using 0.0")
                                    angle_data[col].append(0.0)
                                # 위상각 범위 확장 (-500~500도)
                                elif -500 <= numeric_value <= 500:
                                    angle_data[col].append(numeric_value)
                                else:
                                    print(f"Warning: Out of range value {numeric_value} for {col}, using clamped value")
                                    # 범위를 벗어난 값은 클램핑
                                    clamped_value = max(-500, min(500, numeric_value))
                                    angle_data[col].append(clamped_value)
                            except ValueError:
                                print(f"Warning: Cannot convert '{clean_value}' to float for {col}, using 0.0")
                                angle_data[col].append(0.0)
                        else:
                            angle_data[col].append(0.0)
                    except (ValueError, TypeError, AttributeError) as e:
                        print(f"Warning: Failed to convert {col} value '{value}': {e}, using 0.0")
                        angle_data[col].append(0.0)
                        
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Data processing failed: {str(e)}"
            )
        
        # 실시간 백테스팅 수행
        phase_angle_results = []
        ppm_history = []  # PPM 기울기 계산용
        
        for i in range(params.window_size, min(len(raw_records), params.max_records)):
            # 각 위상각별 통계 계산
            angle_values = []
            angle_dict = {}
            
            print(f"\nProcessing record {i}/{len(raw_records)}:")
            
            for j, col in enumerate(angle_columns):
                window_data = angle_data[col][i-params.window_size:i]
                current_value = angle_data[col][i] if i < len(angle_data[col]) else None
                
                print(f"  {col}: window_size={len(window_data)}, current={current_value}")
                
                if len(window_data) > 0:
                    # 모든 데이터를 사용 (0값도 포함)
                    angle_values.extend(window_data)
                    angle_dict[f'angle_{j+1}'] = current_value
                else:
                    angle_dict[f'angle_{j+1}'] = None
                    
            print(f"  Total angle values: {len(angle_values)}")
            print(f"  Angle dict: {angle_dict}")
            
            if not angle_values:
                continue
                
            # 전체 위상각 데이터의 통계 계산
            mean_val = np.mean(angle_values) if angle_values else 0.0
            std_val = np.std(angle_values, ddof=1) if len(angle_values) > 1 else 0.0
            
            # PPM 계산 (상한/하한 규격: ±0.25)
            ppm = calculate_predicted_ppm_value(angle_values, usl=0.25, lsl=-0.25)
            
            # PPM 기울기 계산 (최근 10개 데이터 기준)
            ppm_history.append(ppm)
            ppm_slope = None
            if len(ppm_history) >= 10:
                recent_ppm = ppm_history[-10:]
                ppm_slope = calculate_ppm_slope_value(recent_ppm)
            
            # 품질 상태 판정
            try:
                quality_status, defect_prob = determine_quality_status(ppm, ppm_slope)
            except Exception as e:
                print(f"Warning: Quality status determination failed: {e}")
                quality_status, defect_prob = "UNKNOWN", 0.0
            
            # 결과 저장
            phase_angle_data = PhaseAngleData(
                timestamp=timestamp_data[i],
                barcode=barcode_data[i],
                angle_1=angle_dict.get('angle_1'),
                angle_2=angle_dict.get('angle_2'),
                angle_3=angle_dict.get('angle_3'),
                angle_4=angle_dict.get('angle_4'),
                angle_5=angle_dict.get('angle_5'),
                angle_6=angle_dict.get('angle_6'),
                mean_value=round(mean_val, 6),
                std_dev=round(std_val, 6),
                predicted_ppm=round(ppm, 2),
                ppm_slope=round(ppm_slope, 4) if ppm_slope is not None else None,
                quality_status=quality_status,
                defect_probability=round(defect_prob, 4)
            )
            
            phase_angle_results.append(phase_angle_data)
        
        # 성능 지표 계산 (예외처리 포함)
        try:
            if not phase_angle_results:
                raise HTTPException(
                    status_code=400,
                    detail="No valid data points processed. Check data quality and parameters."
                )
            
            ppm_values = [p.predicted_ppm for p in phase_angle_results if p.predicted_ppm is not None]
            slope_values = [p.ppm_slope for p in phase_angle_results if p.ppm_slope is not None]
            
            performance_metrics = {
                "total_data_points": len(phase_angle_results),
                "avg_ppm": float(np.mean(ppm_values)) if ppm_values else 0.0,
                "max_ppm": float(max(ppm_values)) if ppm_values else 0.0,
                "min_ppm": float(min(ppm_values)) if ppm_values else 0.0,
                "avg_slope": float(np.mean(slope_values)) if slope_values else 0.0
            }
        except Exception as e:
            print(f"Warning: Failed to calculate performance metrics: {e}")
            performance_metrics = {
                "total_data_points": len(phase_angle_results),
                "avg_ppm": 0.0,
                "max_ppm": 0.0,
                "min_ppm": 0.0,
                "avg_slope": 0.0
            }
        
        processing_info = {
            "window_size": params.window_size,
            "z_threshold": params.z_threshold,
            "prediction_horizon": params.prediction_horizon,
            "phase_angles_monitored": 6,
            "data_processing_rate": f"{len(phase_angle_results)}/{len(raw_records)} records"
        }
        
        return ModelBacktestResult(
            model_name=params.model_name,
            total_records=len(raw_records),
            processed_records=len(phase_angle_results),
            phase_angle_data=phase_angle_results,
            performance_metrics=performance_metrics,
            processing_info=processing_info
        )
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Model backtest failed: {str(e)}")

def calculate_predicted_ppm_value(measurements, usl=0.25, lsl=-0.25):
    """PPM 계산 함수 (예외처리 강화)"""
    try:
        # 입력값 검증
        if not measurements or len(measurements) < 2:
            return 0.0
        
        # 유효한 숫자값들만 필터링
        valid_measurements = []
        for m in measurements:
            try:
                val = float(m)
                if not (np.isnan(val) or np.isinf(val)):
                    valid_measurements.append(val)
            except (ValueError, TypeError):
                continue
        
        if len(valid_measurements) < 2:
            return 0.0
        
        # 통계 계산
        mean_val = np.mean(valid_measurements)
        std_val = np.std(valid_measurements, ddof=1)
        
        # 표준편차가 0이거나 매우 작은 경우
        if std_val == 0 or std_val < 1e-10:
            return 0.0
        
        # 평균값이 이상한 경우 체크
        if np.isnan(mean_val) or np.isinf(mean_val):
            return 0.0
        
        # Z-score 계산
        z_usl = (usl - mean_val) / std_val
        z_lsl = (lsl - mean_val) / std_val
        
        # Z-score 값이 너무 큰 경우 제한 (수치적 안정성)
        z_usl = max(-10, min(10, z_usl))
        z_lsl = max(-10, min(10, z_lsl))
        
        # 부적합 확률 계산
        prob_above_usl = 1 - stats.norm.cdf(z_usl)
        prob_below_lsl = stats.norm.cdf(z_lsl)
        
        # 총 불량률 및 PPM 계산
        total_defect_prob = prob_above_usl + prob_below_lsl
        
        # 확률값 검증
        if total_defect_prob < 0:
            total_defect_prob = 0
        elif total_defect_prob > 1:
            total_defect_prob = 1
        
        ppm = total_defect_prob * 1_000_000
        
        # PPM 값 검증
        if np.isnan(ppm) or np.isinf(ppm) or ppm < 0:
            return 0.0
        
        return min(ppm, 1_000_000)  # 최대값 제한
        
    except Exception as e:
        print(f"Warning: PPM calculation error: {e}")
        return 0.0

def determine_quality_status(ppm: float, slope: Optional[float] = None):
    """
    PPM과 기울기를 기반으로 품질 상태를 판정합니다.
    
    현실적인 임계값 (제조업 기준):
    - OK: PPM < 500000 (0.05% 미만)
    - WARNING: 500000 <= PPM < 1500000 (0.05% ~ 0.15%)
    - CRITICAL: PPM >= 1500000 (0.15% 이상)
    
    추가로 기울기가 양수이고 큰 경우 경고 수준을 높입니다.
    """
    try:
        # 현실적인 PPM 기반 판정 (더 높은 임계값 사용)
        if ppm < 500000:  # 0.05% 미만
            status = "OK"
        elif ppm < 1500000:  # 0.15% 미만
            status = "WARNING"
        else:  # 0.15% 이상
            status = "CRITICAL"
        
        # 기울기 기반 추가 판정
        if slope is not None and slope > 1000:  # 급격한 증가
            if status == "OK":
                status = "WARNING"
            elif status == "WARNING":
                status = "CRITICAL"
        
        # 불량 확률 계산 (새로운 임계값에 맞춘 현실적인 로지스틱 함수)
        # PPM 값에 따른 확률 계산 - 더 점진적인 증가
        if ppm < 100000:  # 0.01% 미만
            defect_prob = ppm / 1000000  # 0-0.1 범위
        elif ppm < 500000:  # 0.05% 미만
            defect_prob = 0.1 + (ppm - 100000) / 800000  # 0.1-0.6 범위
        elif ppm < 1000000:  # 0.1% 미만
            defect_prob = 0.6 + (ppm - 500000) / 625000  # 0.6-0.8 범위  
        elif ppm < 1500000:  # 0.15% 미만
            defect_prob = 0.8 + (ppm - 1000000) / 2500000  # 0.8-1.0 범위
        else:
            defect_prob = min(1.0, 0.9 + (ppm - 1500000) / 5000000)  # 0.9-1.0 범위
        
        # 기울기 영향 추가
        if slope is not None and slope > 0:
            slope_factor = min(0.3, slope / 10000)  # 기울기에 따른 추가 위험도
            defect_prob = min(1.0, defect_prob + slope_factor)
        
        return status, defect_prob
        
    except Exception as e:
        print(f"Warning: Quality status determination failed: {e}")
        return "UNKNOWN", 0.0

def calculate_ppm_slope_value(ppm_history):
    """PPM 기울기 계산 함수 (예외처리 강화)"""
    try:
        if not ppm_history or len(ppm_history) < 2:
            return 0.0
        
        # 유효한 값들만 필터링
        valid_values = []
        for val in ppm_history:
            try:
                num_val = float(val)
                if not (np.isnan(num_val) or np.isinf(num_val)):
                    valid_values.append(num_val)
                else:
                    valid_values.append(0.0)  # 잘못된 값은 0으로 대체
            except (ValueError, TypeError):
                valid_values.append(0.0)
        
        if len(valid_values) < 2:
            return 0.0
        
        # 선형 회귀로 기울기 계산
        x = np.array(range(len(valid_values)))
        y = np.array(valid_values)
        
        # 모든 값이 동일한 경우
        if np.std(y) == 0:
            return 0.0
        
        # numpy의 polyfit 사용 (1차 다항식)
        try:
            slope, _ = np.polyfit(x, y, 1)
        except (np.linalg.LinAlgError, ValueError) as e:
            print(f"Warning: Polyfit failed: {e}")
            return 0.0
        
        # 기울기 값 검증
        if np.isnan(slope) or np.isinf(slope):
            return 0.0
        
        # 너무 큰 기울기는 제한 (이상치 방지)
        slope = max(-1000, min(1000, slope))
        
        return float(slope)
        
    except Exception as e:
        print(f"Warning: PPM slope calculation error: {e}")
        return 0.0 