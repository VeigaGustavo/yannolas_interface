# Arquitetura

O frontend organiza as rotas com React Router e carrega os módulos sob demanda. React Hook Form e Zod validam as entradas. Tailwind e os componentes shadcn adaptados compõem a interface. Zustand persiste o tema e a cor, enquanto TanStack Query é responsável pelo cache e pela invalidação após mutações.

| Pasta        | Responsabilidade                                       |
| ------------ | ------------------------------------------------------ |
| `pages`      | Composição das telas e interação por rota              |
| `components` | Layout, formulário, diálogo e componentes de interface |
| `features`   | Configuração do agente, calendário e modelos de campos |
| `hooks`      | Leitura, mutação e atualização do cache                |
| `services`   | Adaptador local do contrato `StudioService`            |
| `types`      | Entidades e operações do domínio                       |
| `schemas`    | Validações reutilizadas em formulários                 |
| `stores`     | Estado e preferências de interface                     |
| `mocks`      | Base inicial e referências fictícias                   |

No protótipo, cada cadastro tem uma oportunidade ativa e a agenda usa um expediente diário configurável. O modelo relacional suporta múltiplas oportunidades, horários por dia da semana e tatuadores.

O adaptador local lê o estado mais recente antes de cada mutação e salva o resultado em uma única escrita no navegador. A aprovação de um briefing altera o registro da execução e a oportunidade do cliente nessa mesma operação. O agendamento valida sobreposição, propriedade do orçamento e vínculo ativo. A persistência usa `localStorage` e foi projetada para demonstração em uma aba. Arquivos aceitos têm até 1 MB e ocupam a mesma cota local dos registros.

## API Java planejada

O ponto de substituição do serviço está em `src/services/studio.ts`. O primeiro adaptador HTTP pode obter o agregado de demonstração via `GET /api/v1/studio`. Em seguida, a migração pode separar chaves de consulta e paginar recursos por módulo. Os nomes de status da interface serão traduzidos para enums da API no adaptador.

| Operação                 | Contrato HTTP sugerido                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| Clientes e oportunidades | `GET/POST /customers`, `PATCH /customers/{id}`, `PATCH /opportunities/{id}/stage`           |
| Conversas                | `GET /conversations`, `POST /conversations/{id}/messages`, `PATCH /conversations/{id}/mode` |
| Agente                   | `POST /agent/runs`, `POST /agent/runs/{id}/review`, `PUT /agent/config`                     |
| Orçamentos e agenda      | `/quotes`, `/sessions`, `POST /quotes/{id}/convert`                                         |
| Campanhas e feedback     | `/campaigns`, `POST /campaigns/{id}/simulate`, `/feedback`                                  |
| Configurações            | `GET/PUT /settings`                                                                         |

A API Spring Boot deverá aplicar autorização por estúdio, validar as entradas, devolver erros estruturados e executar gravações relacionadas em transações. A agenda e os disparos devem devolver conflito quando uma operação perde a disputa de concorrência. Anexos vão para armazenamento de objetos e o PostgreSQL mantém as chaves e metadados.

## Modelo PostgreSQL

Um estúdio tem tatuadores, horários, clientes, configuração do agente e campanhas. Cada cliente pode ter várias oportunidades, atividades, anexos, conversas e avaliações. Etiquetas se ligam a clientes em uma relação muitos-para-muitos. Conversas possuem mensagens, que podem referenciar anexos. Orçamentos referenciam clientes e opcionalmente oportunidades, com múltiplos anexos. Sessões pertencem a um tatuador e podem referenciar cliente e orçamento. Feedback pode estar associado a uma sessão. Cada entrega de campanha tem um par único campanha–cliente. Execuções registram entrada, resultado, decisão e revisor.

O esquema impõe consistência de estúdio nos vínculos principais e impede intervalos ativos sobrepostos por tatuador. Use Flyway para a evolução do esquema quando a API for implementada.
