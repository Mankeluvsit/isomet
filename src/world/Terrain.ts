import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Scene } from '@babylonjs/core/scene'

export interface TerrainResult { mesh: Mesh; heightAt: (x: number, z: number) => number }

export function createTerrain(scene: Scene, size = 120, segs = 120): TerrainResult {
  const heights: number[][] = []
  // deterministic pseudo-noise
  function noise(x: number, z: number): number {
    const s = Math.sin(x * 0.07 + z * 0.11) * 0.5 + Math.sin(x * 0.13 - z * 0.09) * 0.3 + Math.sin((x + z) * 0.05) * 0.4
    return s
  }

  const half = size / 2
  const step = size / segs
  for (let i = 0; i <= segs; i++) {
    heights[i] = []
    for (let j = 0; j <= segs; j++) {
      const x = -half + i * step
      const z = -half + j * step
      let h = noise(x, z) * 2.2
      // flatten center path-ish
      const dist = Math.hypot(x, z)
      if (dist < 8) h *= 0.4
      h = Math.max(-0.5, h)
      heights[i][j] = h
    }
  }

  const positions: number[] = []
  const indices: number[] = []
  const colors: number[] = []
  const normals: number[] = []

  for (let i = 0; i <= segs; i++) {
    for (let j = 0; j <= segs; j++) {
      const x = -half + i * step
      const z = -half + j * step
      const y = heights[i][j]
      positions.push(x, y, z)
      // vertex color
      let c: Color3
      if (y < 0.3) c = new Color3(0.72, 0.55, 0.22) // golden grass
      else if (y < 1.2) c = new Color3(0.42, 0.28, 0.15) // brown dirt
      else c = new Color3(0.35, 0.3, 0.25) // dark stone
      const d = Math.hypot(x, z)
      if (d < 6) {
        c = new Color3(0.5, 0.38, 0.2) // path
      }
      colors.push(c.r, c.g, c.b, 1)
    }
  }
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < segs; j++) {
      const a = i * (segs + 1) + j
      const b = a + 1
      const c = (i + 1) * (segs + 1) + j
      const d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }

  const vd = new VertexData()
  vd.positions = positions
  vd.indices = indices
  vd.colors = colors
  VertexData.ComputeNormals(positions, indices, normals)
  vd.normals = normals

  const mesh = new Mesh('terrain', scene)
  vd.applyToMesh(mesh)
  mesh.convertToFlatShadedMesh()

  const mat = new StandardMaterial('terrainMat', scene)
  mat.diffuseColor = Color3.White()
  mat.specularColor = new Color3(0.05, 0.05, 0.05)
  mesh.material = mat
  mesh.receiveShadows = true
  mesh.checkCollisions = false

  const heightAt = (x: number, z: number) => {
    // bilinear-ish nearest
    const ix = Math.floor((x + half) / step)
    const iz = Math.floor((z + half) / step)
    if (ix < 0 || iz < 0 || ix >= segs || iz >= segs) return 0
    return heights[ix][iz]
  }

  return { mesh, heightAt }
}
