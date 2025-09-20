"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { WifiOff, RefreshCw, Home, History, Settings } from "lucide-react"
import Link from "next/link"

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    setIsOnline(navigator.onLine)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleRetry = () => {
    if (navigator.onLine) {
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-muted rounded-full">
              <WifiOff className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">You're Offline</h1>
          <p className="text-muted-foreground">
            It looks like you've lost your internet connection. Some features may not be available.
          </p>
        </div>

        {/* Status Alert */}
        <Alert className={isOnline ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"}>
          <WifiOff className={`h-4 w-4 ${isOnline ? "text-green-600" : "text-orange-600"}`} />
          <AlertDescription className={isOnline ? "text-green-800" : "text-orange-800"}>
            {isOnline ? "Connection restored! You can reload the page." : "No internet connection detected."}
          </AlertDescription>
        </Alert>

        {/* Actions */}
        <div className="space-y-4">
          <Button 
            onClick={handleRetry} 
            className="w-full" 
            disabled={!isOnline}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {isOnline ? "Reload Page" : "Retry Connection"}
          </Button>

          {/* Available Offline Features */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Available Offline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">
                These features may work with cached data:
              </p>
              
              <div className="space-y-2">
                <Link href="/" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Home className="h-4 w-4 mr-2" />
                    Dashboard (Cached Data)
                  </Button>
                </Link>
                
                <Link href="/history" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <History className="h-4 w-4 mr-2" />
                    History (Cached Data)
                  </Button>
                </Link>
                
                <Link href="/settings" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Check your WiFi or mobile data connection</li>
                <li>• Try moving to an area with better signal</li>
                <li>• Some cached data may still be available</li>
                <li>• The app will automatically sync when you're back online</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
