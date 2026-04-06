import Link from "next/link";

export default function LandingPage() {
  return (
    <main style={pageStyle}>
      <section style={landingCardStyle}>
        <p style={eyebrowStyle}>Entrada contextual · B2B</p>
        <h1 style={titleStyle}>Mira si Summa encaixa amb la teva operativa econòmica.</h1>
        <p style={copyStyle}>
          Diagnòstic curt per a entitats que perden temps entre tresoreria, quotes,
          remeses i seguiment del banc.
        </p>
        <Link href="/diagnostic" style={ctaStyle}>
          Inicia el diagnòstic
        </Link>
      </section>
    </main>
  );
}

const pageStyle = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: "24px",
  background:
    "radial-gradient(circle at top right, rgba(225, 237, 225, 0.95), transparent 32%), linear-gradient(180deg, #f6f1e6 0%, #ffffff 48%, #edf4ef 100%)",
} as const;

const landingCardStyle = {
  maxWidth: 760,
  width: "100%",
  background: "rgba(255, 255, 255, 0.92)",
  border: "1px solid rgba(23, 49, 32, 0.12)",
  borderRadius: 28,
  boxShadow: "0 24px 70px rgba(33, 42, 35, 0.08)",
  padding: "34px 30px",
} as const;

const eyebrowStyle = {
  color: "#6d5430",
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: "0.12em",
  margin: 0,
  textTransform: "uppercase",
} as const;

const titleStyle = {
  fontFamily: '"Iowan Old Style", "Palatino Linotype", serif',
  fontSize: "clamp(2.4rem, 4vw, 4.2rem)",
  lineHeight: 1.05,
  margin: "16px 0 12px",
} as const;

const copyStyle = {
  fontSize: 18,
  lineHeight: 1.65,
  margin: "0 0 24px",
  maxWidth: 620,
} as const;

const ctaStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  background: "#173120",
  color: "#fff",
  fontWeight: 800,
  padding: "14px 18px",
  textDecoration: "none",
} as const;
