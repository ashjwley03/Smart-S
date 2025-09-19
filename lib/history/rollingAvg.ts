import type { PressureSample } from "./fetchHistory"

export function applyRollingAverage(data: PressureSample[], window: number): PressureSample[] {
  if (window <= 1 || data.length === 0) return data

  const smoothed: PressureSample[] = []

  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - Math.floor(window / 2))
    const end = Math.min(data.length, i + Math.ceil(window / 2))
    const windowData = data.slice(start, end)

    const avgHeel = windowData.reduce((sum, sample) => sum + sample.heel, 0) / windowData.length
    const avgLeftAnkle = windowData.reduce((sum, sample) => sum + sample.leftAnkle, 0) / windowData.length
    const avgRightAnkle = windowData.reduce((sum, sample) => sum + sample.rightAnkle, 0) / windowData.length

    smoothed.push({
      ts: data[i].ts,
      heel: Math.round(avgHeel * 10) / 10,
      leftAnkle: Math.round(avgLeftAnkle * 10) / 10,
      rightAnkle: Math.round(avgRightAnkle * 10) / 10,
    })
  }

  return smoothed
}
