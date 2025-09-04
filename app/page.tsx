"use client"
import { useState, useEffect, useRef, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, RotateCcw } from "lucide-react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, useGLTF } from "@react-three/drei"
import * as THREE from "three"

function FootModel({ isConnected, pressureData }: { isConnected: boolean; pressureData: any }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const { scene } = useGLTF("/human_foot_base_mesh.glb")

  const footMesh = scene.clone()

  const getPressureColor = (value: number, status: string) => {
    if (!isConnected || status === "No Data") return 0x888888

    const normalizedValue = Math.min(Math.max(value / 500, 0), 1)

    switch (status) {
      case "High":
        const redIntensity = 0.3 + normalizedValue * 0.7
        return new THREE.Color(redIntensity, 0.1, 0.1)
      case "Normal":
        const greenIntensity = 0.2 + normalizedValue * 0.6
        return new THREE.Color(0.1, greenIntensity, 0.1)
      case "Low":
        const blueIntensity = 0.3 + normalizedValue * 0.5
        return new THREE.Color(0.1, 0.1, blueIntensity)
      default:
        return new THREE.Color(0.5, 0.5, 0.5)
    }
  }

  useFrame(() => {
    if (meshRef.current && footMesh) {
      footMesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const material = child.material as THREE.MeshStandardMaterial

          const worldPosition = new THREE.Vector3()
          child.getWorldPosition(worldPosition)

          const localPosition = child.position
          let targetColor = new THREE.Color(0.5, 0.5, 0.5)

          if (localPosition.z < -0.3) {
            targetColor = getPressureColor(pressureData.heel.value, pressureData.heel.status)
          } else if (localPosition.z > 0.4) {
            targetColor = getPressureColor(pressureData.toe.value, pressureData.toe.status)
          } else {
            targetColor = getPressureColor(pressureData.arch.value, pressureData.arch.status)
          }

          if (isConnected) {
            const time = Date.now() * 0.003
            const pulseIntensity =
              pressureData.heel.status === "High" ||
              pressureData.arch.status === "High" ||
              pressureData.toe.status === "High"
                ? 0.1 + Math.sin(time) * 0.05
                : 0

            targetColor.multiplyScalar(1 + pulseIntensity)

            material.color.copy(targetColor)
            material.opacity = 0.9
            material.transparent = true
            material.roughness = 0.4
            material.metalness = 0.1
          } else {
            material.color.setHex(0x666666)
            material.opacity = 0.4
            material.transparent = true
            material.roughness = 0.8
            material.metalness = 0.0
          }
        }
      })
    }
  })

  return (
    <group ref={meshRef}>
      <primitive object={footMesh} scale={[2, 2, 2]} rotation={[0, 0, 0]} position={[0, -1, 0]} />
    </group>
  )
}

function ThreeJSFootVisualization({ isConnected, pressureData }: { isConnected: boolean; pressureData: any }) {
  return (
    <div className="w-full h-96 bg-gradient-to-b from-slate-50 to-slate-100 rounded-lg overflow-hidden">
      <Canvas camera={{ position: [3, 2, 3], fov: 50 }} style={{ width: "100%", height: "100%" }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} />
        <pointLight position={[-10, -10, -5]} intensity={0.3} />

        <Suspense fallback={null}>
          <FootModel isConnected={isConnected} pressureData={pressureData} />
        </Suspense>

        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={2}
          maxDistance={8}
          minPolarAngle={0}
          maxPolarAngle={Math.PI}
        />
      </Canvas>
    </div>
  )
}

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
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? "default" : "secondary"}>{isConnected ? "Connected" : "Disconnected"}</Badge>
        </div>
        <Button onClick={() => setIsConnected(!isConnected)} variant={isConnected ? "outline" : "default"} size="sm">
          {isConnected ? "Disconnect" : "Connect"}
        </Button>
      </div>

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

      <div className="p-4 space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">3D Pressure Map</h2>
              <div className="flex items-center gap-1 text-muted-foreground">
                <RotateCcw className="h-4 w-4" />
                <span className="text-sm">360°</span>
              </div>
            </div>

            <ThreeJSFootVisualization isConnected={isConnected} pressureData={currentReadings} />
          </CardContent>
        </Card>

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
