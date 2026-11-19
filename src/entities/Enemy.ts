import { Scene } from '@babylonjs/core/scene'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator'
import { PointLight } from '@babylonjs/core/Lights/pointLight'

export type EnemyType = 'greyling' | 'skeleton' | 'draugr'

export interface Affix { name: string; mod: (e: Enemy) => void }

export const AFFIXES: Affix[] = [
  { name: 'Extra Fast', mod: (e) => { e.speed *= 1.6; e.attackCooldownBase *= 0.7 } },
  { name: 'Fire Enchanted', mod: (e) => { e.fireAura = true; e.damage *= 1.3 } },
  { name: 'Stone Skin', mod: (e) => { e.armor += 8; e.hpMax *= 1.4; e.hp = e.hpMax } },
  { name: 'Cursed', mod: (e) => { e.damage *= 1.2; e.onHitSlow = true } },
  { name: 'Mana Burn', mod: (e) => { e.manaBurn = true } },
]

export class Enemy {
  mesh: Mesh
  scene: Scene
  type: EnemyType
  isChampion = false
  affixes: string[] = []
  hp = 30; hpMax = 30
  damage = 8
  speed = 3
  armor = 0
  attackRange = 1.6
  attackCooldown = 0
  attackCooldownBase = 1.2
  state: 'idle' | 'chase' | 'attack' | 'dead' = 'idle'
  target: Vector3 | null = null
  wanderTimer = 0
  wanderDir = new Vector3(1, 0, 0)
  position: Vector3
  facing = new Vector3(0, 0, 1)
  dead = false
  xpReward = 10
  dropTable: string[] = ['wood', 'stone']
  fireAura = false
  onHitSlow = false
  manaBurn = false
  auraLight: PointLight | null = null
  hitFlash = 0

  constructor(scene: Scene, shadow: ShadowGenerator, type: EnemyType, pos: Vector3, heightAt: (x:number,z:number)=>number, champion = false) {
    this.scene = scene
    this.type = type
    this.isChampion = champion
    this.position = pos.clone()
    this.position.y = heightAt(pos.x, pos.z)

    let color = new Color3(0.4, 0.5, 0.3)
    let scale = 1
    if (type === 'greyling') { color = new Color3(0.5, 0.55, 0.35); hp: 20; this.hp = 20; this.hpMax = 20; this.damage = 6; this.speed = 2.8; this.xpReward = 8; this.dropTable = ['wood','rawMeat'] }
    if (type === 'skeleton') { color = new Color3(0.85, 0.8, 0.7); this.hp = 35; this.hpMax = 35; this.damage = 10; this.speed = 3.2; this.xpReward = 12; this.dropTable = ['bone','stone'] }
    if (type === 'draugr') { color = new Color3(0.3, 0.35, 0.45); this.hp = 120; this.hpMax = 120; this.damage = 18; this.speed = 3.0; this.xpReward = 60; this.dropTable = ['iron','stone','rawMeat'] }

    if (champion) {
      scale = 1.6
      this.hp *= 3; this.hpMax = this.hp
      this.damage *= 1.5
      this.speed *= 1.1
      this.xpReward *= 4
      // 2 random affixes
      const shuffled = [...AFFIXES].sort(() => Math.random() - 0.5).slice(0, 2)
      for (const a of shuffled) { a.mod(this); this.affixes.push(a.name) }
      // aura light
      const pl = new PointLight('aura', this.position.clone(), scene)
      pl.diffuse = new Color3(0.9, 0.3, 0.2)
      pl.intensity = 1.2
      pl.range = 8
      this.auraLight = pl
    }

    let mesh: Mesh
    if (type === 'greyling') mesh = MeshBuilder.CreateSphere('greyling', { diameter: 0.9, segments: 6 }, scene)
    else if (type === 'skeleton') mesh = MeshBuilder.CreateCapsule('skel', { height: 1.5, radius: 0.35 }, scene)
    else mesh = MeshBuilder.CreateCapsule('draugr', { height: 2.0, radius: 0.5 }, scene)

    mesh.scaling.setAll(scale)
    mesh.position = this.position.clone()
    mesh.position.y += (type === 'greyling' ? 0.45 : 0.8) * scale
    const mat = new StandardMaterial('emat', scene)
    mat.diffuseColor = color
    mat.specularColor = new Color3(0.1, 0.1, 0.1)
    mesh.material = mat
    mesh.receiveShadows = true
    shadow.addShadowCaster(mesh)
    mesh.convertToFlatShadedMesh?.()
    this.mesh = mesh

    if (champion) {
      // glowing color shift
      mat.emissiveColor = new Color3(0.3, 0.1, 0.05)
    }
  }

  update(dt: number, playerPos: Vector3, heightAt: (x:number,z:number)=>number) {
    if (this.dead) {
      if (this.auraLight) this.auraLight.intensity = 0
      return
    }
    this.attackCooldown = Math.max(0, this.attackCooldown - dt)
    this.hitFlash = Math.max(0, this.hitFlash - dt)
    const mat = this.mesh.material as StandardMaterial
    if (this.hitFlash > 0) mat.emissiveColor = new Color3(1, 1, 1)
    else if (this.isChampion) mat.emissiveColor = new Color3(0.3, 0.1, 0.05)
    else mat.emissiveColor = Color3.Black()

    const dist = Vector3.Distance(this.position, playerPos)
    if (dist < 18) {
      this.state = 'chase'
      const dir = playerPos.subtract(this.position)
      dir.y = 0
      if (dir.lengthSquared() > 0.01) {
        dir.normalize()
        this.facing = dir.clone()
        if (dist > this.attackRange) {
          this.position.x += dir.x * this.speed * dt
          this.position.z += dir.z * this.speed * dt
        } else {
          this.state = 'attack'
          if (this.attackCooldown <= 0) {
            this.attackCooldown = this.attackCooldownBase
            // attack handled by combat system via callback? We'll expose
          }
        }
      }
    } else {
      this.state = 'idle'
      this.wanderTimer -= dt
      if (this.wanderTimer <= 0) {
        this.wanderTimer = 2 + Math.random() * 2
        const a = Math.random() * Math.PI * 2
        this.wanderDir = new Vector3(Math.cos(a), 0, Math.sin(a))
      }
      this.position.x += this.wanderDir.x * this.speed * 0.4 * dt
      this.position.z += this.wanderDir.z * this.speed * 0.4 * dt
    }
    // bounds
    this.position.x = Math.max(-58, Math.min(58, this.position.x))
    this.position.z = Math.max(-58, Math.min(58, this.position.z))
    this.position.y = heightAt(this.position.x, this.position.z)

    this.mesh.position.x = this.position.x
    this.mesh.position.y = this.position.y + (this.type === 'greyling' ? 0.45 : 0.8) * (this.isChampion ? 1.6 : 1)
    this.mesh.position.z = this.position.z
    if (this.velocityLength() > 0.01 || this.state === 'chase') {
      this.mesh.rotation.y = Math.atan2(this.facing.x, this.facing.z)
    }
    if (this.auraLight) {
      this.auraLight.position = this.position.clone()
      this.auraLight.position.y += 1
    }
  }

  velocityLength() { return 0 }

  takeDamage(amt: number) {
    const reduced = Math.max(1, amt - this.armor * 0.5)
    this.hp = Math.max(0, this.hp - reduced)
    this.hitFlash = 0.12
    if (this.hp <= 0) this.die()
  }

  die() {
    this.dead = true
    this.state = 'dead'
    this.mesh.scaling.y = 0.2
    this.mesh.position.y -= 0.6
    if (this.auraLight) this.auraLight.intensity = 0
  }
}
