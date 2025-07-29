"use client";

import styles from "./page.module.scss";
import TabSystem from "@/components/TabSystem";
import DashboardView from "@/components/DashboardView";
import RawDataGrid from "@/components/RawDataGrid";
import ColumnMapperGrid from "@/components/ColumnMapperGrid";
import BacktestingPanel from "@/components/BacktestingPanel";

export default function Home() {
  const tabs = [
    {
      id: "dashboard",
      label: "DASHBOARD",
      content: <DashboardView />,
    },
    {
      id: "raw-data",
      label: "RAW DATA",
      content: <RawDataGrid />,
    },
    {
      id: "column-mapper",
      label: "COLUMN MAPPER",
      content: <ColumnMapperGrid />,
    },
    {
      id: "backtest",
      label: "BACKTESTING",
      content: <BacktestingPanel />,
    },
  ];

  return (
    <main className={styles.container}>
      <TabSystem tabs={tabs} defaultTab="dashboard" />
    </main>
  );
}
