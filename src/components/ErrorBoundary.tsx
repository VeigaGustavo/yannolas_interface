import { Component, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";

/** Isola um erro de renderização na tela atual sem derrubar o painel. */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="page">
        <div className="empty" role="alert">
          <AlertCircle />
          <h2>Não foi possível abrir esta tela.</h2>
          <p>
            Algum dado salvo neste navegador está inconsistente. Tente outra
            tela ou recarregue a página.
          </p>
        </div>
      </div>
    );
  }
}
