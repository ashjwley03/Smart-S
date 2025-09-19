"use client"
import { useState, useEffect, useRef, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, RotateCcw } from "lucide-react"
import dynamic from "next/dynamic"
import Link from "next/link"

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

        // ---- Tunables ----
        // Region thresholds in normalized [0..1] "length" / "lateral" axes
        const HEEL_END = 0.18 // back 18% of length is heel
        const ANKLE_START = 0.35 // ankle begins after 35% of length
        const LATERAL_GAP = 0.12 // +/- 12% from center for left/right
        const SWAP_LR = false // set true if your GLB's lateral sign is flipped

        // Quick debug: "none" | "gradient" | "forceRed"
        const DEBUG: "none" | "gradient" | "forceRed" = "none"

        function FootModelComponent({ isConnected, pressureData }: { isConnected: boolean; pressureData: any }) {
          const groupRef = useRef<THREE.Group>(null)
          const { scene } = useGLTF("/human_foot_base_mesh.glb")

          type MeshEntry = {
            mesh: THREE.Mesh
            colors: THREE.BufferAttribute
            positions: THREE.BufferAttribute
            min: THREE.Vector3
            size: THREE.Vector3
            // axis mapping (indices 0=x,1=y,2=z)
            lenIdx: 0 | 1 | 2
            latIdx: 0 | 1 | 2
          }

          const cacheRef = useRef<MeshEntry[]>([])
          const lastPD = useRef<string>("")
          const lastConn = useRef<boolean>(false)

          // palette
          const BASE = new THREE.Color(0.42, 0.29, 0.23)
          const HIGH = new THREE.Color(0.9, 0.1, 0.1)
          const DISC = new THREE.Color(0.35, 0.35, 0.35)

          const pickColor = (status: string, connected: boolean) => {
            if (!connected) return DISC.clone()
            if (status === "High") return HIGH.clone()
            if (status === "Normal") return BASE.clone()
            return DISC.clone() // Low / No Data
          }

          const ensureCache = () => {
            if (cacheRef.current.length) return

            scene.traverse((child: any) => {
              if (!(child instanceof THREE.Mesh) || !child.geometry) return
              const g: THREE.BufferGeometry = child.geometry
              if (!g.attributes.position) return

              // color attribute
              if (!g.attributes.color) {
                const colors = new Float32Array(g.attributes.position.count * 3)
                g.setAttribute("color", new THREE.BufferAttribute(colors, 3))
              }

              // bounding box & axis detection
              if (!g.boundingBox) g.computeBoundingBox()
              const bb = g.boundingBox!
              const min = bb.min.clone()
              const size = new THREE.Vector3().subVectors(bb.max, bb.min)

              // determine which axis is length (largest), lateral (2nd largest)
              const sizes = [size.x, size.y, size.z] as const
              const lenIdx = sizes.indexOf(Math.max(...sizes)) as 0 | 1 | 2
              const remaining = [0, 1, 2].filter((i) => i !== lenIdx) as (0 | 1 | 2)[]
              const latIdx = (sizes[remaining[0]] >= sizes[remaining[1]] ? remaining[0] : remaining[1]) as 0 | 1 | 2

              // Make sure materials actually use vertex colors
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
                mat.transparent = true(mat as any).map = null // remove base texture
                mat.color.setRGB(1, 1, 1) // avoid multiplying vertex colors
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
            // Debug paths to prove the pipeline works
            if (DEBUG === "forceRed") {
              cacheRef.current.forEach(({ colors, positions }) => {
                for (let i = 0; i < positions.count; i++) colors.setXYZ(i, 1, 0, 0)
                colors.needsUpdate = true
              })
              return
            }

            const anyHigh =
              pressureData.heel.status === "High" ||
              pressureData.leftAnkle.status === "High" ||
              pressureData.rightAnkle.status === "High"

            const pulse = anyHigh ? 1 + 0.15 * Math.sin(time * 3.0) : 1

            const heelCol = pickColor(pressureData.heel.status, isConnected)
            const leftCol = pickColor(pressureData.leftAnkle.status, isConnected)
            const rightCol = pickColor(pressureData.rightAnkle.status, isConnected)

            if (pressureData.heel.status === "High") heelCol.multiplyScalar(pulse)
            if (pressureData.leftAnkle.status === "High") leftCol.multiplyScalar(pulse)
            if (pressureData.rightAnkle.status === "High") rightCol.multiplyScalar(pulse)

            cacheRef.current.forEach(({ mesh, colors, positions, min, size, lenIdx, latIdx }) => {
              const v = new THREE.Vector3()

              // disconnected: short-circuit to grey & lower opacity
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
                v.fromBufferAttribute(positions, i) // LOCAL space

                // normalize
                const n = [
                  (v.x - min.x) / (size.x || 1e-6),
                  (v.y - min.y) / (size.y || 1e-6),
                  (v.z - min.z) / (size.z || 1e-6),
                ] as const

                const L = n[lenIdx] // length 0..1 (0 = heel end)
                let LR = n[latIdx] // lateral 0..1 (0 = medial, 1 = lateral)
                if (SWAP_LR) LR = 1 - LR

                const isHeel = L < HEEL_END
                const isRightAnkle = L > ANKLE_START && LR > center + LATERAL_GAP
                const isLeftAnkle = L > ANKLE_START && LR < center - LATERAL_GAP

                let out = base

                if (DEBUG === "gradient") {
                  // visualize axes: length on R, lateral on G, height-ish on B
                  out = new THREE.Color(L, LR, 1 - L)
                } else if (isHeel) {
                  out = heelCol
                } else if (isRightAnkle) {
                  out = rightCol
                } else if (isLeftAnkle) {
                  out = leftCol
                } else {
                  // soft blends
                  const heelInf = Math.max(0, (HEEL_END - L) / HEEL_END)
                  const rInf =
                    Math.max(0, (LR - (center + LATERAL_GAP)) / (1 - (center + LATERAL_GAP))) *
                    Math.max(0, (L - ANKLE_START) / (1 - ANKLE_START))
                  const lInf =
                    Math.max(0, (center - LATERAL_GAP - LR) / (center - LATERAL_GAP)) *
                    Math.max(0, (L - ANKLE_START) / (1 - ANKLE_START))
                  const total = heelInf + rInf + lInf

                  if (total > 1e-5) {
                    const tmp = new THREE.Color(0, 0, 0)
                    tmp.addScaledVector(heelCol, heelInf / total)
                    tmp.addScaledVector(rightCol, rInf / total)
                    tmp.addScaledVector(leftCol, lInf / total)
                    out = tmp
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
            return sig !== lastPD.current || isConnected !== lastConn.current || DEBUG !== "none"
          }

          useFrame(() => {
            if (!scene) return
            ensureCache()
            const t = performance.now() * 0.001
            const anyHigh =
              pressureData.heel.status === "High" ||
              pressureData.leftAnkle.status === "High" ||
              pressureData.rightAnkle.status === "High"

            if (needsRepaint() || anyHigh) {
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

        return { default: FootModelComponent }
      },
    ),
  { ssr: false },
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
        {[
          { key: "Live", label: "Live", href: null },
          { key: "History", label: "History", href: "/history" },
          { key: "Settings", label: "Settings", href: null },
        ].map((tab) =>
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
