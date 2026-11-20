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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import { dateOffset, money } from "../mocks/studio";
import { parseCents } from "../domain/money";
import { studio } from "../services/studio";
import { useInterface } from "../stores/interface";
import { useSession } from "../stores/session";
import type { Session, TenantId } from "../types/studio";

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

function open(route = "/", tenant: TenantId | null = "yannis") {
  useSession.getState().logout();
  if (tenant) useSession.getState().login(tenant + "@demo.app", "demo123");
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
    await screen.findByRole("link", { name: "Clientes" });
    for (const name of [
      "Agente de IA",
      "Atendimento",
      "Campanhas",
      "Pós-atendimento",
    ])
      expect(screen.queryByRole("link", { name })).toBeNull();
  });

  it("troca de estúdio sem mostrar dados do anterior", async () => {
    const user = open("/crm");
    await screen.findAllByText("Mariana Costa");
    await user.click(screen.getByRole("button", { name: "Sair" }));
    await user.type(await screen.findByLabelText("E-mail"), "lumi@demo.app");
    await user.type(screen.getByLabelText("Senha"), "demo123");
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    await screen.findAllByText("Lumi Estética Avançada");
    expect(screen.queryByText("Mariana Costa")).toBeNull();
  }, 10000);

  it("exige login e avisa que é um protótipo", async () => {
    const user = open("/crm", null);
    await screen.findByRole("button", { name: "Entrar" });
    expect(
      screen.getByText(
        "Protótipo: os dados ficam neste navegador e o login não é seguro.",
      ),
    ).toBeTruthy();
    await user.type(screen.getByLabelText("E-mail"), "yannis@demo.app");
    await user.type(screen.getByLabelText("Senha"), "errada");
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    await screen.findByText("E-mail ou senha incorretos.");
  });

  it("mostra a marca e o menu da Lumi", async () => {
    open("/", "lumi");
    await screen.findByRole("link", { name: "Clientes" });
    for (const name of ["Follow-up", "Faturamento", "Fidelidade", "Estoque"])
      expect(screen.getByRole("link", { name })).toBeTruthy();
    expect(screen.queryByText("YANNIS | TATTOO")).toBeNull();
    expect(screen.getAllByText("LUMI").length).toBeGreaterThan(0);
  });

  it("registra indicação e mostra na ficha de quem indicou", async () => {
    const user = open("/crm?novo=1");
    const form = within(
      await screen.findByRole("dialog", { name: "Novo lead" }),
    );
    await user.type(form.getByLabelText("Nome"), "Lia Prado");
    await user.type(form.getByLabelText("Telefone"), "63999998888");
    await user.type(form.getByLabelText("Oportunidade / projeto"), "Ramo");
    await user.selectOptions(form.getByLabelText("Indicado por"), "c0");
    await user.click(form.getByRole("button", { name: "Salvar" }));
    await waitFor(async () =>
      expect(
        (await studio.get()).clients.find((c) => c.name === "Lia Prado")
          ?.referredBy,
      ).toBe("c0"),
    );
    cleanup();
    const next = open("/crm?cliente=c0");
    const ficha = within(
      await screen.findByRole("dialog", { name: "Mariana Costa" }),
    );
    await next.click(ficha.getByRole("tab", { name: "Fidelidade" }));
    const row = (await ficha.findByText("Lia Prado")).closest("li")!;
    expect(within(row).getByText("Pendente")).toBeTruthy();
  }, 15000);

  it("mostra forma de pagamento e parcelas na ficha", async () => {
    const data = await studio.get();
    const p = data.payments.find((x) => x.installments.length > 1)!;
    const client = data.clients.find((c) => c.id === p.clientId)!;
    const user = open("/crm?cliente=" + client.id);
    const ficha = within(
      await screen.findByRole("dialog", { name: client.name }),
    );
    await user.click(ficha.getByRole("tab", { name: "Financeiro" }));
    expect(
      await ficha.findByText(
        `Crédito · ${p.installments.length}x de ${money(p.installments[0].cents)}`.replace(
          /\s/g,
          " ",
        ),
      ),
    ).toBeTruthy();
  });

  it("usa os campos de orçamento do estúdio", async () => {
    open("/orcamentos?novo=1", "lumi");
    const form = within(
      await screen.findByRole("dialog", { name: "Novo orçamento" }),
    );
    expect(form.getByLabelText("Região tratada")).toBeTruthy();
    expect(form.queryByLabelText("Local do corpo")).toBeNull();
  });

  it("conclui o atendimento e registra o pagamento com cupom e sinal", async () => {
    await studio.save("quotes", {
      id: "qx",
      clientId: "c1",
      description: "Rosa no ombro",
      details: {},
      valueCents: 100000,
      depositCents: 20000,
      validUntil: dateOffset(30),
      status: "Aprovado",
      reference: "",
    });
    await studio.pay({
      clientId: "c1",
      quoteId: "qx",
      kind: "Sinal",
      date: dateOffset(),
      grossCents: 20000,
      depositCents: 0,
      method: "Pix",
      installments: 1,
    });
    await studio.save("sessions", {
      id: "sx",
      clientId: "c1",
      quoteId: "qx",
      title: "Rosa no ombro",
      date: dateOffset(40),
      time: "10:00",
      duration: 60,
      status: "Confirmado",
    });
    const user = open("/agenda?sessao=sx");
    await user.click(await screen.findByRole("button", { name: "Concluir" }));
    const form = within(
      await screen.findByRole("dialog", { name: "Registrar pagamento" }),
    );
    expect((form.getByLabelText("Valor total") as HTMLInputElement).value).toBe(
      "1000,00",
    );
    expect(
      (form.getByLabelText("Sinal já pago") as HTMLInputElement).value,
    ).toBe("200,00");
    await user.selectOptions(form.getByLabelText("Desconto"), "cupom");
    await user.type(form.getByLabelText("Código do cupom"), "flash10");
    await user.selectOptions(
      form.getByLabelText("Forma de pagamento"),
      "Crédito",
    );
    await user.selectOptions(form.getByLabelText("Parcelas"), "2");
    expect(form.getByText(/a pagar R\$\s700,00/)).toBeTruthy();
    expect(form.getByText(/2x de R\$\s350,00/)).toBeTruthy();
    const save = form.getByRole("button", { name: "Salvar" });
    await user.dblClick(save);
    await waitFor(async () =>
      expect(
        (await studio.get()).payments.filter((p) => p.sessionId === "sx"),
      ).toHaveLength(1),
    );
    const paid = (await studio.get()).payments.find(
      (p) => p.sessionId === "sx",
    )!;
    expect(paid).toMatchObject({ netCents: 70000, discountCents: 10000 });
    expect(paid.installments).toHaveLength(2);
  }, 15000);

  it("fecha o faturamento do mês com as entradas recebidas", async () => {
    const user = open("/faturamento");
    const entrou = await screen.findByRole("group", { name: "Entrou" });
    const total = parseCents(within(entrou).getByText(/R\$/).textContent!);
    const rows = within(
      screen.getByRole("list", { name: "Entradas do mês" }),
    ).getAllByRole("listitem");
    const received = rows
      .filter((r) => within(r).queryByText("Recebida"))
      .reduce(
        (sum, r) => sum + parseCents(r.querySelector(".amount")!.textContent!),
        0,
      );
    expect(received).toBe(total);
    expect(total).toBeGreaterThan(0);

    const saiu = () =>
      parseCents(
        within(screen.getByRole("group", { name: "Saiu" })).getByText(/R\$/)
          .textContent!,
      );
    const before = saiu();
    await user.click(screen.getByRole("tab", { name: "Despesas" }));
    await user.click(screen.getByRole("button", { name: "Nova despesa" }));
    const form = within(
      await screen.findByRole("dialog", { name: "Nova despesa" }),
    );
    await user.type(form.getByLabelText("Descrição"), "Energia");
    await user.type(form.getByLabelText("Valor (R$)"), "50,00");
    await user.click(form.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(saiu()).toBe(before + 5000));
  }, 15000);

  it("cria cupom e sorteio na fidelidade", async () => {
    const user = open("/fidelidade");
    await user.click(await screen.findByRole("tab", { name: "Cupons" }));
    await user.click(screen.getByRole("button", { name: "Novo cupom" }));
    let form = within(
      await screen.findByRole("dialog", { name: "Novo cupom" }),
    );
    await user.type(form.getByLabelText("Código"), "verao15");
    await user.clear(form.getByLabelText("% de desconto"));
    await user.type(form.getByLabelText("% de desconto"), "15");
    await user.click(form.getByRole("button", { name: "Salvar" }));
    await screen.findByText("VERAO15");

    await user.click(screen.getByRole("tab", { name: "Promoções e sorteios" }));
    await user.click(screen.getByRole("button", { name: "Nova promoção" }));
    form = within(await screen.findByRole("dialog", { name: "Nova promoção" }));
    await user.type(form.getByLabelText("Nome"), "Sorteio de Natal");
    await user.selectOptions(form.getByLabelText("Tipo"), "Sorteio");
    await user.click(form.getByRole("checkbox", { name: "Rafael Mendes" }));
    await user.click(form.getByRole("button", { name: "Salvar" }));
    await waitFor(async () =>
      expect(
        (await studio.get()).benefits.find(
          (b) => b.label === "Sorteio de Natal",
        ),
      ).toMatchObject({ clientId: "c1", pct: 15, status: "Disponível" }),
    );
  }, 15000);

  it("conduz um follow-up pelo funil com histórico", async () => {
    await studio.addFollowUp({
      clientId: "c0",
      due: dateOffset(),
      note: "Ligar sobre o retoque",
    });
    const user = open("/follow-up");
    let card = within(
      await screen.findByRole("article", { name: /Mariana Costa · Manual/ }),
    );
    const wa = card.getByRole("link", { name: "Chamar no WhatsApp" });
    expect(wa.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/55/);
    wa.addEventListener("click", (e) => e.preventDefault());
    await user.click(wa);
    await card.findByText("Contatado");
    await user.click(card.getByRole("button", { name: "Sem resposta" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("article", { name: /Mariana Costa · Manual/ }),
      ).toBeNull(),
    );
    await user.click(screen.getByRole("tab", { name: "Próximos" }));
    card = within(
      await screen.findByRole("article", { name: /Mariana Costa · Manual/ }),
    );
    expect(card.getByText("Tentativa 1 de 3")).toBeTruthy();
    await user.click(card.getByRole("button", { name: "Histórico" }));
    const history = within(
      await screen.findByRole("list", { name: "Histórico do follow-up" }),
    );
    expect(history.getByText(/Contatado/)).toBeTruthy();
    expect(history.getByText(/Sem resposta/)).toBeTruthy();
  }, 15000);

  it("registra compra no estoque como despesa", async () => {
    const item = (await studio.get()).stock.find(
      (i) => i.name === "Filme PVC",
    )!;
    const user = open("/estoque");
    const card = within(
      await screen.findByRole("article", { name: "Filme PVC" }),
    );
    await user.click(card.getByRole("button", { name: "Registrar compra" }));
    const form = within(
      await screen.findByRole("dialog", { name: "Registrar compra" }),
    );
    await user.type(form.getByLabelText("Quantidade"), "2");
    await user.type(form.getByLabelText("Valor total (R$)"), "80,00");
    await user.click(form.getByRole("button", { name: "Salvar" }));
    await waitFor(async () =>
      expect(
        (await studio.get()).stock.find((i) => i.id === item.id)?.qty,
      ).toBe(item.qty + 2),
    );
    cleanup();
    const next = open("/faturamento");
    await next.click(await screen.findByRole("tab", { name: "Despesas" }));
    expect(
      await screen.findByText(`Compra: Filme PVC (2 ${item.unit})`),
    ).toBeTruthy();
  }, 15000);

  it("não quebra a tela ao apagar a data do pagamento", async () => {
    const user = open("/crm?cliente=c0");
    const ficha = within(
      await screen.findByRole("dialog", { name: "Mariana Costa" }),
    );
    await user.click(
      ficha.getByRole("button", { name: "Registrar pagamento" }),
    );
    const form = within(
      await screen.findByRole("dialog", { name: "Registrar pagamento" }),
    );
    await user.type(form.getByLabelText("Valor total"), "100");
    fireEvent.change(form.getByLabelText("Data"), { target: { value: "" } });
    await user.click(form.getByRole("button", { name: "Salvar" }));
    expect(await form.findByText("Informe a data.")).toBeTruthy();
  });

  it("isola um erro de tela sem derrubar o painel", async () => {
    const data = await studio.get();
    localStorage.setItem(
      "studio-data-v3-yannis",
      JSON.stringify({
        ...data,
        payments: [{ ...data.payments[0], installments: null }],
      }),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
    open("/faturamento");
    expect(
      await screen.findByText("Não foi possível abrir esta tela."),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Clientes" })).toBeTruthy();
    vi.restoreAllMocks();
  });

  it("mostra as etapas do follow-up no histórico do cliente", async () => {
    await studio.addFollowUp({ clientId: "c0", due: dateOffset(), note: "" });
    const f = (await studio.get()).followUps.find(
      (x) => x.clientId === "c0" && x.reason === "Manual",
    )!;
    await studio.advanceFollowUp(f.id, "Contatado", "Ligação feita");
    const user = open("/crm?cliente=c0");
    const ficha = within(
      await screen.findByRole("dialog", { name: "Mariana Costa" }),
    );
    await user.click(ficha.getByRole("tab", { name: "Histórico" }));
    expect(
      ficha.getByText(/Follow-up Manual: Contatado — Ligação feita/),
    ).toBeTruthy();
  });

  it("mostra a marca Yannis Tattoo na navegação", async () => {
    open();
    expect(
      await screen.findByRole("img", { name: "Yannis Tattoo" }),
    ).toBeTruthy();
    expect(await screen.findByText("Yannis Manolas")).toBeTruthy();
  });

  it("guarda o destaque por estúdio e restaura o padrão", async () => {
    useInterface.getState().setAccent("yannis", "#123456");
    const user = open("/configuracoes", "lumi");
    await user.click(await screen.findByRole("tab", { name: "Aparência" }));
    await user.click(
      screen.getByRole("button", { name: "Restaurar cor padrão" }),
    );
    expect(useInterface.getState().accents.lumi).toBe("#0e7c7b");
    expect(useInterface.getState().accents.yannis).toBe("#123456");
  });

  it("usa o prazo configurado para o follow-up de orçamento", async () => {
    const user = open("/configuracoes");
    await user.click(await screen.findByRole("tab", { name: "Follow-up" }));
    const field = screen.getByLabelText("Orçamento sem resposta (dias)");
    await user.clear(field);
    await user.type(field, "5");
    await user.click(screen.getByRole("button", { name: "Salvar prazos" }));
    await waitFor(async () =>
      expect((await studio.get()).settings.followUp.quoteDays).toBe(5),
    );
    const data = await studio.get();
    await studio.save("quotes", {
      ...data.quotes[19],
      id: "nova",
      clientId: "c29",
      status: "Pendente",
    });
    const f = (await studio.get()).followUps.find((x) => x.refId === "nova");
    expect(f?.due).toBe(dateOffset(5));
  }, 10000);

  it("mostra estoque baixo e follow-ups no início", async () => {
    open("/");
    const low = within(
      await screen.findByRole("region", { name: "Estoque baixo" }),
    );
    expect(low.getByText("Luvas nitrílicas")).toBeTruthy();
    expect(
      screen.getByRole("region", { name: "Follow-ups de hoje e atrasados" }),
    ).toBeTruthy();
    expect(screen.getByRole("region", { name: "Resumo do mês" })).toBeTruthy();
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
