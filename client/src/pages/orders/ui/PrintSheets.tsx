import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import type { Order, OrderItem } from "../types";
import {
  consolidateItems,
  fmtBRL,
  fmtDateLong,
  itemRef,
  normalizeBrand,
  orderPieceCount,
  sortItemsForPicking,
  PAYMENT_LABELS,
} from "../domain";

// Quadradinho de conferencia (checkbox vazio impresso): o Iury risca 1 a 1
// conferindo cada item separado. So visual — nao guarda estado.
function CheckCell() {
  return (
    <td style={{ padding: "8px 4px", width: 24, verticalAlign: "top" }}>
      <div style={{ width: 16, height: 16, border: "2px solid #000", marginTop: 2 }} />
    </td>
  );
}

// Portal pra fora do #root. Fica display:none na tela (ver index.css) e so'
// aparece em @media print, com layout limpo, sem menu nem sidebar.
export function PrintPortal({ children }: { children: ReactNode }) {
  return createPortal(<div className="print-only">{children}</div>, document.body);
}

// ---------------------------------------------------------------------------
// LINHA DE ITEM (compartilhada): usada no ROMANEIO (por pedido, com Total) e em
// PRODUTOS VENDIDOS (agregado por SKU, sem Total). Mesma informacao, 3 linhas:
//   1) Nome + (Ref. <SKU cor/tamanho>)
//   2) Tamanho: <t> (Disponibilidade: Imediata) | Cor: <cor>
//   3) Codigo: <codigo interno> Marca: <marca normalizada>
// ---------------------------------------------------------------------------
function RomaneioItemLine({
  item,
  quantity,
  showPhoto,
  showTotal,
}: {
  item: OrderItem;
  quantity: number;
  showPhoto: boolean;
  showTotal: boolean;
}) {
  return (
    <tr style={{ borderBottom: "1px solid #999", verticalAlign: "top" }}>
      <CheckCell />
      <td style={{ padding: "8px 4px" }}>
        <div style={{ display: "flex", gap: 8 }}>
          {showPhoto &&
            (item.product_image ? (
              <img
                src={item.product_image}
                alt=""
                style={{ width: 48, height: 60, objectFit: "cover", border: "1px solid #ccc", flexShrink: 0 }}
              />
            ) : (
              <div style={{ width: 48, height: 60, border: "1px solid #ccc", flexShrink: 0 }} />
            ))}
          <div style={{ lineHeight: 1.35 }}>
            <div style={{ fontWeight: 700 }}>
              {item.product_name}{" "}
              <span style={{ fontWeight: 400 }}>(Ref. {itemRef(item)})</span>
            </div>
            <div>
              Tamanho: {item.size || "—"} (Disponibilidade: Imediata) | Cor: {item.color || "—"}
            </div>
            <div>
              Código: {item.product_code || "—"} Marca: {normalizeBrand(item.brand)}
            </div>
          </div>
        </div>
      </td>
      <td style={{ padding: "8px 4px", textAlign: "right", fontWeight: 800, fontSize: 18, whiteSpace: "nowrap" }}>
        {quantity}
      </td>
      {showTotal && (
        <td style={{ padding: "8px 4px", textAlign: "right", whiteSpace: "nowrap" }}>
          <div style={{ fontWeight: 700 }}>R$ {fmtBRL(item.total_price)}</div>
          <div style={{ fontSize: 11, color: "#333" }}>(R$ {fmtBRL(item.unit_price)} cada)</div>
        </td>
      )}
    </tr>
  );
}

function TotalRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontWeight: bold ? 800 : 400,
        fontSize: bold ? 15 : 13,
        padding: "1px 0",
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function AddressBlock({ order, title }: { order: Order; title: string }) {
  const a = order.shipping_address;
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 700, textTransform: "uppercase", fontSize: 11, marginBottom: 3 }}>{title}</div>
      {a ? (
        <div style={{ lineHeight: 1.4 }}>
          Aos cuidados: {order.customer_name}
          <br />
          {a.street}, {a.number}
          <br />
          {a.neighborhood}
          {a.complement ? (
            <>
              <br />
              {a.complement}
            </>
          ) : null}
          <br />
          {a.city} - {a.state} - Brasil - CEP {a.cep}
        </div>
      ) : (
        <div>—</div>
      )}
    </div>
  );
}

// Romaneio / lista de separacao: uma folha por pedido, layout completo.
export function RomaneioSheet({ order, showPhoto = true }: { order: Order; showPhoto?: boolean }) {
  const pieces = orderPieceCount(order);
  return (
    <section className="print-page" style={{ padding: "16px", color: "#000", fontSize: 13 }}>
      {/* Cabecalho: 3 blocos numa linha */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          borderBottom: "3px solid #000",
          paddingBottom: 8,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 800 }}>Pedido #{order.order_number} - LOJA VIRTUAL</div>
        <div style={{ fontSize: 13 }}>{fmtDateLong(order.created_at)}</div>
        {/* Termo de revenda aceito no checkout: o pedido NAO grava esse dado (lacuna) */}
        <div style={{ fontSize: 13 }}>Termo aceito: —</div>
      </div>

      {/* Quatro colunas */}
      <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, textTransform: "uppercase", fontSize: 11, marginBottom: 3 }}>
            Dados do cliente
          </div>
          <div style={{ lineHeight: 1.4 }}>
            {order.customer_name}
            <br />
            {order.customer_phone || "—"}
            <br />
            {order.customer_email || "—"}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, textTransform: "uppercase", fontSize: 11, marginBottom: 3 }}>
            Informações adicionais
          </div>
          <div style={{ lineHeight: 1.4 }}>CPF/CNPJ: {order.customer_cpf || "—"}</div>
        </div>
        <AddressBlock order={order} title="Endereço de entrega" />
        <AddressBlock order={order} title="Endereço de cobrança" />
      </div>

      {/* Tabela de produtos — na ordem das filas do estoque (pick_order) */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #000", textAlign: "left" }}>
            <th style={{ padding: "6px 4px", width: 24 }}>✓</th>
            <th style={{ padding: "6px 4px" }}>Produto</th>
            <th style={{ padding: "6px 4px", textAlign: "right" }}>Qtd.</th>
            <th style={{ padding: "6px 4px", textAlign: "right" }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {sortItemsForPicking(order.items).map((it) => (
            <RomaneioItemLine key={it.id} item={it} quantity={it.quantity} showPhoto={showPhoto} showTotal />
          ))}
        </tbody>
      </table>

      {/* Total de pecas em DESTAQUE — conferencia final da separacao */}
      <div
        style={{
          marginTop: 12,
          border: "2px solid #000",
          padding: "8px 12px",
          fontSize: 20,
          fontWeight: 800,
          textAlign: "center",
        }}
      >
        Total de peças a separar: {pieces}
      </div>

      {/* Rodape de totais */}
      <div style={{ marginLeft: "auto", width: 300, marginTop: 12, fontSize: 13 }}>
        <TotalRow label={`Subtotal (${pieces} ${pieces === 1 ? "peça" : "peças"})`} value={`R$ ${fmtBRL(order.subtotal)}`} />
        <TotalRow label="Valor do frete" value={`R$ ${fmtBRL(order.shipping_cost)}`} />
        {order.discount > 0 && (
          <TotalRow label="Desconto da forma de pagamento" value={`- R$ ${fmtBRL(order.discount)}`} />
        )}
        <div style={{ borderTop: "2px solid #000", marginTop: 4, paddingTop: 4 }}>
          <TotalRow label="Total do pedido" value={`R$ ${fmtBRL(order.total)}`} bold />
        </div>
      </div>
    </section>
  );
}

// PRODUTOS VENDIDOS: lista consolidada por SKU (soma de todos os pedidos),
// ordenada por codigo. REUTILIZA a linha do romaneio. NAO da baixa em estoque.
export function ConsolidatedPickingSheet({
  orders,
  showPhoto = true,
}: {
  orders: Order[];
  showPhoto?: boolean;
}) {
  const items = consolidateItems(orders);
  const totalPieces = items.reduce((s, i) => s + i.quantity, 0);
  return (
    <section className="print-page" style={{ padding: "16px", color: "#000", fontSize: 13 }}>
      <div style={{ borderBottom: "3px solid #000", paddingBottom: 8, marginBottom: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Produtos vendidos — lista de separação</div>
        <div style={{ fontSize: 12 }}>
          Consolidado de {orders.length} pedido{orders.length === 1 ? "" : "s"} • somado por SKU • na ordem das filas do estoque
        </div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #000", textAlign: "left" }}>
            <th style={{ padding: "6px 4px", width: 24 }}>✓</th>
            <th style={{ padding: "6px 4px" }}>Produto</th>
            <th style={{ padding: "6px 4px", textAlign: "right" }}>Qtd.</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => (
            <RomaneioItemLine
              key={`${it.product_code ?? it.product_name}-${idx}`}
              item={it}
              quantity={it.quantity}
              showPhoto={showPhoto}
              showTotal={false}
            />
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 6, fontWeight: 700, fontSize: 12 }}>
        {items.length} SKU{items.length === 1 ? "" : "s"} distinto{items.length === 1 ? "" : "s"}
      </div>
      {/* Total de pecas em DESTAQUE — conferencia final */}
      <div
        style={{
          marginTop: 10,
          border: "2px solid #000",
          padding: "8px 12px",
          fontSize: 20,
          fontWeight: 800,
          textAlign: "center",
        }}
      >
        Total de peças a separar: {totalPieces}
      </div>
    </section>
  );
}

// Etiqueta do Melhor Envio. Se a etiqueta ja foi comprada mostra o aviso + link;
// senao imprime os dados disponiveis deixando claro que ainda nao foi gerada.
export function EtiquetaSheet({ order }: { order: Order }) {
  const a = order.shipping_address;
  const hasLabel = !!order.label_url;
  return (
    <section className="print-page" style={{ padding: "16px", color: "#000", fontSize: 13 }}>
      <div style={{ borderBottom: "2px solid #000", paddingBottom: 6, marginBottom: 10 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Etiqueta de envio — Pedido #{order.order_number}</div>
      </div>
      {!hasLabel && (
        <div style={{ border: "1px dashed #000", padding: 8, marginBottom: 10, fontWeight: 700 }}>
          ⚠ Etiqueta ainda NÃO gerada no Melhor Envio. Gere/compre a etiqueta para obter o PDF oficial.
        </div>
      )}
      <div style={{ marginBottom: 8 }}>
        <strong>Destinatário:</strong> {order.customer_name}
        {order.customer_cpf ? ` • CPF: ${order.customer_cpf}` : ""}
      </div>
      {a && (
        <div style={{ marginBottom: 8, lineHeight: 1.4 }}>
          {a.street}, {a.number}
          {a.complement ? `, ${a.complement}` : ""}
          <br />
          {a.neighborhood} — {a.city}/{a.state} — CEP {a.cep}
        </div>
      )}
      <div style={{ marginBottom: 4 }}>
        <strong>Forma de envio:</strong> {order.shipping_method || "—"}
      </div>
      <div>
        <strong>Rastreio:</strong> {order.tracking_code || "—"}
      </div>
      {hasLabel && (
        <div style={{ marginTop: 8, fontSize: 12 }}>
          Etiqueta ME disponível em: {order.label_url}
        </div>
      )}
    </section>
  );
}

// Declaracao de conteudo do Melhor Envio (mesma regra: nota se nao houver).
export function DeclaracaoSheet({ order }: { order: Order }) {
  const a = order.shipping_address;
  return (
    <section className="print-page" style={{ padding: "16px", color: "#000", fontSize: 13 }}>
      <div style={{ borderBottom: "2px solid #000", paddingBottom: 6, marginBottom: 10 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Declaração de conteúdo — Pedido #{order.order_number}</div>
      </div>
      {!order.me_order_id && (
        <div style={{ border: "1px dashed #000", padding: 8, marginBottom: 10 }}>
          Documento gerado a partir dos dados do pedido. A declaração oficial do Melhor Envio ainda não foi gerada.
        </div>
      )}
      <div style={{ marginBottom: 8 }}>
        <strong>Destinatário:</strong> {order.customer_name}
        {a ? ` — ${a.city}/${a.state} — CEP ${a.cep}` : ""}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #000", textAlign: "left" }}>
            <th style={{ padding: "4px" }}>Conteúdo</th>
            <th style={{ padding: "4px", textAlign: "right" }}>Qtd.</th>
            <th style={{ padding: "4px", textAlign: "right" }}>Valor</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((it) => (
            <tr key={it.id} style={{ borderBottom: "1px solid #ccc" }}>
              <td style={{ padding: "4px" }}>{it.product_name}</td>
              <td style={{ padding: "4px", textAlign: "right" }}>{it.quantity}</td>
              <td style={{ padding: "4px", textAlign: "right" }}>R$ {fmtBRL(it.total_price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ textAlign: "right", fontWeight: 700 }}>
        Valor total declarado: R$ {fmtBRL(order.subtotal)}
      </div>
      <div style={{ marginTop: 16, fontSize: 12 }}>
        Declaro que as informações prestadas são a expressão da verdade e que os itens declarados não constituem objeto
        proibido pela legislação vigente. Pagamento:{" "}
        {PAYMENT_LABELS[order.payment_method || ""] || order.payment_method || "—"}.
      </div>
    </section>
  );
}
