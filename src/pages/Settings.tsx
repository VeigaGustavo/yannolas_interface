import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { z } from "zod";
import { Data, Page } from "../components/Page";
import { Editor, options } from "../components/Editor";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { workingHours } from "../features/calendar";
import { useAction } from "../hooks/useStudio";
import { required, time } from "../schemas/forms";
import { studio } from "../services/studio";
import { useInterface } from "../stores/interface";
import type { StudioData } from "../types/studio";
const tabs = ["Estúdio", "Aparência"];
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
