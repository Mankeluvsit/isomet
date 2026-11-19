import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent'
import { WebGPUEngine } from '@babylonjs/core/Engines/webgpuEngine'
import { Engine } from '@babylonjs/core/Engines/engine'
import { Scene } from '@babylonjs/core/scene'
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color'
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight'
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight'
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator'
import { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline'

import '@babylonjs/core/Physics'

export interface EngineContext {
  engine: Engine | WebGPUEngine
  scene: Scene
  camera: ArcRotateCamera
  shadowGenerator: ShadowGenerator
  pipeline: DefaultRenderingPipeline
  sun: DirectionalLight
}

export async function createEngine(canvas: HTMLCanvasElement): Promise<EngineContext> {
  let engine: Engine | WebGPUEngine
  let useWebGPU = false
  try {
    if (await WebGPUEngine.IsSupportedAsync) {
      const we = new WebGPUEngine(canvas, { antialias: true })
      await we.initAsync()
      engine = we
      useWebGPU = true
    } else {
      engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true })
    }
  } catch (e) {
    console.warn('WebGPU init failed, falling back to WebGL2', e)
    engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true })
  }

  const scene = new Scene(engine)
  scene.clearColor = new Color4(0.05, 0.07, 0.1, 1)
  scene.fogMode = Scene.FOGMODE_EXP2
  scene.fogDensity = 0.015
  scene.fogColor = new Color3(0.55, 0.48, 0.4)

  const camera = new ArcRotateCamera('isoCam', -Math.PI / 4, Math.PI / 4, 18, new Vector3(0, 0, 0), scene)
  camera.lowerRadiusLimit = 14
  camera.upperRadiusLimit = 26
  camera.lowerBetaLimit = 0.35
  camera.upperBetaLimit = 1.2
  camera.wheelDeltaPercentage = 0.01
  camera.panningSensibility = 0
  camera.attachControl(canvas, true)

  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene)
  hemi.intensity = 0.35
  hemi.diffuse = new Color3(0.7, 0.6, 0.45)

  const sun = new DirectionalLight('sun', new Vector3(-0.6, -1, -0.4), scene)
  sun.position = new Vector3(40, 60, 40)
  sun.intensity = 1.1
  sun.diffuse = new Color3(1.0, 0.85, 0.6)

  const shadowGenerator = new ShadowGenerator(1024, sun)
  shadowGenerator.useBlurExponentialShadowMap = true
  shadowGenerator.blurKernel = 16

  const pipeline = new DefaultRenderingPipeline('default', true, scene, [camera])
  pipeline.bloomEnabled = true
  pipeline.bloomThreshold = 0.7
  pipeline.bloomWeight = 0.4
  pipeline.bloomKernel = 64
  pipeline.imageProcessingEnabled = true
  pipeline.imageProcessing.toneMappingEnabled = true
  pipeline.imageProcessing.toneMappingType = 1 // ACES
  pipeline.imageProcessing.vignetteEnabled = true
  pipeline.imageProcessing.vignetteWeight = 0.4

  return { engine, scene, camera, shadowGenerator, pipeline, sun }
}
