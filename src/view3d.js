// Cảnh three.js cho thân người.
//
// Render THEO YÊU CẦU, không có vòng lặp rAF chạy vô hạn: máy đứng yên thì CPU/GPU về 0.
// Hình học đến từ service dưới dạng mesh gốc + delta; file này chỉ cộng delta và vẽ.

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { buildPositions } from './body3d.js'

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

  let fit = null
  let positions = null
  let geometry = new THREE.BufferGeometry()
  const mesh = new THREE.Mesh(geometry, material)
  scene.add(mesh)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 900, 0)
  controls.addEventListener('change', render)
  controls.update()

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

  function render() {
    // Tự chữa kích thước trước khi vẽ: ResizeObserver và lần gọi lúc khởi tạo đều có thể
    // chạy khi container còn 0x0 rồi im lặng bỏ qua, để buffer kẹt ở 300x150.
    fitToContainer()
    renderer.render(scene, camera)
  }

  /** Nhận payload mới từ service. Cấp phát buffer MỘT LẦN cho mỗi payload. */
  function setFit(next) {
    fit = next
    positions = new Float32Array(fit.positions.length)
    geometry.dispose()
    geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(fit.indices), 1))
    mesh.geometry = geometry
    setTargets(fit.header.names.map((n) => fit.header.targetValues[n]))
  }

  /** Kéo thanh trượt gọi vào đây. Chỉ cộng delta — không chạm mạng. */
  function setTargets(t) {
    if (!fit) return
    buildPositions(fit, t, positions)
    geometry.attributes.position.needsUpdate = true
    geometry.computeVertexNormals()
    geometry.computeBoundingSphere()
    render()
  }

  const ro = new ResizeObserver(() => {
    if (fitToContainer()) render()
  })
  ro.observe(container)
  fitToContainer()

  return {
    setFit,
    setTargets,
    resize: () => {
      if (fitToContainer()) render()
    },
    dispose: () => {
      ro.disconnect()
      renderer.dispose()
      geometry.dispose()
    },
  }
}
