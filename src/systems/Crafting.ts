import { Inventory } from './Inventory'
import { generateItem } from './Loot'

export interface Recipe {
  id: string
  name: string
  category: 'survival' | 'weapon' | 'armor' | 'build'
  cost: Record<string, number>
  result: { item?: string; build?: string }
  requiresWorkbench?: boolean
  requiresCampfire?: boolean
}

export const RECIPES: Recipe[] = [
  { id: 'campfire', name: 'Campfire', category: 'build', cost: { Wood: 5, Stone: 4 }, result: { build: 'campfire' } },
  { id: 'workbench', name: 'Workbench', category: 'build', cost: { Wood: 10, Stone: 5 }, result: { build: 'workbench' } },
  { id: 'woodwall', name: 'Wooden Wall', category: 'build', cost: { Wood: 4 }, result: { build: 'wall' }, requiresWorkbench: true },
  { id: 'woodfloor', name: 'Wooden Floor', category: 'build', cost: { Wood: 2 }, result: { build: 'floor' }, requiresWorkbench: true },
  { id: 'ironaxe', name: 'Iron Axe', category: 'weapon', cost: { Wood: 3, Stone: 2, Flint: 1 }, result: { item: 'Iron Axe' }, requiresWorkbench: true },
  { id: 'chainmail', name: 'Chainmail', category: 'armor', cost: { Stone: 6, Wood: 2 }, result: { item: 'Chainmail' }, requiresWorkbench: true },
  { id: 'grilledmeat', name: 'Grilled Meat', category: 'survival', cost: { 'Raw Meat': 1 }, result: { item: 'Grilled Meat' }, requiresCampfire: true },
]

export function canCraft(recipe: Recipe, inv: Inventory, hasWorkbench: boolean, hasCampfire: boolean): boolean {
  if (recipe.requiresWorkbench && !hasWorkbench) return false
  if (recipe.requiresCampfire && !hasCampfire) return false
  for (const [mat, n] of Object.entries(recipe.cost)) {
    if (inv.countMaterial(mat) < n) return false
  }
  return true
}

export function craft(recipe: Recipe, inv: Inventory, hasWorkbench: boolean, hasCampfire: boolean): boolean {
  if (!canCraft(recipe, inv, hasWorkbench, hasCampfire)) return false
  for (const [mat, n] of Object.entries(recipe.cost)) inv.consumeMaterial(mat, n)
  if (recipe.result.item) {
    const item = generateItem(recipe.result.item, 'common')
    inv.add(item)
  }
  return true
}
