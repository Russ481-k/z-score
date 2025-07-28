"use client";

import PpmChart from "@/components/PpmChart";
import Grid from "@/components/Grid";
import styles from "./page.module.scss";
import ProcessDistributionChart from "@/components/ProcessDistributionChart";
import { useState, useEffect } from "react";
import OverallStatusChart from "@/components/OverallStatusChart";
import MeasurementDetailsChart from "@/components/MeasurementDetailsChart";
import { useQueryClient } from "@tanstack/react-query";
import { Product, ProductsResponse } from "@/hooks/useProducts";
import { ChartDataPoint } from "@/hooks/useChartData";

let nextId = 6;

export default function Home() {
  const queryClient = useQueryClient();
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null
  );
  const [gridFilter, setGridFilter] = useState<"all" | "NG" | "OK">("all");
  const [isLive, setIsLive] = useState(false);

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
        final_position: 18.65 + (Math.random() - 0.5) * 0.5,
        final_press_force: 30.31 + (Math.random() - 0.5) * 1,
        result: Math.random() > 0.1 ? "OK" : "NG",
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData(
        ["products", { startDate: "", endDate: "", page: 1, size: 1000 }], // size를 1000으로 통일
        (oldData: ProductsResponse | undefined) => {
          if (!oldData) return { total: 1, items: [newProduct] };
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
            if (!oldData) return [newAnglePoint];
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
            if (!oldData) return [newTorquePoint];
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
    <main className={styles.container}>
      <h1 className={styles.title}>
        Z-Score Dashboard
        <span
          className={`${styles.liveIndicator} ${isLive ? styles.live : ""}`}
        >
          LIVE
        </span>
      </h1>
      <div className={styles.content}>
        <div className={styles.gridContainer}>
          <Grid onRowSelected={setSelectedProductId} filter={gridFilter} />
        </div>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarCard}>
            <OverallStatusChart onSliceClick={setGridFilter} />
          </div>
          <div className={styles.sidebarCard}>
            <MeasurementDetailsChart productId={selectedProductId} />
          </div>
        </aside>
      </div>
      <div className={styles.chartContainer}>
        <div className={styles.chartWrapper}>
          <PpmChart />
        </div>
        <div className={styles.chartWrapper}>
          <ProcessDistributionChart />
        </div>
      </div>
    </main>
  );
}
