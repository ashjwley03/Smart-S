"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSettings } from "@/lib/settings/useSettings"
import { useToast } from "@/hooks/use-toast"

const profileSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(50, "Display name too long"),
  patientId: z.string().optional(),
  dateOfBirth: z.string().optional(),
})

type ProfileForm = z.infer<typeof profileSchema>

export function ProfileSection() {
  const { settings, patch } = useSettings()
  const { toast } = useToast()

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: settings.profile,
  })

  const onSubmit = (data: ProfileForm) => {
    patch({ profile: data })
    toast({
      title: "Profile Updated",
      description: "Your profile settings have been saved.",
    })
  }

  const fillTimezone = () => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    patch({ history: { ...settings.history, timezone } })
    toast({
      title: "Timezone Updated",
      description: `Timezone set to ${timezone}`,
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="displayName">Display Name</Label>
          <Input id="displayName" {...form.register("displayName")} placeholder="Enter display name" />
          {form.formState.errors.displayName && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.displayName.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="patientId">Patient ID (Optional)</Label>
          <Input id="patientId" {...form.register("patientId")} placeholder="Enter patient ID" />
        </div>

        <div>
          <Label htmlFor="dateOfBirth">Date of Birth (Optional)</Label>
          <Input id="dateOfBirth" type="date" {...form.register("dateOfBirth")} />
        </div>

        <div className="pt-4">
          <Button type="button" onClick={fillTimezone} variant="outline">
            Fill Timezone from Browser
          </Button>
          <p className="text-sm text-muted-foreground mt-2">Current timezone: {settings.history.timezone}</p>
        </div>
      </div>

      <Button type="submit">Save Profile</Button>
    </form>
  )
}
