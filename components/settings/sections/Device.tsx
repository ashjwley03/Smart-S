"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { useSettings } from "@/lib/settings/useSettings"
import { useToast } from "@/hooks/use-toast"

const deviceSchema = z.object({
  preferredDeviceId: z.string().optional(),
  autoReconnect: z.boolean(),
  sampleIntervalMs: z.number().min(1000).max(60000),
})

type DeviceForm = z.infer<typeof deviceSchema>

export function DeviceSection() {
  const { settings, patch } = useSettings()
  const { toast } = useToast()
  const [isConnecting, setIsConnecting] = useState(false)

  const form = useForm<DeviceForm>({
    resolver: zodResolver(deviceSchema),
    defaultValues: settings.device,
  })

  const onSubmit = (data: DeviceForm) => {
    patch({ device: data })
    toast({
      title: "Device Settings Updated",
      description: "Your device preferences have been saved.",
    })
  }

  const connectSensor = async () => {
    setIsConnecting(true)
    try {
      // Web Bluetooth placeholder
      if ("bluetooth" in navigator) {
        const device = await (navigator as any).bluetooth.requestDevice({
          filters: [{ services: ["battery_service"] }],
        })
        form.setValue("preferredDeviceId", device.id)
        toast({
          title: "Device Connected",
          description: `Connected to ${device.name || "Unknown Device"}`,
        })
      } else {
        toast({
          title: "Bluetooth Not Supported",
          description: "Web Bluetooth is not supported in this browser.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect to device.",
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const forgetDevice = () => {
    form.setValue("preferredDeviceId", undefined)
    toast({
      title: "Device Forgotten",
      description: "Preferred device has been removed.",
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="sampleIntervalMs">Sampling Interval (seconds)</Label>
          <Input
            id="sampleIntervalMs"
            type="number"
            value={form.watch("sampleIntervalMs") / 1000}
            onChange={(e) => form.setValue("sampleIntervalMs", Number.parseInt(e.target.value) * 1000)}
            min={1}
            max={60}
            className="mt-2"
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="autoReconnect">Auto-reconnect</Label>
          <Switch
            id="autoReconnect"
            checked={form.watch("autoReconnect")}
            onCheckedChange={(checked) => form.setValue("autoReconnect", checked)}
          />
        </div>

        <div className="space-y-2">
          <Label>Sensor Connection</Label>
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
            {form.watch("preferredDeviceId") ? (
              <>
                <Badge variant="secondary">Device Connected</Badge>
                <Button 
                  type="button" 
                  onClick={forgetDevice} 
                  variant="outline" 
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  Forget
                </Button>
              </>
            ) : (
              <Button 
                type="button" 
                onClick={connectSensor} 
                disabled={isConnecting} 
                variant="outline"
                className="w-full sm:w-auto"
              >
                {isConnecting ? "Connecting..." : "Connect Sensor"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full sm:w-auto">Save Device Settings</Button>
    </form>
  )
}
