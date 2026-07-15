import React from 'react';
import { FiSearch, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const DataTable = ({
  columns,
  data,
  searchPlaceholder = "Search records...",
  searchValue = "",
  onSearchChange,
  filters = null,
  pagination = null,
  loading = false,
  emptyMessage = "No records found."
}) => {
  return (
    <div className="glass-card rounded-xl border border-slate-800/40 overflow-hidden transition-all">
      {/* Top Action Bar (Search + Custom Filters) */}
      {(onSearchChange || filters) && (
        <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/40 bg-slate-950/20">
          {onSearchChange && (
            <div className="relative max-w-md w-full">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <FiSearch />
              </span>
              <input
                type="text"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-10 pr-4 py-2 border border-slate-800/50 bg-slate-950/40 text-gray-200 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"
              />
            </div>
          )}
          {filters && (
            <div className="flex flex-wrap items-center gap-3">
              {filters}
            </div>
          )}
        </div>
      )}

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-max text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/30 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-slate-800/40">
              {columns.map((col, idx) => (
                <th key={col.key || idx} className="py-4 px-6 select-none">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/35 text-sm text-gray-300">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center">
                  <div className="inline-flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-gray-400 font-medium">Retrieving workspace records...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-gray-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr 
                  key={row.id || rowIdx} 
                  className="hover:bg-white/5 transition-colors"
                >
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className="py-3.5 px-6 whitespace-nowrap">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom Pagination controls */}
      {pagination && (
        <div className="p-4 border-t border-slate-800/40 flex items-center justify-between gap-4 flex-col sm:flex-row bg-slate-950/20">
          <div className="text-xs text-gray-400">
            Page <span className="font-semibold text-gray-200">{pagination.currentPage}</span> of{' '}
            <span className="font-semibold text-gray-200">{pagination.totalPages || 1}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage <= 1 || loading}
              className="p-2 border border-slate-800 rounded-lg text-gray-400 bg-slate-950/40 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <FiChevronLeft className="text-lg" />
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage >= pagination.totalPages || loading}
              className="p-2 border border-slate-800 rounded-lg text-gray-400 bg-slate-950/40 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <FiChevronRight className="text-lg" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
