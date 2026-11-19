import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { z } from "zod";
import { Badge, Data, Page } from "../components/Page";
import { Editor, options } from "../components/Editor";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { workingHours } from "../features/calendar";
import { AgentSettings } from "../features/AgentSettings";
import { useAction } from "../hooks/useStudio";
import { required, time } from "../schemas/forms";
import { studio } from "../services/studio";
import { useInterface } from "../stores/interface";
import type { StudioData } from "../types/studio";
const tabs = ["Estúdio", "Agente", "Integrações", "Aparência"];
function SettingsView({ data }: { data: StudioData }) {
  const [tab, setTab] = useState(tabs[0]);
  const action = useAction();
  const { theme, setTheme, accent, setAccent } = useInterface();
  const settings = data.settings;
  return (
    <Page
      title="Configurações"
      description="Gerencie o perfil, as preferências e a aparência do estúdio."
    >
      <div
        className="toolbar module-toolbar"
        aria-label="Seções de configurações"
      >
        {tabs.map((t) => (
          <Button
            key={t}
            aria-pressed={t === tab}
            variant={t === tab ? "default" : "outline"}
            onClick={() => setTab(t)}
          >
            {t}
          </Button>
        ))}
      </div>
      {tab === "Estúdio" && (
        <Card className="pad settings-card">
          <div className="section-head">
            <h2>Perfil e operação do estúdio</h2>
          </div>
          <Editor
            fields={[
              { name: "studio", label: "Nome do estúdio" },
              { name: "artist", label: "Nome do tatuador" },
              {
                name: "hours",
                label: "Descrição do funcionamento",
                wide: true,
              },
              { name: "opensAt", label: "Abertura", type: "time" },
              { name: "closesAt", label: "Fechamento", type: "time" },
              {
                name: "policies",
                label: "Políticas de agendamento",
                type: "textarea",
                wide: true,
              },
              {
                name: "notifications",
                label: "Notificações de lembretes na central",
                options: options(["Ativas", "Pausadas"]),
                wide: true,
              },
            ]}
            values={{
              studio: settings.studio,
              artist: settings.artist,
              hours: settings.hours,
              ...workingHours(settings),
              policies: settings.policies,
              notifications: settings.notifications ? "Ativas" : "Pausadas",
            }}
            schema={z
              .object({
                studio: required,
                artist: required,
                hours: required,
                opensAt: time,
                closesAt: time,
                policies: required,
                notifications: z.enum(["Ativas", "Pausadas"]),
              })
              .refine((v) => v.closesAt > v.opensAt, {
                path: ["closesAt"],
                message: "O fechamento deve ser posterior à abertura.",
              })}
            save={(v) =>
              action.mutateAsync({
                run: () =>
                  studio.settings({
                    ...settings,
                    studio: v.studio,
                    artist: v.artist,
                    hours: v.hours,
                    opensAt: v.opensAt,
                    closesAt: v.closesAt,
                    policies: v.policies,
                    notifications: v.notifications === "Ativas",
                  }),
                message: "Perfil do estúdio salvo.",
              })
            }
          />
        </Card>
      )}
      {tab === "Agente" && (
        <Card className="pad settings-card">
          <div className="section-head">
            <h2>Configuração do agente</h2>
          </div>
          <AgentSettings settings={settings} />
        </Card>
      )}
      {tab === "Integrações" && (
        <Card className="pad settings-card">
          <div className="section-head">
            <h2>Integrações futuras</h2>
          </div>
          {[
            {
              name: "Evolution API",
              text: "Eventos locais no módulo de atendimento.",
              status: "Simulada",
            },
            {
              name: "Spring Boot",
              text: "API de domínio planejada em Java.",
              status: "Planejada",
            },
            {
              name: "LangChain4j",
              text: "Orquestração e controle de ferramentas do agente.",
              status: "Planejada",
            },
            {
              name: "PostgreSQL",
              text: "Modelo relacional disponível no repositório.",
              status: "Modelo inicial",
            },
          ].map((i) => (
            <div className="list-row" key={i.name}>
              <div>
                <strong>{i.name}</strong>
                <small>{i.text}</small>
              </div>
              <Badge tone="violet">{i.status}</Badge>
            </div>
          ))}
        </Card>
      )}
      {tab === "Aparência" && (
        <Card className="pad settings-card stack">
          <h2>Tema visual</h2>
          <div className="inline">
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              aria-pressed={theme === "dark"}
              onClick={() => setTheme("dark")}
            >
              <Moon size={17} /> Escuro
            </Button>
            <Button
              variant={theme === "light" ? "default" : "outline"}
              aria-pressed={theme === "light"}
              onClick={() => setTheme("light")}
            >
              <Sun size={17} /> Claro
            </Button>
          </div>
          <label className="field">
            Cor de destaque
            <input
              type="color"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
            />
          </label>
          <div>
            <Button onClick={() => setAccent("#ff9100")}>
              Restaurar cor padrão
            </Button>
          </div>
        </Card>
      )}
    </Page>
  );
}
export default function Settings() {
  return <Data>{(data) => <SettingsView data={data} />}</Data>;
}
