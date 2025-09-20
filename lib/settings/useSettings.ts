import { useSettingsStore } from "./store"
import type { Settings } from "./types"

export function useSettings() {
  const store = useSettingsStore()
  return store
}

// Helper functions for common settings access
export function getHeelThreshold(settings: Settings): number {
  return settings.alerts.thresholds.heelHigh
}

export function getAnkleThreshold(settings: Settings): number {
  return settings.alerts.thresholds.ankleHigh
}

export function getHeatmapPalette(settings: Settings): string {
  return settings.visualization.palette
}

export function getSmoothingWindow(settings: Settings): number {
  return settings.visualization.smoothingWindow
}

export function getCalibrationParams(settings: Settings) {
  return {
    heelEnd: settings.calibration.heelEnd,
    ankleStart: settings.calibration.ankleStart,
    lateralGap: settings.calibration.lateralGap,
    swapLeftRight: settings.calibration.swapLeftRight,
    zeroOffsetKPa: settings.calibration.zeroOffsetKPa,
  }
}
