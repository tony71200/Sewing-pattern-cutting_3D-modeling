// Cảnh three.js cho ma-nơ-canh.
//
// Render THEO YÊU CẦU, không có vòng lặp requestAnimationFrame chạy vô hạn:
// máy đứng yên thì CPU/GPU về 0. Vẽ lại khi số đo đổi hoặc camera động.

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { createBody, createLimbs } from './body/mesh.js'
import { SEGMENTS } from './body/section.js'
import { MEASUREMENTS } from './vi.js'

export function initView3d(container) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf2f2f2)

  const camera = new THREE.PerspectiveCamera(35, 1, 10, 10000)
  camera.position.set(900, 1100, 2200)

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  container.appendChild(renderer.domElement)

  scene.add(new THREE.HemisphereLight(0xffffff, 0x666666, 2.2))
  const key = new THREE.DirectionalLight(0xffffff, 1.2)
  key.position.set(600, 1600, 1200)
  scene.add(key)

  const material = new THREE.MeshStandardMaterial({
    color: 0xd8d2cc,
    roughness: 0.85,
    metalness: 0,
    side: THREE.DoubleSide,
  })

  const body = createBody()
  const limbs = createLimbs()

  const meshes = [body, limbs].map((part) => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(part.positions, 3))
    g.setIndex(new THREE.BufferAttribute(part.indices, 1))
    const mesh = new THREE.Mesh(g, material)
    scene.add(mesh)
    return { part, geometry: g }
  })

  const ringGroup = new THREE.Group()
  scene.add(ringGroup)
  const ringMaterial = new THREE.LineBasicMaterial({ color: 0x3366cc })

  /**
   * Chỉ vẽ vòng cho tầng có SỐ ĐO NGUỒN thật (`lv.measure`). Tầng nội suy và tầng
   * đũng có chu vi suy ra — dán nhãn số đo lên chúng là nói dối người dùng.
   */
  function drawRings(levels) {
    ringGroup.clear()
    for (let l = 0; l < levels.length; l++) {
      const lv = levels[l]
      if (!lv.measure || lv.girth === null) continue
      const pts = []
      const base = l * SEGMENTS * 3
      for (let s = 0; s <= SEGMENTS; s++) {
        const i = base + (s % SEGMENTS) * 3
        pts.push(
          new THREE.Vector3(
            body.positions[i] * 1.01,
            body.positions[i + 1],
            body.positions[i + 2] * 1.01
          )
        )
      }
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ringMaterial)
      line.userData.label = `${MEASUREMENTS[lv.measure]?.t ?? lv.measure}: ${Math.round(lv.girth)} mm`
      ringGroup.add(line)
    }
  }

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 900, 0)
  controls.addEventListener('change', render)
  controls.update()

  function render() {
    // Tự chữa kích thước ngay trước khi vẽ. ResizeObserver và lần resize() lúc
    // khởi tạo đều có thể chạy khi container còn 0x0 (tab vừa hiện, pane đang
    // resize) và im lặng bỏ qua — hậu quả là buffer kẹt ở 300x150 mặc định rồi
    // bị CSS kéo giãn, ảnh mờ mà không báo lỗi gì.
    fitToContainer()
    renderer.render(scene, camera)
  }

  /** Trả về true nếu vừa đổi kích thước. */
  function fitToContainer() {
    const w = container.clientWidth
    const h = container.clientHeight
    if (!w || !h) return false
    const size = renderer.getSize(new THREE.Vector2())
    if (size.x === w && size.y === h) return false
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    return true
  }

  function update(measurements, gender) {
    let levels = null
    for (const { part, geometry } of meshes) {
      const r = part.update(measurements, gender)
      if (part === body) levels = r
      geometry.attributes.position.needsUpdate = true
      geometry.computeVertexNormals()
      geometry.computeBoundingSphere()
    }
    if (levels) drawRings(levels)
    render()
  }

  function resize() {
    if (fitToContainer()) render()
  }

  new ResizeObserver(resize).observe(container)
  resize()

  const tip = document.createElement('div')
  tip.className = 'ring-tip'
  tip.hidden = true
  container.appendChild(tip)

  const ray = new THREE.Raycaster()
  ray.params.Line.threshold = 12
  const ndc = new THREE.Vector2()

  renderer.domElement.addEventListener('pointermove', (e) => {
    const r = renderer.domElement.getBoundingClientRect()
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1
    ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1
    ray.setFromCamera(ndc, camera)
    const hit = ray.intersectObjects(ringGroup.children, false)[0]
    if (hit) {
      tip.textContent = hit.object.userData.label
      tip.style.left = `${e.clientX - r.left + 12}px`
      tip.style.top = `${e.clientY - r.top + 12}px`
      tip.hidden = false
    } else {
      tip.hidden = true
    }
  })

  return { update, resize }
}
