// Seven serrated lobes radiate from the petiole; shared by Canvas and SVG assets.
export const acerOutline = 'M0 29 C1 22 2 14 1 9 L-4 12 -7 11 -12 15 -12 11 -19 13 -17 9 -27 10 -23 5 -30 3 -24 0 -29 -5 -21 -4 -23 -10 -16 -7 -17 -18 -12 -15 -12 -22 -8 -16 -7 -9 -5 -15 -7 -21 -4 -20 -3 -28 0 -35 3 -28 4 -20 7 -21 5 -15 7 -9 8 -16 12 -22 12 -15 17 -18 16 -7 23 -10 21 -4 29 -5 24 0 30 3 23 5 27 10 17 9 19 13 12 11 12 15 7 11 4 12 2 9 C4 17 3 23 2 29 Z';
export const acerVeins = 'M1 11 L0 -29 M0 8 L-12 -17 M0 8 L12 -17 M0 8 L-23 -3 M0 8 L23 -3 M0 8 L-21 9 M0 8 L21 9 M0 -13 L-4 -19 M0 -13 L4 -19 M-8 -8 L-15 -10 M8 -8 L15 -10 M-12 3 L-19 0 M12 3 L19 0';

// Palmate Japanese-maple leaf as in the logo: seven broad, pointed lobes forming a full star, lightly serrated.
// Centred on the palm at (x, y); `size` is the length of the central lobe.
export function palmateLeaf(x: number, y: number, size: number) {
  const lobes = [-128, -86, -43, 0, 43, 86, 128].map((deg, i) => ({ a: deg * Math.PI / 180, length: [.56, .82, .95, 1, .95, .82, .56][i] }));
  const at = (a: number, r: number) => [x + Math.sin(a) * r * size, y - Math.cos(a) * r * size] as const;
  const path = new Path2D();
  path.moveTo(...at(-Math.PI * .88, .2));
  lobes.forEach((lobe, i) => {
    // Broad lobe: wide at the base, tapering to a sharp tip, with small serrations along both edges.
    const width = .3;
    for (let k = 0; k <= 5; k++) { const f = k / 5; path.lineTo(...at(lobe.a - width * Math.pow(1 - f, .85) - (k % 2 ? .015 : 0), .36 + (lobe.length - .36) * f)); }
    for (let k = 4; k >= 0; k--) { const f = k / 5; path.lineTo(...at(lobe.a + width * Math.pow(1 - f, .85) + (k % 2 ? .015 : 0), .36 + (lobe.length - .36) * f)); }
    const next = lobes[i + 1];
    path.lineTo(...at(next ? (lobe.a + next.a) / 2 : Math.PI * .88, next ? .4 : .2));
  });
  path.closePath();
  return { path, veins: lobes.map(lobe => at(lobe.a, lobe.length * .9)) };
}
