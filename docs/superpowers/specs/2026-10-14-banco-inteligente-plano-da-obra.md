# Banco Inteligente: plano da obra

Documento vivo, atualizado a cada conversa de planejamento. Última atualização: 14/10/2026 (versão para aprovação).

O StockHub foi uma obra começada e abandonada no meio. O objetivo aqui é **reestruturar a obra para que pare de gerar bagunça**, e não limpar a bagunça.

---

## 1. O objetivo (palavras da Chris)

- **Cadastro uma vez só.** Hoje cada canal exige cadastrar e depois vincular ao Bling um a um. Isso é "impraticável".
- **Um botão envia o que for preciso:** uma variação nova dentro de um anúncio que já existe, um produto novo ou um canal novo. Tudo já vinculado ao Bling e ao StockHub, respeitando o que cada marketplace exige.
- **Variação esgotada ou encerrada sai sozinha** de todos os marketplaces, com conexão segura. Hoje, apagar no Bling quebra a comunicação, e os canais seguem vendendo o que não existe.
- **Etiquetas de todas as plataformas num lugar só.**
- **Promoções e campanhas acompanhadas e ativadas por um sistema inteligente**, sem planilha e sem entrar em cada plataforma.
- **Os agentes trabalham sozinhos**, para a Chris poder se dedicar a outras coisas.
- **No futuro, virar SaaS** para quem quer vender em marketplace e não sabe como, ou não tem quem saiba.

## 2. As causas da bagunça (o que a obra precisa eliminar)

1. **Recusa do canal tratada como falha passageira.** O sistema insiste 5 vezes, desiste e não avisa ninguém. Por isso, em 14/10, havia 27 SKUs com 0 a 3 peças aparecendo com cerca de 1.000, e 32 envios presos.
2. **Ninguém escuta quando quebra.** Os alertas iam para o WhatsApp, que morreu em 17/07, e as tarefas dizem "ok" mesmo falhando.
3. **Mexem direto no servidor, sem histórico.** Não há Git, há 729 cópias soltas, e sessões de terminal e scripts avulsos editam a produção.
4. **O cadastro mora no Bling e o vínculo mora em vários lugares.** StockHub, Gestão e Marketing têm, cada um, a sua conexão com o mesmo anúncio.

## 3. Decisões tomadas

### Rumo
| # | Decisão |
|---|---|
| D1 | **O StockHub é o dono do cadastro** (o banco inteligente). Produto e variação nascem e são encerrados só nele. O Bling B, os canais e o site seguem o que ele manda. Nunca mais apagar direto no Bling. |
| D14 | **Caminho B:** o banco novo é construído ao lado (Postgres, multiempresa, Git), e as funções passam aos poucos. O StockHub velho continua cuidando do estoque até cada peça nova estar provada. (Rejeitados: reformar por dentro; reescrever e virar a chave num dia.) |
| D8 | **Multiempresa desde o primeiro dia.** Feminnita e FNT são as empresas 1 e 2. A venda do SaaS só depois de 1 a 3 meses rodando sozinho. |
| D21 | **Uma plataforma: núcleo + módulos.** Núcleo obrigatório: empresa, usuários, conexões, cadastro, vínculos e estoque. Módulos ligados por empresa: Precificação, Promoções, Pedidos e etiquetas, Atendimento IA, Marketing, Financeiro e Produção. **A calculadora vira o módulo Precificação** (regras de cada marketplace mantidas por nós + números editáveis por empresa: custo, imposto, margem, % ads, regras do site). O banco usa para piso, preço e promoções; a Gestão usa para conferir o repasse. Preço do SaaS: base + módulos + uso. |
| D5 | **StockHub × Gestão:** o StockHub cuida de tudo o que mexe no anúncio (cadastro, vínculos, estoque, preço publicado, promoções, oferta relâmpago, etiquetas). A Gestão cuida da conferência do repasse e do restante do financeiro. |
| D6 | Os agentes de promoção e de oferta relâmpago viram rotinas do StockHub. O agente de ads fica no Marketing. |

### Empresas e canais
| # | Decisão |
|---|---|
| D2 | FNT/Armmís é a empresa principal. A Feminnita continua ativa, só com estoque e sem cadastro novo. |
| D3 | A Shopee FNT de hoje vai para o UpSeller do irmão (SP), e o StockHub para de gravar nela no dia da troca. A Shopee Feminnita troca de titular e vira a Shopee FNT do nosso sistema. |
| D7 | Primeiros canais da obra nova: **ML FNT, TikTok FNT e site Armmís**. Depois: Shopee (nova FNT), Amazon FNT e Shein FNT. |
| D4 | **Fora:** Kwai (sem API), Temu (encolhendo no Brasil e controla o preço ao consumidor) e Magalu (pequeno, caindo, custo alto para ticket baixo). Podem ser reavaliados; o banco nasce preparado para canais novos. |
| D27 | **Full:** cada armazém (ML Full, Shopee Full, Amazon FBA) é um **local de estoque separado**. "Enviar para o Full" tira da fábrica e põe no armazém; "retorno do Full" faz o inverso, passando pela conferência. O estoque do armazém é lido do canal, nunca gravado. Situação em 14/10: o Full da FNT está voltando; o ML Full da Feminnita está em disputa; a Amazon FBA teve remoção pedida; em breve haverá Full na Shopee FNT e no ML FNT. |

### Estoque e vida da variação
| # | Decisão |
|---|---|
| D12 | **O +1000 é intencional (ranqueamento) e continua.** A correção é não deixar promoção reservar acima do estoque real. |
| D16 | **Recusa definitiva com estoque até 3:** o sistema pausa sozinho aquele SKU naquele canal, avisa no Telegram e reativa quando a peça voltar. |
| D22 | **Na Shopee** (que não pausa um tamanho só): tira o SKU da promoção e baixa o estoque para o real; o anúncio só é deslistado se todas as variações acabarem. |
| D18 | **Regra "ao zerar", por produto, com exceção por variação:** (a) **aguarda reposição** (ex.: 59200 liso); (b) **elimina dos marketplaces** (ex.: 24520 estampado, que 99,9% não volta). Dá para encerrar uma cor específica com um clique. Anúncio nunca é apagado: sai a variação; sem nenhuma, o anúncio é pausado. Botão **reativar** se uma estampa voltar. |
| D19 | **Eliminar só com o estoque realmente acabado:** estoque zero **+** nenhum pedido daquele SKU aguardando pagamento em nenhum canal **+** 24 horas desde o fim da última reserva. Pedido não pago que cai devolve a peça, e a variação reaparece sozinha. |
| D23 | **"Aguarda reposição" sem ficar esquecido:** onde o canal deixa, pausa só a variação; onde não deixa, fica esgotada por **7 dias** e sai do anúncio. Quando o estoque volta, **o banco recoloca sozinho** e confere; se falhar, avisa. Lista semanal das variações fora do ar aguardando reposição. Motivo (Chris): loja cheia de esgotado perde entrega no algoritmo. |
| D17 | **Kits** nascem de resto de estoque (grade quebrada): mesmo modelo, mesmo tamanho, 2 ou 3 cores. **"Montar kit"** (cores exatas e quantidade) tira as peças do avulso e cria o estoque do kit, que é um SKU próprio; vendeu, baixa sozinho. **"Desmontar kit"** devolve. |
| D26 | **Devolução** só volta ao estoque depois de conferida, **pelo celular**: (1) voltou boa → entra; (2) defeito/usada/sem etiqueta → não entra, registrada; (3) chegou outra coisa → não entra e abre alerta para contestar no prazo. Foto obrigatória em 2 e 3. Cancelamento antes do envio volta na hora. |

### Cadastro, preço e promoções
| # | Decisão |
|---|---|
| D20 | **Cadastro inteligente:** a IA preenche a versão de cada canal (título no limite, descrição, ficha, categoria, fotos), a Chris revisa numa tela só com os canais lado a lado e clica em "publicar". Nada vai ao ar sem aprovação. |
| D24 | **Critérios das promoções** (nível "sugere"): 1) preço + subsídio acima do piso; 2) só com estoque real, nunca com o +1000; 3) não entra a classe A; 4) prioridade para parados há 30 dias e para muita visita com pouca venda; 5) entre campanhas na mesma data, a de melhor resultado em reais. |
| D13 | **Regra dos 30 dias:** anúncio sem venda em 30 dias troca capa, título e descrição. Vira rotina mensal do banco, no nível "sugere". |

### Pedidos, etiquetas e equipe
| # | Decisão |
|---|---|
| D25 | **Tudo em etiqueta térmica, por marketplace e por pedido.** Para cada pedido sai a **ficha de separação do banco** e logo depois a etiqueta de envio, em **todos os canais, inclusive ML**. Na Amazon (sem API de etiqueta no Brasil) acaba a anotação a caneta. |
| D28 | **Perfis da equipe:** Dona (Chris, tudo); Cadastro (Chris + 1 pessoa a treinar; publica só com aprovação); Expedição (3 pessoas: 1 imprime etiquetas, 2 separam); Atendimento (3 pessoas). Cerca de 8 usuários. Toda ação registrada com o nome de quem fez. |

### Agentes e SaaS
| # | Decisão |
|---|---|
| D9 | **3 níveis de autonomia** por agente e canal: **observa**, **sugere** (1 clique ou passo a passo) e **age sozinho dentro de limites**. Dinheiro começa no "sugere". |
| D10 | **Só API oficial no produto.** Robô de navegador e contas pessoais ficam só para uso nosso. |
| D11 | A base da Lia vem do histórico de 6 meses da coexistência do WhatsApp. |
| D15 | As 9 sugestões de melhoria entram na obra (ver etapas). |

## 4. Etapas da obra

| Etapa | O que entrega | Depende de |
|---|---|---|
| **0. Vistoria** | Inventário completo do que existe: robôs, tarefas do Windows, scripts avulsos, agentes nos 4 sistemas, vínculos, onde cada canal é tocado; para cada item, se é API ou navegador, última execução real conferida na fonte, e destino na obra. Só leitura. Entrega em Excel. | — |
| **1. Fundação** | StockHub (servidor e `C:\StockHub`) no Git e `deploy.bat` desativado; senhas fora do código; **sinal de vida** de cada robô e tarefa com alerta no Telegram (inclusive o webhook do Bling, que se desliga após 3 dias de falha); **recusa definitiva tratada** (D16/D22); **conferência diária** do estoque real contra os canais; **modo ensaio** para toda regra nova; **migração do estoque da Shein para a API v2** (a v1 sai do ar em 31/12/2026). | 0 |
| **2. Estrutura do banco novo** | Postgres multiempresa: empresas, produtos, variações, canais, vínculos, locais de estoque (fábrica e cada Full), kits, dados fiscais, usuários e perfis (D28), histórico de cada mudança. | 1 |
| **3. Vida da variação** | Regras D18, D19 e D23: zerar, eliminar, recolocar e reativar em todos os canais e no Bling, com conferência na fonte. Inclui ler os **pedidos aguardando pagamento** de cada canal (necessário para a D19). | 2 |
| **4. Cadastro inteligente** | Botão que publica produto e variação nova no ML FNT, TikTok FNT e site, com as regras de cada canal (D20), já vinculado ao Bling B. Fotos uma vez só, ajustadas por canal. Regras técnicas R1 a R3. | 3 |
| **5. Precificação e promoções** | Módulo Precificação (D21) com piso por SKU e canal; promoções no nível "sugere" com os critérios da D24. | 4 |
| **5B. Avaliador mensal** | Regra dos 30 dias (D13), usando os pedidos guardados no banco. | 4 |
| **6. Pedidos e etiquetas** | Pedidos de todos os canais numa tela só; ficha de separação + etiqueta térmica por pedido e por marketplace (D25); conferência de devolução pelo celular (D26). | 4 |
| **7. Mais canais** | Shopee (nova FNT), Amazon FNT, Shein FNT. | 4 |
| **8. Motor de estoque** | O cálculo do estoque passa para o banco novo, com Full separado (D27) e devolução/cancelamento voltando sozinhos; o StockHub velho é desligado. | 3–7 |
| **9. Agentes e painel de permissões** | Os 3 níveis (D9), registro de cada ação. Rotinas: promoções, oferta relâmpago, respostas de avaliações, recuperação de não pagos, vídeos, aviso de reposição. | 5 |
| **10. SaaS** | Cadastro de cliente, planos, aprovação como parceiro (ISV) nos marketplaces, piloto (o irmão é um candidato). | 9 + 1 a 3 meses rodando |

## 5. Regras técnicas (da pesquisa de APIs de 14/10)

- **R1.** No TikTok, editar um produto exige mandar todos os SKUs, e o que faltar é apagado; no Bling pode acontecer o mesmo (a testar só em produto de teste). O banco sempre envia a lista completa a partir do próprio registro, em modo ensaio primeiro, e confere no canal.
- **R2.** Nunca excluir e recriar: gera código novo e quebra o vínculo. Só inativar ou retirar.
- **R3.** Edição de título, descrição ou fotos volta para análise no TikTok (minutos) e na Shein. O banco mostra "em análise" até a aprovação. Na Shein, "code 0" não é aprovação.
- **R4.** Avisos (webhooks) são gravados antes de responder "ok", com conferência de assinatura e descarte de repetidos.
- **R5.** Robôs de navegador usam caminhos internos não documentados e podem quebrar sem aviso: ficam para uso nosso, com sinal de vida.
- **R6.** A regra dos 30 dias usa os pedidos guardados no banco como fonte principal.

## 6. Pendências com data

- **31/12/2026:** a API de estoque da Shein que o StockHub usa sai do ar (migração na etapa 1).
- **27/03/2027:** a API de pedidos da Amazon usada pelo `cron_amazon_pedidos.py` é removida.
- **30/06/2027:** os relatórios de Amazon Ads v2/v3 param.
- **Data a definir pela Chris:** troca da Shopee FNT para o UpSeller (o StockHub para de gravar nela) e troca de titular da Shopee Feminnita.
- Verificar o impulsionador da Shopee de 4 em 4 horas (vistoria).

## 7. Rotinas que já existem (início da vistoria, 14/10)

| Rotina | Como roda hoje | Situação |
|---|---|---|
| Recuperação de não pagos (Shopee) | Robô de navegador que manda mensagem no chat | A regra da Shopee proíbe mensagem proativa pelo chat por API; risco a avaliar na vistoria |
| Recuperação de não pagos (site) | Não existe | Entra na obra (o site é nosso) |
| Vídeos Shopee (2/dia) e Clips ML (1/dia por conta) | Robôs de navegador | Continuam; ganham sinal de vida |
| Respostas de avaliações TikTok | Robô de navegador, nível "sugere" | FNT funcionando; **Feminnita parada desde 11/10** com a tarefa dizendo "ok" |
| Oferta relâmpago ML e TikTok | Robôs de navegador | Vira rotina do banco pela API oficial onde houver |
| Promoção de preço no ML | API (`criar_promocao.py`) | Vai para a etapa 5 |
| Analista geral e de mercado Shopee | Agentes chamados na hora | A classificação A–E vira a rotina mensal (5B); a análise de mercado segue como agente |

## 8. Material de apoio

- `Downloads\APIS_POR_CANAL_BANCO_INTELIGENTE.xlsx`: o que cada canal permite por API, datas que não podem passar e detalhe com links oficiais.
- `Downloads\AVALIACAO_SISTEMAS_14-10.pdf`: avaliação dos 4 sistemas.
- Pesquisas de mercado de Temu e Magalu (14/10).

## 9. Ideias para depois

- O banco sugerir kits a partir das sobras de grade quebrada.

## 10. Registro das conversas

- **14/10/2026:** objetivo, decisões D1 a D28, pesquisa de APIs dos 7 canais, pesquisa de mercado de Temu e Magalu, etapas da obra. Próximo passo: a Chris aprova o plano, e começa a etapa 0 (vistoria).
