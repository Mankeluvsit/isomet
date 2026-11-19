import { Scene } from '@babylonjs/core/scene'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { PointLight } from '@babylonjs/core/Lights/pointLight'
import { Item, rarityColor } from '../systems/Loot'

export class GroundItem {
  mesh: Mesh
  item: Item
  position: Vector3
  light: PointLight
  picked = false

  constructor(scene: Scene, item: Item, pos: Vector3) {
    this.item = item
    this.position = pos.clone()
    const m = MeshBuilder.CreateBox('loot', { size: 0.5 }, scene)
    m.position = pos.clone()
    m.position.y += 0.3
    const mat = new StandardMaterial('lootmat', scene)
    mat.diffuseColor = Color3.FromHexString(rarityColor(item.rarity))
    mat.emissiveColor = Color3.FromHexString(rarityColor(item.rarity)).scale(0.4)
    m.material = mat
    this.mesh = m

    const beam = MeshBuilder.CreateCylinder('beam', { height: 4, diameter: 0.15 }, scene)
    beam.position = pos.clone()
    beam.position.y += 2
    const bmat = new StandardMaterial('beammat', scene)
    bmat.diffuseColor = Color3.FromHexString(rarityColor(item.rarity))
    bmat.emissiveColor = Color3.FromHexString(rarityColor(item.rarity))
    bmat.alpha = 0.5
    beam.material = bmat
    beam.parent = m

    const pl = new PointLight('lootlight', pos.clone(), scene)
    pl.position.y += 1
    pl.diffuse = Color3.FromHexString(rarityColor(item.rarity))
    pl.intensity = 0.8
    pl.range = 4
    this.light = pl
  }

  dispose() {
    this.mesh.dispose()
    this.light.dispose()
  }
}
