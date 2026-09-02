import type {
  Order,
  OrderFilters,
  PaymentStatus,
  FulfillmentStatus,
  DerivedStatus,
  OverrideValue,
} from "./types";

export const STATUS_OPTIONS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "Confirmado", color: "bg-blue-100 text-blue-800" },
  paid: { label: "Pago", color: "bg-green-100 text-green-800" },
  processing: { label: "Processando", color: "bg-blue-100 text-blue-800" },
  shipped: { label: "Enviado", color: "bg-blue-100 text-blue-800" },
  delivered: { label: "Entregue", color: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-800" },
};

// ---------------------------------------------------------------------------
// STATUS DERIVADO (defeito 1): o status EXIBIDO nao e' mais escolhido na mao.
// deriveStatus() calcula por UMA funcao, a partir dos campos que o sistema ja tem.
// Ordem: primeiro que casar, de baixo pra cima do funil.
// ---------------------------------------------------------------------------
export function deriveStatus(order: Order): DerivedStatus {
  if (order.status === "cancelled") return "cancelado";
  if (order.status === "delivered") return "entregue";
  if (order.tracking_code || order.status === "shipped") return "postado";
  if (order.label_url) return "etiqueta_gerada";
  if (order.nfe_number) return "nota_emitida";
  if (order.bling_order_id) return "enviado_bling";
  if (order.payment_status === "paid") return "pago";
  return "aguardando_pagamento";
}

export const DERIVED_STATUS_META: Record<DerivedStatus, { label: string; color: string }> = {
  aguardando_pagamento: { label: "Aguardando pagamento", color: "bg-yellow-100 text-yellow-800" },
  pago: { label: "Pago", color: "bg-green-100 text-green-800" },
  enviado_bling: { label: "Enviado ao Bling", color: "bg-teal-100 text-teal-800" },
  nota_emitida: { label: "Nota emitida", color: "bg-cyan-100 text-cyan-800" },
  etiqueta_gerada: { label: "Etiqueta gerada", color: "bg-indigo-100 text-indigo-800" },
  postado: { label: "Em trânsito / Postado", color: "bg-blue-100 text-blue-800" },
  entregue: { label: "Entregue", color: "bg-green-100 text-green-800" },
  cancelado: { label: "Cancelado", color: "bg-red-100 text-red-800" },
};

// Sobrescrita manual (override) - excecao operacional apenas.
export const OVERRIDE_META: Record<OverrideValue, { label: string; color: string }> = {
  em_separacao: { label: "Em separação", color: "bg-purple-100 text-purple-800" },
  aguardando_estoque: { label: "Aguardando estoque", color: "bg-orange-100 text-orange-800" },
  cancelado: { label: "Cancelado", color: "bg-red-100 text-red-800" },
};

export const OVERRIDE_OPTIONS: { value: OverrideValue; label: string }[] = [
  { value: "em_separacao", label: "Em separação" },
  { value: "aguardando_estoque", label: "Aguardando estoque" },
  { value: "cancelado", label: "Cancelado" },
];

// Status EXIBIDO = status_override ?? deriveStatus(order)
export function displayStatus(order: Order): { label: string; color: string; isOverride: boolean } {
  if (order.status_override && OVERRIDE_META[order.status_override]) {
    return { ...OVERRIDE_META[order.status_override], isOverride: true };
  }
  return { ...DERIVED_STATUS_META[deriveStatus(order)], isOverride: false };
}

// Etapa do stepper derivada dos campos (1..4). 0 = cancelado.
export function derivedTimelineStep(order: Order): number {
  if (order.status === "cancelled" || order.status_override === "cancelado") return 0;
  if (order.status === "delivered") return 4;
  if (order.tracking_code || order.label_url || order.nfe_number || order.bling_order_id || order.status === "shipped")
    return 3;
  if (order.payment_status === "paid") return 2;
  return 1;
}

const PAYMENT_VALUES: PaymentStatus[] = [
  "pending", "paid", "failed", "overdue", "refunded", "disputed",
];

export function derivePaymentStatus(order: Order): PaymentStatus {
  if (PAYMENT_VALUES.includes(order.payment_status as PaymentStatus)) {
    return order.payment_status as PaymentStatus;
  }
  if (order.status === "paid" || order.status === "confirmed") return "paid";
  return "pending";
}

export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-800" },
  paid: { label: "Pago", color: "bg-green-100 text-green-800" },
  failed: { label: "Falhou", color: "bg-red-100 text-red-800" },
  overdue: { label: "Atrasado", color: "bg-red-100 text-red-800" },
  refunded: { label: "Reembolsado", color: "bg-gray-100 text-gray-800" },
  disputed: { label: "Disputado", color: "bg-purple-100 text-purple-800" },
};

export function deriveFulfillmentStatus(order: Order): FulfillmentStatus {
  switch (order.status) {
    case "processing":
      return "processing";
    case "shipped":
      return "shipped";
    case "delivered":
      return "delivered";
    default:
      return "not_shipped";
  }
}

export const FULFILLMENT_STATUS_META: Record<FulfillmentStatus, { label: string; color: string }> = {
  not_shipped: { label: "Não enviado", color: "bg-gray-100 text-gray-700" },
  processing: { label: "Em separação", color: "bg-blue-100 text-blue-800" },
  shipped: { label: "Enviando", color: "bg-green-100 text-green-800" },
  delivered: { label: "Entregue", color: "bg-green-100 text-green-800" },
};

export function fmtBRL(value: number): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

// Etiqueta de sandbox (Melhor Envio) e' de teste e nao serve pra postar.
export function isSandboxLabel(url: string | null | undefined): boolean {
  return !!url && url.includes("sandbox.melhorenvio.com.br");
}

// Busca livre no cliente (instantanea). Status/periodo sao filtrados no servidor.
export function filterOrders(orders: Order[], filters: OrderFilters): Order[] {
  const q = filters.search.trim().toLowerCase();
  if (!q) return orders;

  return orders.filter(
    (order) =>
      order.order_number.toLowerCase().includes(q) ||
      order.customer_name.toLowerCase().includes(q) ||
      order.customer_email.toLowerCase().includes(q) ||
      (order.tracking_code || "").toLowerCase().includes(q),
  );
}

// Soma das quantidades (pecas) do pedido
export function orderPieceCount(order: Order): number {
  return (order.items || []).reduce((sum, i) => sum + (i.quantity || 0), 0);
}

// Miniaturas dos itens (imagens nao vazias)
export function orderThumbnails(order: Order): string[] {
  return (order.items || [])
    .map((i) => i.product_image)
    .filter((src): src is string => Boolean(src));
}

export function calcTotalRevenue(orders: Order[]): number {
  return orders
    .filter((order) => !["cancelled", "refunded"].includes(order.status))
    .reduce((total, order) => total + order.total, 0);
}

export function timelineStep(status: string): number {
  if (["cancelled", "refunded", "overdue"].includes(status)) return 0;
  if (status === "pending") return 1;
  if (["confirmed", "paid", "processing"].includes(status)) return 2;
  if (status === "shipped") return 3;
  if (status === "delivered") return 4;
  return 1;
}

export const TIMELINE_STEPS = [
  { key: "created", label: "Pedido realizado" },
  { key: "paid", label: "Pagamento confirmado" },
  { key: "shipped", label: "Aguardando envio" },
  { key: "delivered", label: "Previsão de entrega" },
];

export const PAYMENT_LABELS: Record<string, string> = {
  pix: "Pix",
  boleto: "Boleto Bancário",
  card: "Cartão de Crédito",
  credit_card: "Cartão de Crédito",
};
