"use client"
import { useState, useEffect, useRef, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { ControlsBar } from "@/components/history/ControlsBar"
import { HistoryChart } from "@/components/history/HistoryChart"
import { StatsCards } from "@/components/history/StatsCards"
import { EventsTable } from "@/components/history/EventsTable"
import { useHistoryData, type HistoryQuery, type PressureStats } from "@/lib/history/fetchHistory"

function HistoryPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const chartRef = useRef<HTMLDivElement>(null)

  // URL state management
  const [period, setPeriod] = useState<HistoryQuery["period"]>(
    (searchParams.get("period") as HistoryQuery["period"]) || "3d",
  )
  const [interval, setInterval] = useState<HistoryQuery["interval"]>(
    (searchParams.get("interval") as HistoryQuery["interval"]) || undefined,
  )
  const [smoothing, setSmoothing] = useState<number>(Number.parseInt(searchParams.get("smoothing") || "0"))

  // Fetch data
  const { data, error, isLoading } = useHistoryData({
    patientId: "demo",
    period,
    interval,
  })

  // Update URL when state changes
  useEffect(() => {
    const params = new URLSearchParams()
    params.set("period", period)
    if (interval) params.set("interval", interval)
    if (smoothing > 0) params.set("smoothing", smoothing.toString())

    const newUrl = `/history?${params.toString()}`
    router.replace(newUrl, { scroll: false })
  }, [period, interval, smoothing, router])

  const handlePeriodChange = (newPeriod: HistoryQuery["period"]) => {
    setPeriod(newPeriod)
    // Reset interval to auto when period changes
    setInterval(undefined)
  }

  const handleEventClick = (event: PressureStats["highEvents"][0]) => {
    // Scroll chart to the event window - this would require chart interaction
    // For now, we'll just scroll to the chart
    chartRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Live
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">History</h1>
          </div>

          <Alert className="border-destructive/50 bg-destructive/10">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive">
              Failed to load history data. Please try again.
              <Button
                variant="outline"
                size="sm"
                className="ml-4 bg-transparent"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border px-4 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Live
                </Button>
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold">History</h1>
            </div>
            <Badge variant="secondary" className="w-fit">Demo Patient</Badge>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="border-b border-border px-4 py-4">
        <div className="max-w-7xl mx-auto">
          <ControlsBar
            period={period}
            interval={interval}
            smoothing={smoothing}
            onPeriodChange={handlePeriodChange}
            onIntervalChange={setInterval}
            onSmoothingChange={setSmoothing}
            data={data?.data}
            isLoading={isLoading}
            chartRef={chartRef}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Chart Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Pressure Over Time</span>
                {data && <Badge variant="outline">{data.stats.sampleCount} samples</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div ref={chartRef}>
                {isLoading ? (
                  <div className="h-96 flex items-center justify-center">
                    <div className="space-y-4 w-full">
                      <Skeleton className="h-8 w-48 mx-auto" />
                      <Skeleton className="h-80 w-full" />
                    </div>
                  </div>
                ) : data ? (
                  <HistoryChart data={data.data} period={period} smoothing={smoothing} />
                ) : null}
              </div>
            </CardContent>
          </Card>

          {/* Stats and Events Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Stats Cards */}
            <div className="xl:col-span-2">
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <Skeleton className="h-4 w-20 mb-2" />
                        <Skeleton className="h-8 w-16 mb-2" />
                        <Skeleton className="h-4 w-24" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : data ? (
                <StatsCards stats={data.stats} />
              ) : null}
            </div>

            {/* Events Table */}
            <div className="order-first xl:order-last">
              {isLoading ? (
                <Card>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : data ? (
                <EventsTable events={data.stats.highEvents} onEventClick={handleEventClick} />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-4">
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-4 w-32 mx-auto" />
          </div>
        </div>
      }
    >
      <HistoryPageContent />
    </Suspense>
  )
}
