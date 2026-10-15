import { lookupCountry } from '../domain/models/countries';

/**
 * Banderas en SVG.
 *
 * Los emoji de bandera NO sirven: Windows no trae esos glifos y pinta las dos letras del
 * código ("ES" en vez de la bandera). Comprobado midiendo el ancho del par de indicadores
 * regionales en la propia aplicación. Como tampoco se pueden cargar imágenes externas, las
 * banderas se dibujan aquí.
 *
 * Son simplificaciones deliberadas: a 20×14 px lo que hace reconocible una bandera son sus
 * franjas y su color, no el escudo. El nombre del país va siempre en `title`/`aria-label`,
 * así que la identificación nunca depende solo del dibujo.
 */

type Stripe = { color: string; weight?: number };

interface FlagSpec {
  /** Franjas horizontales, de arriba abajo. */
  h?: Stripe[];
  /** Franjas verticales, de izquierda a derecha. */
  v?: Stripe[];
  /** Color de fondo si no hay franjas. */
  bg?: string;
  /** Formas encima de las franjas. */
  extra?: React.ReactNode;
}

const W = 20;
const H = 14;

const circle = (cx: number, cy: number, r: number, fill: string, key?: string) => (
  <circle key={key} cx={cx} cy={cy} r={r} fill={fill} />
);

const cross = (bg: string, arm: string) => (
  <>
    <rect x="0" y="0" width={W} height={H} fill={bg} />
    <rect x="0" y={H / 2 - 1.4} width={W} height="2.8" fill={arm} />
    <rect x="6.2" y="0" width="2.8" height={H} fill={arm} />
  </>
);

const FLAGS: Record<string, FlagSpec> = {
  DE: { h: [{ color: '#000000' }, { color: '#DD0000' }, { color: '#FFCE00' }] },
  NL: { h: [{ color: '#AE1C28' }, { color: '#FFFFFF' }, { color: '#21468B' }] },
  ES: {
    h: [
      { color: '#AA151B', weight: 1 },
      { color: '#F1BF00', weight: 2 },
      { color: '#AA151B', weight: 1 },
    ],
  },
  IT: { v: [{ color: '#008C45' }, { color: '#F4F5F0' }, { color: '#CD212A' }] },
  FR: { v: [{ color: '#002395' }, { color: '#FFFFFF' }, { color: '#ED2939' }] },
  BE: { v: [{ color: '#111111' }, { color: '#FDDA24' }, { color: '#EF3340' }] },
  PT: {
    v: [
      { color: '#046A38', weight: 2 },
      { color: '#DA291C', weight: 3 },
    ],
    extra: circle(8, 7, 2.6, '#FFE900'),
  },
  DK: { bg: '#C8102E', extra: cross('#C8102E', '#FFFFFF') },
  'GB-ENG': { bg: '#FFFFFF', extra: cross('#FFFFFF', '#CE1124') },
  TR: {
    bg: '#E30A17',
    extra: (
      <>
        {circle(8, 7, 3.4, '#FFFFFF', 'a')}
        {circle(9.4, 7, 2.7, '#E30A17', 'b')}
        {circle(13, 7, 1.2, '#FFFFFF', 'c')}
      </>
    ),
  },
  BR: {
    bg: '#009B3A',
    extra: (
      <>
        <polygon points="10,1.6 18.4,7 10,12.4 1.6,7" fill="#FEDF00" />
        {circle(10, 7, 2.6, '#002776', 'c')}
      </>
    ),
  },
  AR: {
    h: [{ color: '#74ACDF' }, { color: '#FFFFFF' }, { color: '#74ACDF' }],
    extra: circle(10, 7, 1.5, '#F6B40E'),
  },
  CO: {
    h: [
      { color: '#FCD116', weight: 2 },
      { color: '#003893', weight: 1 },
      { color: '#CE1126', weight: 1 },
    ],
  },
  EC: {
    h: [
      { color: '#FFDD00', weight: 2 },
      { color: '#0072CE', weight: 1 },
      { color: '#EF3340', weight: 1 },
    ],
  },
  VE: { h: [{ color: '#FFCD00' }, { color: '#00247D' }, { color: '#CF142B' }] },
  BO: { h: [{ color: '#D52B1E' }, { color: '#F9E300' }, { color: '#007A33' }] },
  PY: { h: [{ color: '#D52B1E' }, { color: '#FFFFFF' }, { color: '#0038A8' }] },
  UY: {
    bg: '#FFFFFF',
    extra: (
      <>
        <rect x="0" y="2.8" width={W} height="1.4" fill="#0038A8" />
        <rect x="0" y="5.6" width={W} height="1.4" fill="#0038A8" />
        <rect x="0" y="8.4" width={W} height="1.4" fill="#0038A8" />
        <rect x="0" y="11.2" width={W} height="1.4" fill="#0038A8" />
        <rect x="0" y="0" width="8" height="7" fill="#FFFFFF" />
        {circle(4, 3.5, 1.8, '#F6B40E', 'sun')}
      </>
    ),
  },
  CL: {
    h: [{ color: '#FFFFFF' }, { color: '#FFFFFF' }, { color: '#D52B1E' }],
    extra: (
      <>
        <rect x="0" y="7" width={W} height="7" fill="#D52B1E" />
        <rect x="0" y="0" width="7" height="7" fill="#0039A6" />
        <polygon
          points="3.5,1.6 4.2,3.4 6.1,3.4 4.6,4.6 5.2,6.4 3.5,5.3 1.8,6.4 2.4,4.6 0.9,3.4 2.8,3.4"
          fill="#FFFFFF"
        />
      </>
    ),
  },
  AT: { h: [{ color: '#C8102E' }, { color: '#FFFFFF' }, { color: '#C8102E' }] },
  PL: { h: [{ color: '#FFFFFF' }, { color: '#DC143C' }] },
  GR: {
    h: Array.from({ length: 9 }, (_, i) => ({ color: i % 2 ? '#FFFFFF' : '#0D5EAF' })),
    extra: (
      <>
        <rect x="0" y="0" width="7.8" height="7.8" fill="#0D5EAF" />
        <rect x="0" y="3.12" width="7.8" height="1.56" fill="#FFFFFF" />
        <rect x="3.12" y="0" width="1.56" height="7.8" fill="#FFFFFF" />
      </>
    ),
  },
  NO: {
    bg: '#BA0C2F',
    extra: (
      <>
        <rect x="0" y="5" width={W} height="4" fill="#FFFFFF" />
        <rect x="5.2" y="0" width="4" height={H} fill="#FFFFFF" />
        <rect x="0" y="6" width={W} height="2" fill="#00205B" />
        <rect x="6.2" y="0" width="2" height={H} fill="#00205B" />
      </>
    ),
  },
  SE: { bg: '#006AA7', extra: cross('#006AA7', '#FECC00') },
  CH: {
    bg: '#DA291C',
    extra: (
      <>
        <rect x="8.6" y="3" width="2.8" height="8" fill="#FFFFFF" />
        <rect x="6" y="5.6" width="8" height="2.8" fill="#FFFFFF" />
      </>
    ),
  },
  'GB-SCT': {
    bg: '#005EB8',
    extra: (
      <>
        <line x1="0" y1="0" x2={W} y2={H} stroke="#FFFFFF" strokeWidth="2.4" />
        <line x1={W} y1="0" x2="0" y2={H} stroke="#FFFFFF" strokeWidth="2.4" />
      </>
    ),
  },
  MX: { v: [{ color: '#006847' }, { color: '#FFFFFF' }, { color: '#CE1126' }], extra: circle(10, 7, 1.8, '#8C6D2C') },
  US: {
    h: Array.from({ length: 13 }, (_, i) => ({ color: i % 2 ? '#FFFFFF' : '#B22234' })),
    extra: <rect x="0" y="0" width="8" height="7.54" fill="#3C3B6E" />,
  },
  EU: {
    bg: '#003399',
    extra: (
      <>
        <circle cx="10" cy="7" r="3.6" fill="none" stroke="#FFCC00" strokeWidth="1.6" strokeDasharray="1 1.35" />
      </>
    ),
  },
  UN: {
    bg: '#5B92E5',
    extra: (
      <>
        {circle(10, 7, 4, '#FFFFFF', 'a')}
        {circle(10, 7, 2.4, '#5B92E5', 'b')}
      </>
    ),
  },
};

function stripes(list: Stripe[], vertical: boolean) {
  const total = list.reduce((a, s) => a + (s.weight ?? 1), 0);
  const span = vertical ? W : H;
  let offset = 0;
  return list.map((s, i) => {
    const size = ((s.weight ?? 1) / total) * span;
    const el = vertical ? (
      <rect key={i} x={offset} y={0} width={size} height={H} fill={s.color} />
    ) : (
      <rect key={i} x={0} y={offset} width={W} height={size} fill={s.color} />
    );
    offset += size;
    return el;
  });
}

/** Bandera de un país, por su nombre tal como está en la hoja LIGAS. */
export function Flag({ country, className = '' }: { country: string; className?: string }) {
  const c = lookupCountry(country);
  const spec = c ? FLAGS[c.code] : undefined;
  const label = c?.name ?? country;

  if (!spec) {
    // País no cubierto: un hueco neutro con el nombre accesible, nunca una bandera falsa.
    return (
      <span
        title={label}
        aria-label={label}
        className={`inline-block h-3.5 w-5 shrink-0 rounded-[2px] border border-border bg-surface-3 ${className}`}
      />
    );
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={20}
      height={14}
      role="img"
      aria-label={label}
      className={`inline-block shrink-0 rounded-[2px] ${className}`}
      style={{ boxShadow: 'inset 0 0 0 1px rgb(0 0 0 / 0.15)' }}
    >
      <title>{label}</title>
      {spec.bg && <rect x="0" y="0" width={W} height={H} fill={spec.bg} />}
      {spec.h && stripes(spec.h, false)}
      {spec.v && stripes(spec.v, true)}
      {spec.extra}
    </svg>
  );
}
