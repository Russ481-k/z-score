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

interface PerformanceMetricsProps {
  modelResults: ModelBacktestResult;
  phaseAngleData: PhaseAngle[];
}

const PerformanceMetrics: React.FC<PerformanceMetricsProps> = memo(
  ({ modelResults, phaseAngleData }) => {
    return (
      <div
        style={{
          background: "#2a2a2a",
          borderRadius: "8px",
          padding: "15px",
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
          ▦ Performance Metrics
          <span
            style={{
              fontSize: "12px",
              color: "#9CA3AF",
              cursor: "help",
            }}
            title="Overall performance statistics for the backtesting analysis, including PPM (Parts Per Million defect rate), slope trends, and quality distribution"
          >
            ℹ️
          </span>
        </h3>
        <div style={{ color: "#ccc", fontSize: "13px" }}>
          <div
            style={{
              marginBottom: "6px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <strong>Avg PPM:</strong>{" "}
            {modelResults.performance_metrics.avg_ppm.toFixed(2)}
            <span
              style={{
                fontSize: "10px",
                color: "#9CA3AF",
                cursor: "help",
              }}
              title="Average Parts Per Million defect rate across all analyzed data points"
            >
              ℹ️
            </span>
          </div>
          <div
            style={{
              marginBottom: "6px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <strong>Max PPM:</strong>{" "}
            {modelResults.performance_metrics.max_ppm.toFixed(2)}
            <span
              style={{
                fontSize: "10px",
                color: "#9CA3AF",
                cursor: "help",
              }}
              title="Highest PPM value detected in the dataset - indicates worst quality period"
            >
              ℹ️
            </span>
          </div>
          <div
            style={{
              marginBottom: "6px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <strong>Min PPM:</strong>{" "}
            {modelResults.performance_metrics.min_ppm.toFixed(2)}
            <span
              style={{
                fontSize: "10px",
                color: "#9CA3AF",
                cursor: "help",
              }}
              title="Lowest PPM value detected in the dataset - indicates best quality period"
            >
              ℹ️
            </span>
          </div>
          <div
            style={{
              marginBottom: "6px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <strong>Avg Slope:</strong>{" "}
            {modelResults.performance_metrics.avg_slope.toFixed(4)}
            <span
              style={{
                fontSize: "10px",
                color: "#9CA3AF",
                cursor: "help",
              }}
              title="Average slope of PPM trend - positive values indicate deteriorating quality, negative values indicate improving quality"
            >
              ℹ️
            </span>
          </div>

          {/* 품질 상태 분포 */}
          <div
            style={{
              marginTop: "12px",
              paddingTop: "8px",
              borderTop: "1px solid #555",
            }}
          >
            <div
              style={{
                marginBottom: "4px",
                fontSize: "12px",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              Quality Distribution:
              <span
                style={{
                  fontSize: "10px",
                  color: "#9CA3AF",
                  cursor: "help",
                }}
                title="Distribution of quality statuses across all data points: OK (normal), WARNING (attention needed), CRITICAL (immediate action required)"
              >
                ℹ️
              </span>
            </div>
            {(() => {
              const statusCounts = modelResults.phase_angle_data.reduce(
                (acc: any, item: PhaseAngleData) => {
                  acc[item.quality_status] =
                    (acc[item.quality_status] || 0) + 1;
                  return acc;
                },
                {}
              );
              const total = modelResults.phase_angle_data.length;

              return Object.entries(statusCounts).map(
                ([status, count]: [string, any]) => (
                  <div
                    key={status}
                    style={{ fontSize: "11px", marginBottom: "2px" }}
                  >
                    <span
                      style={{
                        color:
                          status === "OK"
                            ? "#4CAF50"
                            : status === "WARNING"
                            ? "#FF9800"
                            : status === "CRITICAL"
                            ? "#f44336"
                            : "#999",
                      }}
                    >
                      {status}: {count} ({((count / total) * 100).toFixed(1)}%)
                    </span>
                  </div>
                )
              );
            })()}
          </div>

          {/* 현재 위상각 상태 요약 */}
          {phaseAngleData.length > 0 && (
            <div
              style={{
                marginTop: "12px",
                paddingTop: "8px",
                borderTop: "1px solid #555",
              }}
            >
              <div
                style={{
                  marginBottom: "6px",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
              >
                Current Angle Status:
              </div>
              {(() => {
                const angleStatusCounts = phaseAngleData.reduce(
                  (acc: any, angle: any) => {
                    const status = angle.status.status;
                    acc[status] = (acc[status] || 0) + 1;
                    return acc;
                  },
                  {}
                );

                const statusColors: { [key: string]: string } = {
                  excellent: "#4CAF50",
                  good: "#8BC34A",
                  warning: "#FF9800",
                  critical: "#f44336",
                  severe: "#8B0000",
                };

                return Object.entries(angleStatusCounts).map(
                  ([status, count]: [string, any]) => (
                    <div
                      key={status}
                      style={{
                        fontSize: "10px",
                        marginBottom: "2px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <div
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: statusColors[status] || "#999",
                        }}
                      />
                      <span style={{ color: "#ccc" }}>
                        {status}: {count}/6
                      </span>
                    </div>
                  )
                );
              })()}
            </div>
          )}
        </div>
      </div>
    );
  }
);

PerformanceMetrics.displayName = "PerformanceMetrics";

export default PerformanceMetrics;
