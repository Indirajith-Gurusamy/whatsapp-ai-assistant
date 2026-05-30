export const tokenStorage = {
    setTokens(accessToken: string, refreshToken: string, rememberMe: boolean = false) {
        if (typeof window !== 'undefined') {
            const storage = rememberMe ? localStorage : sessionStorage;
            storage.setItem('access_token', accessToken);
            storage.setItem('refresh_token', refreshToken);
            localStorage.setItem('remember_me', rememberMe.toString());
        }
    },

    getAccessToken(): string | null {
        if (typeof window !== 'undefined') {
            const rememberMe = localStorage.getItem('remember_me') === 'true';
            const storage = rememberMe ? localStorage : sessionStorage;
            return storage.getItem('access_token');
        }
        return null;
    },

    getRefreshToken(): string | null {
        if (typeof window !== 'undefined') {
            const rememberMe = localStorage.getItem('remember_me') === 'true';
            const storage = rememberMe ? localStorage : sessionStorage;
            return storage.getItem('refresh_token');
        }
        return null;
    },

    clearTokens() {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('remember_me');
            sessionStorage.removeItem('access_token');
            sessionStorage.removeItem('refresh_token');
        }
    },
};
