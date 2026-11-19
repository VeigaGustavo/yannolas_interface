import { Modal } from "../components/Modal";
import { useState } from "react";
import { Sparkles, Upload } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge, Data, Empty, Page } from "../components/Page";
import { fileAccept, fileData } from "../components/Editor";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { AgentSettings } from "../features/AgentSettings";
import { useAction } from "../hooks/useStudio";
import { id, studio } from "../services/studio";
import type { StudioData } from "../types/studio";
import { sampleReference } from "../mocks/studio";
const briefing =
  "Tema de exemplo: ramo botânico. Técnica: fine line em preto. Composição: vertical e delicada. Tamanho sugerido: 10–14 cm. Região sugerida: antebraço. Confirmar medidas e posição com o cliente.";
function AgentView({ data }: { data: StudioData }) {
  const [params, setParams] = useSearchParams();
  const [client, setClient] = useState(
    params.get("cliente") || data.clients[0]?.id || "",
  );
  const [image, setImage] = useState("");
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [review, setReview] = useState("");
  const [detail, setDetail] = useState("");
  const action = useAction();
  const pending = data.executions.filter((e) => e.status === "Pendente");
  const current = data.executions.find((e) => e.id === review);
  const analyze = async () => {
    if (!image || !client) return;
    setRunning(true);
    const runId = id();
    try {
      await action.mutateAsync({
        run: async () => {
          await new Promise((resolve) => setTimeout(resolve, 700));
          await studio.save("executions", {
            id: runId,
            title: "Análise multimodal simulada",
            detail: briefing,
            at: new Date().toISOString(),
            status: "Pendente",
            clientId: client,
            image,
          });
        },
        message: "Briefing simulado pronto para revisão.",
      });
      setReview(runId);
      setDetail(briefing);
    } catch {
      /* o mutation informa o erro */
    } finally {
      setRunning(false);
    }
  };
  return (
    <Page
      title="Agente de IA"
      description="Supervisione execuções, revise briefings e ajuste o atendimento."
      actions={
        <Button asChild>
          <Link to="/atendimento">Transferir no atendimento</Link>
        </Button>
      }
    >
      <div className="grid-two">
        <div className="stack">
          <Card className="pad stack">
            <div className="section-head">
              <div>
                <h2>Análise de referência</h2>
                <p>Demonstração de fluxo multimodal</p>
              </div>
              <Badge tone="violet">Simulação</Badge>
            </div>
            <p className="muted">
              O briefing usa atributos de exemplo fixos. A imagem selecionada é
              exibida para revisão, e seus pixels não são analisados.
            </p>
            <label className="field">
              Associar ao cliente
              <select
                value={client}
                onChange={(e) => {
                  setClient(e.target.value);
                  setParams({ cliente: e.target.value });
                }}
              >
                {data.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="inline">
              <Button
                onClick={() =>
                  setImage(
                    data.clients.find((c) => c.id === client)?.references[0] ||
                      sampleReference,
                  )
                }
              >
                Usar referência disponível
              </Button>
              <label className="button file-button">
                <Upload size={16} /> Escolher imagem
                <input
                  type="file"
                  accept={fileAccept}
                  aria-label="Escolher imagem"
                  onChange={async (e) => {
                    try {
                      setImage(await fileData(e.target.files?.[0]));
                      setError("");
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                />
              </label>
            </div>
            {error && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}
            {image && (
              <img
                className="reference"
                src={image}
                alt="Referência selecionada"
              />
            )}
            <Button
              variant="default"
              onClick={analyze}
              disabled={!image || !client || running}
            >
              <Sparkles size={16} />
              {running ? "Processando demonstração…" : "Simular análise"}
            </Button>
          </Card>
          <Card className="pad">
            <div className="section-head">
              <h2>Indicadores de supervisão</h2>
            </div>
            <div className="inline">
              <Badge>{data.executions.length} execuções</Badge>
              <Badge tone="amber">{pending.length} em revisão</Badge>
              <Badge tone="green">
                {data.executions.filter((e) => e.status === "Aprovado").length}{" "}
                aprovadas
              </Badge>
            </div>
          </Card>
        </div>
        <Card className="pad">
          <div className="section-head">
            <h2>Configuração do agente</h2>
          </div>
          <AgentSettings settings={data.settings} />
        </Card>
      </div>
      <Card className="pad dashboard-bottom">
        <div className="section-head">
          <h2>Histórico de execuções e decisões</h2>
        </div>
        {data.executions.length ? (
          data.executions.map((e) => (
            <div className="list-row" key={e.id}>
              <span className="metric-icon violet">
                <Sparkles size={16} />
              </span>
              <div>
                <strong>{e.title}</strong>
                <small>{e.detail}</small>
                <small>{new Date(e.at).toLocaleString("pt-BR")}</small>
              </div>
              <Badge
                tone={
                  e.status === "Pendente"
                    ? "amber"
                    : e.status === "Aprovado"
                      ? "green"
                      : "violet"
                }
              >
                {e.status}
              </Badge>
              {e.status === "Pendente" && (
                <Button
                  onClick={() => {
                    setReview(e.id);
                    setDetail(e.detail);
                  }}
                >
                  Revisar
                </Button>
              )}
            </div>
          ))
        ) : (
          <Empty>Nenhuma execução registrada.</Empty>
        )}
      </Card>
      {current && (
        <Modal title="Revisar briefing simulado" close={() => setReview("")}>
          <div className="stack">
            {current.image && (
              <img
                className="reference"
                src={current.image}
                alt="Referência para revisão"
              />
            )}
            <div className="inline">
              <Badge tone="violet">Fine line</Badge>
              <Badge>Preto</Badge>
              <Badge>Botânico</Badge>
              <Badge>10–14 cm</Badge>
            </div>
            <p>
              Ao aprovar, o briefing corrigido e a referência serão adicionados
              ao CRM de{" "}
              {data.clients.find((c) => c.id === current.clientId)?.name}.
            </p>
            <label className="field">
              Briefing estruturado
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
              />
            </label>
            <div className="inline">
              {[false, true].map((approve) => (
                <Button
                  key={String(approve)}
                  variant={approve ? "default" : "danger"}
                  disabled={action.isPending || !detail.trim()}
                  onClick={async () => {
                    try {
                      await action.mutateAsync({
                        run: () =>
                          studio.review(current.id, detail.trim(), approve),
                        message: approve
                          ? "Briefing aprovado e CRM atualizado."
                          : "Sugestão rejeitada.",
                      });
                      setReview("");
                    } catch {
                      /* o mutation informa o erro */
                    }
                  }}
                >
                  {approve ? "Aprovar atualização" : "Rejeitar sugestão"}
                </Button>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </Page>
  );
}
export default function Agent() {
  return <Data>{(data) => <AgentView data={data} />}</Data>;
}
