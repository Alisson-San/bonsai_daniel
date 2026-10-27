export default function Brand({ hero = false }: { hero?: boolean }) {
  return <span className={`official-brand ${hero ? 'brand-hero' : 'brand-small'}`}>
    <img className="brand-dark" src="/images/logo_escuro.jpeg" alt="Bonsai Daniel Bourscheid" width="1586" height="992" />
    <img className="brand-light" src="/images/logo_claro.jpeg" alt="Bonsai Daniel Bourscheid" width="1586" height="992" />
  </span>;
}
