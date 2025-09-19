"use client"
import { useState, useEffect, useRef, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, RotateCcw } from "lucide-react"
import dynamic from "next/dynamic"

const Canvas = dynamic(() => import("@react-three/fiber").then((mod) => ({ default: mod.Canvas })), {
  ssr: false,
  loading: () => (
    <div className="w-full h-96 bg-slate-100 rounded-lg flex items-center justify-center">Loading 3D Model...</div>
  ),
})

const OrbitControls = dynamic(() => import("@react-three/drei").then((mod) => ({ default: mod.OrbitControls })), {
  ssr: false,
})

const FootModelInner = dynamic(
  () =>
    Promise.all([import("@react-three/drei"), import("@react-three/fiber"), import("three")]).then(
      ([dreiMod, fiberMod, threeMod]) => {
        const { useGLTF } = dreiMod
        const { useFrame } = fiberMod
        const THREE = threeMod

        function FootModelComponent({ isConnected, pressureData }: { isConnected: boolean; pressureData: any }) {
          const meshRef = useRef<any>(null)
          const { scene } = useGLTF("/human_foot_base_mesh.glb")

          const getPressureColor = (value: number, status: string) => {
            if (!isConnected || status === "No Data") return new THREE.Color(0.4, 0.4, 0.4)

            const normalizedValue = Math.min(Math.max(value / 500, 0), 1)

            switch (status) {
              case "High":
                const redIntensity = 0.7 + normalizedValue * 0.3
                return new THREE.Color(redIntensity, 0.1, 0.1)
              case "Normal":
                const greenIntensity = 0.4 + normalizedValue * 0.4
                return new THREE.Color(0.1, greenIntensity, 0.1)
              case "Low":
                const blueIntensity = 0.5 + normalizedValue * 0.3
                return new THREE.Color(0.1, 0.2, blueIntensity)
              default:
                return new THREE.Color(0.5, 0.5, 0.5)
            }
          }

          useFrame(() => {
            if (meshRef.current && scene) {
              const time = Date.now() * 0.003
              const footMesh = scene.clone()

              const heelColor = getPressureColor(pressureData.heel.value, pressureData.heel.status)
              const leftAnkleColor = getPressureColor(pressureData.leftAnkle.value, pressureData.leftAnkle.status)
              const rightAnkleColor = getPressureColor(pressureData.rightAnkle.value, pressureData.rightAnkle.status)

              const heelPulse = pressureData.heel.status === "High" ? 0.2 + Math.sin(time * 3) * 0.15 : 0
              const leftPulse = pressureData.leftAnkle.status === "High" ? 0.2 + Math.sin(time * 3) * 0.15 : 0
              const rightPulse = pressureData.rightAnkle.status === "High" ? 0.2 + Math.sin(time * 3) * 0.15 : 0

              footMesh.traverse((child: any) => {
                if (child instanceof THREE.Mesh && child.geometry) {
                  const geometry = child.geometry
                  const position = geometry.attributes.position

                  if (!geometry.attributes.color) {
                    const colors = new Float32Array(position.count * 3)
                    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3))
                  }

                  const colors = geometry.attributes.color
                  const vertex = new THREE.Vector3()

                  for (let i = 0; i < position.count; i++) {
                    vertex.fromBufferAttribute(position, i)
                    child.localToWorld(vertex)

                    let color = new THREE.Color(0.3, 0.3, 0.3)

                    if (vertex.z < -0.15) {
                      color = heelColor.clone().multiplyScalar(1 + heelPulse)
                    } else if (vertex.x > 0.15 && vertex.z > -0.1) {
                      color = rightAnkleColor.clone().multiplyScalar(1 + rightPulse)
                    } else if (vertex.x < -0.15 && vertex.z > -0.1) {
                      color = leftAnkleColor.clone().multiplyScalar(1 + leftPulse)
                    } else {
                      const heelInfluence = Math.max(0, 1 - (vertex.z + 0.15) / 0.3)
                      const rightInfluence =
                        Math.max(0, 1 - Math.abs(vertex.x - 0.15) / 0.3) * Math.max(0, (vertex.z + 0.1) / 0.2)
                      const leftInfluence =
                        Math.max(0, 1 - Math.abs(vertex.x + 0.15) / 0.3) * Math.max(0, (vertex.z + 0.1) / 0.2)

                      const totalInfluence = heelInfluence + rightInfluence + leftInfluence

                      if (totalInfluence > 0) {
                        color = new THREE.Color()
                          .addScaledVector(
                            heelColor.clone().multiplyScalar(1 + heelPulse),
                            heelInfluence / totalInfluence,
                          )
                          .addScaledVector(
                            rightAnkleColor.clone().multiplyScalar(1 + rightPulse),
                            rightInfluence / totalInfluence,
                          )
                          .addScaledVector(
                            leftAnkleColor.clone().multiplyScalar(1 + leftPulse),
                            leftInfluence / totalInfluence,
                          )
                      }
                    }

                    if (!isConnected) {
                      color.setHex(0x555555)
                    }

                    colors.setXYZ(i, color.r, color.g, color.b)
                  }

                  colors.needsUpdate = true

                  const material = child.material
                  if (isConnected) {
                    material.vertexColors = true
                    material.opacity = 0.95
                    material.emissive.setRGB(0.05, 0.05, 0.05)
                  } else {
                    material.vertexColors = true
                    material.opacity = 0.4
                    material.emissive.setRGB(0, 0, 0)
                  }
                }
              })
            }
          })

          return (
            <group ref={meshRef}>
              <primitive object={scene.clone()} scale={[2, 2, 2]} rotation={[0, 0, 0]} position={[0, -1, 0]} />
            </group>
          )
        }

        return { default: FootModelComponent }
      },
    ),
  {
    ssr: false,
  },
)

function ThreeJSFootVisualization({ isConnected, pressureData }: { isConnected: boolean; pressureData: any }) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      <div className="w-full h-96 bg-gradient-to-b from-slate-50 to-slate-100 rounded-lg flex items-center justify-center">
        <div className="text-muted-foreground">Loading 3D Model...</div>
      </div>
    )
  }

  return (
    <div className="w-full h-96 bg-gradient-to-b from-slate-50 to-slate-100 rounded-lg overflow-hidden">
      <Canvas camera={{ position: [3, 2, 3], fov: 50 }} style={{ width: "100%", height: "100%" }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} />
        <pointLight position={[-10, -10, -5]} intensity={0.3} />

        <Suspense fallback={null}>
          <FootModelInner isConnected={isConnected} pressureData={pressureData} />
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
    leftAnkle: { value: 0, status: "No Data" },
    rightAnkle: { value: 0, status: "No Data" },
  })

  useEffect(() => {
    if (!isConnected) {
      setCurrentReadings({
        heel: { value: 0, status: "No Data" },
        leftAnkle: { value: 0, status: "No Data" },
        rightAnkle: { value: 0, status: "No Data" },
      })
      return
    }

    setCurrentReadings({
      heel: { value: 201.5, status: "High" },
      leftAnkle: { value: 367.4, status: "Normal" },
      rightAnkle: { value: 407.2, status: "High" },
    })

    const interval = setInterval(() => {
      setCurrentReadings((prev) => ({
        heel: {
          value: Math.round((prev.heel.value + (Math.random() - 0.5) * 10) * 10) / 10,
          status: prev.heel.value > 300 ? "High" : prev.heel.value > 200 ? "Normal" : "Low",
        },
        leftAnkle: {
          value: Math.round((prev.leftAnkle.value + (Math.random() - 0.5) * 15) * 10) / 10,
          status: prev.leftAnkle.value > 400 ? "High" : prev.leftAnkle.value > 250 ? "Normal" : "Low",
        },
        rightAnkle: {
          value: Math.round((prev.rightAnkle.value + (Math.random() - 0.5) * 12) * 10) / 10,
          status: prev.rightAnkle.value > 350 ? "High" : prev.rightAnkle.value > 200 ? "Normal" : "Low",
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

      {isConnected && (currentReadings.heel.status === "High" || currentReadings.rightAnkle.status === "High") && (
        <Alert className="m-4 border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive">
            <div className="font-medium">
              High pressure detected at {currentReadings.heel.status === "High" ? "heel" : "right ankle"}
            </div>
            <div className="text-sm mt-2 space-y-2">
              <div>
                <strong>Immediate action:</strong> Redistribute weight by shifting to the opposite foot or adjusting
                your position. If seated, elevate the affected foot above heart level using pillows or a footrest.
              </div>
              <div>
                <strong>Positioning:</strong> For heel pressure, lean forward slightly and transfer weight to the balls
                of your feet. For ankle pressure, rotate your ankle gently in circular motions and flex your toes upward
                to improve circulation.
              </div>
              <div>
                <strong>Relief techniques:</strong> Apply gentle massage to the affected area using circular motions.
                Remove tight footwear if possible and wiggle your toes to promote blood flow. Consider using a
                pressure-relieving cushion or orthotic insert.
              </div>
              <div>
                <strong>Duration:</strong> Maintain pressure relief for 15-30 minutes initially. If pressure readings
                remain high after repositioning, consult a healthcare professional. Monitor for numbness, tingling, or
                color changes in the foot.
              </div>
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
                <div className={`text-2xl font-bold ${getReadingColor(currentReadings.leftAnkle.status)}`}>
                  {currentReadings.leftAnkle.status === "No Data" ? "—" : currentReadings.leftAnkle.value}
                </div>
                <div className="text-sm text-muted-foreground mb-2">Left Ankle (kPa)</div>
                <Badge className={getStatusColor(currentReadings.leftAnkle.status)} variant="secondary">
                  {currentReadings.leftAnkle.status}
                </Badge>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getReadingColor(currentReadings.rightAnkle.status)}`}>
                  {currentReadings.rightAnkle.status === "No Data" ? "—" : currentReadings.rightAnkle.value}
                </div>
                <div className="text-sm text-muted-foreground mb-2">Right Ankle (kPa)</div>
                <Badge className={getStatusColor(currentReadings.rightAnkle.status)} variant="secondary">
                  {currentReadings.rightAnkle.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
