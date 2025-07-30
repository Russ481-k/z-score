"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import { useState, useEffect, memo } from "react";
import { useChartData, ChartDataPoint } from "@/hooks/useChartData";
import { useQueryClient } from "@tanstack/react-query";
import { socket } from "@/lib/socket";

const PPM_ALARM_THRESHOLD = 500;
const PPM_WARNING_THRESHOLD = 400;

const PpmChart = memo(function PpmChart() {
  const queryClient = useQueryClient();
  const [metric, setMetric] = useState<"angle" | "torque">("angle");
  const [camNumber, setCamNumber] = useState(1);
  // 각 CAM별 데이터 조회
  const { data: angleData1 } = useChartData({
    startDate: "",
    endDate: "",
    metric: "angle",
    camNumber: 1,
  });
  const { data: torqueData1 } = useChartData({
    startDate: "",
    endDate: "",
    metric: "torque",
    camNumber: 1,
  });

  const { data: angleData4 } = useChartData({
    startDate: "",
    endDate: "",
    metric: "angle",
    camNumber: 4,
  });
  const { data: torqueData4 } = useChartData({
    startDate: "",
    endDate: "",
    metric: "torque",
    camNumber: 4,
  });

  const { data: angleData8 } = useChartData({
    startDate: "",
    endDate: "",
    metric: "angle",
    camNumber: 8,
  });
  const { data: torqueData8 } = useChartData({
    startDate: "",
    endDate: "",
    metric: "torque",
    camNumber: 8,
  });

  useEffect(() => {
    const handleAnalysisUpdate = (newPoint: ChartDataPoint) => {
      queryClient.setQueryData(
        ["chartData", { startDate: "", endDate: "", metric, camNumber }],
        (oldData: ChartDataPoint[] | undefined) => {
          // oldData가 없거나 배열이 아닌 경우 새로운 배열로 시작
          if (!oldData || !Array.isArray(oldData)) return [newPoint];

          // 데이터가 너무 많아지지 않도록 100개로 제한
          const newData = [...oldData, newPoint];
          return newData.slice(-100);
        }
      );
    };

    socket.on("analysis_updated", handleAnalysisUpdate);

    return () => {
      socket.off("analysis_updated", handleAnalysisUpdate);
    };
  }, [queryClient, metric, camNumber]);

  // 현재 선택된 메트릭과 CAM에 따라 데이터 선택
  const getCurrentData = () => {
    if (metric === "angle") {
      switch (camNumber) {
        case 1:
          return Array.isArray(angleData1) ? angleData1 : [];
        case 4:
          return Array.isArray(angleData4) ? angleData4 : [];
        case 8:
          return Array.isArray(angleData8) ? angleData8 : [];
        default:
          return Array.isArray(angleData1) ? angleData1 : [];
      }
    } else {
      switch (camNumber) {
        case 1:
          return Array.isArray(torqueData1) ? torqueData1 : [];
        case 4:
          return Array.isArray(torqueData4) ? torqueData4 : [];
        case 8:
          return Array.isArray(torqueData8) ? torqueData8 : [];
        default:
          return Array.isArray(torqueData1) ? torqueData1 : [];
      }
    }
  };

  const currentData = getCurrentData();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <h3 style={{ margin: "0 0 12px 0", flexShrink: 0 }}>
        PPM Trend Prediction (CAM {camNumber} - {metric})
      </h3>
      <div
        style={{
          marginBottom: "12px",
          flexShrink: 0,
          display: "flex",
          gap: "8px",
        }}
      >
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value as "angle" | "torque")}
          style={{
            padding: "4px 8px",
            borderRadius: "4px",
            border: "1px solid #555",
            background: "#333",
            color: "#fff",
            fontSize: "12px",
          }}
        >
          <option value="angle">Angle</option>
          <option value="torque">Torque</option>
        </select>
        <select
          value={camNumber}
          onChange={(e) => setCamNumber(Number(e.target.value))}
          style={{
            padding: "4px 8px",
            borderRadius: "4px",
            border: "1px solid #555",
            background: "#333",
            color: "#fff",
            fontSize: "12px",
          }}
        >
          {Array.from({ length: 9 }, (_, i) => i + 1).map((num) => (
            <option key={num} value={num}>
              CAM {num}
            </option>
          ))}
        </select>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={currentData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="analyzed_at"
              tickFormatter={(time) => new Date(time).toLocaleTimeString()}
            />
            <YAxis
              yAxisId="left"
              label={{ value: "PPM", angle: -90, position: "insideLeft" }}
              domain={[
                0,
                (dataMax: number) =>
                  Math.max(dataMax * 1.2, PPM_ALARM_THRESHOLD + 50),
              ]}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              label={{ value: "Mean", angle: -90, position: "insideRight" }}
            />
            <Tooltip />
            <Legend />

            <ReferenceArea
              yAxisId="left"
              y1={PPM_WARNING_THRESHOLD}
              y2={PPM_ALARM_THRESHOLD}
              strokeOpacity={0.3}
              fill="orange"
              fillOpacity={0.2}
              label={{ value: "Warning Zone", position: "insideTopRight" }}
            />
            <ReferenceLine
              yAxisId="left"
              y={PPM_ALARM_THRESHOLD}
              label="Alarm"
              stroke="red"
              strokeDasharray="3 3"
            />

            <Line
              yAxisId="left"
              type="monotone"
              dataKey="predicted_ppm"
              stroke="#8884d8"
              name="Predicted PPM"
              dot={false}
              isAnimationActive={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="mean"
              stroke="#82ca9d"
              name="Mean"
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

export default PpmChart;
