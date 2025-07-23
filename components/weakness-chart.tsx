"use client"

import { useMemo } from "react"

interface WeaknessItem {
  subCategory: string
  mainCategory: string
  value: number
  maxValue: number
  percentage: number
}

interface WeaknessChartProps {
  data: WeaknessItem[]
  title: string
  color?: string
  size?: number
}

export function WeaknessChart({ data, title, color = "#ef4444", size = 320 }: WeaknessChartProps) {
  // 100%가 아닌 항목만, 낮은 순 5개
  const sortedData = useMemo(() => {
    return data
      .filter(item => item.percentage < 100)
      .sort((a, b) => a.percentage - b.percentage)
      .slice(0, 5)
  }, [data])

  if (sortedData.length === 0) return null

  return (
    <div className="flex flex-col items-center">
      <h3 className="text-lg font-semibold mb-4 text-center">{title}</h3>
      <div className="mt-2 w-full max-w-xs">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">약점 순위 (상위 5개)</h4>
        <div className="space-y-2">
          {sortedData.map((item, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-2 bg-red-50 rounded-lg border ${index === 0 ? 'border-2 border-red-500' : 'border-red-200'}`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full bg-red-500 text-white font-bold flex items-center justify-center ${index === 0 ? 'text-lg' : 'text-xs'}`}>{index + 1}</div>
                <div>
                  <div className={`font-medium text-gray-900 ${index === 0 ? 'text-lg' : 'text-sm'}`}>{item.subCategory}</div>
                  <div className="text-xs text-gray-600">{item.mainCategory}</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`font-bold text-red-600 ${index === 0 ? 'text-lg' : 'text-sm'}`}>{item.value}/{item.maxValue}</div>
                <div className="text-xs text-gray-500">{item.percentage.toFixed(1)}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 