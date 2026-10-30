import {
  CanvasTexture,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three'

const BILLS = 44
const CAMERA_DISTANCE = 6

const vertexShader = `
  attribute vec4 aBill; // x position, phase, fall speed, depth
  uniform float uTime;
  uniform vec2 uArea;
  varying vec2 vUv;
  varying float vLight;

  mat3 rotateX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
  mat3 rotateY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
  mat3 rotateZ(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0); }

  void main() {
    vUv = uv;
    float phase = aBill.y * 6.2832;
    float wave = position.x * 5.0 + uTime * 3.2 + phase;

    // Paper curls along its length, so each bill ripples as it falls.
    vec3 local = position + vec3(0.0, 0.0, sin(wave) * 0.06);
    vec3 normal = normalize(vec3(-cos(wave) * 0.3, 0.0, 1.0));

    float spin = uTime * (0.9 + aBill.z * 18.0) + phase;
    mat3 turn = rotateZ(sin(uTime * 0.8 + phase) * 0.7) * rotateY(sin(uTime * 1.1 + phase * 2.0) * 0.8) * rotateX(spin);

    float fall = fract(aBill.y + uTime * aBill.z);
    vec3 center = vec3(
      aBill.x * uArea.x + sin(uTime * 0.9 + phase) * 0.28,
      mix(uArea.y, -uArea.y, fall),
      aBill.w
    );

    vLight = abs((turn * normal).z) * 0.72 + abs((turn * normal).y) * 0.28;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(turn * local + center, 1.0);
  }
`

const fragmentShader = `
  uniform sampler2D uBill;
  varying vec2 vUv;
  varying float vLight;

  void main() {
    // Bills flip end over end, so the back needs its own vertical flip for the symbol to stay upright.
    vec2 uv = gl_FrontFacing ? vUv : vec2(vUv.x, 1.0 - vUv.y);
    vec3 paper = texture2D(uBill, uv).rgb;
    vec3 color = paper * (0.5 + 0.62 * vLight);
    if (!gl_FrontFacing) color *= vec3(0.78, 0.86, 0.8);
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`

function createBillTexture(symbol: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 128
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D is not available')

  context.fillStyle = '#7fbf8e'
  context.fillRect(0, 0, 256, 128)
  context.strokeStyle = '#1d6b45'
  context.lineWidth = 6
  context.strokeRect(10, 10, 236, 108)
  context.lineWidth = 2
  context.strokeRect(19, 19, 218, 90)

  context.fillStyle = '#d8efdc'
  context.beginPath()
  context.ellipse(128, 64, 48, 38, 0, 0, Math.PI * 2)
  context.fill()
  context.strokeStyle = '#1d6b45'
  context.stroke()

  context.fillStyle = '#14573a'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = 'bold 60px Arial, sans-serif'
  context.fillText(symbol, 128, 67)
  context.font = 'bold 22px Arial, sans-serif'
  for (const [x, y] of [[42, 40], [214, 40], [42, 90], [214, 90]]) context.fillText(symbol, x, y)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

export function createMoneyScene(canvas: HTMLCanvasElement, symbol: string) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, stencil: false, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  const plane = new PlaneGeometry(0.92, 0.46, 12, 1)
  const geometry = new InstancedBufferGeometry()
  geometry.index = plane.index
  geometry.setAttribute('position', plane.getAttribute('position'))
  geometry.setAttribute('uv', plane.getAttribute('uv'))
  const bills = new Float32Array(BILLS * 4)
  for (let i = 0; i < BILLS; i++) {
    bills.set([Math.random() * 2 - 1, Math.random(), 0.07 + Math.random() * 0.09, Math.random() * 3 - 2], i * 4)
  }
  geometry.setAttribute('aBill', new InstancedBufferAttribute(bills, 4))
  geometry.instanceCount = BILLS

  const texture = createBillTexture(symbol)
  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    side: DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uArea: { value: [1, 1] },
      uBill: { value: texture },
    },
  })
  const mesh = new Mesh(geometry, material)
  mesh.frustumCulled = false
  const scene = new Scene()
  scene.add(mesh)
  const camera = new PerspectiveCamera(30, 1, 0.1, 20)
  camera.position.z = CAMERA_DISTANCE

  return {
    resize(width: number, height: number) {
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      const halfHeight = Math.tan((camera.fov * Math.PI) / 360) * CAMERA_DISTANCE
      material.uniforms.uArea.value = [halfHeight * camera.aspect, halfHeight + 0.9]
    },
    render(time: number) {
      material.uniforms.uTime.value = time
      renderer.render(scene, camera)
    },
    dispose() {
      plane.dispose()
      geometry.dispose()
      material.dispose()
      texture.dispose()
      renderer.dispose()
    },
  }
}
