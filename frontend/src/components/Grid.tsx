"use client";

import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import "ag-grid-community/styles/ag-theme-quartz.css";
import "./Grid.scss"; // 반짝이는 효과를 위한 SCSS 파일 임포트
import {
  ColDef,
  RowClickedEvent,
  RowClassParams,
  GetRowIdParams,
} from "ag-grid-community";
import { useProducts, Product } from "@/hooks/useProducts";
import { useEffect, useState, useMemo, useRef, memo } from "react";
import { useQueryClient } from "@tanstack/react-query";

ModuleRegistry.registerModules([AllCommunityModule]);

interface GridProps {
  onRowSelected: (productId: number) => void;
  filter: "all" | "OK" | "NG";
}

const Grid = memo(function Grid({ onRowSelected, filter }: GridProps) {
  const queryClient = useQueryClient();
  const { data } = useProducts("", "", 1, 1000); // size를 1000으로 통일
  const [highlightedRowId, setHighlightedRowId] = useState<number | null>(null);
  const prevFirstRowId = useRef<number | null>(null);

  const filteredData = useMemo(() => {
    const allItems = data?.items || [];
    const filtered =
      filter === "all"
        ? allItems
        : allItems.filter((item) => item.result === filter);
    return filtered.slice(0, 11); // 항상 최신 8개의 데이터만 표시
  }, [data, filter]);

  useEffect(() => {
    if (data && data.items.length > 0) {
      const currentFirstRowId = data.items[0].id;
      if (
        prevFirstRowId.current !== null &&
        prevFirstRowId.current !== currentFirstRowId
      ) {
        setHighlightedRowId(currentFirstRowId);
        setTimeout(() => {
          setHighlightedRowId(null);
        }, 1000);
      }
      prevFirstRowId.current = currentFirstRowId;
    }
  }, [data]);

  const [colDefs] = useState<ColDef[]>([
    { field: "barcode", headerName: "Barcode", filter: true },
    { field: "model_name", headerName: "Model" },
    { field: "line_info", headerName: "Line" },
    { field: "final_position", headerName: "Position" },
    { field: "final_press_force", headerName: "Press Force" },
    { field: "result", headerName: "Result" },
    { field: "created_at", headerName: "Timestamp" },
  ]);

  const handleRowClick = (event: RowClickedEvent<Product>) => {
    if (event.data) {
      onRowSelected(event.data.id);
    }
  };

  const getRowClass = (params: RowClassParams<Product>) => {
    if (params.data && params.data.id === highlightedRowId) {
      return "new-row-highlight";
    }
  };

  const getRowId = useMemo(() => {
    return (params: GetRowIdParams<Product>) => params.data.id.toString();
  }, []);

  return (
    <div className="ag-theme-quartz-dark" style={{ height: "100%" }}>
      <AgGridReact
        rowData={filteredData || []}
        columnDefs={colDefs}
        rowSelection={"single"}
        onRowClicked={handleRowClick}
        getRowClass={getRowClass}
        getRowId={getRowId}
        rowBuffer={100}
      />
    </div>
  );
});

export default Grid;
