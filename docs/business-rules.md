# FeiraBox — Regras de Negócio

Estas regras foram consolidadas a partir da especificação original. Quando a especificação não definir um detalhe, o agente não deve inventar uma regra sem decisão do projeto.

## Usuários

Um usuário cadastrado pode utilizar os recursos de consumo da plataforma e, opcionalmente, possuir um perfil de feirante/produtor rural.

### Perfis

- Usuário/Consumidor
- Feirante / Produtor Rural
- Administrador da Plataforma

Um mesmo usuário pode possuir um perfil de comercialização opcional.

## Feirante

O feirante/produtor rural pode:

- cadastrar produtos;
- criar Caixas Surpresa;
- gerenciar pedidos;
- visualizar informações de vendas;
- contratar Boost de Vendas.

## Caixa Surpresa

É um kit contendo produtos selecionados da estação ou produção artesanal, comercializado por meio de assinatura recorrente.

## Assinaturas

As assinaturas podem possuir frequência:

- semanal;
- mensal.

O pagamento é antecipado.

O consumidor pode gerenciar sua assinatura, incluindo pausa temporária, alteração de plano e cancelamento.

## Pedidos

Os estados definidos na especificação são:

`Pendente` → `Em Preparação` → `Pronto` → `Entregue`

A especificação também utiliza a expressão "Pronto para Envio/Retirada" em uma história de usuário.

Não introduza outros estados sem decisão do projeto.

## Pagamentos

O pagamento é realizado por gateway externo.

Meios previstos:

- PIX;
- Cartão de Crédito.

O gateway definitivo ainda está "A definir".

## Comissão

A plataforma retém automaticamente uma comissão entre 10% e 15% sobre cada transação.

A especificação não define, neste documento, a regra detalhada para escolha do percentual dentro desse intervalo.

## Boost de Vendas

O Boost é um recurso pago que aumenta a visibilidade da banca/perfil/caixas do feirante.

A contratação envolve pagamento adicional e possui período contratado.

A especificação não define o algoritmo de ranking ou duração dos planos de Boost.

## Logística

O FeiraBox não possui frota logística própria.

A entrega é integrada à logística própria da feira ou do produtor.

## Notificações

A plataforma deve notificar o consumidor sobre eventos relevantes, incluindo confirmação do pedido, renovações e atualização para pedido pronto.

## Geolocalização e busca

O sistema deve permitir curadoria e busca por feiras locais e artesãos próximos ao consumidor.

Detalhes do cálculo de distância e critérios de ordenação não foram definidos na SRS.
