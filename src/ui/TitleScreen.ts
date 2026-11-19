export function showTitleScreen(container: HTMLElement, onPick: (a: 'shieldmaiden'|'seidr'|'skald') => void) {
  container.innerHTML = ''
  const overlay = document.createElement('div')
  overlay.id = 'title-overlay'
  overlay.innerHTML = `
    <div class="title-card">
      <h1>ASHENHEIM</h1>
      <p style="color:#aaa;margin-bottom:16px">Valheim's frontier meets Diablo's corruption</p>
      <button class="archetype-btn" data-a="shieldmaiden">Shieldmaiden — Cleave / Shield Bash / Battle Cry</button>
      <button class="archetype-btn" data-a="seidr">Seiðr-Weaver — Frost Nova / Chain Lightning / Bifrost Blink</button>
      <button class="archetype-btn" data-a="skald">Skald-Hunter — Multishot / Poison Trap / Wolf Sprint</button>
      <p style="font-size:12px;color:#666;margin-top:12px">WASD/Arrows move · Click attack · Space dodge · 1-3 skills · E interact · B build</p>
    </div>
  `
  container.appendChild(overlay)
  overlay.querySelectorAll('.archetype-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const a = (btn as HTMLElement).dataset.a as any
      onPick(a)
      overlay.remove()
    })
  })
}
