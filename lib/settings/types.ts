export type Region = "heel" | "leftAnkle" | "rightAnkle"

export type Settings = {
  profile: {
    displayName: string
    patientId?: string
    dateOfBirth?: string // ISO
  }
  alerts: {
    enabled: boolean
    thresholds: {
      heelHigh: number // kPa, default 300
      ankleHigh: number // kPa, default 350 (both ankles)
    }
    modes: { banner: boolean; sound: boolean; push: boolean }
    repeatEveryMin: number // 0 = don't repeat
    quietHours?: { start: string; end: string } | null // "22:00", "07:00"
  }
  visualization: {
    palette: "clinical" | "viridis" | "inferno" | "colorblindSafe"
    pulseOnHigh: boolean
    showRegionBoundaries: boolean
    smoothingWindow: 0 | 5 | 10 // used by charts
  }
  device: {
    preferredDeviceId?: string
    autoReconnect: boolean
    sampleIntervalMs: number // 1000..60000
  }
  calibration: {
    // parameters your 3D renderer uses; seeded with current constants
    heelEnd: number // 0..1  default 0.18
    ankleStart: number // 0..1  default 0.35
    lateralGap: number // 0..0.5 default 0.12
    swapLeftRight: boolean
    zeroOffsetKPa: number // baseline subtraction
  }
  history: {
    retentionDays: 90
    timezone: string // e.g., "America/Chicago"
    exportFormat: "csv" | "json"
    uploadEnabled: boolean
    uploadEndpoint?: string
  }
  accessibility: {
    textScale: 1 | 1.1 | 1.25 | 1.5
    highContrast: boolean
    haptics: boolean
    theme: "system" | "light" | "dark"
  }
}

export const DEFAULT_SETTINGS: Settings = {
  profile: { displayName: "Patient" },
  alerts: {
    enabled: true,
    thresholds: { heelHigh: 300, ankleHigh: 350 },
    modes: { banner: true, sound: true, push: false },
    repeatEveryMin: 0,
    quietHours: null,
  },
  visualization: {
    palette: "clinical",
    pulseOnHigh: true,
    showRegionBoundaries: false,
    smoothingWindow: 0,
  },
  device: { autoReconnect: true, sampleIntervalMs: 500 },
  calibration: { heelEnd: 0.18, ankleStart: 0.35, lateralGap: 0.12, swapLeftRight: false, zeroOffsetKPa: 0 },
  history: { retentionDays: 90, timezone: "UTC", exportFormat: "csv", uploadEnabled: false },
  accessibility: { textScale: 1, highContrast: false, haptics: false, theme: "system" },
}
