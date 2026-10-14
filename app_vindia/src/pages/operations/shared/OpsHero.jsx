/* CEO-style gradient hero used at the top of the Operations dashboards.
   Styles live in styles/opsTheme.css. */
export default function OpsHero({ eyebrow, title, subtitle, actions }) {
  return (
    <section className="ops-hero">
      <div className="ops-hero-main">
        {eyebrow && <p className="ops-hero-eyebrow">{eyebrow}</p>}
        <h1 className="ops-hero-title">{title}</h1>
        {subtitle && <p className="ops-hero-sub">{subtitle}</p>}
      </div>
      {actions && <div className="ops-hero-actions">{actions}</div>}
    </section>
  );
}
