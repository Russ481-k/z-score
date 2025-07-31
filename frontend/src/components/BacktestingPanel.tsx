"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useToast } from "./ToastContainer";
import PhaseAngleChart from "./backtesting/PhaseAngleChart";
import OverallTrendChart from "./backtesting/OverallTrendChart";
import PPMSlopeChart from "./backtesting/PPMSlopeChart";
import CurrentDataPoint from "./backtesting/CurrentDataPoint";
import PhaseAngleStatus from "./backtesting/PhaseAngleStatus";
import PerformanceMetrics from "./backtesting/PerformanceMetrics";

interface ModelBacktestParameters {
  model_name: string;
  window_size: number;
  z_threshold: number;
  prediction_horizon: number;
  max_records: number;
}

interface PhaseAngleData {
  timestamp: string;
  barcode: string;
  angle_1?: number; // d072 - Phase Angle 1 (52.08°)
  angle_2?: number; // d077 - Phase Angle 2 (52.08°)
  angle_3?: number; // d082 - Phase Angle 5 (-292.08°)
  angle_4?: number; // d087 - Phase Angle 6 (-292.08°)
  angle_5?: number; // d092 - Phase Angle 3 (172.08°)
  angle_6?: number; // d097 - Phase Angle 4 (172.08°)
  mean_value: number;
  std_dev: number;
  predicted_ppm: number;
  ppm_slope?: number;
  quality_status: string; // OK, WARNING, CRITICAL, UNKNOWN
  defect_probability: number; // 0-1 확률
}

interface ModelBacktestResult {
  model_name: string;
  total_records: number;
  processed_records: number;
  phase_angle_data: PhaseAngleData[];
  performance_metrics: {
    total_data_points: number;
    avg_ppm: number;
    max_ppm: number;
    min_ppm: number;
    avg_slope: number;
  };
  processing_info: {
    window_size: number;
    z_threshold: number;
    prediction_horizon: number;
    phase_angles_monitored: number;
    data_processing_rate: string;
  };
}

interface Model {
  model_name: string;
  display_name: string;
}

const BacktestingPanel: React.FC = () => {
  // 모델별 실시간 백테스팅 상태
  const [modelParameters, setModelParameters] =
    useState<ModelBacktestParameters>({
      model_name: "",
      window_size: 50,
      z_threshold: 2.0,
      prediction_horizon: 10,
      max_records: 500,
    });

  const [modelResults, setModelResults] = useState<ModelBacktestResult | null>(
    null
  );
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [previousDefectStates, setPreviousDefectStates] = useState<{
    [key: string]: boolean;
  }>({});

  // 모델 목록 조회
  const { data: modelsData } = useQuery<{ models: Model[] }>({
    queryKey: ["models"],
    queryFn: async () => {
      const response = await apiClient.get("/raw-data/models");
      return response.data;
    },
  });

  // 모델별 실시간 백테스팅
  const modelBacktestMutation = useMutation({
    mutationFn: async (params: ModelBacktestParameters) => {
      try {
        const response = await apiClient.post(
          "/backtest/model-realtime",
          params
        );

        // 응답 데이터 유효성 검증
        if (!response.data) {
          throw new Error("Empty response from server");
        }

        if (
          !response.data.phase_angle_data ||
          !Array.isArray(response.data.phase_angle_data)
        ) {
          throw new Error("Invalid phase angle data format");
        }

        if (response.data.phase_angle_data.length === 0) {
          throw new Error("No phase angle data received");
        }

        return response.data;
      } catch (error: any) {
        // 네트워크 오류 처리
        if (
          error.code === "NETWORK_ERROR" ||
          error.message.includes("Network Error")
        ) {
          throw new Error(
            "네트워크 연결 오류가 발생했습니다. 서버 상태를 확인해주세요."
          );
        }

        // 서버 오류 처리
        if (error.response?.status >= 500) {
          throw new Error(
            "서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
          );
        }

        // 클라이언트 오류 처리
        if (error.response?.status >= 400) {
          const detail =
            error.response?.data?.detail || "요청이 잘못되었습니다.";
          throw new Error(detail);
        }

        throw error;
      }
    },
    onSuccess: (data: ModelBacktestResult) => {
      try {
        // 데이터 추가 검증
        if (!data.phase_angle_data || data.phase_angle_data.length === 0) {
          showToast(
            "처리된 데이터가 없습니다. 다른 모델을 선택하거나 파라미터를 조정해주세요.",
            "warning"
          );
          return;
        }

        setModelResults(data);
        setCurrentIndex(0);
        setPreviousDefectStates({}); // 새로운 백테스팅 시작 시 불량 상태 초기화

        // 상세 디버깅 정보
        console.log("모델 백테스팅 응답:", data);
        console.log("첫 번째 데이터 포인트:", data.phase_angle_data[0]);
        console.log("Status 분포:", {
          statusCounts: data.phase_angle_data.reduce((acc: any, item: any) => {
            acc[item.quality_status] = (acc[item.quality_status] || 0) + 1;
            return acc;
          }, {}),
          avgDefectProbability:
            data.phase_angle_data.reduce(
              (sum: number, item: any) => sum + (item.defect_probability || 0),
              0
            ) / data.phase_angle_data.length,
        });

        showToast(
          `백테스팅 완료! ${data.processed_records}개의 데이터 포인트를 처리했습니다.`,
          "success"
        );
      } catch (error: any) {
        console.error("데이터 처리 오류:", error);
        showToast("데이터 처리 중 오류가 발생했습니다.", "error");
      }
    },
    onError: (error: any) => {
      console.error("모델 백테스팅 오류:", error);
      showToast(
        error.message || "백테스팅 실행 중 알 수 없는 오류가 발생했습니다.",
        "error"
      );
    },
  });

  const handleModelParameterChange = (
    key: keyof ModelBacktestParameters,
    value: any
  ) => {
    setModelParameters((prev) => ({ ...prev, [key]: value }));
  };

  const handleRunModelBacktest = () => {
    // 입력값 검증
    if (
      !modelParameters.model_name ||
      modelParameters.model_name.trim() === ""
    ) {
      showToast("모델을 선택해주세요.", "warning");
      return;
    }

    if (
      modelParameters.window_size < 10 ||
      modelParameters.window_size > 1000
    ) {
      showToast("윈도우 크기는 10~1000 사이여야 합니다.", "warning");
      return;
    }

    if (modelParameters.z_threshold < 0.1 || modelParameters.z_threshold > 10) {
      showToast("Z-Threshold는 0.1~10 사이여야 합니다.", "warning");
      return;
    }

    if (
      modelParameters.max_records < 100 ||
      modelParameters.max_records > 5000
    ) {
      showToast("최대 레코드 수는 100~5000 사이여야 합니다.", "warning");
      return;
    }

    console.log("백테스팅 실행:", modelParameters);
    modelBacktestMutation.mutate(modelParameters);
  };

  // 실시간 백테스팅 시뮬레이션
  const startRealTimeSimulation = useCallback(() => {
    if (!modelResults || isProcessing) return;

    setIsProcessing(true);
    setCurrentIndex(0);

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = prev + 1;
        if (next >= modelResults.phase_angle_data.length) {
          clearInterval(interval);
          setIsProcessing(false);
          return prev;
        }

        // 불량 예측 감지는 useEffect에서 처리

        return next;
      });
    }, 100); // 100ms마다 다음 데이터 포인트로 이동
  }, [modelResults, isProcessing]);

  const stopRealTimeSimulation = useCallback(() => {
    setIsProcessing(false);
  }, []);

  const resetSimulation = useCallback(() => {
    setCurrentIndex(0);
    setIsProcessing(false);
    setPreviousDefectStates({}); // 불량 상태 초기화
  }, []);

  // 모델 목록 업데이트
  useEffect(() => {
    if (modelsData?.models) {
      setAvailableModels(modelsData.models);
    }
  }, [modelsData]);

  const { showToast } = useToast();

  // 이상치 감지 및 조정 함수
  const detectAndAdjustOutliers = useCallback(
    (values: number[], referenceValue: number) => {
      if (values.length === 0) return [];

      // IQR 방법으로 이상치 감지
      const sorted = values
        .filter((v) => v !== null && v !== undefined && !isNaN(v))
        .sort((a, b) => a - b);
      if (sorted.length === 0)
        return values.map((v) => ({
          value: v,
          isOutlier: false,
          originalValue: v,
        }));

      const q1 = sorted[Math.floor(sorted.length * 0.25)];
      const q3 = sorted[Math.floor(sorted.length * 0.75)];
      const iqr = q3 - q1;
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;

      // 기준값 기반 추가 조정
      const tolerance = Math.abs(referenceValue) * 0.5; // 기준값의 50% 허용
      const adjustedLowerBound = Math.max(
        lowerBound,
        referenceValue - tolerance
      );
      const adjustedUpperBound = Math.min(
        upperBound,
        referenceValue + tolerance
      );

      return values.map((value) => {
        if (value === null || value === undefined || isNaN(value)) {
          return {
            value: referenceValue,
            isOutlier: false,
            originalValue: value,
          };
        }

        const isOutlier =
          value < adjustedLowerBound || value > adjustedUpperBound;
        const adjustedValue = isOutlier
          ? Math.max(adjustedLowerBound, Math.min(adjustedUpperBound, value))
          : value;

        return {
          value: adjustedValue,
          isOutlier,
          originalValue: value,
        };
      });
    },
    []
  );

  // 차트 데이터 준비 (메모이제이션 적용)
  const chartData = useMemo(() => {
    if (!modelResults) return { lineData: [], barData: [], currentData: null };

    // 최대 60개 데이터로 제한 (슬라이딩 윈도우)
    const maxDataPoints = 60;
    const startIndex = Math.max(0, currentIndex + 1 - maxDataPoints);
    const visibleData = modelResults.phase_angle_data.slice(
      startIndex,
      currentIndex + 1
    );

    const lineData = visibleData.map((item, index) => {
      try {
        return {
          index: index + 1,
          timestamp: item.timestamp
            ? new Date(item.timestamp).toLocaleTimeString()
            : `Point ${index + 1}`,
          mean: typeof item.mean_value === "number" ? item.mean_value : 0,
          ppm: typeof item.predicted_ppm === "number" ? item.predicted_ppm : 0,
          std_dev: typeof item.std_dev === "number" ? item.std_dev : 0,
        };
      } catch (error) {
        console.warn(`Error processing line data at index ${index}:`, error);
        return {
          index: index + 1,
          timestamp: `Point ${index + 1}`,
          mean: 0,
          ppm: 0,
          std_dev: 0,
        };
      }
    });

    const barData = visibleData
      .map((item, index) => {
        try {
          if (
            item.ppm_slope !== null &&
            item.ppm_slope !== undefined &&
            typeof item.ppm_slope === "number"
          ) {
            return {
              index: index + 1,
              timestamp: item.timestamp
                ? new Date(item.timestamp).toLocaleTimeString()
                : `Point ${index + 1}`,
              slope: item.ppm_slope,
            };
          }
          return null;
        } catch (error) {
          console.warn(`Error processing bar data at index ${index}:`, error);
          return null;
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    // 6개 위상각별 차트 데이터 생성 (불량률 포함)
    const angleChartsData = [
      {
        name: "Phase Angle 1 (d072)",
        key: "angle_1",
        color: "#FF6B6B",
        angleIndex: 0,
        referenceValue: 52.08,
      },
      {
        name: "Phase Angle 2 (d077)",
        key: "angle_2",
        color: "#4ECDC4",
        angleIndex: 1,
        referenceValue: 52.08,
      },
      {
        name: "Phase Angle 5 (d082)",
        key: "angle_3",
        color: "#45B7D1",
        angleIndex: 2,
        referenceValue: -292.08,
      },
      {
        name: "Phase Angle 6 (d087)",
        key: "angle_4",
        color: "#96CEB4",
        angleIndex: 3,
        referenceValue: -292.08,
      },
      {
        name: "Phase Angle 3 (d092)",
        key: "angle_5",
        color: "#FFEAA7",
        angleIndex: 4,
        referenceValue: 172.08,
      },
      {
        name: "Phase Angle 4 (d097)",
        key: "angle_6",
        color: "#DDA0DD",
        angleIndex: 5,
        referenceValue: 172.08,
      },
    ].map((angleInfo) => {
      // 현재 각도의 모든 값 추출 및 이상치 처리
      const allValues = visibleData.map(
        (item) =>
          Number(item[angleInfo.key as keyof PhaseAngleData]) ||
          angleInfo.referenceValue
      );
      const adjustedValues = detectAndAdjustOutliers(
        allValues,
        angleInfo.referenceValue
      );

      return {
        ...angleInfo,
        data: visibleData.map((item, index) => {
          const originalValue =
            Number(item[angleInfo.key as keyof PhaseAngleData]) ||
            angleInfo.referenceValue;
          const adjustedData = adjustedValues[index];
          const value = adjustedData.value;

          const tolerance = 2.5;
          const deviation = Math.abs(value - angleInfo.referenceValue);
          const deviationRatio = deviation / tolerance;
          let defectRate = 0;

          if (deviationRatio <= 0.5) {
            defectRate = 0;
          } else if (deviationRatio <= 1.0) {
            defectRate = Math.min(5, deviationRatio * 5);
          } else if (deviationRatio <= 2.0) {
            defectRate = Math.min(25, 5 + (deviationRatio - 1) * 20);
          } else if (deviationRatio <= 4.0) {
            defectRate = Math.min(75, 25 + (deviationRatio - 2) * 25);
          } else {
            defectRate = Math.min(100, 75 + (deviationRatio - 4) * 6.25);
          }

          return {
            index: startIndex + index + 1, // 실제 인덱스 반영
            timestamp: item.timestamp
              ? new Date(item.timestamp).toLocaleTimeString()
              : `Point ${startIndex + index + 1}`,
            value: value,
            defectRate: Math.round(defectRate * 10) / 10,
            referenceValue: angleInfo.referenceValue,
            isOutlier: adjustedData.isOutlier,
            originalValue: adjustedData.originalValue,
          };
        }),
      };
    });

    // 현재 데이터는 전체 배열에서 가져오기
    const currentData = modelResults.phase_angle_data[currentIndex] || null;

    return { lineData, barData, currentData, angleChartsData };
  }, [modelResults, currentIndex, detectAndAdjustOutliers]);

  // 실제 기준값에 따른 위상각 상태 계산 함수
  const calculateAngleStatus = useCallback(
    (value: number, angleIndex: number) => {
      if (value === null || value === undefined)
        return {
          status: "unknown",
          severity: 0,
          color: "#666",
          deviation: "0",
          defectRate: 0,
          referenceValue: 0,
          deviationRatio: "0",
        };

      // 실제 기준값 (중앙값) - 문서 기준 정확한 매핑
      const referenceValues = [52.08, 52.08, -292.08, -292.08, 172.08, 172.08];
      const tolerance = 2.5; // 허용 오차 범위 ±2.5

      const referenceValue = referenceValues[angleIndex] || 0;
      const deviation = Math.abs(value - referenceValue);
      const deviationRatio = deviation / tolerance; // 허용 오차 대비 편차 비율

      let status: string;
      let severity: number;
      let color: string;
      let defectRate: number; // 불량률 (0-100%)

      if (deviationRatio <= 0.5) {
        status = "excellent";
        severity = 1;
        color = "#4CAF50"; // 녹색
        defectRate = 0;
      } else if (deviationRatio <= 1.0) {
        status = "good";
        severity = 2;
        color = "#8BC34A"; // 연녹색
        defectRate = Math.min(5, deviationRatio * 5);
      } else if (deviationRatio <= 2.0) {
        status = "warning";
        severity = 3;
        color = "#FF9800"; // 주황색
        defectRate = Math.min(25, 5 + (deviationRatio - 1) * 20);
      } else if (deviationRatio <= 4.0) {
        status = "critical";
        severity = 4;
        color = "#f44336"; // 빨간색
        defectRate = Math.min(75, 25 + (deviationRatio - 2) * 25);
      } else {
        status = "severe";
        severity = 5;
        color = "#8B0000"; // 진한 빨간색
        defectRate = Math.min(100, 75 + (deviationRatio - 4) * 6.25);
      }

      return {
        status,
        severity,
        color,
        deviation: deviation.toFixed(3),
        defectRate: Math.round(defectRate * 10) / 10, // 소수점 첫째자리까지
        referenceValue,
        deviationRatio: deviationRatio.toFixed(2),
      };
    },
    []
  );

  // 불량 예측 감지 및 토스트 알림 함수
  const checkAndNotifyDefects = useCallback(
    (currentData: PhaseAngleData, modelName: string) => {
      if (!currentData) return;

      const angles = [
        {
          name: "Phase Angle 1",
          key: "angle_1",
          column: "d072",
          value: currentData.angle_1,
          angleIndex: 0,
        },
        {
          name: "Phase Angle 2",
          key: "angle_2",
          column: "d077",
          value: currentData.angle_2,
          angleIndex: 1,
        },
        {
          name: "Phase Angle 5",
          key: "angle_3",
          column: "d082",
          value: currentData.angle_3,
          angleIndex: 2,
        },
        {
          name: "Phase Angle 6",
          key: "angle_4",
          column: "d087",
          value: currentData.angle_4,
          angleIndex: 3,
        },
        {
          name: "Phase Angle 3",
          key: "angle_5",
          column: "d092",
          value: currentData.angle_5,
          angleIndex: 4,
        },
        {
          name: "Phase Angle 4",
          key: "angle_6",
          column: "d097",
          value: currentData.angle_6,
          angleIndex: 5,
        },
      ];

      angles.forEach((angle) => {
        if (angle.value === null || angle.value === undefined) return;

        const status = calculateAngleStatus(angle.value, angle.angleIndex);
        const defectRisk = status.defectRate;
        const isDefectPredicted = status.severity >= 3 || defectRisk > 10; // warning 이상 또는 10% 이상 불량률
        const stateKey = `${modelName}_${angle.column}`;

        // 이전 상태와 비교하여 새로운 불량 예측인지 확인
        if (isDefectPredicted && !previousDefectStates[stateKey]) {
          let toastType: "warning" | "error" = "warning";
          let severityText = "";
          let riskLevel = "";

          // 심각도에 따른 분류
          if (status.severity >= 5 || defectRisk > 50) {
            toastType = "error";
            severityText = "CRITICAL";
            riskLevel = "즉시 조치 필요";
          } else if (status.severity >= 4 || defectRisk > 25) {
            toastType = "error";
            severityText = "HIGH RISK";
            riskLevel = "긴급 점검 권장";
          } else {
            severityText = "WARNING";
            riskLevel = "모니터링 강화";
          }

          const message = `⚠ ${modelName} | ${angle.name} (${angle.column})
불량률: ${defectRisk.toFixed(1)}% | ${severityText}
기준값: ${status.referenceValue} | 편차: ±${status.deviation} | ${riskLevel}`;

          showToast(message, toastType);
        }

        // 상태 업데이트
        setPreviousDefectStates((prev) => ({
          ...prev,
          [stateKey]: isDefectPredicted,
        }));
      });
    },
    [calculateAngleStatus, showToast] // previousDefectStates 의존성 제거로 무한 루프 방지
  );

  // 불량 예측 감지 (currentIndex 변경 시)
  useEffect(() => {
    if (
      modelResults &&
      isProcessing &&
      currentIndex > 0 &&
      modelParameters.model_name
    ) {
      const currentData = modelResults.phase_angle_data[currentIndex];
      if (currentData) {
        checkAndNotifyDefects(currentData, modelParameters.model_name);
      }
    }
  }, [
    currentIndex,
    modelResults,
    isProcessing,
    modelParameters.model_name,
    checkAndNotifyDefects,
  ]);

  // 6개 위상각 데이터 준비 (메모이제이션 적용)
  const phaseAngleData = useMemo(() => {
    if (!modelResults || currentIndex >= modelResults.phase_angle_data.length) {
      return [];
    }

    const currentData = modelResults.phase_angle_data[currentIndex];

    return [
      {
        name: "Phase Angle 1",
        value: currentData.angle_1,
        column: "d072",
        status: calculateAngleStatus(currentData.angle_1 || 0, 0),
      },
      {
        name: "Phase Angle 2",
        value: currentData.angle_2,
        column: "d077",
        status: calculateAngleStatus(currentData.angle_2 || 0, 1),
      },
      {
        name: "Phase Angle 5",
        value: currentData.angle_3,
        column: "d082",
        status: calculateAngleStatus(currentData.angle_3 || 0, 2),
      },
      {
        name: "Phase Angle 6",
        value: currentData.angle_4,
        column: "d087",
        status: calculateAngleStatus(currentData.angle_4 || 0, 3),
      },
      {
        name: "Phase Angle 3",
        value: currentData.angle_5,
        column: "d092",
        status: calculateAngleStatus(currentData.angle_5 || 0, 4),
      },
      {
        name: "Phase Angle 4",
        value: currentData.angle_6,
        column: "d097",
        status: calculateAngleStatus(currentData.angle_6 || 0, 5),
      },
    ].filter((item) => item.value !== null && item.value !== undefined);
  }, [modelResults, currentIndex, calculateAngleStatus]);

  const { lineData, barData, currentData, angleChartsData } = chartData;

  return (
    <div
      style={{
        padding: "16px 0",
        background: "#1a1a1a",
        borderRadius: "8px",
        margin: "12px 0",
        minHeight: "95vh",
        width: "100%",
      }}
    >
      <h2 style={{ color: "#fff", marginBottom: "20px", padding: "0 20px" }}>
        ▦ Model-based Real-time Phase Angle Backtesting
      </h2>

      {/* 모델 설정 패널 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "15px",
          marginBottom: "20px",
          padding: "15px",
          background: "#2a2a2a",
          borderRadius: "8px",
          margin: "0 20px 20px 20px",
        }}
      >
        <div>
          <label
            style={{ color: "#ccc", display: "block", marginBottom: "5px" }}
          >
            Model
          </label>
          <select
            value={modelParameters.model_name}
            onChange={(e) =>
              handleModelParameterChange("model_name", e.target.value)
            }
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #555",
              background: "#3a3a3a",
              color: "#fff",
            }}
          >
            <option value="">Select Model...</option>
            {availableModels.map((model) => (
              <option key={model.model_name} value={model.model_name}>
                {model.display_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            style={{ color: "#ccc", display: "block", marginBottom: "5px" }}
          >
            Window Size
          </label>
          <input
            type="number"
            value={modelParameters.window_size}
            onChange={(e) =>
              handleModelParameterChange(
                "window_size",
                parseInt(e.target.value)
              )
            }
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #555",
              background: "#3a3a3a",
              color: "#fff",
            }}
          />
        </div>

        <div>
          <label
            style={{ color: "#ccc", display: "block", marginBottom: "5px" }}
          >
            Z-Threshold
          </label>
          <input
            type="number"
            step="0.1"
            value={modelParameters.z_threshold}
            onChange={(e) =>
              handleModelParameterChange(
                "z_threshold",
                parseFloat(e.target.value)
              )
            }
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #555",
              background: "#3a3a3a",
              color: "#fff",
            }}
          />
        </div>

        <div>
          <label
            style={{ color: "#ccc", display: "block", marginBottom: "5px" }}
          >
            Max Records
          </label>
          <input
            type="number"
            value={modelParameters.max_records}
            onChange={(e) =>
              handleModelParameterChange(
                "max_records",
                parseInt(e.target.value)
              )
            }
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #555",
              background: "#3a3a3a",
              color: "#fff",
            }}
          />
        </div>
      </div>

      {/* 컨트롤 버튼 */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "20px",
          alignItems: "center",
          padding: "0 20px",
        }}
      >
        <button
          onClick={handleRunModelBacktest}
          disabled={
            modelBacktestMutation.isPending || !modelParameters.model_name
          }
          style={{
            padding: "12px 24px",
            background: modelBacktestMutation.isPending
              ? "#2a2a2a"
              : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "#fff",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "8px",
            cursor: modelBacktestMutation.isPending ? "not-allowed" : "pointer",
            fontSize: "14px",
            fontWeight: "500",
            transition: "all 0.3s ease",
            boxShadow: modelBacktestMutation.isPending
              ? "none"
              : "0 4px 15px rgba(102, 126, 234, 0.4)",
          }}
        >
          {modelBacktestMutation.isPending
            ? "↻ Loading Data..."
            : "↻ Load Model Data"}
        </button>

        {modelResults && (
          <>
            <button
              onClick={startRealTimeSimulation}
              disabled={isProcessing}
              style={{
                padding: "12px 24px",
                background: isProcessing
                  ? "#2a2a2a"
                  : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "#fff",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "8px",
                cursor: isProcessing ? "not-allowed" : "pointer",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.3s ease",
                boxShadow: isProcessing
                  ? "none"
                  : "0 4px 15px rgba(102, 126, 234, 0.4)",
              }}
            >
              ▷ Start Simulation
            </button>

            <button
              onClick={stopRealTimeSimulation}
              disabled={!isProcessing}
              style={{
                padding: "12px 24px",
                background: !isProcessing
                  ? "#2a2a2a"
                  : "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                color: "#fff",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "8px",
                cursor: !isProcessing ? "not-allowed" : "pointer",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.3s ease",
                boxShadow: !isProcessing
                  ? "none"
                  : "0 4px 15px rgba(240, 147, 251, 0.4)",
              }}
            >
              ⏸ Pause
            </button>

            <button
              onClick={resetSimulation}
              style={{
                padding: "12px 24px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "#fff",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                transition: "all 0.3s ease",
                boxShadow: "0 4px 15px rgba(102, 126, 234, 0.4)",
              }}
            >
              ↺ Reset
            </button>

            {/* 진행률 표시 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginLeft: "20px",
                color: "#ccc",
                fontSize: "14px",
              }}
            >
              Progress: {currentIndex + 1} / {modelResults.processed_records}(
              {Math.round(
                ((currentIndex + 1) / modelResults.processed_records) * 100
              )}
              %)
            </div>
          </>
        )}
      </div>

      {/* 결과 표시 영역 */}
      {modelResults && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "3fr 1fr",
            gap: "24px",
            width: "100%",
            padding: "0 20px",
          }}
        >
          {/* 좌측: 차트 영역 */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
            {/* 6개 위상각 개별 차트 그리드 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "20px",
                height: "500px",
              }}
            >
              {angleChartsData?.map((angleChart, index) => (
                <PhaseAngleChart
                  key={`${angleChart.name}-${index}`}
                  name={angleChart.name}
                  data={angleChart.data}
                  color={angleChart.color}
                />
              ))}
            </div>

            {/* Mean & PPM 전체 트렌드 */}
            <OverallTrendChart data={lineData} />

            {/* PPM 기울기 바 차트 */}
            <PPMSlopeChart data={barData} />
          </div>

          {/* 우측: 위상각 데이터 & 현재 상태 */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
            {/* 현재 데이터 정보 */}
            {currentData && <CurrentDataPoint currentData={currentData} />}

            {/* 6개 위상각 값들 및 상태 */}
            {currentData && (
              <PhaseAngleStatus
                currentData={currentData}
                phaseAngleData={phaseAngleData}
              />
            )}

            {/* 성능 지표 */}
            {modelResults.performance_metrics && (
              <PerformanceMetrics
                modelResults={modelResults}
                phaseAngleData={phaseAngleData}
              />
            )}
          </div>
        </div>
      )}

      {modelBacktestMutation.isError && (
        <div
          style={{
            marginTop: "15px",
            padding: "12px",
            background: "#d32f2f",
            color: "#fff",
            borderRadius: "4px",
          }}
        >
          백테스팅 실행 중 오류가 발생했습니다.
        </div>
      )}
    </div>
  );
};

export default BacktestingPanel;
