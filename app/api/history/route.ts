import { type NextRequest, NextResponse } from "next/server"
import { heelPressureData, heelPressureThreshold } from "@/lib/history/heelPressureData"
import { anklePressureData, anklePressureThreshold } from "@/lib/history/anklePressureData"

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

// Using CSV-based thresholds for heel and ankle pressure
const heelHigh = heelPressureThreshold
const ankleHigh = anklePressureThreshold

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

  // Calculate how many samples we need
  const totalSamples = Math.ceil(periodMs / intervalMs)
  
  // Get the CSV heel pressure data
  const heelDataLength = heelPressureData.length
  
  // Make sure we have enough seed values for random number generation
  const seedValues: number[] = []
  for (let i = 0; i < 1000; i++) {
    seedValues.push(rng())
  }
  
  for (let i = 0; i < totalSamples; i++) {
    const timestamp = new Date(now.getTime() - periodMs + i * intervalMs)
    
    // Get heel pressure from CSV data (using modulo to loop through the data)
    const heelIndex = i % heelDataLength
    const heel = heelPressureData[heelIndex].value
    
    // Generate ankle pressure based on heel pressure, following the business rule:
    // - When heel pressure > 0 (patient standing): ankle pressure = 0
    // - When heel pressure = 0 (patient lying down): generate ankle pressure
    const isStanding = heel > 0
    
    // Generate ankle pressure data with left ankle from CSV and right ankle = 0
    // (Since we're only detecting the left leg for this patient)
    let leftAnkle: number
    let rightAnkle: number
    
    if (isStanding) {
      // Patient is standing, both ankles have no pressure
      leftAnkle = 0
      rightAnkle = 0
    } else {
      // Patient is lying down, use CSV for left ankle and zero for right ankle
      // (This simulates a left side detection for this patient)
      const ankleIndex = i % anklePressureData.length
      leftAnkle = anklePressureData[ankleIndex].value
      
      // Right ankle has no pressure since we're only detecting the left leg
      rightAnkle = 0
    }

    samples.push({
      ts: timestamp.toISOString(),
      heel,
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

    // Generate mock data
    const data = generateMockData(period, interval)
    const stats = computeStats(data, period)

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
