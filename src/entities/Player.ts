import { Scene } from '@babylonjs/core/scene'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator'

export type Archetype = 'shieldmaiden' | 'seidr' | 'skald'

export interface FoodBuff { name: string; maxHp: number; maxStamina: number; regen: number; expires: number }

export interface PlayerStats {
  hp: number; maxHp: number
  stamina: number; maxStamina: number
  mana: number; maxMana: number
  level: number; xp: number
  archetype: Archetype
  food: (FoodBuff | null)[]
  rested: number
  buffs: { moveSpeed: number; crit: number; damage: number; fireDamage: number; miningYield: number; maxStaminaBonus: number; armor: number }
}

export class Player {
  mesh: Mesh
  scene: Scene
  stats: PlayerStats
  position: Vector3
  velocity = new Vector3(0, 0, 0)
  facing = new Vector3(0, 0, 1)
  isSprinting = false
  isDodging = false
  dodgeTimer = 0
  attackCooldown = 0
  invuln = 0
  skillCooldowns: Record<string, number> = {}

  constructor(scene: Scene, shadow: ShadowGenerator, archetype: Archetype, spawn: Vector3) {
    this.scene = scene
    this.position = spawn.clone()
    const body = MeshBuilder.CreateCapsule('player', { height: 1.6, radius: 0.4 }, scene)
    body.position = spawn.clone()
    body.position.y += 0.8
    const mat = new StandardMaterial('playerMat', scene)
    const color = archetype === 'shieldmaiden' ? new Color3(0.8, 0.3, 0.3)
      : archetype === 'seidr' ? new Color3(0.3, 0.5, 0.9) : new Color3(0.3, 0.7, 0.4)
    mat.diffuseColor = color
    mat.specularColor = new Color3(0.2, 0.2, 0.2)
    body.material = mat
    body.receiveShadows = true
    shadow.addShadowCaster(body)
    this.mesh = body

    this.stats = {
      hp: 100, maxHp: 100,
      stamina: 100, maxStamina: 100,
      mana: 50, maxMana: 50,
      level: 1, xp: 0,
      archetype,
      food: [null, null, null],
      rested: 0,
      buffs: { moveSpeed: 0, crit: 0.05, damage: 0, fireDamage: 0, miningYield: 0, maxStaminaBonus: 0, armor: 0 }
    }
  }

  eat(food: FoodBuff) {
    // replace if same name
    const idx = this.stats.food.findIndex(f => f && f.name === food.name)
    const slot = idx >= 0 ? idx : this.stats.food.findIndex(f => !f)
    if (slot < 0) return false
    this.stats.food[slot] = food
    this.recalcMax()
    return true
  }

  recalcMax() {
    let hpBonus = 0, stamBonus = 0, regenBonus = 0
    const now = performance.now() / 1000
    for (const f of this.stats.food) {
      if (!f || f.expires < now) continue
      hpBonus += f.maxHp
      stamBonus += f.maxStamina
      regenBonus += f.regen
    }
    this.stats.maxHp = 100 + hpBonus
    this.stats.maxStamina = 100 + stamBonus + this.stats.buffs.maxStaminaBonus
    this.stats.hp = Math.min(this.stats.hp, this.stats.maxHp)
    this.stats.stamina = Math.min(this.stats.stamina, this.stats.maxStamina)
    this.stats.rested = regenBonus
  }

  update(dt: number, moveDir: Vector3, sprint: boolean, heightAt: (x:number,z:number)=>number) {
    const now = performance.now() / 1000
    this.recalcMax()

    // cooldowns
    this.attackCooldown = Math.max(0, this.attackCooldown - dt)
    this.invuln = Math.max(0, this.invuln - dt)
    this.dodgeTimer = Math.max(0, this.dodgeTimer - dt)
    for (const k in this.skillCooldowns) this.skillCooldowns[k] = Math.max(0, this.skillCooldowns[k] - dt)

    // regen stamina
    let regenRate = 12
    if (this.stats.rested > 0 && now < this.stats.rested) regenRate += 6
    if (!this.isDodging) this.stats.stamina = Math.min(this.stats.maxStamina, this.stats.stamina + regenRate * dt)
    // hp regen from food
    let hpRegen = 0
    for (const f of this.stats.food) if (f && f.expires > now) hpRegen += f.regen * 0.5
    if (hpRegen > 0) this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + hpRegen * dt)

    // mana regen
    this.stats.mana = Math.min(this.stats.maxMana, this.stats.mana + 4 * dt)

    // movement
    if (this.dodgeTimer > 0) {
      // dodge in progress
    } else {
      const speed = (sprint && this.stats.stamina > 5) ? 7.5 : 4.5
      const ms = 1 + this.stats.buffs.moveSpeed
      const finalSpeed = speed * ms
      if (moveDir.lengthSquared() > 0) {
        moveDir.normalize()
        this.velocity.x = moveDir.x * finalSpeed
        this.velocity.z = moveDir.z * finalSpeed
        this.facing = moveDir.clone()
        if (sprint && this.stats.stamina > 5) {
          this.stats.stamina -= 18 * dt
          this.isSprinting = true
        } else {
          this.isSprinting = false
        }
      } else {
        this.velocity.x = 0; this.velocity.z = 0
        this.isSprinting = false
      }
    }

    // dodge roll decay
    if (this.isDodging) {
      this.velocity.x *= 0.92
      this.velocity.z *= 0.92
    }

    this.position.x += this.velocity.x * dt
    this.position.z += this.velocity.z * dt
    // clamp world
    this.position.x = Math.max(-58, Math.min(58, this.position.x))
    this.position.z = Math.max(-58, Math.min(58, this.position.z))
    const h = heightAt(this.position.x, this.position.z)
    this.position.y = h

    this.mesh.position.x = this.position.x
    this.mesh.position.y = this.position.y + 0.8
    this.mesh.position.z = this.position.z
    // face direction
    if (this.velocity.lengthSquared() > 0.01) {
      this.mesh.rotation.y = Math.atan2(this.velocity.x, this.velocity.z)
    }
  }

  dodge(dir: Vector3) {
    if (this.stats.stamina < 15) return false
    this.stats.stamina -= 15
    this.isDodging = true
    this.dodgeTimer = 0.35
    this.invuln = 0.35
    const d = dir.lengthSquared() > 0 ? dir.normalize() : this.facing.clone()
    this.velocity.x = d.x * 12
    this.velocity.z = d.z * 12
    setTimeout(() => { this.isDodging = false }, 350)
    return true
  }

  takeDamage(amt: number) {
    if (this.invuln > 0) return
    this.stats.hp = Math.max(0, this.stats.hp - amt)
    this.invuln = 0.25
  }

  gainXp(xp: number) {
    this.stats.xp += xp
    while (this.stats.xp >= this.stats.level * 100) {
      this.stats.xp -= this.stats.level * 100
      this.stats.level++
      this.stats.maxHp += 10
      this.stats.hp = this.stats.maxHp
    }
  }
}
