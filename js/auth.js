class AuthService {
    constructor() {
        this.supabase = null;
        this.init();
    }

    init() {
        if (!window.ENV.SUPABASE_URL || !window.ENV.SUPABASE_ANON_KEY) {
            console.warn('Supabase credentials missing. Authentication will not work until configured in js/config.js');
            return;
        }
        
        // Initialize Supabase from the globally loaded CDN library
        this.supabase = window.supabase.createClient(
            window.ENV.SUPABASE_URL,
            window.ENV.SUPABASE_ANON_KEY
        );
    }

    async signUp(email, password, fullName) {
        if (!this.supabase) return { error: { message: 'Supabase not configured' } };
        
        const { data, error } = await this.supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName
                }
            }
        });
        return { data, error };
    }

    async signIn(email, password) {
        if (!this.supabase) return { error: { message: 'Supabase not configured' } };
        
        const { data, error } = await this.supabase.auth.signInWithPassword({
            email,
            password
        });
        return { data, error };
    }

    async signOut() {
        if (!this.supabase) return { error: null };
        const { error } = await this.supabase.auth.signOut();
        return { error };
    }

    async getSession() {
        if (!this.supabase) return null;
        const { data, error } = await this.supabase.auth.getSession();
        if (error) {
            console.error('Error fetching session:', error.message);
            return null;
        }
        return data.session;
    }

    async resetPasswordForEmail(email) {
        if (!this.supabase) return { error: { message: 'Supabase not configured' } };
        
        const redirectUrl = window.location.origin + '/admin.html';
        
        const { data, error } = await this.supabase.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl
        });
        
        return { data, error };
    }

    async updatePassword(newPassword) {
        if (!this.supabase) return { error: { message: 'Supabase not configured' } };
        
        const { data, error } = await this.supabase.auth.updateUser({
            password: newPassword
        });
        
        return { data, error };
    }

    onAuthStateChange(callback) {
        if (!this.supabase) return;
        this.supabase.auth.onAuthStateChange(callback);
    }
}

window.authService = new AuthService();
