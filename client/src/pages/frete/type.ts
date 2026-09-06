export type PickupConfig = {
    enabled: boolean;
    address: string;
    hours: string;
    note: string;
};

export type ShippingConfig = {
    freeShipingThreshold: number | null;
    extraDays: number;
    // Retirada na fábrica: opção sem transportadora, custo R$ 0,00, para qualquer CEP.
    pickup: PickupConfig;
};