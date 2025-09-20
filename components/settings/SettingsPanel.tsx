"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AlertTriangle, Download, Upload, RotateCcw, Save } from "lucide-react"
import { useSettings } from "@/lib/settings/useSettings"
import { useToast } from "@/hooks/use-toast"
import { ProfileSection } from "./sections/Profile"
import { AlertsSection } from "./sections/Alerts"
import { VisualizationSection } from "./sections/Visualization"
import { DeviceSection } from "./sections/Device"
import { CalibrationSection } from "./sections/Calibration"
import { HistoryDataSection } from "./sections/HistoryData"
import { AccessibilitySection } from "./sections/Accessibility"

const SECTIONS = [
  { id: "profile", label: "Profile", component: ProfileSection },
  { id: "alerts", label: "Alerts", component: AlertsSection },
  { id: "visualization", label: "Visualization", component: VisualizationSection },
  { id: "device", label: "Device", component: DeviceSection },
  { id: "calibration", label: "Calibration", component: CalibrationSection },
  { id: "history", label: "History & Data", component: HistoryDataSection },
  { id: "accessibility", label: "Accessibility", component: AccessibilitySection },
]

export function SettingsPanel() {
  const [activeSection, setActiveSection] = useState("profile")
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [importPreview, setImportPreview] = useState<any>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const { settings, reset, exportJson, importJson } = useSettings()
  const { toast } = useToast()

  const handleReset = () => {
    setShowResetDialog(true)
  }

  const confirmReset = () => {
    reset()
    setShowResetDialog(false)
    toast({
      title: "Settings Reset",
      description: "All settings have been restored to defaults.",
    })
  }

  const handleExport = () => {
    const json = exportJson()
    const timestamp = new Date().toISOString().split("T")[0]
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `foot-pressure-settings-${timestamp}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast({
      title: "Settings Exported",
      description: `Settings exported as foot-pressure-settings-${timestamp}.json`,
    })
  }

  const handleImport = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        const parsed = JSON.parse(text)

        // Validate structure
        if (!parsed.version || !parsed.settings) {
          throw new Error("Invalid settings file format")
        }

        setImportFile(file)
        setImportPreview(parsed)
        setShowImportDialog(true)
      } catch (error) {
        toast({
          title: "Import Failed",
          description: error instanceof Error ? error.message : "Failed to parse settings file.",
          variant: "destructive",
        })
      }
    }
    input.click()
  }

  const confirmImport = async () => {
    if (!importPreview || !importFile) return

    try {
      const text = await importFile.text()
      await importJson(text)
      setShowImportDialog(false)
      setImportPreview(null)
      setImportFile(null)
      toast({
        title: "Settings Imported",
        description: "Settings have been successfully imported and applied.",
      })
    } catch (error) {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import settings.",
        variant: "destructive",
      })
    }
  }

  const cancelImport = () => {
    setShowImportDialog(false)
    setImportPreview(null)
    setImportFile(null)
  }

  const generateDiff = () => {
    if (!importPreview) return []

    const changes = []
    const newSettings = importPreview.settings

    // Compare key sections
    if (newSettings.profile?.displayName !== settings.profile.displayName) {
      changes.push(`Display Name: "${settings.profile.displayName}" → "${newSettings.profile?.displayName}"`)
    }

    if (newSettings.alerts?.thresholds?.heelHigh !== settings.alerts.thresholds.heelHigh) {
      changes.push(
        `Heel Threshold: ${settings.alerts.thresholds.heelHigh} → ${newSettings.alerts?.thresholds?.heelHigh} kPa`,
      )
    }

    if (newSettings.alerts?.thresholds?.ankleHigh !== settings.alerts.thresholds.ankleHigh) {
      changes.push(
        `Ankle Threshold: ${settings.alerts.thresholds.ankleHigh} → ${newSettings.alerts?.thresholds?.ankleHigh} kPa`,
      )
    }

    if (newSettings.visualization?.palette !== settings.visualization.palette) {
      changes.push(`Color Palette: ${settings.visualization.palette} → ${newSettings.visualization?.palette}`)
    }

    if (newSettings.device?.sampleIntervalMs !== settings.device.sampleIntervalMs) {
      changes.push(`Sample Interval: ${settings.device.sampleIntervalMs}ms → ${newSettings.device?.sampleIntervalMs}ms`)
    }

    return changes
  }

  const ActiveComponent = SECTIONS.find((s) => s.id === activeSection)?.component || ProfileSection

  return (
    <>
      <div className="flex h-[calc(100vh-73px)]">
        {/* Left Navigation */}
        <div className="w-64 border-r border-border bg-card">
          <div className="p-4">
            <nav className="space-y-1">
              {SECTIONS.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeSection === section.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-auto p-6">
            <Card>
              <CardHeader>
                <CardTitle>{SECTIONS.find((s) => s.id === activeSection)?.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <ActiveComponent />
              </CardContent>
            </Card>
          </div>

          {/* Sticky Footer */}
          <div className="border-t border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button onClick={handleImport} variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Import JSON
                </Button>
                <Button onClick={handleExport} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export JSON
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleReset} variant="outline" size="sm">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset to Defaults
                </Button>
                <Button size="sm">
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Import Preview Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Settings Preview</DialogTitle>
            <DialogDescription>Review the changes that will be applied to your current settings.</DialogDescription>
          </DialogHeader>

          {importPreview && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Version {importPreview.version}</Badge>
                <Badge variant="outline">{importFile?.name}</Badge>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Changes to be applied:</h4>
                {generateDiff().length > 0 ? (
                  <div className="space-y-1">
                    {generateDiff().map((change, index) => (
                      <div key={index} className="text-sm bg-muted p-2 rounded">
                        {change}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No significant changes detected.</p>
                )}
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This will overwrite your current settings. Make sure to export your current settings first if you want
                  to keep a backup.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={cancelImport}>
              Cancel
            </Button>
            <Button onClick={confirmImport}>Import Settings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Settings</DialogTitle>
            <DialogDescription>
              Are you sure you want to reset all settings to their default values? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <Alert className="border-destructive/50 bg-destructive/10">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive">
              This will permanently reset all your customized thresholds, calibration settings, and preferences.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmReset}>
              Reset All Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
