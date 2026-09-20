import type { Order } from "./types";

/**
 * Folha de separação: o papel que vai para o estoque buscar as peças.
 *
 * Não é a etiqueta. A Chris clicou em imprimir esperando isto e caiu na página
 * de login do Melhor Envio — porque o único "imprimir" do painel era o da
 * etiqueta de envio, que é outra coisa e serve a outro momento.
 *
 * Decisões de quem vai usar de pé, com o pedido na mão:
 *  - o CÓDIGO vem primeiro e grande: é por ele que se acha a peça na prateleira,
 *    não pelo nome, que se repete entre dezenas de produtos;
 *  - a QUANTIDADE é a maior coisa da linha: separar 3 quando era 1 é o erro que
 *    mais volta como reclamação;
 *  - tem quadradinho para riscar a peça conferida — quem separa perde a linha
 *    quando o pedido tem sete itens;
 *  - preço nenhum: esta folha vai para o estoque, e valor ali só atrapalha.
 */
export function abrirFolhaDeSeparacao(order: Order) {
    const itens = order.items ?? [];
    const totalPecas = itens.reduce((t, i) => t + (i.quantity || 0), 0);

    const dataDoPedido = new Date(order.created_at).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

    const endereco = order.shipping_address;
    const entrega = endereco
        ? `${endereco.street}, ${endereco.number}${
              endereco.complement ? ` — ${endereco.complement}` : ""
          }<br>${endereco.neighborhood} — ${endereco.city}/${endereco.state}<br>CEP ${endereco.cep}`
        : "Retirada na fábrica";

    const linhas = itens
        .map(
            (item) => `
            <tr>
              <td class="check"></td>
              <td class="codigo">${escapar(
                  (item as { product_code?: string | null }).product_code ?? "—",
              )}</td>
              <td>
                <strong>${escapar(item.product_name)}</strong>
                <div class="variacao">${escapar(item.color ?? "")}${
                    item.color && item.size ? " · " : ""
                }${escapar(item.size ?? "")}</div>
              </td>
              <td class="qtd">${item.quantity}</td>
            </tr>`,
        )
        .join("");

    const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Separação ${escapar(order.order_number)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, Segoe UI, Arial, sans-serif; margin: 24px; color: #18181b; }
  header { display: flex; justify-content: space-between; align-items: flex-start;
           border-bottom: 3px solid #18181b; padding-bottom: 12px; margin-bottom: 16px; }
  h1 { font-size: 30px; margin: 0; letter-spacing: -0.5px; }
  .sub { font-size: 13px; color: #52525b; margin-top: 4px; }
  .resumo { text-align: right; font-size: 13px; color: #52525b; }
  .resumo strong { display: block; font-size: 26px; color: #18181b; }
  .blocos { display: flex; gap: 28px; font-size: 13px; margin-bottom: 18px; }
  .bloco { flex: 1; }
  .rotulo { text-transform: uppercase; font-size: 10px; letter-spacing: 1px;
            color: #71717a; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;
       color: #71717a; border-bottom: 1px solid #d4d4d8; padding: 0 8px 6px; }
  td { padding: 12px 8px; border-bottom: 1px solid #e4e4e7; vertical-align: middle; font-size: 14px; }
  .check { width: 34px; }
  .check::before { content: ""; display: block; width: 20px; height: 20px;
                   border: 2px solid #18181b; border-radius: 4px; }
  .codigo { font-family: ui-monospace, Consolas, monospace; font-size: 17px; font-weight: 700; width: 92px; }
  .variacao { color: #52525b; font-size: 12px; margin-top: 2px; }
  .qtd { text-align: right; font-size: 26px; font-weight: 700; width: 64px; }
  footer { margin-top: 28px; padding-top: 10px; border-top: 1px solid #e4e4e7;
           font-size: 11px; color: #a1a1aa; display: flex; justify-content: space-between; }
  @media print { body { margin: 12mm; } }
</style>
</head>
<body>
  <header>
    <div>
      <h1>${escapar(order.order_number)}</h1>
      <div class="sub">${dataDoPedido} · ${escapar(order.customer_name ?? "")}</div>
    </div>
    <div class="resumo">
      <strong>${totalPecas}</strong>
      ${totalPecas === 1 ? "peça" : "peças"} · ${itens.length} ${itens.length === 1 ? "item" : "itens"}
    </div>
  </header>

  <div class="blocos">
    <div class="bloco">
      <div class="rotulo">Entrega</div>
      ${entrega}
    </div>
    <div class="bloco">
      <div class="rotulo">Envio</div>
      ${escapar(order.shipping_method ?? "—")}
      ${order.tracking_code ? `<br>Rastreio: ${escapar(order.tracking_code)}` : ""}
    </div>
  </div>

  <table>
    <thead>
      <tr><th></th><th>Código</th><th>Produto</th><th style="text-align:right">Qtd</th></tr>
    </thead>
    <tbody>${linhas}</tbody>
  </table>

  <footer>
    <span>Separado por ______________________</span>
    <span>Conferido por ______________________</span>
  </footer>

  <script>window.onload = function () { window.print(); };</script>
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

// Nome de produto e cor vêm do cadastro e podem ter < ou &. Sem escapar, um
// nome mal cadastrado quebra a folha inteira.
function escapar(valor: string) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}
