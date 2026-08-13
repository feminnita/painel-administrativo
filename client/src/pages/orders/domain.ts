import type { Order, OrderFilters, PaymentStatus, FulfillmentStatus } from "./types";

export const STATUS_OPTIONS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "Confirmado", color: "bg-blue-100 text-blue-800" },
  paid: { label: "Pago", color: "bg-green-100 text-green-800" },
  processing: { label: "Processando", color: "bg-blue-100 text-blue-800" },
  shipped: { label: "Enviado", color: "bg-blue-100 text-blue-800" },
  delivered: { label: "Entregue", color: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-800" },
};

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

export function filterOrders(orders: Order[], filters: OrderFilters): Order[] {
  const q = filters.search.toLowerCase();

  return orders.filter((order) => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(q) ||
      order.customer_name.toLowerCase().includes(q) ||
      order.customer_email.toLowerCase().includes(q) ||
      (order.tracking_code || "").toLowerCase().includes(q);

    const matchesStatus =
      filters.status === "all" || order.status === filters.status;

    return matchesSearch && matchesStatus;
  });
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
