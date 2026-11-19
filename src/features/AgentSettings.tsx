import { z } from "zod";
import { Editor, options } from "../components/Editor";
import { useAction } from "../hooks/useStudio";
import { required } from "../schemas/forms";
import { studio } from "../services/studio";
import type { Settings } from "../types/studio";
export function AgentSettings({ settings }: { settings: Settings }) {
  const action = useAction();
  return (
    <Editor
      fields={[
        { name: "tone", label: "Personalidade e tom", wide: true },
        {
          name: "knowledge",
          label: "Base de conhecimento",
          type: "textarea",
          wide: true,
        },
        {
          name: "rules",
          label: "Regras de atendimento",
          type: "textarea",
          wide: true,
        },
        {
          name: "tools",
          label: "Ferramentas disponíveis",
          type: "textarea",
          wide: true,
        },
        {
          name: "agent",
          label: "Resposta automática na simulação",
          options: options(["Ativa", "Pausada"]),
          wide: true,
        },
      ]}
      values={{
        tone: settings.tone,
        knowledge: settings.knowledge,
        rules: settings.rules,
        tools: settings.tools,
        agent: settings.agent ? "Ativa" : "Pausada",
      }}
      schema={z.object({
        tone: required,
        knowledge: required,
        rules: required,
        tools: required,
        agent: z.enum(["Ativa", "Pausada"]),
      })}
      save={(v) =>
        action.mutateAsync({
          run: () =>
            studio.settings({
              ...settings,
              tone: v.tone,
              knowledge: v.knowledge,
              rules: v.rules,
              tools: v.tools,
              agent: v.agent === "Ativa",
            }),
          message: "Configurações do agente salvas.",
        })
      }
    />
  );
}
