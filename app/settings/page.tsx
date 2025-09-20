import { SettingsPanel } from "@/components/settings/SettingsPanel"

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
      </div>
      <SettingsPanel />
    </div>
  )
}
