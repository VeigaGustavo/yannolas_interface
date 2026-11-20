import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { z } from "zod";
import { Data, Page } from "../components/Page";
import { Editor, options } from "../components/Editor";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { workingHours } from "../features/calendar";
import { useAction, useTenant } from "../hooks/useStudio";
import { Tabs } from "../components/Tabs";
import { number, required, time } from "../schemas/forms";
import { studio } from "../services/studio";
import { useAppearance } from "../stores/interface";
import {
  benefitTypes,
  followUpReasons,
  type StudioData,
} from "../types/studio";
const tabs = [
  "Estúdio",
  "Follow-up",
  "Procedimentos",
  "Fidelidade",
  "Aparência",
] as const;
type Tab = (typeof tabs)[number];
const days = (max: number) =>
  required.refine(
    (v) => Number.isInteger(Number(v)) && Number(v) >= 0 && Number(v) <= max,
    "Use um número inteiro de dias",
  );
const followUpFields = [
  { name: "quoteDays", label: "Orçamento sem resposta (dias)" },
  { name: "postDays", label: "Pós-atendimento (dias)" },
  { name: "inactiveDays", label: "Cliente inativo após (dias)" },
  { name: "birthdayDays", label: "Aniversário (dias antes)" },
  { name: "retryDays", label: "Nova tentativa após (dias)" },
  { name: "maxAttempts", label: "Máximo de tentativas" },
] as const;

function ProceduresForm({ data }: { data: StudioData }) {
  const action = useAction();
  const [rows, setRows] = useState(
    data.settings.procedures.map((p) => ({ ...p, days: String(p.returnDays) })),
  );
  const [error, setError] = useState("");
  const save = () => {
    const clean = rows
      .map((r) => ({ name: r.name.trim(), returnDays: Number(r.days) }))
      .filter((r) => r.name);
    if (!clean.length) return setError("Cadastre ao menos um procedimento.");
    if (clean.some((r) => !Number.isInteger(r.returnDays) || r.returnDays < 1))
      return setError("Informe os dias de retorno como número inteiro.");
    setError("");
    action.mutate({
      run: () => studio.settings({ ...data.settings, procedures: clean }),
      message: "Procedimentos salvos.",
    });
  };
  return (
    <div className="stack">
      {rows.map((r, i) => (
        <div className="procedure-row" key={i}>
          <input
            aria-label={"Nome do procedimento " + (i + 1)}
            value={r.name}
            onChange={(e) =>
              setRows(
                rows.map((x, j) =>
                  j === i ? { ...x, name: e.target.value } : x,
                ),
              )
            }
          />
          <input
            aria-label={"Dias de retorno do procedimento " + (i + 1)}
            type="number"
            min={1}
            value={r.days}
            onChange={(e) =>
              setRows(
                rows.map((x, j) =>
                  j === i ? { ...x, days: e.target.value } : x,
                ),
              )
            }
          />
          <Button
            variant="ghost"
            aria-label={"Remover procedimento " + (i + 1)}
            onClick={() => setRows(rows.filter((_, j) => j !== i))}
          >
            Remover
          </Button>
        </div>
      ))}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <div className="inline wrap">
        <Button
          onClick={() =>
            setRows([...rows, { name: "", returnDays: 30, days: "30" }])
          }
        >
          Adicionar procedimento
        </Button>
        <Button variant="default" disabled={action.isPending} onClick={save}>
          Salvar procedimentos
        </Button>
      </div>
    </div>
  );
}

function SettingsView({ data }: { data: StudioData }) {
  const [tab, setTab] = useState<Tab>("Estúdio");
  const tenant = useTenant();
  const action = useAction();
  const { theme, setTheme, accent, setAccent, defaultAccent } = useAppearance();
  const settings = data.settings;
  return (
    <Page
      title="Configurações"
      description="Gerencie o perfil, as preferências e a aparência do estúdio."
    >
      <Tabs
        label="Seções de configurações"
        tabs={tabs}
        value={tab}
        onChange={setTab}
      />
      {tab === "Follow-up" && (
        <Card className="pad settings-card">
          <div className="section-head">
            <div>
              <h2>Prazos e mensagens</h2>
              <p>
                Nas mensagens, use {"{nome}"} para o primeiro nome do cliente.
              </p>
            </div>
          </div>
          <Editor
            label="Salvar prazos"
            fields={[
              ...followUpFields.map((f) => ({ ...f, type: "number" })),
              ...followUpReasons.map((r) => ({
                name: "t:" + r,
                label: "Mensagem: " + r,
                type: "textarea",
                wide: true,
              })),
            ]}
            values={{
              ...Object.fromEntries(
                followUpFields.map((f) => [
                  f.name,
                  String(settings.followUp[f.name]),
                ]),
              ),
              ...Object.fromEntries(
                followUpReasons.map((r) => ["t:" + r, settings.templates[r]]),
              ),
            }}
            schema={z.object({
              ...Object.fromEntries(
                followUpFields.map((f) => [
                  f.name,
                  f.name === "maxAttempts"
                    ? days(10).refine((v) => Number(v) >= 1, "Mínimo 1")
                    : days(3650),
                ]),
              ),
              ...Object.fromEntries(
                followUpReasons.map((r) => ["t:" + r, required]),
              ),
            })}
            save={(v) =>
              action.mutateAsync({
                run: () =>
                  studio.settings({
                    ...settings,
                    followUp: Object.fromEntries(
                      followUpFields.map((f) => [f.name, Number(v[f.name])]),
                    ) as typeof settings.followUp,
                    templates: Object.fromEntries(
                      followUpReasons.map((r) => [r, v["t:" + r]]),
                    ) as typeof settings.templates,
                  }),
                message: "Prazos de follow-up salvos.",
              })
            }
          />
        </Card>
      )}
      {tab === "Procedimentos" && (
        <Card className="pad settings-card">
          <div className="section-head">
            <div>
              <h2>Procedimentos e retorno</h2>
              <p>O retorno gera um follow-up após os dias informados.</p>
            </div>
          </div>
          <ProceduresForm data={data} />
        </Card>
      )}
      {tab === "Fidelidade" && (
        <Card className="pad settings-card">
          <div className="section-head">
            <h2>% padrão por tipo de benefício</h2>
          </div>
          <Editor
            label="Salvar percentuais"
            fields={benefitTypes.map((b) => ({
              name: b,
              label: b + " (%)",
              type: "number",
            }))}
            values={Object.fromEntries(
              benefitTypes.map((b) => [b, String(settings.benefitPct[b])]),
            )}
            schema={z.object(
              Object.fromEntries(benefitTypes.map((b) => [b, number(0, 100)])),
            )}
            save={(v) =>
              action.mutateAsync({
                run: () =>
                  studio.settings({
                    ...settings,
                    benefitPct: Object.fromEntries(
                      benefitTypes.map((b) => [b, Number(v[b])]),
                    ) as typeof settings.benefitPct,
                  }),
                message: "Percentuais salvos.",
              })
            }
          />
        </Card>
      )}
      {tab === "Estúdio" && (
        <Card className="pad settings-card">
          <div className="section-head">
            <h2>Perfil e operação do estúdio</h2>
          </div>
          <Editor
            fields={[
              { name: "studio", label: "Nome do estúdio" },
              {
                name: "artist",
                label: "Profissional (" + tenant.terms.profissional + ")",
              },
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
            <Button onClick={() => setAccent(defaultAccent)}>
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
