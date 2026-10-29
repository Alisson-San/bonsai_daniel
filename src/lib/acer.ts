// Seven serrated lobes radiate from the petiole; shared by Canvas and SVG assets.
export const acerOutline = 'M0 29 C1 22 2 14 1 9 L-4 12 -7 11 -12 15 -12 11 -19 13 -17 9 -27 10 -23 5 -30 3 -24 0 -29 -5 -21 -4 -23 -10 -16 -7 -17 -18 -12 -15 -12 -22 -8 -16 -7 -9 -5 -15 -7 -21 -4 -20 -3 -28 0 -35 3 -28 4 -20 7 -21 5 -15 7 -9 8 -16 12 -22 12 -15 17 -18 16 -7 23 -10 21 -4 29 -5 24 0 30 3 23 5 27 10 17 9 19 13 12 11 12 15 7 11 4 12 2 9 C4 17 3 23 2 29 Z';
export const acerVeins = 'M1 11 L0 -29 M0 8 L-12 -17 M0 8 L12 -17 M0 8 L-23 -3 M0 8 L23 -3 M0 8 L-21 9 M0 8 L21 9 M0 -13 L-4 -19 M0 -13 L4 -19 M-8 -8 L-15 -10 M8 -8 L15 -10 M-12 3 L-19 0 M12 3 L19 0';

// Palmate Japanese-maple leaf as in the logo: seven pointed lobes forming a full star, lightly serrated.
// Centred on the palm at (x, y); `size` is the length of the central lobe; `width` is each lobe's half-width at its
// base (radians): .3 gives broad lobes, about .19 the slender ones of the logo's crown.
export function palmateLeaf(x: number, y: number, size: number, width = .3) {
  const lobes = [-128, -86, -43, 0, 43, 86, 128].map((deg, i) => ({ a: deg * Math.PI / 180, length: [.56, .82, .95, 1, .95, .82, .56][i] }));
  const at = (a: number, r: number) => [x + Math.sin(a) * r * size, y - Math.cos(a) * r * size] as const;
  const path = new Path2D();
  path.moveTo(...at(-Math.PI * .88, .2));
  lobes.forEach((lobe, i) => {
    // Wide at the base, tapering to a sharp tip, with small serrations along both edges.
    for (let k = 0; k <= 5; k++) { const f = k / 5; path.lineTo(...at(lobe.a - width * Math.pow(1 - f, .85) - (k % 2 ? .015 : 0), .36 + (lobe.length - .36) * f)); }
    for (let k = 4; k >= 0; k--) { const f = k / 5; path.lineTo(...at(lobe.a + width * Math.pow(1 - f, .85) + (k % 2 ? .015 : 0), .36 + (lobe.length - .36) * f)); }
    const next = lobes[i + 1];
    path.lineTo(...at(next ? (lobe.a + next.a) / 2 : Math.PI * .88, next ? .4 : .2));
  });
  path.closePath();
  return { path, veins: lobes.map(lobe => at(lobe.a, lobe.length * .9)) };
}

// Sugar-maple leaf on the logo's plate, traced from the logo image (logo pixels: x from the logo's axis, y from the
// leaf's top tip; blade 89 px wide and 83 px tall). The stem, from (0.5, 72) to (0, 100), is drawn separately.
export const plateLeafOutline = 'M0.2 0.0 1.0 0.0 1.3 0.3 1.7 2.3 3.3 5.1 3.9 7.3 5.3 9.3 6.0 11.3 7.3 13.1 7.7 14.5 10.3 17.9 11.0 18.1 12.7 16.6 13.1 15.6 13.3 13.8 13.9 12.1 14.3 11.7 15.6 11.5 15.8 13.0 15.0 18.8 14.3 21.0 14.2 22.5 14.0 32.0 13.3 37.5 13.3 39.5 13.7 40.1 14.3 40.1 15.0 39.6 15.8 38.3 21.0 33.1 21.7 31.8 22.7 31.1 23.7 29.8 24.7 29.2 26.0 28.6 26.8 28.7 27.8 29.3 30.0 29.1 34.2 27.8 38.2 27.2 40.7 25.8 43.8 24.8 44.7 24.8 45.0 25.1 45.0 26.3 43.9 27.8 43.5 29.1 42.7 30.0 41.9 31.8 41.1 36.1 39.5 40.1 39.5 42.1 41.3 44.0 41.5 44.5 41.3 45.3 38.8 47.2 37.8 47.7 37.0 48.6 34.8 50.1 32.2 53.1 30.5 54.6 28.7 55.8 28.2 56.5 28.2 57.0 28.7 57.2 32.2 57.8 33.5 58.8 36.0 59.8 36.8 60.6 39.5 61.7 40.8 63.1 43.0 64.0 43.3 64.6 42.7 65.2 37.0 66.3 35.0 67.4 31.7 68.7 29.8 70.0 28.0 72.5 26.8 73.3 25.0 73.5 21.0 73.0 16.5 72.8 13.0 72.1 11.8 72.3 11.6 73.0 12.5 74.0 14.8 79.0 15.0 80.5 14.7 81.3 14.3 81.6 10.0 79.1 9.2 78.0 7.8 77.1 7.0 76.0 5.7 74.8 4.8 73.5 -1.3 73.3 -5.0 73.5 -5.2 76.1 -6.8 77.4 -8.2 78.0 -9.2 79.0 -12.0 79.8 -14.0 81.2 -17.0 81.8 -19.3 82.8 -20.5 82.3 -20.8 81.6 -20.8 80.8 -20.3 78.8 -19.0 76.8 -18.2 74.5 -18.2 73.5 -18.5 73.0 -19.0 72.8 -21.8 72.8 -27.8 71.6 -31.5 69.8 -34.2 69.2 -37.2 67.7 -39.2 67.1 -43.0 65.4 -43.7 64.8 -43.3 64.0 -40.5 63.2 -35.7 61.1 -33.7 59.8 -30.0 58.6 -27.8 57.4 -27.2 56.5 -27.4 55.8 -28.7 54.3 -32.1 51.1 -33.2 49.8 -36.5 47.4 -37.8 46.0 -38.2 45.1 -38.2 44.3 -36.9 42.3 -36.7 40.3 -38.1 36.8 -38.7 34.6 -40.5 31.5 -41.0 29.6 -41.6 29.1 -42.1 28.1 -42.3 27.0 -42.0 26.3 -41.5 26.3 -40.3 26.9 -37.0 27.7 -35.0 28.6 -28.2 29.6 -25.5 29.2 -24.2 27.3 -23.3 27.2 -22.8 27.5 -21.7 29.3 -20.8 30.0 -20.3 31.0 -19.2 31.8 -18.3 33.3 -14.5 37.6 -12.2 39.9 -11.8 39.9 -11.7 38.8 -12.2 37.0 -12.7 32.0 -13.0 22.8 -13.5 20.3 -14.3 19.1 -14.5 17.0 -14.2 16.3 -13.5 16.0 -12.3 16.9 -10.0 17.9 -9.0 17.6 -8.3 16.1 -7.0 15.0 -6.5 13.5 -3.7 9.3 -2.5 6.3 -1.0 4.0 -0.5 1.0Z';
export const plateLeafVeins: [number, number, number, number][] = [[1, 72, 1, 6], [1, 62, -30, 30], [1, 62, 31, 30], [1, 69, -30, 60], [1, 69, 31, 59]];
