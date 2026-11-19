# Roadmap do MVP

1. **Fundação de dados.** Migrar o modelo para Flyway, implementar autenticação e isolamento por estúdio e expor contratos Spring Boot com OpenAPI. Validar autorização e concorrência por testes de integração.
2. **Fluxo comercial.** Persistir CRM, orçamento e agenda em PostgreSQL. Incluir disponibilidade por tatuador, exceções de expediente, histórico de versões das propostas e regras de cancelamento.
3. **WhatsApp.** Implementar webhook autenticado da Evolution API, deduplicação por evento, fila de envio e transferência humano–agente. Validar primeiro com números de homologação.
4. **Agente de IA.** Integrar LangChain4j, versionar prompts e base de conhecimento, instrumentar execuções e aplicar aprovação humana para atualizações de alto impacto. Avaliar análise multimodal em imagens autorizadas.
5. **Campanhas e retorno.** Registrar consentimento e descadastro, agendar entregas com fila e idempotência, acompanhar resultados e coletar feedback por links de pesquisa.
6. **Operação.** Adicionar observabilidade, backups testados, políticas de retenção, acessibilidade, testes ponta a ponta e validação com estúdios piloto.
