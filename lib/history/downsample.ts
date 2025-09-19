import type { PressureSample } from "./fetchHistory"

// Largest Triangle Three Buckets (LTTB) algorithm for downsampling time series data
export function downsampleLTTB(data: PressureSample[], targetPoints: number): PressureSample[] {
  if (data.length <= targetPoints || targetPoints < 3) return data

  const sampled: PressureSample[] = []
  const bucketSize = (data.length - 2) / (targetPoints - 2)

  // Always include first point
  sampled.push(data[0])

  let a = 0 // Initially a is the first point in the triangle

  for (let i = 0; i < targetPoints - 2; i++) {
    // Calculate point average for next bucket (containing c)
    let avgX = 0
    let avgY = 0
    const avgRangeStart = Math.floor((i + 1) * bucketSize) + 1
    const avgRangeEnd = Math.floor((i + 2) * bucketSize) + 1
    const avgRangeLength = avgRangeEnd - avgRangeStart

    for (let j = avgRangeStart; j < avgRangeEnd; j++) {
      avgX += new Date(data[j].ts).getTime()
      avgY += (data[j].heel + data[j].leftAnkle + data[j].rightAnkle) / 3 // Average pressure
    }
    avgX /= avgRangeLength
    avgY /= avgRangeLength

    // Get the range for this bucket
    const rangeOffs = Math.floor(i * bucketSize) + 1
    const rangeTo = Math.floor((i + 1) * bucketSize) + 1

    // Point a
    const pointAX = new Date(data[a].ts).getTime()
    const pointAY = (data[a].heel + data[a].leftAnkle + data[a].rightAnkle) / 3

    let maxArea = -1
    let maxAreaPoint = rangeOffs

    for (let j = rangeOffs; j < rangeTo; j++) {
      const pointBX = new Date(data[j].ts).getTime()
      const pointBY = (data[j].heel + data[j].leftAnkle + data[j].rightAnkle) / 3

      // Calculate triangle area over the three buckets
      const area = Math.abs((pointAX - avgX) * (pointBY - pointAY) - (pointAX - pointBX) * (avgY - pointAY)) * 0.5

      if (area > maxArea) {
        maxArea = area
        maxAreaPoint = j
      }
    }

    sampled.push(data[maxAreaPoint])
    a = maxAreaPoint // This a is the next a (chosen b)
  }

  // Always include last point
  sampled.push(data[data.length - 1])

  return sampled
}
