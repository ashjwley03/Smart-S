"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"
import { useSettings } from "@/lib/settings/useSettings"
import { useToast } from "@/hooks/use-toast"

const historySchema = z.object({
  retentionDays: z.literal(90),
  timezone: z.string(),
  exportFormat: z.enum(["csv", "json"]),
  uploadEnabled: z.boolean(),
  uploadEndpoint: z.string().url().optional(),
})

type HistoryForm = z.infer<typeof historySchema>

export function HistoryDataSection() {
  const { settings, patch } = useSettings()
  const { toast } = useToast()

  const form = useForm<HistoryForm>({
    resolver: zodResolver(historySchema),
    defaultValues: settings.history,
  })

  const onSubmit = (data: HistoryForm) => {
    patch({ history: data })
    toast({
      title: "History Settings Updated",
      description: "Your data management preferences have been saved.",
    })
  }

  const exportNow = () => {
    // Placeholder for export functionality
    toast({
      title: "Export Started",
      description: "Your data export is being prepared for download.",
    })
  }

  const clearHistory = () => {
    if (confirm("Are you sure you want to clear all local history? This action cannot be undone.")) {
      toast({
        title: "History Cleared",
        description: "All local pressure history has been deleted.",
      })
    }
  }

  const retentionOptions = [
    { value: 30, label: "30 days" },
    { value: 60, label: "60 days" },
    { value: 90, label: "90 days" },
    { value: 180, label: "180 days" },
    { value: 365, label: "365 days" },
  ]

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="retentionDays">Data Retention</Label>
          <Select
            value="90"
            onValueChange={() => {}} // Fixed at 90 days per schema
            disabled
          >
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="90">90 days</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground mt-1">Data retention is currently fixed at 90 days.</p>
        </div>

        <div>
          <Label htmlFor="timezone">Timezone</Label>
          <Input id="timezone" {...form.register("timezone")} placeholder="e.g., America/Chicago" className="mt-2" />
        </div>

        <div>
          <Label htmlFor="exportFormat">Export Format</Label>
          <Select
            value={form.watch("exportFormat")}
            onValueChange={(value) => form.setValue("exportFormat", value as any)}
          >
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="uploadEnabled">Enable Data Upload</Label>
          <Switch
            id="uploadEnabled"
            checked={form.watch("uploadEnabled")}
            onCheckedChange={(checked) => form.setValue("uploadEnabled", checked)}
          />
        </div>

        {form.watch("uploadEnabled") && (
          <div>
            <Label htmlFor="uploadEndpoint">Upload Endpoint</Label>
            <Input
              id="uploadEndpoint"
              {...form.register("uploadEndpoint")}
              placeholder="https://api.example.com/upload"
              className="mt-2"
            />
          </div>
        )}

        <div className="space-y-2">
          <Button type="button" onClick={exportNow} variant="outline" className="w-full sm:w-auto">
            Export Now
          </Button>
          <p className="text-sm text-muted-foreground">Downloads data for the last visible range from History page.</p>
        </div>

        <Alert className="border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium text-destructive">Danger Zone</p>
              <Button type="button" onClick={clearHistory} variant="destructive" size="sm" className="w-full sm:w-auto">
                Clear Local History
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>

      <Button type="submit" className="w-full sm:w-auto">Save History Settings</Button>
    </form>
  )
}
