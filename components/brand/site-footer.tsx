export function SiteFooter() {
  return (
    <footer className="border-t border-brand-border py-8 text-center text-xs text-brand-muted">
      <p>
        Sorteos powered by{" "}
        <a
          href="https://worldbinary.pro/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-primary hover:underline"
        >
          World Binary
        </a>
        . Los premios se canjean directamente con tu educador o con World Binary.
      </p>
    </footer>
  );
}
