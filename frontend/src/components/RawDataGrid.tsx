"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { ColDef, GridReadyEvent, GridApi } from "ag-grid-community";
import { apiClient } from "@/lib/api";

ModuleRegistry.registerModules([AllCommunityModule]);

interface InfiniteScrollData {
  id: number;
  [key: string]: any;
}

interface InfiniteScrollResponse {
  items: InfiniteScrollData[];
  next_cursor?: number;
  prev_cursor?: number;
  has_more: boolean;
  total_count?: number;
  column_mapping: Record<string, string>;
}

const RawDataGrid: React.FC = () => {
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>(
    {}
  );
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [rowData, setRowData] = useState<InfiniteScrollData[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const gridRef = useRef<AgGridReact>(null);
  const gridApiRef = useRef<GridApi | null>(null);
  const isLoadingRef = useRef(false);

  const PAGE_SIZE = 50;

  // 동적 컬럼 정의 생성
  const columnDefs: ColDef[] = useMemo(() => {
    if (Object.keys(columnMapping).length === 0) return [];

    return Object.entries(columnMapping).map(
      ([rawColumnName, mappedColumnName]) => ({
        headerName: mappedColumnName,
        field: mappedColumnName,
        sortable: true,
        filter: true,
        resizable: true,
        minWidth: 120,
        flex: 1,
      })
    );
  }, [columnMapping]);

  // 데이터 로드 함수
  const loadMoreData = useCallback(
    async (page: number) => {
      if (isLoadingRef.current || !hasMore) return;

      isLoadingRef.current = true;
      setLoading(true);

      try {
        const startRow = page * PAGE_SIZE;

        const response = await apiClient.get("/raw-data/infinite-scroll", {
          params: {
            start_row: startRow,
            limit: PAGE_SIZE,
            direction: "forward",
          },
        });

        const data: InfiniteScrollResponse = response.data;

        // 첫 요청시 컬럼 매핑과 총 개수 설정
        if (page === 0) {
          setColumnMapping(data.column_mapping);
          setRowData(data.items);
          if (data.total_count !== undefined) {
            setTotalCount(data.total_count);
          }
        } else {
          // 추가 데이터 append
          setRowData((prev) => [...prev, ...data.items]);
        }

        setHasMore(data.has_more);
        setCurrentPage(page);

        console.log("Data loaded:", {
          page,
          itemsCount: data.items.length,
          totalItems:
            page === 0 ? data.items.length : rowData.length + data.items.length,
          hasMore: data.has_more,
        });
      } catch (error: any) {
        console.error("Data load failed:", error);
      } finally {
        setLoading(false);
        isLoadingRef.current = false;
      }
    },
    [hasMore, rowData.length]
  );

  // 초기 데이터 로드
  useEffect(() => {
    loadMoreData(0);
  }, []);

  const onGridReady = useCallback((params: GridReadyEvent) => {
    console.log("AG Grid Ready");
    gridApiRef.current = params.api;
  }, []);

  // 스크롤 이벤트 핸들러
  const onBodyScroll = useCallback(
    (event: any) => {
      if (!gridApiRef.current || !hasMore || isLoadingRef.current) return;

      const gridApi = gridApiRef.current;
      const lastDisplayedRowIndex = gridApi.getLastDisplayedRowIndex();
      const totalRows = gridApi.getDisplayedRowCount();

      // Load next page when 10 rows remaining
      if (lastDisplayedRowIndex >= totalRows - 10) {
        loadMoreData(currentPage + 1);
      }
    },
    [hasMore, currentPage, loadMoreData]
  );

  const defaultColDef = useMemo(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
      minWidth: 100,
    }),
    []
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "80vh",
        overflow: "hidden",
      }}
    >
      <style jsx>{`
        .compact-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.03);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          flex-shrink: 0;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .title {
          font-size: 18px;
          font-weight: 600;
          color: #ffffff;
          margin: 0;
        }

        .stats {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .stat {
          font-size: 12px;
          color: #aaa;
          background: rgba(255, 255, 255, 0.05);
          padding: 4px 8px;
          border-radius: 4px;
        }

        .grid-container {
          flex: 1;
          padding: 16px;
          overflow: hidden;
        }

        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          z-index: 1000;
        }
      `}</style>

      <div className="compact-header">
        <div className="header-left">
          <h1 className="title">Raw Data (AG Grid Infinite Scroll)</h1>
          <div className="stats">
            <span className="stat">↻ Scroll Loading</span>
            <span className="stat">
              ▲ Loaded {rowData.length.toLocaleString()} items
            </span>
            <span className="stat">
              ≡ {Object.keys(columnMapping).length} columns
            </span>
            {totalCount && (
              <span className="stat">
                ∑ Total {totalCount.toLocaleString()} items
              </span>
            )}
            {loading && <span className="stat">⟳ Loading...</span>}
          </div>
        </div>
      </div>

      <div className="grid-container" style={{ position: "relative" }}>
        {loading && (
          <div className="loading-overlay">
            <div>Loading data...</div>
          </div>
        )}
        <div
          className="ag-theme-alpine-dark"
          style={{ height: "100%", width: "100%" }}
        >
          <AgGridReact
            ref={gridRef}
            columnDefs={columnDefs}
            rowData={rowData}
            defaultColDef={defaultColDef}
            onGridReady={onGridReady}
            onBodyScroll={onBodyScroll}
            animateRows={true}
            suppressCellFocus={true}
            rowSelection="multiple"
            suppressRowClickSelection={true}
            getRowId={(params) => params.data.id.toString()}
          />
        </div>
      </div>
    </div>
  );
};

export default RawDataGrid;
