import { Game } from '../Game'
import { Item, rarityColor } from '../systems/Loot'
import { RECIPES, canCraft, craft } from '../systems/Crafting'

export class UIManager {
  game: Game
  root: HTMLElement
  mode: 'mobile' | 'desktop'
  invOpen = false
  craftOpen = false
  buildOpen = false
  mobileToggle = false

  // DOM refs
  hudEl!: HTMLElement
  invEl!: HTMLElement
  craftEl!: HTMLElement
  buildEl!: HTMLElement

  constructor(game: Game, root: HTMLElement) {
    this.game = game
    this.root = root
    this.mode = game.mobile ? 'mobile' : 'desktop'
    game.onUIUpdate = () => this.update()
    this.build()
  }

  setMode(m: 'mobile' | 'desktop') {
    this.mode = m
    this.build()
  }

  build() {
    this.root.innerHTML = ''
    if (this.mode === 'mobile') this.buildMobile()
    else this.buildDesktop()
    this.buildPanels()
  }

  buildMobile() {
    const hud = document.createElement('div')
    hud.className = 'mob-hud'
    hud.innerHTML = `
      <div class="top-hud">
        <div class="bar hp"><div class="fill" id="m-hp" style="width:100%"></div></div>
        <div class="bar stamina"><div class="fill" id="m-stam" style="width:100%"></div></div>
        <div class="bar mana"><div class="fill" id="m-mana" style="width:100%"></div></div>
        <div class="food-slots" id="m-food"></div>
      </div>
      <div class="joystick" id="m-joy"><div class="knob" id="m-knob"></div></div>
      <button class="action-btn" id="m-action">Attack</button>
      <div class="skill-arc">
        <button class="skill-btn" id="m-s1">S1</button>
        <button class="skill-btn" id="m-s2">S2</button>
        <button class="skill-btn" id="m-s3">S3</button>
      </div>
      <button class="dodge-btn" id="m-dodge">Dodge</button>
      <div style="position:fixed;bottom:8px;left:50%;transform:translateX(-50%);display:flex;gap:6px;pointer-events:auto;">
        <button class="btn" id="m-inv">Bag</button>
        <button class="btn" id="m-craft">Craft</button>
        <button class="btn" id="m-build">Build</button>
      </div>
    `
    this.root.appendChild(hud)
    this.hudEl = hud
    // wire
    const joy = hud.querySelector('#m-joy') as HTMLElement
    joy.addEventListener('touchstart', (e) => {
      e.preventDefault()
      const t = e.touches[0]
      this.game.joystickOrigin = { x: t.clientX, y: t.clientY }
      this.game.joystickActive = true
    }, { passive: false })
    joy.addEventListener('touchmove', (e) => {
      e.preventDefault()
      const t = e.touches[0]
      const dx = t.clientX - this.game.joystickOrigin.x
      const dy = t.clientY - this.game.joystickOrigin.y
      const len = Math.hypot(dx, dy)
      const max = 40
      const cl = Math.min(len, max)
      const k = hud.querySelector('#m-knob') as HTMLElement
      k.style.transform = `translate(${dx*cl/(len||1)-24}px, ${dy*cl/(len||1)-24}px)`
      const nx = (dx/(len||1))*(cl/max)
      const ny = (dy/(len||1))*(cl/max)
      this.game.touchMove.set(nx,0,ny)
      this.game.touchSprint = cl > max*0.85
    }, { passive: false })
    joy.addEventListener('touchend', () => {
      this.game.joystickActive = false
      this.game.touchMove.set(0,0,0)
      const k = hud.querySelector('#m-knob') as HTMLElement
      k.style.transform = 'translate(-50%,-50%)'
    })
    hud.querySelector('#m-action')?.addEventListener('click', () => this.contextAction())
    hud.querySelector('#m-s1')?.addEventListener('click', () => this.game.castSkill(0))
    hud.querySelector('#m-s2')?.addEventListener('click', () => this.game.castSkill(1))
    hud.querySelector('#m-s3')?.addEventListener('click', () => this.game.castSkill(2))
    hud.querySelector('#m-dodge')?.addEventListener('click', () => this.game.doDodge())
    hud.querySelector('#m-inv')?.addEventListener('click', () => this.toggle('inv'))
    hud.querySelector('#m-craft')?.addEventListener('click', () => this.toggle('craft'))
    hud.querySelector('#m-build')?.addEventListener('click', () => this.toggle('build'))
  }

  buildDesktop() {
    const hud = document.createElement('div')
    hud.className = 'desk-hud'
    hud.innerHTML = `
      <div style="display:flex;align-items:flex-end;gap:12px;">
        <div class="orb hp"><div class="fill" id="d-hp" style="height:100%"></div><span style="position:absolute;bottom:4px;left:0;right:0;text-align:center;font-size:11px;">HP</span></div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
          <div class="stamina-bar"><div class="fill" id="d-stam" style="width:100%"></div></div>
          <div class="hotbar" id="d-hotbar"></div>
          <div class="food-slots" id="d-food"></div>
        </div>
        <div class="orb mana"><div class="fill" id="d-mana" style="height:100%"></div><span style="position:absolute;bottom:4px;left:0;right:0;text-align:center;font-size:11px;">MP</span></div>
      </div>
      <div style="position:fixed;top:8px;right:8px;display:flex;gap:6px;pointer-events:auto;">
        <button class="btn" id="d-inv">Inventory</button>
        <button class="btn" id="d-craft">Crafting</button>
        <button class="btn" id="d-build">Build (B)</button>
        <button class="btn" id="d-rotL">↺</button>
        <button class="btn" id="d-rotR">↻</button>
        <button class="btn" id="d-save">Save</button>
      </div>
    `
    this.root.appendChild(hud)
    this.hudEl = hud
    // hotbar slots
    const hb = hud.querySelector('#d-hotbar') as HTMLElement
    for (let i = 0; i < 6; i++) {
      const s = document.createElement('div')
      s.className = 'slot'
      s.textContent = i < 3 ? ['Q','W','E'][i] : ['1','2','3'][i-3]
      hb.appendChild(s)
    }
    hud.querySelector('#d-inv')?.addEventListener('click', () => this.toggle('inv'))
    hud.querySelector('#d-craft')?.addEventListener('click', () => this.toggle('craft'))
    hud.querySelector('#d-build')?.addEventListener('click', () => { this.game.buildMode = !this.game.buildMode; this.toggle('build') })
    hud.querySelector('#d-rotL')?.addEventListener('click', () => this.game.rotateCamera(-1))
    hud.querySelector('#d-rotR')?.addEventListener('click', () => this.game.rotateCamera(1))
    hud.querySelector('#d-save')?.addEventListener('click', () => this.game.save())
  }

  buildPanels() {
    // inventory panel
    const inv = document.createElement('div')
    inv.className = 'side-panel'
    inv.id = 'panel-inv'
    inv.innerHTML = `<h3>Inventory</h3><div id="inv-equip"></div><div class="inv-grid" id="inv-grid"></div><div id="inv-actions"></div>`
    this.root.appendChild(inv)
    this.invEl = inv

    const craft = document.createElement('div')
    craft.className = 'side-panel'
    craft.id = 'panel-craft'
    craft.innerHTML = `<h3>Crafting</h3><div id="craft-list"></div>`
    this.root.appendChild(craft)
    this.craftEl = craft

    const build = document.createElement('div')
    build.className = 'side-panel'
    build.id = 'panel-build'
    build.innerHTML = `<h3>Build Mode</h3>
      <button class="btn" data-b="campfire">Campfire</button>
      <button class="btn" data-b="workbench">Workbench</button>
      <button class="btn" data-b="wall">Wood Wall</button>
      <button class="btn" data-b="floor">Wood Floor</button>
      <p style="font-size:12px;color:#888;margin-top:8px">Click button then press Place (Enter) near player. Toggle build mode with B.</p>`
    this.root.appendChild(build)
    this.buildEl = build
    build.querySelectorAll('button[data-b]').forEach(b => {
      b.addEventListener('click', () => {
        const type = (b as HTMLElement).dataset.b!
        this.game.placeBuild(type)
      })
    })
  }

  toggle(panel: 'inv' | 'craft' | 'build') {
    if (panel === 'inv') { this.invOpen = !this.invOpen; this.invEl.classList.toggle('open', this.invOpen) }
    if (panel === 'craft') { this.craftOpen = !this.craftOpen; this.craftEl.classList.toggle('open', this.craftOpen) }
    if (panel === 'build') { this.buildOpen = !this.buildOpen; this.buildEl.classList.toggle('open', this.buildOpen); this.game.buildMode = this.buildOpen }
    this.update()
  }

  contextAction() {
    const g = this.game
    const p = g.player
    // nearest prop
    const prop = g.findNearestProp(p.position, 2.5)
    if (prop) { g.doGather(prop); return }
    const gi = g.findNearestGroundItem(p.position, 2.5)
    if (gi) { g.pickupItem(gi); return }
    const en = g.findNearestEnemy(p.position, 2.5)
    if (en) { g.doAttack(en); return }
    // default attack
    g.doAttack()
  }

  update() {
    const g = this.game
    if (!g.player) return
    const p = g.player
    const hpPct = (p.stats.hp / p.stats.maxHp) * 100
    const stPct = (p.stats.stamina / p.stats.maxStamina) * 100
    const maPct = (p.stats.mana / p.stats.maxMana) * 100

    if (this.mode === 'mobile') {
      const hp = this.root.querySelector('#m-hp') as HTMLElement
      const st = this.root.querySelector('#m-stam') as HTMLElement
      const ma = this.root.querySelector('#m-mana') as HTMLElement
      if (hp) hp.style.width = hpPct + '%'
      if (st) st.style.width = stPct + '%'
      if (ma) ma.style.width = maPct + '%'
      const food = this.root.querySelector('#m-food') as HTMLElement
      if (food) {
        food.innerHTML = p.stats.food.map((f, i) => `<div class="food-slot">${f ? f.name.slice(0,2) : (i+1)}</div>`).join('')
      }
    } else {
      const hp = this.root.querySelector('#d-hp') as HTMLElement
      const st = this.root.querySelector('#d-stam') as HTMLElement
      const ma = this.root.querySelector('#d-mana') as HTMLElement
      if (hp) hp.style.height = hpPct + '%'
      if (st) st.style.width = stPct + '%'
      if (ma) ma.style.height = maPct + '%'
      const food = this.root.querySelector('#d-food') as HTMLElement
      if (food) {
        food.innerHTML = p.stats.food.map((f, i) => `<div class="food-slot">${f ? f.name.slice(0,2) : (i+1)}</div>`).join('')
      }
    }

    // context action label on mobile
    if (this.mode === 'mobile') {
      const btn = this.root.querySelector('#m-action') as HTMLElement
      if (btn) {
        const prop = g.findNearestProp(p.position, 2.5)
        const gi = g.findNearestGroundItem(p.position, 2.5)
        const en = g.findNearestEnemy(p.position, 2.5)
        if (prop) btn.textContent = 'Chop'
        else if (gi) btn.textContent = 'Loot'
        else if (en) btn.textContent = 'Attack'
        else btn.textContent = 'Attack'
      }
    }

    // panels
    if (this.invOpen) this.renderInventory()
    if (this.craftOpen) this.renderCrafting()
  }

  renderInventory() {
    const grid = this.root.querySelector('#inv-grid') as HTMLElement
    const equip = this.root.querySelector('#inv-equip') as HTMLElement
    if (!grid) return
    const g = this.game
    equip.innerHTML = `
      <div style="font-size:12px;margin-bottom:6px;">Equipped: ${g.inventory.equipment.weapon?.name || 'none'} | ${g.inventory.equipment.armor?.name || 'none'} | ${g.inventory.equipment.tool?.name || 'none'}</div>
    `
    grid.innerHTML = g.inventory.items.map(it => {
      const cls = it.rarity === 'rare' ? 'rare' : it.rarity === 'magic' ? 'magic' : ''
      return `<div class="inv-cell ${cls}" data-id="${it.id}" title="${it.name}">${it.name.slice(0,6)}</div>`
    }).join('')
    grid.querySelectorAll('.inv-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        const id = (cell as HTMLElement).dataset.id!
        const item = g.inventory.items.find(i => i.id === id)
        if (!item) return
        if (item.type === 'consumable') {
          // eat
          g.inventory.remove(id)
          const now = performance.now()/1000
          const buff = { name: item.name, maxHp: item.name.includes('Meat')?40:item.name.includes('Honey')?20:10, maxStamina: item.name.includes('Honey')?30:20, regen: item.name.includes('Meat')?3:2, expires: now+300 }
          g.player.eat(buff)
          g.onUIUpdate?.()
        } else if (item.type === 'weapon' || item.type === 'armor' || item.type === 'tool') {
          g.inventory.equip(item)
          g.onUIUpdate?.()
        }
      })
    })
  }

  renderCrafting() {
    const list = this.root.querySelector('#craft-list') as HTMLElement
    if (!list) return
    const g = this.game
    list.innerHTML = RECIPES.map(r => {
      const ok = canCraft(r, g.inventory, g.hasWorkbench, g.hasCampfire)
      const costStr = Object.entries(r.cost).map(([k,v]) => `${v} ${k}`).join(', ')
      return `<div class="card"><div style="font-weight:bold;">${r.name}</div><div style="font-size:12px;color:#aaa;">${costStr}</div><button class="btn" data-recipe="${r.id}" ${ok?'':'disabled'}>Craft</button></div>`
    }).join('')
    list.querySelectorAll('button[data-recipe]').forEach(b => {
      b.addEventListener('click', () => {
        const id = (b as HTMLElement).dataset.recipe!
        const r = RECIPES.find(x => x.id === id)!
        if (craft(r, g.inventory, g.hasWorkbench, g.hasCampfire)) {
          // if build recipe, place immediately
          if (r.result.build) g.placeBuild(r.result.build)
          g.onUIUpdate?.()
        }
      })
    })
  }
}
