from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import date, datetime, timedelta
from pydantic import BaseModel
import numpy as np
from statistics import mean, stdev

from ..core.database import get_db
from ..models.analysis import CamMeasurement, DistributionAnalysis, Product
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