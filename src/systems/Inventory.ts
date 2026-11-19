import { Item } from './Loot'

export interface EquipSlots {
  weapon: Item | null
  armor: Item | null
  tool: Item | null
}

export class Inventory {
  items: Item[] = []
  equipment: EquipSlots = { weapon: null, armor: null, tool: null }
  capacity = 30

  add(item: Item): boolean {
    if (this.items.length >= this.capacity) return false
    this.items.push(item)
    return true
  }
  remove(id: string): Item | null {
    const i = this.items.findIndex(x => x.id === id)
    if (i < 0) return null
    return this.items.splice(i, 1)[0]
  }
  equip(item: Item): Item | null {
    const slot = item.type === 'weapon' ? 'weapon' : item.type === 'armor' ? 'armor' : item.type === 'tool' ? 'tool' : null
    if (!slot) return null
    const prev = this.equipment[slot]
    this.equipment[slot] = item
    // remove from bag if present
    const i = this.items.findIndex(x => x.id === item.id)
    if (i >= 0) this.items.splice(i, 1)
    if (prev) this.items.push(prev)
    return prev
  }
  unequip(slot: keyof EquipSlots) {
    const it = this.equipment[slot]
    if (it) { this.items.push(it); this.equipment[slot] = null }
  }
  countMaterial(name: string): number {
    return this.items.filter(i => i.name === name || i.type === 'material' && i.name === name).length
  }
  consumeMaterial(name: string, n: number): boolean {
    let removed = 0
    for (let i = this.items.length - 1; i >= 0 && removed < n; i--) {
      if (this.items[i].name === name) { this.items.splice(i, 1); removed++ }
    }
    return removed === n
  }
}
