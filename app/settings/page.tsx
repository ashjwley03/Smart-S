import { SettingsPanel } from "@/components/settings/SettingsPanel"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border px-4 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Live
              </Button>
            </Link>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Settings</h1>
          </div>
        </div>
      </div>
      <SettingsPanel />
    </div>
  )
}
