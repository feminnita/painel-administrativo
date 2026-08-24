export type BlingStatus = {
    configured: boolean;
    connected: boolean;
    expiresAt: string | null;
};

export type SyncLog = {
    id: string;
    startedAt: string;
    finishedAt: string | null;
    productsSynced: number;
    productsCreated: number;
    productsUpdated: number;
    errors: number;
    status: string;
};

export type SyncStepResult = {
    done: boolean;
    nextPage?: number;
    created: number;
    updated: number;
    errors: number;
    skipped: number;
    syncedInThisPage: number;
    logId: string;
};

export type SyncProgress = {
    pages: number;
    synced: number;
    created: number;
    updated: number;
    skipped: number;
    errors: number;
    done: boolean;
}