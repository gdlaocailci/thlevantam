window.HT_SSO = (function () {
    const STORAGE_KEY = 'HT_SSO_TOKEN';

    function decodeJwt(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
            return JSON.parse(new TextDecoder().decode(bytes));
        } catch (e) {
            return null;
        }
    }

    return {
        saveToken: function (token) {
            if (token) localStorage.setItem(STORAGE_KEY, token);
        },
        clearToken: function () {
            localStorage.removeItem(STORAGE_KEY);
        },
        getValidToken: function () {
            const token = localStorage.getItem(STORAGE_KEY);
            if (!token) return null;
            const payload = decodeJwt(token);
            if (!payload || !payload.exp || (payload.exp * 1000) <= Date.now()) {
                return null;
            }
            return token;
        },
        getUser: function () {
            const token = this.getValidToken();
            if (!token) return null;
            const p = decodeJwt(token);
            if (!p || !p.email) return null;
            return {
                email: p.email,
                name: p.name || p.email,
                picture: p.picture || '',
                token: token
            };
        }
    };
})();