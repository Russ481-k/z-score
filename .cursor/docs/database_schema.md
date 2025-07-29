# 데이터베이스 스키마 설계서

## 1. 개요

본 문서는 캠샤프트 불량률 예측 시스템의 데이터베이스 스키마를 정의합니다. 데이터 모델은 정규화를 통해 데이터 중복을 최소화하고, 분석 및 조회 성능을 고려하여 설계되었습니다. `SQLAlchemy` ORM을 통해 모델을 관리하며, Oracle과 MariaDB 간의 호환성을 보장하는 데이터 타입을 사용합니다.

## 2. 테이블 상세 설계

### 2.1. `HANDY_ZSCORE_RAW_DATA` - 원본 데이터

- **설명:** CSV 파일에서 읽어 들인 원본 데이터를 그대로 저장하는 테이블입니다. 데이터 파싱 및 가공은 애플리케이션 레벨에서 수행됩니다.
- **생성 전략:** Oracle의 `IDENTITY` 컬럼 대신, 모든 버전과 환경에서 호환성이 높은 `SEQUENCE` + `TRIGGER` 조합 또는 애플리케이션 직접 호출 방식을 사용합니다. 여기서는 애플리케이션에서 `SEQUENCE`를 직접 호출하는 것을 표준으로 정의합니다.
- **컬럼 정의:**
  | 컬럼명 | 데이터 타입 (Oracle) | 제약조건 | 설명 |
  |---|---|---|---|
  | `id` | `NUMBER` | `PK`, `Not Null` | 고유 식별자. `handy_zscore_raw_data_seq` 시퀀스를 통해 값이 할당됩니다. |
  | `create_time` | `DATE` | `Default SYSDATE` | 행 생성 시각 |
  | `d000` ~ `d149` | `VARCHAR2(255)` | | 150개의 원본 데이터 컬럼 |

- **관련 객체 생성 DDL:**

  ```sql
  -- 1. 테이블 생성
  CREATE TABLE HANDY_ZSCORE_RAW_DATA (
      id NUMBER NOT NULL,
      create_time DATE DEFAULT SYSDATE,
      d000 VARCHAR2(255),
      d001 VARCHAR2(255),
      -- ... d148, d149 컬럼까지 정의 ...
      d149 VARCHAR2(255),
      CONSTRAINT handy_zscore_raw_data_pk PRIMARY KEY (id)
  );

  -- 2. 시퀀스 생성
  CREATE SEQUENCE handy_zscore_raw_data_seq
  START WITH 1
  INCREMENT BY 1
  NOCACHE
  NOCYCLE;
  ```

### 2.2. `HANDY_ZSCORE_COLUMN_MAPPER` - 컬럼 매핑 정보

- **설명:** `HANDY_ZSCORE_RAW_DATA`의 'd'로 시작하는 컬럼들이 실제 어떤 의미를 갖는지 정의하는 테이블입니다.
- **생성 전략:** `HANDY_ZSCORE_RAW_DATA`와 동일하게 애플리케이션에서 `SEQUENCE`를 직접 호출합니다.
- **컬럼 정의:**
  | 컬럼명 | 데이터 타입 (Oracle) | 제약조건 | 설명 |
  |---|---|---|---|
  | `id` | `NUMBER` | `PK`, `Not Null` | 고유 식별자. `handy_zscore_col_map_seq` 시퀀스를 통해 값이 할당됩니다. |
  | `raw_column_name` | `VARCHAR2(255)`| `Not Null`, `Unique` | 원본 테이블의 컬럼명 (예: 'd000') |
  | `mapped_column_name`| `VARCHAR2(255)`| `Not Null`, `Unique` | 애플리케이션에서 사용할 컬럼명 (예: 'barcode') |
  | `description` | `VARCHAR2(1000)`| | 컬럼에 대한 설명 |
  | `create_time` | `DATE` | `Default SYSDATE`| 행 생성 시각 |

- **관련 객체 생성 DDL:**

  ```sql
  -- 1. 테이블 생성
  CREATE TABLE HANDY_ZSCORE_COLUMN_MAPPER (
      id NUMBER NOT NULL,
      raw_column_name VARCHAR2(255) NOT NULL,
      mapped_column_name VARCHAR2(255) NOT NULL,
      description VARCHAR2(1000),
      create_time DATE DEFAULT SYSDATE,
      CONSTRAINT handy_zscore_col_map_pk PRIMARY KEY (id),
      CONSTRAINT uq_raw_column_name UNIQUE (raw_column_name),
      CONSTRAINT uq_mapped_column_name UNIQUE (mapped_column_name)
  );

  -- 2. 시퀀스 생성
  CREATE SEQUENCE handy_zscore_col_map_seq
  START WITH 1
  INCREMENT BY 1
  NOCACHE
  NOCYCLE;
  ```

### 2.3. `HANDY_PRODUCTS` - 제품 정보 (가공 후)

- **설명:** 생산된 각 제품의 기본 정보를 저장합니다. 데이터 파이프라인을 통해 원본 CSV에서 추출된 데이터가 저장됩니다.
- **컬럼 정의:**
  | 컬럼명 | 데이터 타입 (SQLAlchemy) | 데이터 타입 (Oracle) | 데이터 타입 (MariaDB) | 제약조건 | 설명 |
  | --- | --- | --- | --- | --- | --- |
  | `id` | `Integer` | `NUMBER` | `INT` | `PK`, `Auto-increment` | 고유 식별자 |
  | `barcode` | `String(510)` | `VARCHAR2(510)` | `VARCHAR(510)` | `Unique`, `Not Null` | 제품 바코드 |
  | `model_name` | `String(510)` | `VARCHAR2(510)` | `VARCHAR(510)` | | 제품 모델명 |
  | `line_info` | `String(510)` | `VARCHAR2(510)` | `VARCHAR(510)` | | 라인/장비/팔레트 정보 |
  | `timestamp` | `DateTime` | `DATE` | `DATETIME` | `Not Null` | 생산 일시 |
  | `create_time` | `DateTime` | `DATE` | `DATETIME` | `Default CURRENT_TIMESTAMP` | 레코드 생성 시각 |

### 2.4. `HANDY_CAM_MEASUREMENTS` - 캠샤프트 측정 데이터

- **설명:** 각 제품의 9개 캠별 측정치(압입력, 토크, 위상각 등)와 Z-score 분석 결과를 저장합니다. CSV의 wide-format 데이터를 long-format으로 변환하여 저장합니다.
- **컬럼 정의:**
  | 컬럼명 | 데이터 타입 (SQLAlchemy) | 데이터 타입 (Oracle) | 데이터 타입 (MariaDB) | 제약조건 | 설명 |
  | --- | --- | --- | --- | --- | --- |
  | `id` | `Integer` | `NUMBER` | `INT` | `PK`, `Auto-increment` | 고유 식별자 |
  | `product_id` | `Integer` | `NUMBER` | `INT` | `FK` to `HANDY_PRODUCTS.id` | 제품 ID (외래키) |
  | `cam_number` | `Integer` | `NUMBER` | `TINYINT` | `Not Null` | 캠 번호 (1-9) |
  | `press_force_max` | `Float` | `FLOAT` | `FLOAT` | | 최고 압입력 (kN) |
  | `press_force_final`| `Float` | `FLOAT` | `FLOAT` | | 최종 압입력 (kN) |
  | `torque_value` | `Float` | `FLOAT` | `FLOAT` | | 토크 측정값 (N.m) |
  | `angle_value` | `Float` | `FLOAT` | `FLOAT` | | 위상각 측정값 (도) |
  | `allowance` | `Float` | `FLOAT` | `FLOAT` | | 허용치 |
  | `torque_z_score` | `Float` | `FLOAT` | `FLOAT` | `Index` | 토크에 대한 Z-score |
  | `angle_z_score` | `Float` | `FLOAT` | `FLOAT` | `Index` | 위상각에 대한 Z-score |
  | `create_time` | `DateTime` | `DATE` | `DATETIME` | `Default CURRENT_TIMESTAMP` | 레코드 생성 시각 |

### 2.5. `HANDY_DISTR_ANALYSIS` - 공정 분석 결과

- **설명:** 일정 주기로 계산되는 공정의 통계적 분석 결과를 시계열로 저장합니다. **예측 모델의 핵심 데이터 테이블**입니다.
- **컬럼 정의:**
  | 컬럼명 | 데이터 타입 (SQLAlchemy) | 데이터 타입 (Oracle) | 데이터 타입 (MariaDB) | 제약조건 | 설명 |
  | --- | --- | --- | --- | --- | --- |
  | `id` | `Integer` | `NUMBER` | `INT` | `PK`, `Auto-increment` | 고유 식별자 |
  | `analyzed_at` | `DateTime` | `DATE` | `DATETIME` | `Not Null`, `Index` | 분석 수행 시각 |
  | `cam_number` | `Integer` | `NUMBER` | `TINYINT` | `Not Null` | 캠 번호 (1-9) |
  | `metric_type`| `String(100)`| `VARCHAR2(100)` | `VARCHAR(100)` | `Not Null` | 분석 대상 지표 (angle, torque) |
  | `mean` | `Float` | `FLOAT` | `FLOAT` | | 분석 기간 동안의 평균(μ) |
  | `std_dev` | `Float` | `FLOAT` | `FLOAT` | | 분석 기간 동안의 표준편차(σ) |
  | `predicted_ppm`| `Float` | `FLOAT` | `FLOAT` | `Index` | **예상 불량률 (PPM)** |
  | `ppm_slope` | `Float` | `FLOAT` | `FLOAT` | | **예상 불량률의 변화 기울기** |
  | `create_time` | `DateTime` | `DATE` | `DATETIME` | `Default CURRENT_TIMESTAMP` | 레코드 생성 시각 |

### 2.6. `alarms` - 알람 이력

- **설명:** 발생한 모든 알람의 이력을 저장합니다.
- **컬럼 정의:**
  | 컬럼명 | 데이터 타입 (SQLAlchemy) | 데이터 타입 (Oracle) | 데이터 타입 (MariaDB) | 제약조건 | 설명 |
  | --- | --- | --- | --- | --- | --- |
  | `id` | `Integer` | `NUMBER(10)` | `INT` | `PK`, `Auto-increment` | 알람 고유 식별자 |
  | `alarm_type` | `String(50)` | `VARCHAR2(50)` | `VARCHAR(50)` | `Not Null` | 알람 종류 (e.g., 'Process Instability') |
  | `level` | `String(20)` | `VARCHAR2(20)` | `VARCHAR(20)` | `Not Null` | 알람 수준 (e.g., 'warning', 'attention') |
  | `message`
