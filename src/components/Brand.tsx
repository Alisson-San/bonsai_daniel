// Header and footer show the logo at about 100px: a 400px WebP is enough even at 3x density.
// Lazy loading skips the theme's hidden variant (display: none) until the theme switches.
export default function Brand({ hero = false }: { hero?: boolean }) {
  const sizes = hero ? '(max-width: 800px) 90vw, 640px' : '100px';
  return <span className={`official-brand ${hero ? 'brand-hero' : 'brand-small'}`}>
    <img className="brand-dark" src="/images/logo_escuro.jpeg" srcSet="/images/logo_escuro-400.webp 400w, /images/logo_escuro.jpeg 1586w" sizes={sizes} loading="lazy" decoding="async" alt="Bonsai Daniel Bourscheid" width="1586" height="992" />
    <img className="brand-light" src="/images/logo_claro.jpeg" srcSet="/images/logo_claro-400.webp 400w, /images/logo_claro.jpeg 1586w" sizes={sizes} loading="lazy" decoding="async" alt="Bonsai Daniel Bourscheid" width="1586" height="992" />
  </span>;
}
