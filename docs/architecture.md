# FeiraBox — Arquitetura

## Arquitetura geral

A especificação define um produto com arquitetura mobile-first e separação entre aplicativo mobile e backend.

### Camadas principais

```text
React Native Mobile
        |
        | HTTP/HTTPS
        v
Elysia.js + Bun API
        |
        +---- PostgreSQL
        |
        +---- Gateway de Pagamento
        |
        +---- Firebase Cloud Messaging
```

## Frontend Mobile

Tecnologia definida:

- React Native
- Android 8.0+
- iOS 14+

Responsabilidades:

- interface do usuário;
- navegação;
- apresentação de dados;
- interação com a API;
- captura de fotos;
- leitura de QR Codes quando aplicável;
- recebimento de notificações push.

O mobile não deve acessar diretamente o PostgreSQL.

## Backend

Tecnologia definida:

- Bun
- Elysia.js

Responsabilidades:

- API;
- autenticação e autorização;
- validação de entrada;
- regras de negócio;
- gerenciamento de usuários;
- produtos;
- caixas surpresa;
- assinaturas;
- pedidos;
- pagamentos;
- comissão;
- Boost;
- notificações;
- persistência.

## Banco de dados

Tecnologia:

- PostgreSQL

O backend é responsável pelo acesso ao banco.

## Integrações externas

### Gateway de pagamento

Responsável por:

- processamento de PIX;
- processamento de cartão;
- cobrança recorrente;
- liquidação/pagamento.

Gateway específico: ainda não definido.

### Firebase Cloud Messaging

Utilizado para notificações push.

## Segurança

A especificação exige:

- hash seguro de senhas;
- HTTPS/TLS;
- backend com alta disponibilidade.

## Design

O aplicativo deve seguir o Design System "Mercado & Ofício".

## Modularidade

O backend deve ser organizado de forma modular e manutenível.

A SRS não define uma estrutura interna obrigatória de pastas. Portanto, detalhes como Clean Architecture, Hexagonal, Repository Pattern etc. devem ser tratados como decisões técnicas do projeto, e não como requisitos já definidos pela SRS.

## Integrações de hardware

O aplicativo pode utilizar:

- câmera para fotos de produtos;
- câmera/leitor para QR Codes na validação de entregas.
