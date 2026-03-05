import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { createRenderer } from '@/lib/three/createRenderer'
import { handleResize } from '@/lib/three/resize'
import type { SketchModule } from '@/sketches'

const R = 10
const AUTO_SPEED = 0.3
const ARC_SEGMENTS = 64
const MARKER_SIZE = 0.6
const TAN_LIMIT = 3 * R

const COLORS = {
  background: 0x0a0a14,
  circle: 0x334466,
  axes: 0x223344,
  tangentRef: 0x1a2a3a,
  radius: 0x8899aa,
  cos: 0x4488ff,
  sin: 0xff4466,
  tan: 0x44ffaa,
  point: 0xffffff,
  arc: 0x556677,
  extend: 0x445566,
  rightAngle: 0x556677,
} as const

function createTextSprite(text: string, cssColor: string): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 128
  const ctx = canvas.getContext('2d')!
  ctx.font = 'bold 72px sans-serif'
  ctx.fillStyle = cssColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 128, 64)

  const texture = new THREE.CanvasTexture(canvas)
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(4, 2, 1)
  return sprite
}

function makeLine(color: number, maxVerts: number = 2, opacity: number = 1): THREE.Line {
  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxVerts * 3), 3))
  geom.setDrawRange(0, 0)
  const mat = new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity })
  return new THREE.Line(geom, mat)
}

function updateLine(line: THREE.Line, pts: number[][]) {
  const arr = (line.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array
  for (let i = 0; i < pts.length; i++) {
    arr[i * 3] = pts[i][0]
    arr[i * 3 + 1] = pts[i][1]
    arr[i * 3 + 2] = pts[i][2]
  }
  ;(line.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true
  line.geometry.setDrawRange(0, pts.length)
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

const sketch = (): SketchModule => {
  let renderer: THREE.WebGLRenderer
  let scene: THREE.Scene
  let camera: THREE.PerspectiveCamera
  let controls: OrbitControls
  let animationId: number
  let removeResize: () => void
  let cleanupPointer: () => void

  let theta = Math.PI / 6
  let isAutoRotating = true
  let prevTime = 0

  let pointMesh: THREE.Mesh
  let cosPoint: THREE.Mesh
  let tanPoint: THREE.Mesh

  let radiusLine: THREE.Line
  let cosLine: THREE.Line
  let sinLine: THREE.Line
  let tanLine: THREE.Line
  let extendLine: THREE.Line
  let arcLine: THREE.Line
  let rightAngleLine: THREE.Line

  let labelSin: THREE.Sprite
  let labelCos: THREE.Sprite
  let labelTan: THREE.Sprite
  let labelTheta: THREE.Sprite

  let isDragging = false
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
  const hitPoint = new THREE.Vector3()

  function setPointer(e: PointerEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
  }

  function updateVisuals() {
    const c = Math.cos(theta)
    const s = Math.sin(theta)
    const t = Math.tan(theta)
    const px = R * c
    const py = R * s
    const tanY = clamp(R * t, -TAN_LIMIT, TAN_LIMIT)
    const tanOk = Math.abs(t) < TAN_LIMIT / R

    pointMesh.position.set(px, py, 0)
    cosPoint.position.set(px, 0, 0)
    tanPoint.position.set(R, tanY, 0)
    tanPoint.visible = tanOk

    updateLine(radiusLine, [[0, 0, 0], [px, py, 0]])
    updateLine(cosLine, [[0, 0, 0], [px, 0, 0]])
    updateLine(sinLine, [[px, 0, 0], [px, py, 0]])

    tanLine.visible = tanOk
    extendLine.visible = tanOk
    if (tanOk) {
      updateLine(tanLine, [[R, 0, 0], [R, tanY, 0]])
      updateLine(extendLine, [[px, py, 0], [R, tanY, 0]])
    }

    // Right angle marker at (px, 0) corner
    if (Math.abs(s) > 0.05 && Math.abs(c) > 0.05) {
      const dx = c > 0 ? -MARKER_SIZE : MARKER_SIZE
      const dy = s > 0 ? MARKER_SIZE : -MARKER_SIZE
      updateLine(rightAngleLine, [
        [px + dx, 0, 0],
        [px + dx, dy, 0],
        [px, dy, 0],
      ])
      rightAngleLine.visible = true
    } else {
      rightAngleLine.visible = false
    }

    // Angle arc
    const norm = ((theta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
    const arcR = R * 0.2
    const steps = Math.max(2, Math.ceil((norm / (Math.PI * 2)) * ARC_SEGMENTS))
    const arcPts: number[][] = []
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * norm
      arcPts.push([arcR * Math.cos(a), arcR * Math.sin(a), 0])
    }
    updateLine(arcLine, arcPts)

    // Labels
    const labelOffset = 1.8
    labelCos.position.set(px / 2, -labelOffset, 0)
    labelCos.visible = Math.abs(c) > 0.1

    const sinLabelSide = c >= 0 ? labelOffset : -labelOffset
    labelSin.position.set(px + sinLabelSide, py / 2, 0)
    labelSin.visible = Math.abs(s) > 0.1

    labelTan.position.set(R + labelOffset, tanY / 2, 0)
    labelTan.visible = tanOk && Math.abs(t) > 0.1

    const midAngle = norm / 2
    const thetaR = arcR + 1.5
    labelTheta.position.set(thetaR * Math.cos(midAngle), thetaR * Math.sin(midAngle), 0)
  }

  const init = (canvas: HTMLCanvasElement) => {
    renderer = createRenderer(canvas)
    renderer.setClearColor(COLORS.background)

    scene = new THREE.Scene()

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200)
    camera.position.set(0, 0, 35)

    controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true
    controls.dampingFactor = 0.05

    // --- Static geometry ---

    // Circle outline
    const circleVerts: number[] = []
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2
      circleVerts.push(R * Math.cos(a), R * Math.sin(a), 0)
    }
    const circleGeom = new THREE.BufferGeometry()
    circleGeom.setAttribute('position', new THREE.Float32BufferAttribute(circleVerts, 3))
    scene.add(new THREE.Line(circleGeom, new THREE.LineBasicMaterial({ color: COLORS.circle })))

    // Axes
    const axLen = R * 1.6
    const axGeom = new THREE.BufferGeometry()
    axGeom.setAttribute('position', new THREE.Float32BufferAttribute([
      -axLen, 0, 0, axLen, 0, 0,
      0, -axLen, 0, 0, axLen, 0,
    ], 3))
    scene.add(new THREE.LineSegments(axGeom, new THREE.LineBasicMaterial({ color: COLORS.axes })))

    // Tangent reference line at x = R
    const tanRefGeom = new THREE.BufferGeometry()
    tanRefGeom.setAttribute('position', new THREE.Float32BufferAttribute([
      R, -TAN_LIMIT, 0, R, TAN_LIMIT, 0,
    ], 3))
    scene.add(new THREE.LineSegments(tanRefGeom, new THREE.LineBasicMaterial({
      color: COLORS.tangentRef, transparent: true, opacity: 0.5,
    })))

    // Tick marks at ±R
    const tk = 0.3
    const tickGeom = new THREE.BufferGeometry()
    tickGeom.setAttribute('position', new THREE.Float32BufferAttribute([
      R, -tk, 0, R, tk, 0,
      -R, -tk, 0, -R, tk, 0,
      -tk, R, 0, tk, R, 0,
      -tk, -R, 0, tk, -R, 0,
    ], 3))
    scene.add(new THREE.LineSegments(tickGeom, new THREE.LineBasicMaterial({ color: COLORS.axes })))

    // --- Dynamic geometry ---

    pointMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 16, 12),
      new THREE.MeshBasicMaterial({ color: COLORS.point })
    )
    cosPoint = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 12, 8),
      new THREE.MeshBasicMaterial({ color: COLORS.cos })
    )
    tanPoint = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 12, 8),
      new THREE.MeshBasicMaterial({ color: COLORS.tan })
    )
    scene.add(pointMesh, cosPoint, tanPoint)

    radiusLine = makeLine(COLORS.radius)
    cosLine = makeLine(COLORS.cos)
    sinLine = makeLine(COLORS.sin)
    tanLine = makeLine(COLORS.tan)
    extendLine = makeLine(COLORS.extend, 2, 0.4)
    rightAngleLine = makeLine(COLORS.rightAngle, 3)
    arcLine = makeLine(COLORS.arc, ARC_SEGMENTS + 1)
    scene.add(radiusLine, cosLine, sinLine, tanLine, extendLine, rightAngleLine, arcLine)

    // Labels
    labelSin = createTextSprite('sin', '#ff4466')
    labelCos = createTextSprite('cos', '#4488ff')
    labelTan = createTextSprite('tan', '#44ffaa')
    labelTheta = createTextSprite('θ', '#8899aa')
    scene.add(labelSin, labelCos, labelTan, labelTheta)

    updateVisuals()
    removeResize = handleResize(renderer, camera)

    // --- Pointer events ---
    const onPointerDown = (e: PointerEvent) => {
      setPointer(e, canvas)
      raycaster.setFromCamera(pointer, camera)
      if (raycaster.intersectObject(pointMesh).length > 0) {
        isDragging = true
        isAutoRotating = false
        controls.enabled = false
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      setPointer(e, canvas)
      raycaster.setFromCamera(pointer, camera)

      if (isDragging) {
        if (raycaster.ray.intersectPlane(planeZ, hitPoint)) {
          theta = Math.atan2(hitPoint.y, hitPoint.x)
          updateVisuals()
        }
        return
      }

      const hit = raycaster.intersectObject(pointMesh).length > 0
      pointMesh.scale.setScalar(hit ? 1.4 : 1)
      canvas.style.cursor = hit ? 'grab' : ''
    }

    const onPointerUp = () => {
      if (isDragging) {
        isDragging = false
        isAutoRotating = true
        controls.enabled = true
      }
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    cleanupPointer = () => {
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
    }

    prevTime = performance.now()

    const animate = () => {
      animationId = requestAnimationFrame(animate)

      const now = performance.now()
      const dt = (now - prevTime) / 1000
      prevTime = now

      if (isAutoRotating) {
        theta += AUTO_SPEED * dt
        updateVisuals()
      }

      controls.update()
      renderer.render(scene, camera)
    }

    animate()
  }

  const dispose = () => {
    cancelAnimationFrame(animationId)
    cleanupPointer?.()
    removeResize?.()
    controls?.dispose()
    scene?.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Sprite) {
        obj.geometry?.dispose()
        const mat = obj.material
        if (mat instanceof THREE.Material) {
          if (mat instanceof THREE.SpriteMaterial && mat.map) mat.map.dispose()
          mat.dispose()
        }
      }
    })
    renderer?.dispose()
  }

  return { init, dispose }
}

export default sketch()
