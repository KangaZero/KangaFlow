"use client"

import type { CSSProperties, ReactNode, Ref } from "react"
import { useEffect, useImperativeHandle, useRef, useState } from "react"

import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js"
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import { toCreasedNormals } from "three/addons/utils/BufferGeometryUtils.js"

export interface GlassObjectPose {
  /** Idle rock about X, in radians. */
  rotationX: number
  /** Idle rock about Y, in radians. */
  rotationY: number
  /** Idle rock about Z, in radians. */
  rotationZ: number
  /** Normalised bob, roughly -0.1 to 0.1 in scene units. */
  bob: number
}

export interface GlassObjectOptions {
  /** URL of the asset to display: GLB/glTF, SVG, PNG, JPEG, WebP, or GIF. Object URLs from a file input work too. The format is sniffed from the bytes, not the extension. */
  src?: string
  /**
   * Build the glass as a rounded-rectangle panel sized to the canvas box
   * instead of loading `src`. The aspect is read live from the canvas, so the
   * slab always sits exactly under its wrapper. Wins over `src` when both are
   * set: no fetch happens at all.
   */
  panel?: boolean
  /** Corner radius of the `panel` slab as a fraction of its shorter side (0 to 0.5). */
  panelRadius?: number
  /** Index of refraction of the glass (1 to 2.33). */
  ior?: number
  /** Thickness of the glass volume in scene units. Drives how strongly light bends. */
  thickness?: number
  /** Surface roughness (0 to 1). Higher values frost the glass. */
  roughness?: number
  /** Chromatic dispersion of the refraction (0 to 2). Splits light into rainbow fringes like real glass. */
  dispersion?: number
  /** Clearcoat layer on top of the glass (0 to 1). */
  clearcoat?: number
  /** Tint color of the glass volume as any CSS color. Empty string keeps the glass clear. */
  tint?: string
  /** How strongly the tint absorbs light through the volume. */
  tintDensity?: number
  /** Extrusion depth of 2D assets (SVG or image) as a fraction of their longest side. */
  depth?: number
  /** Edge rounding of extruded 2D assets (0 to 1). Higher values melt the edges into a liquid lip. */
  bevel?: number
  /** Accent color of the ring light in the studio environment. */
  highlight?: string
  /** Brightness of the studio environment lighting. */
  environmentIntensity?: number
  /** Background color behind the glass. Empty string keeps the canvas transparent. */
  background?: string
  /** URL of an image shown as a backdrop behind the glass, cover-fit to the view. The glass samples and refracts it. Empty string disables the backdrop. */
  backgroundImage?: string
  /** Size of the longest side of the asset in scene units. The camera sits about 4 units away. */
  scale?: number
  /** Horizontal offset of the asset in scene units. */
  xOffset?: number
  /** Vertical offset of the asset in scene units. */
  yOffset?: number
  /** Strength of the floating bob animation (0 disables). */
  floatIntensity?: number
  /** Strength of the idle rocking rotation (0 disables). */
  rotationIntensity?: number
  /** Speed of the float and rocking animation. */
  floatSpeed?: number
  /** Let the user orbit the camera by dragging. */
  orbit?: boolean
  /** Let the user zoom with the scroll wheel or pinch. */
  zoom?: boolean
  /** Spin the camera around the asset turntable-style. */
  autoRotate?: boolean
  /** Turntable speed when autoRotate is on. */
  autoRotateSpeed?: number
  /** Camera field of view in degrees. */
  fov?: number
  /** Camera distance from the center of the asset. */
  cameraDistance?: number
  /** Base URL of the Draco decoder, fetched only when a model needs it. */
  dracoDecoderPath?: string
  /** Called after an asset finishes loading. */
  onLoad?: (() => void) | null
  /** Called when an asset fails to load. */
  onError?: ((error: unknown) => void) | null
  /** Called every rendered frame with the slab's current idle pose. Under reduced motion it still fires, with a zeroed pose. */
  onFrame?: ((pose: GlassObjectPose) => void) | null
}

export interface GlassObjectElements {
  /** Canvas the scene renders to. */
  canvas: HTMLCanvasElement
}

export interface GlassObjectInstance {
  /** Update options live. Changing src loads the new asset. */
  setOptions: (options: GlassObjectOptions) => void
  /** Re-read canvas size. Call when the element is resized. */
  resize: () => void
  /** Stop the loop and release all GPU resources. */
  destroy: () => void
}

const DEFAULTS: Required<GlassObjectOptions> = {
  autoRotate: false,
  autoRotateSpeed: 2,
  background: "",
  backgroundImage: "",
  bevel: 1,
  cameraDistance: 4,
  clearcoat: 0.5,
  depth: 0.1,
  dispersion: 1.5,
  dracoDecoderPath: "https://www.gstatic.com/draco/versioned/decoders/1.5.7/",
  environmentIntensity: 1,
  floatIntensity: 1,
  floatSpeed: 2,
  fov: 55,
  highlight: "#066aff",
  ior: 1.75,
  onError: null,
  onFrame: null,
  onLoad: null,
  orbit: true,
  panel: false,
  panelRadius: 0.03,
  rotationIntensity: 1,
  roughness: 0.25,
  scale: 3,
  src: "",
  thickness: 4,
  tint: "",
  tintDensity: 2,
  xOffset: 0,
  yOffset: 0,
  zoom: false,
}

const CAMERA_DIR = new THREE.Vector3(0, -1, 4).normalize()
const MODEL_LIFT = 0.3
const BACKDROP_DISTANCE = 30
const RASTER_SIZE = 256
const ALPHA_THRESHOLD = 64

interface FormerDef {
  kind: "ring" | "box"
  intensity: number
  position: [number, number, number]
  scale: [number, number, number]
  lookAtCenter?: boolean
  withLight?: boolean
}

const ROOM_BLOCKS: Array<{
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
}> = [
  {
    position: [-10.906, -1, 1.846],
    rotation: [0, -0.195, 0],
    scale: [2.328, 7.905, 4.651],
  },
  {
    position: [-5.607, -0.754, -0.758],
    rotation: [0, 0.994, 0],
    scale: [1.97, 1.534, 3.955],
  },
  {
    position: [6.167, -0.16, 7.803],
    rotation: [0, 0.561, 0],
    scale: [3.927, 6.285, 3.687],
  },
  {
    position: [-2.017, 0.018, 6.124],
    rotation: [0, 0.333, 0],
    scale: [2.002, 4.566, 2.064],
  },
  {
    position: [2.291, -0.756, -2.621],
    rotation: [0, -0.286, 0],
    scale: [1.546, 1.552, 1.496],
  },
  {
    position: [-2.193, -0.369, -5.547],
    rotation: [0, 0.516, 0],
    scale: [3.875, 3.487, 2.986],
  },
]

const ROOM_FORMERS: FormerDef[] = [
  {
    intensity: 15,
    kind: "ring",
    lookAtCenter: true,
    position: [2, 3, -2],
    scale: [10, 10, 10],
  },
  {
    intensity: 80,
    kind: "box",
    position: [-14, 10, 8],
    scale: [0.1, 2.5, 2.5],
  },
  {
    intensity: 80,
    kind: "box",
    position: [-14, 14, -4],
    scale: [0.1, 2.5, 2.5],
    withLight: true,
  },
  {
    intensity: 23,
    kind: "box",
    position: [14, 12, 0],
    scale: [0.1, 5, 5],
    withLight: true,
  },
  {
    intensity: 16,
    kind: "box",
    position: [0, 9, 14],
    scale: [5, 5, 0.1],
    withLight: true,
  },
  {
    intensity: 80,
    kind: "box",
    position: [7, 8, -14],
    scale: [2.5, 2.5, 0.1],
    withLight: true,
  },
  {
    intensity: 80,
    kind: "box",
    position: [-7, 16, -14],
    scale: [2.5, 2.5, 0.1],
    withLight: true,
  },
  {
    intensity: 1,
    kind: "box",
    position: [0, 20, 0],
    scale: [0.1, 0.1, 0.1],
    withLight: true,
  },
  {
    intensity: 20,
    kind: "box",
    position: [0, 15, 0],
    scale: [10, 1, 10],
    withLight: true,
  },
]

function flattenCapNormals(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute("position")
  const normal = geometry.getAttribute("normal")
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  const cb = new THREE.Vector3()
  const ab = new THREE.Vector3()
  for (const group of geometry.groups) {
    if (group.materialIndex !== 0) continue
    for (let i = group.start; i < group.start + group.count; i += 3) {
      a.fromBufferAttribute(position, i)
      b.fromBufferAttribute(position, i + 1)
      c.fromBufferAttribute(position, i + 2)
      cb.subVectors(c, b)
      ab.subVectors(a, b)
      cb.cross(ab).normalize()
      for (let j = 0; j < 3; j++) normal.setXYZ(i + j, cb.x, cb.y, cb.z)
    }
  }
  normal.needsUpdate = true
}

function disposeObject(root: THREE.Object3D, keep?: THREE.Material) {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh
    if (mesh.geometry) mesh.geometry.dispose()
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material]
    for (const material of materials) {
      if (!material || material === keep) continue
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) value.dispose()
      }
      material.dispose()
    }
  })
}

function sniffKind(
  bytes: Uint8Array
): "glb" | "gltf" | "svg" | "bitmap" | null {
  if (bytes.length < 4) return null
  const ascii = (start: number, text: string) => {
    for (let i = 0; i < text.length; i++) {
      if (bytes[start + i] !== text.charCodeAt(i)) return false
    }
    return true
  }
  if (ascii(0, "glTF")) return "glb"
  if (bytes[0] === 0x89 && ascii(1, "PNG")) return "bitmap"
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "bitmap"
  if (ascii(0, "RIFF") && ascii(8, "WEBP")) return "bitmap"
  if (ascii(0, "GIF8")) return "bitmap"
  let head = ""
  try {
    head = new TextDecoder()
      .decode(bytes.subarray(0, 2048))
      .replace(/^\uFEFF/, "")
      .trimStart()
  } catch {
    return null
  }
  if (head.startsWith("{")) return "gltf"
  if (head.startsWith("<")) {
    return head.includes("<svg") ? "svg" : null
  }
  return null
}

function rasterizeImage(blob: Blob): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      const width = image.naturalWidth || 1024
      const height = image.naturalHeight || 1024
      const ratio = Math.min(1, RASTER_SIZE / Math.max(width, height))
      const canvas = document.createElement("canvas")
      canvas.width = Math.max(1, Math.round(width * ratio))
      canvas.height = Math.max(1, Math.round(height * ratio))
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("2d context unavailable"))
        return
      }
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      resolve(ctx.getImageData(0, 0, canvas.width, canvas.height))
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Could not decode the image"))
    }
    image.src = url
  })
}

type Point = [number, number]

function traceContours(mask: Uint8Array, w: number, h: number): Point[][] {
  const at = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === 1 ? 1 : 0

  const segments: [Point, Point][] = []
  const T = (cx: number, cy: number): Point => [cx - 0.5, cy - 1]
  const B = (cx: number, cy: number): Point => [cx - 0.5, cy]
  const L = (cx: number, cy: number): Point => [cx - 1, cy - 0.5]
  const R = (cx: number, cy: number): Point => [cx, cy - 0.5]

  for (let cy = 0; cy <= h; cy++) {
    for (let cx = 0; cx <= w; cx++) {
      const code =
        at(cx - 1, cy - 1) * 8 +
        at(cx, cy - 1) * 4 +
        at(cx, cy) * 2 +
        at(cx - 1, cy)
      switch (code) {
        case 1:
          segments.push([L(cx, cy), B(cx, cy)])
          break
        case 2:
          segments.push([B(cx, cy), R(cx, cy)])
          break
        case 3:
          segments.push([L(cx, cy), R(cx, cy)])
          break
        case 4:
          segments.push([T(cx, cy), R(cx, cy)])
          break
        case 5:
          segments.push([L(cx, cy), T(cx, cy)])
          segments.push([B(cx, cy), R(cx, cy)])
          break
        case 6:
          segments.push([T(cx, cy), B(cx, cy)])
          break
        case 7:
          segments.push([L(cx, cy), T(cx, cy)])
          break
        case 8:
          segments.push([L(cx, cy), T(cx, cy)])
          break
        case 9:
          segments.push([T(cx, cy), B(cx, cy)])
          break
        case 10:
          segments.push([T(cx, cy), R(cx, cy)])
          segments.push([L(cx, cy), B(cx, cy)])
          break
        case 11:
          segments.push([T(cx, cy), R(cx, cy)])
          break
        case 12:
          segments.push([L(cx, cy), R(cx, cy)])
          break
        case 13:
          segments.push([B(cx, cy), R(cx, cy)])
          break
        case 14:
          segments.push([L(cx, cy), B(cx, cy)])
          break
      }
    }
  }

  const key = (p: Point) =>
    (Math.round(p[0] * 2) + 4) * 8192 + Math.round(p[1] * 2) + 4
  const adjacency = new Map<number, number[]>()
  for (const [i, segment] of segments.entries()) {
    for (const p of segment) {
      const k = key(p)
      const list = adjacency.get(k)
      if (list) list.push(i)
      else adjacency.set(k, [i])
    }
  }

  const used = new Uint8Array(segments.length)
  const loops: Point[][] = []
  for (const [start, segment] of segments.entries()) {
    if (used[start]) continue
    used[start] = 1
    const loop: Point[] = [segment[0]]
    let point = segment[1]
    const startKey = key(segment[0])
    while (key(point) !== startKey) {
      loop.push(point)
      const candidates = adjacency.get(key(point)) ?? []
      let next = -1
      for (const c of candidates) {
        if (!used[c]) {
          next = c
          break
        }
      }
      const nextSegment = segments[next]
      if (next < 0 || !nextSegment) break
      used[next] = 1
      const [a, b] = nextSegment
      point = key(a) === key(point) ? b : a
    }
    if (loop.length >= 4) loops.push(loop)
  }
  return loops
}

function simplifyLoop(points: Point[], epsilon: number): Point[] {
  if (points.length < 6) return points
  const keepFlags = new Uint8Array(points.length)
  keepFlags[0] = 1
  keepFlags[points.length - 1] = 1
  const stack: [number, number][] = [[0, points.length - 1]]
  while (stack.length) {
    const frame = stack.pop()
    if (!frame) break
    const [lo, hi] = frame
    const from = points[lo]
    const to = points[hi]
    if (!from || !to) continue
    const [ax, ay] = from
    const [bx, by] = to
    const dx = bx - ax
    const dy = by - ay
    const len = Math.hypot(dx, dy) || 1e-9
    let worst = -1
    let worstDist = epsilon
    for (let i = lo + 1; i < hi; i++) {
      const point = points[i]
      if (!point) continue
      const d = Math.abs((point[0] - ax) * dy - (point[1] - ay) * dx) / len
      if (d > worstDist) {
        worstDist = d
        worst = i
      }
    }
    if (worst > 0) {
      keepFlags[worst] = 1
      stack.push([lo, worst], [worst, hi])
    }
  }
  const out: Point[] = []
  for (const [i, point] of points.entries()) {
    if (keepFlags[i]) out.push(point)
  }
  return out
}

function chaikin(points: Point[], iterations: number): Point[] {
  let current = points
  for (let it = 0; it < iterations; it++) {
    const next: Point[] = []
    for (let i = 0; i < current.length; i++) {
      const a = current[i]
      const b = current[(i + 1) % current.length]
      if (!a || !b) continue
      const [ax, ay] = a
      const [bx, by] = b
      next.push(
        [ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25],
        [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]
      )
    }
    current = next
  }
  return current
}

function signedArea(points: Point[]): number {
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    if (!a || !b) continue
    const [ax, ay] = a
    const [bx, by] = b
    area += ax * by - bx * ay
  }
  return area / 2
}

function roundLoopCorners(
  points: THREE.Vector2[],
  radius: number
): THREE.Vector2[] {
  const n = points.length
  if (n < 3) return points
  const out: THREE.Vector2[] = []
  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n]
    const curr = points[i]
    const next = points[(i + 1) % n]
    if (!prev || !curr || !next) continue
    const inDir = curr.clone().sub(prev)
    const outDir = next.clone().sub(curr)
    const lenIn = inDir.length()
    const lenOut = outDir.length()
    if (lenIn < 1e-9 || lenOut < 1e-9) continue
    inDir.divideScalar(lenIn)
    outDir.divideScalar(lenOut)
    const angle = Math.acos(Math.min(Math.max(inDir.dot(outDir), -1), 1))
    if (angle < 0.1) {
      out.push(curr.clone())
      continue
    }
    const trim = Math.min(radius, lenIn * 0.5, lenOut * 0.5)
    const p0 = curr.clone().addScaledVector(inDir, -trim)
    const p1 = curr.clone().addScaledVector(outDir, trim)
    const steps = Math.max(2, Math.ceil(angle / 0.3))
    for (let s = 0; s <= steps; s++) {
      const t = s / steps
      const a = (1 - t) * (1 - t)
      const b = 2 * (1 - t) * t
      const c = t * t
      out.push(
        new THREE.Vector2(
          a * p0.x + b * curr.x + c * p1.x,
          a * p0.y + b * curr.y + c * p1.y
        )
      )
    }
  }
  return out.length >= 3 ? out : points
}

function dedupeClosingPoint(points: THREE.Vector2[]): THREE.Vector2[] {
  const first = points[0]
  const last = points[points.length - 1]
  if (
    points.length > 1 &&
    first &&
    last &&
    first.distanceToSquared(last) < 1e-12
  ) {
    return points.slice(0, -1)
  }
  return points
}

function roundShapeCorners(
  shapes: THREE.Shape[],
  radius: number
): THREE.Shape[] {
  if (radius < 1e-6) return shapes
  return shapes.map((shape) => {
    const extracted = shape.extractPoints(24)
    const rounded = new THREE.Shape(
      roundLoopCorners(dedupeClosingPoint(extracted.shape), radius)
    )
    for (const hole of extracted.holes) {
      rounded.holes.push(
        new THREE.Path(roundLoopCorners(dedupeClosingPoint(hole), radius))
      )
    }
    return rounded
  })
}

function containsPoint(loop: Point[], x: number, y: number): boolean {
  let inside = false
  for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
    const current = loop[i]
    const previous = loop[j]
    if (!current || !previous) continue
    const [xi, yi] = current
    const [xj, yj] = previous
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

function shapesFromImage(data: ImageData): THREE.Shape[] {
  const { width, height } = data
  const mask = new Uint8Array(width * height)
  for (let i = 0; i < width * height; i++) {
    mask[i] = (data.data[i * 4 + 3] ?? 0) >= ALPHA_THRESHOLD ? 1 : 0
  }

  const rawLoops = traceContours(mask, width, height)
  let loops: Point[][] = []
  for (const rawLoop of rawLoops) {
    const loop = chaikin(simplifyLoop(rawLoop, 1), 2)
    if (Math.abs(signedArea(loop)) > 12) {
      loops.push(loop)
    }
  }
  loops.sort((a, b) => Math.abs(signedArea(b)) - Math.abs(signedArea(a)))
  loops = loops.slice(0, 48)
  if (loops.length === 0) throw new Error("No opaque pixels to trace")

  const depths = loops.map((loop, i) => {
    const first = loop[0]
    if (!first) return 0
    const [x, y] = first
    let depth = 0
    for (const [j, other] of loops.entries()) {
      if (j !== i && containsPoint(other, x, y)) depth++
    }
    return depth
  })

  const shapes: THREE.Shape[] = []
  const owners: { loop: Point[]; area: number; shape: THREE.Shape }[] = []
  for (const [i, loop] of loops.entries()) {
    if ((depths[i] ?? 0) % 2 !== 0) continue
    const shape = new THREE.Shape(loop.map(([x, y]) => new THREE.Vector2(x, y)))
    shapes.push(shape)
    owners.push({
      area: Math.abs(signedArea(loop)),
      loop,
      shape,
    })
  }
  for (const [i, loop] of loops.entries()) {
    if ((depths[i] ?? 0) % 2 === 0) continue
    const first = loop[0]
    if (!first) continue
    const [x, y] = first
    let owner: (typeof owners)[number] | null = null
    for (const candidate of owners) {
      if (!containsPoint(candidate.loop, x, y)) continue
      if (!owner || candidate.area < owner.area) owner = candidate
    }
    owner?.shape.holes.push(
      new THREE.Path(loop.map(([px, py]) => new THREE.Vector2(px, py)))
    )
  }
  return shapes
}

function shapesFromSvg(text: string): THREE.Shape[] {
  const parsed = new SVGLoader().parse(text)
  const shapes: THREE.Shape[] = []
  for (const path of parsed.paths) {
    const style = path.userData?.style as { fill?: string } | undefined
    if (style?.fill === "none") continue
    shapes.push(...SVGLoader.createShapes(path))
  }
  if (shapes.length === 0) {
    for (const path of parsed.paths) {
      shapes.push(...SVGLoader.createShapes(path))
    }
  }
  if (shapes.length === 0) throw new Error("No fillable shapes in the SVG")
  return shapes
}

/**
 * Outline of a rounded-rectangle panel: one unit tall, `aspect` units wide,
 * centred on the origin. `radius` is a fraction of the shorter side and clamps
 * to 0.5 so degenerate values round off into a stadium instead of folding the
 * corners through each other.
 */
export function panelShapes(aspect: number, radius: number): THREE.Shape[] {
  const halfWidth = Math.max(aspect, 1e-3) / 2
  const halfHeight = 0.5
  const shorter = Math.min(halfWidth, halfHeight) * 2
  const corner = Math.min(Math.max(radius, 0), 0.5) * shorter
  const rect = new THREE.Shape([
    new THREE.Vector2(-halfWidth, -halfHeight),
    new THREE.Vector2(halfWidth, -halfHeight),
    new THREE.Vector2(halfWidth, halfHeight),
    new THREE.Vector2(-halfWidth, halfHeight),
  ])
  return roundShapeCorners([rect], corner)
}

interface MeshSource {
  kind: "mesh"
  scene: THREE.Group
}

interface ShapeSource {
  kind: "shapes"
  shapes: THREE.Shape[]
}

type AssetSource = MeshSource | ShapeSource

/**
 * Builds the renderer, scene and animation loop against an existing canvas.
 * Returns `null` when WebGL is unavailable; every caller short-circuits through
 * `?.` on the returned instance, so a null here degrades to a transparent
 * canvas rather than an error. Do not "fix" that by throwing.
 */
export function createGlassObject(
  elements: GlassObjectElements,
  options: GlassObjectOptions
): GlassObjectInstance | null {
  const { canvas } = elements
  const config: Required<GlassObjectOptions> = { ...DEFAULTS, ...options }

  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      canvas,
      powerPreference: "high-performance",
    })
  } catch {
    return null
  }
  renderer.toneMapping = THREE.ACESFilmicToneMapping

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(config.fov, 1, 0.1, 200)
  camera.position.copy(CAMERA_DIR).multiplyScalar(config.cameraDistance)

  const floatGroup = new THREE.Group()
  floatGroup.position.y = MODEL_LIFT
  const fitGroup = new THREE.Group()
  floatGroup.add(fitGroup)
  scene.add(floatGroup)

  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.enablePan = false

  scene.add(camera)
  const backdropMaterial = new THREE.MeshBasicMaterial()
  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    backdropMaterial
  )
  backdrop.position.set(0, 0, -BACKDROP_DISTANCE)
  backdrop.visible = false
  camera.add(backdrop)

  const textureLoader = new THREE.TextureLoader()
  textureLoader.setCrossOrigin("anonymous")
  let backdropTexture: THREE.Texture | null = null
  let backdropSrc: string | null = null

  function layoutBackdrop() {
    if (!backdropTexture) return
    const height =
      2 * BACKDROP_DISTANCE * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)
    const width = height * camera.aspect
    backdrop.scale.set(width, height, 1)
    const image = backdropTexture.image as { width: number; height: number }
    const planeAspect = width / height
    const imageAspect = image.width / image.height
    if (imageAspect > planeAspect) {
      backdropTexture.repeat.set(planeAspect / imageAspect, 1)
      backdropTexture.offset.set((1 - backdropTexture.repeat.x) / 2, 0)
    } else {
      backdropTexture.repeat.set(1, imageAspect / planeAspect)
      backdropTexture.offset.set(0, (1 - backdropTexture.repeat.y) / 2)
    }
  }

  function loadBackdrop() {
    const src = config.backgroundImage
    if (src === backdropSrc) return
    backdropSrc = src
    if (!src) {
      backdrop.visible = false
      backdropMaterial.map = null
      backdropTexture?.dispose()
      backdropTexture = null
      envDirty = true
      return
    }
    textureLoader.load(src, (texture) => {
      if (disposed || config.backgroundImage !== src) {
        texture.dispose()
        return
      }
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy()
      texture.generateMipmaps = false
      texture.minFilter = THREE.LinearFilter
      backdropTexture?.dispose()
      backdropTexture = texture
      backdropMaterial.map = texture
      backdropMaterial.needsUpdate = true
      backdrop.visible = true
      layoutBackdrop()
      envDirty = true
    })
  }

  const glass = new THREE.MeshPhysicalMaterial({
    clearcoatRoughness: 0.06,
    color: 0xffffff,
    metalness: 0,
    specularIntensity: 1,
    transmission: 1,
  })

  const pmrem = new THREE.PMREMGenerator(renderer)
  let roomScene: THREE.Scene | null = null
  let ringMaterial: THREE.MeshBasicMaterial | null = null
  let envTarget: THREE.WebGLRenderTarget | null = null
  let envDirty = true

  function buildRoom(): THREE.Scene {
    const built = new THREE.Scene()
    roomScene = built
    const room = new THREE.Group()
    room.position.set(0, -0.5, 0)
    roomScene.add(room)

    for (const [x, z] of [
      [-15, 15],
      [15, 15],
      [15, -15],
      [-15, -15],
    ] as const) {
      const spot = new THREE.SpotLight(0xffffff, 2, 0, 0.2, 1, 0)
      spot.position.set(x, 20, z)
      room.add(spot, spot.target)
    }
    const center = new THREE.PointLight(0xffffff, 100, 28, 2)
    center.position.set(0.5, 14, 0.5)
    room.add(center)

    const box = new THREE.BoxGeometry()
    const shell = new THREE.Mesh(
      box,
      new THREE.MeshStandardMaterial({ color: "gray", side: THREE.BackSide })
    )
    shell.position.set(0, 13.2, 0)
    shell.scale.set(31.5, 28.5, 31.5)
    room.add(shell)

    const white = new THREE.MeshStandardMaterial({ color: 0xffffff })
    for (const def of ROOM_BLOCKS) {
      const mesh = new THREE.Mesh(box, white)
      mesh.position.set(...def.position)
      mesh.rotation.set(...def.rotation)
      mesh.scale.set(...def.scale)
      room.add(mesh)
    }

    for (const def of ROOM_FORMERS) {
      const geometry =
        def.kind === "ring"
          ? new THREE.RingGeometry(0.5, 1, 64)
          : new THREE.BoxGeometry()
      const material = new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide,
        toneMapped: false,
      })
      material.color
        .set(def.kind === "ring" ? config.highlight : "#ffffff")
        .multiplyScalar(def.intensity)
      if (def.kind === "ring") ringMaterial = material
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(...def.position)
      mesh.scale.set(...def.scale)
      if (def.lookAtCenter) mesh.lookAt(0, 0, 0)
      room.add(mesh)
      if (def.withLight) {
        const light = new THREE.PointLight(0xffffff, 100, 28, 2)
        light.position.set(...def.position)
        room.add(light)
      }
    }
    return built
  }

  function refreshEnvironment() {
    if (backdropTexture) {
      const source = backdropTexture.image as CanvasImageSource & {
        width: number
        height: number
      }
      const soft = document.createElement("canvas")
      soft.width = 64
      soft.height = 32
      const ctx = soft.getContext("2d")
      if (ctx) {
        ctx.filter = "blur(4px)"
        ctx.drawImage(source, -4, -4, soft.width + 8, soft.height + 8)
      }
      const equirect = new THREE.CanvasTexture(soft)
      equirect.colorSpace = THREE.SRGBColorSpace
      equirect.mapping = THREE.EquirectangularReflectionMapping
      envTarget?.dispose()
      envTarget = pmrem.fromEquirectangular(equirect)
      equirect.dispose()
      scene.environment = envTarget.texture
      return
    }
    const room = roomScene ?? buildRoom()
    if (ringMaterial) {
      ringMaterial.color.set(config.highlight).multiplyScalar(15)
    }
    envTarget?.dispose()
    envTarget = pmrem.fromScene(room, 0.6, 0.1, 1000)
    scene.environment = envTarget.texture
  }

  let model: THREE.Object3D | null = null
  let modelMaxDim = 1
  let assetSource: AssetSource | null = null
  let builtDepth = -1
  let builtBevel = -1
  let builtPanelAspect = -1
  let builtPanelRadius = -1
  let loadedSrc: string | null = null
  let loadToken = 0
  let disposed = false

  const loader = new GLTFLoader()
  const draco = new DRACOLoader()
  draco.setDecoderPath(config.dracoDecoderPath)
  loader.setDRACOLoader(draco)

  function applyFit() {
    if (!model) return
    fitGroup.scale.setScalar(config.scale / modelMaxDim)
    glass.thickness = Math.max(config.thickness, 0) / fitGroup.scale.x
  }

  function clearModel() {
    if (!model) return
    fitGroup.remove(model)
    disposeObject(model, glass)
    model = null
  }

  function clearAsset() {
    if (assetSource?.kind === "mesh") disposeObject(assetSource.scene, glass)
    assetSource = null
    builtDepth = -1
    builtBevel = -1
    builtPanelAspect = -1
    builtPanelRadius = -1
    clearModel()
  }

  /**
   * Rebuild the procedural panel for the canvas' current aspect. Returns false
   * when nothing changed, so a resize that keeps the aspect costs nothing.
   */
  function refreshPanel(): boolean {
    const aspect =
      Math.max(canvas.clientWidth, 1) / Math.max(canvas.clientHeight, 1)
    const radius = Math.min(Math.max(config.panelRadius, 0), 0.5)
    if (
      assetSource?.kind === "shapes" &&
      aspect === builtPanelAspect &&
      radius === builtPanelRadius
    ) {
      return false
    }
    clearAsset()
    builtPanelAspect = aspect
    builtPanelRadius = radius
    assetSource = { kind: "shapes", shapes: panelShapes(aspect, radius) }
    buildModel()
    return true
  }

  function mountModel(next: THREE.Object3D) {
    clearModel()
    model = next
    const bounds = new THREE.Box3().setFromObject(model)
    const size = bounds.getSize(new THREE.Vector3())
    const offset = bounds.getCenter(new THREE.Vector3())
    modelMaxDim = Math.max(size.x, size.y, size.z, 1e-4)
    model.position.sub(offset)
    applyFit()
    fitGroup.add(model)
  }

  function buildModel() {
    if (!assetSource) return
    if (assetSource.kind === "mesh") {
      if (model) return
      assetSource.scene.traverse((node) => {
        const mesh = node as THREE.Mesh
        if (!mesh.isMesh) return
        const materials = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material]
        for (const material of materials) {
          if (!material || material === glass) continue
          for (const value of Object.values(material)) {
            if (value instanceof THREE.Texture) value.dispose()
          }
          material.dispose()
        }
        mesh.material = glass
        if (!mesh.geometry.getAttribute("normal")) {
          mesh.geometry.computeVertexNormals()
        }
      })
      mountModel(assetSource.scene)
      return
    }

    const depth = Math.min(Math.max(config.depth, 0.02), 1)
    const bevel = Math.min(Math.max(config.bevel, 0), 1)
    if (model && depth === builtDepth && bevel === builtBevel) return
    builtDepth = depth
    builtBevel = bevel

    const box = new THREE.Box2()
    for (const shape of assetSource.shapes) {
      for (const point of shape.getPoints(4)) box.expandByPoint(point)
    }
    const size2d = Math.max(box.max.x - box.min.x, box.max.y - box.min.y, 1e-4)
    const depthUnits = depth * size2d
    const bevelAmount = bevel * depthUnits * 0.5

    const shapes = roundShapeCorners(assetSource.shapes, bevelAmount * 1.25)
    let geometry: THREE.BufferGeometry = new THREE.ExtrudeGeometry(shapes, {
      bevelEnabled: bevelAmount > 1e-4,
      bevelOffset: 0,
      bevelSegments: 12,
      bevelSize: bevelAmount * 0.9,
      bevelThickness: bevelAmount,
      curveSegments: 24,
      depth: Math.max(depthUnits - bevelAmount * 2, depthUnits * 0.1),
    })
    geometry = toCreasedNormals(geometry, Math.PI / 7)
    flattenCapNormals(geometry)
    geometry.rotateX(Math.PI)
    mountModel(new THREE.Mesh(geometry, glass))
  }

  async function loadAsset() {
    if (config.panel) {
      // Geometry is generated, so cancel any in-flight fetch and skip the
      // whole sniff / SVGLoader / rasterize path.
      loadToken += 1
      loadedSrc = null
      if (refreshPanel()) config.onLoad?.()
      return
    }
    const src = config.src
    if (src === loadedSrc) return
    loadedSrc = src
    const token = ++loadToken
    if (!src) {
      clearAsset()
      return
    }
    try {
      const response = await fetch(src)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const buffer = await response.arrayBuffer()
      if (disposed || token !== loadToken) return
      const bytes = new Uint8Array(buffer)
      const kind = sniffKind(bytes)
      if (!kind) throw new Error("Unrecognized asset format")

      if (kind === "glb" || kind === "gltf") {
        draco.setDecoderPath(config.dracoDecoderPath)
        const resourcePath = src.slice(0, src.lastIndexOf("/") + 1)
        const data = kind === "glb" ? buffer : new TextDecoder().decode(bytes)
        const gltf = await loader.parseAsync(data, resourcePath)
        if (disposed || token !== loadToken) {
          disposeObject(gltf.scene)
          return
        }
        clearAsset()
        assetSource = { kind: "mesh", scene: gltf.scene }
      } else if (kind === "svg") {
        const shapes = shapesFromSvg(new TextDecoder().decode(bytes))
        if (disposed || token !== loadToken) return
        clearAsset()
        assetSource = { kind: "shapes", shapes }
      } else {
        const data = await rasterizeImage(new Blob([buffer]))
        if (disposed || token !== loadToken) return
        const shapes = shapesFromImage(data)
        clearAsset()
        assetSource = { kind: "shapes", shapes }
      }
      buildModel()
      config.onLoad?.()
    } catch (error) {
      if (disposed || token !== loadToken) return
      config.onError?.(error)
    }
  }

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
  let reducedMotion = motionQuery.matches
  const onMotionChange = () => {
    reducedMotion = motionQuery.matches
    if (reducedMotion) floatGroup.rotation.set(0, 0, 0)
    applyOptions()
  }
  motionQuery.addEventListener("change", onMotionChange)

  const backgroundColor = new THREE.Color()

  function applyOptions() {
    if (config.background) {
      backgroundColor.set(config.background)
      scene.background = backgroundColor
      renderer.setClearColor(backgroundColor, 1)
    } else {
      scene.background = null
      renderer.setClearColor(0x000000, 0)
    }
    scene.environmentIntensity = config.environmentIntensity
    controls.enableRotate = config.orbit
    controls.enableZoom = config.zoom
    controls.autoRotate = config.autoRotate && !reducedMotion
    controls.autoRotateSpeed = config.autoRotateSpeed
    camera.fov = config.fov
    camera.updateProjectionMatrix()
    loadBackdrop()
    layoutBackdrop()
    floatGroup.position.x = config.xOffset
    floatGroup.position.y = MODEL_LIFT + config.yOffset

    glass.ior = Math.min(Math.max(config.ior, 1), 2.333)
    glass.roughness = Math.min(Math.max(config.roughness, 0), 1)
    glass.dispersion = Math.max(config.dispersion, 0)
    glass.clearcoat = Math.min(Math.max(config.clearcoat, 0), 1)
    if (config.tint) {
      glass.attenuationColor.set(config.tint)
      glass.attenuationDistance = 1.5 / Math.max(config.tintDensity, 0.01)
    } else {
      glass.attenuationColor.set(0xffffff)
      glass.attenuationDistance = Infinity
    }

    applyFit()
    buildModel()
  }

  function resize() {
    const width = Math.max(canvas.clientWidth, 1)
    const height = Math.max(canvas.clientHeight, 1)
    const pr = Math.min(window.devicePixelRatio || 1, 2)
    renderer.setPixelRatio(pr)
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    layoutBackdrop()
    // builtPanelAspect < 0 means the first build has not run yet; leave it to
    // loadAsset so onLoad still fires once.
    if (config.panel && builtPanelAspect >= 0) refreshPanel()
  }

  const observer = new ResizeObserver(resize)
  observer.observe(canvas)
  resize()
  applyOptions()
  loadAsset()

  let inView = true
  let loopRunning = false

  function tick(time: number) {
    if (!inView) {
      lastTime = 0
      stopLoop()
      return
    }
    const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 0
    lastTime = time
    if (envDirty) {
      envDirty = false
      refreshEnvironment()
    }
    controls.update()

    if (!reducedMotion) {
      elapsed += delta * config.floatSpeed
      floatGroup.rotation.x =
        (Math.cos(elapsed / 4) / 8) * config.rotationIntensity
      floatGroup.rotation.y =
        (Math.sin(elapsed / 4) / 8) * config.rotationIntensity
      floatGroup.rotation.z =
        (Math.sin(elapsed / 4) / 20) * config.rotationIntensity
      floatGroup.position.y =
        MODEL_LIFT +
        config.yOffset +
        (Math.sin(elapsed / 1.5) / 10) * config.floatIntensity
    }

    config.onFrame?.({
      bob: floatGroup.position.y - MODEL_LIFT - config.yOffset,
      rotationX: floatGroup.rotation.x,
      rotationY: floatGroup.rotation.y,
      rotationZ: floatGroup.rotation.z,
    })

    renderer.render(scene, camera)
  }

  function startLoop() {
    if (loopRunning || !inView || disposed) return
    loopRunning = true
    renderer.setAnimationLoop(tick)
  }

  function stopLoop() {
    if (!loopRunning) return
    loopRunning = false
    renderer.setAnimationLoop(null)
  }

  const viewObserver =
    typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver((entries) => {
          inView = entries[entries.length - 1]?.isIntersecting ?? true
          if (inView) {
            startLoop()
          } else {
            stopLoop()
          }
        })
      : null
  viewObserver?.observe(canvas)

  let lastTime = 0
  let elapsed = Math.random() * 100

  startLoop()

  return {
    destroy() {
      disposed = true
      loadToken += 1
      stopLoop()
      observer.disconnect()
      viewObserver?.disconnect()
      motionQuery.removeEventListener("change", onMotionChange)
      controls.dispose()
      clearAsset()
      backdrop.geometry.dispose()
      backdropMaterial.dispose()
      backdropTexture?.dispose()
      if (roomScene) disposeObject(roomScene)
      envTarget?.dispose()
      pmrem.dispose()
      draco.dispose()
      glass.dispose()
      renderer.dispose()
    },
    resize,
    setOptions(next: GlassObjectOptions) {
      let changed = false
      for (const [key, value] of Object.entries(next)) {
        if (typeof value === "function") continue
        if (config[key as keyof GlassObjectOptions] !== value) {
          changed = true
          break
        }
      }
      if (!changed) {
        Object.assign(config, next)
        return
      }

      const previousHighlight = config.highlight
      const previousDistance = config.cameraDistance
      Object.assign(config, next)
      if (config.highlight !== previousHighlight) envDirty = true
      if (config.cameraDistance !== previousDistance) {
        camera.position.copy(CAMERA_DIR).multiplyScalar(config.cameraDistance)
      }
      applyOptions()
      loadAsset()
      startLoop()
    },
  }
}

export interface GlassObjectProps extends GlassObjectOptions {
  /**
   * Rendered as real DOM on top of the glass, never rasterised into it. The
   * canvas turns decorative while children are present: it drops pointer
   * events, so `orbit` and `zoom` are inert and focus, tab order and input
   * handling stay native.
   */
  children?: ReactNode
  className?: string
  ref?: Ref<GlassObjectInstance>
  style?: CSSProperties
}

export function GlassObject({
  children,
  className,
  ref,
  style,
  ...options
}: GlassObjectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const instanceRef = useRef<GlassObjectInstance | null>(null)
  const [initialOptions] = useState(options)

  useImperativeHandle(
    ref,
    () => ({
      destroy: () => instanceRef.current?.destroy(),
      resize: () => instanceRef.current?.resize(),
      setOptions: (next: GlassObjectOptions) =>
        instanceRef.current?.setOptions(next),
    }),
    []
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    instanceRef.current = createGlassObject({ canvas }, initialOptions)
    return () => {
      instanceRef.current?.destroy()
      instanceRef.current = null
    }
  }, [initialOptions])

  // Deliberately unguarded: setOptions change-detects by identity, so only
  // real option changes reach the scene. `children` and `ref` are destructured
  // out above precisely so a fresh ReactNode never reads as a changed option.
  useEffect(() => {
    instanceRef.current?.setOptions(options)
  })

  const interactive =
    children == null && ((options.orbit ?? true) || (options.zoom ?? false))

  return (
    <div className={className} style={{ position: "relative", ...style }}>
      <canvas
        aria-hidden
        ref={canvasRef}
        style={{
          display: "block",
          height: "100%",
          inset: 0,
          pointerEvents: interactive ? "auto" : "none",
          position: "absolute",
          touchAction: interactive ? "none" : "auto",
          width: "100%",
        }}
      />
      {children == null ? null : (
        // `position: relative` is load-bearing: a static box paints in CSS 2.1
        // painting step 4, under the absolutely positioned canvas. No
        // `overflow` either — it would clip the wrapper's bleed.
        <div style={{ height: "100%", position: "relative", width: "100%" }}>
          {children}
        </div>
      )}
    </div>
  )
}

export default GlassObject
