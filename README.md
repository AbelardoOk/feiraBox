# 🧺 FeiraBox

> Plataforma de assinaturas recorrentes para feiras livres.

O **FeiraBox** é uma plataforma digital mobile-first voltada à intermediação de assinaturas recorrentes de caixas surpresa compostas por produtos artesanais e alimentares provenientes de feiras livres e da agricultura familiar.

A plataforma conecta **feirantes, produtores rurais e artesãos** a **consumidores locais**, permitindo a contratação de planos de assinatura, processamento de pagamentos recorrentes e gerenciamento de pedidos.

O projeto possui foco inicial nos comerciantes do **Mercado Escola da UFMS**, em Campo Grande/MS.

---

## 📋 Sobre o projeto

O FeiraBox foi desenvolvido como um projeto acadêmico do curso de **Engenharia de Software da Faculdade de Computação (FACOM) da Universidade Federal de Mato Grosso do Sul (UFMS)**.

A plataforma tem como objetivo utilizar tecnologia para aproximar produtores e consumidores, proporcionando maior previsibilidade de demanda para os feirantes e contribuindo para a redução de desperdícios ao longo da cadeia produtiva.

O sistema foi especificado seguindo como referência o padrão **IEEE 830** para especificação de requisitos de software.

---

## 🎯 Objetivos

O FeiraBox tem como principais objetivos:

- Promover maior previsibilidade de demanda para produtores rurais;
- Reduzir o desperdício de alimentos ao longo da cadeia produtiva;
- Incentivar a inclusão digital de agricultores familiares;
- Fortalecer a economia regional do Mato Grosso do Sul;
- Facilitar o acesso dos consumidores a produtos locais;
- Criar um modelo de relacionamento recorrente entre consumidores e produtores.

O foco inicial do projeto é alcançar os comerciantes do **Mercado Escola da UFMS**, com uma meta de **60% de adesão local**.

---

## 👥 Usuários

A plataforma possui três perfis principais.

### 🧑‍🌾 Feirante / Produtor Rural

Produtores rurais, agricultores familiares e artesãos cadastrados na plataforma.

O sistema deve oferecer uma interface intuitiva, com alto contraste e navegação simplificada, considerando usuários com diferentes níveis de familiaridade tecnológica.

### 🛒 Consumidor Local

Usuários interessados em produtos artesanais, alimentares e regionais.

O consumidor pode pesquisar feirantes, contratar assinaturas e acompanhar seus pedidos.

### 🛡️ Administrador

Responsável pelo gerenciamento da plataforma, incluindo:

- Monitoramento do sistema;
- Aprovação de cadastros;
- Acompanhamento de informações financeiras globais.

---

## 💡 Como funciona

O fluxo principal da plataforma é baseado em assinaturas recorrentes.

```text
┌──────────────────────┐
│      Feirante        │
│                      │
│ Perfil + Produtos    │
│ Caixa Surpresa       │
└──────────┬───────────┘
           │
           │ Disponibiliza
           ▼
┌──────────────────────┐
│     Consumidor       │
│                      │
│ Escolhe uma          │
│ assinatura           │
└──────────┬───────────┘
           │
           │ Pagamento
           ▼
┌──────────────────────┐
│ Gateway de Pagamento │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│     Assinatura       │
│      Recorrente      │
└──────────┬───────────┘
           │
           │ Gera pedidos
           ▼
┌──────────────────────┐
│       Pedido         │
│                      │
│ Pendente             │
│ Em Preparação        │
│ Pronto               │
│ Entregue             │
└──────────────────────┘
```

O consumidor pode contratar assinaturas **semanais ou mensais** para receber caixas surpresa de um determinado feirante.

---

## ✨ Funcionalidades

### Feirante

- [ ] Cadastro e edição do perfil;
- [ ] Cadastro de fotos e informações da banca;
- [ ] Cadastro de produtos;
- [ ] Edição e remoção de produtos;
- [ ] Criação de Caixas Surpresa;
- [ ] Visualização de receitas;
- [ ] Visualização de pedidos;
- [ ] Acompanhamento das entregas;
- [ ] Atualização do status dos pedidos;
- [ ] Contratação do Boost de Vendas.

### Consumidor

- [ ] Busca por feirantes e artesãos;
- [ ] Visualização do perfil do feirante;
- [ ] Visualização dos produtos e caixas;
- [ ] Contratação de assinatura semanal;
- [ ] Contratação de assinatura mensal;
- [ ] Pagamento antecipado;
- [ ] Gerenciamento da assinatura;
- [ ] Pausa temporária da assinatura;
- [ ] Alteração de plano;
- [ ] Cancelamento da assinatura;
- [ ] Recebimento de notificações.

### Plataforma

- [ ] Processamento de pagamentos;
- [ ] Cobranças recorrentes;
- [ ] Retenção automática da comissão;
- [ ] Gerenciamento de pedidos;
- [ ] Sistema de notificações;
- [ ] Curadoria de feiras locais;
- [ ] Busca por feirantes próximos;
- [ ] Sistema de Boost de Vendas.

---

## 📦 Caixa Surpresa

A **Caixa Surpresa** é um conjunto de produtos selecionados pelo feirante, provenientes da produção artesanal ou dos produtos disponíveis na feira.

Ela é comercializada através de um plano de assinatura recorrente.

As assinaturas podem possuir duas frequências:

- **Semanal**
- **Mensal**

---

## 🚀 Boost de Vendas

O **Boost de Vendas** é um recurso pago que permite ao feirante aumentar a visibilidade de sua banca dentro do aplicativo.

Quando contratado, o perfil e as caixas do feirante podem receber maior destaque nas buscas e na página inicial durante o período contratado.

---

## 💰 Modelo de negócio

O modelo de negócio do FeiraBox é baseado em uma **comissão sobre as transações realizadas na plataforma**.

A comissão prevista é de:

```text
10% ───────────── 15%
       comissão
```

Não está prevista uma mensalidade fixa de adesão para o feirante.

Além da comissão, o sistema possui o recurso pago de **Boost de Vendas**.

---

## 🚫 O que o FeiraBox não faz

O FeiraBox não possui como objetivo:

- Gerenciar uma frota logística própria;
- Realizar diretamente o transporte das entregas;
- Funcionar como marketplace tradicional baseado em leilões;
- Promover concorrência imediata por menor preço.

A logística de entrega deve ser integrada à estrutura logística da feira ou do próprio produtor.

---

## 🏗️ Arquitetura

O projeto possui uma arquitetura **mobile-first**, composta por uma aplicação mobile, uma API backend e um banco de dados relacional.

```text
                    ┌───────────────────────┐
                    │    React Native       │
                    │    Mobile App         │
                    │                       │
                    │ Android / iOS         │
                    └───────────┬───────────┘
                                │
                                │ HTTP/HTTPS
                                ▼
                    ┌───────────────────────┐
                    │      Elysia.js        │
                    │        Bun            │
                    │                       │
                    │       Backend         │
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │      PostgreSQL       │
                    │                       │
                    │    Banco de Dados     │
                    └───────────────────────┘

                         │
              ┌──────────┴──────────┐
              ▼                     ▼
     Gateway de Pagamento       Firebase
                                Cloud Messaging
```

---

## 🛠️ Stack tecnológica

A especificação do projeto define inicialmente a seguinte stack:

| Camada               | Tecnologia               |
| -------------------- | ------------------------ |
| Mobile               | React Native             |
| Backend              | Elysia.js + Bun          |
| Banco de dados       | PostgreSQL               |
| Notificações         | Firebase Cloud Messaging |
| Gateway de pagamento | A definir                |

### Desenvolvimento

Além da stack principal, o projeto utiliza ferramentas de desenvolvimento e qualidade de código, incluindo:

- TypeScript;
- Prisma ORM;
- Docker;
- Docker Compose;
- ESLint;
- Prettier;
- Husky;
- lint-staged.

---

## 📱 Compatibilidade

O aplicativo deverá ser compatível com:

| Plataforma | Versão mínima |
| ---------- | ------------: |
| Android    |          8.0+ |
| iOS        |           14+ |

---

## ⚡ Requisitos não funcionais

### Desempenho

O tempo de resposta para requisições de consulta no aplicativo mobile não deve ultrapassar **2 segundos sob conexão 4G**.

### Segurança

O sistema deverá:

- Utilizar hash seguro para armazenamento de senhas;
- Utilizar HTTPS;
- Utilizar criptografia TLS na comunicação.

### Confiabilidade

O backend possui como requisito um uptime mínimo de:

```text
99,5%
```

### Manutenibilidade

O código deverá ser:

- Documentado;
- Estruturado em arquitetura modular;
- Organizado por responsabilidades.

---

## 🗃️ Modelo de dados

As principais entidades especificadas para o sistema são:

```text
Feirante
   │
   ├── Produtos
   │
   └── Planos de Assinatura
            │
            ▼
       Assinatura
            │
            ▼
         Pedido
            │
            ▼
        Entrega
```

### Feirante

Principais informações:

- ID;
- Nome;
- CPF/CNPJ;
- Telefone;
- Local da feira;
- Dados bancários;
- Status do Boost.

### Consumidor

Principais informações:

- ID;
- Nome;
- CPF;
- E-mail;
- Telefone;
- Endereço de entrega.

### Produto

Principais informações:

- ID;
- Feirante;
- Nome;
- Descrição;
- Categoria;
- Preço;
- URL da foto.

### Plano de Assinatura

Principais informações:

- ID;
- Feirante;
- Frequência;
- Valor;
- Descrição da Caixa Surpresa.

### Assinatura

Principais informações:

- ID;
- Consumidor;
- Plano;
- Data de início;
- Status do pagamento;
- Próxima cobrança.

### Pedido

Principais informações:

- ID;
- Assinatura;
- Data de geração;
- Data prevista de entrega;
- Status do pedido.

---

## 📋 Requisitos funcionais

| ID   | Requisito                                                | Prioridade |
| ---- | -------------------------------------------------------- | ---------- |
| RF01 | Cadastro e edição do perfil do feirante                  | Alta       |
| RF02 | Cadastro, edição e remoção de produtos e Caixas Surpresa | Alta       |
| RF03 | Contratação de assinaturas semanais ou mensais           | Alta       |
| RF04 | Pagamento antecipado via gateway                         | Alta       |
| RF05 | Painel do Feirante                                       | Alta       |
| RF06 | Atualização do status do pedido                          | Alta       |
| RF07 | Retenção automática da comissão de 10% a 15%             | Alta       |
| RF08 | Contratação do Boost de Vendas                           | Média      |
| RF09 | Gerenciamento das assinaturas                            | Média      |
| RF10 | Notificações push/e-mail                                 | Média      |
| RF11 | Curadoria e busca por feiras locais                      | Baixa      |

---

## 👤 Histórias de usuário

### US01 — Visão Geral de Vendas

> Como feirante sem experiência técnica avançada, quero visualizar minha receita estimada, pedidos do dia e entregas da semana em uma única tela simples, para que eu possa organizar minha colheita e produção antecipadamente sem desperdícios.

### US02 — Assinatura de Caixa Surpresa

> Como consumidor local que aprecia produtos artesanais e agroecológicos, quero assinar uma caixa surpresa recorrente de um feirante do Mercado Escola, para que eu receba periodicamente alimentos frescos em casa e apoie os produtores regionais.

### US03 — Boost de Vendas

> Como feirante cadastrado no FeiraBox, quero contratar a funcionalidade de Boost de Vendas, para que minha banca apareça em destaque na página inicial e atraia mais assinantes.

### US04 — Atualização do Pedido

> Como feirante, quero marcar o status do pedido como "Pronto para Envio/Retirada", para que o consumidor seja notificado em tempo real.

---

## 🔔 Notificações

A plataforma utilizará **Firebase Cloud Messaging (FCM)** para envio de notificações push.

Entre os eventos previstos estão:

- Confirmação do pedido;
- Renovação da assinatura;
- Prazos de entrega;
- Atualização do status do pedido;
- Pedido pronto para envio ou retirada.

---

## 💳 Pagamentos

O sistema deverá utilizar um **Gateway de Pagamento externo** para processar:

- PIX;
- Cartão de crédito;
- Cobranças recorrentes;
- Pagamentos antecipados.

O gateway específico ainda está **a definir**.

---

## 📷 Interfaces externas

O aplicativo deverá utilizar recursos do dispositivo móvel para:

- Captura de fotos de produtos;
- Leitura de QR Codes para validação de entregas.

Além disso, a plataforma deverá integrar-se com:

- Gateway de pagamento;
- Firebase Cloud Messaging;
- Banco de dados relacional em nuvem.

---

## 🎨 Design System

A interface do FeiraBox deverá seguir o Design System **"Mercado & Ofício"**.

O sistema visual deverá utilizar:

- Paleta de cores orgânica;
- Tipografia legível;
- Alto contraste;
- Navegação simplificada;
- Interface adequada para usuários com diferentes níveis de familiaridade tecnológica.

---

## 📊 Painel do Feirante

O Painel do Feirante possui três áreas centrais:

```text
┌─────────────────────────────────────┐
│        Visão Geral                  │
│                                     │
│ Receita acumulada                   │
│ Entregas da semana                 │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│        Ações Rápidas                │
│                                     │
│ Meus Pedidos │ Meus Produtos │ Boost│
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│        Pedidos Recentes             │
│                                     │
│ Pedido #001   Em preparação         │
│ Pedido #002   Pronto                │
│ Pedido #003   Entregue              │
└─────────────────────────────────────┘
```

O objetivo é permitir que o feirante visualize rapidamente suas receitas, pedidos e entregas.

---

## 🧪 Estágio atual

O projeto encontra-se em estágio de desenvolvimento **TRL 3–4**.

Já existe uma visão de interface para o **Painel do Feirante**, contemplando:

- Receita acumulada;
- Entregas da semana;
- Ações rápidas;
- Meus Pedidos;
- Meus Produtos;
- Boost de Vendas;
- Lista de pedidos recentes;
- Status dos pedidos.

---

## 🗺️ Roadmap

### Fase 1 — Fundação

- [x] Estrutura inicial do monorepo
- [x] Configuração do React Native
- [x] Configuração do Bun + Elysia
- [x] Configuração do PostgreSQL
- [x] Configuração do Prisma
- [x] Docker / Docker Compose
- [x] ESLint
- [x] Prettier
- [x] Husky
- [x] lint-staged

### Fase 2 — Autenticação e usuários

- [ ] Cadastro de consumidores
- [ ] Cadastro de feirantes
- [ ] Login
- [ ] Autenticação
- [ ] Gestão de perfis

### Fase 3 — Produtos e Caixas

- [ ] Cadastro de produtos
- [ ] Edição de produtos
- [ ] Remoção de produtos
- [ ] Criação de Caixas Surpresa
- [ ] Catálogo do feirante

### Fase 4 — Assinaturas

- [ ] Planos semanais
- [ ] Planos mensais
- [ ] Contratação de assinatura
- [ ] Pausa de assinatura
- [ ] Alteração de plano
- [ ] Cancelamento

### Fase 5 — Pedidos

- [ ] Geração de pedidos
- [ ] Gestão de pedidos
- [ ] Status do pedido
- [ ] Cronograma de entregas
- [ ] QR Code para validação

### Fase 6 — Pagamentos

- [ ] Escolha do gateway
- [ ] PIX
- [ ] Cartão de crédito
- [ ] Cobrança recorrente
- [ ] Comissão automática
- [ ] Integração de pagamentos

### Fase 7 — Comunicação

- [ ] Firebase Cloud Messaging
- [ ] Notificações de pedidos
- [ ] Notificações de renovação
- [ ] Notificações de entrega

### Fase 8 — Boost

- [ ] Contratação do Boost
- [ ] Pagamento do Boost
- [ ] Destaque nas buscas
- [ ] Destaque na página inicial

---

## 📁 Estrutura do projeto

```text
feiraBox/
│
├── mobile/
│   └── Aplicação React Native
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── infrastructure/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── vendors/
│   │   │   ├── products/
│   │   │   ├── boxes/
│   │   │   ├── subscriptions/
│   │   │   ├── orders/
│   │   │   ├── payments/
│   │   │   ├── deliveries/
│   │   │   └── boosts/
│   │   └── shared/
│   │
│   ├── prisma/
│   ├── tests/
│   ├── Dockerfile
│   └── package.json
│
├── .husky/
├── docker-compose.yml
├── eslint.config.js
├── .prettierrc
├── .prettierignore
├── package.json
└── README.md
```

---

## ⚙️ Instalação

### Pré-requisitos

- Git
- Bun
- Docker
- Docker Compose
- Ambiente de desenvolvimento React Native/Expo

### Clone o projeto

```bash
git clone <URL_DO_REPOSITORIO>

cd feiraBox
```

### Instale as dependências

```bash
bun install
```

Caso necessário, instale as dependências dos projetos:

```bash
cd server
bun install

cd ../mobile
bun install
```

---

## 🐳 Executando com Docker

Na raiz do projeto:

```bash
docker compose up -d
```

Verifique os containers:

```bash
docker compose ps
```

Para interromper os serviços:

```bash
docker compose down
```

---

## 🗄️ Banco de dados

O projeto utiliza PostgreSQL.

No diretório `server`:

```bash
cd server
```

Execute as migrations:

```bash
bunx prisma migrate dev
```

Gere o Prisma Client:

```bash
bunx prisma generate
```

Para abrir o Prisma Studio:

```bash
bunx prisma studio
```

---

## 🖥️ Executando o backend

```bash
cd server
bun run dev
```

---

## 📱 Executando o aplicativo

```bash
cd mobile
bun start
```

O aplicativo pode ser executado nos ambientes Android e iOS suportados pelo projeto.

---

## 🧹 Qualidade de código

### ESLint

```bash
bun run lint
```

### Prettier

```bash
bun run format
```

Verificar formatação:

```bash
bun run format:check
```

O projeto utiliza **Husky + lint-staged** para executar verificações automaticamente durante os commits.

---

## 📚 Documentação

A documentação principal de requisitos do projeto está baseada na:

**Especificação de Requisitos de Software — FeiraBox**, elaborada seguindo como referência o padrão IEEE 830.

O documento contém:

- Propósito;
- Escopo;
- Definições;
- Descrição geral;
- Requisitos funcionais;
- Requisitos não funcionais;
- Interfaces externas;
- Requisitos de dados;
- Histórias de usuário;
- Protótipos;
- Stack tecnológica.

---

## 🌱 Impacto esperado

O FeiraBox busca contribuir para:

- Redução de desperdícios de alimentos;
- Inclusão digital de agricultores familiares;
- Fortalecimento da economia regional;
- Valorização de produtos locais;
- Maior previsibilidade de produção;
- Aproximação entre produtores e consumidores.

O projeto está relacionado aos **Objetivos de Desenvolvimento Sustentável (ODS) 2, 8, 9 e 12**.

---

## 👨‍💻 Equipe

Projeto desenvolvido por estudantes de **Engenharia de Software — FACOM/UFMS**.

### Mantenedores

- **Abelardo Palácios Ribeiro**
- **Miguel Ribeiro Bernal**
- **Pedro Henrique Guimarães Mendonça**
- **Vitor Hugo Batista Garcia**

---

## 📄 Referências

- IEEE Std 830-1998 — _IEEE Recommended Practice for Software Requirements Specifications_
- ABNT NBR 14724 — _Informação e documentação — Trabalhos acadêmicos — Apresentação_
- Especificação de Requisitos de Software — FeiraBox

---

## 🚧 Status

**Em desenvolvimento — TRL 3–4**

O projeto encontra-se em desenvolvimento e as funcionalidades descritas no roadmap serão implementadas progressivamente conforme a evolução do MVP.

```

Essa versão está mais alinhada à documentação porque, por exemplo, **não transforma o gateway de pagamento em uma tecnologia específica** — o documento explicitamente diz que ele ainda está "A definir" — e mantém **FCM** como tecnologia de notificações. :contentReference[oaicite:0]{index=0}

Também preservei os requisitos formais, inclusive os **11 requisitos funcionais**, requisitos de desempenho, segurança, disponibilidade e compatibilidade definidos na SRS. :contentReference[oaicite:1]{index=1}

Uma diferença importante em relação ao README anterior é que este documento trata o **Boost, Caixa Surpresa, recorrência, comissão de 10–15%, QR Code, painel do feirante e os quatro casos de uso principais** exatamente como elementos da especificação, em vez de inventar funcionalidades adicionais. :contentReference[oaicite:2]{index=2}
```
