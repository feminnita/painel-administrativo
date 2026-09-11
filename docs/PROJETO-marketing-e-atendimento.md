# Projeto — Marketing no painel + IA de atendimento

**Aberto em:** 10/09/2026
**Dono:** Chris
**Regra de conclusão:** nenhum item é dado como pronto sem teste que prove o efeito na fonte real.

---

## 1. Objetivo

Duas frentes, que se cruzam num ponto só (o catálogo):

**A — Marketing no painel.** Trazer para o painel próprio as telas que hoje existem na Tray,
priorizando o que gera venda em vez de replicar tudo.

**B — IA de atendimento no WhatsApp.** Terminar o que existe pela metade, dar um painel de
controle, e treiná-la com o catálogo real para responder sobre produto e mandar link.

---

## 2. O que existe hoje (levantado em 10/09, com evidência)

### Painel (`feminnita/painel-administrativo`)
Já são páginas: `carts`, `coupons`, `newsletter` (1.271 assinantes), `visitas`, `campanhas`,
`orders`, `customers` (1.879), `product`, `stock`, `vitrine`, `banners`.

### Vitrine (`feminnita/site-feminnita`)
No ar em https://site-feminnita-alpha.vercel.app (Vercel). **Repositório separado.**

### Rastreamento
**Não existe.** Não há tabela de eventos. O único dado de audiência é `products.view_count`
— contador simples, sem data, sem sessão, sem origem. Hoje: 173 visualizações em 36 produtos.

### WhatsApp — dois canais, ambos SÓ ENVIAM
| o que | onde | estado |
|---|---|---|
| Meta WhatsApp Business Cloud API | `StockHub/whatsapp_client_new.py` | envia template (romaneio). Oficial. |
| whatsapp-web.js (WWebJS) | repo `feminnita/whatsapp-server` | 93 linhas, rotas `/status` e `/send`. Não oficial, via QR. |

**Não existe IA de atendimento.** Nenhum dos dois recebe mensagem nem responde. O que existe
é uma ponte de envio. O "início de IA" é isto — a ponte, não a inteligência.

---

## 3. Escopo A — Marketing

As 21 telas da Tray, separadas por natureza (o esforço de cada grupo é muito diferente):

| grupo | itens | situação |
|---|---|---|
| **Já existem** | Carrinhos, Cupons, Newsletter, Visitas em produtos, Produto por campanha | talvez precisem de acabamento |
| **Funcionalidade de loja** | Descontos, Brindes, Promoção em lote, Produtos em espera, Cashback, Parceiros e afiliados, Live Shop | exige mexer também no `site-feminnita` |
| **Relatório** | Visitas e conversão, Visitas em categorias, Busca com/sem resultado, Descontos | **bloqueados** sem rastreamento |
| **Integração de anúncio** | Google Ads, Meta Ads, Facebook/Instagram, TikTok Ads | já resolvido por fora (skills `meta-ads-ratos`, `tiktok-campanhas-audit`, `ga4-ratos`, agente `gestor-trafego`) — **não replicar** |

Faltam catalogar as abas **Tráfego** e **Engajamento**.

---

## 4. Escopo B — IA de atendimento

1. **Receber mensagem** — hoje nenhum canal recebe. Sem isso não há atendimento.
2. **Responder com IA** — com o catálogo real como base (produto, preço, estoque, link, medidas).
3. **Painel de controle** — conversas, o que a IA respondeu, quando passou para humano,
   perguntas que ela não soube responder.
4. **Base de conhecimento** — catálogo + perguntas frequentes extraídas de conversas reais.

### Sobre treinar com as conversas existentes
As conversas são a melhor fonte de perguntas frequentes. Dois cuidados obrigatórios:

- **Dados pessoais.** Conversa de cliente tem nome, telefone, endereço, valor de pedido.
  Antes de virar base de conhecimento, passa por anonimização — o que interessa é a
  *pergunta*, não quem perguntou. (LGPD)
- **De onde extrair.** O canal Meta não guarda histórico acessível; o WWebJS consegue ler
  as conversas da conta conectada. Definir qual número tem o histórico que vale.

### Sobre "treinar com cada modelo do site"
Treinar modelo próprio não é o caminho — caro, lento, e desatualiza a cada produto novo.
O certo é **busca no catálogo em tempo real** (RAG): a IA consulta o banco na hora de
responder. Assim ela sempre sabe o preço e o estoque de agora, e manda o link certo.
O catálogo já está no banco do painel, o que torna isso direto.

---

## 5. Ordem de execução

Cada item só é dado como concluído com o teste da coluna da direita.

### Bloco 1 — Fundação de rastreamento *(destrava 5 relatórios)*
| # | Item | Concluído quando |
|---|---|---|
| 1.1 | Tabela de eventos + endpoint no backend | evento gravado e lido de volta no banco |
| 1.2 | Vitrine enviando: página, produto, categoria, busca, carrinho | eventos reais aparecem vindos do site no ar |
| 1.3 | Tela "Busca sem resultado" | mostra termo real buscado por um visitante |

### Bloco 2 — Telas que já dão pra fazer
| # | Item | Concluído quando |
|---|---|---|
| 2.1 | Descontos | desconto aplicado aparece no pedido |
| 2.2 | Visitas e conversão | número bate com os eventos do bloco 1 |
| 2.3 | Visitas em categorias | idem |

### Bloco 3 — IA de atendimento
| # | Item | Concluído quando |
|---|---|---|
| 3.1 | Receber mensagem (webhook) | mensagem de teste chega e fica gravada |
| 3.2 | Responder com catálogo (RAG) | pergunta sobre produto real recebe preço e link corretos |
| 3.3 | Painel de conversas | conversa de teste aparece no painel |
| 3.4 | Base de perguntas frequentes | extraída de conversas reais, anonimizada |
| 3.5 | Passar para humano | palavra-chave ou dúvida não resolvida gera alerta |

### Bloco 4 — Funcionalidades de loja
Brindes, Promoção em lote, Produtos em espera, Cashback, Parceiros e afiliados.
Cada uma exige mexer no `site-feminnita`.

---

## 6. Pendências com o Chris

| # | Pendência | Bloqueia |
|---|---|---|
| P1 | Autorizar mexer no repositório `site-feminnita` | todo o bloco 1 |
| P2 | Mandar as abas **Tráfego** e **Engajamento** da Tray | fechar o escopo A |
| P3 | Qual número de WhatsApp tem o histórico de conversas | 3.4 |
| P4 | Meta Cloud API ou WWebJS para receber? | 3.1 — decide a arquitetura |
| P5 | Definir o que a IA **não** pode fazer (dar desconto? prometer prazo?) | 3.2 |

### Pendências herdadas de outras frentes (10/09)
| # | Pendência | Contexto |
|---|---|---|
| P6 | Amazon: vincular **253** ou **175**? | plano pronto, nada escrito |
| P7 | Mensagem exata do Bling: 300 KB ou 300 px? | decide o conserto das imagens |
| P8 | Estoque do `59200PANTERAG` chegou no TikTok? | decide se troca o clique por API |
| P9 | Canal TIK TOK no Bling A está conectado? | idem |
| P10 | Token do TikTok da **Feminnita** (os dois arquivos apontam para FNT) | verificação de qualquer coisa de TikTok |
| P11 | Restaurar as 24 imagens do 39740 (Chris disse que corrige) | — |
| P12 | Trocar imagem quadrada do 22700 na vitrine | aparece pequena no site |

---

## 7. Riscos conhecidos

- **Escrita em produção.** Já causei perda hoje (24 imagens do 39740, por um `PUT` no Bling).
  Regra daqui pra frente: escrita em sistema externo só com retrato antes e conferência depois.
- **API do Bling não tem endpoint de imagem.** Comprovado. Imagem só entra pela tela.
- **Segurança:** credenciais do Bling A e senha root da VPS estão em texto puro em arquivo
  versionado (`main.py`, `agente_gnre_bling_local.py`). Precisa sair para variável de ambiente
  e o segredo ser trocado.
- **Dados pessoais** nas conversas de WhatsApp — anonimizar antes de usar como base.
