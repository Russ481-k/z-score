"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useProducts } from "@/hooks/useProducts";
import { useMemo, memo } from "react";

const COLORS = ["#00C49F", "#FF8042", "#0088FE"]; // "All" 색상 추가

interface OverallStatusChartProps {
  onSliceClick: (filter: "all" | "OK" | "NG") => void;
}

const OverallStatusChart = memo(function OverallStatusChart({
  onSliceClick,
}: OverallStatusChartProps) {
  const { data } = useProducts({
    startDate: "",
    endDate: "",
    page: 1,
    size: 1000,
  });

  const statusData = useMemo(() => {
    if (!data?.items) return [];

    // 임시로 바코드 기반으로 OK/NG 결정 (실제로는 측정 데이터 기반으로 판정)
    const okCount =
      data.items.filter(
        (p) =>
          p.barcode &&
          (p.barcode.endsWith("1C") ||
            p.barcode.endsWith("2C") ||
            p.barcode.endsWith("4C") ||
            p.barcode.endsWith("5C"))
      )?.length ?? 0;
    const ngCount = data.items?.length ?? 0 - okCount;

    return [
      { name: "OK", value: okCount },
      { name: "NG", value: ngCount },
    ];
  }, [data]);

  const handlePieClick = (data: { name: "OK" | "NG" }) => {
    if (data && data.name) {
      onSliceClick(data.name);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
      <ResponsiveContainer width="60%" height={300}>
        <PieChart>
          <Pie
            data={statusData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) =>
              percent ? `${name} ${(percent * 100).toFixed(0)}%` : name
            }
            onClick={handlePieClick}
          >
            {statusData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ width: "40%", paddingLeft: "20px" }}>
        <h3>Production Counts</h3>
        <p style={{ fontSize: "1.2rem", margin: "8px 0", color: "#00C49F" }}>
          <strong>OK:</strong>{" "}
          {statusData.find((d) => d.name === "OK")?.value.toLocaleString() ?? 0}
        </p>
        <p style={{ fontSize: "1.2rem", margin: "8px 0", color: "#FF8042" }}>
          <strong>NG:</strong>{" "}
          {statusData.find((d) => d.name === "NG")?.value.toLocaleString() ?? 0}
        </p>
        <p style={{ fontSize: "0.9rem", color: "#6c757d", marginTop: "16px" }}>
          Total:{" "}
          {(
            (statusData.find((d) => d.name === "OK")?.value ?? 0) +
            (statusData.find((d) => d.name === "NG")?.value ?? 0)
          ).toLocaleString()}
        </p>
      </div>
    </div>
  );
});

export default OverallStatusChart;
