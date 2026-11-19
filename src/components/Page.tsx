import type { ReactNode } from "react";
import { AlertCircle, Inbox } from "lucide-react";
import { useStudio } from "../hooks/useStudio";
import type { StudioData } from "../types/studio";
import { Button } from "./ui/button";
export function Page({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {actions && <div className="page-actions">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
export function Data({
  children,
}: {
  children: (data: StudioData) => ReactNode;
}) {
  const q = useStudio();
  if (q.isPending)
    return (
      <div className="page" role="status" aria-label="Carregando dados">
        <div className="skeleton sk-title" />
        <div className="metrics">
          {Array.from({ length: 4 }, (_, i) => (
            <div className="skeleton" key={i} />
          ))}
        </div>
        <div className="skeleton sk-chart" />
      </div>
    );
  if (q.isError)
    return (
      <div className="page">
        <div className="empty" role="alert">
          <AlertCircle />
          <h2>Não foi possível carregar o estúdio</h2>
          <p>{q.error.message}</p>
          <Button onClick={() => q.refetch()}>Tentar novamente</Button>
        </div>
      </div>
    );
  return children(q.data);
}
export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="empty">
      <Inbox size={24} />
      <p>{children}</p>
    </div>
  );
}
export function Badge({
  children,
  tone = "",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={"badge " + tone}>{children}</span>;
}
