import { Scene } from '@babylonjs/core/scene'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem'
import { Texture } from '@babylonjs/core/Materials/Textures/texture'
import { PointLight } from '@babylonjs/core/Lights/pointLight'
import { ActionManager } from '@babylonjs/core/Actions/actionManager'
import { ExecuteCodeAction } from '@babylonjs/core/Actions/directActions'
import { createEngine, EngineContext } from './engine/EngineManager'
import { createTerrain, TerrainResult } from './world/Terrain'
import { scatterProps, WorldProp } from './world/WorldProps'
import { Player, Archetype } from './entities/Player'
import { Enemy } from './entities/Enemy'
import { GroundItem } from './entities/GroundItem'
import { generateItem, Item, rarityColor } from './systems/Loot'
import { Inventory } from './systems/Inventory'
import { RECIPES, canCraft, craft } from './systems/Crafting'
import { Audio } from './systems/Audio'

export interface GameSave {
  archetype: Archetype
  player: any
  inventory: any
  groundItems: any[]
  buildPieces: any[]
  hasWorkbench: boolean
  hasCampfire: boolean
  enemies: any[]
}

export class Game {
  ctx!: EngineContext
  canvas!: HTMLCanvasElement
  terrain!: TerrainResult
  props: WorldProp[] = []
  player!: Player
  enemies: Enemy[] = []
  groundItems: GroundItem[] = []
  inventory = new Inventory()
  hasWorkbench = false
  hasCampfire = false
  buildMode = false
  buildPieces: { type: string; pos: Vector3 }[] = []
  buildMeshes: Mesh[] = []

  // input state
  keys: Record<string, boolean> = {}
  mousePos = new Vector3(0, 0, 0)
  moveTarget: Vector3 | null = null
  mobile = false
  touchMove = new Vector3(0, 0, 0)
  touchSprint = false
  joystickActive = false
  joystickOrigin = { x: 0, y: 0 }
  selectedSkillDrag: string | null = null
  reticle: Mesh | null = null

  // ui callback
  onUIUpdate?: () => void
  onTitle?: (cb: (a: Archetype) => void) => void

  archetype: Archetype = 'shieldmaiden'

  async init(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.mobile = navigator.maxTouchPoints > 0 || window.innerWidth < 900
    this.ctx = await createEngine(canvas)
    const { scene } = this.ctx
    this.terrain = createTerrain(scene)
    this.props = scatterProps(scene, this.terrain.heightAt, 70)

    // enemies
    this.spawnEnemies()

    // reticle
    this.reticle = MeshBuilder.CreateTorus('reticle', { diameter: 1.2, thickness: 0.08 }, scene)
    this.reticle.isVisible = false
    const rmat = new StandardMaterial('rmat', scene)
    rmat.diffuseColor = new Color3(1, 0.8, 0.2)
    rmat.emissiveColor = new Color3(1, 0.8, 0.2)
    this.reticle.material = rmat

    // input
    this.setupInput()
    // render loop
    scene.onBeforeRenderObservable.add(() => this.update(scene.getEngine().getDeltaTime() / 1000))
    this.ctx.engine.runRenderLoop(() => this.ctx.scene.render())

    window.addEventListener('resize', () => this.ctx.engine.resize())
  }

  startWithArchetype(a: Archetype) {
    this.archetype = a
    const spawn = new Vector3(0, 0, 0)
    spawn.y = this.terrain.heightAt(0, 0)
    this.player = new Player(this.ctx.scene, this.ctx.shadowGenerator, a, spawn)
    // give starter items
    this.inventory.add(generateItem('Raspberries', 'common'))
    this.inventory.add(generateItem('Raspberries', 'common'))
    // berry bush harvesting handled by prop yield; add raw meat none
    this.save()
    this.onUIUpdate?.()
  }

  spawnEnemies() {
    const scene = this.ctx.scene
    const h = this.terrain.heightAt
    // greylings pack
    for (let i = 0; i < 6; i++) {
      const ang = Math.random() * Math.PI * 2
      const r = 25 + Math.random() * 20
      const p = new Vector3(Math.cos(ang) * r, 0, Math.sin(ang) * r)
      this.enemies.push(new Enemy(scene, this.ctx.shadowGenerator, 'greyling', p, h))
    }
    for (let i = 0; i < 4; i++) {
      const ang = Math.random() * Math.PI * 2
      const r = 30 + Math.random() * 20
      const p = new Vector3(Math.cos(ang) * r, 0, Math.sin(ang) * r)
      this.enemies.push(new Enemy(scene, this.ctx.shadowGenerator, 'skeleton', p, h))
    }
    // champion draugr at shrine
    const shrine = new Vector3(35, 0, 20)
    shrine.y = h(shrine.x, shrine.z)
    const champ = new Enemy(scene, this.ctx.shadowGenerator, 'draugr', shrine, h, true)
    this.enemies.push(champ)
    // shrine pillars already scattered
  }

  setupInput() {
    const canvas = this.canvas
    window.addEventListener('keydown', (e) => { this.keys[e.key.toLowerCase()] = true; this.handleKey(e.key.toLowerCase()) })
    window.addEventListener('keyup', (e) => { this.keys[e.key.toLowerCase()] = false })
    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e))
    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e))
    canvas.addEventListener('mouseup', () => { this.moveTarget = null })
    // touch
    canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false })
    canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false })
    canvas.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false })
  }

  handleKey(k: string) {
    if (k === 'b') { this.buildMode = !this.buildMode; this.onUIUpdate?.() }
    if (k === ' ') { this.doDodge() }
    if (k === 'e') { this.tryInteract() }
    if (k === '1') this.castSkill(0)
    if (k === '2') this.castSkill(1)
    if (k === '3') this.castSkill(2)
    if (k === 'q') this.eatFood(0)
    if (k === 'w') this.eatFood(1)
    if (k === 'r') this.eatFood(2)
    // camera rotation
    if (k === 'arrowleft') this.rotateCamera(-1)
    if (k === 'arrowright') this.rotateCamera(1)
  }

  rotateCamera(dir: number) {
    this.ctx.camera.alpha += dir * Math.PI / 2
  }

  onMouseDown(e: MouseEvent) {
    // raycast to ground
    const pick = this.ctx.scene.pick(e.clientX, e.clientY)
    if (pick && pick.pickedPoint) {
      const p = pick.pickedPoint
      this.mousePos = p.clone()
      // if clicked enemy, attack
      const enemy = this.findNearestEnemy(p, 2)
      if (enemy) {
        this.doAttack(enemy)
      } else {
        // click to move
        this.moveTarget = new Vector3(p.x, 0, p.z)
        this.moveTarget.y = this.terrain.heightAt(p.x, p.z)
      }
      // loot pickup
      const gi = this.findNearestGroundItem(p, 2)
      if (gi) this.pickupItem(gi)
    }
  }
  onMouseMove(e: MouseEvent) {
    const pick = this.ctx.scene.pick(e.clientX, e.clientY)
    if (pick && pick.pickedPoint) this.mousePos = pick.pickedPoint.clone()
  }

  // Touch handling simplified
  onTouchStart(e: TouchEvent) {
    e.preventDefault()
    for (const t of Array.from(e.changedTouches)) {
      if (t.clientX < window.innerWidth * 0.45) {
        this.joystickActive = true
        this.joystickOrigin = { x: t.clientX, y: t.clientY }
      }
    }
  }
  onTouchMove(e: TouchEvent) {
    e.preventDefault()
    for (const t of Array.from(e.changedTouches)) {
      if (this.joystickActive) {
        const dx = t.clientX - this.joystickOrigin.x
        const dy = t.clientY - this.joystickOrigin.y
        const len = Math.hypot(dx, dy)
        const max = 50
        const clamped = Math.min(len, max)
        const nx = (dx / (len || 1)) * (clamped / max)
        const ny = (dy / (len || 1)) * (clamped / max)
        this.touchMove.set(nx, 0, ny)
        this.touchSprint = clamped > max * 0.85
      }
    }
  }
  onTouchEnd(e: TouchEvent) {
    e.preventDefault()
    this.joystickActive = false
    this.touchMove.set(0, 0, 0)
    this.touchSprint = false
  }

  update(dt: number) {
    if (!this.player) return
    const p = this.player
    // movement input
    let moveDir = new Vector3(0, 0, 0)
    // keyboard
    if (this.keys['w']) moveDir.z -= 1
    if (this.keys['s']) moveDir.z += 1
    if (this.keys['a']) moveDir.x -= 1
    if (this.keys['d']) moveDir.x += 1
    // touch
    if (this.touchMove.lengthSquared() > 0) {
      moveDir.x += this.touchMove.x
      moveDir.z += this.touchMove.z
    }
    // click to move
    if (this.moveTarget) {
      const d = this.moveTarget.subtract(p.position)
      d.y = 0
      if (d.length() < 0.5) { this.moveTarget = null }
      else { d.normalize(); moveDir.addInPlace(d) }
    }
    const sprint = this.keys['shift'] || this.touchSprint
    p.update(dt, moveDir, sprint, this.terrain.heightAt)

    // camera follow
    const cam = this.ctx.camera
    const target = p.position.clone()
    target.y += 0.5
    cam.target = Vector3.Lerp(cam.target, target, Math.min(1, dt * 6))

    // enemies update
    for (const e of this.enemies) {
      e.update(dt, p.position, this.terrain.heightAt)
      // enemy attack if in range & cooldown just triggered
      if (!e.dead && e.state === 'attack' && e.attackCooldown > e.attackCooldownBase - 0.1 && e.attackCooldown < e.attackCooldownBase) {
        // deal damage
        const dmg = e.damage
        p.takeDamage(dmg)
        if (e.onHitSlow) { /* could slow */ }
        if (e.manaBurn) p.stats.mana = Math.max(0, p.stats.mana - 5)
        if (e.fireAura) {
          // fire damage tick handled as extra
        }
        Audio.hit()
      }
      // fire aura damage
      if (!e.dead && e.fireAura && Vector3.Distance(e.position, p.position) < 2.5) {
        p.takeDamage(e.damage * 0.3 * dt)
      }
    }

    // props shake recovery etc (none)

    // ground items bob
    for (const gi of this.groundItems) {
      if (gi.picked) continue
      gi.mesh.position.y = gi.position.y + 0.3 + Math.sin(performance.now() / 400 + gi.position.x) * 0.12
    }

    // rested aura from campfire
    if (this.hasCampfire) {
      // find campfire positions
      // grant rested if near any build piece campfire (we track hasCampfire global; aura if player near origin? simplify: always rested if hasCampfire)
      p.stats.rested = performance.now() / 1000 + 10
    }

    // UI
    this.onUIUpdate?.()

    // death check
    if (p.stats.hp <= 0) {
      p.stats.hp = p.stats.maxHp
      p.position.set(0, this.terrain.heightAt(0,0), 0)
      p.mesh.position.set(0, p.position.y+0.8, 0)
    }
  }

  doAttack(targetEnemy?: Enemy) {
    const p = this.player
    if (p.attackCooldown > 0) return
    const cost = 8
    if (p.stats.stamina < cost) return
    p.stats.stamina -= cost
    p.attackCooldown = 0.45
    Audio.sword()
    const wpn = p.stats.buffs.damage
    const baseDmg = 10 + wpn + (this.inventory.equipment.weapon?.stats.damage || 0)
    const crit = Math.random() < p.stats.buffs.crit
    const dmg = crit ? baseDmg * 2 : baseDmg
    // find nearest enemy if not provided
    let target: Enemy | null = targetEnemy ?? null
    if (!target) target = this.findNearestEnemy(p.position, 2.5)
    if (target) {
      target.takeDamage(dmg)
      if (target.dead) {
        this.onEnemyDeath(target)
      }
      // knockback-ish
    }
    // cleave: damage all in cone
    if (p.stats.archetype === 'shieldmaiden') {
      for (const e of this.enemies) {
        if (e.dead) continue
        if (Vector3.Distance(e.position, p.position) < 2.2 && e !== target) e.takeDamage(dmg * 0.6)
      }
    }
  }

  doDodge() {
    const p = this.player
    const dir = new Vector3(this.mousePos.x - p.position.x, 0, this.mousePos.z - p.position.z)
    if (p.dodge(dir)) Audio.dodge()
  }

  doGather(prop: WorldProp) {
    const p = this.player
    if (prop.depleted) return
    const isTree = prop.kind === 'pine' || prop.kind === 'birch'
    const isRock = prop.kind === 'boulder' || prop.kind === 'pillar'
    const cost = 10
    if (p.stats.stamina < cost) return
    p.stats.stamina -= cost
    prop.hp -= 1
    prop.shake(1)
    if (isTree) Audio.axe(); else Audio.pickaxe()
    if (prop.hp <= 0) {
      prop.deplete()
      // yield
      const y = prop.yield
      const mult = 1 + p.stats.buffs.miningYield
      if (y.wood) for (let i = 0; i < Math.round(y.wood * mult); i++) this.inventory.add(generateItem('Wood', 'common'))
      if (y.stone) for (let i = 0; i < Math.round(y.stone * mult); i++) this.inventory.add(generateItem('Stone', 'common'))
      if (y.flint) for (let i = 0; i < Math.round(y.flint * mult); i++) this.inventory.add(generateItem('Flint', 'common'))
      if (prop.kind === 'bush') {
        // berry
        this.inventory.add(generateItem('Raspberries', 'common'))
      }
    }
  }

  castSkill(idx: number) {
    const p = this.player
    const arch = p.stats.archetype
    if (arch === 'shieldmaiden') {
      if (idx === 0) this.skillCleave()
      else if (idx === 1) this.skillShieldBash()
      else this.skillBattleCry()
    } else if (arch === 'seidr') {
      if (idx === 0) this.skillFrostNova()
      else if (idx === 1) this.skillChainLightning()
      else this.skillBifrost()
    } else {
      if (idx === 0) this.skillMultishot()
      else if (idx === 1) this.skillPoisonTrap()
      else this.skillWolfSprint()
    }
  }

  skillCleave() {
    const p = this.player
    if (p.skillCooldowns['cleave'] > 0 || p.stats.stamina < 15) return
    p.skillCooldowns['cleave'] = 3
    p.stats.stamina -= 15
    Audio.sword()
    const dmg = 18 + (this.inventory.equipment.weapon?.stats.damage || 0)
    for (const e of this.enemies) {
      if (e.dead) continue
      if (Vector3.Distance(e.position, p.position) < 3) e.takeDamage(dmg)
      if (e.dead) this.onEnemyDeath(e)
    }
  }
  skillShieldBash() {
    const p = this.player
    if (p.skillCooldowns['bash'] > 0 || p.stats.stamina < 20) return
    p.skillCooldowns['bash'] = 5
    p.stats.stamina -= 20
    Audio.hit()
    const target = this.findNearestEnemy(p.position, 2.5)
    if (target) { target.takeDamage(25); if (target.dead) this.onEnemyDeath(target) }
  }
  skillBattleCry() {
    const p = this.player
    if (p.skillCooldowns['cry'] > 0 || p.stats.mana < 20) return
    p.skillCooldowns['cry'] = 8
    p.stats.mana -= 20
    p.stats.buffs.armor = (p.stats.buffs.armor || 0) + 5
    setTimeout(() => { p.stats.buffs.armor = Math.max(0, (p.stats.buffs.armor||0)-5) }, 6000)
  }
  skillFrostNova() {
    const p = this.player
    if (p.skillCooldowns['frost'] > 0 || p.stats.mana < 25) return
    p.skillCooldowns['frost'] = 6
    p.stats.mana -= 25
    Audio.frost()
    for (const e of this.enemies) {
      if (e.dead) continue
      if (Vector3.Distance(e.position, p.position) < 6) {
        e.takeDamage(30)
        e.speed *= 0.5
        setTimeout(() => { e.speed /= 0.5 }, 3000)
        if (e.dead) this.onEnemyDeath(e)
      }
    }
    // visual ring
    this.spawnRing(p.position, 6, new Color3(0.4, 0.7, 1))
  }
  skillChainLightning() {
    const p = this.player
    if (p.skillCooldowns['chain'] > 0 || p.stats.mana < 30) return
    p.skillCooldowns['chain'] = 7
    p.stats.mana -= 30
    Audio.lightning()
    // hit nearest 3 enemies
    const sorted = this.enemies.filter(e=>!e.dead).sort((a,b)=>Vector3.Distance(a.position,p.position)-Vector3.Distance(b.position,p.position))
    for (let i = 0; i < Math.min(3, sorted.length); i++) {
      sorted[i].takeDamage(22)
      if (sorted[i].dead) this.onEnemyDeath(sorted[i])
    }
  }
  skillBifrost() {
    const p = this.player
    if (p.skillCooldowns['blink'] > 0 || p.stats.mana < 20) return
    p.skillCooldowns['blink'] = 5
    p.stats.mana -= 20
    const dir = this.facingFromMouse()
    p.position.x += dir.x * 6
    p.position.z += dir.z * 6
    p.position.x = Math.max(-58, Math.min(58, p.position.x))
    p.position.z = Math.max(-58, Math.min(58, p.position.z))
    p.position.y = this.terrain.heightAt(p.position.x, p.position.z)
    p.mesh.position.set(p.position.x, p.position.y+0.8, p.position.z)
  }
  skillMultishot() {
    const p = this.player
    if (p.skillCooldowns['multi'] > 0 || p.stats.stamina < 20) return
    p.skillCooldowns['multi'] = 4
    p.stats.stamina -= 20
    Audio.sword()
    const dmg = 12
    for (const e of this.enemies) {
      if (e.dead) continue
      const v = e.position.subtract(p.position)
      const angle = Math.atan2(v.x, v.z)
      const facing = Math.atan2(this.mousePos.x - p.position.x, this.mousePos.z - p.position.z)
      if (Math.abs(angle - facing) < 0.6 && Vector3.Distance(e.position, p.position) < 12) {
        e.takeDamage(dmg); if (e.dead) this.onEnemyDeath(e)
      }
    }
  }
  skillPoisonTrap() {
    const p = this.player
    if (p.skillCooldowns['trap'] > 0 || p.stats.mana < 20) return
    p.skillCooldowns['trap'] = 6
    p.stats.mana -= 20
    // place trap at mouse pos
    const pos = this.mousePos.clone()
    pos.y = this.terrain.heightAt(pos.x, pos.z)
    // delayed damage
    setTimeout(() => {
      for (const e of this.enemies) {
        if (e.dead) continue
        if (Vector3.Distance(e.position, pos) < 3) { e.takeDamage(40); if (e.dead) this.onEnemyDeath(e) }
      }
      this.spawnRing(pos, 3, new Color3(0.3, 0.8, 0.3))
    }, 1500)
    this.spawnRing(pos, 1.5, new Color3(0.3, 0.8, 0.3))
  }
  skillWolfSprint() {
    const p = this.player
    if (p.skillCooldowns['wolf'] > 0 || p.stats.stamina < 10) return
    p.skillCooldowns['wolf'] = 8
    p.stats.buffs.moveSpeed += 0.6
    setTimeout(() => { p.stats.buffs.moveSpeed = Math.max(0, p.stats.buffs.moveSpeed - 0.6) }, 5000)
  }

  facingFromMouse(): Vector3 {
    const p = this.player
    const d = new Vector3(this.mousePos.x - p.position.x, 0, this.mousePos.z - p.position.z)
    if (d.lengthSquared() < 0.01) return p.facing.clone()
    return d.normalize()
  }

  spawnRing(pos: Vector3, radius: number, color: Color3) {
    const ring = MeshBuilder.CreateTorus('ring', { diameter: radius * 2, thickness: 0.1 }, this.ctx.scene)
    ring.position = pos.clone()
    ring.position.y += 0.1
    const mat = new StandardMaterial('ringmat', this.ctx.scene)
    mat.diffuseColor = color
    mat.emissiveColor = color
    mat.alpha = 0.8
    ring.material = mat
    let t = 0
    const obs = this.ctx.scene.onBeforeRenderObservable.add(() => {
      t += this.ctx.engine.getDeltaTime() / 1000
      ring.scaling.setAll(1 + t * 2)
      mat.alpha = Math.max(0, 0.8 - t)
      if (t > 0.6) { ring.dispose(); this.ctx.scene.onBeforeRenderObservable.remove(obs) }
    })
  }

  onEnemyDeath(e: Enemy) {
    // loot drop
    const n = e.isChampion ? 4 : 1 + Math.floor(Math.random() * 2)
    for (let i = 0; i < n; i++) {
      const item = generateItem()
      const pos = e.position.clone()
      pos.x += (Math.random() - 0.5) * 1.5
      pos.z += (Math.random() - 0.5) * 1.5
      this.groundItems.push(new GroundItem(this.ctx.scene, item, pos))
    }
    // raw meat from greyling
    if (e.type === 'greyling') {
      const pos = e.position.clone()
      this.groundItems.push(new GroundItem(this.ctx.scene, generateItem('Raw Meat', 'common'), pos))
    }
    this.player.gainXp(e.xpReward)
    Audio.loot()
    // haptic
    if (navigator.vibrate) navigator.vibrate(30)
  }

  tryInteract() {
    const p = this.player
    // nearest prop within 2.5
    let nearest: WorldProp | null = null
    let best = 2.5
    for (const pr of this.props) {
      if (pr.depleted) continue
      const d = Vector3.Distance(pr.position, p.position)
      if (d < best) { best = d; nearest = pr }
    }
    if (nearest) { this.doGather(nearest); return }
    // ground item
    const gi = this.findNearestGroundItem(p.position, 2.5)
    if (gi) { this.pickupItem(gi); return }
    // build piece interaction none
  }

  findNearestEnemy(pos: Vector3, range: number): Enemy | null {
    let best: Enemy | null = null; let bd = range
    for (const e of this.enemies) {
      if (e.dead) continue
      const d = Vector3.Distance(e.position, pos)
      if (d < bd) { bd = d; best = e }
    }
    return best
  }
  findNearestGroundItem(pos: Vector3, range: number): GroundItem | null {
    let best: GroundItem | null = null; let bd = range
    for (const gi of this.groundItems) {
      if (gi.picked) continue
      const d = Vector3.Distance(gi.position, pos)
      if (d < bd) { bd = d; best = gi }
    }
    return best
  }
  findNearestProp(pos: Vector3, range: number): WorldProp | null {
    let best: WorldProp | null = null; let bd = range
    for (const pr of this.props) {
      if (pr.depleted) continue
      const d = Vector3.Distance(pr.position, pos)
      if (d < bd) { bd = d; best = pr }
    }
    return best
  }

  pickupItem(gi: GroundItem) {
    gi.picked = true
    this.inventory.add(gi.item)
    gi.dispose()
    this.groundItems = this.groundItems.filter(x => x !== gi)
    Audio.loot()
    if (navigator.vibrate) navigator.vibrate(15)
    this.onUIUpdate?.()
  }

  eatFood(slot: number) {
    const p = this.player
    // Find a consumable in inventory
    const consumable = this.inventory.items.find(i => i.type === 'consumable')
    if (!consumable) return
    this.inventory.remove(consumable.id)
    const name = consumable.name
    const now = performance.now() / 1000
    const buff = {
      name,
      maxHp: name.includes('Meat') ? 40 : name.includes('Honey') ? 20 : 10,
      maxStamina: name.includes('Honey') ? 30 : name.includes('Meat') ? 20 : 10,
      regen: name.includes('Meat') ? 3 : 2,
      expires: now + 300
    }
    p.eat(buff)
    Audio.eat()
    this.onUIUpdate?.()
  }

  placeBuild(type: string) {
    if (!this.buildMode) return
    const p = this.player
    // snap to grid
    const x = Math.round(p.position.x / 2) * 2
    const z = Math.round(p.position.z / 2) * 2
    // cost check
    const recipe = RECIPES.find(r => r.result.build === type)
    if (recipe) {
      if (!canCraft(recipe, this.inventory, this.hasWorkbench, this.hasCampfire)) return
      craft(recipe, this.inventory, this.hasWorkbench, this.hasCampfire)
    }
    const pos = new Vector3(x, this.terrain.heightAt(x, z), z)
    this.buildPieces.push({ type, pos })
    this.spawnBuildMesh(type, pos)
    Audio.build()
    this.onUIUpdate?.()
  }

  spawnBuildMesh(type: string, pos: Vector3) {
    const scene = this.ctx.scene
    let mesh: Mesh
    if (type === 'campfire') {
      mesh = MeshBuilder.CreateCylinder('cf', { height: 0.4, diameter: 1.2 }, scene)
      mesh.position = pos.clone(); mesh.position.y += 0.2
      const mat = new StandardMaterial('cfmat', scene)
      mat.diffuseColor = new Color3(0.3, 0.2, 0.1)
      mesh.material = mat
      this.hasCampfire = true
      const pl = new PointLight('fire', pos.clone(), scene)
      pl.position.y += 1
      pl.diffuse = new Color3(1, 0.6, 0.2)
      pl.intensity = 1.5
      pl.range = 10
      const obs = scene.onBeforeRenderObservable.add(() => {
        pl.intensity = 1.2 + Math.sin(performance.now() / 200) * 0.4
      })
      // fire particles
      const ps = new ParticleSystem('fire', 80, scene)
      const tex = new Texture('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', scene)
      ps.particleTexture = tex
      ps.emitter = new Vector3(pos.x, pos.y + 0.3, pos.z)
      ps.minEmitBox = new Vector3(-0.1, 0, -0.1)
      ps.maxEmitBox = new Vector3(0.1, 0, 0.1)
      ps.color1 = new Color3(1, 0.6, 0.2).toColor4(1)
      ps.color2 = new Color3(1, 0.3, 0.05).toColor4(1)
      ps.colorDead = new Color3(0.2, 0.2, 0.2).toColor4(0)
      ps.minSize = 0.08; ps.maxSize = 0.22
      ps.minLifeTime = 0.4; ps.maxLifeTime = 0.9
      ps.emitRate = 40
      ps.gravity = new Vector3(0, 1.5, 0)
      ps.direction1 = new Vector3(-0.2, 1, -0.2)
      ps.direction2 = new Vector3(0.2, 2, 0.2)
      ps.start()
    } else if (type === 'workbench') {
      mesh = MeshBuilder.CreateBox('wb', { width: 1.5, height: 0.9, depth: 0.8 }, scene)
      mesh.position = pos.clone(); mesh.position.y += 0.45
      const mat = new StandardMaterial('wbmat', scene)
      mat.diffuseColor = new Color3(0.45, 0.3, 0.15)
      mesh.material = mat
      this.hasWorkbench = true
    } else if (type === 'wall') {
      mesh = MeshBuilder.CreateBox('wall', { width: 2, height: 2, depth: 0.3 }, scene)
      mesh.position = pos.clone(); mesh.position.y += 1
      const mat = new StandardMaterial('wmat', scene)
      mat.diffuseColor = new Color3(0.5, 0.4, 0.25)
      mesh.material = mat
      mesh.receiveShadows = true
      this.ctx.shadowGenerator.addShadowCaster(mesh)
    } else {
      mesh = MeshBuilder.CreateBox('floor', { width: 2, height: 0.15, depth: 2 }, scene)
      mesh.position = pos.clone(); mesh.position.y += 0.075
      const mat = new StandardMaterial('fmat', scene)
      mat.diffuseColor = new Color3(0.4, 0.32, 0.2)
      mesh.material = mat
    }
    mesh.convertToFlatShadedMesh?.()
    this.buildMeshes.push(mesh)
  }

  // Save/Load
  save() {
    try {
      const data = {
        archetype: this.archetype,
        player: this.player ? {
          pos: this.player.position.asArray(),
          stats: this.player.stats,
          skillCooldowns: this.player.skillCooldowns
        } : null,
        inventory: this.inventory,
        hasWorkbench: this.hasWorkbench,
        hasCampfire: this.hasCampfire,
        buildPieces: this.buildPieces.map(b => ({ type: b.type, pos: b.pos.asArray() })),
      }
      localStorage.setItem('ashenheim_save', JSON.stringify(data))
    } catch (e) { console.warn('save failed', e) }
  }
  load(): boolean {
    try {
      const raw = localStorage.getItem('ashenheim_save')
      if (!raw) return false
      const data = JSON.parse(raw)
      if (!data.archetype) return false
      this.startWithArchetype(data.archetype)
      if (data.player) {
        this.player.position = Vector3.FromArray(data.player.pos)
        this.player.mesh.position.set(this.player.position.x, this.player.position.y + 0.8, this.player.position.z)
        this.player.stats = data.player.stats
        this.player.skillCooldowns = data.player.skillCooldowns || {}
      }
      if (data.inventory) {
        this.inventory.items = data.inventory.items || []
        this.inventory.equipment = data.inventory.equipment || { weapon: null, armor: null, tool: null }
      }
      this.hasWorkbench = !!data.hasWorkbench
      this.hasCampfire = !!data.hasCampfire
      // clear previous build meshes
      for (const m of this.buildMeshes) { try { m.dispose() } catch {} }
      this.buildMeshes = []
      this.buildPieces = []
      if (data.buildPieces) {
        for (const bp of data.buildPieces) {
          const pos = Vector3.FromArray(bp.pos)
          this.buildPieces.push({ type: bp.type, pos })
          this.spawnBuildMesh(bp.type, pos)
        }
      }
      return true
    } catch (e) { console.warn('load failed', e); return false }
  }
}
