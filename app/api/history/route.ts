import { type NextRequest, NextResponse } from "next/server"
import { heelPressureData, heelPressureThreshold } from "@/lib/history/heelPressureData"

type Region = "heel" | "leftAnkle" | "rightAnkle"

type PressureSample = {
  ts: string
  heel: number
  leftAnkle: number
  rightAnkle: number
}

type HistoryQuery = {
  patientId: string
  period: "3d" | "7d" | "30d"
  interval?: "1m" | "5m" | "1h"
}

type PressureStats = {
  period: HistoryQuery["period"]
  sampleCount: number
  avg: Record<Region, number>
  max: Record<Region, { value: number; ts: string }>
  timeInHighPct: Record<Region, number>
  highEvents: Array<{ region: Region; start: string; end: string; peak: number; samples: number }>
}

type HistoryResponse = {
  data: PressureSample[]
  stats: PressureStats
  meta: { period: HistoryQuery["period"]; interval: Required<HistoryQuery>["interval"] }
}

// Thresholds
const heelHigh = heelPressureThreshold // Use the threshold from CSV data
const ankleHigh = 350

// Seeded random number generator for deterministic data
function mulberry32(a: number) {
  return () => {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

function generateMockData(period: HistoryQuery["period"], interval: string): PressureSample[] {
  const now = new Date()
  const periodMs =
    period === "3d" ? 3 * 24 * 60 * 60 * 1000 : period === "7d" ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000

  const intervalMs = interval === "1m" ? 60 * 1000 : interval === "5m" ? 5 * 60 * 1000 : 60 * 60 * 1000

  const samples: PressureSample[] = []
  const seed = hashString(`${period}-${interval}`)
  const rng = mulberry32(seed)

  // Total number of samples we need to generate
  const totalSamples = Math.ceil(periodMs / intervalMs)
  
  // Use the CSV data for heel readings, looping as needed
  const heelDataLength = heelPressureData.length
  
  for (let i = 0; i < totalSamples; i++) {
    const timestamp = new Date(now.getTime() - periodMs + i * intervalMs)
    
    // Get the heel pressure from our CSV data, cycling through it as needed
    const heelIndex = i % heelDataLength
    const heelValue = heelPressureData[heelIndex].value
    
    // Generate ankle pressure data based on business rules:
    // When patient is standing (heel pressure > 0), ankles should have no pressure
    // When patient is lying down (heel pressure = 0), ankles should have pressure
    let leftAnkle = 0
    let rightAnkle = 0
    
    if (heelValue === 0) {
      // Patient is likely lying down, generate ankle pressure
      const hour = timestamp.getHours()
      const timeOfDayFactor = 0.8 + 0.4 * Math.sin(((hour - 6) * Math.PI) / 12)
      
      leftAnkle = Math.round((200 + 80 * timeOfDayFactor + 25 * (rng() - 0.5)) * 10) / 10
      rightAnkle = Math.round((190 + 75 * timeOfDayFactor + 25 * (rng() - 0.5)) * 10) / 10
    }

    samples.push({
      ts: timestamp.toISOString(),
      heel: heelValue,
      leftAnkle,
      rightAnkle,
    })
  }

  return samples
}

function computeStats(data: PressureSample[], period: HistoryQuery["period"]): PressureStats {
  const regions: Region[] = ["heel", "leftAnkle", "rightAnkle"]
  const thresholds = { heel: heelHigh, leftAnkle: ankleHigh, rightAnkle: ankleHigh }

  const stats: PressureStats = {
    period,
    sampleCount: data.length,
    avg: {} as Record<Region, number>,
    max: {} as Record<Region, { value: number; ts: string }>,
    timeInHighPct: {} as Record<Region, number>,
    highEvents: [],
  }

  // Calculate averages and maximums
  regions.forEach((region) => {
    const values = data.map((sample) => sample[region])
    stats.avg[region] = Math.round((values.reduce((sum, val) => sum + val, 0) / values.length) * 10) / 10

    const maxValue = Math.max(...values)
    const maxSample = data.find((sample) => sample[region] === maxValue)!
    stats.max[region] = { value: maxValue, ts: maxSample.ts }

    const highCount = values.filter((val) => val > thresholds[region]).length
    stats.timeInHighPct[region] = Math.round((highCount / values.length) * 100 * 10) / 10
  })

  // Find high events (contiguous periods above threshold)
  regions.forEach((region) => {
    let inEvent = false
    let eventStart = ""
    let eventPeak = 0
    let eventSamples = 0

    data.forEach((sample, index) => {
      const isHigh = sample[region] > thresholds[region]

      if (isHigh && !inEvent) {
        // Start new event
        inEvent = true
        eventStart = sample.ts
        eventPeak = sample[region]
        eventSamples = 1
      } else if (isHigh && inEvent) {
        // Continue event
        eventPeak = Math.max(eventPeak, sample[region])
        eventSamples++
      } else if (!isHigh && inEvent) {
        // End event
        inEvent = false
        stats.highEvents.push({
          region,
          start: eventStart,
          end: data[index - 1].ts,
          peak: eventPeak,
          samples: eventSamples,
        })
      }
    })

    // Handle event that continues to the end
    if (inEvent) {
      stats.highEvents.push({
        region,
        start: eventStart,
        end: data[data.length - 1].ts,
        peak: eventPeak,
        samples: eventSamples,
      })
    }
  })

  return stats
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = (searchParams.get("period") || "3d") as HistoryQuery["period"]
    const requestedInterval = searchParams.get("interval") as HistoryQuery["interval"]
    const patientId = searchParams.get("patientId") || "demo"

    // Set default intervals based on period
    const defaultInterval = period === "3d" ? "5m" : period === "7d" ? "5m" : "1h"
    const interval = requestedInterval || defaultInterval

    // Generate data using heel pressure from CSV and synthetic ankle data
    const data = generateMockData(period, interval)
    const stats = computeStats(data, period)

    console.log(`Generated ${data.length} data points with heel threshold: ${heelHigh}`);

    const response: HistoryResponse = {
      data,
      stats,
      meta: { period, interval },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("History API error:", error)
    return NextResponse.json({ error: "Failed to fetch history data" }, { status: 500 })
  }
}
