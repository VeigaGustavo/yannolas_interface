# Painel do estúdio — Yannis Tattoo e Lumi Estética

Protótipo navegável, pensado primeiro para celular, que atende **dois estúdios separados**: o Yannis Tattoo e a Lumi Estética Avançada, uma clínica de biomedicina estética. As regras são as mesmas para os dois. Mudam a marca, o vocabulário e os campos de cada um. Os módulos são Início, Agenda, Clientes (CRM), Follow-up, Faturamento, Fidelidade, Estoque, Orçamentos e Configurações.

> **Protótipo:** os dados ficam no navegador de quem usa, e o login é simulado, sem segurança real. Cada estúdio vê apenas os próprios dados, mas isso vale só dentro deste navegador.

### Contas de demonstração

| Estúdio                | E-mail            | Senha     |
| ---------------------- | ----------------- | --------- |
| Yannis Tattoo          | `yannis@demo.app` | `demo123` |
| Lumi Estética Avançada | `lumi@demo.app`   | `demo123` |

## Executar

Use Node.js 24 LTS e npm.

```sh
npm ci
npm run dev
```

Abra `http://localhost:5173`. Os dados fictícios ficam no armazenamento local do navegador, um conjunto por estúdio. Para voltar à base inicial, remova as chaves `studio-data-v3-yannis`, `studio-data-v3-lumi`, `studio-session-v3` e `studio-ui-v3` nos dados do site.

### Docker Compose

```sh
docker compose up frontend
docker compose --profile database up postgres
```

O primeiro comando sobe o frontend em `http://localhost:5173`. O segundo inicia o PostgreSQL opcional em `localhost:5432` e aplica o esquema no primeiro uso do volume.

## Publicar no GitHub Pages

O build é estático e funciona em qualquer subcaminho. As rotas usam hash, por exemplo `/#/agenda`, para que recarregar a página não gere 404.

1. Crie o repositório no GitHub e envie a branch `main`.
2. Em **Settings → Pages → Build and deployment**, escolha **GitHub Actions** como fonte.
3. A cada push na `main`, o workflow `.github/workflows/deploy.yml` roda lint, testes e build e publica em `https://<usuário>.github.io/<repositório>/`.

## Roteiro de demonstração

1. **Entrar:** entre com uma das contas de demonstração. A marca, as cores e o vocabulário mudam conforme o estúdio. Na Lumi, por exemplo, aparece "Procedimento" no lugar de "Sessão".
2. **Concluir um atendimento:** na Agenda, abra um horário confirmado e toque em **Concluir**. O pagamento abre já preenchido com o valor do orçamento e o sinal pago. Escolha um desconto (benefício do cliente, cupom `FLASH10`/`LUMI15` ou desconto manual), a forma de pagamento e as parcelas. O desconto incide sobre o total e o sinal é abatido depois.
3. **Faturamento:** confira o que entrou no mês, o que falta receber das parcelas, as despesas e o lucro. Registre uma despesa.
4. **Follow-up:** veja os contatos de hoje e os atrasados. Use **Chamar no WhatsApp**, marque "Sem resposta" e veja a nova tentativa ser agendada. Os follow-ups nascem sozinhos a partir de orçamento sem resposta, atendimento concluído, retorno, aniversário, cliente inativo e indicação.
5. **Clientes:** cadastre um cliente indicado por outro. Quem indicou ganha um benefício "Pendente", liberado no primeiro atendimento pago do indicado. A ficha mostra as abas Financeiro e Fidelidade.
6. **Fidelidade:** crie um cupom e um sorteio para um cliente e acompanhe o ranking de indicações.
7. **Estoque:** registre uma compra, que vira despesa automaticamente, ou ajuste a contagem. O Início avisa quando algum item está abaixo do mínimo.
8. **Trocar de estúdio:** saia pelo menu "Mais" (no celular) ou pela barra lateral e entre com a outra conta. Os dados dos dois estúdios não se misturam.

## Validação

```sh
npm run lint
npm run test
npm run build
npm exec prettier -- --check .
```

- [Arquitetura e API planejada](docs/arquitetura.md)
- [Modelo PostgreSQL](docs/schema.sql)
- [Roadmap](docs/roadmap.md)
