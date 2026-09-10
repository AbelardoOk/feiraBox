# FeiraBox — Instruções para Agentes

## 1. Contexto do projeto

O FeiraBox é uma plataforma digital de assinaturas recorrentes para caixas surpresa de produtos artesanais e alimentares oriundos de feiras livres e da agricultura familiar.

A plataforma conecta pequenos produtores rurais, agricultores e feirantes a consumidores locais.

O foco inicial do projeto é o Mercado Escola da UFMS, em Campo Grande/MS.

## 2. Documentação de referência

Antes de implementar ou modificar uma funcionalidade, consulte a documentação relacionada:

- `docs/requirements.md` — requisitos funcionais e não funcionais.
- `docs/business-rules.md` — regras de negócio derivadas da especificação.
- `docs/architecture.md` — arquitetura e responsabilidades das camadas.
- `docs/database.md` — entidades e dados descritos na especificação.
- `docs/api.md` — orientação para contratos da API.
- `docs/specification/feirabox-srs.pdf` — especificação original do projeto.

A especificação original é a fonte de referência do escopo e dos requisitos do projeto.

## 3. Stack definida na especificação

- Mobile: React Native
- Backend API: Elysia.js + Bun
- Banco de dados: PostgreSQL
- Notificações push: Firebase Cloud Messaging (FCM)
- Gateway de pagamento: a definir

Não substitua essas tecnologias sem uma decisão explícita do projeto.

## 4. Arquitetura

O projeto deve manter separação entre cliente mobile e backend.

O aplicativo mobile deve consumir o backend por meio da API e não acessar o banco de dados diretamente.

O backend é responsável por regras de negócio, autenticação, persistência e integrações externas.

## 5. Regras de desenvolvimento

- Preserve a arquitetura existente.
- Evite introduzir complexidade que não seja necessária.
- Não invente requisitos ou regras de negócio.
- Antes de criar uma funcionalidade nova, verifique os requisitos existentes.
- Mantenha o código modular e manutenível.
- Valide entradas recebidas pela API.
- Senhas nunca devem ser armazenadas em texto puro.
- A comunicação de produção deve utilizar HTTPS/TLS.
- Autenticação deve ser implementada de forma segura.
- Execute testes, lint e typecheck disponíveis antes de concluir uma tarefa.
- Não altere contratos existentes sem avaliar os consumidores afetados.

## 6. Requisitos funcionais

- RF01 — Cadastro e edição do perfil do feirante.
- RF02 — Cadastro, edição e remoção de produtos e composição de Caixas Surpresa.
- RF03 — Contratação de assinaturas recorrentes semanais ou mensais.
- RF04 — Pagamento antecipado via gateway, usando PIX e Cartão de Crédito.
- RF05 — Painel do Feirante.
- RF06 — Atualização do status do pedido.
- RF07 — Retenção automática da comissão da plataforma entre 10% e 15%.
- RF08 — Contratação do Boost de Vendas.
- RF09 — Gerenciamento da assinatura pelo consumidor.
- RF10 — Notificações push/e-mail.
- RF11 — Curadoria e busca por feiras locais e artesãos próximos.

## 7. Fluxo recomendado para agentes

Antes de alterar código:

1. Entenda a estrutura atual do repositório.
2. Leia este arquivo.
3. Leia os documentos específicos relacionados à tarefa.
4. Localize o código existente responsável pela funcionalidade.
5. Verifique modelos, serviços, rotas e dependências afetadas.
6. Implemente a menor alteração coerente com a arquitetura.
7. Execute validações disponíveis.
8. Informe claramente o que foi alterado e quais validações foram executadas.

## 8. Conflitos entre documentação e código

Se o código atual divergir da documentação:

- não assuma automaticamente que a documentação ou o código está correto;
- identifique a divergência;
- preserve o comportamento existente quando uma mudança puder causar quebra;
- sinalize a divergência antes de alterar regras de negócio ou arquitetura de forma ampla.

## 9. Princípio geral

O agente deve agir como um desenvolvedor do projeto, e não como um gerador de código isolado.

Priorize consistência com os requisitos, arquitetura, regras de negócio e código existente.

## Autenticação

O backend utiliza JWT para autenticação.

Ao implementar endpoints protegidos:

- utilize o mecanismo de autenticação JWT existente;
- não crie outro mecanismo de autenticação paralelo;
- valide o token antes de acessar recursos protegidos;
- respeite as regras de autorização existentes;
- não exponha secrets ou credenciais no código;
- não altere o fluxo de autenticação sem avaliar os impactos no mobile.
