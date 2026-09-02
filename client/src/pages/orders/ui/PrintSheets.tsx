import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import type { Order } from "../types";
import { fmtBRL, orderPieceCount, PAYMENT_LABELS } from "../domain";

// Portal pra fora do #root. Fica display:none na tela (ver index.css) e so'
// aparece em @media print, com layout limpo, sem menu nem sidebar.
export function PrintPortal({ children }: { children: ReactNode }) {
  return createPortal(<div className="print-only">{children}</div>, document.body);
}

// Romaneio / lista de separacao: fonte GRANDE, sem enfeite, uma folha por pedido.
export function RomaneioSheet({ order }: { order: Order }) {
  const pieces = orderPieceCount(order);
  return (
    <section className="print-page" style={{ padding: "16px", color: "#000" }}>
      <div style={{ borderBottom: "3px solid #000", paddingBottom: 8, marginBottom: 12 }}>
        <div style={{ fontSize: 26, fontWeight: 800 }}>ROMANEIO • {order.order_number}</div>
        <div style={{ fontSize: 16 }}>{order.customer_name}</div>
        <div style={{ fontSize: 14 }}>
          {new Date(order.created_at).toLocaleString("pt-BR")} • {pieces}{" "}
          {pieces === 1 ? "peça" : "peças"}
        </div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 18 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #000", textAlign: "left" }}>
            <th style={{ padding: "6px 4px" }}>Código</th>
            <th style={{ padding: "6px 4px" }}>Produto</th>
            <th style={{ padding: "6px 4px" }}>Cor</th>
            <th style={{ padding: "6px 4px" }}>Tam</th>
            <th style={{ padding: "6px 4px", textAlign: "right" }}>Qtd</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((it) => (
            <tr key={it.id} style={{ borderBottom: "1px solid #999" }}>
              <td style={{ padding: "8px 4px", fontWeight: 700 }}>—</td>
              <td style={{ padding: "8px 4px" }}>{it.product_name}</td>
              <td style={{ padding: "8px 4px" }}>{it.color || "—"}</td>
              <td style={{ padding: "8px 4px", fontWeight: 700 }}>{it.size || "—"}</td>
              <td style={{ padding: "8px 4px", textAlign: "right", fontWeight: 800, fontSize: 22 }}>
                {it.quantity}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// Pedido p/ impressao: cliente, itens, totais, pagamento, endereco de entrega.
export function OrderSheet({ order }: { order: Order }) {
  const a = order.shipping_address;
  return (
    <section className="print-page" style={{ padding: "16px", color: "#000", fontSize: 13 }}>
      <div style={{ borderBottom: "2px solid #000", paddingBottom: 6, marginBottom: 10 }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>Pedido {order.order_number}</div>
        <div>{new Date(order.created_at).toLocaleString("pt-BR")}</div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <strong>Cliente:</strong> {order.customer_name}
        {order.customer_cpf ? ` • CPF: ${order.customer_cpf}` : ""}
        <br />
        {order.customer_email} {order.customer_phone ? ` • ${order.customer_phone}` : ""}
      </div>

      {a && (
        <div style={{ marginBottom: 10 }}>
          <strong>Entrega:</strong> {a.street}, {a.number}
          {a.complement ? `, ${a.complement}` : ""} — {a.neighborhood}, {a.city}/{a.state} — CEP{" "}
          {a.cep}
        </div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #000", textAlign: "left" }}>
            <th style={{ padding: "4px" }}>Produto</th>
            <th style={{ padding: "4px" }}>Cor</th>
            <th style={{ padding: "4px" }}>Tam</th>
            <th style={{ padding: "4px", textAlign: "right" }}>Qtd</th>
            <th style={{ padding: "4px", textAlign: "right" }}>Unit.</th>
            <th style={{ padding: "4px", textAlign: "right" }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((it) => (
            <tr key={it.id} style={{ borderBottom: "1px solid #ccc" }}>
              <td style={{ padding: "4px" }}>{it.product_name}</td>
              <td style={{ padding: "4px" }}>{it.color || "—"}</td>
              <td style={{ padding: "4px" }}>{it.size || "—"}</td>
              <td style={{ padding: "4px", textAlign: "right" }}>{it.quantity}</td>
              <td style={{ padding: "4px", textAlign: "right" }}>R$ {fmtBRL(it.unit_price)}</td>
              <td style={{ padding: "4px", textAlign: "right" }}>R$ {fmtBRL(it.total_price)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginLeft: "auto", width: 240 }}>
        <Row label="Subtotal" value={`R$ ${fmtBRL(order.subtotal)}`} />
        <Row label="Frete" value={`R$ ${fmtBRL(order.shipping_cost)}`} />
        {order.discount > 0 && <Row label="Desconto" value={`- R$ ${fmtBRL(order.discount)}`} />}
        <div style={{ borderTop: "2px solid #000", marginTop: 4, paddingTop: 4 }}>
          <Row label="TOTAL" value={`R$ ${fmtBRL(order.total)}`} bold />
        </div>
        <div style={{ marginTop: 8 }}>
          <strong>Pagamento:</strong>{" "}
          {PAYMENT_LABELS[order.payment_method || ""] || order.payment_method || "—"}
          {order.installments && order.installments > 1 ? ` (${order.installments}x)` : ""}
        </div>
      </div>
    </section>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontWeight: bold ? 800 : 400,
        fontSize: bold ? 16 : 13,
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
