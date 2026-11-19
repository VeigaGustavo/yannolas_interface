// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "../App";
import { dateOffset, sampleReference } from "../mocks/studio";
import { studio } from "../services/studio";
import { useInterface } from "../stores/interface";
import type { Session } from "../types/studio";

beforeEach(() => {
  localStorage.clear();
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
afterEach(cleanup);

function open(route = "/") {
  const query = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  render(
    <QueryClientProvider client={query}>
      <MemoryRouter initialEntries={[route]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

describe("protótipo do estúdio", () => {
  it("cria, valida e move um lead a partir do dashboard", async () => {
    const user = open();
    await user.click(await screen.findByRole("link", { name: "Novo lead" }));
    const form = within(
      await screen.findByRole("dialog", { name: "Novo lead" }),
    );
    await user.click(form.getByRole("button", { name: "Salvar" }));
    expect((await form.findAllByRole("alert")).length).toBeGreaterThan(0);
    await user.type(form.getByLabelText("Nome"), "Lia Prado");
    await user.type(form.getByLabelText("Telefone"), "11999998888");
    await user.type(
      form.getByLabelText("Oportunidade / projeto"),
      "Ramo em fine line",
    );
    await user.click(form.getByRole("button", { name: "Salvar" }));
    const stage = await screen.findByLabelText("Etapa de Lia Prado");
    await user.selectOptions(stage, "Qualificação");
    await waitFor(async () =>
      expect(
        (await studio.get()).clients.find((c) => c.name === "Lia Prado")?.stage,
      ).toBe("Qualificação"),
    );
  }, 10000);

  it("simula recebimento e resposta do agente sem conexão real", async () => {
    const user = open("/atendimento");
    await user.click(
      await screen.findByRole("button", { name: "Simular mensagem recebida" }),
    );
    await within(screen.getByLabelText("Histórico de mensagens")).findByText(
      "Referência recebida! Vou encaminhar o projeto para revisão do estúdio.",
      { exact: true },
    );
    expect((await studio.get()).clients[0].references).toContain(
      sampleReference,
    );
  });

  it("aprova o briefing simulado e atualiza o CRM", async () => {
    const user = open("/agente?cliente=c0");
    await user.click(
      await screen.findByRole("button", { name: "Usar referência disponível" }),
    );
    await user.click(screen.getByRole("button", { name: "Simular análise" }));
    const dialog = within(
      await screen.findByRole(
        "dialog",
        { name: "Revisar briefing simulado" },
        { timeout: 3500 },
      ),
    );
    await user.clear(dialog.getByLabelText("Briefing estruturado"));
    await user.type(
      dialog.getByLabelText("Briefing estruturado"),
      "Ramo botânico aprovado",
    );
    await user.click(
      dialog.getByRole("button", { name: "Aprovar atualização" }),
    );
    await screen.findByRole("status", { name: "" });
    await waitFor(async () =>
      expect((await studio.get()).clients[0].project).toBe(
        "Ramo botânico aprovado",
      ),
    );
  }, 10000);

  it("converte proposta aprovada em sessão pela agenda", async () => {
    const data = await studio.get();
    await studio.save("quotes", { ...data.quotes[0], status: "Aprovado" });
    const user = open("/orcamentos");
    await user.click(
      await screen.findByRole("button", {
        name: "Ver proposta de Mariana Costa",
      }),
    );
    await user.click(
      screen.getByRole("link", { name: "Converter em agendamento" }),
    );
    const form = within(
      await screen.findByRole("dialog", { name: "Nova sessão" }),
    );
    expect(
      (form.getByLabelText("Orçamento associado") as HTMLSelectElement).value,
    ).toBe(data.quotes[0].id);
    const day = form.getByLabelText("Data") as HTMLInputElement;
    const chosen = dateOffset(20);
    fireEvent.change(day, { target: { value: chosen } });
    await user.click(form.getByRole("button", { name: "Salvar" }));
    await waitFor(async () =>
      expect(
        (await studio.get()).sessions.find(
          (s) => s.quoteId === data.quotes[0].id,
        )?.date,
      ).toBe(chosen),
    );
  }, 10000);

  it("rejeita sobreposição e permite reutilizar um intervalo cancelado", async () => {
    const date = dateOffset(30);
    const blocked: Session = {
      id: "s-block",
      clientId: "",
      quoteId: "",
      title: "Pausa",
      date,
      time: "12:00",
      duration: 60,
      status: "Bloqueado",
    };
    const session: Session = {
      ...blocked,
      id: "s-new",
      clientId: "c0",
      time: "12:30",
      status: "Confirmado",
    };
    await studio.save("sessions", blocked);
    await expect(studio.save("sessions", session)).rejects.toThrow(
      "horário está ocupado",
    );
    await studio.save("sessions", { ...blocked, status: "Cancelado" });
    await studio.save("sessions", session);
    expect((await studio.get()).clients[0].stage).toBe("Agendado");
  });

  it("simula uma campanha segmentada apenas uma vez", async () => {
    const user = open("/campanhas");
    await user.click(
      await screen.findByRole("button", { name: "Pré-visualizar" }),
    );
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText(/12 clientes elegíveis/)).toBeTruthy();
    await user.click(dialog.getByRole("button", { name: "Simular disparo" }));
    await dialog.findByText("12 destinatários registrados na simulação.");
    await expect(studio.dispatch("p1")).rejects.toThrow("indisponível");
  });
  it("deduplica um evento recebido e respeita o modo humano", async () => {
    const before = await studio.get();
    const thread = before.conversations.find((c) => c.mode === "Humano")!;
    const event = {
      event: "messages.upsert" as const,
      conversationId: thread.id,
      messageId: "external-1",
      text: "Preciso reagendar.",
      at: new Date().toISOString(),
    };
    await Promise.all([studio.receive(event), studio.receive(event)]);
    const after = (await studio.get()).conversations.find(
      (c) => c.id === thread.id,
    )!;
    expect(after.messages).toHaveLength(thread.messages.length + 1);
    expect(after.messages.at(-1)?.from).toBe("cliente");
    expect(after.unread).toBe(thread.unread + 1);
  });

  it("registra uma resposta de satisfação e o lembrete de retorno", async () => {
    const user = open("/feedback");
    await user.click(
      await screen.findByRole("button", { name: "Nova pesquisa" }),
    );
    const fields = within(
      await screen.findByRole("dialog", {
        name: "Nova pesquisa de satisfação",
      }),
    );
    await user.selectOptions(fields.getByLabelText("Cliente"), "c6");
    await user.selectOptions(fields.getByLabelText("Nota"), "5");
    await user.selectOptions(fields.getByLabelText("Status"), "Recebido");
    await user.type(fields.getByLabelText("Comentário"), "Voltarei em breve");
    await user.click(fields.getByRole("button", { name: "Salvar" }));
    await screen.findByText("Voltarei em breve");
    expect((await studio.get()).feedback[0]).toMatchObject({
      clientId: "c6",
      rating: 5,
      status: "Recebido",
    });
  }, 10000);

  it("mostra a marca Yannis Tattoo na navegação", async () => {
    open();
    expect(
      await screen.findByRole("img", { name: "Yannis Tattoo" }),
    ).toBeTruthy();
    expect(await screen.findByText("Yannis Manolas")).toBeTruthy();
  });

  it("restaura o laranja como cor de destaque", async () => {
    useInterface.getState().setAccent("#123456");
    const user = open("/configuracoes");
    await user.click(await screen.findByRole("button", { name: "Aparência" }));
    await user.click(
      screen.getByRole("button", { name: "Restaurar cor padrão" }),
    );
    expect(useInterface.getState().accent).toBe("#ff9100");
  });

  it("ignora dados salvos pela versão anterior do protótipo", async () => {
    localStorage.setItem("tattoo-studio-data-v1", "{");
    open();
    await screen.findByRole("heading", { name: /Olá, Yannis/ });
  });

  it("recupera a tela após um erro de leitura", async () => {
    localStorage.setItem("tattoo-studio-data-v2", "{");
    const user = open();
    await screen.findByRole("alert");
    localStorage.removeItem("tattoo-studio-data-v2");
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await screen.findByRole("heading", { name: /Olá, Yann/ });
  });
});
