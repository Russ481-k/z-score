# PPM 계산 및 예측 구현 가이드

## 1. 개요

본 문서는 Z-Score 기반 PPM(Parts Per Million) 계산 공식의 실제 구현 방법과 불량률 예측 메커니즘을 상세히 설명합니다.

## 2. PPM 계산 공식 구현

### 2.1. Python 구현 예시

```python
import numpy as np
import scipy.stats as stats
from typing import List, Tuple

def calculate_predicted_ppm(
    measurements: List[float],
    usl: float = 0.25,
    lsl: float = -0.25
) -> Tuple[float, dict]:
    """
    Z-score 기반 PPM 계산

    Args:
        measurements: 측정값 리스트 (최근 500개 권장)
        usl: 상한 규격 (Upper Specification Limit)
        lsl: 하한 규격 (Lower Specification Limit)

    Returns:
        tuple: (ppm_value, calculation_details)
    """
    if len(measurements) < 2:
        return 0.0, {"error": "Insufficient data"}

    # 1. 통계치 계산
    mean_val = np.mean(measurements)
    std_val = np.std(measurements, ddof=1)  # 표본 표준편차

    if std_val == 0:
        return 0.0, {"mean": mean_val, "std": 0, "note": "No variation"}

    # 2. Z-score 계산
    z_usl = (usl - mean_val) / std_val
    z_lsl = (lsl - mean_val) / std_val

    # 3. 부적합 확률 계산
    prob_above_usl = 1 - stats.norm.cdf(z_usl)
    prob_below_lsl = stats.norm.cdf(z_lsl)

    # 4. 총 불량률 및 PPM 계산
    total_defect_prob = prob_above_usl + prob_below_lsl
    ppm = total_defect_prob * 1_000_000

    # 5. 계산 상세 정보
    details = {
        "mean": round(mean_val, 6),
        "std_dev": round(std_val, 6),
        "z_usl": round(z_usl, 3),
        "z_lsl": round(z_lsl, 3),
        "prob_above_usl": round(prob_above_usl, 8),
        "prob_below_lsl": round(prob_below_lsl, 8),
        "total_defect_prob": round(total_defect_prob, 8),
        "ppm": round(ppm, 2)
    }

    return ppm, details
```

### 2.2. PPM 기울기 계산

```python
from datetime import datetime
from sklearn.linear_model import LinearRegression

def calculate_ppm_slope(
    historical_ppm: List[Tuple[datetime, float]],
    window_hours: int = 24
) -> Tuple[float, dict]:
    """
    PPM 변화율(기울기) 계산

    Args:
        historical_ppm: (시간, PPM값) 튜플 리스트
        window_hours: 분석 시간 윈도우 (시간)

    Returns:
        tuple: (slope_per_hour, analysis_details)
    """
    if len(historical_ppm) < 2:
        return 0.0, {"error": "Insufficient data points"}

    # 시간을 숫자로 변환 (Unix timestamp)
    timestamps = [dt.timestamp() for dt, _ in historical_ppm]
    ppm_values = [ppm for _, ppm in historical_ppm]

    # 선형 회귀로 기울기 계산
    X = np.array(timestamps).reshape(-1, 1)
    y = np.array(ppm_values)

    model = LinearRegression()
    model.fit(X, y)

    # 기울기를 시간당으로 변환 (초당 → 시간당)
    slope_per_second = model.coef_[0]
    slope_per_hour = slope_per_second * 3600

    # R² 계산 (추세 신뢰도)
    r_squared = model.score(X, y)

    details = {
        "slope_per_hour": round(slope_per_hour, 4),
        "r_squared": round(r_squared, 4),
        "data_points": len(historical_ppm),
        "time_span_hours": (timestamps[-1] - timestamps[0]) / 3600,
        "trend": "increasing" if slope_per_hour > 0 else "decreasing"
    }

    return slope_per_hour, details
```

## 3. 알람 임계값 설정

### 3.1. PPM 기반 알람

| 단계 | PPM 범위      | 색상      | 조치 사항      |
| ---- | ------------- | --------- | -------------- |
| 정상 | < 500         | 🟢 Green  | 일반 모니터링  |
| 주의 | 500 ~ 1,000   | 🟡 Yellow | 원인 분석 시작 |
| 경고 | 1,000 ~ 5,000 | 🟠 Orange | 즉시 대응 필요 |
| 위험 | > 5,000       | 🔴 Red    | 생산 중단 검토 |

### 3.2. 기울기 기반 알람

```python
def evaluate_trend_alarm(slope_per_hour: float, current_ppm: float) -> str:
    """추세 기반 알람 평가"""
    if slope_per_hour > 50:  # 시간당 50 PPM 이상 증가
        if current_ppm > 1000:
            return "CRITICAL"  # 높은 PPM + 급속 증가
        else:
            return "WARNING"   # 낮은 PPM이지만 급속 증가
    elif slope_per_hour > 20:
        return "CAUTION"       # 점진적 증가
    elif slope_per_hour < -20:
        return "IMPROVING"     # 개선 추세
    else:
        return "STABLE"        # 안정 상태
```

## 4. 실시간 모니터링 구현

### 4.1. 백그라운드 분석 프로세스

```python
async def realtime_ppm_analysis():
    """실시간 PPM 분석 및 저장"""
    while True:
        try:
            for cam_number in range(1, 10):
                for metric in ["angle", "torque"]:
                    # 최근 500개 데이터 조회
                    recent_data = get_recent_measurements(
                        cam_number=cam_number,
                        metric=metric,
                        limit=500
                    )

                    # PPM 계산
                    ppm, details = calculate_predicted_ppm(recent_data)

                    # 기울기 계산
                    historical_ppm = get_historical_ppm(
                        cam_number=cam_number,
                        metric=metric,
                        hours=24
                    )
                    slope, slope_details = calculate_ppm_slope(historical_ppm)

                    # 데이터베이스 저장
                    save_analysis_result({
                        "cam_number": cam_number,
                        "metric_type": metric,
                        "mean": details["mean"],
                        "std_dev": details["std_dev"],
                        "predicted_ppm": ppm,
                        "ppm_slope": slope
                    })

                    # 알람 체크
                    alarm_level = evaluate_trend_alarm(slope, ppm)
                    if alarm_level in ["WARNING", "CRITICAL"]:
                        trigger_alarm(cam_number, metric, ppm, slope, alarm_level)

            # 10분 간격으로 실행
            await asyncio.sleep(600)

        except Exception as e:
            logger.error(f"PPM 분석 오류: {e}")
            await asyncio.sleep(60)
```

## 5. 성능 최적화

### 5.1. 데이터 윈도우 최적화

- **통계 계산 윈도우**: 500개 데이터 포인트 (약 2-3시간 분량)
- **기울기 계산 윈도우**: 24시간 이력 데이터
- **캐싱**: 중간 계산 결과를 Redis에 캐싱

### 5.2. 배치 처리

```python
def batch_ppm_calculation(cam_data_batch: dict) -> dict:
    """여러 캠의 PPM을 동시에 계산"""
    results = {}

    for cam_number, metrics_data in cam_data_batch.items():
        results[cam_number] = {}

        for metric, measurements in metrics_data.items():
            ppm, details = calculate_predicted_ppm(measurements)
            results[cam_number][metric] = {
                "ppm": ppm,
                "details": details
            }

    return results
```

## 6. 검증 및 보정

### 6.1. 모델 정확도 검증

```python
def validate_ppm_model(predicted_ppm_history, actual_defect_history):
    """PPM 예측 모델의 정확도 검증"""
    correlation = np.corrcoef(predicted_ppm_history, actual_defect_history)[0,1]

    # 예측된 PPM과 실제 불량률 간의 상관관계 분석
    return {
        "correlation": correlation,
        "accuracy_grade": "HIGH" if correlation > 0.8 else "MEDIUM" if correlation > 0.6 else "LOW"
    }
```

### 6.2. 동적 임계값 조정

```python
def adjust_thresholds_based_on_history(cam_number: int, metric: str):
    """과거 데이터를 기반으로 임계값 자동 조정"""
    # 과거 3개월 데이터 분석
    historical_data = get_historical_analysis(cam_number, metric, months=3)

    # 95% 신뢰구간 기반 임계값 계산
    ppm_95_percentile = np.percentile([d["predicted_ppm"] for d in historical_data], 95)

    return {
        "recommended_warning_threshold": ppm_95_percentile * 0.7,
        "recommended_critical_threshold": ppm_95_percentile
    }
```

## 7. 문제 해결 가이드

### 7.1. 일반적인 문제들

| 문제                    | 원인                       | 해결책                                    |
| ----------------------- | -------------------------- | ----------------------------------------- |
| PPM이 0으로 계산됨      | 표준편차가 0               | 더 많은 데이터 수집 또는 측정 정밀도 확인 |
| PPM이 비정상적으로 높음 | 공정 이상 또는 데이터 오류 | 원시 데이터 검증 및 공정 점검             |
| 기울기가 불안정함       | 데이터 포인트 부족         | 분석 윈도우 조정 또는 수집 빈도 증가      |

### 7.2. 로그 및 디버깅

```python
import logging

logger = logging.getLogger("ppm_calculator")

def debug_ppm_calculation(measurements, usl, lsl):
    """PPM 계산 과정 디버깅"""
    logger.info(f"Calculating PPM for {len(measurements)} measurements")
    logger.info(f"USL: {usl}, LSL: {lsl}")

    ppm, details = calculate_predicted_ppm(measurements, usl, lsl)

    logger.info(f"Calculated PPM: {ppm}")
    logger.info(f"Details: {details}")

    return ppm, details
```
