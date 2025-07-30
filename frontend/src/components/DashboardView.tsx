"use client";

import PpmChart from "@/components/PpmChart";
import Grid from "@/components/Grid";
import ProcessDistributionChart from "@/components/ProcessDistributionChart";
import { useState, useEffect } from "react";
import OverallStatusChart from "@/components/OverallStatusChart";
import MeasurementDetailsChart from "@/components/MeasurementDetailsChart";
import { useQueryClient } from "@tanstack/react-query";
import { Product, ProductsResponse } from "@/hooks/useProducts";
import { ChartDataPoint } from "@/hooks/useChartData";
import { useSocket } from "@/hooks/useSocket"; // useSocket 훅 import

let nextId = 6;

const DashboardView: React.FC = () => {
  const queryClient = useQueryClient();
  useSocket(); // 웹소켓 연결 활성화
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null
  );
  const [gridFilter, setGridFilter] = useState<"all" | "NG" | "OK">("all");
  const [isLive, setIsLive] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);

  // 뷰포트 높이 감지
  useEffect(() => {
    const updateViewportHeight = () => {
      // 탭 헤더와 패딩을 고려한 실제 사용 가능한 높이 계산
      const tabHeaderHeight = 60; // 탭 헤더 높이
      const paddingAndMargins = 120; // 패딩과 마진값들
      const titleHeight = 60; // 제목 영역 높이
      const availableHeight =
        window.innerHeight - tabHeaderHeight - paddingAndMargins - titleHeight;
      setViewportHeight(availableHeight);
    };

    updateViewportHeight();
    window.addEventListener("resize", updateViewportHeight);
    return () => window.removeEventListener("resize", updateViewportHeight);
  }, []);

  // 각 섹션의 높이 계산
  const topSectionHeight = Math.max(300, viewportHeight * 0.45); // 45% 할당, 최소 300px
  const bottomSectionHeight = Math.max(280, viewportHeight * 0.35); // 35% 할당, 최소 280px

  useEffect(() => {
    const interval = setInterval(() => {
      // 데이터 업데이트 시 LIVE 표시등 켜기
      setIsLive(true);
      setTimeout(() => setIsLive(false), 500); // 0.5초 후 끄기

      const newProduct: Product = {
        id: nextId++,
        barcode: `24010200${String(nextId).padStart(4, "0")}C`,
        model_name: "KAPPA-1.0",
        line_info: "CM1P9",
        timestamp: new Date().toISOString(),
        create_time: new Date().toISOString(),
      };

      queryClient.setQueryData(
        ["products", { startDate: "", endDate: "", page: 1, size: 1000 }], // size를 1000으로 통일
        (oldData: ProductsResponse | undefined) => {
          if (!oldData || !oldData.items || !Array.isArray(oldData.items)) {
            return { total: 1, items: [newProduct] };
          }
          // 새로운 데이터를 앞에 추가하고, 배열 길이를 1000으로 제한
          const newItems = [newProduct, ...oldData.items].slice(0, 1000);
          return {
            total: newItems.length,
            items: newItems,
          };
        }
      );

      // 모든 CAM (1-9)에 대해 차트 데이터 업데이트
      for (let i = 1; i <= 9; i++) {
        const isWarning = i === 4 || i === 8; // CAM 4와 8은 위험 수준으로 시뮬레이션
        const basePpm = isWarning ? 350 : 150;
        const ppmRange = isWarning ? 200 : 50;

        const newAnglePoint: ChartDataPoint = {
          analyzed_at: new Date().toISOString(),
          predicted_ppm: basePpm + Math.random() * ppmRange,
          mean: 0.04 + (Math.random() - 0.5) * (isWarning ? 0.1 : 0.02),
          std_dev: 0.09 + (Math.random() - 0.5) * 0.01,
          ppm_slope: 15.2 + (Math.random() - 0.5) * (isWarning ? 10 : 2),
        };

        queryClient.setQueryData(
          [
            "chartData",
            { startDate: "", endDate: "", metric: "angle", camNumber: i },
          ],
          (oldData: ChartDataPoint[] | undefined) => {
            if (!oldData || !Array.isArray(oldData)) return [newAnglePoint];
            const newData = [...oldData, newAnglePoint];
            return newData.slice(-100);
          }
        );

        const newTorquePoint: ChartDataPoint = {
          analyzed_at: new Date().toISOString(),
          predicted_ppm: basePpm + Math.random() * ppmRange - 50,
          mean: 0.03 + (Math.random() - 0.5) * (isWarning ? 0.1 : 0.02),
          std_dev: 0.08 + (Math.random() - 0.5) * 0.01,
          ppm_slope: 12.5 + (Math.random() - 0.5) * (isWarning ? 10 : 2),
        };

        queryClient.setQueryData(
          [
            "chartData",
            { startDate: "", endDate: "", metric: "torque", camNumber: i },
          ],
          (oldData: ChartDataPoint[] | undefined) => {
            if (!oldData || !Array.isArray(oldData)) return [newTorquePoint];
            const newData = [...oldData, newTorquePoint];
            return newData.slice(-100);
          }
        );
      }

      // 공정 분포 데이터 업데이트 시뮬레이션
      const newAngleDistribution = Array.from({ length: 9 }, (_, i) => ({
        cam_number: `CAM ${i + 1}`,
        mean: (Math.random() - 0.5) * 0.1,
        std_dev: 0.05 + Math.random() * 0.05,
      }));
      queryClient.setQueryData(["distribution", "angle"], newAngleDistribution);

      const newTorqueDistribution = Array.from({ length: 9 }, (_, i) => ({
        cam_number: `CAM ${i + 1}`,
        mean: (Math.random() - 0.5) * 0.1,
        std_dev: 0.05 + Math.random() * 0.05,
      }));
      queryClient.setQueryData(
        ["distribution", "torque"],
        newTorqueDistribution
      );
    }, 2000);

    return () => clearInterval(interval);
  }, [queryClient]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        overflow: "hidden",
      }}
    >
      {/* 헤더 섹션 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "15px",
          flexShrink: 0,
          height: "60px",
        }}
      >
        <h2 style={{ color: "#fff", margin: 0 }}>실시간 모니터링 대시보드</h2>
        <span
          style={{
            padding: "5px 10px",
            borderRadius: "15px",
            fontSize: "12px",
            fontWeight: "bold",
            background: isLive ? "#4CAF50" : "#666",
            color: "#fff",
            transition: "background 0.3s ease",
          }}
        >
          {isLive ? "● LIVE" : "○ STANDBY"}
        </span>
      </div>

      {/* 상단 섹션: 그리드 + 상태 차트들 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "20px",
          height: `${topSectionHeight}px`,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            background: "#2a2a2a",
            borderRadius: "8px",
            padding: "15px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Grid onRowSelected={setSelectedProductId} filter={gridFilter} />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "15px",
            height: "100%",
          }}
        >
          <div
            style={{
              background: "#2a2a2a",
              borderRadius: "8px",
              padding: "15px",
              flex: 1,
              minHeight: 0,
            }}
          >
            <OverallStatusChart onSliceClick={setGridFilter} />
          </div>
          <div
            style={{
              background: "#2a2a2a",
              borderRadius: "8px",
              padding: "15px",
              flex: 1,
              minHeight: 0,
            }}
          >
            <MeasurementDetailsChart productId={selectedProductId} />
          </div>
        </div>
      </div>

      {/* 하단 섹션: PPM 차트 + 공정 분포 차트 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
          height: `${bottomSectionHeight}px`,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            background: "#2a2a2a",
            borderRadius: "8px",
            padding: "15px",
            overflow: "hidden",
          }}
        >
          <PpmChart />
        </div>
        <div
          style={{
            background: "#2a2a2a",
            borderRadius: "8px",
            padding: "15px",
            overflow: "hidden",
          }}
        >
          <ProcessDistributionChart />
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
