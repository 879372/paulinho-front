export function LoadingState() {
  return <div className="page-loading" aria-label="Carregando" aria-busy="true">
    <div className="skeleton sk-title"/><div className="skeleton sk-line"/>
    <div className="sk-grid"><div className="skeleton sk-card"/><div className="skeleton sk-card"/></div>
    <div className="skeleton sk-block"/>
  </div>;
}
