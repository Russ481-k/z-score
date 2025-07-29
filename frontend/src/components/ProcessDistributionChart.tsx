"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ErrorBar,
} from "recharts";
import { useState, memo, useMemo } from "react";
import { useProcessDistribution } from "@/hooks/useProcessDistribution";

const USL = 0.25;
const LSL = -0.25;

const ProcessDistributionChart = memo(function ProcessDistributionChart() {
  const [metric, setMetric] = useState<"angle" | "torque">("angle");
  const { data: angleData } = useProcessDistribution("angle");
  const { data: torqueData } = useProcessDistribution("torque");

  const chartData = useMemo(() => {
    const angle = Array.isArray(angleData) ? angleData : [];
    const torque = Array.isArray(torqueData) ? torqueData : [];

    if (angle.length === 0 && torque.length === 0) {
      return [];
    }

    // CAM별로 데이터 매핑
    const camNumbers = [
      "CAM 1",
      "CAM 2",
      "CAM 3",
      "CAM 4",
      "CAM 5",
      "CAM 6",
      "CAM 7",
      "CAM 8",
      "CAM 9",
    ];

    return camNumbers.map((cam) => {
      const angleItem = angle.find((item) => item.cam_number === cam);
      const torqueItem = torque.find((item) => item.cam_number === cam);

      return {
        cam: cam,
        angle_mean: angleItem?.mean || 0,
        angle_std: angleItem?.std_dev || 0,
        torque_mean: torqueItem?.mean || 0,
        torque_std: torqueItem?.std_dev || 0,
      };
    });
  }, [angleData, torqueData]);

  const chartDataWithError = useMemo(() => {
    return chartData.map((item) => {
      const currentMean =
        metric === "angle" ? item.angle_mean : item.torque_mean;
      const currentStd = metric === "angle" ? item.angle_std : item.torque_std;

      return {
        ...item,
        cam_number: item.cam,
        mean: currentMean,
        std_dev: currentStd,
        error: [currentMean - currentStd, currentMean + currentStd],
      };
    });
  }, [chartData, metric]);

  return (
    <div>
      <h3>Process Distribution ({metric})</h3>
      <div style={{ marginBottom: "16px" }}>
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value as "angle" | "torque")}
          style={{
            padding: "8px",
            background: "#2a2a2a",
            color: "#fff",
            border: "1px solid #555",
            borderRadius: "4px",
          }}
        >
          <option value="angle">Angle</option>
          <option value="torque">Torque</option>
        </select>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartDataWithError}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="cam_number" />
          <YAxis domain={[-0.4, 0.4]} />
          <Tooltip />
          <Legend />
          <ReferenceLine
            key="usl"
            y={USL}
            label="USL"
            stroke="red"
            strokeDasharray="3 3"
          />
          <ReferenceLine
            key="lsl"
            y={LSL}
            label="LSL"
            stroke="red"
            strokeDasharray="3 3"
          />
          <Bar dataKey="mean" fill="#8884d8">
            <ErrorBar
              dataKey="error"
              width={4}
              strokeWidth={2}
              stroke="orange"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

export default ProcessDistributionChart;
