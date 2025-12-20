"use client"

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import clsx from 'clsx'

export type TableColumn<T> = {
  key: keyof T | string
  header: string
  render?: (value: unknown, row: T) => React.ReactNode
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
}

type DataTableProps<T> = {
  columns: TableColumn<T>[]
  data: T[]
  emptyState?: string
}

type SortState<T> = {
  key: TableColumn<T>['key']
  direction: 'asc' | 'desc'
}

export function DataTable<T extends Record<string, unknown>>({ columns, data, emptyState = 'No records to display.' }: DataTableProps<T>) {
  const [sortState, setSortState] = useState<SortState<T> | null>(null)

  const sortedData = useMemo(() => {
    if (!sortState) {
      return data
    }

    const { key, direction } = sortState

    return [...data].sort((a, b) => {
      const valueA = a[key as keyof T]
      const valueB = b[key as keyof T]

      if (valueA == null) return 1
      if (valueB == null) return -1

      const result = String(valueA).localeCompare(String(valueB), undefined, { numeric: true, sensitivity: 'base' })
      return direction === 'asc' ? result : -result
    })
  }, [data, sortState])

  const handleSort = (column: TableColumn<T>) => {
    if (!column.sortable) return

    setSortState((prev) => {
      if (!prev || prev.key !== column.key) {
        return { key: column.key, direction: 'asc' }
      }
      if (prev.direction === 'asc') {
        return { key: column.key, direction: 'desc' }
      }
      return null
    })
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/10 text-xs uppercase tracking-wide text-white/60">
          <tr>
            {columns.map((column) => {
              const isActive = sortState?.key === column.key
              return (
                <th
                  key={String(column.key)}
                  className={clsx('px-6 py-3 font-medium', column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left')}
                >
                  <button
                    type="button"
                    onClick={() => handleSort(column)}
                    disabled={!column.sortable}
                    className={clsx('flex items-center gap-2 text-white/70', column.sortable ? 'cursor-pointer hover:text-white' : 'cursor-default', column.align === 'right' ? 'justify-end' : column.align === 'center' ? 'justify-center' : 'justify-start')}
                  >
                    {column.header}
                    {column.sortable && (
                      <span aria-hidden>
                        {isActive ? (sortState?.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ChevronDown className="h-3 w-3 opacity-0" />}
                      </span>
                    )}
                  </button>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10 bg-black/40">
          {sortedData.map((row, index) => (
            <tr key={index} className="hover:bg-white/5">
              {columns.map((column) => {
                const value = row[column.key as keyof T]
                return (
                  <td
                    key={String(column.key)}
                    className={clsx('px-6 py-4 text-sm text-white/80', column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left')}
                  >
                    {column.render ? column.render(value, row) : String(value ?? '—')}
                  </td>
                )
              })}
            </tr>
          ))}
          {sortedData.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-6 py-16 text-center text-white/60">
                {emptyState}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
