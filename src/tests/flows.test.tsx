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
import { dateOffset } from "../mocks/studio";
import { studio } from "../services/studio";
import { useInterface } from "../stores/interface";
import { useSession } from "../stores/session";
import type { Session } from "../types/studio";

beforeEach(() => {
  localStorage.clear();
  useSession.getState().logout();
  useSession.getState().login("yannis@demo.app", "demo123");
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

  it("não oferece mais IA, atendimento nem campanhas", async () => {
    open();
    await screen.findByRole("link", { name: "CRM" });
    for (const name of [
      "Agente de IA",
      "Atendimento",
      "Campanhas",
      "Pós-atendimento",
    ])
      expect(screen.queryByRole("link", { name })).toBeNull();
  });

  it.todo("troca de estúdio sem mostrar dados do anterior");

  it("mostra a marca Yannis Tattoo na navegação", async () => {
    open();
    expect(
      await screen.findByRole("img", { name: "Yannis Tattoo" }),
    ).toBeTruthy();
    expect(await screen.findByText("Yannis Manolas")).toBeTruthy();
  });

  it("restaura o laranja como cor de destaque", async () => {
    useInterface.getState().setAccent("yannis", "#123456");
    const user = open("/configuracoes");
    await user.click(await screen.findByRole("button", { name: "Aparência" }));
    await user.click(
      screen.getByRole("button", { name: "Restaurar cor padrão" }),
    );
    expect(useInterface.getState().accents.yannis).toBe("#ff9100");
  });

  it("ignora dados salvos pela versão anterior do protótipo", async () => {
    localStorage.setItem("tattoo-studio-data-v1", "{");
    open();
    await screen.findByRole("heading", { name: /Olá, Yannis/ });
  });

  it("recupera a tela após um erro de leitura", async () => {
    localStorage.setItem("studio-data-v3-yannis", "{");
    const user = open();
    await screen.findByRole("alert");
    localStorage.removeItem("studio-data-v3-yannis");
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await screen.findByRole("heading", { name: /Olá, Yann/ });
  });
});
