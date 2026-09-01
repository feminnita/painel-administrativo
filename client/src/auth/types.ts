export type AdminUser = {
    id: string;
    name: string;
    email: string;
    role: string;
}

export type AuthContextValue = {
    admin: AdminUser | null;
    loading: boolean;
    login: (
        email: string,
        password: string
    ) => Promise<void>
    logout: () => Promise<void>;
}