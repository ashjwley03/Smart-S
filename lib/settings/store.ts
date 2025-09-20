import { create } from "zustand"
import { persist } from "zustand/middleware"
import { type Settings, DEFAULT_SETTINGS } from "./types"
import { settingsSchema } from "./schema"

interface SettingsStore {
  settings: Settings
  setSettings: (settings: Settings) => void
  patch: (updates: Partial<Settings>) => void
  reset: () => void
  importJson: (json: string) => Promise<void>
  exportJson: () => string
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      setSettings: (settings) => {
        const validated = settingsSchema.parse(settings)
        set({ settings: validated })
      },
      patch: (updates) => {
        const current = get().settings
        const merged = { ...current, ...updates }
        const validated = settingsSchema.parse(merged)
        set({ settings: validated })
      },
      reset: () => set({ settings: DEFAULT_SETTINGS }),
      importJson: async (json) => {
        try {
          const parsed = JSON.parse(json)
          if (parsed.version !== 1) {
            throw new Error("Unsupported settings version")
          }
          const validated = settingsSchema.parse(parsed.settings)
          set({ settings: validated })
        } catch (error) {
          throw new Error(`Invalid settings format: ${error instanceof Error ? error.message : "Unknown error"}`)
        }
      },
      exportJson: () => {
        const { settings } = get()
        return JSON.stringify({ version: 1, settings }, null, 2)
      },
    }),
    {
      name: "foot-pressure-settings",
      version: 1,
    },
  ),
)
