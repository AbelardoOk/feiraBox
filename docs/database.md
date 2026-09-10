# FeiraBox — Modelo de Dados

Este documento representa as principais entidades descritas na SRS.

## Usuario

Campos descritos:

- `id_usuario`
- `nome`
- `email`
- `senha`
- `data_criacao`
- `data_atualizacao`
- `feirante?`

Relacionamentos descritos:

- pedidos
- assinaturas
- perfil de feirante opcional

## Feirante

Campos:

- `id_feirante`
- `id_usuario`
- `nome`
- `cpf/cnpj`
- `telefone`

Relacionamentos:

- produtos
- caixas

## Produto

Campos:

- `id_produto`
- `id_feirante`
- `nome`
- `descricao`
- `categoria`
- `preco`
- `foto_url`

## Plano de Assinatura

Campos:

- `id_plano`
- `id_feirante`
- `frequencia`
- `valor`
- `descricao_caixa_surpresa`

Frequências previstas:

- semanal;
- mensal.

## Assinatura

Campos:

- `id_assinatura`
- `id_consumidor`
- `id_plano`
- `data_inicio`
- `status_pagamento`
- `data_proxima_cobranca`

## Pedido

Campos:

- `id_pedido`
- `id_assinatura`
- `data_geracao`
- `data_prevista_entrega`
- `status_pedido`

Status definidos na SRS:

- Pendente
- Em Preparação
- Pronto
- Entregue

## Observação

A SRS apresenta as entidades e seus atributos principais, mas não fornece um esquema relacional completo.

Portanto, detalhes como:

- tipos SQL;
- índices;
- constraints;
- cardinalidades completas;
- tabelas auxiliares;
- auditoria;
- timestamps adicionais;
- tabelas de pagamento;
- tabelas de notificações;
- tabelas de Boost;

devem ser definidos durante o projeto e documentados como decisões técnicas.
