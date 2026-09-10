# FeiraBox — Requisitos

## Fonte

Este documento consolida os requisitos descritos na Especificação de Requisitos de Software (SRS) do FeiraBox.

## Escopo

O FeiraBox é uma plataforma digital de assinaturas recorrentes para caixas surpresa de produtos artesanais e alimentares oriundos de feiras livres e da agricultura familiar.

A solução conecta diretamente pequenos produtores rurais, agricultores e feirantes a consumidores locais.

### O sistema faz

- Cadastro e gestão de perfis e produtos de feirantes e produtores rurais.
- Planos de assinatura recorrente semanais ou mensais.
- Processamento de pagamentos antecipados.
- Retenção automática de comissão entre 10% e 15%.
- Painel do Feirante com receitas, pedidos e entregas.
- Boost de Vendas para ampliar a visibilidade da banca.

### O sistema não faz

- Gestão de frota logística própria.
- Transporte direto das entregas.
- Marketplace tradicional baseado em leilão ou concorrência por menor preço imediato.

## Requisitos Funcionais

### RF01 — Perfil do Feirante

O sistema deve permitir que o feirante cadastre e edite seu perfil, incluindo fotos, dados pessoais e localização da banca.

Prioridade: Alta.

### RF02 — Produtos e Caixas Surpresa

O sistema deve permitir cadastro, edição e remoção de produtos e composição de Caixas Surpresa.

Prioridade: Alta.

### RF03 — Assinaturas

O sistema deve permitir ao consumidor escolher e contratar assinaturas recorrentes semanais ou mensais.

Prioridade: Alta.

### RF04 — Pagamentos

O sistema deve processar o pagamento antecipado via gateway de pagamento, utilizando PIX e Cartão de Crédito.

Prioridade: Alta.

### RF05 — Painel do Feirante

O sistema deve disponibilizar painel com receita acumulada, pedidos do dia e entregas futuras.

Prioridade: Alta.

### RF06 — Status do Pedido

O sistema deve permitir atualização do status do pedido:

- Pendente
- Em Preparação
- Pronto
- Entregue

Prioridade: Alta.

### RF07 — Comissão

O sistema deve reter automaticamente a comissão da plataforma, entre 10% e 15%, sobre cada transação.

Prioridade: Alta.

### RF08 — Boost de Vendas

O sistema deve permitir ao feirante contratar o Boost de Vendas para obter maior destaque.

Prioridade: Média.

### RF09 — Gerenciamento da Assinatura

O consumidor deve poder:

- pausar temporariamente;
- alterar o plano;
- cancelar a assinatura.

Prioridade: Média.

### RF10 — Notificações

O sistema deve enviar notificações push/e-mail sobre:

- confirmação do pedido;
- renovações;
- prazos de entrega.

Prioridade: Média.

### RF11 — Busca e Curadoria

O sistema deve fornecer curadoria e busca por feiras locais e artesãos próximos ao consumidor.

Prioridade: Baixa.

## Requisitos Não Funcionais

### RNF01 — Desempenho

O tempo de resposta do aplicativo mobile para requisições de consulta não deve ultrapassar 2 segundos sob conexão 4G.

### RNF02 — Usabilidade

A interface deve seguir o Design System "Mercado & Ofício", com legibilidade e facilidade de uso para perfis leigos.

### RNF03 — Segurança

- Senhas devem utilizar algoritmo de hash seguro, como bcrypt.
- Comunicação deve utilizar HTTPS/TLS.

### RNF04 — Confiabilidade

O backend deve apresentar disponibilidade mínima de 99,5%.

### RNF05 — Manutenibilidade

O código deve ser documentado e estruturado em arquitetura modular.

### RNF06 — Compatibilidade

O aplicativo deve rodar em:

- Android 8.0+
- iOS 14+
