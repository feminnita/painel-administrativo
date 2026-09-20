import type { Order } from "./types";

/**
 * Folha de separação: o papel que vai para o estoque buscar as peças.
 *
 * Não é a etiqueta. A Chris clicou em imprimir esperando isto e caiu na página
 * de login do Melhor Envio — porque o único "imprimir" do painel era o da
 * etiqueta de envio, que é outra coisa e serve a outro momento.
 *
 * O formato é o da Tray, que é o papel que a equipe já sabe ler de cabeça:
 * cabeçalho com o pedido e a data por extenso; três blocos (cliente, dados
 * adicionais, endereço de entrega); tabela Produto / Qtd. / Total com a FOTO
 * ao lado de cada peça; e os totais fechando embaixo.
 *
 * A foto é o que ela sentiu falta na primeira versão — e com razão: quem
 * separa reconhece a estampa antes de ler o nome, e os nomes aqui se repetem
 * ("Short Doll Feminino Suede Premium..." serve para dezenas de peças).
 */
export function abrirFolhaDeSeparacao(order: Order) {
    const itens = order.items ?? [];
    const totalPecas = itens.reduce((t, i) => t + (i.quantity || 0), 0);

    const dataPorExtenso = new Date(order.created_at).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });

    const dinheiro = (v: number) =>
        `R$ ${(Number(v) || 0).toFixed(2).replace(".", ",")}`;

    const e = order.shipping_address;
    const entrega = e
        ? [
              `Aos cuidados: ${escapar(order.customer_name ?? "")}`,
              `${escapar(e.street)}, ${escapar(e.number)}${
                  e.complement ? `, ${escapar(e.complement)}` : ""
              }`,
              `${escapar(e.neighborhood)}`,
              `${escapar(e.city)} - ${escapar(e.state)} - Brasil - ${escapar(e.cep)}`,
          ].join("<br>")
        : "Retirada na fábrica";

    const linhas = itens
        .map((item) => {
            const foto = item.product_image
                ? `<img src="${escapar(miniatura(item.product_image))}" alt="">`
                : `<div class="semfoto">sem foto</div>`;

            const variacao = [
                item.size ? `<strong>Tamanho:</strong> ${escapar(item.size)}` : "",
                item.color ? `<strong>Cor:</strong> ${escapar(item.color)}` : "",
            ]
                .filter(Boolean)
                .join(" &nbsp;|&nbsp; ");

            return `
            <tr>
              <td class="foto">${foto}</td>
              <td>
                <div class="nome">${escapar(item.product_name)}</div>
                <div class="detalhe">${variacao}</div>
                <div class="detalhe"><strong>Código:</strong>
                  <span class="codigo">${escapar(item.product_code ?? "—")}</span>
                </div>
              </td>
              <td class="qtd">${item.quantity}</td>
              <td class="valor">
                ${dinheiro(item.total_price)}
                <div class="cada">(${dinheiro(item.unit_price)} cada)</div>
              </td>
            </tr>`;
        })
        .join("");

    const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Pedido ${escapar(order.order_number)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, Segoe UI, Arial, sans-serif;
         margin: 24px; color: #18181b; font-size: 13px; }
  h1 { font-size: 22px; margin: 0 0 2px; }
  .data { color: #52525b; font-size: 12px; margin-bottom: 18px; }

  .blocos { display: flex; gap: 24px; margin-bottom: 20px; align-items: flex-start; }
  .bloco { flex: 1; }
  .rotulo { font-weight: 700; font-size: 12px; margin-bottom: 4px;
            border-bottom: 1px solid #d4d4d8; padding-bottom: 3px; }
  .bloco div:not(.rotulo) { color: #3f3f46; line-height: 1.5; }

  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 11px; font-weight: 700;
       border-bottom: 2px solid #18181b; padding: 0 8px 6px; }
  td { padding: 10px 8px; border-bottom: 1px solid #e4e4e7; vertical-align: top; }

  /* A foto é o que identifica a peça antes do nome. print-color-adjust
     obriga o navegador a imprimir a imagem, que ele senão descarta. */
  .foto { width: 74px; }
  .foto img { width: 66px; height: 66px; object-fit: cover;
              border: 1px solid #e4e4e7; border-radius: 4px; display: block;
              -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .semfoto { width: 66px; height: 66px; border: 1px dashed #d4d4d8; border-radius: 4px;
             color: #a1a1aa; font-size: 9px; display: flex; align-items: center;
             justify-content: center; }

  .nome { font-weight: 600; line-height: 1.35; }
  .detalhe { color: #52525b; font-size: 12px; margin-top: 3px; }
  .codigo { font-family: ui-monospace, Consolas, monospace; font-size: 14px;
            font-weight: 700; color: #18181b; }
  .qtd { text-align: center; width: 54px; font-size: 20px; font-weight: 700; }
  .valor { text-align: right; width: 118px; white-space: nowrap; }
  .cada { color: #71717a; font-size: 11px; font-weight: 400; }

  .totais { margin-top: 16px; margin-left: auto; width: 290px; }
  .totais div { display: flex; justify-content: space-between; padding: 5px 0; }
  .totais .fechamento { border-top: 2px solid #18181b; margin-top: 4px;
                        padding-top: 8px; font-size: 16px; font-weight: 700; }

  tr { break-inside: avoid; }
  @media print { body { margin: 10mm; } }
</style>
</head>
<body>
  <h1>Pedido #${escapar(order.order_number)} — LOJA VIRTUAL</h1>
  <div class="data">${dataPorExtenso}</div>

  <div class="blocos">
    <div class="bloco">
      <div class="rotulo">Dados do cliente</div>
      <div>${escapar(order.customer_name ?? "")}</div>
      <div>Celular: ${escapar(order.customer_phone ?? "—")}</div>
      <div>${escapar(order.customer_email ?? "")}</div>
    </div>
    <div class="bloco">
      <div class="rotulo">Informações adicionais</div>
      <div>CPF: ${escapar(order.customer_cpf ?? "—")}</div>
      <div>Envio: ${escapar(order.shipping_method ?? "—")}</div>
      ${order.tracking_code ? `<div>Rastreio: ${escapar(order.tracking_code)}</div>` : ""}
    </div>
    <div class="bloco">
      <div class="rotulo">Endereço de entrega</div>
      <div>${entrega}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th colspan="2">Produto</th>
        <th style="text-align:center">Qtd.</th>
        <th style="text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>${linhas}</tbody>
  </table>

  <div class="totais">
    <div><span>Subtotal (${totalPecas})</span><span>${dinheiro(order.subtotal)}</span></div>
    <div><span>Valor do frete</span><span>${dinheiro(order.shipping_cost)}</span></div>
    ${
        order.discount
            ? `<div><span>Desconto</span><span>- ${dinheiro(order.discount)}</span></div>`
            : ""
    }
    <div class="fechamento"><span>Total do pedido</span><span>${dinheiro(order.total)}</span></div>
  </div>

<script>
  // Imprimir na carga crua sai com os quadros de foto VAZIOS: o navegador abre
  // a caixa de impressão antes de a imagem chegar da Cloudinary. Espera todas
  // resolverem — e um teto de 5s para uma imagem quebrada não travar o papel.
  (function () {
    var imgs = Array.prototype.slice.call(document.images);
    var faltam = imgs.filter(function (i) { return !i.complete; });
    var imprimiu = false;
    function imprimir() { if (!imprimiu) { imprimiu = true; window.print(); } }
    if (!faltam.length) { window.onload = imprimir; return; }
    var restantes = faltam.length;
    faltam.forEach(function (i) {
      function pronto() { if (--restantes === 0) imprimir(); }
      i.addEventListener('load', pronto);
      i.addEventListener('error', pronto);
    });
    setTimeout(imprimir, 5000);
  })();
</script>
</body>
</html>`;

    const janela = window.open("", "_blank");
    if (!janela) {
        alert("O navegador bloqueou a janela de impressão. Permita pop-ups para este site.");
        return;
    }
    janela.document.write(html);
    janela.document.close();
}

/**
 * Pede à Cloudinary a miniatura em vez da foto inteira.
 *
 * As fotos do catálogo são PNGs de ~3 MB. Sete itens num pedido são 20 MB para
 * baixar antes de a caixa de impressão abrir — na primeira impressão do dia,
 * com a fábrica esperando, isso sai como quadrado vazio. Aqui o mesmo quadro
 * de 66px custa alguns quilobytes.
 *
 * URL que não seja da Cloudinary passa intacta: melhor a foto pesada do que
 * nenhuma.
 */
function miniatura(url: string): string {
    if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
    return url.replace("/upload/", "/upload/w_200,h_200,c_fill,f_auto,q_auto/");
}

// Nome de produto e cor vêm do cadastro e podem ter < ou &. Sem escapar, um
// nome mal cadastrado quebra a folha inteira.
function escapar(valor: string) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}
