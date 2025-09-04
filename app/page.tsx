"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, RotateCcw } from "lucide-react"

export default function FootPressureMonitor() {
  const [isConnected, setIsConnected] = useState(false)
  const [activeTab, setActiveTab] = useState("Live")
  const [currentReadings, setCurrentReadings] = useState({
    heel: { value: 0, status: "No Data" },
    arch: { value: 0, status: "No Data" },
    toe: { value: 0, status: "No Data" },
  })

  useEffect(() => {
    if (!isConnected) {
      setCurrentReadings({
        heel: { value: 0, status: "No Data" },
        arch: { value: 0, status: "No Data" },
        toe: { value: 0, status: "No Data" },
      })
      return
    }

    setCurrentReadings({
      heel: { value: 201.5, status: "High" },
      arch: { value: 367.4, status: "Normal" },
      toe: { value: 407.2, status: "High" },
    })

    const interval = setInterval(() => {
      setCurrentReadings((prev) => ({
        heel: {
          value: Math.round((prev.heel.value + (Math.random() - 0.5) * 10) * 10) / 10,
          status: prev.heel.value > 300 ? "High" : prev.heel.value > 200 ? "Normal" : "Low",
        },
        arch: {
          value: Math.round((prev.arch.value + (Math.random() - 0.5) * 15) * 10) / 10,
          status: prev.arch.value > 400 ? "High" : prev.arch.value > 250 ? "Normal" : "Low",
        },
        toe: {
          value: Math.round((prev.toe.value + (Math.random() - 0.5) * 12) * 10) / 10,
          status: prev.toe.value > 350 ? "High" : prev.toe.value > 200 ? "Normal" : "Low",
        },
      }))
    }, 2000)

    return () => clearInterval(interval)
  }, [isConnected])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "High":
        return "bg-destructive text-destructive-foreground"
      case "Normal":
        return "bg-primary text-primary-foreground"
      case "Low":
        return "bg-muted text-muted-foreground"
      case "No Data":
        return "bg-muted text-muted-foreground"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getReadingColor = (status: string) => {
    switch (status) {
      case "High":
        return "text-destructive font-semibold"
      case "Normal":
        return "text-primary font-semibold"
      case "Low":
        return "text-muted-foreground"
      case "No Data":
        return "text-muted-foreground"
      default:
        return "text-foreground"
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? "default" : "secondary"}>{isConnected ? "Connected" : "Disconnected"}</Badge>
        </div>
        <Button onClick={() => setIsConnected(!isConnected)} variant={isConnected ? "outline" : "default"} size="sm">
          {isConnected ? "Disconnect" : "Connect"}
        </Button>
      </div>

      {/* Alert Banner */}
      {isConnected && (currentReadings.heel.status === "High" || currentReadings.toe.status === "High") && (
        <Alert className="m-4 border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive">
            <div className="font-medium">
              High pressure detected at {currentReadings.heel.status === "High" ? "heel" : "toe"}
            </div>
            <div className="text-sm mt-1">
              <strong>Action:</strong> Reposition foot to distribute pressure to lateral ankle or elevate the entire
              foot
            </div>
            <div className="text-sm">
              <strong>Duration:</strong> 2-3 hours
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-border">
        {["Live", "History", "Settings"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-6">
        {/* 3D Pressure Map */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">3D Pressure Map</h2>
              <div className="flex items-center gap-1 text-muted-foreground">
                <RotateCcw className="h-4 w-4" />
                <span className="text-sm">360°</span>
              </div>
            </div>

            {/* Foot Visualization */}
            <div className="space-y-6">
              {/* Side View */}
              <div className="relative">
                <div className="w-full max-w-sm mx-auto">
                  <svg viewBox="0 0 320 140" className="w-full h-auto">
                    <path
                      d="M40 100 
                         Q45 85 55 75 
                         Q70 65 90 60 
                         Q120 55 150 57 
                         Q180 58 210 62 
                         Q240 67 260 75 
                         Q275 82 280 90 
                         Q285 95 280 100 
                         Q270 105 250 108 
                         Q220 110 190 109 
                         Q160 108 130 106 
                         Q100 104 70 102 
                         Q50 101 40 100 Z"
                      fill={isConnected ? "url(#sideFootGradient)" : "#e5e7eb"}
                      stroke="#9ca3af"
                      strokeWidth="1"
                    />

                    {/* Toe area definition */}
                    <path
                      d="M260 75 Q275 82 280 90 Q285 95 280 100 Q275 102 270 100 Q265 95 260 90 Q258 82 260 75"
                      fill={isConnected ? (currentReadings.toe.status === "High" ? "#dc2626" : "#3b82f6") : "#f3f4f6"}
                      opacity="0.8"
                    />

                    {/* Heel pressure area */}
                    <ellipse
                      cx="70"
                      cy="95"
                      rx="18"
                      ry="12"
                      fill={isConnected ? (currentReadings.heel.status === "High" ? "#dc2626" : "#22c55e") : "#f3f4f6"}
                      opacity="0.9"
                    />

                    <defs>
                      <linearGradient id="sideFootGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#1e40af" />
                        <stop offset="25%" stopColor="#0891b2" />
                        <stop offset="50%" stopColor="#059669" />
                        <stop offset="75%" stopColor="#ca8a04" />
                        <stop offset="100%" stopColor="#dc2626" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>

              {/* Bottom View */}
              <div className="relative">
                <div className="w-full max-w-sm mx-auto">
                  <svg viewBox="0 0 160 280" className="w-full h-auto">
                    {/* Main foot body */}
                    <path
                      d="M80 40
                         Q95 35 105 45
                         Q110 55 108 70
                         Q106 90 104 110
                         Q102 140 100 170
                         Q98 200 95 220
                         Q92 240 85 250
                         Q80 260 80 260
                         Q80 260 75 250
                         Q68 240 65 220
                         Q62 200 60 170
                         Q58 140 56 110
                         Q54 90 52 70
                         Q50 55 55 45
                         Q65 35 80 40 Z"
                      fill={isConnected ? "url(#bottomFootGradient)" : "#e5e7eb"}
                      stroke="#9ca3af"
                      strokeWidth="1"
                    />

                    {/* Toes */}
                    <ellipse cx="80" cy="50" rx="12" ry="8" fill={isConnected ? "#1e40af" : "#f3f4f6"} />
                    <ellipse cx="75" cy="42" rx="6" ry="5" fill={isConnected ? "#1e40af" : "#f3f4f6"} />
                    <ellipse cx="85" cy="42" rx="6" ry="5" fill={isConnected ? "#1e40af" : "#f3f4f6"} />
                    <ellipse cx="70" cy="46" rx="4" ry="4" fill={isConnected ? "#1e40af" : "#f3f4f6"} />
                    <ellipse cx="90" cy="46" rx="4" ry="4" fill={isConnected ? "#1e40af" : "#f3f4f6"} />

                    {/* Ball of foot pressure area */}
                    <ellipse
                      cx="80"
                      cy="120"
                      rx="20"
                      ry="15"
                      fill={isConnected ? (currentReadings.arch.status === "High" ? "#dc2626" : "#22c55e") : "#f3f4f6"}
                      opacity="0.8"
                    />

                    {/* Heel pressure area */}
                    <ellipse
                      cx="80"
                      cy="220"
                      rx="22"
                      ry="18"
                      fill={isConnected ? (currentReadings.heel.status === "High" ? "#dc2626" : "#059669") : "#f3f4f6"}
                      opacity="0.9"
                    />

                    <defs>
                      <radialGradient id="bottomFootGradient" cx="50%" cy="60%" r="60%">
                        <stop offset="0%" stopColor="#1e40af" />
                        <stop offset="30%" stopColor="#0891b2" />
                        <stop offset="50%" stopColor="#059669" />
                        <stop offset="70%" stopColor="#ca8a04" />
                        <stop offset="100%" stopColor="#dc2626" />
                      </radialGradient>
                    </defs>
                  </svg>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Readings */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Current Readings</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${getReadingColor(currentReadings.heel.status)}`}>
                  {currentReadings.heel.status === "No Data" ? "—" : currentReadings.heel.value}
                </div>
                <div className="text-sm text-muted-foreground mb-2">Heel (kPa)</div>
                <Badge className={getStatusColor(currentReadings.heel.status)} variant="secondary">
                  {currentReadings.heel.status}
                </Badge>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getReadingColor(currentReadings.arch.status)}`}>
                  {currentReadings.arch.status === "No Data" ? "—" : currentReadings.arch.value}
                </div>
                <div className="text-sm text-muted-foreground mb-2">Arch (kPa)</div>
                <Badge className={getStatusColor(currentReadings.arch.status)} variant="secondary">
                  {currentReadings.arch.status}
                </Badge>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getReadingColor(currentReadings.toe.status)}`}>
                  {currentReadings.toe.status === "No Data" ? "—" : currentReadings.toe.value}
                </div>
                <div className="text-sm text-muted-foreground mb-2">Toe (kPa)</div>
                <Badge className={getStatusColor(currentReadings.toe.status)} variant="secondary">
                  {currentReadings.toe.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
