"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertTriangle, ExternalLink } from "lucide-react"
import type { PressureStats, Region } from "@/lib/history/fetchHistory"

interface EventsTableProps {
  events: PressureStats["highEvents"]
  onEventClick?: (event: PressureStats["highEvents"][0]) => void
}

export function EventsTable({ events, onEventClick }: EventsTableProps) {
  const regionLabels: Record<Region, string> = {
    heel: "Heel",
    leftAnkle: "L. Ankle",
    rightAnkle: "R. Ankle",
  }

  const regionColors: Record<Region, string> = {
    heel: "bg-chart-1 text-white",
    leftAnkle: "bg-chart-2 text-white",
    rightAnkle: "bg-chart-4 text-white",
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

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            High Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No high pressure events detected</p>
            <p className="text-xs mt-1">This is good news!</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            High Events
          </div>
          <Badge variant="destructive" className="text-xs">
            {events.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-80">
          <div className="space-y-1 p-4">
            {events.map((event, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors ${
                  onEventClick ? "cursor-pointer" : ""
                }`}
                onClick={() => onEventClick?.(event)}
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge className={regionColors[event.region]} variant="secondary">
                    {regionLabels[event.region]}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-destructive">{event.peak} kPa</span>
                    {onEventClick && <ExternalLink className="h-3 w-3 text-muted-foreground" />}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    <span className="font-medium">Start:</span> {formatTime(event.start)}
                  </div>
                  <div>
                    <span className="font-medium">End:</span> {formatTime(event.end)}
                  </div>
                  <div>
                    <span className="font-medium">Duration:</span> {formatDuration(event.start, event.end)}
                  </div>
                  <div>
                    <span className="font-medium">Samples:</span> {event.samples}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
