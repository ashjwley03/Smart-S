"use client"
import { useState, useEffect, useRef, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, RotateCcw } from "lucide-react"
import Link from "next/link"
import { useSettings, getHeelThreshold, getAnkleThreshold, getCalibrationParams } from "@/lib/settings/useSettings"
import { SettingsPanel } from "@/components/settings/SettingsPanel" // Import SettingsPanel component
import { Canvas } from "@react-three/fiber"
import { OrbitControls, useGLTF } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { heelPressureData, heelPressureThreshold } from "@/lib/history/heelPressureData"

function FootModelInner({
  isConnected,
  pressureData,
  calibrationSettings,
  pulseOnHigh,
}: {
  isConnected: boolean
  pressureData: any
  calibrationSettings: any
  pulseOnHigh: boolean
}) {
  const groupRef = useRef<THREE.Group>(null)
  const { scene } = useGLTF("/human_foot_base_mesh.glb")

  // Calibration constants with corrected values to fix the inverted mapping
  // The L coordinate is inverted in our model (1 = heel, 0 = toe) - opposite of what we expected
  const HEEL_START = 0.70  // Heel starts at L > 0.70 (closer to 1)
  const ANKLE_END = 0.55   // Ankles end at L < 0.55
  const LATERAL_GAP = 0.15  // Separation between left and right sides
  const SWAP_LR = calibrationSettings.swapLeftRight // Keep this as is

  type MeshEntry = {
    mesh: THREE.Mesh
    colors: THREE.BufferAttribute
    positions: THREE.BufferAttribute
    min: THREE.Vector3
    size: THREE.Vector3
    lenIdx: 0 | 1 | 2
    latIdx: 0 | 1 | 2
  }

  const cacheRef = useRef<MeshEntry[]>([])
  const lastPD = useRef<string>("")
  const lastConn = useRef<boolean>(false)

  const BASE = new THREE.Color(0.42, 0.29, 0.23)
  const HIGH = new THREE.Color(0.9, 0.1, 0.1)
  const DISC = new THREE.Color(0.35, 0.35, 0.35)

  const pickColor = (status: string, connected: boolean) => {
    if (!connected) return DISC.clone()
    if (status === "High") return HIGH.clone()
    if (status === "Normal") return BASE.clone()
    return DISC.clone()
  }

  const ensureCache = () => {
    if (cacheRef.current.length) return

    scene.traverse((child: any) => {
      if (!(child instanceof THREE.Mesh) || !child.geometry) return
      const g: THREE.BufferGeometry = child.geometry
      if (!g.attributes.position) return

      if (!g.attributes.color) {
        const colors = new Float32Array(g.attributes.position.count * 3)
        g.setAttribute("color", new THREE.BufferAttribute(colors, 3))
      }

      if (!g.boundingBox) g.computeBoundingBox()
      const bb = g.boundingBox!
      const min = bb.min.clone()
      const size = new THREE.Vector3().subVectors(bb.max, bb.min)

      const sizes = [size.x, size.y, size.z] as const
      const lenIdx = sizes.indexOf(Math.max(...sizes)) as 0 | 1 | 2
      const remaining = [0, 1, 2].filter((i) => i !== lenIdx) as (0 | 1 | 2)[]
      const latIdx = (sizes[remaining[0]] >= sizes[remaining[1]] ? remaining[0] : remaining[1]) as 0 | 1 | 2

      const enableVC = (m: any) => {
        if (!m) return
        if (Array.isArray(m)) {
          m.forEach(enableVC)
          return
        }
        if (!(m instanceof THREE.MeshStandardMaterial)) {
          const next = new THREE.MeshStandardMaterial()
          next.roughness = 0.9
          next.metalness = 0.0
          child.material = next
        }
        const mat = child.material as THREE.MeshStandardMaterial
        mat.vertexColors = true
        mat.transparent = true;
        (mat as any).map = null
        mat.color.setRGB(1, 1, 1)
        mat.needsUpdate = true
      }
      enableVC(child.material)

      cacheRef.current.push({
        mesh: child,
        colors: g.attributes.color as THREE.BufferAttribute,
        positions: g.attributes.position as THREE.BufferAttribute,
        min,
        size,
        lenIdx,
        latIdx,
      })
    })
  }

  const writeColors = (time: number) => {
    // Debug mode for force red coloring (currently disabled)
    // if (DEBUG === "forceRed") {
    //   cacheRef.current.forEach(({ colors, positions }) => {
    //     for (let i = 0; i < positions.count; i++) colors.setXYZ(i, 1, 0, 0)
    //     colors.needsUpdate = true
    //   })
    //   return
    // }

    const anyHigh =
      pressureData.heel.status === "High" ||
      pressureData.leftAnkle.status === "High" ||
      pressureData.rightAnkle.status === "High"

    const pulse = anyHigh && pulseOnHigh ? 1 + 0.15 * Math.sin(time * 3.0) : 1

    // Each region has its own color that matches its sensor status
    // Base colors without pulse effect
    const baseHeelCol = pickColor(pressureData.heel.status, isConnected)
    const baseLeftCol = pickColor(pressureData.leftAnkle.status, isConnected)
    const baseRightCol = pickColor(pressureData.rightAnkle.status, isConnected)
    
    // Normal color for ankles and other regions (regardless of heel status)
    const normalCol = BASE.clone()
    
    // Only the heel color is affected by heel pressure status
    const heelCol = baseHeelCol.clone()
    if (pressureData.heel.status === "High" && pulseOnHigh) heelCol.multiplyScalar(pulse)
    
    // Ankle colors are only affected by their own pressure status, not heel
    const leftCol = baseLeftCol.clone()
    if (pressureData.leftAnkle.status === "High" && pulseOnHigh) leftCol.multiplyScalar(pulse)
    
    const rightCol = baseRightCol.clone()
    if (pressureData.rightAnkle.status === "High" && pulseOnHigh) rightCol.multiplyScalar(pulse)

    cacheRef.current.forEach(({ mesh, colors, positions, min, size, lenIdx, latIdx }) => {
      const v = new THREE.Vector3()

      if (!isConnected) {
        for (let i = 0; i < positions.count; i++) colors.setXYZ(i, DISC.r, DISC.g, DISC.b)
        colors.needsUpdate = true
        const mat = (
          Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
        ) as THREE.MeshStandardMaterial
        if (mat) mat.opacity = 0.4
        return
      }

      const base = BASE
      const center = 0.5

      for (let i = 0; i < positions.count; i++) {
        v.fromBufferAttribute(positions, i)

        const n = [
          (v.x - min.x) / (size.x || 1e-6),
          (v.y - min.y) / (size.y || 1e-6),
          (v.z - min.z) / (size.z || 1e-6),
        ] as const

        const L = n[lenIdx]
        let LR = n[latIdx]
        if (SWAP_LR) LR = 1 - LR

        // L represents position along the length of the foot 
        // CORRECTED UNDERSTANDING: 0 is toe, 1 is heel (opposite of our initial assumption)
        // LR represents position across the width of the foot (0 = left, 1 = right)
        
        // Heel should be at the back of the foot (L > HEEL_START, closer to 1)
        const isHeel = L > HEEL_START
        
        // Left ankle should be on the left side in the ankle region
        // Between toe and ankle area, on the left side
        const isLeftAnkle = L < ANKLE_END && L > 0.3 && LR < center - LATERAL_GAP
        
        // Right ankle should be on the right side in the ankle region
        // Between toe and ankle area, on the right side
        const isRightAnkle = L < ANKLE_END && L > 0.3 && LR > center + LATERAL_GAP

        let out = base

        // Debug mode for gradient coloring (currently disabled)
        // if (DEBUG === "gradient") {
        //   out = new THREE.Color(L, LR, 1 - L)
        // } else 
        // For each region, use its own color regardless of other regions' status
        // This ensures heel pressure only affects heel coloring, not ankle coloring
        if (isHeel) {
          out = heelCol  // Heel region uses heel pressure color
        } else if (isRightAnkle) {
          out = rightCol // Right ankle region uses right ankle color only
        } else if (isLeftAnkle) {
          out = leftCol  // Left ankle region uses left ankle color only
        } else {
          // Calculate influence of each region for smooth transitions
          // But we'll keep each sensor's influence isolated to its own region
          
          // Heel influence: stronger at back of foot (L closer to 1)
          const heelInf = Math.max(0, (L - 0.6) / 0.4) // Gradient from 0.6 to 1.0
          
          // Left ankle influence: stronger in left-middle area
          const lInf = Math.max(0, (center - LATERAL_GAP - LR) / (center - LATERAL_GAP)) * 
                      Math.max(0, 1 - Math.abs((L - 0.4) / 0.3)) // Centered at L=0.4
          
          // Right ankle influence: stronger in right-middle area
          const rInf = Math.max(0, (LR - (center + LATERAL_GAP)) / (1 - (center + LATERAL_GAP))) * 
                      Math.max(0, 1 - Math.abs((L - 0.4) / 0.3)) // Centered at L=0.4
          
          // Front part of foot has minimal influence from sensors - this is normal
          // since there are no pressure sensors in the toe area
          
          // Calculate which region has the most influence at this point
          const maxInf = Math.max(heelInf, Math.max(lInf, rInf))
          
          if (maxInf > 0.1) { // Threshold for any influence
            if (heelInf >= lInf && heelInf >= rInf && L > 0.55) {
              // Heel region dominant - use heel color
              const strength = Math.min(1, heelInf * 2)
              out.lerp(heelCol, strength)
            } else if (lInf >= heelInf && lInf >= rInf && LR < center) {
              // Left ankle region dominant - use left ankle color
              const strength = Math.min(1, lInf * 2)
              out.lerp(leftCol, strength)
            } else if (rInf >= heelInf && rInf >= lInf && LR > center) {
              // Right ankle region dominant - use right ankle color
              const strength = Math.min(1, rInf * 2)
              out.lerp(rightCol, strength)
            }
            // Otherwise use the base color
          }
        }

        colors.setXYZ(i, out.r, out.g, out.b)
      }

      colors.needsUpdate = true

      const mat = (
        Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
      ) as THREE.MeshStandardMaterial
      if (mat) mat.opacity = 0.95
    })
  }

  const needsRepaint = () => {
    const sig = JSON.stringify(pressureData)
    return sig !== lastPD.current || isConnected !== lastConn.current
  }

  useFrame(() => {
    if (!scene) return
    ensureCache()
    const t = performance.now() * 0.001
    const anyHigh =
      pressureData.heel.status === "High" ||
      pressureData.leftAnkle.status === "High" ||
      pressureData.rightAnkle.status === "High"

    if (needsRepaint() || (anyHigh && pulseOnHigh)) {
      writeColors(t)
      lastPD.current = JSON.stringify(pressureData)
      lastConn.current = isConnected
    }
  })

  return (
    <group ref={groupRef}>
      <primitive object={scene} scale={[2, 2, 2]} rotation={[0, 0, 0]} position={[0, -1, 0]} />
    </group>
  )
}

function ThreeJSFootVisualization({
  isConnected,
  pressureData,
  calibrationSettings,
  pulseOnHigh,
}: {
  isConnected: boolean
  pressureData: any
  calibrationSettings: any
  pulseOnHigh: boolean
}) {
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
          <FootModelInner
            isConnected={isConnected}
            pressureData={pressureData}
            calibrationSettings={calibrationSettings}
            pulseOnHigh={pulseOnHigh}
          />
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
  const { settings } = useSettings()
  const [currentReadings, setCurrentReadings] = useState({
    heel: { value: 0, status: "No Data" },
    leftAnkle: { value: 0, status: "No Data" },
    rightAnkle: { value: 0, status: "No Data" },
  })
  const [patientPosition, setPatientPosition] = useState("Unknown")
  // Start at index 800 to skip the initial zeros and position at the varied section
  const [dataIndex, setDataIndex] = useState(800)
  
  // Step size for data cycling (larger value = faster cycling through data points)
  const dataStep = 10

  useEffect(() => {
    if (!isConnected) {
      setCurrentReadings({
        heel: { value: 0, status: "No Data" },
        leftAnkle: { value: 0, status: "No Data" },
        rightAnkle: { value: 0, status: "No Data" },
      })
      setPatientPosition("Unknown")
      return
    }

    // Initialize with heel value at the current index (which is not at the beginning)
    const initialHeelValue = heelPressureData[dataIndex].value
    const isStanding = initialHeelValue > 0
    
    setCurrentReadings({
      heel: { 
        value: initialHeelValue, 
        status: initialHeelValue > heelPressureThreshold ? "High" : initialHeelValue > 0 ? "Normal" : "Low" 
      },
      leftAnkle: { 
        value: isStanding ? 0 : 250.5, 
        status: isStanding ? "Low" : "Normal" 
      },
      rightAnkle: { 
        value: isStanding ? 0 : 270.3, 
        status: isStanding ? "Low" : "Normal" 
      },
    })
    
    setPatientPosition(isStanding ? "Standing" : "Lying down")

    const interval = setInterval(() => {
      const heelThreshold = heelPressureThreshold
      const ankleThreshold = getAnkleThreshold(settings)
      
      setDataIndex((prevIndex) => {
        // Loop through the heel pressure data using our step size for faster cycling
        const newIndex = (prevIndex + dataStep) % heelPressureData.length
        const heelValue = heelPressureData[newIndex].value
        const isPatientStanding = heelValue > 0
        
        setPatientPosition(isPatientStanding ? "Standing" : "Lying down")
        
        setCurrentReadings({
          heel: {
            value: heelValue,
            status: heelValue > heelThreshold ? "High" : heelValue > 0 ? "Normal" : "Low",
          },
          leftAnkle: {
            // Generate ankle data only when patient is lying down
            value: isPatientStanding ? 0 : Math.round((250 + (Math.random() - 0.5) * 15) * 10) / 10,
            status: isPatientStanding ? "Low" : (() => {
              const newValue = isPatientStanding ? 0 : Math.round((250 + (Math.random() - 0.5) * 15) * 10) / 10;
              return newValue > ankleThreshold ? "High" : "Normal";
            })(),
          },
          rightAnkle: {
            // Generate ankle data only when patient is lying down
            value: isPatientStanding ? 0 : Math.round((270 + (Math.random() - 0.5) * 12) * 10) / 10,
            status: isPatientStanding ? "Low" : (() => {
              const newValue = isPatientStanding ? 0 : Math.round((270 + (Math.random() - 0.5) * 12) * 10) / 10;
              return newValue > ankleThreshold ? "High" : "Normal";
            })(),
          },
        })
        
        return newIndex
      })
    }, settings.device.sampleIntervalMs)

    return () => clearInterval(interval)
  }, [isConnected, settings.device.sampleIntervalMs, settings])

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

  const tabs = [
    { key: "Live", label: "Live", href: null },
    { key: "History", label: "History", href: "/history" },
    { key: "Settings", label: "Settings", href: "/settings" },
  ]

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

      {isConnected &&
        settings.alerts.enabled &&
        settings.alerts.modes.banner &&
        (currentReadings.heel.status === "High" || currentReadings.rightAnkle.status === "High") && (
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
                  <strong>Positioning:</strong> For heel pressure, lean forward slightly and transfer weight to the
                  balls of your feet. For ankle pressure, rotate your ankle gently in circular motions and flex your
                  toes upward to improve circulation.
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
        {tabs.map((tab) =>
          tab.href ? (
            <Link key={tab.key} href={tab.href} className="flex-1">
              <button
                className={`w-full py-3 px-4 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            </Link>
          ) : (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ),
        )}
      </div>

      {activeTab === "Settings" && (
        <div className="p-4">
          <SettingsPanel />
        </div>
      )}

      {activeTab === "Live" && (
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

              <ThreeJSFootVisualization
                isConnected={isConnected}
                pressureData={currentReadings}
                calibrationSettings={getCalibrationParams(settings)}
                pulseOnHigh={settings.visualization.pulseOnHigh}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Current Readings</h2>
              <div className="flex justify-center mb-4">
                <Badge 
                  variant="outline" 
                  className={`px-3 py-1 ${patientPosition === "Standing" ? "bg-green-50 text-green-700 border-green-300" : 
                    patientPosition === "Lying down" ? "bg-blue-50 text-blue-700 border-blue-300" : 
                    "bg-gray-100 text-gray-500 border-gray-300"}`}
                >
                  Patient position: {patientPosition}
                </Badge>
              </div>
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
      )}

      {activeTab === "History" && (
        <div className="p-4">
          {/* Placeholder for History tab content */}
          <p>History tab content goes here</p>
        </div>
      )}
    </div>
  )
}
