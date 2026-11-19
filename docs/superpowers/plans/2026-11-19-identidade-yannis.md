# Identidade Yannis Tattoo — Plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar este plano tarefa por tarefa. Os passos usam checkbox (`- [ ]`) para acompanhamento.

**Objetivo:** aplicar ao painel a identidade da marca Yannis Tattoo: cores, tipografia, logo, nomes e dados fictícios.

**Arquitetura:** a troca é feita nos tokens CSS de `src/index.css` (`:root` e `:root[data-theme="light"]`), nas fontes carregadas em `index.html`, nos assets em `public/brand/`, no texto da sidebar em `Layout.tsx`, no padrão do store de interface e na base fictícia (`mocks/studio.ts`). O layout não muda.

**Stack:** React 19, Vite, CSS puro com tokens, Zustand, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-19-identidade-yannis-design.md`

## Restrições globais

- Destaque padrão `#ff9100`. Tema escuro com base `#0b0b0b` e texto `#fffcee`. Tema claro com base `#fffcee` e texto preto.
- Títulos (`h1`, `.brand strong`, `.calendar-title`) em Instrument Serif, caixa alta e espaçamento. O resto da interface em Poppins (400/500/600).
- As fontes vêm do Google Fonts por `<link>` no `index.html`, sem dependência npm nova.
- Nomes: título `Yannis Tattoo | Painel do estúdio`, estúdio `Yannis Tattoo`, tatuador `Yannis Manolas`.
- Contraste AA (4,5:1 para texto normal) nos dois temas, incluindo o texto de destaque `--accent-text`.
- Sem rolagem lateral de página nas larguras 1440, 1024, 768, 390 e 320 px.
- Chaves de armazenamento versionadas, para que o navegador não mantenha os nomes e o verde-limão antigos: dados em `tattoo-studio-data-v2` e preferências em `tattoo-studio-ui-v2`.

## Pontos de atenção na revisão

1. **Navegador com dados antigos salvos.** Quem já abriu o protótipo deve ver Yannis Tattoo e o laranja, sem limpar nada à mão. Coberto pela troca de chave na Tarefa 2.
2. **Cor de destaque personalizada clara (ex.: amarelo).** O texto sobre botões de destaque continua legível porque o texto do botão é preto. A Tarefa 1 mantém o texto escuro em `.button` com destaque.
3. **Tema claro.** O laranja puro sobre creme não passa no contraste AA, então `--accent-text` precisa escurecer. A Tarefa 1 verifica no navegador.
4. **Fonte do Google Fonts sem rede.** Precisa haver fallback serifado e sem serifa no `font-family`, para a interface continuar legível.
5. **Logo em telas pequenas.** O texto "YANNIS | TATTOO" não pode estourar a gaveta de 240 px. A Tarefa 3 verifica em 320 px.

---

### Task 1: Tokens de cor, tipografia e favicon

**Arquivos:**
- Modificar: `index.html` (title, links de fonte, favicon)
- Modificar: `src/index.css` (tokens em `:root` e no tema claro, `font-family`, `h1`, `.brand*`, `.logo`)
- Criar: `public/brand/yannis-selo.png` (selo laranja, 64 px) e `public/brand/yannis-marca.png` (busto, 160 px)

**Interfaces:**
- Produz: as classes `.logo` (contêiner da imagem, 40 px, sem fundo de cor) e `.brand strong` (wordmark), usadas na Tarefa 2.

- [ ] **Passo 1:** Gerar os assets com `sips`, a partir de `scratchpad/brand-dl/163ea16626de4a8fb49ca4e3a77f19da.png` (selo, `-Z 64`) e `66e263d37efa44c8afd4c6fe904194f6.png` (busto, `-Z 160`). Conferir com `sips -g pixelWidth`: 64 e 160.
- [ ] **Passo 2:** No `index.html`, usar o title `Yannis Tattoo | Painel do estúdio`, o favicon `<link rel="icon" type="image/png" href="brand/yannis-selo.png">` (caminho relativo, por causa do GitHub Pages), preconnect e o link do Google Fonts para `Instrument+Serif` e `Poppins:wght@400;500;600`.
- [ ] **Passo 3:** Atualizar os tokens do tema escuro em `src/index.css`:
  - `--base: #0b0b0b`, com grafites coerentes em `--side`, `--panel`, `--raised` e `--line`;
  - `--text: #fffcee`;
  - `--accent: #ff9100`;
  - `font-family: Poppins, system-ui, sans-serif`.
- [ ] **Passo 4:** Atualizar os tokens do tema claro:
  - `--base: #fffcee`, com painéis `#fffdf5` e `--line` em bege;
  - `--text: #0b0b0b`;
  - `--accent-text: color-mix(in srgb, var(--accent) 45%, #2a1600)`, conferindo o contraste no Passo 6.
- [ ] **Passo 5:** Ajustar `h1`, `.brand strong` e `.calendar-title`:
  - `font-family: "Instrument Serif", Georgia, serif`;
  - `text-transform: uppercase`;
  - `letter-spacing: 0.04em`;
  - `font-weight: 400`.

  Trocar `.logo` para um contêiner de imagem sem fundo de destaque. Trocar a cor do texto sobre o destaque (os `#12180b` e `#151a0e`) por `#0b0b0b`.
- [ ] **Passo 6:** Rodar `npm run build` (esperado: sem erro). No navegador, medir em `/` e `/configuracoes` o contraste de `--accent-text` sobre `--panel` nos dois temas (esperado: ≥ 4,5).
- [ ] **Passo 7:** Commit com `feat: cores, tipografia e favicon da marca Yannis Tattoo`.

### Task 2: Logo na sidebar, nomes, padrão da cor e dados fictícios

**Arquivos:**
- Modificar: `src/components/Layout.tsx:108-118` (brand) e `:63`, `:160` (fallbacks de nome)
- Modificar: `src/stores/interface.ts` (padrão `accent: "#ff9100"` e `name: "tattoo-studio-ui-v2"`)
- Modificar: `src/pages/Settings.tsx:184` (restaurar para `#ff9100`)
- Modificar: `src/services/studio.ts:12` (chave `tattoo-studio-data-v2`)
- Modificar: `src/mocks/studio.ts` (nomes, projetos, tags e conhecimento)
- Modificar: `README.md` (nome do projeto e chaves de armazenamento)
- Teste: `src/tests/flows.test.tsx`

**Interfaces:**
- Consome: `.logo` e `.brand strong` da Tarefa 1, e `/brand/yannis-marca.png`.

- [ ] **Passo 1: Escrever os testes que devem falhar**

```tsx
it("mostra a marca Yannis Tattoo na navegação", async () => {
  // renderizar o app como os testes existentes fazem
  expect(await screen.findByRole("img", { name: "Yannis Tattoo" })).toBeInTheDocument();
  expect(screen.getByText("Yannis Manolas")).toBeInTheDocument();
});
it("restaura o laranja como cor de destaque", async () => {
  // navegar até Configurações > aba de aparência, clicar em "Restaurar cor padrão"
  expect(useInterface.getState().accent).toBe("#ff9100");
});
```

- [ ] **Passo 2:** Rodar `npm run test` e conferir que os dois testes novos falham (esperado: FAIL, sem a imagem "Yannis Tattoo" e o destaque ainda `#bdff49`).
- [ ] **Passo 3:** Trocar o brand no `Layout.tsx`:
  - `<span className="logo"><img src={import.meta.env.BASE_URL + "brand/yannis-marca.png"} alt="Yannis Tattoo" /></span>`, já preparado para o GitHub Pages (Tarefa 4);
  - `<strong>Yannis | Tattoo</strong>`;
  - `<small>PAINEL DO ESTÚDIO</small>`;
  - remover `.brand-ai` e o import de `Activity`, se ficar sem uso;
  - fallbacks de nome: `"Yannis Manolas"` e `"Yannis Tattoo"`.
- [ ] **Passo 4:** Trocar o padrão do store e do botão de restaurar para `#ff9100`, e as chaves para `tattoo-studio-ui-v2` e `tattoo-studio-data-v2`.
- [ ] **Passo 5:** Atualizar `mocks/studio.ts`:
  - `studio: "Yannis Tattoo"`, `artist: "Yannis Manolas"`;
  - projetos `["Floral em fine line", "Pontilhismo geométrico", "Borboleta delicada", "Realismo preto e cinza", "Cobertura floral", "Mandala em pontilhismo"]`;
  - tags `["fine line", "pontilhismo", "floral", "retorno"]`;
  - `knowledge: "Estilos do estúdio: traços finos, pontilhismo, floral e realismo em preto e cinza. Estúdio em Palmas-TO."`;
  - trocar `"Briefing de fine line gerado para Mariana Costa."` só se o projeto dela mudar de nome.

  Depois, buscar `blackwork` e `flash` em `src/` e ajustar os textos e testes que dependam deles.
- [ ] **Passo 6:** No `README.md`, trocar o nome do projeto para Yannis Tattoo e as chaves citadas para `tattoo-studio-data-v2` e `tattoo-studio-ui-v2`.
- [ ] **Passo 7:** Rodar `npm run test` (esperado: todos passam, inclusive os 2 novos), `npm run lint` e `npm exec prettier -- --check .`.
- [ ] **Passo 8:** Commit com `feat: logo, nomes e dados fictícios do Yannis Tattoo`.

### Task 3: Verificação visual

**Arquivos:** nenhum, a não ser os ajustes que a verificação pedir.

- [ ] **Passo 1:** Com `npx vite --port 5175`, rodar o script Playwright de overflow nas 9 rotas × 1440/1024/768/390/320 px (esperado: nenhuma rolagem lateral de página e nenhuma no `.calendar-scroll`).
- [ ] **Passo 2:** Tirar screenshots do Dashboard, do CRM e da Agenda em 1440 e 390 px, nos temas escuro e claro, e da gaveta aberta em 320 px. Conferir a wordmark sem corte, o logo nítido e os títulos na serifada.
- [ ] **Passo 3:** Conferir no console do navegador que não há mais o 404 do favicon.
- [ ] **Passo 4:** Commitar os ajustes, se houver, com `fix: ajustes visuais da identidade Yannis Tattoo`.

### Task 4: Publicação no GitHub Pages

O site vai ser servido em `https://<usuário>.github.io/<repo>/`, sem reescrita de rotas no servidor.

**Arquivos:**
- Modificar: `vite.config.ts` (`base: "./"`)
- Modificar: `src/main.tsx` (`BrowserRouter` → `HashRouter`)
- Modificar: `src/mocks/studio.ts:79` (referência com `import.meta.env.BASE_URL + "referencia-botanica.svg"`)
- Criar: `.github/workflows/deploy.yml`
- Modificar: `README.md` (seção "Publicar no GitHub Pages") e `.gitignore` (`.playwright-mcp/`)

**Decisões:**
- **Rotas com hash.** O `HashRouter` deixa as URLs como `/#/crm`. Ele funciona em qualquer nome de repositório e ao recarregar a página, sem o truque de `404.html`.
- **`base: "./"`.** Os assets ficam relativos, então o build não depende do nome do repositório.

- [ ] **Passo 1:** Trocar a base e o roteador. Rodar `npm run test` (esperado: os testes passam, porque usam `MemoryRouter` e no Vitest `BASE_URL` é `/`).
- [ ] **Passo 2:** Trocar o caminho da referência do mock. Buscar outros `src="/` ou `"/…svg|png"` em `src/` e aplicar o mesmo padrão.
- [ ] **Passo 3:** Criar o workflow `deploy.yml`:
  - gatilhos: `push` em `main` e `workflow_dispatch`;
  - permissões: `pages: write` e `id-token: write`;
  - job `build`: `actions/checkout@v4`, `actions/setup-node@v4` com `node-version: 24` e `cache: npm`, `npm ci`, `npm run lint`, `npm run test`, `npm run build`, `actions/upload-pages-artifact@v3` com `path: dist`;
  - job `deploy`: `actions/deploy-pages@v4` no environment `github-pages`.
- [ ] **Passo 4:** Rodar `npm run build`, depois `npx vite preview --port 5176 --base ./` ou servir `dist/` de um subcaminho, por exemplo copiando para `scratchpad/site/repo/` e servindo com `python3 -m http.server`. Abrir `/repo/#/agenda`, recarregar e conferir que o logo, o favicon, a referência botânica e as fontes carregam (esperado: nenhum 404 no console).
- [ ] **Passo 5:** No README, explicar como publicar: criar o repositório, fazer `git push` e, em Settings → Pages → Source, escolher "GitHub Actions". A URL fica `https://<usuário>.github.io/<repo>/`.
- [ ] **Passo 6:** Commit com `chore: publicação no GitHub Pages`.
