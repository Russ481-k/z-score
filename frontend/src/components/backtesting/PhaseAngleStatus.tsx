"use client";

import React, { memo } from "react";

interface PhaseAngleData {
  timestamp: string;
  barcode: string;
  angle_1?: number;
  angle_2?: number;
  angle_3?: number;
  angle_4?: number;
  angle_5?: number;
  angle_6?: number;
  mean_value: number;
  std_dev: number;
  predicted_ppm: number;
  ppm_slope?: number;
  quality_status: string;
  defect_probability: number;
}

interface AngleStatus {
  status: string;
  severity: number;
  color: string;
  deviation: string;
  defectRate: number;
  referenceValue: number;
  deviationRatio: string;
}

interface PhaseAngle {
  name: string;
  value: number | undefined;
  column: string;
  status: AngleStatus;
}

interface PhaseAngleStatusProps {
  currentData: PhaseAngleData;
  phaseAngleData: PhaseAngle[];
}

const PhaseAngleStatus: React.FC<PhaseAngleStatusProps> = memo(
  ({ currentData, phaseAngleData }) => {
    return (
      <div
        style={{
          background: "#2a2a2a",
          borderRadius: "8px",
          padding: "15px",
          flex: 1,
        }}
      >
        <h3
          style={{
            color: "#fff",
            marginBottom: "15px",
            fontSize: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          ▦ 6 Phase Angles & Status
          <span
            style={{
              fontSize: "12px",
              color: "#9CA3AF",
              cursor: "help",
            }}
            title="Real-time monitoring of 6 camshaft phase angles with status indicators. Each angle has reference values and tolerance ranges for quality assessment."
          >
            ℹ️
          </span>
        </h3>

        {/* 전체 상태 표시 - 프론트엔드에서 계산된 값 사용 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 12px",
            background: (() => {
              // 위상각 상태를 기반으로 전체 상태 결정
              const avgDefectRate =
                phaseAngleData.length > 0
                  ? phaseAngleData.reduce(
                      (sum, angle) => sum + angle.status.defectRate,
                      0
                    ) / phaseAngleData.length
                  : 0;
              const maxSeverity =
                phaseAngleData.length > 0
                  ? Math.max(
                      ...phaseAngleData.map((angle) => angle.status.severity)
                    )
                  : 0;

              if (maxSeverity >= 4 || avgDefectRate > 50) return "#B71C1C"; // CRITICAL
              if (maxSeverity >= 3 || avgDefectRate > 15) return "#E65100"; // WARNING
              return "#1B5E20"; // OK
            })(),
            borderRadius: "6px",
            marginBottom: "12px",
            fontSize: "14px",
            fontWeight: "bold",
          }}
        >
          <span style={{ color: "#fff" }}>
            Status:{" "}
            {(() => {
              const avgDefectRate =
                phaseAngleData.length > 0
                  ? phaseAngleData.reduce(
                      (sum, angle) => sum + angle.status.defectRate,
                      0
                    ) / phaseAngleData.length
                  : 0;
              const maxSeverity =
                phaseAngleData.length > 0
                  ? Math.max(
                      ...phaseAngleData.map((angle) => angle.status.severity)
                    )
                  : 0;

              if (maxSeverity >= 4 || avgDefectRate > 50) return "CRITICAL";
              if (maxSeverity >= 3 || avgDefectRate > 15) return "WARNING";
              return "OK";
            })()}
          </span>
          <span style={{ color: "#fff" }}>
            Defect Risk:{" "}
            {phaseAngleData.length > 0
              ? (
                  phaseAngleData.reduce(
                    (sum, angle) => sum + angle.status.defectRate,
                    0
                  ) / phaseAngleData.length
                ).toFixed(1)
              : "0.0"}
            %
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "6px",
          }}
        >
          {phaseAngleData.map((angle, index) => {
            const isOutOfRange =
              angle.value !== null &&
              angle.value !== undefined &&
              (angle.value < -500 || angle.value > 500);

            const statusColor = angle.status.color;
            const severity = angle.status.severity;
            const deviation = angle.status.deviation;

            // 심각도에 따른 배경 색상 및 스타일
            const getBackgroundStyle = () => {
              switch (severity) {
                case 1:
                  return {
                    background: "rgba(76, 175, 80, 0.1)",
                    border: "1px solid rgba(76, 175, 80, 0.3)",
                  };
                case 2:
                  return {
                    background: "rgba(139, 195, 74, 0.1)",
                    border: "1px solid rgba(139, 195, 74, 0.3)",
                  };
                case 3:
                  return {
                    background: "rgba(255, 152, 0, 0.1)",
                    border: "1px solid rgba(255, 152, 0, 0.3)",
                  };
                case 4:
                  return {
                    background: "rgba(244, 67, 54, 0.1)",
                    border: "1px solid rgba(244, 67, 54, 0.3)",
                  };
                case 5:
                  return {
                    background: "rgba(139, 0, 0, 0.2)",
                    border: "1px solid rgba(139, 0, 0, 0.5)",
                  };
                default:
                  return { background: "#3a3a3a", border: "none" };
              }
            };

            const backgroundStyle = getBackgroundStyle();

            return (
              <div
                key={index}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  transition: "all 0.3s ease",
                  ...backgroundStyle,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                  }}
                >
                  <span
                    style={{
                      color: "#ccc",
                      fontSize: "11px",
                      fontWeight: "500",
                    }}
                  >
                    {angle.name} ({angle.column})
                  </span>
                  <span style={{ color: "#888", fontSize: "9px" }}>
                    기준값: {angle.status.referenceValue} | 편차: ±{deviation} |
                    불량률: {angle.status.defectRate}%
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flexDirection: "column",
                  }}
                >
                  <span
                    style={{
                      color: statusColor,
                      fontWeight: "bold",
                      fontFamily: "monospace",
                      fontSize: "12px",
                    }}
                  >
                    {angle.value?.toFixed(2) || "N/A"}
                  </span>
                  <div
                    style={{
                      width: "20px",
                      height: "4px",
                      borderRadius: "2px",
                      background: `linear-gradient(90deg, ${statusColor}33 0%, ${statusColor} 100%)`,
                    }}
                  />
                  {(isOutOfRange || severity >= 4) && (
                    <span style={{ color: statusColor, fontSize: "10px" }}>
                      {severity >= 5 ? "●" : severity >= 4 ? "▲" : "○"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

PhaseAngleStatus.displayName = "PhaseAngleStatus";

export default PhaseAngleStatus;
