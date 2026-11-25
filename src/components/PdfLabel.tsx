export function PdfLabel({ documento }: { documento: string }) {
  return <><span className="pdf-action-desktop">Baixar {documento}</span><span className="pdf-action-mobile">Compartilhar PDF</span></>;
}
