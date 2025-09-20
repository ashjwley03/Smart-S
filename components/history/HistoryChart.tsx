"use client"

import { useMemo } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  Brush,
} from "recharts"
import type { PressureSample, HistoryQuery } from "@/lib/history/fetchHistory"
import { applyRollingAverage } from "@/lib/history/rollingAvg"
import { downsampleLTTB } from "@/lib/history/downsample"
import { getThreshold } from "@/lib/history/thresholds"
import { Badge } from "@/components/ui/badge"

interface HistoryChartProps {
  data: PressureSample[]
  period: HistoryQuery["period"]
  smoothing: number
}

interface ChartDataPoint {
  ts: string
  tsMs: number
  heel: number
  leftAnkle: number
  rightAnkle: number
  anyHigh: boolean
}

interface HighSpan {
  start: number
  end: number
}

export function HistoryChart({ data, period, smoothing }: HistoryChartProps) {
  const processedData = useMemo(() => {
    if (!data.length) return []

    // Apply smoothing if enabled
    let processed = smoothing > 0 ? applyRollingAverage(data, smoothing) : data

    // Downsample if too many points for performance
    if (processed.length > 8000) {
      processed = downsampleLTTB(processed, 1500)
    }

    // Convert to chart format with numeric timestamps
    return processed.map((sample) => ({
      ts: sample.ts,
      tsMs: new Date(sample.ts).getTime(),
      heel: sample.heel,
      leftAnkle: sample.leftAnkle,
      rightAnkle: sample.rightAnkle,
      anyHigh:
        sample.heel > getThreshold("heel") ||
        sample.leftAnkle > getThreshold("leftAnkle") ||
        sample.rightAnkle > getThreshold("rightAnkle"),
    }))
  }, [data, smoothing])

  const highSpans = useMemo(() => {
    const spans: HighSpan[] = []
    let inSpan = false
    let spanStart = 0

    processedData.forEach((point, index) => {
      if (point.anyHigh && !inSpan) {
        inSpan = true
        spanStart = point.tsMs
      } else if (!point.anyHigh && inSpan) {
        inSpan = false
        spans.push({ start: spanStart, end: processedData[index - 1].tsMs })
      }
    })

    // Handle span that continues to the end
    if (inSpan && processedData.length > 0) {
      spans.push({ start: spanStart, end: processedData[processedData.length - 1].tsMs })
    }

    return spans
  }, [processedData])

  const formatXAxisTick = (tickItem: number) => {
    const date = new Date(tickItem)
    if (period === "3d") {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else if (period === "7d") {
      return date.toLocaleDateString([], { month: "short", day: "numeric" })
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" })
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null

    const date = new Date(label)
    const heel = payload.find((p: any) => p.dataKey === "heel")?.value
    const leftAnkle = payload.find((p: any) => p.dataKey === "leftAnkle")?.value
    const rightAnkle = payload.find((p: any) => p.dataKey === "rightAnkle")?.value

    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium mb-2">{date.toLocaleString()}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">Heel:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{heel} kPa</span>
              {heel > getThreshold("heel") && (
                <Badge variant="destructive" className="text-xs">
                  HIGH
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">Left Ankle:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{leftAnkle} kPa</span>
              {leftAnkle > getThreshold("leftAnkle") && (
                <Badge variant="destructive" className="text-xs">
                  HIGH
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">Right Ankle:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{rightAnkle} kPa</span>
              {rightAnkle > getThreshold("rightAnkle") && (
                <Badge variant="destructive" className="text-xs">
                  HIGH
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!processedData.length) {
    return <div className="h-96 flex items-center justify-center text-muted-foreground">No data available</div>
  }

  const showBrush = period === "7d" || period === "30d"

  return (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={processedData} margin={{ top: 5, right: 10, left: 10, bottom: showBrush ? 60 : 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis
            dataKey="tsMs"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={formatXAxisTick}
            className="text-xs"
          />
          <YAxis label={{ value: "Pressure (kPa)", angle: -90, position: "insideLeft" }} className="text-xs" />
          <Tooltip content={<CustomTooltip />} />

          {/* High pressure reference areas */}
          {highSpans.map((span, index) => (
            <ReferenceArea key={index} x1={span.start} x2={span.end} fill="hsl(var(--destructive))" fillOpacity={0.1} />
          ))}

          {/* Data lines */}
          <Line
            type="monotone"
            dataKey="heel"
            stroke="hsl(var(--destructive))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls={true}
            isAnimationActive={false}
            name="Heel"
          />
          <Line
            type="monotone"
            dataKey="leftAnkle"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls={true}
            isAnimationActive={false}
            name="Left Ankle"
          />
          <Line
            type="monotone"
            dataKey="rightAnkle"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls={true}
            isAnimationActive={false}
            name="Right Ankle"
          />

          {/* Brush for 7d/30d periods */}
          {showBrush && (
            <Brush dataKey="tsMs" height={30} stroke="hsl(var(--primary))" tickFormatter={formatXAxisTick} />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
