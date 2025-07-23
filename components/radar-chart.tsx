"use client"

import { useMemo } from "react"

interface RadarChartProps {
  data: {
    label: string
    value: number
    maxValue: number
  }[]
  title: string
  color?: string
  size?: number
}

export function RadarChart({ data, title, color = "#3b82f6", size = 200 }: RadarChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length < 3) return null; // 3개 미만이면 의미 없음

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size * 0.35;
    const angleStep = 360 / data.length;

    // N각형 꼭짓점 계산
    const points = data.map((item, index) => {
      const angle = (index * angleStep - 90) * (Math.PI / 180);
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      return { x, y, angle, ...item };
    });

    // 점수에 따른 내부 다각형 계산
    const innerPoints = points.map((point) => {
      const ratio = point.value / point.maxValue;
      const innerRadius = radius * ratio;
      const x = centerX + innerRadius * Math.cos(point.angle);
      const y = centerY + innerRadius * Math.sin(point.angle);
      return { x, y, ratio };
    });

    return { points, innerPoints, centerX, centerY, radius };
  }, [data, size]);

  if (!chartData) return null;

  const { points, innerPoints, centerX, centerY, radius } = chartData;

  return (
    <div className="flex flex-col items-center">
      <h3 className="text-lg font-semibold mb-4 text-center">{title}</h3>
      <div className="relative">
        <svg width={size} height={size} className="mx-auto">
          {/* 배경 N각형 그리드 */}
          <polygon
            points={points.map(p => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="1"
            opacity="0.5"
          />
          {/* 중간 N각형 (60%) */}
          <polygon
            points={points.map(p => {
              const x = centerX + radius * 0.6 * Math.cos(p.angle);
              const y = centerY + radius * 0.6 * Math.sin(p.angle);
              return `${x},${y}`;
            }).join(" ")}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="1"
            opacity="0.3"
          />
          {/* 내부 N각형 (30%) */}
          <polygon
            points={points.map(p => {
              const x = centerX + radius * 0.3 * Math.cos(p.angle);
              const y = centerY + radius * 0.3 * Math.sin(p.angle);
              return `${x},${y}`;
            }).join(" ")}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="1"
            opacity="0.3"
          />
          {/* 중앙점에서 각 꼭지점까지의 선 */}
          {points.map((point, index) => (
            <line
              key={index}
              x1={centerX}
              y1={centerY}
              x2={point.x}
              y2={point.y}
              stroke="#e5e7eb"
              strokeWidth="1"
              opacity="0.5"
            />
          ))}
          {/* 점수에 따른 내부 다각형 */}
          <polygon
            points={innerPoints.map(p => `${p.x},${p.y}`).join(" ")}
            fill={color}
            fillOpacity="0.3"
            stroke={color}
            strokeWidth="2"
          />
          {/* 각 꼭지점의 점수 표시 */}
          {points.map((point, index) => (
            <g key={index}>
              {/* 점수 원 */}
              <circle
                cx={point.x}
                cy={point.y}
                r="4"
                fill={color}
                stroke="white"
                strokeWidth="2"
              />
              {/* 라벨 - 위치 조정으로 겹침 방지 */}
              <text
                x={point.x + (point.x - centerX) * 0.25}
                y={point.y + (point.y - centerY) * 0.25 + (index === 0 ? -10 : 0)}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xs font-medium fill-gray-700"
              >
                {point.label}
              </text>
              {/* 점수 - 라벨과 겹치지 않도록 위치 조정 */}
              <text
                x={point.x}
                y={point.y - 20 + (index === 0 ? 12 : 0)}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xs font-bold fill-gray-900"
              >
                {point.value}/{point.maxValue}
              </text>
            </g>
          ))}
          {/* 중앙 총점 */}
          <circle
            cx={centerX}
            cy={centerY}
            r="20"
            fill={color}
            fillOpacity="0.8"
          />
          <text
            x={centerX}
            y={centerY}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-sm font-bold fill-white"
          >
            {data.reduce((sum, item) => sum + item.value, 0)}
          </text>
        </svg>
      </div>
      {/* 약점 분석 */}
      <div className="mt-4 w-full max-w-xs">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">약점 분석</h4>
        <div className="space-y-1">
          {data
            .filter(item => item.value / item.maxValue < 0.8)
            .sort((a, b) => (a.value / a.maxValue) - (b.value / b.maxValue))
            .map((item, index) => (
              <div key={index} className="flex justify-between items-center text-xs">
                <span className="text-red-600 font-medium">{item.label}</span>
                <span className="text-gray-600">{item.value}/{item.maxValue}</span>
              </div>
            ))}
          {data.filter(item => item.value / item.maxValue < 0.8).length === 0 && (
            <div className="text-xs text-green-600 font-medium">모든 항목이 양호합니다!</div>
          )}
        </div>
      </div>
    </div>
  )
} 