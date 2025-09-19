"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Download } from "lucide-react"
import type { HistoryQuery, PressureSample } from "@/lib/history/fetchHistory"
import { applyRollingAverage } from "@/lib/history/rollingAvg"

interface ControlsBarProps {
  period: HistoryQuery["period"]
  interval?: HistoryQuery["interval"]
  smoothing: number
  onPeriodChange: (period: HistoryQuery["period"]) => void
  onIntervalChange: (interval?: HistoryQuery["interval"]) => void
  onSmoothingChange: (smoothing: number) => void
  data?: PressureSample[]
  isLoading: boolean
  chartRef?: React.RefObject<HTMLDivElement>
}

export function ControlsBar({
  period,
  interval,
  smoothing,
  onPeriodChange,
  onIntervalChange,
  onSmoothingChange,
  data,
  isLoading,
  chartRef,
}: ControlsBarProps) {
  const periods: { value: HistoryQuery["period"]; label: string }[] = [
    { value: "3d", label: "3 Days" },
    { value: "7d", label: "1 Week" },
    { value: "30d", label: "1 Month" },
  ]

  const intervals: { value: HistoryQuery["interval"]; label: string }[] = [
    { value: undefined, label: "Auto" },
    { value: "1m", label: "1 minute" },
    { value: "5m", label: "5 minutes" },
    { value: "1h", label: "1 hour" },
  ]

  const smoothingOptions = [
    { value: 0, label: "Off" },
    { value: 5, label: "5 samples" },
    { value: 10, label: "10 samples" },
  ]

  const exportCSV = () => {
    if (!data) return

    // Apply smoothing to export data if enabled
    const exportData = smoothing > 0 ? applyRollingAverage(data, smoothing) : data

    const headers = ["timestamp", "heel", "leftAnkle", "rightAnkle"]
    const csvContent = [
      headers.join(","),
      ...exportData.map((sample) => [sample.ts, sample.heel, sample.leftAnkle, sample.rightAnkle].join(",")),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `pressure-history-${period}${smoothing > 0 ? `-smoothed-${smoothing}` : ""}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const exportPNG = async () => {
    if (!chartRef?.current) return

    try {
      // Dynamically import html-to-image to avoid SSR issues
      const { toPng } = await import("html-to-image")

      const dataUrl = await toPng(chartRef.current, {
        quality: 1.0,
        pixelRatio: 2, // 2x DPR for high quality
        backgroundColor: "white",
        style: {
          transform: "scale(1)",
          transformOrigin: "top left",
        },
      })

      const link = document.createElement("a")
      link.download = `pressure-chart-${period}${smoothing > 0 ? `-smoothed-${smoothing}` : ""}.png`
      link.href = dataUrl
      link.click()
    } catch (error) {
      console.error("Failed to export PNG:", error)
      // Fallback: show error message or disable PNG export
    }
  }

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      {/* Period Tabs */}
      <div className="flex border border-border rounded-lg p-1">
        {periods.map(({ value, label }) => (
          <Button
            key={value}
            variant={period === value ? "default" : "ghost"}
            size="sm"
            onClick={() => onPeriodChange(value)}
            disabled={isLoading}
            className="text-sm"
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        {/* Interval Select */}
        <div className="flex items-center gap-2">
          <Label htmlFor="interval" className="text-sm whitespace-nowrap">
            Interval:
          </Label>
          <Select
            value={interval || "auto"}
            onValueChange={(value) =>
              onIntervalChange(value === "auto" ? undefined : (value as HistoryQuery["interval"]))
            }
            disabled={isLoading}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {intervals.map(({ value, label }) => (
                <SelectItem key={value || "auto"} value={value || "auto"}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Smoothing Toggle */}
        <div className="flex items-center gap-2">
          <Label htmlFor="smoothing" className="text-sm whitespace-nowrap">
            Smoothing:
          </Label>
          <Select
            value={smoothing.toString()}
            onValueChange={(value) => onSmoothingChange(Number.parseInt(value))}
            disabled={isLoading}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {smoothingOptions.map(({ value, label }) => (
                <SelectItem key={value} value={value.toString()}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Export Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isLoading || !data}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={exportCSV}>CSV (Current Range)</DropdownMenuItem>
            <DropdownMenuItem onClick={exportPNG}>PNG (Chart Only)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
