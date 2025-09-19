import useSWR from "swr"

export type Region = "heel" | "leftAnkle" | "rightAnkle"

export type PressureSample = {
  ts: string
  heel: number
  leftAnkle: number
  rightAnkle: number
}

export type HistoryQuery = {
  patientId: string
  period: "3d" | "7d" | "30d"
  interval?: "1m" | "5m" | "1h"
}

export type PressureStats = {
  period: HistoryQuery["period"]
  sampleCount: number
  avg: Record<Region, number>
  max: Record<Region, { value: number; ts: string }>
  timeInHighPct: Record<Region, number>
  highEvents: Array<{ region: Region; start: string; end: string; peak: number; samples: number }>
}

export type HistoryResponse = {
  data: PressureSample[]
  stats: PressureStats
  meta: { period: HistoryQuery["period"]; interval: Required<HistoryQuery>["interval"] }
}

const fetcher = async (url: string): Promise<HistoryResponse> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error("Failed to fetch history data")
  }
  return response.json()
}

export function useHistoryData(query: HistoryQuery) {
  const params = new URLSearchParams({
    period: query.period,
    patientId: query.patientId,
    ...(query.interval && { interval: query.interval }),
  })

  const { data, error, isLoading, mutate } = useSWR<HistoryResponse>(`/api/history?${params.toString()}`, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 30000, // 30 seconds
  })

  return {
    data,
    error,
    isLoading,
    mutate,
  }
}
