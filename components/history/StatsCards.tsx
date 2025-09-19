import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Activity, AlertTriangle, Clock } from "lucide-react"
import type { PressureStats, Region } from "@/lib/history/fetchHistory"

interface StatsCardsProps {
  stats: PressureStats
}

export function StatsCards({ stats }: StatsCardsProps) {
  const regions: Region[] = ["heel", "leftAnkle", "rightAnkle"]
  const regionLabels: Record<Region, string> = {
    heel: "Heel",
    leftAnkle: "Left Ankle",
    rightAnkle: "Right Ankle",
  }

  const formatDuration = (start: string, end: string) => {
    const startTime = new Date(start).getTime()
    const endTime = new Date(end).getTime()
    const durationMs = endTime - startTime
    const minutes = Math.round(durationMs / (1000 * 60))

    if (minutes < 60) {
      return `${minutes}m`
    } else {
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
    }
  }

  // Find overall peak across all regions
  const overallPeak = regions.reduce((peak, region) => {
    return stats.max[region].value > peak.value ? stats.max[region] : peak
  }, stats.max.heel)

  const overallPeakRegion =
    regions.find(
      (region) => stats.max[region].value === overallPeak.value && stats.max[region].ts === overallPeak.ts,
    ) || "heel"

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Peak Pressure */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Peak Pressure</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">{overallPeak.value} kPa</div>
          <div className="text-xs text-muted-foreground mt-1">{regionLabels[overallPeakRegion]}</div>
          <div className="text-xs text-muted-foreground">
            {new Date(overallPeak.ts).toLocaleString([], {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </CardContent>
      </Card>

      {/* Average Pressure */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Pressure</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {regions.map((region) => (
              <div key={region} className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs">
                  {regionLabels[region]}
                </Badge>
                <span className="text-sm font-medium">{stats.avg[region]} kPa</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Time in High */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Time in High</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {regions.map((region) => (
              <div key={region} className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs">
                  {regionLabels[region]}
                </Badge>
                <span
                  className={`text-sm font-medium ${
                    stats.timeInHighPct[region] > 10
                      ? "text-destructive"
                      : stats.timeInHighPct[region] > 5
                        ? "text-orange-500"
                        : "text-muted-foreground"
                  }`}
                >
                  {stats.timeInHighPct[region]}%
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* High Events */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">High Events</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">{stats.highEvents.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Total events</div>
          {stats.highEvents.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Longest:{" "}
              {formatDuration(
                stats.highEvents.reduce((longest, event) => {
                  const currentDuration = new Date(event.end).getTime() - new Date(event.start).getTime()
                  const longestDuration = new Date(longest.end).getTime() - new Date(longest.start).getTime()
                  return currentDuration > longestDuration ? event : longest
                }).start,
                stats.highEvents.reduce((longest, event) => {
                  const currentDuration = new Date(event.end).getTime() - new Date(event.start).getTime()
                  const longestDuration = new Date(longest.end).getTime() - new Date(longest.start).getTime()
                  return currentDuration > longestDuration ? event : longest
                }).end,
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
