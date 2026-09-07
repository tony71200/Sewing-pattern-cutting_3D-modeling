// Cảnh three.js cho ma-nơ-canh.
//
// Render THEO YÊU CẦU, không có vòng lặp requestAnimationFrame chạy vô hạn:
// máy đứng yên thì CPU/GPU về 0. Vẽ lại khi số đo đổi hoặc camera động.

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { createBody, createLimbs } from './body/mesh.js'

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

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 900, 0)
  controls.addEventListener('change', render)
  controls.update()

  function render() {
    renderer.render(scene, camera)
  }

  function update(measurements, gender) {
    for (const { part, geometry } of meshes) {
      part.update(measurements, gender)
      geometry.attributes.position.needsUpdate = true
      geometry.computeVertexNormals()
      geometry.computeBoundingSphere()
    }
    render()
  }

  function resize() {
    const w = container.clientWidth
    const h = container.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    render()
  }

  new ResizeObserver(resize).observe(container)
  resize()

  return { update, resize }
}
