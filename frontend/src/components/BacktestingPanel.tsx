"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

interface BacktestParameters {
  start_date: string;
  end_date: string;
  cam_numbers: number[];
  metrics: string[];
  window_size: number;
  z_threshold: number;
  prediction_horizon: number;
}

interface BacktestResult {
  cam_number: number;
  metric: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  mae: number;
  rmse: number;
  total_predictions: number;
  true_positives: number;
  false_positives: number;
  true_negatives: number;
  false_negatives: number;
}

const BacktestingPanel: React.FC = () => {
  const [parameters, setParameters] = useState<BacktestParameters>({
    start_date: "2024-01-01",
    end_date: "2024-12-31",
    cam_numbers: [1, 2, 3, 5, 7, 8, 9], // torque 데이터가 있는 캠만 선택
    metrics: ["torque"], // angle 데이터가 부족하므로 torque만
    window_size: 50, // 100 -> 50으로 줄임
    z_threshold: 3.0,
    prediction_horizon: 5, // 10 -> 5로 줄임 (총 필요: 55개)
  });

  const [results, setResults] = useState<BacktestResult[]>([]);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const backtestMutation = useMutation({
    mutationFn: async (params: BacktestParameters) => {
      const response = await apiClient.post("/backtest/run", params);
      return response.data;
    },
    onSuccess: (data) => {
      setResults(data.results);
      setDebugInfo(data.debug_info); // 디버그 정보 저장
      console.log("백테스팅 응답:", data); // 전체 응답 로그
    },
  });

  const handleParameterChange = (key: keyof BacktestParameters, value: any) => {
    setParameters((prev) => ({ ...prev, [key]: value }));
  };

  const handleRunBacktest = () => {
    backtestMutation.mutate(parameters);
  };

  return (
    <div
      style={{
        padding: "20px",
        background: "#1a1a1a",
        borderRadius: "8px",
        margin: "20px 0",
      }}
    >
      <h2 style={{ color: "#fff", marginBottom: "20px" }}>백테스팅 설정</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "15px",
          marginBottom: "20px",
        }}
      >
        <div>
          <label
            style={{ color: "#ccc", display: "block", marginBottom: "5px" }}
          >
            시작일
          </label>
          <input
            type="date"
            value={parameters.start_date}
            onChange={(e) =>
              handleParameterChange("start_date", e.target.value)
            }
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #555",
              background: "#2a2a2a",
              color: "#fff",
            }}
          />
        </div>

        <div>
          <label
            style={{ color: "#ccc", display: "block", marginBottom: "5px" }}
          >
            종료일
          </label>
          <input
            type="date"
            value={parameters.end_date}
            onChange={(e) => handleParameterChange("end_date", e.target.value)}
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #555",
              background: "#2a2a2a",
              color: "#fff",
            }}
          />
        </div>

        <div>
          <label
            style={{ color: "#ccc", display: "block", marginBottom: "5px" }}
          >
            윈도우 크기
          </label>
          <input
            type="number"
            value={parameters.window_size}
            onChange={(e) =>
              handleParameterChange("window_size", parseInt(e.target.value))
            }
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #555",
              background: "#2a2a2a",
              color: "#fff",
            }}
          />
        </div>

        <div>
          <label
            style={{ color: "#ccc", display: "block", marginBottom: "5px" }}
          >
            Z-Score 임계값
          </label>
          <input
            type="number"
            step="0.1"
            value={parameters.z_threshold}
            onChange={(e) =>
              handleParameterChange("z_threshold", parseFloat(e.target.value))
            }
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #555",
              background: "#2a2a2a",
              color: "#fff",
            }}
          />
        </div>

        <div>
          <label
            style={{ color: "#ccc", display: "block", marginBottom: "5px" }}
          >
            예측 범위
          </label>
          <input
            type="number"
            value={parameters.prediction_horizon}
            onChange={(e) =>
              handleParameterChange(
                "prediction_horizon",
                parseInt(e.target.value)
              )
            }
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #555",
              background: "#2a2a2a",
              color: "#fff",
            }}
          />
        </div>

        <div>
          <label
            style={{ color: "#ccc", display: "block", marginBottom: "5px" }}
          >
            캠 선택
          </label>
          <select
            multiple
            value={parameters.cam_numbers.map(String)}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, (option) =>
                parseInt(option.value)
              );
              handleParameterChange("cam_numbers", selected);
            }}
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #555",
              background: "#2a2a2a",
              color: "#fff",
            }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((cam) => (
              <option key={cam} value={cam}>
                CAM {cam}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={handleRunBacktest}
        disabled={backtestMutation.isPending}
        style={{
          padding: "12px 24px",
          background: backtestMutation.isPending ? "#555" : "#4CAF50",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: backtestMutation.isPending ? "not-allowed" : "pointer",
          fontSize: "16px",
          marginRight: "10px",
        }}
      >
        {backtestMutation.isPending ? "백테스팅 진행 중..." : "백테스팅 실행"}
      </button>

      <button
        onClick={() => {
          setParameters({
            ...parameters,
            window_size: 20,
            prediction_horizon: 3,
            cam_numbers: [1, 2, 3], // 데이터가 있는 몇 개 캠만
          });
        }}
        style={{
          padding: "12px 24px",
          background: "#2196F3",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "16px",
        }}
      >
        빠른 테스트 (최소 23개 데이터 필요)
      </button>

      {/* 디버그 정보 표시 */}
      {debugInfo && debugInfo.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <h3 style={{ color: "#fff", marginBottom: "15px" }}>디버그 정보</h3>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                background: "#2a2a2a",
              }}
            >
              <thead>
                <tr style={{ background: "#3a3a3a" }}>
                  <th
                    style={{
                      padding: "8px",
                      color: "#fff",
                      border: "1px solid #555",
                    }}
                  >
                    CAM
                  </th>
                  <th
                    style={{
                      padding: "8px",
                      color: "#fff",
                      border: "1px solid #555",
                    }}
                  >
                    메트릭
                  </th>
                  <th
                    style={{
                      padding: "8px",
                      color: "#fff",
                      border: "1px solid #555",
                    }}
                  >
                    데이터 수
                  </th>
                  <th
                    style={{
                      padding: "8px",
                      color: "#fff",
                      border: "1px solid #555",
                    }}
                  >
                    필요 최소값
                  </th>
                  <th
                    style={{
                      padding: "8px",
                      color: "#fff",
                      border: "1px solid #555",
                    }}
                  >
                    상태
                  </th>
                </tr>
              </thead>
              <tbody>
                {debugInfo.map((debug: any, index: number) => (
                  <tr key={index}>
                    <td
                      style={{
                        padding: "6px",
                        color: "#ccc",
                        border: "1px solid #555",
                      }}
                    >
                      CAM {debug.cam_number}
                    </td>
                    <td
                      style={{
                        padding: "6px",
                        color: "#ccc",
                        border: "1px solid #555",
                      }}
                    >
                      {debug.metric}
                    </td>
                    <td
                      style={{
                        padding: "6px",
                        color: "#ccc",
                        border: "1px solid #555",
                      }}
                    >
                      {debug.data_count}
                    </td>
                    <td
                      style={{
                        padding: "6px",
                        color: "#ccc",
                        border: "1px solid #555",
                      }}
                    >
                      {debug.required_minimum}
                    </td>
                    <td
                      style={{
                        padding: "6px",
                        color:
                          debug.status === "success"
                            ? "#4CAF50"
                            : debug.status.includes("error")
                            ? "#f44336"
                            : "#ff9800",
                        border: "1px solid #555",
                        fontSize: "12px",
                      }}
                    >
                      {debug.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div style={{ marginTop: "30px" }}>
          <h3 style={{ color: "#fff", marginBottom: "15px" }}>백테스팅 결과</h3>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                background: "#2a2a2a",
              }}
            >
              <thead>
                <tr style={{ background: "#3a3a3a" }}>
                  <th
                    style={{
                      padding: "12px",
                      color: "#fff",
                      border: "1px solid #555",
                    }}
                  >
                    CAM
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      color: "#fff",
                      border: "1px solid #555",
                    }}
                  >
                    메트릭
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      color: "#fff",
                      border: "1px solid #555",
                    }}
                  >
                    정확도
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      color: "#fff",
                      border: "1px solid #555",
                    }}
                  >
                    정밀도
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      color: "#fff",
                      border: "1px solid #555",
                    }}
                  >
                    재현율
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      color: "#fff",
                      border: "1px solid #555",
                    }}
                  >
                    F1-Score
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      color: "#fff",
                      border: "1px solid #555",
                    }}
                  >
                    MAE
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      color: "#fff",
                      border: "1px solid #555",
                    }}
                  >
                    RMSE
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      color: "#fff",
                      border: "1px solid #555",
                    }}
                  >
                    예측 수
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={index}>
                    <td
                      style={{
                        padding: "8px",
                        color: "#ccc",
                        border: "1px solid #555",
                      }}
                    >
                      CAM {result.cam_number}
                    </td>
                    <td
                      style={{
                        padding: "8px",
                        color: "#ccc",
                        border: "1px solid #555",
                      }}
                    >
                      {result.metric}
                    </td>
                    <td
                      style={{
                        padding: "8px",
                        color: "#ccc",
                        border: "1px solid #555",
                      }}
                    >
                      {(result.accuracy * 100).toFixed(1)}%
                    </td>
                    <td
                      style={{
                        padding: "8px",
                        color: "#ccc",
                        border: "1px solid #555",
                      }}
                    >
                      {(result.precision * 100).toFixed(1)}%
                    </td>
                    <td
                      style={{
                        padding: "8px",
                        color: "#ccc",
                        border: "1px solid #555",
                      }}
                    >
                      {(result.recall * 100).toFixed(1)}%
                    </td>
                    <td
                      style={{
                        padding: "8px",
                        color: "#ccc",
                        border: "1px solid #555",
                      }}
                    >
                      {(result.f1_score * 100).toFixed(1)}%
                    </td>
                    <td
                      style={{
                        padding: "8px",
                        color: "#ccc",
                        border: "1px solid #555",
                      }}
                    >
                      {result.mae.toFixed(3)}
                    </td>
                    <td
                      style={{
                        padding: "8px",
                        color: "#ccc",
                        border: "1px solid #555",
                      }}
                    >
                      {result.rmse.toFixed(3)}
                    </td>
                    <td
                      style={{
                        padding: "8px",
                        color: "#ccc",
                        border: "1px solid #555",
                      }}
                    >
                      {result.total_predictions}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {backtestMutation.isError && (
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
