# API 명세서

## 1. 개요

본 문서는 캠샤프트 불량률 예측 시스템의 백엔드 API 명세를 정의합니다. FastAPI를 기반으로 구축되며, RESTful 원칙을 준수합니다. 모든 API 응답은 JSON 형식을 사용하며, FastAPI의 자동 문서화 기능(Swagger UI at `/docs`, ReDoc at `/redoc`)을 통해 실시간으로 확인하고 테스트할 수 있습니다.

## 2. 공통 응답 형식

모든 API는 일관된 응답 구조를 가집니다.

```json
{
  "status": "success", // 또는 "error"
  "data": {
    // 실제 데이터가 담기는 객체
  },
  "message": null // 오류 발생 시 상세 메시지
}
```

## 3. API 엔드포인트

### 3.1. 데이터 조회 API

#### `GET /api/data/products`

- **설명:** 지정된 기간 동안의 **제품(products) 정보**를 조회합니다. 프론트엔드의 메인 ag-Grid에 데이터를 제공하는 API입니다.
- **쿼리 파라미터:**
  - `start_date` (string, YYYY-MM-DDTHH:MM:SS): 조회 시작 일시
  - `end_date` (string, YYYY-MM-DDTHH:MM:SS): 조회 종료 일시
  - `page` (int, optional, default: 1): 페이지 번호
  - `size` (int, optional, default: 50): 페이지 당 데이터 수
- **성공 응답 (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "total": 1234,
      "items": [
        {
          "id": 1,
          "barcode": "2401020001C",
          "model_name": "NEW KAPPAEX1.0",
          "line_info": "CM1P9",
          "final_position": 18.673,
          "final_press_force": 30.38,
          "result": "OK",
          "created_at": "2024-01-02T07:57:17"
        }
      ]
    },
    "message": null
  }
  ```

#### `GET /api/data/measurements/{product_id}`

- **설명:** 특정 제품(product_id)에 대한 **9개 캠의 상세 측정 데이터**를 조회합니다. 사용자가 메인 그리드에서 특정 제품을 선택했을 때 호출됩니다.
- **경로 파라미터:**
  - `product_id` (int): 제품의 고유 ID
- **성공 응답 (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "cam_number": 1,
        "press_force_max": 24.35,
        "press_force_final": 23.62,
        "press_result": "OK",
        "torque": 5.47,
        "torque_result": "OK",
        "angle": 53.05,
        "angle_result": "OK",
        "angle_z_score": 1.25,
        "torque_z_score": 0.98
      },
      { "cam_number": 2, ... }
    ],
    "message": null
  }
  ```

### 3.2. 공정 분석 및 예측 API

#### `GET /api/analysis/process`

- **설명:** 지정된 기간과 측정 지표에 대한 **최신 공정 분석 결과**를 조회합니다. 이 API는 대시보드의 핵심 통계치 및 예측 정보를 제공합니다.
- **쿼리 파라미터:**
  - `start_date` (string): 분석 시작 일시
  - `end_date` (string): 분석 종료 일시
  - `metric` (string, 'angle' 또는 'torque'): 분석할 측정 지표
- **성공 응답 (200 OK):**
  ```json
  {
      "status": "success",
      "data": {
          "cam1": {
              "mean": 0.015,
              "std_dev": 0.089,
              "predicted_ppm": 250.5,
              "ppm_slope": 15.2
          },
          "cam2": { ... },
          // ... 9개 캠에 대한 최신 분석 결과
      },
      "message": null
  }
  ```

#### `GET /api/analysis/history`

- **설명:** 지정된 기간과 측정 지표에 대한 **공정 분석 이력**을 시계열로 조회합니다. 프론트엔드의 추세 차트 시각화에 사용됩니다.
- **쿼리 파라미터:**
  - `start_date` (string): 조회 시작 일시
  - `end_date` (string): 조회 종료 일시
  - `metric` (string, 'angle' 또는 'torque'): 조회할 측정 지표
  - `cam_number` (int): 조회할 특정 캠 번호
- **성공 응답 (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "analyzed_at": "2024-07-28T10:00:00",
        "mean": 0.015,
        "std_dev": 0.089,
        "predicted_ppm": 250.5,
        "ppm_slope": 15.2
      },
      {
        "analyzed_at": "2024-07-28T10:10:00",
        "mean": 0.017,
        "std_dev": 0.091,
        "predicted_ppm": 280.1,
        "ppm_slope": 16.8
      }
      // ... 분석 이력 데이터
    ],
    "message": null
  }
  ```

### 3.3. 알람 API

#### `GET /api/alarms`

- **설명:** 발생한 알람 목록을 최신순으로 조회합니다.
- **쿼리 파라미터:**
  - `limit` (int, optional, default: 20): 조회할 알람 개수
- **성공 응답 (200 OK):**
  ```json
  {
    "status": "success",
    "data": [
      {
        "alarm_id": 101,
        "timestamp": "2024-07-28T10:00:00",
        "type": "Process Instability",
        "level": "warning",
        "message": "CAM1 Angle 공정 불안정성 증가 감지 (밀도 기울기: -0.05, 범위 기울기: 0.02)"
      }
    ],
    "message": null
  }
  ```
