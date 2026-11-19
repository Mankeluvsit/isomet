import { showTitleScreen } from './ui/TitleScreen'
import { UIManager } from './ui/UIManager'
import { Game } from './Game'

const root = document.getElementById('hud-root') as HTMLElement
const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement

const game = new Game()

async function boot() {
  await game.init(canvas)
  // title screen
  showTitleScreen(root, (arch) => {
    const loaded = game.load()
    if (!loaded) game.startWithArchetype(arch)
    // build UI
    const ui = new UIManager(game, root)
    // manual toggle settings: add a small toggle button
    const toggle = document.createElement('button')
    toggle.textContent = 'Toggle UI Mode'
    toggle.className = 'btn'
    toggle.style.position = 'fixed'
    toggle.style.top = '8px'
    toggle.style.left = '8px'
    toggle.style.zIndex = '25'
    toggle.addEventListener('click', () => {
      ui.setMode(ui.mode === 'mobile' ? 'desktop' : 'mobile')
    })
    root.appendChild(toggle)
    // autosave
    setInterval(() => game.save(), 15000)
  })
}

boot().catch(err => {
  console.error(err)
  root.innerHTML = `<pre style="color:red;padding:20px;">${err?.stack || err}</pre>`
})
