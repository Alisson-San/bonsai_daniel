import type * as T from 'three';
import { palmateLeaf, plateLeafOutline, plateLeafVeins } from './acer.ts';
import type { Theme } from './theme.ts';

type Three = typeof T;
// Three.js loads from the CDN at runtime, in its own request, so the catalog bundle stays light.
// '+esm' builds share one module URL with the addons below, so loaders and the scene use a single Three.js instance.
export const THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.180.0/+esm';
let loading: Promise<Three> | null = null;
export function loadThree() {
  loading ??= (import(/* @vite-ignore */ THREE_CDN) as Promise<Three>).catch(error => { loading = null; throw error; });
  return loading;
}

export type BonsaiScene = { setTheme: (theme: Theme) => void; dispose: () => void };
export type PageRect = { x: number; y: number; width: number; height: number };
// entrance: false starts on the finished composition (it replaces a still of it on phones).
type Options = { theme: Theme; reduced: boolean; entrance?: boolean; onFirstFrame: () => void; onCanopy?: (rect: PageRect) => void };

// Optional real model: drop a .glb here and it replaces the procedural tree and pot on the same stage.
export const HERO_MODEL_URL = '/models/bonsai.glb';
const ADDONS = 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/';

const palettes = {
  dark: { fog: '#0A140E', density: .022, hemi: .34, key: 3.4, back: 2.2, environment: .34 },
  light: { fog: '#F7F5F0', density: .012, hemi: .42, key: 2.4, back: 1, environment: .32 },
};
// Logo palette: main Acer red, deeper reds and a few orange leaves.

function random(seed: number) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

// Tileable value noise (periodic lattice) so bark and stone textures wrap around cylinders without seams.
function noise2(seed: number) {
  const rand = random(seed), values = new Float32Array(4096);
  for (let i = 0; i < values.length; i++) values[i] = rand();
  const at = (x: number, y: number) => values[(Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) & 4095];
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const value = (x: number, y: number, px: number, py: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), u = smooth(x - xi), v = smooth(y - yi);
    const x0 = ((xi % px) + px) % px, y0 = ((yi % py) + py) % py, x1 = (x0 + 1) % px, y1 = (y0 + 1) % py;
    const a = at(x0, y0), b = at(x1, y0), c = at(x0, y1), d = at(x1, y1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  return (x: number, y: number, px: number, py: number, octaves = 4) => {
    let sum = 0, amplitude = .5, total = 0;
    for (let o = 0; o < octaves; o++) { sum += value(x, y, px, py) * amplitude; total += amplitude; x *= 2; y *= 2; px *= 2; py *= 2; amplitude *= .5; }
    return sum / total;
  };
}

// Paints a color map and derives a tangent-space normal map from the same height field.
function surfaceMaps(THREE: Three, size: number, strength: number, sample: (u: number, v: number) => { h: number; r: number; g: number; b: number }) {
  const heights = new Float32Array(size * size);
  const color = document.createElement('canvas'), normal = document.createElement('canvas');
  color.width = color.height = normal.width = normal.height = size;
  const colorContext = color.getContext('2d')!, normalContext = normal.getContext('2d')!;
  const colorData = colorContext.createImageData(size, size), normalData = normalContext.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const texel = sample(x / size, y / size), k = (y * size + x) * 4;
    heights[y * size + x] = texel.h;
    colorData.data[k] = texel.r; colorData.data[k + 1] = texel.g; colorData.data[k + 2] = texel.b; colorData.data[k + 3] = 255;
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const h = (dx: number, dy: number) => heights[((y + dy + size) % size) * size + (x + dx + size) % size];
    const nx = (h(-1, 0) - h(1, 0)) * strength, ny = (h(0, 1) - h(0, -1)) * strength, length = Math.hypot(nx, ny, 1), k = (y * size + x) * 4;
    normalData.data[k] = (nx / length * .5 + .5) * 255; normalData.data[k + 1] = (ny / length * .5 + .5) * 255; normalData.data[k + 2] = (1 / length * .5 + .5) * 255; normalData.data[k + 3] = 255;
  }
  colorContext.putImageData(colorData, 0, 0); normalContext.putImageData(normalData, 0, 0);
  const map = new THREE.CanvasTexture(color), normalMap = new THREE.CanvasTexture(normal);
  map.colorSpace = THREE.SRGBColorSpace;
  for (const texture of [map, normalMap]) { texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.anisotropy = 4; }
  return { map, normalMap };
}

function mergeGeometries(THREE: Three, parts: T.BufferGeometry[]) {
  const positions: number[] = [], normals: number[] = [], uvs: number[] = [], colors: number[] = [], indices: number[] = [];
  for (const part of parts) {
    const offset = positions.length / 3;
    for (const value of part.attributes.position.array) positions.push(value);
    for (const value of part.attributes.normal.array) normals.push(value);
    for (const value of part.attributes.uv.array) uvs.push(value);
    for (const value of part.attributes.color.array) colors.push(value);
    for (const index of part.index!.array) indices.push(index + offset);
    part.dispose();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  return geometry;
}

type Profile = { radius: (t: number) => number; twist?: number; ridges?: number; depth?: number; phase?: number };
// Twisted limb: spiral ridges in the geometry, lighter crests and dark fissures as vertex colors,
// and bark UVs that follow the spiral.
function limb(THREE: Three, curve: T.Curve<T.Vector3>, segments: number, radial: number, { radius, twist = 0, ridges = 6, depth = .06, phase = 0 }: Profile) {
  const frames = curve.computeFrenetFrames(segments, false), length = curve.getLength();
  let mean = 0; for (let i = 0; i <= 8; i++) mean += radius(i / 8) / 9;
  const vScale = length / (Math.PI * 2 * Math.max(mean, .01));
  const positions: number[] = [], normals: number[] = [], uvs: number[] = [], colors: number[] = [], indices: number[] = [];
  const p = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= segments; i++) {
    const t = i / segments, base = radius(t);
    curve.getPointAt(t, p);
    const n = frames.normals[i], b = frames.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const a = j / radial * Math.PI * 2, sin = Math.sin(a), cos = -Math.cos(a);
      v.set(cos * n.x + sin * b.x, cos * n.y + sin * b.y, cos * n.z + sin * b.z).normalize();
      const crest = Math.sin(a * ridges + t * twist + phase), knots = .35 * Math.sin(a * 2 + t * 11 + phase) * Math.sin(t * 23 + phase);
      const r = base * (1 + depth * (crest + knots));
      positions.push(p.x + v.x * r, p.y + v.y * r, p.z + v.z * r); normals.push(v.x, v.y, v.z);
      uvs.push(j / radial - t * twist / (Math.PI * 2 * ridges), t * vScale);
      const light = .62 + .38 * (crest * .5 + .5) ** 1.5;
      colors.push(light, light * .97, light * .93);
    }
  }
  for (let i = 0; i < segments; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b = (i + 1) * (radial + 1) + j;
    indices.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// drift: extra rotation of this flute along the limb (radians), so strands wander apart and together.
type Flute = { angle: number; width: number; amp: (t: number, p: T.Vector3) => number; drift?: number };
type Gnarl = {
  radius: (t: number, p: T.Vector3) => number;
  flutes?: Flute[];
  // Rotation of the flutes and of the bark streaks along the limb (radians).
  twist?: (t: number, p: T.Vector3) => number;
  lumps?: number; flatten?: number; up?: T.Vector3; seed?: number; tone?: number;
  // underside: how much darker the side facing away from the reference axis is (roots lying on the soil);
  // occlusion: extra darkening per ring (the trunk near the soil).
  underside?: number; occlusion?: (t: number, p: T.Vector3) => number;
};
// Bark tube for the trunk, roots and main branches. The cross-section is shaped by flutes (the buttresses that
// run up from each root and slowly spiral) plus noise lumps; grooves get darker vertex colours and the bark UVs
// follow the spiral. The angle reference is the x axis (or `up` for lying roots), so a flute at angle a faces
// (cos a, 0, sin a) on an upright trunk. `flatten` squashes the section along that reference (roots on the soil).
function barkTube(THREE: Three, curve: T.Curve<T.Vector3>, segments: number, radial: number, { radius, flutes = [], twist = () => 0, lumps = .05, flatten = 1, up, seed = 1, tone = 1, underside = 0, occlusion }: Gnarl) {
  const noise = noise2(seed), length = curve.getLength();
  const positions: number[] = [], uvs: number[] = [], colors: number[] = [], indices: number[] = [];
  const p = new THREE.Vector3(), tangent = new THREE.Vector3(), n = new THREE.Vector3(), b = new THREE.Vector3();
  const ref = (up ?? new THREE.Vector3(1, 0, 0)).clone().normalize(), fallback = new THREE.Vector3(0, 0, 1), ring = new Array<number>(radial + 1);
  let mean = 0; for (let i = 0; i <= 8; i++) { curve.getPointAt(i / 8, p); mean += radius(i / 8, p) / 9; }
  const vScale = length / (Math.PI * 2 * Math.max(mean, .01)), around = 6, along = Math.max(1, Math.round(vScale * 2));
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    curve.getPointAt(t, p); curve.getTangentAt(t, tangent);
    const axis = Math.abs(tangent.dot(ref)) > .97 ? fallback : ref;
    n.copy(axis).addScaledVector(tangent, -tangent.dot(axis)).normalize();
    b.crossVectors(n, tangent).normalize();
    const base = radius(t, p), turn = twist(t, p), tau = Math.PI * 2;
    // Flute amplitudes and centres are per ring; faint ones are skipped.
    const active = flutes.map(flute => ({ amp: flute.amp(t, p), center: flute.angle + turn + (flute.drift ?? 0) * t, spread: 2 * flute.width * flute.width })).filter(flute => flute.amp > .002);
    let ringMean = 0;
    for (let j = 0; j <= radial; j++) {
      const a = j / radial * tau;
      let swell = 0;
      for (const flute of active) { let d = (a - flute.center) % tau; if (d > Math.PI) d -= tau; else if (d < -Math.PI) d += tau; swell += flute.amp * Math.exp(-d * d / flute.spread); }
      const lump = (noise((j % radial) / radial * around, t * along, around, along, 3) - .5) * 2 * lumps;
      ring[j] = base * (1 + swell + lump); ringMean += ring[j] / (radial + 1);
    }
    const ringShade = tone * (occlusion ? occlusion(t, p) : 1);
    for (let j = 0; j <= radial; j++) {
      const a = j / radial * Math.PI * 2, r = ring[j], cos = Math.cos(a) * r * flatten, sin = Math.sin(a) * r;
      positions.push(p.x + n.x * cos + b.x * sin, p.y + n.y * cos + b.y * sin, p.z + n.z * cos + b.z * sin);
      uvs.push(j / radial - turn / (Math.PI * 2), t * vScale);
      // Ambient occlusion: grooves between flutes go almost black and crests lighter, as on the logo's trunk.
      const shade = Math.min(1.2, Math.max(.16, .76 + 2.9 * (r / ringMean - 1))) * ringShade * (1 - underside * (.5 - .5 * Math.cos(a)));
      colors.push(shade, shade * .97, shade * .92);
    }
  }
  for (let i = 0; i < segments; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, c = (i + 1) * (radial + 1) + j;
    indices.push(a, c, a + 1, c, c + 1, a + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  weldSeam(geometry, segments + 1, radial + 1);
  return geometry;
}

// Rings share their first and last vertex position; average the two normals so the seam does not show.
function weldSeam(geometry: T.BufferGeometry, rings: number, perRing: number) {
  const normal = geometry.attributes.normal;
  for (let i = 0; i < rings; i++) {
    const a = i * perRing, b = a + perRing - 1;
    const x = normal.getX(a) + normal.getX(b), y = normal.getY(a) + normal.getY(b), z = normal.getZ(a) + normal.getZ(b), l = Math.hypot(x, y, z) || 1;
    normal.setXYZ(a, x / l, y / l, z / l); normal.setXYZ(b, x / l, y / l, z / l);
  }
}

// Rounded-rectangle footprint (superellipse |x/a|^e + |z/b|^e = 1), resampled at equal arc length so rings of
// different sizes line up vertex for vertex. Starts at the back centre so the seam stays out of sight.
function superellipse(a: number, b: number, e: number, count: number) {
  const dense: [number, number][] = [], lengths = [0];
  for (let k = 0; k <= 720; k++) {
    const angle = -Math.PI / 2 + k / 720 * Math.PI * 2, c = Math.cos(angle), s = Math.sin(angle);
    dense.push([a * Math.sign(c) * Math.abs(c) ** (2 / e), b * Math.sign(s) * Math.abs(s) ** (2 / e)]);
    if (k) lengths.push(lengths[k - 1] + Math.hypot(dense[k][0] - dense[k - 1][0], dense[k][1] - dense[k - 1][1]));
  }
  const total = lengths[720], points: [number, number][] = [];
  for (let k = 0, at = 0; k <= count; k++) {
    const target = k / count * total;
    while (at < 719 && lengths[at + 1] < target) at++;
    const f = (target - lengths[at]) / Math.max(1e-6, lengths[at + 1] - lengths[at]);
    points.push([dense[at][0] + (dense[at + 1][0] - dense[at][0]) * f, dense[at][1] + (dense[at + 1][1] - dense[at][1]) * f]);
  }
  return { points, length: total };
}
// Distance from the centre to the superellipse edge in a direction (for roots that must stay on the soil).
const superRadius = (a: number, b: number, e: number, angle: number) => (Math.abs(Math.cos(angle) / a) ** e + Math.abs(Math.sin(angle) / b) ** e) ** (-1 / e);

// Domed cap over a superellipse footprint (the soil mound): rings shrink toward the centre at heights from `height`.
function capGeometry(THREE: Three, a: number, b: number, e: number, count: number, height: (x: number, z: number) => number) {
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [], steps = 14;
  const outline = superellipse(a, b, e, count).points;
  for (let r = 0; r <= steps; r++) {
    const scale = 1 - r / steps * .97;
    for (const [x0, z0] of outline) { const x = x0 * scale, z = z0 * scale; positions.push(x, height(x, z), z); uvs.push(x / (2 * a) + .5, z / (2 * b) + .5); }
  }
  for (let r = 0; r < steps; r++) for (let k = 0; k < count; k++) {
    const i = r * (count + 1) + k, j = (r + 1) * (count + 1) + k;
    indices.push(i, j, i + 1, j, j + 1, i + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// Lofted pot wall: each ring is [height, outward offset of the footprint, brightness].
function potGeometry(THREE: Three, rings: [number, number, number][], a: number, b: number, e: number, count: number) {
  const positions: number[] = [], uvs: number[] = [], colors: number[] = [], indices: number[] = [];
  for (const [y, offset, shade] of rings) {
    const { points, length } = superellipse(a + offset, b + offset, e, count);
    points.forEach(([x, z], k) => {
      positions.push(x, y, z); uvs.push(k / count * length / .9, y / .9);
      // The front face darkens toward the bottom, where it melts into the black plate.
      const front = Math.max(0, z / (b + offset)), sink = Math.min(1, Math.max(0, (y + .1) / .35));
      const tone = shade * (1 - front * (1 - sink) * .55);
      colors.push(tone, tone, tone * .97);
    });
  }
  for (let r = 0; r < rings.length - 1; r++) for (let k = 0; k < count; k++) {
    const i = r * (count + 1) + k, j = (r + 1) * (count + 1) + k;
    indices.push(i, j, i + 1, j, j + 1, i + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  weldSeam(geometry, rings.length, count + 1);
  return geometry;
}

// Palmate Japanese-maple leaf (seven narrow pointed lobes, fine serration), as in the logo. Tinted per instance.
function leafTexture(THREE: Three, size: number) {
  // Two masks packed in one texture (alpha is the leaf): red holds the shading (each lobe light along its midrib and
  // darker toward its edges, one side folded into shade), green the sheen (midribs, a pale rim along the edges and
  // the centre), which the shader turns into the logo's soft pink highlights.
  const s = size * .47, palm = { x: size / 2, y: size * .6 };
  const { path, parts, veins } = palmateLeaf(palm.x, palm.y, s);
  const paint = (draw: (c: CanvasRenderingContext2D) => void) => { const canvas = document.createElement('canvas'); canvas.width = canvas.height = size; const c = canvas.getContext('2d')!; draw(c); return c.getImageData(0, 0, size, size).data; };
  const shading = paint(c => {
    c.fillStyle = '#c8c8c8'; c.fill(path);
    parts.forEach((part, i) => {
      const [vx, vy] = veins[i], dx = vx - palm.x, dy = vy - palm.y, length = Math.hypot(dx, dy), nx = -dy / length, ny = dx / length;
      c.save(); c.clip(part);
      // Across the lobe: dark edge, light midrib, then the folded side a little darker.
      const across = c.createLinearGradient(palm.x + dx * .45 - nx * s * .14, palm.y + dy * .45 - ny * s * .14, palm.x + dx * .45 + nx * s * .14, palm.y + dy * .45 + ny * s * .14);
      across.addColorStop(0, '#8c8c8c'); across.addColorStop(.47, '#ffffff'); across.addColorStop(.53, '#e2e2e2'); across.addColorStop(1, '#6e6e6e');
      c.fillStyle = across; c.fillRect(0, 0, size, size);
      c.restore();
    });
    c.save(); c.clip(path); c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = size / 110; c.stroke(path); c.restore();
    c.strokeStyle = '#a0a0a0'; c.lineWidth = size / 100; c.beginPath(); c.moveTo(palm.x, palm.y); c.lineTo(palm.x, Math.min(size - 2, palm.y + s * .55)); c.stroke();
  });
  const sheen = paint(c => {
    c.save(); c.clip(path);
    const glow = c.createRadialGradient(palm.x, palm.y, 0, palm.x, palm.y, s * .3);
    glow.addColorStop(0, 'rgba(255,255,255,.8)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = glow; c.fillRect(0, 0, size, size);
    c.lineCap = 'round';
    for (const [vx, vy] of veins) {
      const line = c.createLinearGradient(palm.x, palm.y, vx, vy);
      line.addColorStop(0, 'rgba(255,255,255,.9)'); line.addColorStop(.75, 'rgba(255,255,255,.5)'); line.addColorStop(1, 'rgba(255,255,255,0)');
      c.strokeStyle = line; c.lineWidth = size / 70; c.beginPath(); c.moveTo(palm.x, palm.y); c.lineTo(vx, vy); c.stroke();
    }
    c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = size / 60; c.stroke(path);
    c.restore();
  });
  const out = new ImageData(size, size);
  // The sheen is drawn in white with partial alpha, so its strength is the alpha channel.
  for (let i = 0; i < out.data.length; i += 4) { out.data[i] = shading[i]; out.data[i + 1] = sheen[i + 3]; out.data[i + 3] = shading[i + 3]; }
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size; canvas.getContext('2d')!.putImageData(out, 0, 0);
  const texture = new THREE.CanvasTexture(canvas); texture.anisotropy = 4;
  return texture;
}

// Unit leaf: petiole at the origin, blade along +Y, cupped so it never reads as a flat sliver.
function leafGeometry(THREE: Three) {
  const geometry = new THREE.PlaneGeometry(1, 1, 4, 4); geometry.translate(0, .48, 0);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) { const x = position.getX(i), y = position.getY(i); position.setZ(i, .24 * x * x + .12 * y * y); }
  geometry.computeVertexNormals();
  return geometry;
}

// ---- Logo geometry. The scene is laid out on the official logo (1586×992 px): 160 logo pixels make one
// scene unit, x is measured from the logo's vertical axis (760 px) and the pot rim (row 567) sits at POT_TOP.
const POT_TOP = .3;
const LOGO = { scale: 160, axis: 760, rim: 567 };
const logoX = (px: number) => (px - LOGO.axis) / LOGO.scale;
const logoY = (py: number) => POT_TOP + (LOGO.rim - py) / LOGO.scale;
// Arch: a full circle centred on row 485 (outer edge radius 472 px) in a thick and a thin gold line; it keeps
// curving below the plate's top edge and ends hidden behind the plate.
// The lines sit on a dark band: a soft shadow on the dark logo, a solid black outline on the light one.
const ARCH = { centerY: logoY(485), outer: (472 - 6.5) / LOGO.scale, inner: (472 - 24.5) / LOGO.scale, outerWidth: 13 / LOGO.scale, innerWidth: 7 / LOGO.scale, band: [436 / LOGO.scale, 481 / LOGO.scale], sweep: .8 };
const archBand = { dark: { alpha: .7, soft: .3 }, light: { alpha: .96, soft: .06 } };
// Pot: rounded rectangle whose front face carries "BONSAI" and sinks into the plate (logo columns 465–1040).
const POT = { halfWidth: (1040 - 465) / 2 / LOGO.scale, halfDepth: .8, roundness: 7 };

// The nameplate is painted on a canvas in the logo's proportions, measured on the logo image: edges on columns
// 212 and 1308, top edge on row 621, body down to row 877.5, corner notches of 47 px, shield tab down to row 958.
const PLAQUE = { width: 2048, height: 720, left: 40, right: 2008, top: 60 };
const PLAQUE_PX = (PLAQUE.right - PLAQUE.left) / ((1308 - 212) / LOGO.scale); // canvas pixels per scene unit
const plaqueY = (py: number) => PLAQUE.top + (py - 621) / LOGO.scale * PLAQUE_PX;
// Tab edge measured column by column: [distance from the axis, depth below the body] in logo pixels.
const TAB_PROFILE = [[95, 0], [94, .5], [92, 4], [90, 8.5], [88, 14.5], [84, 23], [80, 30], [76, 35.5], [72, 40], [68, 44.5], [64, 48.5], [60, 51.5], [56, 54.5], [52, 57], [48, 59.5], [44, 62], [40, 64], [36, 66], [32, 68], [28, 69], [24, 71], [20, 72], [16, 73], [12, 74], [8, 75], [4, 77.5], [0, 80.5]];
const logoPx = (px: number) => px / LOGO.scale * PLAQUE_PX;
// Border widths in canvas pixels as drawn in the logo; on small screens each keeps a minimum width in screen pixels.
const PLAQUE_BORDER = { outer: logoPx(8), gap: logoPx(9), inner: logoPx(3.5) };
const PLAQUE_BORDER_MIN = { outer: 2, gap: 2.5, inner: 1 };
type Border = { outer: number; inner: number; gap: number };

// ---- Framing. The camera fits the composition (arch top to plate bottom, plate width) into the stage, keeping it
// at 93% of the stage height or 94% of its width. The still (hero-poster-*.webp) is cropped to that same box, so a
// plain `background-size: contain` on the stage lines it up with the live scene on any screen.
const PLANE_TOP = logoY(621) + PLAQUE.top / PLAQUE_PX, PLANE_HEIGHT = PLAQUE.height / PLAQUE_PX;
const FIT = { height: .93, width: .94 };
const COMPOSITION = (() => {
  const top = ARCH.centerY + ARCH.outer + ARCH.outerWidth / 2 + .05, bottom = PLANE_TOP - PLANE_HEIGHT;
  return { centerY: (top + bottom) / 2, halfHeight: (top - bottom) / 2, halfWidth: (PLAQUE.right - PLAQUE.left) / PLAQUE_PX / 2 + .05 };
})();
const POSTER_BOX = { width: 2 * COMPOSITION.halfWidth / FIT.width, height: 2 * COMPOSITION.halfHeight / FIT.height };
// Aspect of the still, and where the crown sits in it (fractions; logo columns 320–1205, rows 40–460), so falling
// leaves can start before the scene is ready.
export const POSTER = {
  aspect: POSTER_BOX.width / POSTER_BOX.height,
  crown: {
    x: (logoX(320) + POSTER_BOX.width / 2) / POSTER_BOX.width, width: (logoX(1205) - logoX(320)) / POSTER_BOX.width,
    y: (COMPOSITION.centerY + POSTER_BOX.height / 2 - logoY(40)) / POSTER_BOX.height, height: (logoY(40) - logoY(460)) / POSTER_BOX.height,
  },
};

// Body with concave quarter-circle notches at the four corners and the logo's bowl-shaped tab, which ends in a
// small point under the centre.
function plaqueOutline() {
  const { left: L, right: R, top: T } = PLAQUE, B = plaqueY(877.5), cx = PLAQUE.width / 2, notch = logoPx(47);
  const path = new Path2D();
  path.moveTo(L + notch, T);
  path.lineTo(R - notch, T);
  path.arc(R, T, notch, Math.PI, Math.PI / 2, true);
  path.lineTo(R, B - notch);
  path.arc(R, B, notch, -Math.PI / 2, -Math.PI, true);
  // The measured profile, smoothed by running quadratic curves through the midpoints between samples.
  const side = (sign: number) => {
    const points = (sign > 0 ? TAB_PROFILE : [...TAB_PROFILE].reverse()).map(([dx, depth]) => [cx + sign * logoPx(dx), B + logoPx(depth)] as const);
    path.lineTo(...points[0]);
    for (let k = 1; k < points.length - 1; k++) path.quadraticCurveTo(points[k][0], points[k][1], (points[k][0] + points[k + 1][0]) / 2, (points[k][1] + points[k + 1][1]) / 2);
    path.lineTo(...points[points.length - 1]);
  };
  side(1); side(-1);
  path.lineTo(L + notch, B);
  path.arc(L, B, notch, 0, -Math.PI / 2, true);
  path.lineTo(L, T + notch);
  path.arc(L, T, notch, Math.PI / 2, 0, true);
  path.closePath();
  return path;
}

// Offscreen layer matching the plaque canvas (whose resolution drops on phones), drawn in plaque coordinates.
const layer = (target: HTMLCanvasElement) => {
  const canvas = document.createElement('canvas'); canvas.width = target.width; canvas.height = target.height;
  const c = canvas.getContext('2d')!; c.setTransform(target.width / PLAQUE.width, 0, 0, target.height / PLAQUE.height, 0, 0);
  return { canvas, c };
};
const stamp = (c: CanvasRenderingContext2D, source: HTMLCanvasElement, operation: GlobalCompositeOperation = 'source-over') => { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = operation; c.drawImage(source, 0, 0); c.restore(); };
// Rectangle whose alpha is the product of a horizontal and a vertical ramp (1 inside, 0 outside).
function softWindow(c: CanvasRenderingContext2D, cx: number, half: number, feather: number, top: number, fullTo: number, clearTo: number) {
  const { width, height } = PLAQUE, mask = layer(c.canvas);
  const across = mask.c.createLinearGradient(cx - half - feather, 0, cx + half + feather, 0), f = feather / (2 * (half + feather));
  across.addColorStop(0, 'rgba(0,0,0,0)'); across.addColorStop(f, '#000'); across.addColorStop(1 - f, '#000'); across.addColorStop(1, 'rgba(0,0,0,0)');
  mask.c.fillStyle = across; mask.c.fillRect(cx - half - feather, top, 2 * (half + feather), clearTo - top);
  const down = mask.c.createLinearGradient(0, fullTo, 0, clearTo);
  down.addColorStop(0, '#000'); down.addColorStop(1, 'rgba(0,0,0,0)');
  mask.c.globalCompositeOperation = 'destination-in'; mask.c.fillStyle = down; mask.c.fillRect(0, 0, width, height);
  stamp(c, mask.canvas, 'destination-out');
}

function paintPlaque(c: CanvasRenderingContext2D, border: Border) {
  const { width: W, height: H, top: T } = PLAQUE, cx = W / 2, outline = plaqueOutline();
  c.setTransform(c.canvas.width / W, 0, 0, c.canvas.height / H, 0, 0);
  c.clearRect(0, 0, W, H);
  // Black plate. Over the pot its top fades out, so the stone face (behind the plate) carries "BONSAI"
  // and melts into the plate below, as in the logo.
  const body = layer(c.canvas);
  const plate = body.c.createLinearGradient(0, T, 0, H);
  plate.addColorStop(0, '#1b1b18'); plate.addColorStop(.5, '#0f100e'); plate.addColorStop(1, '#090a09');
  // Soft drop shadow under the plate, as in the logo.
  body.c.save(); body.c.shadowColor = 'rgba(0,0,0,.55)'; body.c.shadowBlur = logoPx(14); body.c.shadowOffsetY = logoPx(5);
  body.c.fillStyle = plate; body.c.fill(outline); body.c.restore();
  const pot = POT.halfWidth * PLAQUE_PX;
  softWindow(body.c, cx, pot - logoPx(26), logoPx(18), 0, plaqueY(652), plaqueY(700));
  stamp(c, body.canvas);
  // Borders: bands inside the outline (a wide stroke clipped to the plate), so every corner and the tab stay parallel.
  const metal = c.createLinearGradient(PLAQUE.left, T, PLAQUE.right * .7, H);
  // Bronze gold sampled from the logo's border (same in the dark and light files).
  metal.addColorStop(0, '#E2B677'); metal.addColorStop(.45, '#B9833E'); metal.addColorStop(1, '#7A5222');
  const band = (from: number, to: number) => {
    const line = layer(c.canvas);
    line.c.lineJoin = 'round'; line.c.strokeStyle = metal;
    line.c.lineWidth = 2 * to; line.c.stroke(outline);
    if (from > 0) { line.c.globalCompositeOperation = 'destination-out'; line.c.lineWidth = 2 * from; line.c.stroke(outline); }
    line.c.globalCompositeOperation = 'destination-in'; line.c.fillStyle = '#000'; line.c.fill(outline);
    return line;
  };
  // Outer line: fades out as it reaches the pot.
  const outer = band(0, border.outer);
  const fade = outer.c.createLinearGradient(cx - pot - logoPx(70), 0, cx + pot + logoPx(70), 0), edge = logoPx(70) / (2 * (pot + logoPx(70)));
  fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(edge * .9, '#000'); fade.addColorStop(1 - edge * .9, '#000'); fade.addColorStop(1, 'rgba(0,0,0,0)');
  outer.c.globalCompositeOperation = 'destination-out'; outer.c.fillStyle = fade; outer.c.fillRect(0, 0, W, T + border.outer + 2);
  stamp(c, outer.canvas);
  // Inner line: its top run continues across the pot face as the rules beside "BONSAI".
  const innerFrom = border.outer + border.gap, inner = band(innerFrom, innerFrom + border.inner), gap = logoX(990) * PLAQUE_PX;
  inner.c.globalCompositeOperation = 'destination-out'; inner.c.fillRect(cx - gap, 0, 2 * gap, T + innerFrom + border.inner + 2);
  stamp(c, inner.canvas);

  // Lettering in the logo's muted champagne gold (BONSAI a touch paler than the name).
  const gold = (y0: number, y1: number, pale = false) => { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, pale ? '#F7EAD0' : '#F4E2B8'); g.addColorStop(.5, pale ? '#DFC498' : '#D8B276'); g.addColorStop(1, pale ? '#A8844F' : '#946C38'); return g; };
  const serif = (size: number) => `600 ${size}px "Cormorant Garamond", Georgia, serif`;
  const capRatio = (size: number) => { c.font = serif(size); return (c.measureText('BONSAI').actualBoundingBoxAscent || size * .63) / size; };
  // "BONSAI" on the pot face: cap height and width as in the logo (rows 617–664, columns 579–945).
  {
    const cap = plaqueY(664) - plaqueY(617), size = cap / capRatio(200), span = logoPx(945 - 579);
    c.font = serif(size);
    const widths = [...'BONSAI'].map(ch => c.measureText(ch).width), spacing = (span - widths.reduce((a, b) => a + b, 0)) / 5;
    let x = cx - span / 2; const baseline = plaqueY(664);
    c.textBaseline = 'alphabetic';
    c.fillStyle = 'rgba(0,0,0,.55)'; [...'BONSAI'].forEach((ch, i) => { c.fillText(ch, x + 3, baseline + 4); x += widths[i] + spacing; });
    x = cx - span / 2; c.fillStyle = gold(baseline - cap, baseline, true);
    [...'BONSAI'].forEach((ch, i) => { c.fillText(ch, x, baseline); x += widths[i] + spacing; });
  }
  // "DANIEL BOURSCHEID": tall and condensed (rows 698–796, columns 298–1222), always inside the inner border.
  {
    const cap = plaqueY(796) - plaqueY(698), size = cap / capRatio(200), inset = border.outer + border.gap + border.inner;
    c.font = serif(size);
    const natural = c.measureText('DANIEL BOURSCHEID').width, room = PLAQUE.right - PLAQUE.left - 2 * (inset + logoPx(30));
    const scaleX = Math.min(logoPx(1222 - 298), room) / natural, baseline = plaqueY(796);
    c.save(); c.translate(cx, 0); c.scale(scaleX, 1); c.textAlign = 'center';
    c.fillStyle = 'rgba(0,0,0,.65)'; c.fillText('DANIEL BOURSCHEID', 5, baseline + 7);
    c.fillStyle = gold(baseline - cap, baseline); c.fillText('DANIEL BOURSCHEID', 0, baseline);
    c.restore();
  }
  // The logo's red maple leaf (traced from the logo), top tip on row 816.4, with stem, veins and a light rim.
  {
    const unit = logoPx(1), blade = new Path2D(plateLeafOutline);
    c.save(); c.translate(cx, plaqueY(816.4)); c.scale(unit, unit);
    const stem = new Path2D('M-1.2 70 L2.2 70 L1 97.5 Q.5 100 0 100 Q-.6 100 -.8 97.5 Z');
    c.shadowColor = 'rgba(0,0,0,.65)'; c.shadowBlur = 3 * unit; c.shadowOffsetX = .8 * unit; c.shadowOffsetY = 1.6 * unit;
    c.fillStyle = '#C8181B'; c.fill(stem);
    const fill = c.createRadialGradient(1, 60, 4, 1, 50, 52);
    fill.addColorStop(0, '#B81317'); fill.addColorStop(.7, '#CC1A1C'); fill.addColorStop(1, '#DA2A26');
    c.fillStyle = fill; c.fill(blade);
    c.shadowColor = 'transparent';
    c.save(); c.clip(blade);
    c.lineCap = 'round';
    for (const [x0, y0, x1, y1] of plateLeafVeins) {
      c.strokeStyle = 'rgba(70,0,4,.7)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
      c.strokeStyle = 'rgba(255,125,110,.4)'; c.lineWidth = .8; c.beginPath(); c.moveTo(x0 + .9, y0); c.lineTo(x1 + .9, y1); c.stroke();
    }
    c.strokeStyle = 'rgba(255,105,90,.5)'; c.lineWidth = 1.6; c.stroke(blade);
    c.restore(); c.restore();
  }
}

// Built in steps that yield to the browser in between, so a slow phone keeps scrolling while the scene is made.
export async function createBonsaiScene(THREE: Three, canvas: HTMLCanvasElement, { theme, reduced, entrance: animateEntrance = true, onFirstFrame, onCanopy }: Options): Promise<BonsaiScene> {
  const pause = () => new Promise<void>(resolve => setTimeout(resolve, 0));
  const settled = reduced || !animateEntrance;
  const compact = innerWidth < 760;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, compact ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const fog = new THREE.FogExp2(palettes[theme].fog, palettes[theme].density); scene.fog = fog;
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 80);
  const rand = random(14), V = THREE.Vector3;
  const textures: T.Texture[] = [];
  const keep = <M extends { map: T.Texture; normalMap: T.Texture }>(maps: M) => { textures.push(maps.map, maps.normalMap); return maps; };
  const texel = compact ? 256 : 512;
  let disposed = false;

  // ---- Light: warm key from the upper left, subtle golden back light, low ambient.
  const rig = new THREE.Group(); scene.add(rig);
  const hemi = new THREE.HemisphereLight(0x5a6a50, 0x0a0d08, palettes[theme].hemi); scene.add(hemi);
  const key = new THREE.SpotLight(0xffdfb0, palettes[theme].key, 0, .5, .8, 0);
  key.position.set(-4, 8, 4.5); key.target.position.set(0, 1.3, 0);
  key.castShadow = true; key.shadow.mapSize.setScalar(compact ? 1024 : 2048); key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.camera.near = 4; key.shadow.camera.far = 18;
  rig.add(key, key.target);
  const back = new THREE.SpotLight(0xD4AF37, palettes[theme].back, 0, .55, .9, 0);
  back.position.set(2, 5.5, -5.5); back.target.position.set(0, 1.6, 0); rig.add(back, back.target);
  const environmentLevel = { dark: palettes.dark.environment, light: palettes.light.environment };
  scene.environmentIntensity = environmentLevel[theme];
  let environment: T.Texture | null = null;

  // world holds pot and tree; it only turns a few degrees toward the pointer.
  const world = new THREE.Group(); rig.add(world);

  await pause();

  // ---- Pot, as in the logo: a wide rounded-rectangle pot in dark stone with a lighter worn rim. Its front face
  // carries "BONSAI" (painted on the plate) and sinks behind the plate, so the pot reads as the plate's base.
  const potGroup = new THREE.Group(); world.add(potGroup);
  const stoneNoise = noise2(5);
  const stone = keep(surfaceMaps(THREE, compact ? 256 : 512, 2.4, (u, v) => {
    const n = stoneNoise(u * 10, v * 5, 10, 5, 4), pit = stoneNoise(u * 60, v * 30, 60, 30, 1) > .78 ? .45 : 0, grain = compact ? .5 : stoneNoise(u * 120, v * 60, 120, 60, 1);
    const shade = 30 + n * 26 + grain * 10 - pit * 14;
    return { h: n * .8 + grain * .2 - pit, r: shade, g: shade * 1.01, b: shade * .97 };
  }));
  const potMaterial = new THREE.MeshPhysicalMaterial({ map: stone.map, normalMap: stone.normalMap, normalScale: new THREE.Vector2(.6, .6), vertexColors: true, roughness: .78, clearcoat: .2, clearcoatRoughness: .55 });
  const potShape = { a: POT.halfWidth, b: POT.halfDepth, e: POT.roundness }, potCount = compact ? 120 : 200;
  const pot = new THREE.Mesh(potGeometry(THREE, [
    [POT_TOP - 1, -.09, .4], [POT_TOP - .2, -.03, .95], [POT_TOP - .1, -.012, 1], [POT_TOP - .085, .012, 1.3], [POT_TOP - .02, .018, 1.4],
    [POT_TOP, 0, 1.6], [POT_TOP + .008, -.035, 1.75], [POT_TOP, -.07, 1.3], [POT_TOP - .06, -.085, .5],
  ], potShape.a, potShape.b, potShape.e, potCount), potMaterial);
  pot.castShadow = pot.receiveShadow = true; potGroup.add(pot);

  // Soil mounded above the rim toward the trunk, so the nebari shows over the pot as in the logo.
  const soilEdge = POT_TOP + .005, soilPeak = .14, soilA = potShape.a - .085, soilB = potShape.b - .085;
  const soilHeight = (x: number, z: number) => soilEdge + soilPeak * Math.max(0, 1 - (x / soilA) ** 2 - (z / soilB) ** 2) ** 1.4;
  const soilY = soilHeight(0, 0);
  const mossNoise = noise2(11);
  const mossMaps = keep(surfaceMaps(THREE, compact ? 256 : 512, 3, (u, v) => {
    const clump = mossNoise(u * 14, v * 14, 14, 14, 5), fine = mossNoise(u * 90, v * 90, 90, 90, 2), h = clump * .7 + fine * .3;
    return { h, r: 20 + h * 34, g: 30 + h * 54, b: 10 + h * 14 };
  }));
  mossMaps.map.repeat.set(2.5, 1.2); mossMaps.normalMap.repeat.set(2.5, 1.2);
  const soilMaterial = new THREE.MeshStandardMaterial({ map: mossMaps.map, normalMap: mossMaps.normalMap, roughness: 1 });
  const soil = new THREE.Mesh(capGeometry(THREE, soilA, soilB, potShape.e, compact ? 80 : 140, soilHeight), soilMaterial);
  soil.receiveShadow = true; potGroup.add(soil);

  await pause();

  // ---- Tree, modelled on the logo: a massive trunk that twists as it rises, fluted into buttresses that run
  // down into a wide nebari of surface roots over the moss; thick main branches open left and right under the crown.
  const tree = new THREE.Group(); tree.position.y = soilY; world.add(tree);
  const barkNoise = noise2(23);
  const barkMaps = keep(surfaceMaps(THREE, texel, 6, (u, v) => {
    // Long, wavy ridges stretched along the wood (ridged noise, warped so they wander and merge), split by dark
    // cracks, with fine grain: the carved look of the logo's trunk.
    const warp = barkNoise(u * 3, v * 2, 3, 2, 2) - .5;
    const ridge = 1 - Math.abs(2 * barkNoise(u * 18 + warp * 3, v * 2, 18, 2, 3) - 1);
    const fine = 1 - Math.abs(2 * barkNoise(u * 44 + warp * 6, v * 3, 44, 3, 2) - 1);
    const grain = barkNoise(u * 96, v * 18, 96, 18, 1);
    const h = ridge ** 3 * .62 + fine ** 3 * .28 + grain * .1;
    // Ramp: near-black brown in the cracks, warm brown on the flanks, pale cream on the crests.
    const t = Math.min(1, Math.max(0, h * 1.3)), dark = [18, 11, 6], mid = [112, 78, 48], pale = [226, 204, 166];
    const mix = (k: number) => t < .5 ? dark[k] + (mid[k] - dark[k]) * t * 2 : mid[k] + (pale[k] - mid[k]) * (t - .5) * 2;
    return { h, r: mix(0) + grain * 10, g: mix(1) + grain * 8, b: mix(2) + grain * 6 };
  }));
  // Little environment fill, so the side away from the key light falls into deep shadow as in the logo; no fog,
  // which would tint the warm browns green.
  const bark = new THREE.MeshStandardMaterial({ map: barkMaps.map, normalMap: barkMaps.normalMap, normalScale: new THREE.Vector2(2, 2), vertexColors: true, roughness: .55, envMapIntensity: .22, fog: false });
  // Logo-like modelling of the wood: little ambient fill and a stronger key light, so each strand gets a bright
  // crest on the lit side and falls into dark brown on the other.
  // The silhouette edges darken too, which rounds every strand and root like the logo's shading.
  bark.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <aomap_fragment>', 'reflectedLight.indirectDiffuse *= .4;\nreflectedLight.directDiffuse *= 1.35;\n#include <aomap_fragment>')
      .replace('#include <opaque_fragment>', 'outgoingLight *= mix(.28, 1., smoothstep(.05, .7, abs(dot(normalize(normal), normalize(vViewPosition)))));\n#include <opaque_fragment>');
  };
  await pause();
  const limbs: T.BufferGeometry[] = [];
  const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  // Nebari: surface roots around the trunk, longest to the left and right as in the logo. [angle, reach, thickness]
  const rootSpec: [number, number, number][] = [
    [-.1, 1.65, .17], [.38, 1.4, .17], [.95, .95, .15], [1.5, .72, .16], [2.05, .95, .15], [2.6, 1.4, .18],
    [3.1, 1.65, .17], [3.75, 1.2, .14], [4.65, .8, .13], [5.5, 1.2, .14],
  ];
  // The strands turn one way low on the trunk and the other way higher up, which draws the logo's S in the wood.
  const trunkTwist = (h: number) => { const y = Math.max(h, 0); return .9 * y + .55 * Math.sin(y * 2.4); };
  // Buttresses: one per root, strong at the base and fading into the trunk; below the soil everything shrinks.
  const sunk = (h: number) => h < 0 ? Math.max(0, 1 + h * 4) : 1;
  // Narrow and tall at the base, so the flare reads as separate roots with dark gaps between them, not a cone.
  const flutes: Flute[] = rootSpec.map(([angle, , thick]) => ({ angle, width: .11, drift: .3, amp: (_t, p) => (.05 + 3.2 * thick * Math.exp(-Math.max(p.y, 0) / .3)) * (1 - smooth(1.5, 2.2, p.y)) * sunk(p.y) }));
  // Strands: many narrow ridges that wander along the trunk, as in the logo's twisted, deeply furrowed wood.
  for (let k = 0; k < 9; k++) {
    const amp = .12 + rand() * .1, width = .11 + rand() * .08;
    flutes.push({ angle: k / 9 * Math.PI * 2 + (rand() - .5) * .3, width, drift: (rand() - .5) * 1.6, amp: (_t, p) => amp * (1 - smooth(1.8, 2.2, p.y)) });
  }
  // Centre line traced from the logo (middle of the trunk's silhouette row by row): the base sits right of the axis,
  // the trunk leans left as it rises and turns back right at the top, an S.
  const trunk = new THREE.CatmullRomCurve3([new V(.17, -.25, .02), new V(.18, .1, .02), new V(.19, .4, .04), new V(.17, .62, .03), new V(.08, .86, 0), new V(-.04, 1.09, -.02), new V(-.12, 1.31, .02), new V(-.17, 1.53, .03), new V(-.1, 1.68, 0), new V(.07, 1.84, -.03), new V(.13, 2, 0), new V(.12, 2.2, 0)], false, 'centripetal');
  const trunkAt = (h: number) => { let lo = 0, hi = 1; for (let k = 0; k < 24; k++) { const mid = (lo + hi) / 2; if (trunk.getPoint(mid).y < h) lo = mid; else hi = mid; } return trunk.getPoint(lo); };
  // Strong flare from mid-height down into the roots, as in the logo.
  // Strong flare into the roots, a steady column through the lean and a clear taper where it splits at the top.
  const trunkRadius = (h: number) => (.17 + .07 * Math.max(0, 1 - h / 2.2) + .16 * Math.exp(-Math.max(h, 0) / .35)) * (1 - .5 * smooth(1.45, 2.1, h)) * (h < 0 ? Math.max(.45, 1 + h * 2.2) : 1);
  limbs.push(barkTube(THREE, trunk, compact ? 90 : 150, compact ? 40 : 72, { radius: (_t, p) => trunkRadius(p.y), flutes, twist: (_t, p) => trunkTwist(p.y), lumps: .05, seed: 31, tone: .78, occlusion: (_t, p) => .78 + .22 * smooth(-.05, .5, p.y) }));

  await pause();
  const up = new V(0, 1, 0), trunkBase = trunkAt(.3).setY(0);
  rootSpec.forEach(([angle, wanted, thick], i) => {
    const dir = new V(Math.cos(angle), 0, Math.sin(angle)), side = new V(-Math.sin(angle), 0, Math.cos(angle)), wobble = (rand() - .5) * 2;
    const reach = Math.min(wanted, superRadius(soilA - .08, soilB - .06, potShape.e, angle) - .04);
    // Near the trunk the roots start from its base (right of the axis), farther out they spread around the pot.
    const at = (r: number, lift: number, lateral: number) => { const point = dir.clone().multiplyScalar(r).addScaledVector(side, lateral).addScaledVector(trunkBase, Math.max(0, 1 - r)); return point.setY(soilHeight(point.x, point.z) - soilY + lift); };
    // Roots leave the trunk high up, drop steeply, then snake over the moss in low arches out to the rim.
    const span = reach - .52, hump = .08 + rand() * .1;
    const curve = new THREE.CatmullRomCurve3([at(.05, .62, 0), at(.27, .38, wobble * .03), at(.52, .22, wobble * .08), at(.52 + span * .3, .1 + hump, wobble * .16), at(.52 + span * .58, .06, -wobble * .06), at(.52 + span * .82, .06 + hump * .5, -wobble * .14), at(reach, -.03, wobble * .04)], false, 'centripetal');
    limbs.push(barkTube(THREE, curve, compact ? 34 : 56, compact ? 12 : 18, {
      radius: t => thick * (1.05 * Math.pow(1 - t, 1.2) + .3), flatten: .9, up,
      flutes: [{ angle: -.5, width: .28, amp: () => .1, drift: .6 }, { angle: .55, width: .28, amp: () => .08, drift: -.5 }], twist: t => t * .8, lumps: .08, seed: 40 + i, tone: .9, underside: .6,
    }));
    // A side root forks off most main roots.
    if (reach > .8 && rand() < .75) {
      const start = curve.getPointAt(.45), turn = (rand() < .5 ? -1 : 1) * (.5 + rand() * .4), length = reach * (.3 + rand() * .2);
      const toward = dir.clone().applyAxisAngle(up, turn);
      const ground = (point: T.Vector3, lift: number) => point.setY(soilHeight(point.x, point.z) - soilY + lift);
      const fork = new THREE.CatmullRomCurve3([start.clone().setY(start.y + .01), ground(start.clone().addScaledVector(toward, length * .5), .03), ground(start.clone().addScaledVector(toward, length), -.03)], false, 'centripetal');
      limbs.push(barkTube(THREE, fork, 16, 10, { radius: t => thick * .5 * (1 - t * .75), flatten: .78, up, lumps: .08, seed: 70 + i, tone: .9, underside: .6 }));
    }
  });

  // Moss: tufts on the soil, denser between the roots near the trunk.
  const mossMaterial = new THREE.MeshStandardMaterial({ roughness: 1, color: 0x7a7a7a });
  const moss = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), mossMaterial, compact ? 700 : 1600);
  const dummy = new THREE.Object3D(), color = new THREE.Color();
  for (let i = 0; i < moss.count; i++) {
    const a = rand() * Math.PI * 2, edge = superRadius(soilA - .05, soilB - .05, potShape.e, a), r = .45 + Math.sqrt(rand()) * (edge - .45);
    dummy.position.set(Math.cos(a) * r, 0, Math.sin(a) * r).setY(soilHeight(dummy.position.x, dummy.position.z) + .005); dummy.rotation.set(rand(), rand(), rand());
    const size = .014 + rand() * .026; dummy.scale.set(size * 1.4, size * .45, size * 1.2); dummy.updateMatrix(); moss.setMatrixAt(i, dummy.matrix);
    moss.setColorAt(i, color.setHSL(.17 + rand() * .07, .6 + rand() * .25, .09 + rand() * .09 + (rand() < .25 ? .09 : 0)));
  }
  moss.receiveShadow = true; potGroup.add(moss);

  await pause();

  // Canopy as in the logo: a rounded triangular mound (peak slightly left of the trunk, sides falling diagonally,
  // right side longer and lower), built from overlapping tufts in layers. The underside stays open near the trunk.
  const mound = { peakX: .1, peakY: 2.38, base: .92, left: 2.4, right: 2.45, depth: 1.3 };
  const side = (x: number) => Math.min(1, Math.abs(x - mound.peakX) / (x < mound.peakX ? mound.left : mound.right));
  const crownTop = (x: number) => mound.base + (mound.peakY - mound.base) * (1 - Math.pow(side(x), x < mound.peakX ? 1.6 : .75));
  // Nearly level underneath, opening up only around the trunk so the main branches show as in the logo.
  const underside = (x: number) => mound.base + 1.05 * Math.exp(-((x - mound.peakX + .05) ** 2) / (2 * .42 * .42));
  const clusters: { center: T.Vector3; normal: T.Vector3; inner: boolean }[] = [];
  const tuftCount = compact ? 100 : 125;
  const core = new V(mound.peakX, (mound.base + mound.peakY) / 2 - .2, 0);
  for (let attempts = 0; clusters.length < tuftCount && attempts < 6000; attempts++) {
    const x = mound.peakX - mound.left + rand() * (mound.left + mound.right), top = crownTop(x), bottom = underside(x);
    if (top - bottom < .25) continue;
    const y = bottom + Math.pow(rand(), .6) * (top - bottom), depth = mound.depth * Math.sqrt(Math.max(.05, 1 - side(x) ** 2)) * (.45 + .55 * (y - bottom) / (top - bottom));
    const z = (rand() * 2 - 1) * depth;
    // Nothing hangs in front of the trunk's upper half: in the logo the trunk shows whole up to where it splits.
    if (z > .1 && Math.abs(x - .02) < .5 && y < 1.95) continue;
    // Outer layer hugs the surface; one in four tufts sits deeper to fill the volume.
    const inner = clusters.length % 4 === 3;
    const center = new V(x, y, z);
    const out = center.clone().sub(core); out.y *= 1.3;
    if (!inner) center.addScaledVector(out.normalize(), .12);
    else center.lerp(core, .3);
    clusters.push({ center, normal: out.normalize(), inner });
  }
  // Main branches as in the logo: two long, nearly level limbs open left and right under the crown, two more
  // rise from higher up, the leader continues to the top and a few go front and back for depth.
  // Each starts inside the trunk; [points, base radius].
  const branchSpec: [[number, number, number][], number][] = [
    [[[-.05, 1.2, .02], [-.4, 1.26, .1], [-.75, 1.17, .18], [-1.1, 1.2, .1], [-1.45, 1.2, .2], [-1.85, 1.3, .1]], .09],
    [[[.06, 1.0, 0], [.42, 1.06, .08], [.8, .98, .18], [1.18, 1.02, .12], [1.55, 1.1, .04], [1.9, 1.28, -.05]], .095],
    [[[-.05, 1.5, 0], [-.45, 1.6, -.15], [-.9, 1.62, -.2], [-1.3, 1.5, -.1]], .085],
    [[[.03, 1.58, 0], [.45, 1.68, .12], [.9, 1.66, 0], [1.3, 1.52, -.12]], .085],
    [[[0, 1.95, 0], [-.05, 2.15, .05], [-.08, 2.3, 0]], .12],
    [[[.02, 1.95, 0], [.4, 2.05, .1], [.7, 2.1, 0]], .08],
    [[[-.04, 1.55, -.08], [-.25, 1.82, -.6], [-.35, 2.05, -.9]], .075],
    [[[-.08, 1.05, .1], [-.5, 1.2, .45], [-.95, 1.55, .62]], .065],
  ];
  const primaries: { curve: T.CatmullRomCurve3; radius: (u: number) => number }[] = [];
  branchSpec.forEach(([points, r0], i) => {
    // The first point moves onto the trunk's centre line at that height, so each limb grows out of the S.
    const start = trunkAt(points[0][1]), shift = new V(start.x - points[0][0], 0, start.z - points[0][2]);
    const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z], k) => new V(x, y, z).addScaledVector(shift, Math.max(0, 1 - k * .4))), false, 'centripetal'), radius = (u: number) => r0 * (1.25 - u * 1.15);
    primaries.push({ curve, radius });
    limbs.push(barkTube(THREE, curve, compact ? 22 : 34, compact ? 12 : 18, { radius: t => radius(t), flutes: [{ angle: .8, width: .4, amp: () => .12 }, { angle: 3.3, width: .4, amp: () => .1 }], twist: t => t * 1.4, lumps: .08, up, seed: 90 + i, tone: .95, underside: .45 }));
    // Secondary branches climb from each limb into the crown, alternating sides, with a kink like real wood.
    for (const [k, at] of (compact ? [.4, .75] : [.32, .52, .7, .88]).entries()) {
      const start = curve.getPointAt(at), heading = curve.getTangentAt(at), out = new V(heading.x, 0, heading.z).normalize(), across = new V(-out.z, 0, out.x).multiplyScalar(k % 2 ? 1 : -1);
      const length = .4 + rand() * .4, bend = start.clone().addScaledVector(out, length * .35).addScaledVector(across, length * .25).add(new V(0, length * .3, 0));
      const tip = bend.clone().addScaledVector(out, length * .3).addScaledVector(across, length * .15).add(new V((rand() - .5) * .2, length * .5, 0));
      // Keep every tip inside the foliage.
      tip.y = Math.min(tip.y, crownTop(tip.x) - .15); bend.y = Math.min(bend.y, (start.y + tip.y) / 2 + .05);
      const twig = new THREE.CatmullRomCurve3([start, bend, tip], false, 'centripetal'), rs = radius(at) * .55;
      primaries.push({ curve: twig, radius: u => rs * (1 - u * .8) });
      limbs.push(barkTube(THREE, twig, 12, 8, { radius: u => rs * (1 - u * .8), twist: u => u * 1.5, lumps: .06, up, seed: 120 + i * 4 + k, tone: .95 }));
    }
  });
  const samples = primaries.flatMap(({ curve, radius }) => Array.from({ length: 10 }, (_, k) => { const u = .25 + k / 9 * .75; return { point: curve.getPointAt(u), radius: radius(u) }; }));
  for (const cluster of clusters) {
    let best = samples[0], distance = Infinity;
    for (const sample of samples) { const d = sample.point.distanceTo(cluster.center); if (d < distance) { distance = d; best = sample; } }
    const mid = best.point.clone().lerp(cluster.center, .5).add(new V((rand() - .5) * .12, -.05 + (rand() - .5) * .06, (rand() - .5) * .12));
    const r0 = Math.max(.008, Math.min(best.radius * .55, .03));
    limbs.push(limb(THREE, new THREE.CatmullRomCurve3([best.point.clone(), mid, cluster.center.clone()]), 6, 4, { radius: u => r0 * (1 - u * .7), depth: 0 }));
  }
  await pause();
  const wood = new THREE.Mesh(mergeGeometries(THREE, limbs), bark); wood.castShadow = wood.receiveShadow = true; tree.add(wood);

  await pause();

  // ---- Leaves: instanced palmate leaves facing out and toward the viewer (never edge-on),
  // revealed in a wave on entrance and moved by a light breeze in the vertex shader.
  const leafMap = leafTexture(THREE, 256); textures.push(leafMap);
  const leafShape = leafGeometry(THREE);
  // Fewer, larger leaves of varied sizes, so single leaves read clearly as in the logo.
  const perOuter = 10, perInner = compact ? 5 : 6;
  const count = clusters.reduce((sum, cluster) => sum + (cluster.inner ? perInner : perOuter), 0);
  const motion = { uTime: { value: 0 }, uReveal: { value: settled ? 2 : 0 } };
  const delays = new Float32Array(count);
  const patch = (shader: { uniforms: Record<string, { value: unknown }>; vertexShader: string }) => {
    shader.uniforms.uTime = motion.uTime; shader.uniforms.uReveal = motion.uReveal;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uReveal;\nattribute float aDelay;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
#ifdef USE_INSTANCING
  vec3 anchor = instanceMatrix[3].xyz;
  transformed *= smoothstep(aDelay, aDelay + .25, uReveal);
  float flutter = sin(uTime * 1.6 + anchor.x * 2.1 + anchor.z * 1.7) * .07 + sin(uTime * 2.7 + anchor.y * 3.3) * .03;
  float sway = sin(uTime * .7 + anchor.x * .5) * .22 * clamp(anchor.y - 1.2, 0., 2.);
  transformed.x += flutter * transformed.y + sway;
  transformed.z += flutter * .6 * transformed.y + sway * .4;
#endif`);
  };
  // Leaves skip tone mapping: ACES pushes saturated reds toward salmon/pink; the logo red must stay pure.
  // Little environment light, so leaves in shade stay deep crimson instead of turning dusty pink.
  const leafMaterial = new THREE.MeshStandardMaterial({ map: leafMap, alphaTest: .5, side: THREE.DoubleSide, roughness: .85, metalness: 0, toneMapped: false, fog: false, envMapIntensity: .15 });
  const leafGlow = { dark: .16, light: .12 }, glow = { value: leafGlow[theme] };
  leafMaterial.onBeforeCompile = shader => {
    patch(shader);
    shader.uniforms.uGlow = glow;
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uGlow;')
      // Red channel: shading; green: midrib sheen (see leafTexture).
      .replace('#include <map_fragment>', 'vec4 leafTexel = texture2D(map, vMapUv);\ndiffuseColor.rgb *= leafTexel.r;\ndiffuseColor.a *= leafTexel.a;\nfloat leafSheen = leafTexel.g;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\nfloat facing = abs(dot(normalize(normal), normalize(vViewPosition)));\ntotalEmissiveRadiance += diffuseColor.rgb * uGlow * (.5 + pow(1. - facing, 2.));\n// Pink sheen along the veins, stronger on lit leaves, as in the logo.\ntotalEmissiveRadiance += leafSheen * (diffuseColor.rgb * .5 + vec3(.1, .025, .025) * diffuseColor.r);')
      // Scale bright texels down as a whole instead of clipping each channel, so lit leaves stay pure red, not coral.
      // Almost no white reflection, which would wash the red toward coral.
      .replace('#include <aomap_fragment>', 'reflectedLight.directSpecular *= .15;\nreflectedLight.indirectSpecular *= .1;\n#include <aomap_fragment>')
      // Then hold green and blue to the logo's ratios (linear: about 1–4% of red, more in the highlights), so the
      // crown keeps the pure red of the logo in shade and in light instead of drifting to pink or grey.
      .replace('#include <tonemapping_fragment>', 'gl_FragColor.rgb /= max(1., max(gl_FragColor.r, max(gl_FragColor.g, gl_FragColor.b)));\ngl_FragColor.g = min(gl_FragColor.g, gl_FragColor.r * mix(.012, .04, gl_FragColor.r));\ngl_FragColor.b = min(gl_FragColor.b, gl_FragColor.r * mix(.01, .032, gl_FragColor.r));\n#include <tonemapping_fragment>');
  };
  const leafDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: leafMap, alphaTest: .5 });
  leafDepth.onBeforeCompile = patch;
  const foliage = new THREE.InstancedMesh(leafShape, leafMaterial, count);
  foliage.customDepthMaterial = leafDepth; foliage.castShadow = true; foliage.receiveShadow = true;
  const toViewer = new V(0, .25, 1).normalize(), basis = new THREE.Matrix4(), axisX = new V(), axisY = new V(), normal = new V(), position = new V(), quaternion = new THREE.Quaternion(), scale = new V();
  const crown = new V(mound.peakX, mound.peakY, 0);
  // Light and shade as in the logo: leaves on top of and outside each tuft catch the light, those underneath and inside
  // fall into deep crimson, and the crown is lighter toward the upper left (key light). Ramp sampled from the logo's
  // leaves, darkest to brightest; the brightest lean pink, not orange.
  const ramp = ['#4A070A', '#760C0F', '#A81315', '#D21A1A', '#EC2A27', '#FF4540'].map(hex => new THREE.Color(hex));
  const shadeAt = (value: number) => { const f = Math.min(1, Math.max(0, value)) * (ramp.length - 1), k = Math.min(ramp.length - 2, Math.floor(f)); return color.copy(ramp[k]).lerp(ramp[k + 1], f - k); };
  const gauss = () => (rand() + rand() + rand() - 1.5) / 1.5;
  let index = 0;
  for (const cluster of clusters) for (let k = 0, n = cluster.inner ? perInner : perOuter; k < n; k++) {
    // Dense in the middle of each tuft, looser at its edges.
    position.set(gauss() * .34, gauss() * .22, gauss() * .34).add(cluster.center);
    // Mostly turned toward the viewer, so each leaf shows its full star shape.
    normal.copy(cluster.normal).multiplyScalar(.9).add(new V(0, .5, 0)).add(new V((rand() - .5) * .9, (rand() - .5) * .5, (rand() - .5) * .9)).normalize().lerp(toViewer, .6).normalize();
    axisY.copy(cluster.normal).add(new V((rand() - .5) * 1.2, .3, (rand() - .5) * 1.2)); axisY.addScaledVector(normal, -axisY.dot(normal)).normalize();
    axisX.crossVectors(axisY, normal).normalize();
    basis.makeBasis(axisX, axisY, normal); quaternion.setFromRotationMatrix(basis);
    scale.setScalar(cluster.inner ? .38 + rand() * .2 : (.38 + Math.pow(rand(), 1.6) * .38) * (rand() < .1 ? 1.2 : 1));
    foliage.setMatrixAt(index, basis.compose(position, quaternion, scale));
    const rel = position.clone().sub(cluster.center);
    const tuft = .5 + rel.y / .22 * .22 + rel.dot(cluster.normal) / .34 * .18;
    const sky = (position.y - mound.base) / (mound.peakY - mound.base) * .22 - (position.x - mound.peakX) / (mound.left + mound.right) * .2 + position.z / mound.depth * .1;
    // Leaves toward the back of the crown are shaded too.
    shadeAt((tuft * .9 + sky - .1 + Math.min(0, position.z) / mound.depth * .25 + (rand() - .5) * .22) * (cluster.inner ? .45 : 1));
    foliage.setColorAt(index, color);
    delays[index++] = Math.min(.95, position.distanceTo(crown) / 3.2 * .85 + rand() * .1);
  }
  leafShape.setAttribute('aDelay', new THREE.InstancedBufferAttribute(delays, 1));
  tree.add(foliage);

  await pause();

  // ---- Logo frame. The arch is a full circle in a thick and a thin gold line; it keeps curving below the plate's
  // top edge and ends hidden behind the plate. The plate stands in front of the pot, whose face shows through its top.
  const canopyBox = new THREE.Box3();
  for (const cluster of clusters) canopyBox.expandByPoint(cluster.center);
  canopyBox.expandByScalar(.45); canopyBox.translate(new V(0, tree.position.y, 0));
  // A light sweep runs along the arch and across the plate's gold now and then (see `render`): -9 is off.
  const sweep = { value: -9 };
  const archMaterial = new THREE.ShaderMaterial({
    // Same gold in both themes, as in the two logo files.
    uniforms: { uColor: { value: new THREE.Color('#D4AF37') }, uDraw: { value: settled ? 1 : 0 }, uSweep: sweep },
    vertexShader: 'varying float vU;varying vec3 vN;varying vec3 vView;void main(){vU=uv.x;vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vView=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
    fragmentShader: 'uniform vec3 uColor;uniform float uDraw;uniform float uSweep;varying float vU;varying vec3 vN;varying vec3 vView;void main(){float drawn=step(abs(vU-.5)*2.,uDraw);float facing=max(dot(vN,vView),0.);vec3 edge=uColor*vec3(.17,.12,.2);vec3 crest=uColor*vec3(.68,.47,.9);vec3 color=mix(edge,crest,pow(facing,.9))+vec3(.3,.2,.08)*pow(facing,24.);color+=vec3(1.,.9,.66)*.85*exp(-pow((vU-uSweep)*16.,2.))*pow(facing,.5);gl_FragColor=vec4(color,drawn);\n#include <colorspace_fragment>\n}',
    transparent: true, depthWrite: false,
  });
  const arch = new THREE.Group(); rig.add(arch);
  const archAngle = (k: number) => Math.PI + ARCH.sweep - k * (Math.PI + 2 * ARCH.sweep);
  for (const [radius, width] of [[ARCH.outer, ARCH.outerWidth], [ARCH.inner, ARCH.innerWidth]]) {
    const points: T.Vector3[] = [];
    for (let k = 0; k <= 180; k++) { const a = archAngle(k / 180); points.push(new V(Math.cos(a) * radius, ARCH.centerY + Math.sin(a) * radius, 0)); }
    arch.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 480, width / 2, 10, false), archMaterial));
  }
  // Dark band under the two lines (their shadow and the dark gap between them in the logo), with soft edges.
  const bandPositions: number[] = [], bandUvs: number[] = [], bandIndex: number[] = [];
  for (let k = 0; k <= 240; k++) {
    const a = archAngle(k / 240);
    for (const [j, radius] of ARCH.band.entries()) { bandPositions.push(Math.cos(a) * radius, ARCH.centerY + Math.sin(a) * radius, -.02); bandUvs.push(k / 240, j); }
    if (k) bandIndex.push(2 * k - 2, 2 * k - 1, 2 * k, 2 * k - 1, 2 * k + 1, 2 * k);
  }
  const bandGeometry = new THREE.BufferGeometry();
  bandGeometry.setAttribute('position', new THREE.Float32BufferAttribute(bandPositions, 3)); bandGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(bandUvs, 2)); bandGeometry.setIndex(bandIndex);
  const bandMaterial = new THREE.ShaderMaterial({
    uniforms: { uDraw: archMaterial.uniforms.uDraw, uAlpha: { value: archBand[theme].alpha }, uSoft: { value: archBand[theme].soft } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform float uDraw;uniform float uAlpha;uniform float uSoft;varying vec2 vUv;void main(){float drawn=step(abs(vUv.x-.5)*2.,uDraw);float edge=smoothstep(0.,uSoft,vUv.y)*smoothstep(1.,1.-uSoft,vUv.y);gl_FragColor=vec4(.02,.02,.015,uAlpha*edge*drawn);}',
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  arch.add(new THREE.Mesh(bandGeometry, bandMaterial));
  const plaqueWidth = PLAQUE.width / PLAQUE_PX;
  // Phones show the plate at a few hundred pixels: a smaller canvas paints much faster and looks the same.
  const plaqueCanvas = document.createElement('canvas'), plaqueScale = compact ? .6 : 1;
  plaqueCanvas.width = Math.round(PLAQUE.width * plaqueScale); plaqueCanvas.height = Math.round(PLAQUE.height * plaqueScale);
  const plaqueContext = plaqueCanvas.getContext('2d')!;
  const border: Border = { ...PLAQUE_BORDER };
  let painted = '';
  const repaintPlaque = () => {
    const key = `${border.outer.toFixed(1)}|${border.inner.toFixed(1)}|${border.gap.toFixed(1)}|${document.fonts?.check('600 100px "Cormorant Garamond"')}`;
    if (key === painted) return;
    painted = key; paintPlaque(plaqueContext, border); plaqueTexture.needsUpdate = true;
  };
  const plaqueTexture = new THREE.CanvasTexture(plaqueCanvas); plaqueTexture.colorSpace = THREE.SRGBColorSpace; plaqueTexture.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy()); textures.push(plaqueTexture);
  repaintPlaque();
  document.fonts?.load('600 100px "Cormorant Garamond"').then(() => { if (disposed) return; repaintPlaque(); if (reduced || !frame) render(0); }).catch(() => {});
  const plaqueMaterial = new THREE.MeshBasicMaterial({ map: plaqueTexture, transparent: true, toneMapped: false, fog: false });
  // The sweep only lights gold texels (borders and lettering), in a slanted band, a moment after it leaves the arch.
  plaqueMaterial.onBeforeCompile = shader => {
    shader.uniforms.uSweep = sweep;
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uSweep;').replace('#include <map_fragment>', '#include <map_fragment>\nfloat goldMask = smoothstep(.12, .35, diffuseColor.r - diffuseColor.b) * smoothstep(.3, .5, diffuseColor.r) * smoothstep(.38, .55, diffuseColor.g / max(diffuseColor.r, .01));\ndiffuseColor.rgb += vec3(1., .9, .66) * .6 * goldMask * exp(-pow((vMapUv.x + (1. - vMapUv.y) * .3 - (uSweep - .25) * 1.4) * 9., 2.));');
  };
  const plaque = new THREE.Group(); rig.add(plaque);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(plaqueWidth, PLANE_HEIGHT), plaqueMaterial); plate.position.y = PLANE_TOP - PLANE_HEIGHT / 2; plaque.add(plate);
  // Design plane coordinates map to the screen as if at the tree; a homothety from the camera
  // pushes the arch behind the pot and brings the nameplate in front of it.
  const place = (group: T.Object3D, depth: number) => {
    const anchor = rig.position.clone(), ray = anchor.clone().sub(camera.position), k = (ray.length() + depth) / ray.length();
    group.scale.setScalar(k);
    group.position.copy(camera.position).multiplyScalar(1 - k).addScaledVector(anchor, k).sub(rig.position);
  };

  // Image-based light from a studio room for reflections on the stone pot and leaves.
  // The first compile waits for it: adding it later would recompile every lit material on the main thread.
  const environmentReady = import(/* @vite-ignore */ `${ADDONS}environments/RoomEnvironment.js/+esm`).then(({ RoomEnvironment }) => {
    if (disposed) return;
    const pmrem = new THREE.PMREMGenerator(renderer);
    environment = pmrem.fromScene(new RoomEnvironment(), .04).texture; pmrem.dispose();
    scene.environment = environment;
    if (reduced || !frame) render(0);
  }).catch(() => {});

  // ---- Real model slot: a valid .glb at HERO_MODEL_URL replaces the procedural tree and pot.
  fetch(HERO_MODEL_URL).then(response => response.ok ? response.arrayBuffer() : null).then(async buffer => {
    // SPA fallbacks answer every path with index.html, so check the binary glTF magic.
    if (!buffer || disposed || new TextDecoder().decode(buffer.slice(0, 4)) !== 'glTF') return;
    const [{ GLTFLoader }, { DRACOLoader }] = await Promise.all([import(/* @vite-ignore */ `${ADDONS}loaders/GLTFLoader.js/+esm`), import(/* @vite-ignore */ `${ADDONS}loaders/DRACOLoader.js/+esm`)]);
    const loader = new GLTFLoader(), draco = new DRACOLoader(); draco.setDecoderPath(`${ADDONS}libs/draco/gltf/`); loader.setDRACOLoader(draco);
    loader.parse(buffer, '/models/', (gltf: { scene: T.Object3D }) => {
      if (disposed) return;
      const model = gltf.scene, box = new THREE.Box3().setFromObject(model), size = box.getSize(new V());
      model.scale.setScalar(canopyBox.max.y / Math.max(size.y, .001));
      box.setFromObject(model); const center = box.getCenter(new V());
      model.position.set(-center.x, -box.min.y, -center.z);
      model.traverse(object => { const mesh = object as T.Mesh; if (mesh.isMesh) mesh.castShadow = mesh.receiveShadow = true; });
      tree.visible = potGroup.visible = false; world.add(model);
      if (reduced || !frame) render(0);
    }, () => {});
  }).catch(() => {});

  // ---- Framing, entrance, interaction and loop.
  const composition = COMPOSITION;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let turn = 0, scrollTurn = 0;
  // The entrance runs on wall-clock time, so slow devices still finish it in 1.5 s.
  let frameAverage = 1 / 60, frameCount = 0;
  let frame = 0, visible = true, first = true, elapsed = 0, previous = 0, entrance = settled ? 99 : 0, entranceStart = 0;
  const fading: T.Material[] = [potMaterial, soilMaterial, mossMaterial, bark, plaqueMaterial];
  const resize = () => {
    const host = canvas.parentElement, box = host?.getBoundingClientRect(); if (!host || !box) return;
    const stage = (host.querySelector('.hero-stage') ?? host).getBoundingClientRect();
    const width = Math.max(1, box.width), height = Math.max(1, box.height), aspect = width / height;
    const stageShare = Math.min(1, Math.max(.2, stage.height / height)), stageCenter = (stage.top + stage.height / 2 - box.top) / height;
    renderer.setSize(width, height, false);
    camera.aspect = aspect;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    // The composition is the hero's cover: centred and as large as the stage allows.
    const distance = Math.max(composition.halfHeight / (tan * FIT.height * stageShare), composition.halfWidth / (tan * aspect * FIT.width));
    const lookY = composition.centerY - (.5 - stageCenter) * 2 * tan * distance;
    const plaquePixels = plaqueWidth / (2 * tan * distance * aspect) * width, perPixel = PLAQUE.width / Math.max(plaquePixels, 1);
    // Half-pixel steps, so small viewport changes (a phone's address bar) do not repaint the plate.
    for (const part of ['outer', 'gap', 'inner'] as const) border[part] = Math.round(Math.max(PLAQUE_BORDER[part], PLAQUE_BORDER_MIN[part] * perPixel) * 2) / 2;
    repaintPlaque();
    rig.position.set(0, 0, 0);
    camera.position.set(0, lookY + distance * .1, distance); camera.lookAt(0, lookY, 0);
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    place(arch, 1.2); place(plaque, -1);
    // Report where the crown sits on the page so the leaf overlay can drop leaves from it.
    if (onCanopy) {
      const corner = new V(), min = { x: Infinity, y: Infinity }, max = { x: -Infinity, y: -Infinity };
      for (let k = 0; k < 8; k++) {
        corner.set(k & 1 ? canopyBox.max.x : canopyBox.min.x, k & 2 ? canopyBox.max.y : canopyBox.min.y, k & 4 ? canopyBox.max.z : canopyBox.min.z).add(rig.position).project(camera);
        const x = (corner.x * .5 + .5) * width, y = (-corner.y * .5 + .5) * height;
        min.x = Math.min(min.x, x); min.y = Math.min(min.y, y); max.x = Math.max(max.x, x); max.y = Math.max(max.y, y);
      }
      onCanopy({ x: box.left + scrollX + min.x, y: box.top + scrollY + min.y, width: max.x - min.x, height: max.y - min.y });
    }
    if (reduced || !frame) render(0);
  };
  const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
  let compiled = false;
  const render = (dt: number) => {
    if (!compiled) return;
    elapsed += dt;
    if (entrance < 2) {
      entranceStart ||= performance.now(); entrance = (performance.now() - entranceStart) / 1000;
      archMaterial.uniforms.uDraw.value = ease(entrance / .9);
      const appear = ease((entrance - .15) / .45);
      for (const material of fading) { material.transparent = appear < 1 || material === plaqueMaterial; material.opacity = appear; }
      potGroup.scale.setScalar(.96 + .04 * appear); tree.scale.setScalar(.96 + .04 * appear);
      motion.uReveal.value = Math.max(0, (entrance - .45) / 1) * 1.25;
      if (entrance >= 2) { for (const material of fading) { material.transparent = material === plaqueMaterial; material.opacity = 1; material.needsUpdate = true; } motion.uReveal.value = 2; }
    }
    if (!reduced) {
      motion.uTime.value = elapsed;
      // Light sweep: right after the scene appears, then every 9 s, 1.8 s across.
      const phase = (elapsed - .4) % 9;
      sweep.value = elapsed > .4 && phase < 1.8 ? phase / 1.8 * 1.5 - .25 : -9;
    }
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 2.5); pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 2.5);
    // Scrolling away from the hero turns the tree in its pot (up to 24°), showing it is a real 3D tree; the pot stays
    // square to the plate, whose face it carries, and the roots stay inside it.
    turn += (scrollTurn - turn) * Math.min(1, dt * 4);
    tree.rotation.y = turn * THREE.MathUtils.degToRad(24);
    world.rotation.y = pointer.x * THREE.MathUtils.degToRad(8); world.rotation.x = -pointer.y * THREE.MathUtils.degToRad(2.5);
    renderer.render(scene, camera);
    if (first) { first = false; onFirstFrame(); }
  };
  const tick = (time: number) => {
    frame = 0;
    if (!visible || document.hidden) { previous = 0; return; }
    const dt = previous ? Math.min((time - previous) / 1000, .05) : 0; previous = time;
    // Adaptive resolution: if frames stay slower than ~40 fps, lower the pixel ratio step by step (down to 1).
    if (dt) { frameAverage = frameAverage * .95 + dt * .05; if (++frameCount > 90 && frameAverage > 1 / 40 && renderer.getPixelRatio() > 1) { renderer.setPixelRatio(Math.max(1, renderer.getPixelRatio() - .25)); resize(); frameCount = 0; } }
    render(dt); frame = requestAnimationFrame(tick);
  };
  const start = () => { if (compiled && !reduced && !frame && visible && !document.hidden) frame = requestAnimationFrame(tick); };
  const move = (event: PointerEvent) => { if (reduced || event.pointerType !== 'mouse') return; pointer.tx = event.clientX / innerWidth * 2 - 1; pointer.ty = -(event.clientY / innerHeight * 2 - 1); };
  const resizeObserver = new ResizeObserver(resize);
  if (canvas.parentElement) { resizeObserver.observe(canvas.parentElement); const stage = canvas.parentElement.querySelector('.hero-stage'); if (stage) resizeObserver.observe(stage); }
  const intersection = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; start(); }); intersection.observe(canvas);
  const scrolled = () => { scrollTurn = reduced ? 0 : Math.min(1, Math.max(0, scrollY / Math.max(1, innerHeight * .9))); };
  // Phones tilt the tree with the device where orientation needs no permission (Android); iOS keeps the scroll turn.
  const tilted = (event: DeviceOrientationEvent) => { if (reduced || event.gamma === null || event.beta === null) return; pointer.tx = Math.max(-1, Math.min(1, event.gamma / 25)); pointer.ty = Math.max(-1, Math.min(1, (event.beta - 50) / 30)); };
  const orientation = typeof DeviceOrientationEvent !== 'undefined' && typeof (DeviceOrientationEvent as unknown as { requestPermission?: unknown }).requestPermission !== 'function' && matchMedia('(pointer: coarse)').matches;
  addEventListener('pointermove', move, { passive: true }); addEventListener('scroll', scrolled, { passive: true }); scrolled();
  if (orientation) addEventListener('deviceorientation', tilted);
  document.addEventListener('visibilitychange', start);
  // Shaders compile before the first frame, in parallel where the driver supports KHR_parallel_shader_compile,
  // for the final and the entrance (transparent) material states, so on phones neither the first frame
  // nor the end of the entrance blocks the page for seconds.
  const warm = async () => {
    await Promise.race([environmentReady, new Promise(resolve => setTimeout(resolve, 4000))]);
    if (disposed) return;
    await renderer.compileAsync(scene, camera);
    if (settled || disposed) return;
    for (const material of fading) material.transparent = true;
    await renderer.compileAsync(scene, camera);
  };
  resize();
  warm().catch(() => {}).then(() => { if (disposed) return; compiled = true; render(0); start(); });

  return {
    setTheme(next) {
      const palette = palettes[next];
      fog.color.set(palette.fog); fog.density = palette.density;
      hemi.intensity = palette.hemi; key.intensity = palette.key; back.intensity = palette.back;
      scene.environmentIntensity = environmentLevel[next]; glow.value = leafGlow[next];
      bandMaterial.uniforms.uAlpha.value = archBand[next].alpha; bandMaterial.uniforms.uSoft.value = archBand[next].soft;
      if (reduced || !frame) render(0);
    },
    dispose() {
      disposed = true; cancelAnimationFrame(frame); resizeObserver.disconnect(); intersection.disconnect();
      removeEventListener('pointermove', move); removeEventListener('scroll', scrolled); removeEventListener('deviceorientation', tilted); document.removeEventListener('visibilitychange', start);
      scene.traverse(object => {
        const mesh = object as T.Mesh; mesh.geometry?.dispose();
        for (const material of ([] as T.Material[]).concat(mesh.material ?? [])) material.dispose();
      });
      for (const texture of textures) texture.dispose();
      environment?.dispose(); leafDepth.dispose();
      renderer.dispose(); renderer.forceContextLoss();
    },
  };
}
