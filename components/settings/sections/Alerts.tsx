"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { useSettings } from "@/lib/settings/useSettings"
import { useToast } from "@/hooks/use-toast"

const alertsSchema = z.object({
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
})

type AlertsForm = z.infer<typeof alertsSchema>

export function AlertsSection() {
  const { settings, patch } = useSettings()
  const { toast } = useToast()

  const form = useForm<AlertsForm>({
    resolver: zodResolver(alertsSchema),
    defaultValues: settings.alerts,
  })

  const onSubmit = (data: AlertsForm) => {
    patch({ alerts: data })
    toast({
      title: "Alert Settings Updated",
      description: "Your alert preferences have been saved.",
    })
  }

  const testAlert = () => {
    toast({
      title: "High Pressure Alert",
      description: `High pressure detected at Heel (${settings.alerts.thresholds.heelHigh} kPa)`,
      variant: "destructive",
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="enabled">Enable Alerts</Label>
          <Switch
            id="enabled"
            checked={form.watch("enabled")}
            onCheckedChange={(checked) => form.setValue("enabled", checked)}
          />
        </div>

        <div className="space-y-4">
          <h4 className="font-medium">Alert Modes</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="banner">Banner Notifications</Label>
              <Switch
                id="banner"
                checked={form.watch("modes.banner")}
                onCheckedChange={(checked) => form.setValue("modes.banner", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sound">Sound Alerts</Label>
              <Switch
                id="sound"
                checked={form.watch("modes.sound")}
                onCheckedChange={(checked) => form.setValue("modes.sound", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="push">Push Notifications</Label>
              <Switch
                id="push"
                checked={form.watch("modes.push")}
                onCheckedChange={(checked) => form.setValue("modes.push", checked)}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium">Thresholds</h4>
          <div>
            <Label htmlFor="heelHigh">Heel High Pressure (kPa)</Label>
            <div className="flex items-center space-x-4 mt-2">
              <Slider
                value={[form.watch("thresholds.heelHigh")]}
                onValueChange={([value]) => form.setValue("thresholds.heelHigh", value)}
                min={100}
                max={600}
                step={5}
                className="flex-1"
              />
              <Input
                type="number"
                value={form.watch("thresholds.heelHigh")}
                onChange={(e) => form.setValue("thresholds.heelHigh", Number.parseInt(e.target.value))}
                className="w-20"
                min={100}
                max={600}
                step={5}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="ankleHigh">Ankle High Pressure (kPa)</Label>
            <div className="flex items-center space-x-4 mt-2">
              <Slider
                value={[form.watch("thresholds.ankleHigh")]}
                onValueChange={([value]) => form.setValue("thresholds.ankleHigh", value)}
                min={100}
                max={600}
                step={5}
                className="flex-1"
              />
              <Input
                type="number"
                value={form.watch("thresholds.ankleHigh")}
                onChange={(e) => form.setValue("thresholds.ankleHigh", Number.parseInt(e.target.value))}
                className="w-20"
                min={100}
                max={600}
                step={5}
              />
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="repeatEveryMin">Repeat Every (minutes, 0 = no repeat)</Label>
          <Input
            id="repeatEveryMin"
            type="number"
            {...form.register("repeatEveryMin", { valueAsNumber: true })}
            min={0}
            max={60}
            className="mt-2"
          />
        </div>

        <div className="space-y-2">
          <Label>Quiet Hours (Optional)</Label>
          <div className="flex items-center space-x-2">
            <Input
              type="time"
              value={form.watch("quietHours")?.start || ""}
              onChange={(e) => {
                const current = form.watch("quietHours")
                form.setValue("quietHours", {
                  start: e.target.value,
                  end: current?.end || "07:00",
                })
              }}
              placeholder="Start time"
            />
            <span>to</span>
            <Input
              type="time"
              value={form.watch("quietHours")?.end || ""}
              onChange={(e) => {
                const current = form.watch("quietHours")
                form.setValue("quietHours", {
                  start: current?.start || "22:00",
                  end: e.target.value,
                })
              }}
              placeholder="End time"
            />
            <Button type="button" variant="outline" size="sm" onClick={() => form.setValue("quietHours", null)}>
              Clear
            </Button>
          </div>
        </div>

        <Button type="button" onClick={testAlert} variant="outline">
          Test Alert
        </Button>
      </div>

      <Button type="submit">Save Alert Settings</Button>
    </form>
  )
}
