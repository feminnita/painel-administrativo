# Atendimento da Lia: do que temos até o nível da Jet Sales

Data: 17/11/2026. Decisão da Chris: construir o que a Jet Sales (JetGO) tem e nós não, e colocar a Lia no ar no (22) 99281-0707. A Lia também atende as afiliadas do TikTok que a Chris encaminha para esse número.

Fonte da comparação: 186 fotos da central de ajuda da JetGO em `Downloads/JETSALES` (as páginas de Chatbot, SLA, Integrações e API Oficial não foram fotografadas).

## Onde cada coisa mora

- **Marketing (VPS, `/var/www/feminnita-marketing`, banco TiDB):** dono do WhatsApp. Recebe o webhook da Meta, grava toda mensagem em `wa_mensagens`, roda a Lia, envia pela Cloud API. Rotas em `server/routers/wa-atendimento.ts`, protegidas por `x-atendimento-secret`.
- **Painel (este repositório):** só a tela. O backend repassa as chamadas para o marketing com o segredo; o cadastro da cliente e os pedidos vêm do banco da loja.

Regra do projeto: **dado de conversa fica no marketing; o painel não guarda cópia.** O painel manda junto o nome de quem está logado, para o marketing registrar quem respondeu.

## Equipe (resposta da Chris em 17/11)

| Pessoa | Atende |
|---|---|
| Chris | Tudo, inclusive financeiro e afiliadas |
| Débora | Geral, menos financeiro |
| Iury | Separa os pedidos (expedição) |

Por isso a fase 1 já nasce com **assunto** e **responsável**, em vez de uma caixa única:

| Assunto | Responsável padrão |
|---|---|
| Geral (dúvida, produto, pedido novo) | Débora |
| Financeiro (pagamento, boleto, estorno, nota) | Chris |
| Expedição (separação, envio, rastreio que a Lia não resolveu) | Iury |
| Afiliada TikTok | Chris |

- A Lia escolhe o assunto quando passa a conversa para humano; qualquer pessoa pode trocar o assunto ou transferir para outra.
- Cada uma vê primeiro "Minhas"; a Chris vê todas.
- O painel registra quem respondeu cada mensagem.

## Premissas

- No dia da virada o número sai do aplicativo do celular. A equipe passa a responder só pelo painel, então a fase 1 vem antes da virada.

## Fases

| Fase | Entrega | Depende de |
|---|---|---|
| 0 | Token permanente da Meta, data da virada, código SMS | Chris |
| 1 | Tela Conversas completa | — |
| virada | Número na API, `WA_MODO` de teste para produção | fases 0 e 1 |
| 2 | Lia para afiliadas do TikTok | regras da Chris |
| 3 | Modelos aprovados, carrinho e PIX pelo WhatsApp, agendada, campanha, funil | virada |
| 4 | Vários atendentes, transferência, relatórios, satisfação, quadro de leads | — |
| 5 | Instagram, Facebook e chat do site na mesma caixa | — |

## Fase 1: tela Conversas completa

### 1. Anexos e áudio
- Enviar documento (PDF, planilha), vídeo e áudio, além de texto e foto.
- Gravar áudio no navegador. O Chrome grava em webm/opus e a Meta só aceita ogg/opus, mp3, aac e amr: o marketing converte com ffmpeg antes de enviar.
- Limites da Cloud API: imagem 5 MB, áudio e vídeo 16 MB, documento 100 MB. O painel recusa antes de subir.
- Rota `POST /api/atendimento/enviar` passa a aceitar `arquivo_base64` + `mime` + `nome_arquivo` (a foto atual continua funcionando).

### 2. Mensagens rápidas
- Tabela `wa_respostas_rapidas (id, chave, texto, ativo)`.
- No campo de mensagem, digitar `/` abre a lista filtrada pela chave; Enter insere o texto para editar antes de enviar.
- Tela de cadastro no painel (criar, editar, excluir).
- Variáveis: `{nome}` (primeiro nome da cliente) e `{saudacao}` (bom dia / boa tarde / boa noite pelo horário de Brasília).

### 3. Nota interna
- `wa_mensagens.autor = 'nota'`: gravada, nunca enviada à Meta. Balão amarelo, com quem escreveu.
- A Lia não lê nota interna como fala da cliente.

### 4. Quem respondeu
- Coluna `wa_mensagens.atendente` (nome de quem estava logado no painel). Aparece no balão, só para a equipe.
- Assinatura no texto para a cliente ("Ana: ...") fica desligada por padrão, com botão para ligar.

### 5. Etiquetas, busca e filtros
- Tabelas `wa_etiquetas (id, nome, cor, ativo)` e `wa_conversa_etiquetas (telefone, etiqueta_id)`.
- Etiquetas iniciais: Revendedora, Afiliada TikTok, Financeiro, Troca/defeito.
- Lista: busca por nome ou telefone; filtros Não lidas, Com a Lia, Com a equipe, por etiqueta.
- Fixar até 3 conversas no topo (`wa_conversas_fixadas`).

### 6. Filas, responsável e fechamento
- Tabela `wa_atendimentos` guarda também `assunto` e `responsavel`. Filtro "Minhas" na lista e botão Transferir (escolhe a pessoa e deixa uma observação, gravada como nota interna).
- Três abas: **Aguardando equipe** (a Lia passou ou a cliente escreveu com a Lia pausada), **Com a Lia**, **Fechadas**.
- Fechar atendimento pede um motivo (`wa_motivos_fechamento`): Venda fechada, Dúvida resolvida, Sem resposta da cliente, Não era cliente, Outro.
- Tabela `wa_atendimentos (id = protocolo, telefone, aberto_em, assumido_em, fechado_em, motivo_id, atendente)`. Abre na primeira mensagem depois de um fechamento; é a base dos relatórios da fase 4 (1ª resposta, pendentes).
- Fechar devolve a conversa para a Lia. A tela "Atendimento" de hoje (fila de casos + Atendido) é absorvida pela aba Aguardando equipe.

### 7. Responder citando
- A Cloud API aceita `context.message_id`: o balão ganha "Responder" e a mensagem sai ligada à original.

### Fora da fase 1 (e por quê)
- **Apagar mensagem enviada:** a Cloud API não tem. Não será feito.
- **Encaminhar:** fica para a fase 4.
- **Videochamada, plugins, chat interno:** sem uso previsto.
- **Fora da janela de 24 h:** hoje o envio devolve erro 409. Na fase 1 a tela explica; o envio por modelo aprovado entra na fase 3.

## Fase 2: Lia para afiliadas do TikTok (rascunho)

- A Lia reconhece a afiliada (ela se apresenta como criadora, cita TikTok, amostra, comissão ou link da loja) e aplica a etiqueta Afiliada TikTok.
- Coleta o @ do TikTok e o que ela quer (amostra, comissão, material).
- Responde só o que é regra escrita da Chris (amostra só com GMV a partir de R$ 30 mil e público jovem; colaboração aberta com comissão) e passa para a Chris com o resumo.
- A Lia não promete amostra nem comissão fora da regra.
- O texto exato precisa da aprovação da Chris antes de ir para o ar.

## Riscos

- O repositório do marketing na VPS tem mudanças sem commit e está 42 commits à frente do GitHub. Toda mudança entra com commit próprio e cópia do antes.
- Tabelas novas no TiDB são criadas à mão (padrão das tabelas `wa_` atuais), com script guardado no repositório.
- `WA_MODO=teste` continua até a virada: tudo é testado com o celular pessoal da Chris.

## Como conferir cada entrega

Rodando de verdade no celular de teste: enviar e receber cada tipo de arquivo, usar uma mensagem rápida, gravar uma nota e confirmar que não chegou no WhatsApp, fechar e reabrir um atendimento, filtrar por etiqueta. Só depois disso a entrega é dada como pronta.
