# Tattoo Studio AI

Protótipo navegável para operar um estúdio de tatuagem. Inclui Dashboard, CRM, Atendimento, Agente de IA, Orçamentos, Agenda, Campanhas, Pós-atendimento e Configurações.

## Executar

Use Node.js 24 LTS e npm.

```sh
npm ci
npm run dev
```

Abra `http://localhost:5173`. O frontend usa dados fictícios gravados no armazenamento local do navegador. Para voltar à base inicial, remova as chaves `tattoo-studio-data-v1` e `tattoo-studio-ui` nos dados do site.

### Docker Compose

```sh
docker compose up frontend
docker compose --profile database up postgres
```

O primeiro comando sobe o frontend em `http://localhost:5173`. O segundo inicia o PostgreSQL opcional em `localhost:5432` e aplica o esquema no primeiro uso do volume.

## Roteiro de demonstração

1. Crie um lead pelo Dashboard. Mova sua oportunidade no Kanban por arraste ou pelo seletor de etapa.
2. Abra o perfil e inicie uma conversa. Em uma conversa no modo IA, simule uma mensagem recebida para ver a referência e a resposta automática.
3. Abra o Agente de IA, escolha um cliente e use a referência botânica ou carregue outra imagem. Revise o briefing antes de aprovar a atualização no CRM. O briefing usa atributos fictícios fixos.
4. Crie um orçamento, marque como aprovado e converta a proposta em uma sessão. A agenda valida sobreposições e permite reagendamento e cancelamento.
5. Pré-visualize uma campanha e simule o disparo. Em Pós-atendimento, registre a resposta a uma pesquisa e defina a data de retorno.
6. Altere o tema, a cor de destaque ou as preferências de lembretes nas Configurações.

Campanhas agendadas registram uma data planejada. O disparo ocorre apenas com a ação de simulação. Mensagens, imagens e edições ficam no navegador.

## Validação

```sh
npm run lint
npm run test
npm run build
npm exec prettier -- --check .
```

- [Arquitetura e API planejada](docs/arquitetura.md)
- [Modelo PostgreSQL](docs/schema.sql)
- [Roadmap do MVP](docs/roadmap.md)
