"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSettings } from "@/lib/settings/useSettings"
import { useToast } from "@/hooks/use-toast"

const visualizationSchema = z.object({
  palette: z.enum(["clinical", "viridis", "inferno", "colorblindSafe"]),
  pulseOnHigh: z.boolean(),
  showRegionBoundaries: z.boolean(),
  smoothingWindow: z.union([z.literal(0), z.literal(5), z.literal(10)]),
})

type VisualizationForm = z.infer<typeof visualizationSchema>

export function VisualizationSection() {
  const { settings, patch } = useSettings()
  const { toast } = useToast()

  const form = useForm<VisualizationForm>({
    resolver: zodResolver(visualizationSchema),
    defaultValues: settings.visualization,
  })

  const onSubmit = (data: VisualizationForm) => {
    patch({ visualization: data })
    toast({
      title: "Visualization Updated",
      description: "Your visualization preferences have been saved.",
    })
  }

  const paletteOptions = [
    { value: "clinical", label: "Clinical" },
    { value: "viridis", label: "Viridis" },
    { value: "inferno", label: "Inferno" },
    { value: "colorblindSafe", label: "Colorblind Safe" },
  ]

  const smoothingOptions = [
    { value: 0, label: "Off" },
    { value: 5, label: "5 samples" },
    { value: 10, label: "10 samples" },
  ]

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="palette">Color Palette</Label>
          <Select value={form.watch("palette")} onValueChange={(value) => form.setValue("palette", value as any)}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {paletteOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Mini preview swatch */}
          <div className="flex items-center space-x-2 mt-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-sm text-muted-foreground">Preview</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="pulseOnHigh">Pulse Animation on High Pressure</Label>
          <Switch
            id="pulseOnHigh"
            checked={form.watch("pulseOnHigh")}
            onCheckedChange={(checked) => form.setValue("pulseOnHigh", checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="showRegionBoundaries">Show Region Boundaries</Label>
          <Switch
            id="showRegionBoundaries"
            checked={form.watch("showRegionBoundaries")}
            onCheckedChange={(checked) => form.setValue("showRegionBoundaries", checked)}
          />
        </div>

        <div>
          <Label htmlFor="smoothingWindow">Chart Smoothing</Label>
          <Select
            value={form.watch("smoothingWindow").toString()}
            onValueChange={(value) => form.setValue("smoothingWindow", Number.parseInt(value) as any)}
          >
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {smoothingOptions.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" className="w-full sm:w-auto">Save Visualization Settings</Button>
    </form>
  )
}
