import { Scene } from '@babylonjs/core/scene'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { InstancedMesh } from '@babylonjs/core/Meshes/instancedMesh'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem'
import { Texture } from '@babylonjs/core/Materials/Textures/texture'

export type PropKind = 'pine' | 'birch' | 'boulder' | 'bush' | 'pillar'

export interface WorldProp {
  id: string
  kind: PropKind
  position: Vector3
  mesh: InstancedMesh
  hp: number
  maxHp: number
  depleted: boolean
  yield: { wood?: number; stone?: number; flint?: number }
  shake: (amount: number) => void
  deplete: () => void
}

function mat(scene: Scene, color: Color3): StandardMaterial {
  const m = new StandardMaterial('m_' + color.toHexString(), scene)
  m.diffuseColor = color
  m.specularColor = new Color3(0.05, 0.05, 0.05)
  return m
}

function baseMesh(scene: Scene, kind: PropKind): Mesh {
  let m: Mesh
  if (kind === 'pine') {
    const trunk = MeshBuilder.CreateCylinder('trunk', { height: 2.4, diameterTop: 0.22, diameterBottom: 0.38, tessellation: 6 }, scene)
    trunk.position.y = 1.2
    const leaves = MeshBuilder.CreateCylinder('leaves', { height: 3.6, diameterTop: 0.1, diameterBottom: 2.4, tessellation: 6 }, scene)
    leaves.position.y = 3.6
    const root = MeshBuilder.CreateBox('root', { size: 0.001 }, scene)
    trunk.parent = root; leaves.parent = root
    trunk.material = mat(scene, new Color3(0.25, 0.18, 0.1))
    leaves.material = mat(scene, new Color3(0.85, 0.45, 0.12))
    root.convertToFlatShadedMesh?.()
    return root as unknown as Mesh
  } else if (kind === 'birch') {
    const trunk = MeshBuilder.CreateCylinder('trunk', { height: 2.6, diameterTop: 0.18, diameterBottom: 0.3, tessellation: 6 }, scene)
    trunk.position.y = 1.3
    const leaves = MeshBuilder.CreateSphere('leaves', { diameter: 2.0, segments: 6 }, scene)
    leaves.position.y = 3.2
    const root = MeshBuilder.CreateBox('root', { size: 0.001 }, scene)
    trunk.parent = root; leaves.parent = root
    trunk.material = mat(scene, new Color3(0.35, 0.28, 0.18))
    leaves.material = mat(scene, new Color3(0.9, 0.6, 0.15))
    root.convertToFlatShadedMesh?.()
    return root as unknown as Mesh
  } else if (kind === 'boulder') {
    m = MeshBuilder.CreateSphere('boulder', { diameter: 1.6, segments: 6 }, scene)
    m.position.y = 0.8
    m.material = mat(scene, new Color3(0.4, 0.35, 0.28))
    m.convertToFlatShadedMesh?.()
    return m
  } else if (kind === 'bush') {
    m = MeshBuilder.CreateSphere('bush', { diameter: 1.2, segments: 6 }, scene)
    m.position.y = 0.6
    m.material = mat(scene, new Color3(0.75, 0.35, 0.12))
    m.convertToFlatShadedMesh?.()
    return m
  } else {
    m = MeshBuilder.CreateCylinder('pillar', { height: 2.8, diameter: 0.9, tessellation: 6 }, scene)
    m.position.y = 1.4
    m.material = mat(scene, new Color3(0.3, 0.25, 0.2))
    m.convertToFlatShadedMesh?.()
    return m
  }
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
  const placements: { kind: PropKind; pos: Vector3 }[] = []
  const kinds: PropKind[] = ['pine','pine','birch','boulder','bush','pillar']
  let attempts = 0
  while (placements.length < count && attempts < count * 5) {
    attempts++
    const x = (Math.random() - 0.5) * 90
    const z = (Math.random() - 0.5) * 90
    if (Math.hypot(x, z) < 6) continue
    const kind = kinds[Math.floor(Math.random() * kinds.length)]
    placements.push({ kind, pos: new Vector3(x, heightAt(x, z), z) })
  }

  // base meshes per kind
  const bases = new Map<PropKind, Mesh>()
  const props: WorldProp[] = []
  const hpMap: Record<PropKind, number> = { pine:3, birch:2, boulder:4, bush:1, pillar:5 }
  const yieldMap: Record<PropKind, WorldProp['yield']> = {
    pine: { wood: 3 }, birch: { wood: 2 }, boulder: { stone: 3, flint: 1 }, bush: { wood: 0 }, pillar: { stone: 2 }
  }

  for (const pl of placements) {
    if (!bases.has(pl.kind)) bases.set(pl.kind, baseMesh(scene, pl.kind))
    const base = bases.get(pl.kind)!
    base.isVisible = false
    const inst = base.createInstance(pl.kind + '_' + props.length) as InstancedMesh
    const yOff = pl.kind === 'bush' ? 0.6 : pl.kind === 'boulder' ? 0.8 : pl.kind === 'pillar' ? 1.4 : 0
    inst.position = new Vector3(pl.pos.x, pl.pos.y + yOff, pl.pos.z)
    const prop: WorldProp = {
      id: pl.kind + '_' + props.length,
      kind: pl.kind,
      position: pl.pos.clone(),
      mesh: inst,
      hp: hpMap[pl.kind],
      maxHp: hpMap[pl.kind],
      depleted: false,
      yield: yieldMap[pl.kind],
      shake: () => {
        inst.rotation.z = (Math.random() - 0.5) * 0.15
        setTimeout(() => { inst.rotation.z = 0 }, 120)
      },
      deplete: () => {
        prop.depleted = true
        inst.scaling.setAll(0.01)
        spawnBurst(scene, prop.position.clone())
      }
    }
    props.push(prop)
  }
  return props
}
