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
  const { data } = useChartData("", "", metric, camNumber);

  useEffect(() => {
    const handleAnalysisUpdate = (newPoint: ChartDataPoint) => {
      queryClient.setQueryData(
        ["chartData", { startDate: "", endDate: "", metric, camNumber }],
        (oldData: ChartDataPoint[] | undefined) => {
          if (!oldData) return [newPoint];
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

  return (
    <div>
      <h3>
        PPM Trend Prediction (CAM {camNumber} - {metric})
      </h3>
      <div style={{ marginBottom: "16px" }}>
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value as "angle" | "torque")}
        >
          <option value="angle">Angle</option>
          <option value="torque">Torque</option>
        </select>
        <select
          value={camNumber}
          onChange={(e) => setCamNumber(Number(e.target.value))}
        >
          {Array.from({ length: 9 }, (_, i) => i + 1).map((num) => (
            <option key={num} value={num}>
              CAM {num}
            </option>
          ))}
        </select>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
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
  );
});

export default PpmChart;
