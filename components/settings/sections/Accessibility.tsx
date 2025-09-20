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

const accessibilitySchema = z.object({
  textScale: z.union([z.literal(1), z.literal(1.1), z.literal(1.25), z.literal(1.5)]),
  highContrast: z.boolean(),
  haptics: z.boolean(),
  theme: z.enum(["system", "light", "dark"]),
})

type AccessibilityForm = z.infer<typeof accessibilitySchema>

export function AccessibilitySection() {
  const { settings, patch } = useSettings()
  const { toast } = useToast()

  const form = useForm<AccessibilityForm>({
    resolver: zodResolver(accessibilitySchema),
    defaultValues: settings.accessibility,
  })

  const onSubmit = (data: AccessibilityForm) => {
    patch({ accessibility: data })
    toast({
      title: "Accessibility Updated",
      description: "Your accessibility preferences have been saved.",
    })
  }

  const textScaleOptions = [
    { value: 1, label: "Normal (100%)" },
    { value: 1.1, label: "Large (110%)" },
    { value: 1.25, label: "Larger (125%)" },
    { value: 1.5, label: "Largest (150%)" },
  ]

  const themeOptions = [
    { value: "system", label: "System" },
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
  ]

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="textScale">Text Scale</Label>
          <Select
            value={form.watch("textScale").toString()}
            onValueChange={(value) => form.setValue("textScale", Number.parseFloat(value) as any)}
          >
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {textScaleOptions.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="highContrast">High Contrast Mode</Label>
          <Switch
            id="highContrast"
            checked={form.watch("highContrast")}
            onCheckedChange={(checked) => form.setValue("highContrast", checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="haptics">Haptic Feedback</Label>
          <Switch
            id="haptics"
            checked={form.watch("haptics")}
            onCheckedChange={(checked) => form.setValue("haptics", checked)}
          />
        </div>

        <div>
          <Label htmlFor="theme">Theme</Label>
          <Select value={form.watch("theme")} onValueChange={(value) => form.setValue("theme", value as any)}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {themeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit">Save Accessibility Settings</Button>
    </form>
  )
}
