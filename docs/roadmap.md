# Roadmap

O protótipo estático em React valida as telas e os fluxos com os dois estúdios. As próximas etapas, em ordem:

1. **Back-end Java + Spring Boot.** Implementar autenticação real (senha com hash, sessão/JWT), isolamento por estúdio em todas as consultas, Flyway com o modelo de `docs/schema.sql` e contratos OpenAPI. As regras que hoje estão em `src/domain` (pagamento, descontos, indicação, follow-up e estoque) passam para serviços transacionais, com testes de integração para concorrência na agenda e no pagamento.
2. **App Flutter.** Refazer a interface, pensada para celular, consumindo a API. A navegação por barra inferior e as telas deste protótipo servem de referência.
3. **Permissões.** Criar perfis além do dono (recepção, profissional), com acesso restrito a faturamento e estoque.
4. **WhatsApp.** Integrar o envio a partir do follow-up, com modelos aprovados, registro de entrega e respostas.
5. **Estoque automático.** Cadastrar a "receita" de material de cada procedimento, dar baixa ao concluir o atendimento e calcular o custo e a margem por procedimento.
6. **Operação.** Observabilidade, backups testados, políticas de retenção, testes ponta a ponta e validação com os dois estúdios.
