/**
 * Category line art, drawn once per product family and reused by every model.
 * Each drawing lives in a 240 × 180 box. Shapes are painted back-to-front with
 * an opaque fill so hidden edges disappear without boolean geometry. The
 * `line` variant prints as black line art on white board; the `shaded`
 * variant fills with a metal gradient for the open-box mock-up.
 */
const n = v => +v.toFixed(2);
const ell = (cx, cy, rx, ry, rot, attrs = '') => `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}"${rot ? ` transform="rotate(${n(rot)} ${n(cx)} ${n(cy)})"` : ''} ${attrs}/>`;

/** Point on a rotated ellipse; used to find cylinder silhouette tangents. */
function onEllipse(cx, cy, rx, ry, rot, t) {
  const r = rot * Math.PI / 180, x = rx * Math.cos(t), y = ry * Math.sin(t);
  return [cx + x * Math.cos(r) - y * Math.sin(r), cy + x * Math.sin(r) + y * Math.cos(r)];
}

/**
 * Side band of a cylinder between two parallel ellipses offset by (dx,dy):
 * the silhouette points are where the ellipse tangent is parallel to the axis.
 */
function cylinderBand(cx, cy, rx, ry, rot, dx, dy, fill) {
  const r = rot * Math.PI / 180;
  const lx = dx * Math.cos(r) + dy * Math.sin(r), ly = -dx * Math.sin(r) + dy * Math.cos(r);
  const t = Math.atan2(-ry * lx, rx * ly);
  const a = onEllipse(cx, cy, rx, ry, rot, t), b = onEllipse(cx, cy, rx, ry, rot, t + Math.PI);
  const p = ([x, y]) => `${n(x)},${n(y)}`;
  // Back and front ellipses are painted separately; the band only has to fill
  // the parallelogram between the two silhouette lines.
  const a2 = [a[0] + dx, a[1] + dy], b2 = [b[0] + dx, b[1] + dy];
  return `<path d="M${p(a)}L${p(a2)}L${p(b2)}L${p(b)}Z" fill="${fill}" stroke="none"/>`
    + `<path d="M${p(a)}L${p(a2)}M${p(b)}L${p(b2)}" fill="none"/>`;
}

function palette(shaded) {
  return shaded
    ? { body: 'url(#metalBody)', face: 'url(#metalFace)', dark: 'url(#metalDark)', bore: '#55595e', hatch: '#6b7075', seal: '#2f3236' }
    : { body: '#fff', face: '#fff', dark: '#fff', bore: '#fff', hatch: '#1d1d1d', seal: '#fff' };
}

function rodEnd(shaded) {
  const c = palette(shaded);
  // Female-threaded shank running down-left from the eye, end face toward the viewer.
  const hx = 166, hy = 60, hr = -18;
  const ax = -0.839, ay = 0.544, nx = -ay, ny = ax, R = 27;
  const end = [64, 126], collar = 15;
  const at = (o, along, side) => `${n(o[0] - ax * along + nx * side)},${n(o[1] - ay * along + ny * side)}`;
  const rot = Math.atan2(ny, nx) * 180 / Math.PI;
  let s = '';
  s += `<path d="M${at([hx, hy], 0, R)}L${at(end, 0, R)}L${at(end, 0, -R)}L${at([hx, hy], 0, -R)}Z" fill="${c.body}"/>`;
  s += `<path d="M${at(end, collar, R)}A${R} 15 ${n(rot)} 0 0 ${at(end, collar, -R)}" fill="none" stroke-width="1.3"/>`;
  s += ell(end[0], end[1], R, 15, rot, `fill="${c.face}"`);
  s += ell(end[0], end[1], 15.5, 8.6, rot, `fill="${c.bore}"`);
  for (const k of [13, 10.5, 8]) s += ell(end[0] + ax * 1.5, end[1] + ay * 1.5, k, k * 0.55, rot, 'fill="none" stroke-width=".75"');
  // Eye housing: rear ring, side band, front ring, then the ball and its bore.
  s += ell(hx - 14, hy + 10, 56, 53, hr, `fill="${c.dark}"`);
  s += cylinderBand(hx, hy, 56, 53, hr, -14, 10, c.dark);
  s += ell(hx, hy, 56, 53, hr, `fill="${c.face}"`);
  s += ell(hx - 1, hy + 1, 39, 37, hr, `fill="${c.dark}"`);
  s += ell(hx - 2, hy + 2, 35, 33, hr, `fill="${c.body}"`);
  s += `<path d="M${hx - 31},${hy - 6}C${hx - 30},${hy - 26} ${hx - 14},${hy - 32} ${hx + 2},${hy - 31}" fill="none" stroke-width=".9"/>`;
  s += ell(hx - 3, hy + 3, 18, 17, hr, `fill="${c.bore}"`);
  s += `<path d="M${hx - 19},${hy + 10}A18 17 ${hr} 0 1 ${hx + 8},${hy - 13}" fill="none" stroke-width=".9"/>`;
  return s;
}

function radialSpherical(shaded) {
  const c = palette(shaded);
  const fx = 104, fy = 94, rx = 58, ry = 70, rot = 8, dx = 44, dy = -8;
  let s = '';
  // Outer ring: rear face, cylinder band, front face.
  s += ell(fx + dx, fy + dy, rx, ry, rot, `fill="${c.dark}"`);
  s += cylinderBand(fx, fy, rx, ry, rot, dx, dy, c.body);
  s += ell(fx, fy, rx, ry, rot, `fill="${c.face}"`);
  // Lubrication hole on the outer cylindrical surface.
  s += ell(fx + dx * 0.5 + 54, fy + dy * 0.5 + 38, 3.6, 5.2, rot + 18, `fill="${c.bore}"`);
  // Inner ring sphere sitting in the outer ring bore.
  s += ell(fx + 3, fy - 1, 40, 49, rot, `fill="${c.dark}"`);
  s += ell(fx - 2, fy + 1, 37, 46, rot, `fill="${c.body}"`);
  s += `<path d="M${fx - 30},${fy - 26}C${fx - 40},${fy - 4} ${fx - 38},${fy + 24} ${fx - 24},${fy + 40}" fill="none" stroke-width=".9"/>`;
  // Bore with the rear edge visible inside.
  s += ell(fx - 4, fy + 2, 22, 28, rot, `fill="${c.bore}"`);
  s += `<path d="M${fx - 22},${fy + 12}A21 27 ${rot} 0 1 ${fx + 12},${fy - 20}" fill="none" stroke-width="1"/>`;
  s += ell(fx - 4, fy + 2, 26, 32, rot, 'fill="none" stroke-width=".9"');
  // Brand etched on the outer ring face.
  s += `<text x="0" y="0" transform="translate(${fx + 26} ${fy - 50}) rotate(48)" font-family="Bahnschrift,'Segoe UI',Arial,sans-serif" font-size="10" font-weight="600" fill="${shaded ? '#5d6166' : '#1d1d1d'}" stroke="none" letter-spacing=".6">LINOX</text>`;
  return s;
}

function deepGroove(shaded) {
  const c = palette(shaded);
  const fx = 106, fy = 92, rx = 60, ry = 70, rot = 6, dx = 34, dy = -6;
  let s = '';
  s += ell(fx + dx, fy + dy, rx, ry, rot, `fill="${c.dark}"`);
  s += cylinderBand(fx, fy, rx, ry, rot, dx, dy, c.body);
  s += ell(fx, fy, rx, ry, rot, `fill="${c.face}"`);
  s += ell(fx, fy, 50, 59, rot, 'fill="none" stroke-width="1"');
  // Rubber seal between the rings (2RS).
  s += ell(fx, fy, 47, 56, rot, `fill="${c.seal}"`);
  s += ell(fx, fy, 33, 40, rot, `fill="${c.face}"`);
  s += ell(fx, fy, 40, 48, rot, 'fill="none" stroke-width=".8" stroke-dasharray="2 2.4"');
  // Inner ring and bore.
  s += ell(fx, fy, 23, 28, rot, `fill="${c.bore}"`);
  s += `<path d="M${fx - 21},${fy + 10}A22 27 ${rot} 0 1 ${fx + 11},${fy - 21}" fill="none" stroke-width="1"/>`;
  s += `<text x="0" y="0" transform="translate(${fx + 22} ${fy - 50}) rotate(44)" font-family="Bahnschrift,'Segoe UI',Arial,sans-serif" font-size="7" font-weight="600" fill="${shaded ? '#5d6166' : '#1d1d1d'}" stroke="none">LINOX</text>`;
  return s;
}

const DRAW = { rod: rodEnd, radial: radialSpherical, deep: deepGroove };

export const ILLUSTRATION_VIEWBOX = '0 0 240 180';

export function illustrationSymbols() {
  const gradients = `<linearGradient id="metalBody" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#eef0f2"/><stop offset=".45" stop-color="#b9bdc2"/><stop offset="1" stop-color="#868b91"/></linearGradient>
<linearGradient id="metalFace" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f7f8f9"/><stop offset=".6" stop-color="#cfd2d6"/><stop offset="1" stop-color="#a3a8ad"/></linearGradient>
<linearGradient id="metalDark" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#a7abb0"/><stop offset="1" stop-color="#6f7479"/></linearGradient>`;
  const symbols = Object.entries(DRAW).map(([key, draw]) => [false, true].map(shaded =>
    `<symbol id="pic-${key}${shaded ? '-shaded' : ''}" viewBox="${ILLUSTRATION_VIEWBOX}" overflow="visible"><g stroke="#1d1d1d" stroke-width="${shaded ? 1.1 : 1.9}" stroke-linejoin="round" stroke-linecap="round">${draw(shaded)}</g></symbol>`
  ).join('\n')).join('\n');
  return gradients + symbols;
}
