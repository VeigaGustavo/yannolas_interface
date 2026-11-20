# Nova versão: dois estúdios, follow-up, faturamento, fidelidade e estoque

## Intenção

O painel deixa de ser só do Yannis Tattoo. Ele passa a atender **dois estúdios separados**: o Yannis Tattoo e um espaço de **biomedicina estética**. As regras de negócio são as mesmas. Mudam a marca (nome, logo e cores) e a linguagem da interface.

O foco do produto passa a ser **follow-up, agendamento e faturamento**. A IA sai por enquanto.

Esta versão continua sendo um **protótipo estático em React e TypeScript**, publicado no GitHub Pages como hoje. Ela tem dois papéis:

1. validar as telas e os fluxos com os donos dos estúdios;
2. servir de referência para as próximas etapas, que são o app em **Flutter** (mobile primeiro) e o back-end em **Java + Spring**.

Por isso, a interface já nasce pensada para celular e telas pequenas.

## Objetivos

- Login por estúdio. Cada dono vê apenas os dados do próprio estúdio, com a marca e o vocabulário dele.
- CRM com histórico financeiro e de fidelidade do cliente: formas de pagamento, parcelas, quem indicou, quem ele indicou, cupons, sorteios e descontos usados.
- Follow-up como **funil com etapas e histórico**, criado automaticamente por eventos.
- Faturamento completo: entradas, parcelas a receber, despesas, descontos e lucro do mês.
- Módulo de **Fidelidade/Descontos**: indicações, promoções, sorteios, cupons e aniversário, cada um com seu %.
- Estoque com **baixa manual** e alerta de estoque baixo.
- Layout mobile-first que funcione bem a partir de 360 px de largura e continue usável no desktop.

## Fora do escopo (agora)

- Agente de IA, modo "IA" nas conversas, Atendimento (inbox) e Campanhas. Saem das rotas e do menu. O código pode ser apagado.
- Integração real com WhatsApp. O follow-up só abre o WhatsApp com a mensagem pronta, por link `wa.me`.
- Permissões e perfis (recepção, funcionário). Por enquanto existe um usuário por estúdio: o dono.
- Painel administrativo que veja os dois estúdios.
- Baixa automática de estoque por procedimento e custo por procedimento.
- Back-end, segurança real e sincronização entre aparelhos.

## O que não pode acontecer (anti-objetivos)

- **Mistura de dados entre estúdios.** Um cliente, lançamento ou item do Yannis nunca pode aparecer na biomedicina, nem o contrário. Isso vale até no protótipo.
- **Vender o login como seguro.** O login é simulado. A interface e o README precisam deixar isso claro.
- **Telas que só funcionam no desktop.** Nenhuma tela pode ter rolagem lateral em 360 px. Tabelas largas viram cards ou listas no celular.
- **Faturamento que não fecha.** O resumo do mês precisa bater com a soma dos lançamentos que aparecem na lista.

## Restrições

- Mesma stack: Vite, React 19, TypeScript, Tailwind 4, React Router com rotas em hash, React Hook Form + Zod, TanStack Query, Zustand e Vitest.
- Deploy estático pelo workflow atual (`.github/workflows/deploy.yml`). Lint, testes e build precisam passar.
- Os dados ficam no `localStorage`, em **uma chave por estúdio**. A chave de dados é versionada; a nova versão começa com dados novos e não migra os antigos.
- O ponto de troca continua sendo `src/services/studio.ts` (contrato `StudioService`), para facilitar a troca por HTTP no futuro.
- Contraste AA nos dois temas, como na identidade atual.

## Abordagens consideradas

- **1. Evoluir o projeto atual com os dados no navegador (escolhida).** É o caminho mais rápido até o deploy e reaproveita stack, tema, testes e pipeline. Custo aceito: a camada de dados é específica da demo e será refeita quando o Spring existir.
- **2. Evoluir o projeto com uma API simulada (MSW).** Isso deixaria o contrato HTTP pronto para o Spring e o Flutter. Foi descartada pelo dono em favor de um protótipo totalmente estático e mais rápido.
- **3. Projeto novo do zero.** Foi descartada porque não traz ganho sobre a base atual.
- Um back-end pronto agora, como Supabase ou Firebase, foi descartado porque contradiz a decisão de usar Spring.

## Decisões do dono

- O desconto incide sobre o total do orçamento. O sinal não libera o benefício de indicação.
- Dois estúdios separados, um deles de biomedicina. Mesmas regras, interface e nomes diferentes.
- Faturamento completo, incluindo despesas e lucro, e estoque.
- Estoque com baixa manual por enquanto.
- Follow-up como funil com etapas e histórico, gerado por eventos.
- Um usuário por estúdio (o dono). As permissões vêm depois.
- Fidelidade/Descontos, mapa de módulos e layout mobile conforme a proposta abaixo.
- Protótipo estático. Flutter e Spring vêm depois.

## Desenho

### Estúdios, marca e vocabulário

Cada estúdio tem uma configuração de marca:

| Campo               | Yannis Tattoo                               | Biomedicina                                                              |
| ------------------- | ------------------------------------------- | ------------------------------------------------------------------------ |
| Nome                | Yannis Tattoo                               | nome fictício a definir                                                  |
| Profissional        | Yannis Manolas                              | nome fictício                                                            |
| Logo / favicon      | atuais (`public/brand/`)                    | marca textual simples, sem imagem                                        |
| Destaque            | laranja `#FF9100`, fundo preto              | paleta própria e clara, a definir por quem implementar, com contraste AA |
| Atendimento (termo) | Sessão                                      | Procedimento                                                             |
| Serviço (termo)     | Tatuagem                                    | Procedimento estético                                                    |
| Campos do orçamento | local do corpo, tamanho, estilo, referência | região tratada, produto, quantidade (ml/U), referência                   |

O vocabulário vem de um dicionário por estúdio (`terms.atendimento`, `terms.servico` etc.), usado pelas telas, e não de condicionais espalhadas. Os campos específicos do orçamento ficam declarados por estúdio, aproveitando `src/features/studioFields.ts`.

### Login (simulado)

- Tela de login com e-mail e senha. Há duas contas de demonstração fixas, uma por estúdio, mostradas na própria tela de login.
- O login correto grava uma sessão (`estudioId`) no navegador e aplica a marca daquele estúdio. Sair limpa a sessão e volta para o login.
- Todas as rotas exigem sessão. Sem ela, o app redireciona para o login.
- Todo acesso a dados passa pelo `estudioId` da sessão, e o serviço só lê e grava na chave daquele estúdio.
- A sessão fica em uma chave própria, fora dos dados dos estúdios. Todas as query keys do TanStack Query incluem o `estudioId`, e o cache é limpo ao sair. _(decisão minha)_
- Clientes, indicações, cupons, sorteios, lançamentos e estoque **nunca cruzam estúdios**. Um cliente que vá aos dois é cadastrado duas vezes. Por isso não há `estudioId` dentro das entidades no protótipo, só um store por estúdio.
- Um aviso discreto na tela de login: "Protótipo: os dados ficam neste navegador e o login não é seguro."

### Navegação (mobile-first)

- **Celular:** barra inferior com Início, Agenda, Clientes, Follow-up e Mais. O "Mais" abre Faturamento, Fidelidade, Estoque, Orçamentos, Configurações e Sair.
- **Desktop:** a sidebar atual com os mesmos itens.
- Formulários abrem em tela cheia ou em uma folha que sobe de baixo no celular, e em modal no desktop.

### Módulos

**Início (dashboard).** Mostra a agenda de hoje, os follow-ups de hoje e atrasados, o resumo do mês (entrou, a receber, lucro) e os itens com estoque baixo. Cada bloco leva para o módulo correspondente.

**Clientes (CRM).** Mantém a busca, as etiquetas e as etapas atuais. No celular, a lista substitui o kanban; o kanban continua no desktop. A ficha do cliente ganha estas abas:

- **Dados:** contato e aniversário (campo novo).
- **Histórico:** atendimentos, orçamentos e passagens de etapa do follow-up, com data.
- **Financeiro:** cada pagamento com data, valor cheio, desconto e motivo, valor final, forma de pagamento (Pix, dinheiro, débito, crédito) e parcelas.
- **Fidelidade:** quem indicou, quem ele indicou (com o status de cada um), benefícios disponíveis, pendentes e usados (indicação, cupons, sorteios, promoções). Não existe saldo em reais, só benefícios em %. _(decisão minha)_

**Agenda.** Mantém o que já existe: validação de sobreposição, reagendar e cancelar. No celular, a visão padrão é o dia ou uma lista da semana. Concluir um atendimento oferece **"Registrar pagamento"**, que abre o lançamento já preenchido com o cliente e o valor do orçamento.

**Orçamentos.** Mantém o fluxo atual (criar, aprovar e converter em atendimento), com os campos do estúdio. O campo de sinal continua existindo e, quando pago, vira um lançamento de entrada.

**Follow-up.** É um funil com histórico:

```
A fazer → Contatado → Respondeu → Convertido
                   ↘ Sem resposta → (reagenda em X dias, volta para A fazer) → Perdido
```

- **Tentativas:** um follow-up sem resposta volta para "A fazer" depois de X dias (padrão 3, configurável). Na 3ª vez sem resposta, ele vira Perdido. Cada follow-up guarda o número de tentativas. _(decisão minha)_

- **Eventos que criam um follow-up automaticamente.** Os prazos são configuráveis por estúdio, e entre parênteses estão os valores padrão:
  - orçamento enviado sem resposta (3 dias);
  - atendimento concluído, para perguntar como ficou (1 dia);
  - retoque da tatuagem (30 dias) ou retorno do procedimento estético. O retorno tem um prazo por tipo de procedimento cadastrado em Configurações, por exemplo toxina 120 dias e preenchimento 270 dias;
  - cliente sem atendimento há muito tempo (180 dias);
  - aniversário (7 dias antes, com opção de gerar um cupom);
  - indicação concluída, para agradecer quem indicou e avisar do crédito.
- **Também existe follow-up manual.**
- Cada follow-up guarda o cliente, o motivo (o evento), a data prevista, a etapa e o histórico de passagens (etapa, data e nota). Quando convertido, guarda o vínculo com o orçamento ou atendimento gerado.
- **"Chamar no WhatsApp"** abre `wa.me` com a mensagem modelo do motivo e move o card para Contatado.
- **No celular:** abas Hoje, Atrasados, Próximos e Todos, com filtro por etapa. No desktop, também há o kanban.
- **A pesquisa de satisfação** é absorvida aqui. O follow-up de "atendimento concluído" pode registrar uma nota de 1 a 5 e um comentário, e isso substitui a página Pós-atendimento.
- **Sem duplicatas:** cada evento gera no máximo um follow-up aberto por cliente e motivo.
- **Quando os eventos são avaliados:** no momento da ação que os causa (concluir atendimento, enviar orçamento, cadastrar indicação). Os eventos baseados em tempo (aniversário, inatividade) são verificados ao abrir o app.

**Faturamento.**

- **Lançamentos de entrada:** cliente, atendimento ou orçamento opcional, data, valor cheio, desconto aplicado (benefício da fidelidade ou desconto manual, com motivo), valor final, forma de pagamento e número de parcelas.
- **Crédito parcelado:** gera as parcelas mês a mês. Cada parcela tem data prevista e status (prevista ou recebida). Por padrão, a parcela é marcada como recebida automaticamente quando chega a data prevista, com opção de marcar na mão.
- **Despesas:** data, categoria (material, aluguel, marketing, outros), descrição e valor. A compra registrada no estoque gera a despesa automaticamente.
- **Regime de caixa:** um mês conta o que efetivamente entrou nele, ou seja, os pagamentos à vista e as parcelas recebidas naquele mês. O status "recebida" de uma parcela é calculado ao abrir o app a partir da data, e não salvo, exceto quando marcado na mão. _(decisão minha)_
- **Resumo por mês:** entrou, a receber (parcelas futuras), saiu, total de descontos, lucro (entrou − saiu) e quantos clientes vieram por indicação. Há também uma lista filtrável por tipo, forma de pagamento e período.
- Os valores são em reais e calculados em centavos (inteiros) para evitar erros de arredondamento.

**Fidelidade/Descontos.**

- **Tipos de benefício:** indicação, promoção, sorteio, cupom e aniversário. Cada tipo tem um % padrão em Configurações.
- **Indicação:** marcada na ficha do cliente novo ("indicado por"). Quem indicou ganha um benefício com o % padrão, liberado quando o indicado faz o primeiro atendimento pago. Antes disso, o benefício fica "pendente".
- **Promoção e sorteio:** cadastro com nome, %, validade e os clientes contemplados.
- **Cupom:** código, %, validade e limite de usos.
- **Desconto e sinal (decisão do dono):** o desconto incide sobre o **valor total** do orçamento. O sinal já pago é abatido depois. Por exemplo, com orçamento de R$ 1.000, sinal de R$ 200 e cupom de 10%, o pagamento final é de R$ 700.
- **Liberação da indicação (decisão do dono):** o sinal **não conta** como primeiro atendimento pago. O benefício de quem indicou só é liberado quando o indicado conclui um atendimento e o paga.
- **No pagamento:** a tela lista os benefícios disponíveis do cliente. Só um pode ser aplicado por atendimento, e quem cobra pode ajustar o % caso a caso. Usar um benefício o marca como usado e o vincula ao lançamento.
- **Aniversário:** o follow-up de aniversário pode gerar um cupom pessoal de uso único, com o % padrão do tipo aniversário e validade de 30 dias. _(decisão minha)_
- **Visão geral:** benefícios ativos, pendentes, usados e vencidos, além de um ranking de quem mais indicou.

**Estoque.**

- **Itens:** nome, unidade (un, ml, caixa...), quantidade atual, mínimo para alerta e custo da última compra.
- **Compra:** aumenta a quantidade e gera uma despesa no faturamento.
- **Ajuste manual (contagem):** define a nova quantidade com uma nota.
- Cada item guarda o histórico de movimentos.
- O item com quantidade igual ou abaixo do mínimo aparece no Início e com destaque na lista.

**Configurações.** Tema claro/escuro e destaque. Cada estúdio começa com a paleta da sua marca, e o destaque escolhido é salvo por estúdio. _(decisão minha)_ Prazos de cada evento de follow-up. Prazo de retorno por tipo de procedimento. % padrão por tipo de benefício. Mensagens modelo do WhatsApp por motivo. Dados do estúdio e expediente.

### Dados fictícios

Cada estúdio vem com uma base própria e realista: clientes, alguns indicados por outros, atendimentos passados e futuros, lançamentos dos últimos 3 meses (incluindo crédito parcelado), despesas, follow-ups em várias etapas, cupons e itens de estoque, alguns já abaixo do mínimo. Tudo é fictício. A base do Yannis aproveita o estilo da atual (Palmas-TO, fine line, floral...).

### Testes

Testes de fluxo cobrindo:

- login e isolamento: dados criados no estúdio A não aparecem no B;
- registro de pagamento parcelado e o resumo do mês;
- indicação liberando o benefício após o primeiro pagamento do indicado;
- aplicação de cupom no pagamento;
- eventos gerando follow-up sem duplicar;
- passagem de etapas do follow-up com histórico;
- compra de estoque gerando despesa;
- alerta de estoque baixo.

O teste de sobreposição da agenda continua.

## Fica para quem implementar

- Nome fictício, paleta e marca textual da biomedicina, respeitando o contraste AA.
- A forma exata das entidades novas, mantendo-as próximas do que viraria tabela no PostgreSQL. O `docs/schema.sql` deve ser atualizado para refletir o modelo novo.
- Detalhes visuais da barra inferior, das folhas e dos cards de follow-up.
- Os textos das mensagens modelo de WhatsApp.
- Se o kanban do CRM e o do follow-up compartilham componente.
- A atualização do README, do roteiro de demonstração, de `docs/arquitetura.md` e do `docs/roadmap.md`. O roadmap deve citar o Flutter e o Spring como próximas etapas.
