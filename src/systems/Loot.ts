export type Rarity = 'common' | 'magic' | 'rare'

export interface ItemAffix { name: string; stat: string; value: number }

export interface Item {
  id: string
  name: string
  type: 'weapon' | 'armor' | 'consumable' | 'material' | 'tool'
  rarity: Rarity
  stats: Record<string, number>
  affixes: ItemAffix[]
  value: number
}

const BASE_ITEMS: { name: string; type: Item['type']; stats: Record<string, number> }[] = [
  { name: 'Rusty Sword', type: 'weapon', stats: { damage: 4 } },
  { name: 'Iron Axe', type: 'weapon', stats: { damage: 6, miningYield: 2 } },
  { name: 'Pickaxe', type: 'tool', stats: { miningYield: 4 } },
  { name: 'Leather Armor', type: 'armor', stats: { armor: 3 } },
  { name: 'Chainmail', type: 'armor', stats: { armor: 6 } },
  { name: 'Raspberries', type: 'consumable', stats: { heal: 15 } },
  { name: 'Grilled Meat', type: 'consumable', stats: { heal: 40 } },
  { name: 'Honey', type: 'consumable', stats: { heal: 25 } },
  { name: 'Wood', type: 'material', stats: {} },
  { name: 'Stone', type: 'material', stats: {} },
  { name: 'Flint', type: 'material', stats: {} },
  { name: 'Raw Meat', type: 'material', stats: {} },
]

const AFFIX_POOL: { name: string; stat: string; min: number; max: number; rarities: Rarity[] }[] = [
  { name: 'Sharp', stat: 'damage', min: 1, max: 4, rarities: ['magic','rare'] },
  { name: 'of Fire', stat: 'fireDamage', min: 2, max: 6, rarities: ['magic','rare'] },
  { name: 'of the Bear', stat: 'maxStamina', min: 5, max: 15, rarities: ['magic','rare'] },
  { name: 'of Haste', stat: 'moveSpeed', min: 0.05, max: 0.15, rarities: ['magic','rare'] },
  { name: 'of Precision', stat: 'crit', min: 0.05, max: 0.15, rarities: ['magic','rare'] },
  { name: 'of the Miner', stat: 'miningYield', min: 1, max: 3, rarities: ['magic','rare'] },
  { name: 'Reinforced', stat: 'armor', min: 2, max: 6, rarities: ['magic','rare'] },
  { name: 'Vampiric', stat: 'lifesteal', min: 0.03, max: 0.08, rarities: ['rare'] },
]

export function rollRarity(): Rarity {
  const r = Math.random()
  if (r < 0.6) return 'common'
  if (r < 0.9) return 'magic'
  return 'rare'
}

export function generateItem(baseName?: string, forcedRarity?: Rarity): Item {
  const base = baseName ? BASE_ITEMS.find(b => b.name === baseName)! : BASE_ITEMS[Math.floor(Math.random() * BASE_ITEMS.length)]
  const rarity = forcedRarity || rollRarity()
  const stats = { ...base.stats }
  const affixes: ItemAffix[] = []
  let count = 0
  if (rarity === 'magic') count = 1 + Math.floor(Math.random() * 2)
  if (rarity === 'rare') count = 3 + Math.floor(Math.random() * 2)
  const shuffled = [...AFFIX_POOL].sort(() => Math.random() - 0.5)
  for (let i = 0; i < count && i < shuffled.length; i++) {
    const a = shuffled[i]
    if (!a.rarities.includes(rarity)) continue
    const val = a.min + Math.random() * (a.max - a.min)
    const rounded = Math.round(val * 100) / 100
    affixes.push({ name: a.name, stat: a.stat, value: rounded })
    stats[a.stat] = (stats[a.stat] || 0) + rounded
  }
  const name = rarity === 'common' ? base.name : `${affixes[0]?.name || ''} ${base.name}`.trim()
  return {
    id: Math.random().toString(36).slice(2),
    name,
    type: base.type,
    rarity,
    stats,
    affixes,
    value: rarity === 'common' ? 5 : rarity === 'magic' ? 25 : 80
  }
}

export function rarityColor(r: Rarity): string {
  return r === 'common' ? '#ffffff' : r === 'magic' ? '#4f8fff' : '#ffcc33'
}
