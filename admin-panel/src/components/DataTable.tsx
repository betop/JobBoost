"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  X,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────

export interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (value: any, row: T) => React.ReactNode;
  /** Enable sorting on this column */
  sortable?: boolean;
  /** Dropdown filter options for this column */
  filterOptions?: { value: string; label: string }[];
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  loading?: boolean;
  persistToUrl?: boolean;
  /** Default page size (default: 10) */
  defaultPageSize?: number;
  /** Available page sizes (default: [5, 10, 25, 50]) */
  pageSizeOptions?: number[];
}

type SortDir = "asc" | "desc" | null;

// ── Helpers ────────────────────────────────────────────────────────

function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((o, k) => o?.[k], obj);
}

function compareValues(a: any, b: any, dir: "asc" | "desc"): number {
  if (a == null && b == null) return 0;
  if (a == null) return dir === "asc" ? -1 : 1;
  if (b == null) return dir === "asc" ? 1 : -1;

  if (typeof a === "boolean" && typeof b === "boolean") {
    return dir === "asc" ? Number(a) - Number(b) : Number(b) - Number(a);
  }

  const numA = Number(a);
  const numB = Number(b);
  if (!isNaN(numA) && !isNaN(numB) && a !== "" && b !== "") {
    return dir === "asc" ? numA - numB : numB - numA;
  }

  const strA = String(a).toLowerCase();
  const strB = String(b).toLowerCase();
  const cmp = strA.localeCompare(strB);
  return dir === "asc" ? cmp : -cmp;
}

// ── Component ──────────────────────────────────────────────────────

export default function DataTable<T extends { id: string }>({
  data,
  columns,
  searchable = false,
  searchPlaceholder = "Search...",
  onSearch,
  loading = false,
  persistToUrl = true,
  defaultPageSize = 10,
  pageSizeOptions = [5, 10, 25, 50],
}: DataTableProps<T>) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  // ── URL persistence ────────────────────────────────────────────
  useEffect(() => {
    if (!persistToUrl) return;
    const page = searchParams.get("page");
    const search = searchParams.get("search");
    const size = searchParams.get("size");
    const sort = searchParams.get("sort");
    const dir = searchParams.get("dir");

    if (page) setCurrentPage(parseInt(page, 10));
    if (search) setSearchQuery(search);
    if (size) setPageSize(parseInt(size, 10));
    if (sort) setSortKey(sort);
    if (dir === "asc" || dir === "desc") setSortDir(dir);
  }, [persistToUrl]);

  const updateQueryParams = useCallback(
    (updates: Record<string, string | number | undefined>) => {
      if (!persistToUrl) return;
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === "" || value === null) {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });
      router.push(`?${params.toString()}`, { scroll: false } as any);
    },
    [persistToUrl, searchParams, router]
  );

  // ── Derived data ───────────────────────────────────────────────

  const processedData = useMemo(() => {
    let result = [...data];

    // 1. Global search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((item) =>
        Object.values(item as Record<string, any>).some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(q)
        )
      );
    }

    // 2. Column filters
    const activeFilters = Object.entries(columnFilters).filter(([, v]) => v !== "");
    if (activeFilters.length > 0) {
      result = result.filter((item) =>
        activeFilters.every(([key, filterValue]) => {
          const val = String(getNestedValue(item, key) ?? "").toLowerCase();
          return val === filterValue.toLowerCase();
        })
      );
    }

    // 3. Sort
    if (sortKey && sortDir) {
      result.sort((a, b) => {
        const valA = getNestedValue(a, sortKey);
        const valB = getNestedValue(b, sortKey);
        return compareValues(valA, valB, sortDir);
      });
    }

    return result;
  }, [data, searchQuery, columnFilters, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(processedData.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentData = processedData.slice(startIndex, endIndex);

  // Reset to page 1 when data or filters change
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // ── Handlers ───────────────────────────────────────────────────

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    updateQueryParams({ search: query || undefined, page: undefined });
    onSearch?.(query);
  };

  const handlePageChange = (page: number) => {
    const p = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(p);
    updateQueryParams({ page: p > 1 ? p : undefined });
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
    updateQueryParams({ size: size !== defaultPageSize ? size : undefined, page: undefined });
  };

  const handleSort = (key: string) => {
    let newDir: SortDir;
    if (sortKey !== key) {
      newDir = "asc";
    } else if (sortDir === "asc") {
      newDir = "desc";
    } else {
      newDir = null;
    }

    setSortKey(newDir ? key : null);
    setSortDir(newDir);
    setCurrentPage(1);
    updateQueryParams({
      sort: newDir ? key : undefined,
      dir: newDir || undefined,
      page: undefined,
    });
  };

  const handleColumnFilter = (key: string, value: string) => {
    setColumnFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setColumnFilters({});
    setSearchQuery("");
    setSortKey(null);
    setSortDir(null);
    setCurrentPage(1);
    updateQueryParams({ search: undefined, sort: undefined, dir: undefined, page: undefined });
  };

  const hasActiveFilters =
    searchQuery !== "" ||
    Object.values(columnFilters).some((v) => v !== "") ||
    sortKey !== null;

  // ── Pagination range (smart ellipsis) ─────────────────────────

  const getPageRange = (): (number | "...")[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

    const pages: (number | "...")[] = [];
    if (safePage <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push("...", totalPages);
    } else if (safePage >= totalPages - 3) {
      pages.push(1, "...");
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1, "...", safePage - 1, safePage, safePage + 1, "...", totalPages);
    }
    return pages;
  };

  // ── Render ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const filterableColumns = columns.filter((col) => col.filterOptions);

  return (
    <div className="w-full space-y-4">
      {/* ── Toolbar ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Search */}
        {searchable && (
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Column filter dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
          {filterableColumns.map((col) => {
            const key = String(col.key);
            return (
              <select
                key={key}
                value={columnFilters[key] || ""}
                onChange={(e) => handleColumnFilter(key, e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
              >
                <option value="">All {col.label}</option>
                {col.filterOptions!.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            );
          })}

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>

        {/* Page size */}
        <div className="flex items-center gap-2 ml-auto">
          <label className="text-sm text-gray-500 whitespace-nowrap">Rows:</label>
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────── */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => {
                const key = String(column.key);
                const isCurrentSort = sortKey === key;
                return (
                  <th
                    key={key}
                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                      column.sortable
                        ? "cursor-pointer select-none hover:bg-gray-100 transition-colors"
                        : ""
                    }`}
                    onClick={column.sortable ? () => handleSort(key) : undefined}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{column.label}</span>
                      {column.sortable && (
                        <span className="text-gray-400">
                          {isCurrentSort && sortDir === "asc" ? (
                            <ArrowUp className="w-3.5 h-3.5 text-primary-600" />
                          ) : isCurrentSort && sortDir === "desc" ? (
                            <ArrowDown className="w-3.5 h-3.5 text-primary-600" />
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                  {hasActiveFilters ? "No results match your filters" : "No data found"}
                </td>
              </tr>
            ) : (
              currentData.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  {columns.map((column) => {
                    const value = column.key.toString().includes(".")
                      ? getNestedValue(row, column.key.toString())
                      : (row as any)[column.key];

                    return (
                      <td key={String(column.key)} className="px-6 py-4 text-sm text-gray-900">
                        {column.render ? column.render(value, row) : (value ?? "")}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer: info + pagination ─────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-sm text-gray-500">
          {processedData.length === 0 ? (
            "No results"
          ) : (
            <>
              Showing{" "}
              <span className="font-medium text-gray-700">{startIndex + 1}</span>–
              <span className="font-medium text-gray-700">
                {Math.min(endIndex, processedData.length)}
              </span>{" "}
              of <span className="font-medium text-gray-700">{processedData.length}</span>
              {processedData.length !== data.length && (
                <span className="text-gray-400"> (filtered from {data.length})</span>
              )}
            </>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(1)}
              disabled={safePage === 1}
              className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              title="First page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handlePageChange(safePage - 1)}
              disabled={safePage === 1}
              className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {getPageRange().map((page, idx) =>
              page === "..." ? (
                <span key={`ellipsis-${idx}`} className="px-2 text-gray-400 text-sm">
                  …
                </span>
              ) : (
                <button
                  key={page}
                  onClick={() => handlePageChange(page as number)}
                  className={`px-3 py-1.5 text-sm rounded-lg ${
                    safePage === page
                      ? "bg-primary-600 text-white font-medium"
                      : "border border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {page}
                </button>
              )
            )}

            <button
              onClick={() => handlePageChange(safePage + 1)}
              disabled={safePage === totalPages}
              className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={safePage === totalPages}
              className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Last page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
