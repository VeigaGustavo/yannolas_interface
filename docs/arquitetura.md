# Arquitetura

O frontend é um protótipo estático: React 19, Vite, Tailwind, React Router (rotas com hash), React Hook Form + Zod, TanStack Query e Zustand. Tudo roda no navegador, e os dados ficam no `localStorage`.

| Pasta        | Responsabilidade                                                                                                            |
| ------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `domain`     | Regras puras, sem React: dinheiro e parcelas, faturamento, fidelidade e pagamento, follow-up, estoque                       |
| `services`   | Único ponto de leitura e gravação. Carrega os dados do estúdio da sessão, aplica a regra de domínio e grava tudo de uma vez |
| `tenants.ts` | Marca, vocabulário, campos de orçamento e contas de demonstração de cada estúdio                                            |
| `stores`     | Sessão (estúdio logado) e preferências de interface (tema e destaque por estúdio)                                           |
| `pages`      | Telas por rota                                                                                                              |
| `components` | Layout, formulários (incluindo o de pagamento), abas e diálogos                                                             |
| `features`   | Ficha do cliente, calendário e opções de campos                                                                             |
| `mocks`      | Gerador das bases fictícias, que usa as próprias regras de domínio, e as configurações de cada estúdio                      |

## Estúdios e sessão

O login compara e-mail e senha com as contas fixas de `tenants.ts` e grava o `tenantId` em `studio-session-v3`. Os dados de cada estúdio ficam em `studio-data-v3-<tenantId>`. Todas as chaves do TanStack Query começam com `["studio", tenantId]`, e o cache é limpo ao sair. Assim, trocar de conta nunca mostra dados do estúdio anterior. **Nada disso é segurança.** O isolamento real virá do back-end.

## Regras principais

- **Pagamento:** o desconto (benefício, cupom ou manual, um por pagamento) incide sobre o valor total, e o sinal é abatido depois: `líquido = total − desconto − sinal`. O resultado nunca pode ser negativo. Um atendimento só pode ser pago uma vez. O crédito é dividido em até 12 parcelas, e a primeira recebe o resto da divisão.
- **Faturamento (regime de caixa):** o mês soma as parcelas com data naquele mês. Uma parcela conta como recebida quando chega a data, a menos que tenha sido marcada à mão.
- **Indicação:** o cliente indicado gera um benefício "Pendente" para quem indicou. Ele é liberado no primeiro pagamento de atendimento do indicado; o sinal não conta.
- **Follow-up:** é criado a partir de eventos (orçamento pendente, atendimento concluído, retorno por procedimento, aniversário, cliente inativo, indicação). Existe no máximo um follow-up aberto por cliente e motivo. Após o número máximo de tentativas sem resposta, ele vira "Perdido".
- **Estoque:** a compra soma ao estoque e gera uma despesa de material. O ajuste registra a diferença da contagem.

## API Java planejada

O ponto de troca é `src/services/studio.ts`. Cada método vira uma chamada HTTP, e as regras de `src/domain` passam para o Spring.

| Operação            | Contrato HTTP sugerido                                                              |
| ------------------- | ----------------------------------------------------------------------------------- |
| Sessão              | `POST /auth/login`, `POST /auth/logout`                                             |
| Clientes            | `GET/POST /studios/{id}/customers`, `PATCH /customers/{id}`                         |
| Orçamentos e agenda | `/studios/{id}/quotes`, `/studios/{id}/sessions`, `POST /sessions/{id}/complete`    |
| Pagamentos          | `POST /studios/{id}/payments`, `PATCH /payments/{id}/installments/{n}`              |
| Despesas e resumo   | `/studios/{id}/expenses`, `GET /studios/{id}/billing?month=YYYY-MM`                 |
| Fidelidade          | `/studios/{id}/benefits`, `/coupons`, `/promotions`                                 |
| Follow-up           | `GET /studios/{id}/followups?bucket=today`, `POST /followups/{id}/transitions`      |
| Estoque             | `/studios/{id}/stock`, `POST /stock/{id}/purchases`, `POST /stock/{id}/adjustments` |
| Configurações       | `GET/PUT /studios/{id}/settings`                                                    |

A API deve validar as entradas, devolver erros estruturados, executar em transação as gravações relacionadas (pagamento + benefício + follow-up; compra + despesa) e devolver conflito quando uma operação perder a disputa de concorrência.

## Modelo PostgreSQL

`docs/schema.sql` descreve o modelo. Todas as tabelas de negócio carregam `studio_id`, e as chaves estrangeiras compostas impedem vínculos entre estúdios. Índices únicos parciais garantem as regras de "uma vez só": pagamento por atendimento, uso de benefício, benefício por indicação e follow-up aberto por motivo. Os valores ficam em centavos. Use Flyway quando a API for implementada.
