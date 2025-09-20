import { z } from "zod"

export const settingsSchema = z.object({
  profile: z.object({
    displayName: z.string().min(1, "Display name is required").max(50, "Display name too long"),
    patientId: z.string().optional(),
    dateOfBirth: z.string().optional(),
  }),
  alerts: z.object({
    enabled: z.boolean(),
    thresholds: z.object({
      heelHigh: z.number().min(100).max(600),
      ankleHigh: z.number().min(100).max(600),
    }),
    modes: z.object({
      banner: z.boolean(),
      sound: z.boolean(),
      push: z.boolean(),
    }),
    repeatEveryMin: z.number().min(0).max(60),
    quietHours: z
      .object({
        start: z.string().regex(/^\d{2}:\d{2}$/),
        end: z.string().regex(/^\d{2}:\d{2}$/),
      })
      .nullable(),
  }),
  visualization: z.object({
    palette: z.enum(["clinical", "viridis", "inferno", "colorblindSafe"]),
    pulseOnHigh: z.boolean(),
    showRegionBoundaries: z.boolean(),
    smoothingWindow: z.union([z.literal(0), z.literal(5), z.literal(10)]),
  }),
  device: z.object({
    preferredDeviceId: z.string().optional(),
    autoReconnect: z.boolean(),
    sampleIntervalMs: z.number().min(1000).max(60000),
  }),
  calibration: z.object({
    heelEnd: z.number().min(0).max(1),
    ankleStart: z.number().min(0).max(1),
    lateralGap: z.number().min(0).max(0.5),
    swapLeftRight: z.boolean(),
    zeroOffsetKPa: z.number().min(-100).max(100),
  }),
  history: z.object({
    retentionDays: z.literal(90),
    timezone: z.string(),
    exportFormat: z.enum(["csv", "json"]),
    uploadEnabled: z.boolean(),
    uploadEndpoint: z.string().url().optional(),
  }),
  accessibility: z.object({
    textScale: z.union([z.literal(1), z.literal(1.1), z.literal(1.25), z.literal(1.5)]),
    highContrast: z.boolean(),
    haptics: z.boolean(),
    theme: z.enum(["system", "light", "dark"]),
  }),
})

export type SettingsInput = z.infer<typeof settingsSchema>
