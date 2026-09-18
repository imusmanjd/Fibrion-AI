export default function NotFound() {
  return (
    <div className="empty-state" style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <h2>404 - Page Not Found</h2>
      <p style={{ color: "var(--color-muted)", marginTop: "8px" }}>The requested resource could not be found.</p>
    </div>
  );
}
