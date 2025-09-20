"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSettings } from "@/lib/settings/useSettings"
import { useToast } from "@/hooks/use-toast"

const calibrationSchema = z.object({
  heelEnd: z.number().min(0).max(1),
  ankleStart: z.number().min(0).max(1),
  lateralGap: z.number().min(0).max(0.5),
  swapLeftRight: z.boolean(),
  zeroOffsetKPa: z.number().min(-100).max(100),
})

type CalibrationForm = z.infer<typeof calibrationSchema>

export function CalibrationSection() {
  const { settings, patch } = useSettings()
  const { toast } = useToast()
  const [calibrationStep, setCalibrationStep] = useState(0)

  const form = useForm<CalibrationForm>({
    resolver: zodResolver(calibrationSchema),
    defaultValues: settings.calibration,
  })

  const onSubmit = (data: CalibrationForm) => {
    patch({ calibration: data })
    toast({
      title: "Calibration Updated",
      description: "Your calibration settings have been saved.",
    })
  }

  const startCalibration = () => {
    setCalibrationStep(1)
  }

  const nextStep = () => {
    setCalibrationStep((prev) => Math.min(prev + 1, 3))
  }

  const finishCalibration = () => {
    setCalibrationStep(0)
    toast({
      title: "Calibration Complete",
      description: "Sensor calibration has been completed.",
    })
  }

  return (
    <div className="space-y-6">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="heelEnd">Heel End (0-1)</Label>
            <div className="flex items-center space-x-4 mt-2">
              <Slider
                value={[form.watch("heelEnd")]}
                onValueChange={([value]) => form.setValue("heelEnd", value)}
                min={0}
                max={1}
                step={0.01}
                className="flex-1"
              />
              <Input
                type="number"
                value={form.watch("heelEnd")}
                onChange={(e) => form.setValue("heelEnd", Number.parseFloat(e.target.value))}
                className="w-20"
                min={0}
                max={1}
                step={0.01}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="ankleStart">Ankle Start (0-1)</Label>
            <div className="flex items-center space-x-4 mt-2">
              <Slider
                value={[form.watch("ankleStart")]}
                onValueChange={([value]) => form.setValue("ankleStart", value)}
                min={0}
                max={1}
                step={0.01}
                className="flex-1"
              />
              <Input
                type="number"
                value={form.watch("ankleStart")}
                onChange={(e) => form.setValue("ankleStart", Number.parseFloat(e.target.value))}
                className="w-20"
                min={0}
                max={1}
                step={0.01}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="lateralGap">Lateral Gap (0-0.5)</Label>
            <div className="flex items-center space-x-4 mt-2">
              <Slider
                value={[form.watch("lateralGap")]}
                onValueChange={([value]) => form.setValue("lateralGap", value)}
                min={0}
                max={0.5}
                step={0.01}
                className="flex-1"
              />
              <Input
                type="number"
                value={form.watch("lateralGap")}
                onChange={(e) => form.setValue("lateralGap", Number.parseFloat(e.target.value))}
                className="w-20"
                min={0}
                max={0.5}
                step={0.01}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="swapLeftRight">Swap Left/Right</Label>
            <Switch
              id="swapLeftRight"
              checked={form.watch("swapLeftRight")}
              onCheckedChange={(checked) => form.setValue("swapLeftRight", checked)}
            />
          </div>

          <div>
            <Label htmlFor="zeroOffsetKPa">Zero Offset (kPa)</Label>
            <Input
              id="zeroOffsetKPa"
              type="number"
              {...form.register("zeroOffsetKPa", { valueAsNumber: true })}
              min={-100}
              max={100}
              className="mt-2"
            />
          </div>
        </div>

        <Button type="submit">Save Calibration</Button>
      </form>

      {/* Calibration Wizard */}
      <Card>
        <CardHeader>
          <CardTitle>Calibration Wizard</CardTitle>
        </CardHeader>
        <CardContent>
          {calibrationStep === 0 && (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Follow the calibration wizard to optimize sensor readings for your foot.
              </p>
              <Button onClick={startCalibration}>Start Calibration</Button>
            </div>
          )}

          {calibrationStep === 1 && (
            <div className="space-y-4">
              <h4 className="font-medium">Step 1: Zero Calibration</h4>
              <p className="text-muted-foreground">
                Lift your foot completely off the sensor and press "Zero" to establish baseline.
              </p>
              <Button onClick={nextStep}>Zero</Button>
            </div>
          )}

          {calibrationStep === 2 && (
            <div className="space-y-4">
              <h4 className="font-medium">Step 2: Heel Pressure</h4>
              <p className="text-muted-foreground">Place pressure on your heel. Adjust the visualization if needed.</p>
              <div className="bg-muted p-4 rounded">
                <p className="text-sm">Live reading: 245 kPa (Heel)</p>
              </div>
              <Button onClick={nextStep}>Next</Button>
            </div>
          )}

          {calibrationStep === 3 && (
            <div className="space-y-4">
              <h4 className="font-medium">Step 3: Ankle Pressure</h4>
              <p className="text-muted-foreground">
                Apply pressure to left and right ankle areas. Fine-tune the sliders above if the regions don't match.
              </p>
              <div className="bg-muted p-4 rounded">
                <p className="text-sm">Live reading: 312 kPa (Right Ankle)</p>
              </div>
              <Button onClick={finishCalibration}>Finish Calibration</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
