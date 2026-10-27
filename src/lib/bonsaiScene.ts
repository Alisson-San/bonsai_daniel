import type * as T from 'three';
import { acerOutline, palmateLeaf } from './acer.ts';
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
  dark: { fog: '#0A140E', density: .022, hemi: .34, key: 3.4, back: 2.2, environment: .34, gold: '#D4AF37', shadow: .62 },
  light: { fog: '#F7F5F0', density: .012, hemi: .42, key: 2.4, back: 1, environment: .32, gold: '#A8862A', shadow: .34 },
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

// Palmate Japanese-maple leaf (seven narrow pointed lobes, fine serration), as in the logo. Tinted per instance.
function leafTexture(THREE: Three, size: number) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  const c = canvas.getContext('2d')!, s = size * .5, palm = { x: size / 2, y: size * .62 };
  const { path, veins } = palmateLeaf(palm.x, palm.y, s);
  const fill = c.createRadialGradient(palm.x, palm.y, 2, palm.x, palm.y, s);
  fill.addColorStop(0, '#ffffff'); fill.addColorStop(.7, '#f0f0f0'); fill.addColorStop(1, '#d2d2d2');
  c.fillStyle = fill; c.fill(path);
  c.save(); c.clip(path);
  c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = size / 170;
  for (const [vx, vy] of veins) { c.beginPath(); c.moveTo(palm.x, palm.y); c.lineTo(vx, vy); c.stroke(); }
  c.strokeStyle = 'rgba(0,0,0,.28)'; c.lineWidth = size / 110; c.stroke(path);
  c.restore();
  c.strokeStyle = '#d8c8c0'; c.lineWidth = size / 110; c.beginPath(); c.moveTo(palm.x, palm.y); c.lineTo(palm.x, size * .98); c.stroke();
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
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

function canvasTexture(THREE: Three, size: number, paint: (context: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  const context = canvas.getContext('2d'); if (context) paint(context);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// The logo nameplate: notched corners, double gold border, "BONSAI" over "DANIEL BOURSCHEID", red leaf on the bottom tab.
const PLAQUE = { width: 2048, height: 720, top: 40, body: 330 };
// The band fits the border inset (screen-constant, so larger on small screens) plus 'BONSAI' with equal room above and below.
const plaqueLayout = (border: { outer: number; gap: number; inner: number }) => {
  const step = PLAQUE.top + border.outer + border.gap + border.inner + 16 + 60 + 16;
  return { step, bottom: step + PLAQUE.body };
};
// Border in screen pixels; converted to canvas pixels from the plaque's on-screen width on every resize.
export const PLAQUE_BORDER = { outer: 2.5, inner: 1.25, gap: 7 };
// The 'BONSAI' band is narrower than the body (as in the logo); the plate widens at a step on each side.
// Bottom tab: short straight sides, concave fillets where it meets the body, rounded shield bottom.
const SHAPE = { left: 40, right: PLAQUE.width - 40, notch: 56, bandNotch: 44, band: .6, tab: 130, tabDrop: 24, tabRadius: 143, fillet: 26 };
const bandHalf = SHAPE.band * (SHAPE.right - SHAPE.left) / 2;
type Border = { gold: string; outer: number; inner: number; gap: number };

// One outline, offset inward by `inset`: straight edges move parallel, the concave corner arcs stay
// concentric with the corner (radius notch + inset) and the tab corners come from intersecting the offset edges.
function plaqueOutline(c: CanvasRenderingContext2D, inset: number, layout: { step: number; bottom: number }) {
  const { left: L, right: R, notch, bandNotch, tab, tabDrop, tabRadius: r, fillet: f } = SHAPE, T = PLAQUE.top, S = layout.step, B = layout.bottom, cx = PLAQUE.width / 2, i = inset;
  const bL = cx - bandHalf, bR = cx + bandHalf;
  // Concave corners stay concentric with their corner point; step corners come from intersecting the offset edges.
  const rho = notch + i, d = Math.sqrt(rho * rho - i * i), rb = bandNotch + i, db = Math.sqrt(rb * rb - i * i);
  // Tab bottom: two arcs tangent to the tab sides, meeting on the centre line in a soft point.
  // Offsets are concentric: shield arcs shrink (r - i), the concave fillets grow (f + i).
  const joinY = B + tabDrop, theta = Math.acos((r - tab) / (r - i));
  c.beginPath();
  // Narrow band: top corners, sides down to the step.
  c.moveTo(bL + i, T + db);
  c.arc(bL, T, rb, Math.atan2(db, i), Math.atan2(i, db), true);
  c.lineTo(bR - db, T + i);
  c.arc(bR, T, rb, Math.atan2(i, -db), Math.atan2(db, -i), true);
  c.lineTo(bR - i, S + i);
  // Step out to the body, whose top corners are notched too.
  c.lineTo(R - d, S + i);
  c.arc(R, S, rho, Math.atan2(i, -d), Math.atan2(d, -i), true);
  c.lineTo(R - i, B - d);
  c.arc(R, B, rho, Math.atan2(-d, -i), Math.atan2(-i, -d), true);
  c.lineTo(cx + tab + f, B - i);
  c.arc(cx + tab + f, B + f, f + i, -Math.PI / 2, -Math.PI, true);
  c.lineTo(cx + tab - i, joinY);
  c.arc(cx + tab - r, joinY, r - i, 0, theta);
  c.arc(cx - tab + r, joinY, r - i, Math.PI - theta, Math.PI);
  c.lineTo(cx - tab + i, B + f);
  c.arc(cx - tab - f, B + f, f + i, 0, -Math.PI / 2, true);
  c.lineTo(L + d, B - i);
  c.arc(L, B, rho, Math.atan2(-i, d), Math.atan2(-d, i), true);
  c.lineTo(L + i, S + d);
  c.arc(L, S, rho, Math.atan2(d, i), Math.atan2(i, d), true);
  c.lineTo(bL + i, S + i);
  c.closePath();
}

const mixHex = (a: string, b: string, t: number) => '#' + [1, 3, 5].map(k => Math.round(parseInt(a.slice(k, k + 2), 16) * (1 - t) + parseInt(b.slice(k, k + 2), 16) * t).toString(16).padStart(2, '0')).join('');

function paintPlaque(c: CanvasRenderingContext2D, border: Border) {
  const { width: W, top: T } = PLAQUE, { left: L, right: R, notch } = SHAPE, cx = W / 2, layout = plaqueLayout(border), S = layout.step, B = layout.bottom;
  c.clearRect(0, 0, W, PLAQUE.height);
  const plate = c.createLinearGradient(0, T, 0, PLAQUE.height);
  plate.addColorStop(0, '#1d1d1a'); plate.addColorStop(.55, '#0f100e'); plate.addColorStop(1, '#090a09');
  plaqueOutline(c, 0, layout); c.fillStyle = plate; c.fill();
  // Border: the arch's gold, with only a gentle diagonal highlight from the key light (upper left).
  const metal = c.createLinearGradient(L, T, R * .7, PLAQUE.height);
  metal.addColorStop(0, mixHex(border.gold, '#fff3c4', .18)); metal.addColorStop(.45, border.gold); metal.addColorStop(1, mixHex(border.gold, '#000000', .12));
  c.strokeStyle = metal; c.lineJoin = 'miter'; c.miterLimit = 12;
  c.lineWidth = border.outer; plaqueOutline(c, border.outer / 2, layout); c.stroke();
  c.lineWidth = border.inner; plaqueOutline(c, border.outer + border.gap + border.inner / 2, layout); c.stroke();
  const gold = (y0: number, y1: number) => { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#F6E7B0'); g.addColorStop(.45, '#D4AF37'); g.addColorStop(1, '#8E6B1E'); return g; };
  // Spaced capitals drawn one by one (canvas letterSpacing is not universal).
  const spaced = (text: string, y: number, size: number, spacing: number) => {
    c.font = `600 ${size}px "Cormorant Garamond", Georgia, serif`;
    const widths = [...text].map(ch => c.measureText(ch).width), total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
    let x = cx - total / 2;
    [...text].forEach((ch, i) => { c.fillText(ch, x, y); x += widths[i] + spacing; });
    return total;
  };
  // Band text: cap height ~60 px, 16 px of room above (below the inner border) and below.
  const baseline = S - 16;
  c.textBaseline = 'alphabetic'; c.fillStyle = gold(baseline - 64, baseline + 2);
  const word = spaced('BONSAI', baseline, 96, 30), ruleStart = cx - bandHalf + 70, ruleEnd = cx + bandHalf - 70;
  c.fillRect(ruleStart, baseline - 31, cx - word / 2 - 40 - ruleStart, 2.5); c.fillRect(cx + word / 2 + 40, baseline - 31, ruleEnd - (cx + word / 2 + 40), 2.5);
  // Condensed like the logo lettering and always inside the inner border, with clear room above and below:
  // the border is screen-constant, so on phones it takes more of the plate and the name shrinks to fit.
  const inset = border.outer + border.gap + border.inner;
  c.font = '600 232px "Cormorant Garamond", Georgia, serif';
  const capHeight = c.measureText('DANIEL BOURSCHEID').actualBoundingBoxAscent || 146;
  const size = 232 * Math.min(1, (B - S - 2 * (inset + 36)) / capHeight), cap = capHeight * size / 232;
  c.font = `600 ${size}px "Cormorant Garamond", Georgia, serif`;
  const nameWidth = c.measureText('DANIEL BOURSCHEID').width, fit = Math.min(.8, (R - L - 2 * (inset + 72)) / nameWidth);
  c.save(); c.translate(cx, 0); c.scale(fit, 1); c.textAlign = 'center';
  const nameBaseline = (S + B + cap) / 2;
  c.fillStyle = 'rgba(0,0,0,.65)'; c.fillText('DANIEL BOURSCHEID', 4, nameBaseline + 6);
  c.fillStyle = gold(nameBaseline - cap, nameBaseline + 6); c.fillText('DANIEL BOURSCHEID', 0, nameBaseline);
  c.restore();
  c.save(); c.translate(cx, B + 70); c.scale(1.3, 1.3); c.fillStyle = '#D9232E'; c.fill(new Path2D(acerOutline)); c.restore();
}

export function createBonsaiScene(THREE: Three, canvas: HTMLCanvasElement, { theme, reduced, entrance: animateEntrance = true, onFirstFrame, onCanopy }: Options): BonsaiScene {
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

  // ---- Low oval pot in dark graphite stone, glossier rim, discreet gold maple leaf on the front.
  const potGroup = new THREE.Group(); world.add(potGroup);
  const stoneNoise = noise2(5);
  const stone = keep(surfaceMaps(THREE, compact ? 256 : 512, 2, (u, v) => {
    const n = stoneNoise(u * 10, v * 5, 10, 5, 5), pit = stoneNoise(u * 60, v * 30, 60, 30, 1) > .8 ? .4 : 0;
    const shade = 36 + n * 22 - pit * 14;
    return { h: n - pit, r: shade, g: shade * 1.02, b: shade * 1.03 };
  }));
  const potMaterial = new THREE.MeshPhysicalMaterial({ map: stone.map, normalMap: stone.normalMap, normalScale: new THREE.Vector2(.5, .5), roughness: .62, clearcoat: .45, clearcoatRoughness: .3 });
  const potHeight = .3;
  const profile = [[0, 0], [.97, 0], [1.01, .03], [1.05, .2], [1.09, .26], [1.1, potHeight], [1.04, potHeight + .01], [.99, potHeight - .01], [0, potHeight - .01]].map(([x, y]) => new THREE.Vector2(x, y));
  const pot = new THREE.Mesh(new THREE.LatheGeometry(profile, 120), potMaterial); pot.scale.z = .64; pot.castShadow = pot.receiveShadow = true; potGroup.add(pot);
  const emblem = canvasTexture(THREE, 128, c => { c.translate(64, 66); c.scale(1.7, 1.7); c.fillStyle = '#ffffff'; c.fill(new Path2D(acerOutline)); }); textures.push(emblem);
  const emblemMaterial = new THREE.MeshStandardMaterial({ color: 0xD4AF37, alphaMap: emblem, transparent: true, metalness: .9, roughness: .35, depthWrite: false });
  const badge = new THREE.Mesh(new THREE.PlaneGeometry(.16, .16), emblemMaterial);
  badge.position.set(0, .15, 1.07 * .64 + .006); badge.rotation.x = -.15; potGroup.add(badge);

  // Moss layer on the substrate.
  const mossNoise = noise2(11);
  const mossMaps = keep(surfaceMaps(THREE, compact ? 256 : 512, 3, (u, v) => {
    const clump = mossNoise(u * 14, v * 14, 14, 14, 5), fine = mossNoise(u * 90, v * 90, 90, 90, 2), h = clump * .7 + fine * .3;
    return { h, r: 34 + h * 40, g: 52 + h * 62, b: 22 + h * 22 };
  }));
  const soilMaterial = new THREE.MeshStandardMaterial({ map: mossMaps.map, normalMap: mossMaps.normalMap, roughness: 1 });
  const soil = new THREE.Mesh(new THREE.CircleGeometry(1, 72), soilMaterial);
  soil.rotation.x = -Math.PI / 2; soil.scale.y = .64; soil.position.y = potHeight - .02; soil.receiveShadow = true; potGroup.add(soil);
  const mossMaterial = new THREE.MeshStandardMaterial({ roughness: 1 });
  const moss = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), mossMaterial, compact ? 160 : 360);
  const dummy = new THREE.Object3D(), color = new THREE.Color();
  for (let i = 0; i < moss.count; i++) {
    const a = rand() * Math.PI * 2, r = .2 + Math.sqrt(rand()) * .74;
    dummy.position.set(Math.cos(a) * r, potHeight - .02, Math.sin(a) * r * .62); dummy.rotation.set(rand(), rand(), rand());
    const size = .025 + rand() * .03; dummy.scale.set(size, size * .4, size); dummy.updateMatrix(); moss.setMatrixAt(i, dummy.matrix);
    moss.setColorAt(i, color.setHSL(.24 + rand() * .05, .45 + rand() * .15, .16 + rand() * .1));
  }
  moss.receiveShadow = true; potGroup.add(moss);

  // Soft contact shadow right under the pot so it reads as resting, without any visible disc or edge.
  const contactTexture = canvasTexture(THREE, 256, c => {
    const g = c.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.32, 'rgba(0,0,0,.75)'); g.addColorStop(.6, 'rgba(0,0,0,.25)'); g.addColorStop(.85, 'rgba(0,0,0,.05)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, 256, 256);
  }); textures.push(contactTexture);
  const contactMaterial = new THREE.MeshBasicMaterial({ map: contactTexture, transparent: true, depthWrite: false, opacity: palettes[theme].shadow, fog: false });
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.9), contactMaterial);
  contact.rotation.x = -Math.PI / 2; contact.position.y = -.004; contact.renderOrder = -1; world.add(contact);

  // ---- Tree: twisted trunk with spiral ridges, exposed roots over the moss, wide low dome canopy.
  const tree = new THREE.Group(); tree.position.y = potHeight - .02; world.add(tree);
  const barkNoise = noise2(23);
  const barkMaps = keep(surfaceMaps(THREE, texel, 4.5, (u, v) => {
    const fissure = Math.pow(barkNoise(u * 16, v * 2.5, 16, 3, 4), 1.4), grain = barkNoise(u * 40, v * 6, 40, 6, 2), h = fissure * .75 + grain * .25;
    const shade = 70 + h * 95;
    return { h, r: shade * 1.02, g: shade * .88, b: shade * .72 };
  }));
  const bark = new THREE.MeshStandardMaterial({ map: barkMaps.map, normalMap: barkMaps.normalMap, normalScale: new THREE.Vector2(1.5, 1.5), vertexColors: true, roughness: .9 });
  const limbs: T.BufferGeometry[] = [];
  const trunk = new THREE.CatmullRomCurve3([new V(0, -.06, 0), new V(.16, .36, .05), new V(-.1, .76, .1), new V(.12, 1.12, -.04), new V(.02, 1.42, .02), new V(.06, 1.62, 0)], false, 'centripetal');
  const trunkRadius = (t: number) => .08 + (.46 - .08) * Math.pow(1 - t, 1.6);
  limbs.push(limb(THREE, trunk, compact ? 70 : 110, compact ? 18 : 28, { radius: trunkRadius, twist: 12, ridges: 7, depth: .11, phase: .4 }));

  // Roots start inside the trunk, arch over the moss and sink below the surface (no flat buttress plates).
  const rootCount = compact ? 9 : 12;
  for (let i = 0; i < rootCount; i++) {
    const a = i / rootCount * Math.PI * 2 + (rand() - .5) * .3, reach = .62 + rand() * .3, lift = .08 + rand() * .07;
    const dir = (r: number, y: number) => new V(Math.cos(a) * r, y, Math.sin(a) * r * .62);
    const root = new THREE.CatmullRomCurve3([dir(.05, .3), dir(.2, .14 + lift), dir(reach * .55, .05 + lift * .5), dir(reach * .85, .0), dir(reach, -.06)], false, 'centripetal');
    limbs.push(limb(THREE, root, 26, 10, { radius: t => .16 * Math.pow(1 - t, 1.25) + .014, twist: 5, ridges: 4, depth: .09, phase: i }));
    if (rand() < .7) {
      const start = root.getPointAt(.45), side = a + (rand() < .5 ? .5 : -.5), sub = reach * .35;
      const branch = new THREE.CatmullRomCurve3([start, start.clone().add(new V(Math.cos(side) * sub * .5, -.01, Math.sin(side) * sub * .3)), start.clone().add(new V(Math.cos(side) * sub, -.06, Math.sin(side) * sub * .6))], false, 'centripetal');
      limbs.push(limb(THREE, branch, 12, 6, { radius: t => .035 * (1 - t * .7), twist: 2, ridges: 3, depth: .05, phase: i }));
    }
  }

  // Canopy as in the logo: a rounded triangular mound (peak slightly left of the trunk, sides falling diagonally,
  // right side longer and lower), built from overlapping tufts in layers. The underside stays open near the trunk.
  const mound = { peakX: -.15, peakY: 3.0, base: .6, left: 2.3, right: 2.55, depth: 1.3 };
  const side = (x: number) => Math.min(1, Math.abs(x - mound.peakX) / (x < mound.peakX ? mound.left : mound.right));
  const crownTop = (x: number) => { const t = side(x); return mound.base + (mound.peakY - mound.base) * (1 - Math.pow(t, 1.12)) * (x > mound.peakX ? .92 : 1) - (x > mound.peakX ? .22 * t * t : 0); };
  const underside = (x: number) => mound.base + .95 * Math.pow(1 - side(x), 1.4);
  const clusters: { center: T.Vector3; normal: T.Vector3; inner: boolean }[] = [];
  const tuftCount = compact ? 90 : 150;
  const core = new V(mound.peakX, (mound.base + mound.peakY) / 2 - .2, 0);
  for (let attempts = 0; clusters.length < tuftCount && attempts < 6000; attempts++) {
    const x = mound.peakX - mound.left + rand() * (mound.left + mound.right), top = crownTop(x), bottom = underside(x);
    if (top - bottom < .25) continue;
    const y = bottom + Math.pow(rand(), .6) * (top - bottom), depth = mound.depth * Math.sqrt(Math.max(.05, 1 - side(x) ** 2)) * (.45 + .55 * (y - bottom) / (top - bottom));
    const z = (rand() * 2 - 1) * depth;
    // Outer layer hugs the surface; one in four tufts sits deeper to fill the volume.
    const inner = clusters.length % 4 === 3;
    const center = new V(x, y, z);
    const out = center.clone().sub(core); out.y *= 1.3;
    if (!inner) center.addScaledVector(out.normalize(), .12);
    else center.lerp(core, .3);
    clusters.push({ center, normal: out.normalize(), inner });
  }
  // Kept for the branch layout and the entrance wave below.
  const dome = { x: mound.peakX, y: mound.base, left: mound.left, right: mound.right, height: mound.peakY - mound.base };
  // Primary branches leave the upper trunk twisting toward the dome; every cluster hangs from a thin twig.
  const primaries: T.CatmullRomCurve3[] = [];
  const primaryCount = 8;
  for (let i = 0; i < primaryCount; i++) {
    const t = .5 + i / primaryCount * .46, start = trunk.getPointAt(t), a = i * 2.39996 + .6, elevation = .3 + rand() * .45;
    const d = new V(Math.cos(a) * Math.cos(elevation), Math.sin(elevation), Math.sin(a) * Math.cos(elevation) * .8).normalize();
    const reach = (d.x > 0 ? dome.right : dome.left) * .7;
    const points = [start.clone()];
    for (let k = 1; k <= 4; k++) points.push(start.clone().addScaledVector(d, reach * k / 4).add(new V((rand() - .5) * .14, Math.sin(k * 1.3) * .08 - k * .02, (rand() - .5) * .14)));
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal'); primaries.push(curve);
    const r0 = trunkRadius(t) * .55;
    limbs.push(limb(THREE, curve, 20, 9, { radius: u => r0 * (1 - u * .78), twist: 5, ridges: 5, depth: .07, phase: i }));
  }
  const samples = primaries.flatMap((curve, index) => Array.from({ length: 12 }, (_, k) => ({ point: curve.getPointAt(.25 + k / 11 * .75), radius: trunkRadius(.5 + index / primaryCount * .46) * .55 * (1 - (.25 + k / 11 * .75) * .78) })));
  for (const cluster of clusters) {
    let best = samples[0], distance = Infinity;
    for (const sample of samples) { const d = sample.point.distanceTo(cluster.center); if (d < distance) { distance = d; best = sample; } }
    const mid = best.point.clone().lerp(cluster.center, .5).add(new V((rand() - .5) * .12, -.05 + (rand() - .5) * .06, (rand() - .5) * .12));
    const r0 = Math.max(.008, Math.min(best.radius * .55, .03));
    limbs.push(limb(THREE, new THREE.CatmullRomCurve3([best.point.clone(), mid, cluster.center.clone()]), 6, 4, { radius: u => r0 * (1 - u * .7), depth: 0 }));
  }
  const wood = new THREE.Mesh(mergeGeometries(THREE, limbs), bark); wood.castShadow = wood.receiveShadow = true; tree.add(wood);

  // ---- Leaves: instanced palmate leaves facing out and toward the viewer (never edge-on),
  // revealed in a wave on entrance and moved by a light breeze in the vertex shader.
  const leafMap = leafTexture(THREE, compact ? 128 : 256); textures.push(leafMap);
  const leafShape = leafGeometry(THREE);
  const perOuter = compact ? 22 : 30, perInner = compact ? 14 : 20;
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
  const leafMaterial = new THREE.MeshStandardMaterial({ map: leafMap, alphaTest: .5, side: THREE.DoubleSide, roughness: .85, metalness: 0, toneMapped: false });
  const glow = { value: theme === 'dark' ? .3 : .16 };
  leafMaterial.onBeforeCompile = shader => {
    patch(shader);
    shader.uniforms.uGlow = glow;
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uGlow;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\nfloat facing = abs(dot(normalize(normal), normalize(vViewPosition)));\ntotalEmissiveRadiance += diffuseColor.rgb * uGlow * (.5 + pow(1. - facing, 2.));');
  };
  const leafDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: leafMap, alphaTest: .5 });
  leafDepth.onBeforeCompile = patch;
  const foliage = new THREE.InstancedMesh(leafShape, leafMaterial, count);
  foliage.customDepthMaterial = leafDepth; foliage.castShadow = true; foliage.receiveShadow = true;
  const toViewer = new V(0, .25, 1).normalize(), basis = new THREE.Matrix4(), axisX = new V(), axisY = new V(), normal = new V(), position = new V(), quaternion = new THREE.Quaternion(), scale = new V();
  const crown = new V(mound.peakX, mound.peakY, 0);
  // Shades: pure Acer red dominant, deep reds inside and underneath, a few lighter leaves where the key light hits (upper left).
  const deep = [new THREE.Color('#7A1016'), new THREE.Color('#8C141B'), new THREE.Color('#9E1820')], red = new THREE.Color('#D9232E'), shade = new THREE.Color('#B51C26'), light = new THREE.Color('#E42C31');
  const gauss = () => (rand() + rand() + rand() - 1.5) / 1.5;
  let index = 0;
  for (const cluster of clusters) for (let k = 0, n = cluster.inner ? perInner : perOuter; k < n; k++) {
    // Dense in the middle of each tuft, looser at its edges.
    position.set(gauss() * .34, gauss() * .22, gauss() * .34).add(cluster.center);
    normal.copy(cluster.normal).multiplyScalar(.9).add(new V(0, .5, 0)).add(new V((rand() - .5) * .9, (rand() - .5) * .5, (rand() - .5) * .9)).normalize();
    if (normal.dot(toViewer) < .3 && normal.dot(toViewer) > -.3) normal.lerp(toViewer, .55).normalize();
    axisY.copy(cluster.normal).add(new V((rand() - .5) * 1.2, .3, (rand() - .5) * 1.2)); axisY.addScaledVector(normal, -axisY.dot(normal)).normalize();
    axisX.crossVectors(axisY, normal).normalize();
    basis.makeBasis(axisX, axisY, normal); quaternion.setFromRotationMatrix(basis);
    scale.setScalar(cluster.inner ? .36 + rand() * .12 : .4 + rand() * .15);
    foliage.setMatrixAt(index, basis.compose(position, quaternion, scale));
    if (cluster.inner) color.copy(deep[Math.floor(rand() * deep.length)]);
    else {
      const lit = (position.y - mound.base) / (mound.peakY - mound.base) * .7 - (position.x - mound.peakX) / (mound.left + mound.right) * .6 + position.z * .12 + (rand() - .5) * .35;
      color.copy(lit > .62 && rand() < .5 ? light : lit < .05 ? shade : red);
    }
    foliage.setColorAt(index, color);
    delays[index++] = Math.min(.95, position.distanceTo(crown) / 3.2 * .85 + rand() * .1);
  }
  leafShape.setAttribute('aDelay', new THREE.InstancedBufferAttribute(delays, 1));
  tree.add(foliage);

  // ---- Logo frame: a near-semicircle (slightly wider than tall) in a double gold line, landing on the nameplate.
  // The pot rests on the plate: its top edge covers the pot's foot.
  const plateTop = -.17, archStretch = 1, archGap = .085, archCenterY = plateTop + .14;
  let fit = 0;
  for (const cluster of clusters) {
    const x = cluster.center.x / archStretch, y = cluster.center.y + tree.position.y - archCenterY;
    // Margin covers the leaf spread inside each tuft plus the leaf size.
    fit = Math.max(fit, Math.hypot(x, Math.max(y, 0)) + .62);
  }
  const archRadius = fit + .08, archWidth = archRadius * archStretch;
  // As in the logo, the arch closes outside the narrow 'BONSAI' band: its feet land on the body's shoulders,
  // 45% of the way from the band edge to the body edge. The body is sized from that.
  const footCanvas = (SHAPE.band + .45 * (1 - SHAPE.band)) * (SHAPE.right - SHAPE.left) / 2;
  const plaqueWidth = archWidth / footCanvas * PLAQUE.width, plaqueHeight = plaqueWidth * PLAQUE.height / PLAQUE.width;
  const planeTop = plateTop + PLAQUE.top / PLAQUE.height * plaqueHeight;
  // Arch sides run down behind the shoulders (lower than the band top, whose height follows the border width),
  // so they meet the plate's outer edge with no gap at any screen size.
  const rimY = plateTop - 200 / PLAQUE.width * plaqueWidth;
  const canopyBox = new THREE.Box3();
  for (const cluster of clusters) canopyBox.expandByPoint(cluster.center);
  canopyBox.expandByScalar(.45); canopyBox.translate(new V(0, tree.position.y, 0));
  const archMaterial = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(palettes[theme].gold) }, uDraw: { value: settled ? 1 : 0 } },
    vertexShader: 'varying float vU;varying vec3 vN;varying vec3 vView;void main(){vU=uv.x;vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vView=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
    fragmentShader: 'uniform vec3 uColor;uniform float uDraw;varying float vU;varying vec3 vN;varying vec3 vView;void main(){float ends=1.;float drawn=step(abs(vU-.5)*2.,uDraw);float sheen=.78+.42*pow(max(dot(vN,vView),0.),3.);gl_FragColor=vec4(uColor*sheen,ends*drawn);\n#include <colorspace_fragment>\n}',
    transparent: true, depthWrite: false,
  });
  const arch = new THREE.Group(); rig.add(arch);
  // Outer line sampled with its outward normals; the inner line is the same path offset inward, so the gap is constant.
  const outer: T.Vector3[] = [], normals: T.Vector3[] = [];
  for (let k = 0; k <= 6; k++) { outer.push(new V(-archWidth, rimY + (archCenterY - rimY) * k / 6, 0)); normals.push(new V(-1, 0, 0)); }
  for (let k = 1; k < 120; k++) {
    const a = Math.PI - k / 120 * Math.PI;
    outer.push(new V(Math.cos(a) * archWidth, archCenterY + Math.sin(a) * archRadius, 0));
    normals.push(new V(Math.cos(a) / archWidth, Math.sin(a) / archRadius, 0).normalize());
  }
  for (let k = 0; k <= 6; k++) { outer.push(new V(archWidth, archCenterY - (archCenterY - rimY) * k / 6, 0)); normals.push(new V(1, 0, 0)); }
  const inner = outer.map((point, k) => point.clone().addScaledVector(normals[k], -archGap));
  for (const [line, thickness] of [[outer, .016], [inner, .011]] as const) {
    arch.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(line as T.Vector3[], false, 'catmullrom', .1), 360, thickness, 8, false), archMaterial));
  }
  const plaqueCanvas = document.createElement('canvas'); plaqueCanvas.width = PLAQUE.width; plaqueCanvas.height = PLAQUE.height;
  const plaqueContext = plaqueCanvas.getContext('2d')!;
  const border: Border = { gold: palettes[theme].gold, outer: 9, inner: 4.5, gap: 25 };
  let painted = '';
  const repaintPlaque = () => {
    const key = `${border.gold}|${border.outer.toFixed(1)}|${border.inner.toFixed(1)}|${border.gap.toFixed(1)}|${document.fonts?.check('600 100px "Cormorant Garamond"')}`;
    if (key === painted) return;
    painted = key; paintPlaque(plaqueContext, border); plaqueTexture.needsUpdate = true;
  };
  const plaqueTexture = new THREE.CanvasTexture(plaqueCanvas); plaqueTexture.colorSpace = THREE.SRGBColorSpace; plaqueTexture.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy()); textures.push(plaqueTexture);
  repaintPlaque();
  document.fonts?.load('600 100px "Cormorant Garamond"').then(() => { if (disposed) return; repaintPlaque(); if (reduced || !frame) render(0); }).catch(() => {});
  const plaqueMaterial = new THREE.MeshBasicMaterial({ map: plaqueTexture, transparent: true, toneMapped: false, fog: false });
  const plaque = new THREE.Group(); rig.add(plaque);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(plaqueWidth, plaqueHeight), plaqueMaterial); plate.position.y = planeTop - plaqueHeight / 2; plaque.add(plate);
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
  const bottom = planeTop - plaqueHeight, top = archCenterY + archRadius + .05;
  const composition = { centerY: (top + bottom) / 2, halfHeight: (top - bottom) / 2, halfWidth: plaqueWidth / 2 + .05 };
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  // The entrance runs on wall-clock time, so slow devices still finish it in 1.5 s.
  let frameAverage = 1 / 60, frameCount = 0;
  let frame = 0, visible = true, first = true, elapsed = 0, previous = 0, entrance = settled ? 99 : 0, entranceStart = 0;
  const fading: T.Material[] = [potMaterial, soilMaterial, mossMaterial, bark, emblemMaterial, plaqueMaterial];
  const resize = () => {
    const host = canvas.parentElement, box = host?.getBoundingClientRect(); if (!host || !box) return;
    const stage = (host.querySelector('.hero-stage') ?? host).getBoundingClientRect();
    const width = Math.max(1, box.width), height = Math.max(1, box.height), aspect = width / height;
    const stageShare = Math.min(1, Math.max(.2, stage.height / height)), stageCenter = (stage.top + stage.height / 2 - box.top) / height;
    renderer.setSize(width, height, false);
    camera.aspect = aspect;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    // The composition is the hero's cover: centred and as large as the stage allows.
    const distance = Math.max(composition.halfHeight / (tan * .93 * stageShare), composition.halfWidth / (tan * aspect * .94));
    const lookY = composition.centerY - (.5 - stageCenter) * 2 * tan * distance;
    const plaquePixels = plaqueWidth / (2 * tan * distance * aspect) * width, perPixel = PLAQUE.width / Math.max(plaquePixels, 1);
    border.outer = PLAQUE_BORDER.outer * perPixel; border.inner = PLAQUE_BORDER.inner * perPixel; border.gap = PLAQUE_BORDER.gap * perPixel;
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
      for (const material of fading) { material.transparent = appear < 1 || material === emblemMaterial || material === plaqueMaterial; material.opacity = appear; }
      potGroup.scale.setScalar(.96 + .04 * appear); tree.scale.setScalar(.96 + .04 * appear);
      motion.uReveal.value = Math.max(0, (entrance - .45) / 1) * 1.25;
      if (entrance >= 2) { for (const material of fading) { material.transparent = material === emblemMaterial || material === plaqueMaterial; material.opacity = 1; material.needsUpdate = true; } motion.uReveal.value = 2; }
    }
    if (!reduced) motion.uTime.value = elapsed;
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 2.5); pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 2.5);
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
  addEventListener('pointermove', move, { passive: true }); document.addEventListener('visibilitychange', start);
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
      scene.environmentIntensity = environmentLevel[next]; glow.value = next === 'dark' ? .3 : .16;
      archMaterial.uniforms.uColor.value.set(palette.gold); border.gold = palette.gold; repaintPlaque(); emblemMaterial.color.set(palette.gold); contactMaterial.opacity = palette.shadow;
      if (reduced || !frame) render(0);
    },
    dispose() {
      disposed = true; cancelAnimationFrame(frame); resizeObserver.disconnect(); intersection.disconnect();
      removeEventListener('pointermove', move); document.removeEventListener('visibilitychange', start);
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
