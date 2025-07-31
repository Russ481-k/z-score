# 제안 컬럼 매핑 구성

## 기본 정보 매핑

| Raw Column | Mapped Column Name | Description | Data Type |
| ---------- | ------------------ | ----------- | --------- |
| D000       | Product_Barcode    | 제품 바코드 | String    |
| D001       | Model_Name         | 모델명      | String    |
| D002       | Line_Info          | 라인 정보   | String    |
| D003       | Timestamp          | 측정 시간   | DateTime  |

## 압력/토크 측정값 매핑 (D004~D027)

| Raw Column | Mapped Column Name | Description   | Unit    |
| ---------- | ------------------ | ------------- | ------- |
| D004       | Pressure_1_Value   | 압력 측정값 1 | Bar/PSI |
| D005       | Pressure_1_Target  | 압력 목표값 1 | Bar/PSI |
| D006       | Pressure_1_Result  | 압력 판정 1   | OK/NG   |
| D007       | Pressure_2_Value   | 압력 측정값 2 | Bar/PSI |
| D008       | Pressure_2_Target  | 압력 목표값 2 | Bar/PSI |
| D009       | Pressure_2_Result  | 압력 판정 2   | OK/NG   |
| D010       | Torque_1_Value     | 토크 측정값 1 | Nm      |
| D011       | Torque_1_Target    | 토크 목표값 1 | Nm      |
| D012       | Torque_1_Result    | 토크 판정 1   | OK/NG   |
| D013       | Torque_2_Value     | 토크 측정값 2 | Nm      |
| D014       | Torque_2_Target    | 토크 목표값 2 | Nm      |
| D015       | Torque_2_Result    | 토크 판정 2   | OK/NG   |
| D016       | Torque_3_Value     | 토크 측정값 3 | Nm      |
| D017       | Torque_3_Target    | 토크 목표값 3 | Nm      |
| D018       | Torque_3_Result    | 토크 판정 3   | OK/NG   |
| D019       | Torque_4_Value     | 토크 측정값 4 | Nm      |
| D020       | Torque_4_Target    | 토크 목표값 4 | Nm      |
| D021       | Torque_4_Result    | 토크 판정 4   | OK/NG   |
| D022       | Torque_5_Value     | 토크 측정값 5 | Nm      |
| D023       | Torque_5_Target    | 토크 목표값 5 | Nm      |
| D024       | Torque_5_Result    | 토크 판정 5   | OK/NG   |
| D025       | Torque_6_Value     | 토크 측정값 6 | Nm      |
| D026       | Torque_6_Target    | 토크 목표값 6 | Nm      |
| D027       | Torque_6_Result    | 토크 판정 6   | OK/NG   |

## 예비/미사용 (D028~D033)

| Raw Column | Mapped Column Name | Description |
| ---------- | ------------------ | ----------- |
| D028~D033  | Reserved_001~006   | 예비 필드   |

## 변위/거리 측정값 매핑 (D034~D069)

| Raw Column | Mapped Column Name    | Description    | Unit  |
| ---------- | --------------------- | -------------- | ----- |
| D034       | Displacement_1_Value  | 변위 측정값 1  | mm    |
| D035       | Displacement_1_Result | 변위 판정 1    | OK/NG |
| D036       | Displacement_2_Value  | 변위 측정값 2  | mm    |
| D037       | Displacement_2_Result | 변위 판정 2    | OK/NG |
| D038       | Displacement_3_Value  | 변위 측정값 3  | mm    |
| D039       | Displacement_3_Result | 변위 판정 3    | OK/NG |
| D040       | Displacement_4_Value  | 변위 측정값 4  | mm    |
| D041       | Displacement_4_Result | 변위 판정 4    | OK/NG |
| D042       | Displacement_5_Value  | 변위 측정값 5  | mm    |
| D043       | Displacement_5_Result | 변위 판정 5    | OK/NG |
| D044       | Displacement_6_Value  | 변위 측정값 6  | mm    |
| D045       | Displacement_6_Result | 변위 판정 6    | OK/NG |
| D046       | Displacement_7_Value  | 변위 측정값 7  | mm    |
| D047       | Displacement_7_Result | 변위 판정 7    | OK/NG |
| D048~D051  | Reserved_Disp_001~004 | 변위 예비 필드 |       |
| D052       | Distance_1_Value      | 거리 측정값 1  | mm    |
| D053       | Distance_1_Result     | 거리 판정 1    | OK/NG |
| D054       | Distance_2_Value      | 거리 측정값 2  | mm    |
| D055       | Distance_2_Result     | 거리 판정 2    | OK/NG |
| D056       | Distance_3_Value      | 거리 측정값 3  | mm    |
| D057       | Distance_3_Result     | 거리 판정 3    | OK/NG |
| D058       | Distance_4_Value      | 거리 측정값 4  | mm    |
| D059       | Distance_4_Result     | 거리 판정 4    | OK/NG |
| D060       | Distance_5_Value      | 거리 측정값 5  | mm    |
| D061       | Distance_5_Result     | 거리 판정 5    | OK/NG |
| D062       | Distance_6_Value      | 거리 측정값 6  | mm    |
| D063       | Distance_6_Result     | 거리 판정 6    | OK/NG |
| D064       | Distance_7_Value      | 거리 측정값 7  | mm    |
| D065       | Distance_7_Result     | 거리 판정 7    | OK/NG |
| D066~D071  | Reserved_Dist_001~006 | 거리 예비 필드 |       |

## 캠 위상각 측정값 매핑 (D072~D103) ⭐ 핵심

| Raw Column | Mapped Column Name       | Description        | Unit   | Target Value |
| ---------- | ------------------------ | ------------------ | ------ | ------------ |
| D072       | Cam_Phase_Angle_1_Value  | 캠 위상각 1 측정값 | Degree | 52.08°       |
| D073       | Cam_Phase_Angle_1_Result | 캠 위상각 1 판정   | OK/NG  | -            |
| D074~D076  | Reserved_Cam1_001~003    | 캠1 예비 필드      |        |              |
| D077       | Cam_Phase_Angle_2_Value  | 캠 위상각 2 측정값 | Degree | 52.08°       |
| D078       | Cam_Phase_Angle_2_Result | 캠 위상각 2 판정   | OK/NG  | -            |
| D079~D081  | Reserved_Cam2_001~003    | 캠2 예비 필드      |        |              |
| D082       | Cam_Phase_Angle_5_Value  | 캠 위상각 5 측정값 | Degree | 292.08°      |
| D083       | Cam_Phase_Angle_5_Result | 캠 위상각 5 판정   | OK/NG  | -            |
| D084~D086  | Reserved_Cam5_001~003    | 캠5 예비 필드      |        |              |
| D087       | Cam_Phase_Angle_6_Value  | 캠 위상각 6 측정값 | Degree | 292.08°      |
| D088       | Cam_Phase_Angle_6_Result | 캠 위상각 6 판정   | OK/NG  | -            |
| D089~D091  | Reserved_Cam6_001~003    | 캠6 예비 필드      |        |              |
| D092       | Cam_Phase_Angle_3_Value  | 캠 위상각 3 측정값 | Degree | 172.08°      |
| D093       | Cam_Phase_Angle_3_Result | 캠 위상각 3 판정   | OK/NG  | -            |
| D094~D096  | Reserved_Cam3_001~003    | 캠3 예비 필드      |        |              |
| D097       | Cam_Phase_Angle_4_Value  | 캠 위상각 4 측정값 | Degree | 172.08°      |
| D098       | Cam_Phase_Angle_4_Result | 캠 위상각 4 판정   | OK/NG  | -            |
| D099~D103  | Reserved_Cam4_001~005    | 캠4 예비 필드      |        |              |

## 추가/예비 필드 (D104~D149)

| Raw Column | Mapped Column Name | Description      |
| ---------- | ------------------ | ---------------- |
| D104~D149  | Future_Use_001~046 | 향후 확장용 필드 |

## 컬럼 매핑 우선순위

### 🔴 High Priority (핵심 측정값)

1. **캠 위상각 측정값**: D072, D077, D082, D087, D092, D097
2. **캠 위상각 판정**: D073, D078, D083, D088, D093, D098
3. **기본 정보**: D000, D001, D002, D003

### 🟡 Medium Priority (품질 관리)

1. **압력/토크 측정값**: D004, D007, D010, D013, D016, D019, D022, D025
2. **압력/토크 판정**: D006, D009, D012, D015, D018, D021, D024, D027

### 🟢 Low Priority (보조 측정값)

1. **변위/거리 측정값**: D034, D036, D038, D040, D042, D044, D046, D052, D054, D056, D058, D060, D062, D064
2. **변위/거리 판정**: D035, D037, D039, D041, D043, D045, D047, D053, D055, D057, D059, D061, D063, D065

## 구현 권장사항

1. **Phase 1**: High Priority 컬럼들을 우선 매핑
2. **Phase 2**: Medium Priority 컬럼들 추가
3. **Phase 3**: Low Priority 컬럼들 및 예비 필드 구성
4. **데이터 검증**: 각 측정값의 실제 범위 및 단위 확인 필요
