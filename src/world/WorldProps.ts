import { Scene } from '@babylonjs/core/scene'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem'
import { Texture } from '@babylonjs/core/Materials/Textures/texture'

export type PropKind = 'pine' | 'birch' | 'boulder' | 'bush' | 'pillar'

export interface WorldProp {
  id: string
  kind: PropKind
  node: TransformNode
  mesh: Mesh
  hp: number
  maxHp: number
  depleted: boolean
  yield: { wood?: number; stone?: number; flint?: number; rawMeat?: number }
  shake: (amount: number) => void
  deplete: () => void
}

function mat(scene: Scene, color: Color3, flat = true): StandardMaterial {
  const m = new StandardMaterial('m_' + color.toHexString(), scene)
  m.diffuseColor = color
  m.specularColor = new Color3(0.05, 0.05, 0.05)
  if (flat) m.wireframe = false
  return m
}

function makePine(scene: Scene): Mesh {
  const trunk = MeshBuilder.CreateCylinder('trunk', { height: 2.2, diameterTop: 0.25, diameterBottom: 0.4 }, scene)
  trunk.position.y = 1.1
  const leaves = MeshBuilder.CreateCylinder('leaves', { height: 3.2, diameterTop: 0.1, diameterBottom: 2.6, tessellation: 6 }, scene)
  leaves.position.y = 3.4
  const root = MeshBuilder.CreateBox('root', { size: 0.001 }, scene)
  trunk.parent = root; leaves.parent = root
  trunk.material = mat(scene, new Color3(0.35, 0.22, 0.12))
  leaves.material = mat(scene, new Color3(0.18, 0.42, 0.22))
  // merge not needed; return root as mesh container via transformnode handled outside
  return root as unknown as Mesh
}

// We'll instead build a node-based prop factory
export function createProp(scene: Scene, kind: PropKind, pos: Vector3, heightAt: (x: number, z: number) => number): WorldProp {
  const node = new TransformNode(kind, scene)
  node.position = new Vector3(pos.x, heightAt(pos.x, pos.z), pos.z)
  let mesh: Mesh
  let hp = 1
  let yieldObj: WorldProp['yield'] = {}
  const green = mat(scene, new Color3(0.2, 0.45, 0.2))

  if (kind === 'pine') {
    const trunk = MeshBuilder.CreateCylinder('trunk', { height: 2.4, diameterTop: 0.22, diameterBottom: 0.38, tessellation: 6 }, scene)
    trunk.position.y = 1.2
    const leaves = MeshBuilder.CreateCylinder('leaves', { height: 3.6, diameterTop: 0.1, diameterBottom: 2.4, tessellation: 6 }, scene)
    leaves.position.y = 3.6
    trunk.parent = node; leaves.parent = node
    trunk.material = mat(scene, new Color3(0.25, 0.18, 0.1))
    leaves.material = mat(scene, new Color3(0.85, 0.45, 0.12))
    trunk.receiveShadows = true; leaves.receiveShadows = true
    mesh = leaves
    hp = 3; yieldObj = { wood: 3 }
  } else if (kind === 'birch') {
    const trunk = MeshBuilder.CreateCylinder('trunk', { height: 2.6, diameterTop: 0.18, diameterBottom: 0.3, tessellation: 6 }, scene)
    trunk.position.y = 1.3
    const leaves = MeshBuilder.CreateSphere('leaves', { diameter: 2.0, segments: 6 }, scene)
    leaves.position.y = 3.2
    trunk.parent = node; leaves.parent = node
    trunk.material = mat(scene, new Color3(0.35, 0.28, 0.18))
    leaves.material = mat(scene, new Color3(0.9, 0.6, 0.15))
    mesh = leaves
    hp = 2; yieldObj = { wood: 2 }
  } else if (kind === 'boulder') {
    mesh = MeshBuilder.CreateSphere('boulder', { diameter: 1.6, segments: 6 }, scene)
    mesh.position.y = 0.8
    mesh.parent = node
    mesh.material = mat(scene, new Color3(0.4, 0.35, 0.28))
    hp = 4; yieldObj = { stone: 3, flint: 1 }
  } else if (kind === 'bush') {
    mesh = MeshBuilder.CreateSphere('bush', { diameter: 1.2, segments: 6 }, scene)
    mesh.position.y = 0.6
    mesh.parent = node
    mesh.material = mat(scene, new Color3(0.75, 0.35, 0.12))
    hp = 1; yieldObj = { rawMeat: 0 }
  } else {
    // pillar
    mesh = MeshBuilder.CreateCylinder('pillar', { height: 2.8, diameter: 0.9, tessellation: 6 }, scene)
    mesh.position.y = 1.4
    mesh.parent = node
    mesh.material = mat(scene, new Color3(0.3, 0.25, 0.2))
    hp = 5; yieldObj = { stone: 2 }
  }

  // flat shade all child meshes
  node.getChildMeshes().forEach((m) => (m as Mesh).convertToFlatShadedMesh?.())

  const prop: WorldProp = {
    id: kind + '_' + Math.random().toString(36).slice(2),
    kind,
    node,
    mesh,
    hp,
    maxHp: hp,
    depleted: false,
    yield: yieldObj,
    shake: (amount: number) => {
      const orig = node.rotation.y
      node.rotation.z = (Math.random() - 0.5) * 0.15 * amount
      setTimeout(() => { node.rotation.z = 0 }, 120)
    },
    deplete: () => {
      prop.depleted = true
      // shatter: scale down + particle burst
      node.scaling.setAll(0.01)
      spawnBurst(scene, node.position.clone())
    }
  }
  return prop
}

function spawnBurst(scene: Scene, pos: Vector3) {
  const ps = new ParticleSystem('burst', 60, scene)
  const t = new Texture('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', scene)
  ps.particleTexture = t
  ps.emitter = pos
  ps.minEmitBox = new Vector3(-0.2, 0, -0.2)
  ps.maxEmitBox = new Vector3(0.2, 0.2, 0.2)
  ps.color1 = new Color3(0.6, 0.5, 0.4).toColor4(1)
  ps.color2 = new Color3(0.3, 0.3, 0.3).toColor4(1)
  ps.minSize = 0.05; ps.maxSize = 0.2
  ps.minLifeTime = 0.3; ps.maxLifeTime = 0.8
  ps.emitRate = 200
  ps.gravity = new Vector3(0, -6, 0)
  ps.direction1 = new Vector3(-1, 2, -1)
  ps.direction2 = new Vector3(1, 4, 1)
  ps.start()
  setTimeout(() => { ps.stop(); setTimeout(() => ps.dispose(), 1000) }, 150)
}

export function scatterProps(scene: Scene, heightAt: (x:number,z:number)=>number, count = 60): WorldProp[] {
  const props: WorldProp[] = []
  const kinds: PropKind[] = ['pine','pine','birch','boulder','bush','pillar']
  let attempts = 0
  while (props.length < count && attempts < count * 5) {
    attempts++
    const x = (Math.random() - 0.5) * 90
    const z = (Math.random() - 0.5) * 90
    if (Math.hypot(x, z) < 6) continue
    const kind = kinds[Math.floor(Math.random() * kinds.length)]
    const p = createProp(scene, kind, new Vector3(x, 0, z), heightAt)
    props.push(p)
  }
  // bushes yield berries (rawMeat=0 but mark special) - set yield for bush
  props.forEach(p => {
    if (p.kind === 'bush') p.yield = { rawMeat: 0 }
  })
  return props
}
