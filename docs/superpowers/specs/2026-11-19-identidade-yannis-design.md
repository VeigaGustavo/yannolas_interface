# Identidade visual Yannis Tattoo

## Intenção

O painel será usado pelo próprio Yannis no estúdio dele, em Palmas-TO. A interface deve ter a cara da marca Yannis Tattoo, que já aparece no Instagram (@yannolas_tattoo) e no site, e não a de um SaaS genérico.

## Abordagens consideradas

- **A. Rebrand completo com a identidade do site (escolhida).** Muda cores, tipografia, logo, nomes e dados fictícios, e mantém o layout.
- **B. Só trocar cor e nomes.** É rápida, mas continua com cara genérica.
- **C. Rebrand editorial**, com fotos, ornamentos e o tema "Acrópole" nas telas. Foi descartada porque contraria a diretriz de evitar decoração e prejudica a leitura de agenda e CRM.

## Decisões

- **Cores.**
  - Tema escuro (padrão): preto `#0b0b0b` e grafites. O texto usa o creme `#FFFCEE`.
  - Tema claro: fundo creme `#FFFCEE` e texto preto.
  - Destaque padrão: laranja `#FF9100`. O tema claro usa um laranja mais escuro no texto para manter o contraste AA.
  - O azul do olho grego aparece só no logo e não vira cor de interface.
- **Tipografia** (decisão minha).
  - Títulos de página e o nome da marca: Instrument Serif em caixa alta com espaçamento, a gratuita mais próxima da serifada condensada do site, que é exclusiva do Wix.
  - Texto da interface: Poppins, a mesma do site.
  - Carregamento pelo Google Fonts no `index.html`, sem dependência nova.
- **Logo.**
  - A marca do busto com o olho grego, extraída do site, entra em `public/brand/` em tamanho otimizado. Ela fica na sidebar ao lado do texto "YANNIS | TATTOO".
  - O selo laranja vira favicon, o que também resolve o 404 atual.
- **Nomes.** O título da página passa a ser "Yannis Tattoo | Painel do estúdio", o estúdio "Yannis Tattoo" e o tatuador "Yannis Manolas".
- **Dados fictícios.** Os estilos predominantes passam a ser fine line, pontilhismo, floral e preto e cinza, e as referências ficam em Palmas-TO. Os clientes continuam fictícios.
- **Cor configurável.** O laranja vira a primeira das opções de destaque nas Configurações, no lugar do verde-limão. Quem tem o verde salvo no navegador passa ao laranja, porque a chave de preferências é versionada.

## Fora do escopo

Não entram mudança de layout, fotos e ornamentos nas telas, nem funcionalidades novas.

## Fica para quem implementar

Os tons exatos de grafite e das bordas, os pesos de fonte e os ajustes finos de contraste. Valem duas restrições: manter contraste AA nos dois temas e não reintroduzir rolagem lateral nas larguras já verificadas.
