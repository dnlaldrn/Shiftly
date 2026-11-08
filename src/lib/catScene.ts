import {
  BackSide,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  ConeGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Material,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  Vector4,
  WebGLRenderer,
} from 'three'

// Set talkFor to a number of seconds and the cat moves its mouth for that long, starting on its next frame.
export type CatMood = { talkFor: number }

const FUR = '#f2a154'
const CREAM = '#fff1de'
const OUTLINE = '#3a2417'
const LIGHT = 'normalize(vec3(-0.4, 0.7, 0.6))'

const toonVertex = `
  varying vec3 vNormal;
  varying vec3 vObject;
  varying vec3 vView;

  void main() {
    vObject = position;
    vNormal = normalize(normalMatrix * normal);
    vec4 view = modelViewMatrix * vec4(position, 1.0);
    vView = view.xyz;
    gl_Position = projectionMatrix * view;
  }
`

const toonFragment = `
  uniform vec3 uColor;
  uniform vec3 uPatchColor;
  uniform vec4 uPatch; // object-space centre and radius of a lighter patch; a radius of 0 turns it off
  uniform float uStripes; // 0 none, 1 forehead, 2 back
  varying vec3 vNormal;
  varying vec3 vObject;
  varying vec3 vView;

  void main() {
    vec3 n = normalize(vNormal);
    vec3 base = uColor;
    float stripe = 0.0;
    if (uStripes == 1.0) {
      float width = mix(0.95, 0.55, smoothstep(0.25, 0.55, vObject.y));
      stripe = step(width, cos(vObject.x * 26.0)) * step(0.25, vObject.y) * step(0.0, vObject.z);
    }
    if (uStripes == 2.0) stripe = step(0.55, cos(vObject.y * 13.0 + vObject.x * 2.0)) * smoothstep(0.2, -0.2, vObject.z);
    base *= 1.0 - 0.22 * stripe;
    if (uPatch.w > 0.0) base = mix(base, uPatchColor, smoothstep(uPatch.w, uPatch.w * 0.8, distance(vObject, uPatch.xyz)));

    // Two flat tones with a soft step between them read as a cartoon; the rim keeps the edges lit.
    float tone = mix(0.68, 1.0, smoothstep(-0.05, 0.1, dot(n, ${LIGHT})));
    float rim = pow(1.0 - max(dot(n, normalize(-vView)), 0.0), 3.0) * 0.18;
    gl_FragColor = vec4(base * tone + rim, 1.0);
    #include <colorspace_fragment>
  }
`

// Back faces pushed out along the normal in view space, so every part gets an even ink line.
const outlineVertex = `
  void main() {
    vec4 view = modelViewMatrix * vec4(position, 1.0);
    view.xyz += normalize(normalMatrix * normal) * 0.05;
    gl_Position = projectionMatrix * view;
  }
`

const outlineFragment = `
  uniform vec3 uColor;

  void main() {
    gl_FragColor = vec4(uColor, 1.0);
    #include <colorspace_fragment>
  }
`

function toon(color: string, options: { patch?: [number, number, number, number]; stripes?: number } = {}) {
  return new ShaderMaterial({
    vertexShader: toonVertex,
    fragmentShader: toonFragment,
    uniforms: {
      uColor: { value: new Color(color) },
      uPatchColor: { value: new Color(CREAM) },
      uPatch: { value: new Vector4(...(options.patch ?? [0, 0, 0, 0])) },
      uStripes: { value: options.stripes ?? 0 },
    },
  })
}

// A tail curling up the cat's right side, thinning toward the tip.
function tailGeometry() {
  const curve = new CatmullRomCurve3([
    new Vector3(0, 0, 0),
    new Vector3(0.35, 0.05, 0.15),
    new Vector3(0.6, 0.25, 0.35),
    new Vector3(0.62, 0.6, 0.45),
    new Vector3(0.45, 0.85, 0.5),
  ])
  const segments = 40
  const sides = 12
  const tube = new TubeGeometry(curve, segments, 0.1, sides)
  const position = tube.getAttribute('position')
  const point = new Vector3()
  const vertex = new Vector3()
  for (let i = 0; i < position.count; i++) {
    const along = Math.floor(i / (sides + 1)) / segments
    curve.getPointAt(along, point)
    vertex.fromBufferAttribute(position, i).sub(point).multiplyScalar(1 - 0.35 * along).add(point)
    position.setXYZ(i, vertex.x, vertex.y, vertex.z)
  }
  return { tube, tip: curve.getPointAt(1) }
}

export function createCatScene(canvas: HTMLCanvasElement, mood: CatMood) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, stencil: false, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  const outlineMaterial = new ShaderMaterial({
    vertexShader: outlineVertex,
    fragmentShader: outlineFragment,
    side: BackSide,
    uniforms: { uColor: { value: new Color(OUTLINE) } },
  })
  const fur = toon(FUR)
  const cream = toon(CREAM)

  const part = (geometry: BufferGeometry, material: Material, x: number, y: number, z: number, outline = true) => {
    const mesh = new Mesh(geometry, material)
    mesh.position.set(x, y, z)
    if (outline) mesh.add(new Mesh(geometry, outlineMaterial))
    return mesh
  }

  const cat = new Group()

  const body = part(new SphereGeometry(0.8, 32, 24), toon(FUR, { patch: [0, 0.05, 0.78, 0.5], stripes: 2 }), 0, -0.35, 0)
  body.scale.set(1, 1.05, 0.9)
  const haunch = new SphereGeometry(0.38, 24, 16)
  const paw = new SphereGeometry(0.17, 20, 12)
  cat.add(body)
  for (const side of [-1, 1]) {
    const hip = part(haunch, fur, side * 0.48, -0.95, 0.12)
    hip.scale.set(0.85, 0.75, 1.15)
    const foot = part(paw, cream, side * 0.24, -1.13, 0.62)
    foot.scale.set(1, 0.65, 1.25)
    cat.add(hip, foot)
  }

  const { tube, tip } = tailGeometry()
  const tail = new Group()
  tail.position.set(0.45, -1.05, -0.35)
  tail.add(part(tube, fur, 0, 0, 0), part(new SphereGeometry(0.066, 16, 12), fur, tip.x, tip.y, tip.z))

  const collarRing = new TorusGeometry(1, 0.09, 12, 48)
  collarRing.rotateX(Math.PI / 2)
  const collar = part(collarRing, toon('#0f7a4f'), 0, 0.12, 0)
  collar.scale.set(0.67, 1, 0.61)
  const bell = part(new SphereGeometry(0.09, 16, 12), toon('#f5b83d'), 0, 0.03, 0.66)

  // The head turns from the neck, so its parts sit in a group pivoting there.
  const head = new Group()
  head.position.set(0, 0.2, 0.02)
  const face = new Group()
  face.position.set(0, 0.42, 0.03)
  head.add(face)
  const skull = part(new SphereGeometry(0.62, 32, 24), toon(FUR, { stripes: 1 }), 0, 0, 0)
  skull.scale.set(1.12, 0.95, 0.95)
  face.add(skull)

  const ears = [-1, 1].map((side) => {
    const ear = part(new ConeGeometry(0.22, 0.42, 24), fur, side * 0.38, 0.5, -0.02)
    ear.rotation.set(-0.15, 0, -side * 0.38)
    const inner = part(new ConeGeometry(0.13, 0.27, 24), toon('#f4a3ad'), 0, -0.04, 0.09, false)
    inner.scale.z = 0.45
    ear.add(inner)
    face.add(ear)
    return ear
  })

  const eyeGeometry = new SphereGeometry(0.11, 24, 16)
  const shineGeometry = new SphereGeometry(0.035, 12, 8)
  const eyeMaterial = new MeshBasicMaterial({ color: '#231a14' })
  const shineMaterial = new MeshBasicMaterial({ color: '#ffffff' })
  const eyes = [-1, 1].map((side) => {
    const eye = part(eyeGeometry, eyeMaterial, side * 0.22, 0.04, 0.53, false)
    eye.scale.set(1, 1.25, 0.6)
    eye.add(part(shineGeometry, shineMaterial, 0.03, 0.04, 0.12, false))
    face.add(eye)
    return eye
  })

  const muzzle = new SphereGeometry(0.15, 20, 14)
  for (const side of [-1, 1]) {
    const cheek = part(muzzle, cream, side * 0.1, -0.17, 0.5, false)
    cheek.scale.set(1, 0.8, 0.75)
    face.add(cheek)
  }
  const nose = part(new SphereGeometry(0.055, 16, 12), toon('#e7798a'), 0, -0.07, 0.6, false)
  nose.scale.set(1.35, 0.85, 0.8)
  const mouth = part(new SphereGeometry(0.07, 16, 12), new MeshBasicMaterial({ color: '#7b2d33' }), 0, -0.28, 0.53, false)
  mouth.scale.set(1, 0.3, 0.5)

  const whiskerPoints: number[] = []
  for (const side of [-1, 1]) {
    for (const lift of [0.04, -0.02, -0.08]) whiskerPoints.push(side * 0.2, -0.16 + lift, 0.56, side * 0.62, -0.1 + lift * 1.8, 0.48)
  }
  const whiskerGeometry = new BufferGeometry()
  whiskerGeometry.setAttribute('position', new Float32BufferAttribute(whiskerPoints, 3))
  const whiskers = new LineSegments(whiskerGeometry, new LineBasicMaterial({ color: OUTLINE, transparent: true, opacity: 0.6 }))
  face.add(nose, mouth, whiskers)

  cat.add(tail, collar, bell, head)
  const scene = new Scene()
  scene.add(cat)

  const camera = new PerspectiveCamera(27, 1, 0.1, 40)
  camera.position.set(0, 0.35, 7)
  camera.lookAt(0, 0.05, 0)

  // A short triangle pulse that peaks once per period, for blinks and ear twitches.
  const pulse = (time: number, period: number, width: number) => Math.max(0, 1 - Math.abs((time % period) - width) / width)
  let talkUntil = 0

  return {
    resize(width: number, height: number) {
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    },
    render(time: number) {
      if (mood.talkFor) {
        talkUntil = time + mood.talkFor
        mood.talkFor = 0
      }
      const talking = time < talkUntil
      // Turned a little to its right, toward the page, since it sits in the bottom-right corner.
      cat.rotation.y = -0.38 + Math.sin(time * 0.45) * 0.06
      body.scale.y = 1.05 * (1 + Math.sin(time * 2.2) * 0.012)
      head.rotation.z = Math.sin(time * 0.7) * 0.06
      head.rotation.x = Math.sin(time * 0.9) * 0.03 + (talking ? Math.sin(time * 9) * 0.035 : 0)
      const blink = pulse(time, 3.7, 0.1)
      for (const eye of eyes) eye.scale.y = 1.25 * (1 - 0.9 * blink)
      ears[1].rotation.z = -0.38 - pulse(time, 5.3, 0.15) * 0.25
      tail.rotation.y = Math.sin(time * 1.6) * 0.2
      tail.rotation.z = Math.sin(time * 1.1) * 0.05
      mouth.scale.y = talking ? 0.3 + 0.7 * Math.abs(Math.sin(time * 11)) : 0.3
      renderer.render(scene, camera)
    },
    dispose() {
      const materials = new Set<Material>()
      scene.traverse((object) => {
        if (object instanceof Mesh || object instanceof LineSegments) {
          object.geometry.dispose()
          materials.add(object.material as Material)
        }
      })
      for (const material of materials) material.dispose()
      renderer.dispose()
    },
  }
}
