import {
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  OrthographicCamera,
  PlaneGeometry,
  Points,
  Scene,
  ShaderMaterial,
  Shape,
  ShapeGeometry,
  TubeGeometry,
  Vector3,
  WebGLRenderer,
} from 'three'

const THEMES = {
  light: {
    snow: '#9db3c2', backDrift: '#e3ebee', rim: '#cddae0', drift: '#ffffff', wire: '#56635c',
    shade: '#0f4a2f', lit: '#2e9461', branchSnow: '#ffffff', bark: ['#4a3324', '#7a5638'], star: '#f0a92a',
    caneRed: '#d42c38', caneWhite: '#ffffff', bulbs: ['#e5383b', '#f2a900', '#16a35d', '#2f7cf6'], halo: 0.4, glow: 0.45,
  },
  dark: {
    snow: '#ffffff', backDrift: '#151c19', rim: '#46554f', drift: '#26302d', wire: '#4a5650',
    shade: '#0b301f', lit: '#277a4f', branchSnow: '#a9b8b4', bark: ['#2e2018', '#5a4030'], star: '#ffd257',
    caneRed: '#e0444e', caneWhite: '#e3e9e7', bulbs: ['#ff5a5a', '#ffc53d', '#4be08a', '#5aa2ff'], halo: 0.7, glow: 0.6,
  },
}

const MAX_FLAKES = 520
// Radius, height and bottom of each tier, as fractions of the tree's height.
const TIERS = [[0.42, 0.44, 0.14], [0.33, 0.38, 0.38], [0.23, 0.32, 0.6]] as const
const TIER_BULBS = [9, 7, 5]
const LIGHT = 'normalize(vec3(-0.45, 0.55, 0.7))'

const viewVertex = `
  varying vec3 vView;
  varying vec3 vNormal;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vNormal = normalMatrix * normal;
    vec4 view = modelViewMatrix * vec4(position, 1.0);
    vView = view.xyz;
    gl_Position = projectionMatrix * view;
  }
`

const facetFragment = `
  uniform vec3 uShade;
  uniform vec3 uLit;
  uniform vec3 uSnow;
  uniform float uFringe;
  varying vec3 vView;
  varying vec2 vUv;

  void main() {
    // Flat normals from screen derivatives give the low-poly facets without splitting vertices.
    vec3 n = normalize(cross(dFdx(vView), dFdy(vView)));
    float light = clamp(dot(n, ${LIGHT}), 0.0, 1.0);
    vec3 color = mix(uShade, uLit, light);
    float fringe = uFringe * (0.55 + 0.45 * abs(sin(vUv.x * 75.4)));
    if (vUv.y < fringe) color = uSnow * (0.8 + 0.2 * light);
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`

const caneFragment = `
  uniform vec3 uRed;
  uniform vec3 uWhite;
  varying vec3 vNormal;
  varying vec2 vUv;

  float band(float s, float a, float b, float w) {
    return smoothstep(a - w, a + w, s) - smoothstep(b - w, b + w, s);
  }

  void main() {
    // Adding the angle around the tube to the distance along it makes the stripes spiral.
    float v = vUv.x * 15.0 + vUv.y;
    float w = max(fwidth(v), 1e-4);
    float s = fract(v);
    float red = band(s, 0.1, 0.5, w) + band(s, 0.64, 0.72, w);
    vec3 n = normalize(vNormal);
    float light = clamp(dot(n, ${LIGHT}), 0.0, 1.0);
    float shine = pow(clamp(dot(reflect(-${LIGHT}, n), vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 24.0);
    gl_FragColor = vec4(mix(uWhite, uRed, red) * (0.6 + 0.45 * light) + shine * 0.5, 1.0);
    #include <colorspace_fragment>
  }
`

const glowFragment = `
  uniform vec3 uColor;
  uniform float uStrength;
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float pulse = 0.75 + 0.25 * sin(uTime * 2.1);
    gl_FragColor = vec4(uColor, pow(max(1.0 - d, 0.0), 2.2) * uStrength * pulse);
    #include <colorspace_fragment>
  }
`

const snowVertex = `
  uniform float uTime;
  uniform vec2 uSize;
  uniform float uPixelRatio;
  varying float vAlpha;

  void main() {
    // position holds x across the screen, start phase and depth, all 0..1; near flakes fall faster and sway wider.
    float depth = position.z;
    float speed = mix(16.0, 54.0, depth) * (0.75 + fract(position.y * 13.7) * 0.5);
    float span = uSize.y + 40.0;
    float fall = fract(position.y + uTime * speed / span);
    float sway = sin(uTime * (0.4 + depth * 0.6) + position.y * 6.2832) * mix(6.0, 22.0, depth);
    vec3 flake = vec3((position.x - 0.5) * (uSize.x + 40.0) + sway, span * 0.5 - fall * span, mix(-250.0, 250.0, depth));
    gl_PointSize = mix(2.0, 6.5, depth * depth) * uPixelRatio;
    vAlpha = mix(0.35, 0.9, depth);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(flake, 1.0);
  }
`

const snowFragment = `
  uniform vec3 uColor;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    gl_FragColor = vec4(uColor, smoothstep(1.0, 0.45, d) * vAlpha);
    #include <colorspace_fragment>
  }
`

const bulbVertex = `
  attribute vec3 aBulb; // colour index, phase, size in CSS pixels
  uniform float uTime;
  uniform float uPixelRatio;
  uniform vec3 uColors[4];
  varying vec3 vColor;
  varying float vGlow;

  void main() {
    vColor = uColors[int(aBulb.x + 0.5)];
    float wave = sin(uTime * (1.3 + fract(aBulb.y * 7.0) * 1.6) + aBulb.y * 6.2832);
    vGlow = mix(0.35, 1.0, smoothstep(-0.6, 0.8, wave));
    gl_PointSize = aBulb.z * uPixelRatio;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const bulbFragment = `
  uniform float uHalo;
  varying vec3 vColor;
  varying float vGlow;

  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float core = smoothstep(0.32, 0.24, d);
    float alpha = max(core, exp(-d * d * 7.0) * uHalo * vGlow);
    if (alpha < 0.01) discard;
    vec3 color = mix(vColor * mix(0.55, 1.0, vGlow), vec3(1.0), smoothstep(0.2, 0.0, d) * vGlow * 0.6);
    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`

function bulbGeometry(positions: number[], bulbs: number[]) {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('aBulb', new Float32BufferAttribute(bulbs, 3))
  return geometry
}

function starGeometry() {
  const star = new Shape()
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 ? 0.032 : 0.075
    const angle = Math.PI / 2 + (i * Math.PI) / 5
    if (i) star.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius)
    else star.moveTo(0, radius)
  }
  return new ShapeGeometry(star)
}

// A shaft one unit tall with the hook curling right; the base sits at the origin so the cane rocks from the snow.
function caneGeometry() {
  const points = Array.from({ length: 9 }, (_, i) => new Vector3(0, i * 0.1, 0))
  for (let i = 1; i <= 16; i++) {
    const angle = Math.PI - (i / 16) * Math.PI
    points.push(new Vector3(0.14 + 0.14 * Math.cos(angle), 0.8 + 0.14 * Math.sin(angle), 0))
  }
  points.push(new Vector3(0.28, 0.72, 0))
  return new TubeGeometry(new CatmullRomCurve3(points), 80, 0.045, 12)
}

// A filled band along the bottom of the screen whose top edge follows `top`.
function hillsGeometry(left: number, bottom: number, top: (x: number) => number) {
  const shape = new Shape()
  shape.moveTo(left - 10, bottom - 10)
  for (let x = left - 10; x < -left + 22; x += 12) shape.lineTo(x, top(x))
  shape.lineTo(-left + 22, bottom - 10)
  return new ShapeGeometry(shape)
}

function setGeometry(object: Mesh | Points, geometry: BufferGeometry) {
  object.geometry.dispose()
  object.geometry = geometry
}

export function createChristmasScene(canvas: HTMLCanvasElement) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, stencil: false, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  const pixelRatio = renderer.getPixelRatio()

  const snowMaterial = new ShaderMaterial({
    vertexShader: snowVertex,
    fragmentShader: snowFragment,
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uSize: { value: [1, 1] }, uPixelRatio: { value: pixelRatio }, uColor: { value: new Color() } },
  })
  const bulbMaterial = new ShaderMaterial({
    vertexShader: bulbVertex,
    fragmentShader: bulbFragment,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uColors: { value: [new Color(), new Color(), new Color(), new Color()] },
      uHalo: { value: 0 },
    },
  })
  const glowMaterial = new ShaderMaterial({
    vertexShader: viewVertex,
    fragmentShader: glowFragment,
    transparent: true,
    depthWrite: false,
    uniforms: { uColor: { value: new Color() }, uStrength: { value: 0 }, uTime: { value: 0 } },
  })
  const facetMaterial = (fringe: number) =>
    new ShaderMaterial({
      vertexShader: viewVertex,
      fragmentShader: facetFragment,
      uniforms: { uShade: { value: new Color() }, uLit: { value: new Color() }, uSnow: { value: new Color() }, uFringe: { value: fringe } },
    })
  const needleMaterial = facetMaterial(0.16)
  const barkMaterial = facetMaterial(0)
  const caneMaterial = new ShaderMaterial({
    vertexShader: viewVertex,
    fragmentShader: caneFragment,
    uniforms: { uRed: { value: new Color() }, uWhite: { value: new Color() } },
  })
  const starMaterial = new MeshBasicMaterial()
  const wireMaterial = new MeshBasicMaterial()
  const backDriftMaterial = new MeshBasicMaterial()
  const rimMaterial = new MeshBasicMaterial()
  const driftMaterial = new MeshBasicMaterial()
  const materials = [
    snowMaterial, bulbMaterial, glowMaterial, needleMaterial, barkMaterial, caneMaterial,
    starMaterial, wireMaterial, backDriftMaterial, rimMaterial, driftMaterial,
  ]

  const scene = new Scene()

  const flakes = new Float32Array(MAX_FLAKES * 3)
  // Squaring the depth keeps most flakes small and far, with a few big ones close up.
  for (let i = 0; i < MAX_FLAKES; i++) flakes.set([Math.random(), Math.random(), Math.random() ** 2], i * 3)
  const snowGeometry = new BufferGeometry()
  snowGeometry.setAttribute('position', new Float32BufferAttribute(flakes, 3))
  const snow = new Points(snowGeometry, snowMaterial)
  snow.frustumCulled = false

  const star = starGeometry()
  const glow = new PlaneGeometry(0.42, 0.42)
  const trees = [0, 1, 2].map((seed) => {
    const tree = new Group()
    const spin = new Group()
    const positions: number[] = []
    const bulbs: number[] = []
    TIERS.forEach(([radius, height, bottom], tier) => {
      const cone = new ConeGeometry(radius, height, 8, 1, true)
      cone.translate(0, bottom + height / 2, 0)
      spin.add(new Mesh(cone, needleMaterial))
      // A ring of bulbs just outside the cone, a fifth of the way up each tier.
      for (let i = 0; i < TIER_BULBS[tier]; i++) {
        const angle = (i / TIER_BULBS[tier]) * Math.PI * 2 + tier + seed
        positions.push(Math.cos(angle) * (radius * 0.8 + 0.012), bottom + height * 0.2, Math.sin(angle) * (radius * 0.8 + 0.012))
        bulbs.push((i + tier + seed) % 4, Math.random(), 15)
      }
    })
    const trunk = new CylinderGeometry(0.05, 0.06, 0.2, 6, 1, true)
    trunk.translate(0, 0.1, 0)
    spin.add(new Mesh(trunk, barkMaterial), new Points(bulbGeometry(positions, bulbs), bulbMaterial))
    // The star and its glow stay outside the spinning group so they always face the viewer.
    const starMesh = new Mesh(star, starMaterial)
    starMesh.position.set(0, 0.95, 0.03)
    const glowMesh = new Mesh(glow, glowMaterial)
    glowMesh.position.set(0, 0.95, -0.05)
    tree.add(spin, starMesh, glowMesh)
    return { tree, spin }
  })

  const cane = caneGeometry()
  const canes = [new Mesh(cane, caneMaterial), new Mesh(cane, caneMaterial)]
  canes[1].rotation.y = Math.PI

  const backDrift = new Mesh(new BufferGeometry(), backDriftMaterial)
  const rim = new Mesh(new BufferGeometry(), rimMaterial)
  const drift = new Mesh(new BufferGeometry(), driftMaterial)
  const wire = new Mesh(new BufferGeometry(), wireMaterial)
  const stringBulbs = new Points(new BufferGeometry(), bulbMaterial)
  backDrift.position.z = -300
  rim.position.z = 199
  drift.position.z = 200
  wire.position.z = 260
  stringBulbs.position.z = 260

  scene.add(snow, backDrift, rim, drift, wire, stringBulbs, ...canes, ...trees.map(({ tree }) => tree))

  // Pixel units with the origin at the screen centre, so everything is placed in CSS pixels.
  const camera = new OrthographicCamera(-1, 1, 1, -1, 1, 2000)
  camera.position.z = 1000

  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const applyTheme = () => {
    const theme = darkQuery.matches ? THEMES.dark : THEMES.light
    snowMaterial.uniforms.uColor.value.set(theme.snow)
    theme.bulbs.forEach((color, i) => bulbMaterial.uniforms.uColors.value[i].set(color))
    bulbMaterial.uniforms.uHalo.value = theme.halo
    glowMaterial.uniforms.uColor.value.set(theme.star)
    glowMaterial.uniforms.uStrength.value = theme.glow
    needleMaterial.uniforms.uShade.value.set(theme.shade)
    needleMaterial.uniforms.uLit.value.set(theme.lit)
    needleMaterial.uniforms.uSnow.value.set(theme.branchSnow)
    barkMaterial.uniforms.uShade.value.set(theme.bark[0])
    barkMaterial.uniforms.uLit.value.set(theme.bark[1])
    caneMaterial.uniforms.uRed.value.set(theme.caneRed)
    caneMaterial.uniforms.uWhite.value.set(theme.caneWhite)
    starMaterial.color.set(theme.star)
    wireMaterial.color.set(theme.wire)
    backDriftMaterial.color.set(theme.backDrift)
    rimMaterial.color.set(theme.rim)
    driftMaterial.color.set(theme.drift)
  }
  applyTheme()
  const onTheme = () => {
    applyTheme()
    renderer.render(scene, camera)
  }
  darkQuery.addEventListener('change', onTheme)

  const layout = (width: number, height: number) => {
    const left = -width / 2
    const bottom = -height / 2
    const ground = (x: number, lift = 0, seed = 0) =>
      bottom + 30 + lift + 9 * Math.sin(x * 0.011 + seed) + 5 * Math.sin(x * 0.027 + seed * 2.3)
    setGeometry(backDrift, hillsGeometry(left, bottom, (x) => ground(x, 26, 2)))
    setGeometry(rim, hillsGeometry(left, bottom, (x) => ground(x, 3)))
    setGeometry(drift, hillsGeometry(left, bottom, (x) => ground(x)))

    // Bases sink below the drift line, so the trunks and canes look planted in the snow.
    const size = Math.min(Math.max(Math.min(width * 0.24, height * 0.27), 80), 240)
    const place = (object: Object3D, x: number, scale: number, z: number, sink: number) => {
      object.position.set(x, ground(x) - sink, z)
      object.scale.setScalar(size * scale)
    }
    // Phones only have room at the very edges, so the inner tree and cane would sit behind the text.
    trees[1].tree.visible = canes[1].visible = width >= 600
    place(trees[0].tree, left + size * 0.45, 1, 0, 10)
    place(trees[1].tree, left + size * 0.98, 0.66, -120, 10)
    place(trees[2].tree, -left - size * 0.4, 0.84, 0, 10)
    place(canes[0], -left - size * 0.95, 0.5, 120, 14)
    place(canes[1], left + size * 1.38, 0.36, 120, 14)

    // The string hangs in swags from the top edge, with a bulb every 34px just under the wire.
    const swags = Math.max(2, Math.round(width / 380))
    const span = width / swags
    // Shallow swags keep the bulbs above the header text.
    const sag = Math.min(22, span * 0.1)
    const wireY = (x: number) => {
      const f = (((x - left) / span) % 1 + 1) % 1
      return height / 2 + 3 - sag * 4 * f * (1 - f)
    }
    const points: Vector3[] = []
    for (let x = left - 8; x <= -left + 8; x += 8) points.push(new Vector3(x, wireY(x), 0))
    setGeometry(wire, new TubeGeometry(new CatmullRomCurve3(points), points.length * 2, 0.9, 4))
    const positions: number[] = []
    const bulbs: number[] = []
    for (let x = left + 17, i = 0; x < -left; x += 34, i++) {
      positions.push(x, wireY(x) - 7, 0)
      bulbs.push(i % 4, Math.random(), 22)
    }
    setGeometry(stringBulbs, bulbGeometry(positions, bulbs))

    snowGeometry.setDrawRange(0, Math.min(MAX_FLAKES, Math.max(90, Math.round((width * height) / 4200))))
    snowMaterial.uniforms.uSize.value = [width, height]
  }

  return {
    resize(width: number, height: number) {
      renderer.setSize(width, height, false)
      camera.left = -width / 2
      camera.right = width / 2
      camera.top = height / 2
      camera.bottom = -height / 2
      camera.updateProjectionMatrix()
      layout(width, height)
    },
    render(time: number) {
      snowMaterial.uniforms.uTime.value = time
      bulbMaterial.uniforms.uTime.value = time
      glowMaterial.uniforms.uTime.value = time
      trees.forEach(({ spin }, i) => (spin.rotation.y = time * 0.22 + i * 2))
      canes[0].rotation.z = 0.14 + Math.sin(time * 0.9) * 0.035
      canes[1].rotation.z = 0.12 + Math.sin(time * 0.9 + 2) * 0.035
      renderer.render(scene, camera)
    },
    dispose() {
      darkQuery.removeEventListener('change', onTheme)
      scene.traverse((object) => {
        if (object instanceof Mesh || object instanceof Points) object.geometry.dispose()
      })
      for (const material of materials) material.dispose()
      renderer.dispose()
    },
  }
}
