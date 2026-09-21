const store = window.store;

class AdminApp {
    constructor() {
        this.authContainer = document.getElementById('admin-auth-container');
        this.appContainer = document.getElementById('admin-app');
        this.mainContent = document.getElementById('admin-main-content');
        this.userEmailDisplay = document.getElementById('admin-user-email');
        
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.handleLogout();
        });

        this.setupResetButton();
        this.initRouter();
    }

    initRouter() {
        window.addEventListener('hashchange', () => this.route());
        
        if (window.authService) {
            window.authService.onAuthStateChange((event, session) => {
                if (event === 'PASSWORD_RECOVERY') {
                    this._isRecovery = true;
                    history.replaceState(null, '', '#reset-password');
                    this.route();
                } else if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
                    if (event === 'SIGNED_OUT') this._isRecovery = false;
                    this.route(session);
                }
            });
        }
        
        // Mobile Drawer Logic
        const menuBtn = document.getElementById('mobile-menu-btn');
        const closeBtn = document.getElementById('mobile-close-btn');
        const overlay = document.getElementById('mobile-drawer-overlay');
        const sidebar = document.getElementById('admin-sidebar');
        
        const toggleDrawer = () => {
            if (sidebar && overlay) {
                sidebar.classList.toggle('open');
                overlay.classList.toggle('open');
                document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
            }
        };
        
        const closeDrawer = () => {
            if (sidebar && overlay) {
                sidebar.classList.remove('open');
                overlay.classList.remove('open');
                document.body.style.overflow = '';
            }
        };
        
        if (menuBtn) menuBtn.addEventListener('click', toggleDrawer);
        if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
        if (overlay) overlay.addEventListener('click', closeDrawer);
        
        // Close drawer on navigation
        document.querySelectorAll('.admin-nav-link').forEach(link => {
            link.addEventListener('click', closeDrawer);
        });
    }

    async route(eventSession = undefined) {
        if (this._isRouting) {
            this._routeQueued = true;
            this._queuedSession = eventSession;
            return;
        }
        this._isRouting = true;
        try {
            let hash = window.location.hash || '#dashboard';
        
        let session = null;
        if (eventSession !== undefined) {
            session = eventSession;
        } else if (window.authService) {
            session = await window.authService.getSession();
        }

        // Auth guard
        if (!session) {
            this.appContainer.classList.add('hidden');
            this.authContainer.classList.remove('hidden');
            
            if (hash === '#signup') {
                document.title = "EnRoute – Admin Login";
                this.renderSignup();
            } else if (hash === '#forgot-password') {
                document.title = "EnRoute – Admin Login";
                this.renderForgotPassword();
            } else if (hash.startsWith('#reset-password') || hash.includes('access_token=')) {
                // If they have no session but are trying to reset password, the link is expired/used.
                document.title = "EnRoute – Reset Password";
                this.renderResetExpired();
            } else {
                document.title = "EnRoute – Admin Login";
                this.renderLogin();
                // Ensure URL reflects login state
                if (hash !== '#login') {
                    history.replaceState(null, '', '#login');
                }
            }
            return;
        }

        // Handle reset-password explicitly even if a recovery session exists
        if (this._isRecovery || hash.startsWith('#reset-password') || hash.includes('type=recovery') || hash.includes('access_token=')) {
            // Force hash back to reset-password in case Supabase cleared it
            if (window.location.hash !== '#reset-password') {
                history.replaceState(null, '', '#reset-password');
            }
            this.appContainer.classList.add('hidden');
            this.authContainer.classList.remove('hidden');
            document.title = "EnRoute – Reset Password";
            this.renderResetPassword();
            return;
        }

        // If authenticated but on auth pages, redirect to dashboard
        if (hash === '#login' || hash === '#signup' || hash === '#forgot-password') {
            history.replaceState(null, '', '#dashboard');
            hash = '#dashboard';
        }

        await store.initializeData();
        this.authContainer.classList.add('hidden');
        this.appContainer.classList.remove('hidden');
        this.userEmailDisplay.textContent = session.user.email;
        this.mainContent.innerHTML = ''; // Clear

        document.title = "EnRoute Admin";
        this.updateNav(hash);

        // Routing for authenticated pages
        if (hash === '#buses') {
            this.renderBuses();
        } else if (hash === '#stops') {
            this.renderStops();
        } else if (hash === '#routes') {
            this.renderRoutes();
        } else if (hash === '#timings') {
            this.renderTimings();
        } else if (hash === '#import') {
            if (window.importApp) {
                window.importApp.renderImportPage();
            } else {
                this.mainContent.innerHTML = '<p>Import module not loaded.</p>';
            }
        } else {
            this.renderDashboard();
        }
        } finally {
            this._isRouting = false;
            if (this._routeQueued) {
                this._routeQueued = false;
                const nextSession = this._queuedSession;
                this._queuedSession = undefined;
                this.route(nextSession);
            }
        }
    }

    updateNav(hash) {
        document.querySelectorAll('.admin-nav-link').forEach(link => {
            link.classList.remove('active');
            link.style.color = 'var(--text-main)';
            link.style.background = 'transparent';
            if (link.getAttribute('href') === hash) {
                link.classList.add('active');
                link.style.color = 'var(--primary)';
                link.style.background = 'var(--bg-page)';
            }
        });
    }

    // --- AUTHENTICATION ---

    renderLogin() {
        const html = `
            <div class="auth-card">
                <div style="text-align: center; margin-bottom: 2.5rem; display: flex; flex-direction: column; align-items: center;">
                    <img src="img/logo.png" alt="EnRoute Logo" style="height: 56px; width: auto; margin: 0 auto 0.5rem auto; display: block;">
                    <h2 style="color: var(--primary); font-weight: 800; font-size: 1.75rem; margin: 0; line-height: 1; letter-spacing: -0.03em;">EnRoute</h2>
                    <span style="font-size: 0.75rem; font-weight: 800; color: var(--primary-dark); text-transform: uppercase; letter-spacing: 0.1em; line-height: 1; margin: 4px 0 16px 0;">ADMIN</span>
                    <p style="color: var(--text-muted); font-size: 0.875rem; font-weight: 500; margin: 0;">Manage Kochi's bus routes, stops and schedules.</p>
                </div>
                <div id="auth-error" class="hidden" style="background: #fef2f2; border: 1px solid #fca5a5; color: #b91c1c; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; font-size: 0.875rem; font-weight: 500; display: flex; align-items: flex-start; gap: 0.5rem;">
                    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-top: 2px; flex-shrink: 0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    <span id="auth-error-msg"></span>
                </div>
                <form id="login-form">
                    <div class="form-group" style="margin-bottom: 1.25rem;">
                        <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-main);">Email Address</label>
                        <input type="email" id="login-email" required class="form-control" placeholder="admin@enroute.com" style="width: 100%;">
                    </div>
                    <div class="form-group" style="margin-bottom: 1.75rem;">
                        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.5rem;">
                            <label style="font-size: 0.875rem; font-weight: 600; color: var(--text-main);">Password</label>
                            <a href="#forgot-password" style="font-size: 0.75rem; font-weight: 600; color: var(--primary); text-decoration: none;">Forgot password?</a>
                        </div>
                        <input type="password" id="login-password" required class="form-control" placeholder="••••••••" style="width: 100%;">
                    </div>
                    <button type="submit" id="login-btn" class="btn btn-primary" style="width: 100%; padding: 0.75rem; border-radius: 8px; font-weight: 700; margin-bottom: 1.5rem;">Sign In</button>
                </form>
                <div style="text-align: center; font-size: 0.875rem; border-top: 1px solid var(--border-color); padding-top: 1.5rem;">
                    <span style="color: var(--text-muted);">Don't have an admin account?</span>
                    <a href="#signup" style="color: var(--primary); font-weight: 700; text-decoration: none; margin-left: 0.5rem;">Create one</a>
                </div>
            </div>
        `;
        this.authContainer.innerHTML = html;

        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const errDiv = document.getElementById('auth-error');
            const btn = document.getElementById('login-btn');
            
            errDiv.classList.add('hidden');
            btn.textContent = 'SIGNING IN...';
            btn.disabled = true;

            const { data, error } = await window.authService.signIn(email, password);
            
            if (error) {
                document.getElementById('auth-error-msg').textContent = error.message;
                errDiv.classList.remove('hidden');
                btn.textContent = 'Sign In';
                btn.disabled = false;
            } else {
                window.location.hash = '#dashboard';
            }
        });
    }

    renderSignup() {
        const html = `
            <div class="auth-card">
                <div style="text-align: center; margin-bottom: 2.5rem;">
                    <h2 style="color: var(--text-main); font-weight: 800; font-size: 1.75rem; margin-bottom: 0.5rem; letter-spacing: -0.02em;">Create Admin Account</h2>
                    <p style="color: var(--text-muted); font-size: 0.875rem; font-weight: 500;">Join the EnRoute management team.</p>
                </div>
                <div id="auth-error" class="hidden" style="background: #fef2f2; border: 1px solid #fca5a5; color: #b91c1c; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; font-size: 0.875rem; font-weight: 500; display: flex; align-items: flex-start; gap: 0.5rem;">
                    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-top: 2px; flex-shrink: 0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    <span id="auth-error-msg"></span>
                </div>
                <form id="signup-form">
                    <div class="form-group" style="margin-bottom: 1.25rem;">
                        <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-main);">Full Name</label>
                        <input type="text" id="signup-name" required class="form-control" placeholder="Jane Doe" style="width: 100%;">
                    </div>
                    <div class="form-group" style="margin-bottom: 1.25rem;">
                        <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-main);">Email Address</label>
                        <input type="email" id="signup-email" required class="form-control" placeholder="jane@enroute.com" style="width: 100%;">
                    </div>
                    <div class="form-group" style="margin-bottom: 1.25rem;">
                        <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-main);">Password</label>
                        <input type="password" id="signup-password" required minlength="8" class="form-control" placeholder="••••••••" style="width: 100%;">
                    </div>
                    <div class="form-group" style="margin-bottom: 2rem;">
                        <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-main);">Confirm Password</label>
                        <input type="password" id="signup-confirm" required minlength="8" class="form-control" placeholder="••••••••" style="width: 100%;">
                    </div>
                    <button type="submit" id="signup-btn" class="btn btn-primary" style="width: 100%; padding: 0.75rem; border-radius: 8px; font-weight: 700; margin-bottom: 1.5rem;">Create Account</button>
                </form>
                <div style="text-align: center; font-size: 0.875rem; border-top: 1px solid var(--border-color); padding-top: 1.5rem;">
                    <span style="color: var(--text-muted);">Already have an account?</span>
                    <a href="#login" style="color: var(--primary); font-weight: 700; text-decoration: none; margin-left: 0.5rem;">Sign In</a>
                </div>
            </div>
        `;
        this.authContainer.innerHTML = html;

        document.getElementById('signup-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('signup-name').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const confirm = document.getElementById('signup-confirm').value;
            const errDiv = document.getElementById('auth-error');
            const btn = document.getElementById('signup-btn');

            errDiv.classList.add('hidden');

            if (password !== confirm) {
                document.getElementById('auth-error-msg').textContent = 'Passwords do not match.';
                errDiv.classList.remove('hidden');
                return;
            }

            btn.textContent = 'CREATING...';
            btn.disabled = true;

            const { data, error } = await window.authService.signUp(email, password, name);
            
            if (error) {
                document.getElementById('auth-error-msg').textContent = error.message;
                errDiv.classList.remove('hidden');
                btn.textContent = 'Create Account';
                btn.disabled = false;
            } else {
                window.location.hash = '#dashboard';
            }
        });
    }

    renderForgotPassword() {
        const html = `
            <div class="auth-card">
                <div id="forgot-form-container">
                    <div style="text-align: center; margin-bottom: 2.5rem;">
                        <div style="width: 48px; height: 48px; background: #e0e7ff; color: #4f46e5; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
                            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        </div>
                        <h2 style="color: var(--text-main); font-weight: 800; font-size: 1.5rem; margin-bottom: 0.5rem; letter-spacing: -0.02em;">Reset your password</h2>
                        <p style="color: var(--text-muted); font-size: 0.875rem; line-height: 1.5;">Enter the email address associated with your account and we'll send you a password reset link.</p>
                    </div>
                    <div id="auth-error" class="hidden" style="background: #fef2f2; border: 1px solid #fca5a5; color: #b91c1c; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; font-size: 0.875rem; font-weight: 500; display: flex; align-items: flex-start; gap: 0.5rem;">
                        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-top: 2px; flex-shrink: 0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        <span id="auth-error-msg"></span>
                    </div>
                    <form id="forgot-form">
                        <div class="form-group" style="margin-bottom: 2rem;">
                            <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-main);">Email Address</label>
                            <input type="email" id="forgot-email" required class="form-control" placeholder="admin@enroute.com" style="width: 100%;">
                        </div>
                        <button type="submit" id="forgot-btn" class="btn btn-primary" style="width: 100%; padding: 0.75rem; border-radius: 8px; font-weight: 700; margin-bottom: 1.5rem;">Send Reset Link</button>
                    </form>
                    <div style="text-align: center; font-size: 0.875rem; border-top: 1px solid var(--border-color); padding-top: 1.5rem;">
                        <span style="color: var(--text-muted);">Remember your password?</span>
                        <a href="#login" style="color: var(--primary); font-weight: 700; text-decoration: none; margin-left: 0.5rem;">Back to Sign In</a>
                    </div>
                </div>
                <div id="forgot-success-container" class="hidden" style="text-align: center;">
                    <div style="width: 64px; height: 64px; background: #dcfce7; color: #166534; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
                        <svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <h2 style="font-weight: 800; font-size: 1.5rem; margin-bottom: 0.5rem; color: var(--text-main);">Check your email</h2>
                    <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 1rem; line-height: 1.5;">If an account exists for this email address, we've sent you a password reset link.</p>
                    <div id="forgot-success-email" style="font-weight: 700; font-size: 0.95rem; margin-bottom: 2rem; color: var(--text-main); padding: 0.75rem; background: var(--bg-page); border-radius: 8px; border: 1px solid var(--border-color);"></div>
                    <a href="#login" class="btn btn-outline-primary" style="width: 100%; padding: 0.75rem; border-radius: 8px; font-weight: 600; margin-bottom: 1.5rem;">Back to Sign In</a>
                    <div style="font-size: 0.875rem;">
                        <span style="color: var(--text-muted);">Didn't receive the email?</span>
                        <a href="#forgot-password" onclick="document.getElementById('forgot-success-container').classList.add('hidden'); document.getElementById('forgot-form-container').classList.remove('hidden'); return false;" style="color: var(--primary); font-weight: 700; text-decoration: none; margin-left: 0.5rem;">Try Again</a>
                    </div>
                </div>
            </div>
        `;
        this.authContainer.innerHTML = html;

        document.getElementById('forgot-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('forgot-email').value;
            const errDiv = document.getElementById('auth-error');
            const btn = document.getElementById('forgot-btn');
            
            errDiv.classList.add('hidden');
            btn.textContent = 'SENDING...';
            btn.disabled = true;

            const { data, error } = await window.authService.resetPasswordForEmail(email);
            
            if (error) {
                document.getElementById('auth-error-msg').textContent = error.message;
                errDiv.classList.remove('hidden');
                btn.textContent = 'Send Reset Link';
                btn.disabled = false;
            } else {
                document.getElementById('forgot-form-container').classList.add('hidden');
                document.getElementById('forgot-success-email').textContent = email;
                document.getElementById('forgot-success-container').classList.remove('hidden');
            }
        });
    }

    renderResetPassword() {
        const html = `
            <div class="auth-card">
                <div id="reset-form-container">
                    <div style="text-align: center; margin-bottom: 2.5rem;">
                        <div style="width: 48px; height: 48px; background: #e0e7ff; color: #4f46e5; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
                            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.778-7.778zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>
                        </div>
                        <h2 style="color: var(--text-main); font-weight: 800; font-size: 1.5rem; margin-bottom: 0.5rem; letter-spacing: -0.02em;">Set new password</h2>
                        <p style="color: var(--text-muted); font-size: 0.875rem; line-height: 1.5;">Please enter your new password below.</p>
                    </div>
                    <div id="auth-error" class="hidden" style="background: #fef2f2; border: 1px solid #fca5a5; color: #b91c1c; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; font-size: 0.875rem; font-weight: 500; display: flex; align-items: flex-start; gap: 0.5rem;">
                        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-top: 2px; flex-shrink: 0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        <span id="auth-error-msg"></span>
                    </div>
                    <form id="reset-form">
                        <div class="form-group" style="margin-bottom: 1.25rem;">
                            <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-main);">New Password</label>
                            <input type="password" id="reset-password" required minlength="8" class="form-control" placeholder="••••••••" style="width: 100%;">
                        </div>
                        <div class="form-group" style="margin-bottom: 2rem;">
                            <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-main);">Confirm New Password</label>
                            <input type="password" id="reset-confirm" required minlength="8" class="form-control" placeholder="••••••••" style="width: 100%;">
                        </div>
                        <button type="submit" id="reset-btn" class="btn btn-primary" style="width: 100%; padding: 0.75rem; border-radius: 8px; font-weight: 700;">Update Password</button>
                    </form>
                </div>
                
                <div id="reset-success-container" class="hidden" style="text-align: center;">
                    <div style="width: 64px; height: 64px; background: #dcfce7; color: #166534; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
                        <svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <h2 style="font-weight: 800; font-size: 1.5rem; margin-bottom: 0.5rem; color: var(--text-main);">Password updated</h2>
                    <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 2rem; line-height: 1.5;">Your admin password has been changed successfully.</p>
                    <a href="#login" class="btn btn-primary" style="width: 100%; padding: 0.75rem; border-radius: 8px; font-weight: 700;">Sign In</a>
                </div>
            </div>
        `;
        this.authContainer.innerHTML = html;

        document.getElementById('reset-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('reset-password').value;
            const confirm = document.getElementById('reset-confirm').value;
            const errDiv = document.getElementById('auth-error');
            const btn = document.getElementById('reset-btn');

            errDiv.classList.add('hidden');

            if (password !== confirm) {
                document.getElementById('auth-error-msg').textContent = 'Passwords do not match.';
                errDiv.classList.remove('hidden');
                return;
            }

            btn.textContent = 'UPDATING...';
            btn.disabled = true;

            const { data, error } = await window.authService.updatePassword(password);
            
            if (error) {
                // If it's an expired token error or generic update error
                if (error.message.includes('expired') || error.message.includes('invalid')) {
                    this._isRecovery = false;
                    this.renderResetExpired();
                } else {
                    document.getElementById('auth-error-msg').textContent = error.message;
                    errDiv.classList.remove('hidden');
                    btn.textContent = 'Update Password';
                    btn.disabled = false;
                }
            } else {
                this._isRecovery = false;
                document.getElementById('reset-form-container').classList.add('hidden');
                document.getElementById('reset-success-container').classList.remove('hidden');
            }
        });
    }

    renderResetExpired() {
        const html = `
            <div class="auth-card" style="text-align: center;">
                <div style="width: 64px; height: 64px; background: #fef2f2; color: #b91c1c; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
                    <svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                </div>
                <h2 style="font-weight: 800; font-size: 1.5rem; margin-bottom: 0.5rem; color: var(--text-main); letter-spacing: -0.02em;">Link Expired</h2>
                <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 2.5rem; line-height: 1.5;">This password reset link is no longer valid or has already been used. Please request a new one.</p>
                <a href="#forgot-password" class="btn btn-primary" style="width: 100%; padding: 0.75rem; border-radius: 8px; font-weight: 700;">Request New Link</a>
            </div>
        `;
        this.authContainer.innerHTML = html;
    }

    async handleLogout() {
        await window.authService.signOut();
        window.location.hash = '#login';
    }

    setupResetButton() {
        const resetBtn = document.getElementById('reset-db-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to completely reset the mock database to its initial state? All imported timetables and edited routes will be lost.')) {
                    localStorage.clear();
                    window.location.reload();
                }
            });
        }
    }

    // --- DASHBOARD ---
    
    timeAgo(dateString) {
        if (!dateString) return "Unknown time";
        
        let safeDateString = dateString.replace(' ', 'T');
        if (!safeDateString.includes('Z') && !safeDateString.includes('+') && !safeDateString.includes('-') && safeDateString.length <= 23) {
            safeDateString += 'Z';
        }
        
        const date = new Date(safeDateString);
        const seconds = Math.floor((new Date() - date) / 1000);
        
        if (seconds < 60) return "Just now";
        
        let interval = seconds / 31536000;
        if (interval >= 1) return Math.floor(interval) + " year" + (Math.floor(interval) > 1 ? "s" : "") + " ago";
        interval = seconds / 2592000;
        if (interval >= 1) return Math.floor(interval) + " month" + (Math.floor(interval) > 1 ? "s" : "") + " ago";
        interval = seconds / 86400;
        if (interval >= 1) {
            const days = Math.floor(interval);
            return days === 1 ? "Yesterday" : days + " days ago";
        }
        interval = seconds / 3600;
        if (interval >= 1) return Math.floor(interval) + " hour" + (Math.floor(interval) > 1 ? "s" : "") + " ago";
        interval = seconds / 60;
        if (interval >= 1) return Math.floor(interval) + " minute" + (Math.floor(interval) > 1 ? "s" : "") + " ago";
        
        return "Just now";
    }

    renderDashboard() {
        // Generate Dynamic Activities HTML
        const activities = store.getActivities();
        let activitiesHtml = '';
        
        if (!activities || activities.length === 0) {
            activitiesHtml = `
                <div style="padding: 3rem 2rem; text-align: center; color: var(--text-muted);">
                    <svg style="width: 48px; height: 48px; margin: 0 auto 1rem auto; opacity: 0.5;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <div style="font-weight: 600; font-size: 1.1rem; color: var(--text-main); margin-bottom: 0.25rem;">No recent updates yet.</div>
                    <div style="font-size: 0.875rem;">Changes made in the admin portal will appear here.</div>
                </div>
            `;
        } else {
            activitiesHtml = activities.map((act, i) => {
                const colorMap = {
                    'success': 'var(--success)',
                    'danger': '#ef4444',
                    'info': '#3b82f6',
                    'warning': '#f59e0b'
                };
                const dotColor = colorMap[act.action_type] || colorMap['success'];
                const isLast = i === activities.length - 1;
                
                return `
                    <div style="padding: 1rem 1.5rem; ${isLast ? '' : 'border-bottom: 1px solid var(--border-color);'} display: flex; align-items: center; justify-content: space-between; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='var(--bg-page)'" onmouseout="this.style.backgroundColor='transparent'">
                        <div style="display: flex; align-items: center;">
                            <div style="width: 10px; height: 10px; border-radius: 50%; background: ${dotColor}; margin-right: 1.25rem; box-shadow: 0 0 0 3px ${dotColor}20;"></div>
                            <div>
                                <div style="font-weight: 700; color: var(--text-main); margin-bottom: 0.1rem;">${act.item_name}</div>
                                <div style="font-size: 0.875rem; color: var(--text-muted);">${act.action_details}</div>
                            </div>
                        </div>
                        <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">
                            ${this.timeAgo(act.created_at)}
                        </div>
                    </div>
                `;
            }).join('');
        }

        const html = `
            <style>
                .dashboard-card {
                    background: var(--bg-card); 
                    padding: 1.5rem; 
                    border-radius: 12px; 
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); 
                    border: 1px solid var(--border-color);
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                    display: flex;
                    align-items: center;
                    gap: 1.25rem;
                }
                .dashboard-card:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04);
                }
                .dashboard-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: 10px;
                    background: var(--primary);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
            </style>
            <div style="max-width: 1100px; margin: 0 auto; padding-bottom: 2rem;">
                <h2 style="font-size: 1.75rem; font-weight: 800; margin-bottom: 2rem; color: var(--text-main); letter-spacing: -0.02em;">Dashboard Overview</h2>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; margin-bottom: 3rem;">
                    <div class="dashboard-card">
                        <div class="dashboard-icon">
                            <svg style="width:24px;height:24px;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 16v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1"></path><path d="M4 16V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10"></path><path d="M8 19v2"></path><path d="M16 19v2"></path><path d="M4 11h16"></path><circle cx="8" cy="15" r="1"></circle><circle cx="16" cy="15" r="1"></circle></svg>
                        </div>
                        <div>
                            <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.25rem; letter-spacing: 0.5px;">TOTAL BUSES</div>
                            <div style="font-size: 2rem; font-weight: 800; color: var(--text-main); line-height: 1;">${store.getAdminBuses().length}</div>
                        </div>
                    </div>
                    
                    <div class="dashboard-card">
                        <div class="dashboard-icon" style="background: #0ea5e9;">
                            <svg style="width:24px;height:24px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        </div>
                        <div>
                            <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.25rem; letter-spacing: 0.5px;">TOTAL STOPS</div>
                            <div style="font-size: 2rem; font-weight: 800; color: var(--text-main); line-height: 1;">${store.getStops().length}</div>
                        </div>
                    </div>
                    
                    <div class="dashboard-card">
                        <div class="dashboard-icon" style="background: #8b5cf6;">
                            <svg style="width:24px;height:24px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
                        </div>
                        <div>
                            <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.25rem; letter-spacing: 0.5px;">TOTAL ROUTES</div>
                            <div style="font-size: 2rem; font-weight: 800; color: var(--text-main); line-height: 1;">${store.getAdminRoutes().length}</div>
                        </div>
                    </div>
                    
                    <div class="dashboard-card">
                        <div class="dashboard-icon" style="background: #10b981;">
                            <svg style="width:24px;height:24px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>
                        <div>
                            <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.25rem; letter-spacing: 0.5px;">ACTIVE TRIPS</div>
                            <div style="font-size: 2rem; font-weight: 800; color: var(--text-main); line-height: 1;">${store.getAdminTrips().filter(t=>t.status==='active').length}</div>
                        </div>
                    </div>
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                    <h3 style="font-size: 1.25rem; font-weight: 700; margin: 0; color: var(--text-main);">Recent Updates</h3>
                    ${activities && activities.length > 0 ? `<button onclick="if(confirm('Are you sure you want to clear all history?')) window.store.clearActivities()" style="background: transparent; border: none; color: #ef4444; font-size: 0.875rem; font-weight: 600; cursor: pointer; padding: 0.5rem; transition: opacity 0.2s;" onmouseover="this.style.opacity=0.7" onmouseout="this.style.opacity=1">Clear History</button>` : ''}
                </div>
                
                <div style="background: var(--bg-card); border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid var(--border-color); overflow: hidden;">
                    ${activitiesHtml}
                </div>
            </div>
        `;
        this.mainContent.innerHTML = html;
    }

    // --- BUSES ---

    renderBuses(searchQuery = '') {
        const buses = store.getAdminBuses();
        const filteredBuses = searchQuery 
            ? buses.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()) || b.operator.toLowerCase().includes(searchQuery.toLowerCase())) 
            : buses;
            
        let rowsHtml = '';

        filteredBuses.forEach(bus => {
            const statusClass = bus.status === 'active' ? 'badge-success' : 'badge-danger';
            rowsHtml += `
                <div class="dashboard-card" style="display: flex; flex-direction: column; align-items: stretch; padding: 1.25rem; gap: 1rem;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <div style="font-weight: 800; font-size: 1.125rem; color: var(--text-main); margin-bottom: 0.125rem;">${bus.name}</div>
                            <div style="color: var(--text-muted); font-size: 0.875rem; font-weight: 500;">${bus.operator} &bull; ${bus.type}</div>
                        </div>
                        <span class="badge ${statusClass}">${bus.status}</span>
                    </div>
                    <div style="display: flex; gap: 0.5rem; margin-top: auto; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                        <button class="btn btn-outline-primary" style="flex: 1; padding: 0.5rem; font-size: 0.875rem; border-radius: 6px;" onclick="window.adminApp.openBusEditor('${bus.id}')">
                            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="vertical-align: text-bottom; margin-right: 4px;"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg> Edit
                        </button>
                        <button class="btn btn-outline-danger" style="flex: 1; padding: 0.5rem; font-size: 0.875rem; border-radius: 6px;" onclick="window.adminApp.openDeleteBusModal('${bus.id}')">
                            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="vertical-align: text-bottom; margin-right: 4px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> Delete
                        </button>
                    </div>
                </div>
            `;
        });
        
        if (filteredBuses.length === 0) {
            rowsHtml = `
                <div style="grid-column: 1 / -1;">
                    <div class="empty-state">
                        <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8V5a2 2 0 00-2-2H10a2 2 0 00-2 2v3m12 4v4H4v-4m12-4H8m12 0a2 2 0 114 0m-16 0a2 2 0 11-4 0"></path></svg>
                        <div class="empty-state-title">No buses found</div>
                        <div class="empty-state-desc">Add your first bus to start building the transit database.</div>
                        <button class="btn btn-primary" onclick="window.adminApp.openAddBusEditor()">+ Add Bus</button>
                    </div>
                </div>
            `;
        }

        const html = `
            <div style="max-width: 1200px; margin: 0 auto; padding-bottom: 3rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
                    <h2 style="font-size: 1.75rem; font-weight: 800; margin: 0; color: var(--text-main); letter-spacing: -0.02em;">Bus Management</h2>
                    <button class="btn btn-primary" style="padding: 0.75rem 1.5rem;" onclick="window.adminApp.openAddBusEditor()">+ Add Bus</button>
                </div>
                
                <div style="margin-bottom: 2rem;">
                    <div style="position: relative; max-width: 400px;">
                        <svg style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--text-muted); width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" stroke-width="2"></circle><line x1="21" y1="21" x2="16.65" y2="16.65" stroke-width="2"></line></svg>
                        <input type="text" id="admin-bus-search" placeholder="Search buses by name or operator..." value="${searchQuery}" class="form-control" style="padding-left: 2.75rem;">
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem;">
                    ${rowsHtml}
                </div>
            </div>
        `;
        this.mainContent.innerHTML = html;
        
        // Add event listener to search input
        const searchInput = document.getElementById('admin-bus-search');
        if (searchInput) {
            searchInput.focus();
            const val = searchInput.value;
            searchInput.value = '';
            searchInput.value = val;
            
            searchInput.addEventListener('input', (e) => {
                this.renderBuses(e.target.value);
            });
        }
    }

    // --- STOPS ---

    renderStops(searchQuery = '') {
        const stops = store.getStops().sort((a, b) => a.name.localeCompare(b.name));
        const filteredStops = searchQuery
            ? stops.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || (s.area && s.area.toLowerCase().includes(searchQuery.toLowerCase())))
            : stops;
            
        let rowsHtml = '';

        filteredStops.forEach(stop => {
            const aliases = store.getAliases().filter(a => a.stop_id === stop.id).map(a => `<span style="background: var(--bg-page); color: var(--text-muted); padding: 0.125rem 0.375rem; border-radius: 4px; font-size: 0.7rem; border: 1px solid var(--border-color);">${a.alias}</span>`).join(' ');
            const statusClass = stop.status === 'active' ? 'badge-success' : 'badge-danger';
            
            rowsHtml += `
                <div class="dashboard-card" style="display: flex; flex-direction: column; align-items: stretch; padding: 1.25rem; gap: 1rem;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
                        <div style="display: flex; gap: 0.75rem; align-items: flex-start;">
                            <div style="margin-top: 0.25rem;">
                                <input type="checkbox" class="stop-checkbox" value="${stop.id}" onchange="window.adminApp.updateMultipleDeleteButton()" style="cursor: pointer; width: 1.1rem; height: 1.1rem; accent-color: var(--primary);">
                            </div>
                            <div>
                                <div style="font-weight: 800; font-size: 1.125rem; color: var(--text-main); margin-bottom: 0.125rem;">${stop.name}</div>
                                <div style="color: var(--text-muted); font-size: 0.875rem; font-weight: 500;">${stop.area || 'No Area Specified'}</div>
                                ${aliases ? `<div style="display: flex; gap: 0.25rem; flex-wrap: wrap; margin-top: 0.5rem;">${aliases}</div>` : ''}
                            </div>
                        </div>
                        <span class="badge ${statusClass}">${stop.status}</span>
                    </div>
                    <div style="display: flex; gap: 0.5rem; margin-top: auto; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                        <button class="btn btn-outline-primary" style="flex: 1; padding: 0.5rem; font-size: 0.875rem; border-radius: 6px;" onclick="window.adminApp.openStopEditor('${stop.id}')">
                            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="vertical-align: text-bottom; margin-right: 4px;"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg> Edit
                        </button>
                        <button class="btn btn-outline-danger" style="flex: 1; padding: 0.5rem; font-size: 0.875rem; border-radius: 6px;" onclick="window.adminApp.openDeleteStopModal('${stop.id}')">
                            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="vertical-align: text-bottom; margin-right: 4px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> Delete
                        </button>
                    </div>
                </div>
            `;
        });
        
        if (filteredStops.length === 0) {
            rowsHtml = `
                <div style="grid-column: 1 / -1;">
                    <div class="empty-state">
                        <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        <div class="empty-state-title">No stops found</div>
                        <div class="empty-state-desc">Add a stop to use it in bus routes.</div>
                        <button class="btn btn-primary" onclick="window.adminApp.openAddStopEditor()">+ Add Stop</button>
                    </div>
                </div>
            `;
        }

        const html = `
            <div style="max-width: 1200px; margin: 0 auto; padding-bottom: 3rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
                    <h2 style="font-size: 1.75rem; font-weight: 800; margin: 0; color: var(--text-main); letter-spacing: -0.02em;">Stop Management</h2>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <button class="btn btn-outline-danger" id="delete-selected-stops-btn" style="padding: 0.75rem 1.5rem; opacity: 0.5; pointer-events: none; border-radius: 8px;" onclick="window.adminApp.openDeleteMultipleStopsModal()">Delete Selected</button>
                        <button class="btn btn-primary" style="padding: 0.75rem 1.5rem;" onclick="window.adminApp.openAddStopEditor()">+ Add Stop</button>
                    </div>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
                    <div style="position: relative; flex: 1; max-width: 400px;">
                        <svg style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--text-muted); width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" stroke-width="2"></circle><line x1="21" y1="21" x2="16.65" y2="16.65" stroke-width="2"></line></svg>
                        <input type="text" id="admin-stop-search" placeholder="Search stops by name or area..." value="${searchQuery}" class="form-control" style="padding-left: 2.75rem;">
                    </div>
                    
                    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; color: var(--text-main); font-weight: 600; font-size: 0.875rem;">
                        <input type="checkbox" id="select-all-stops" onchange="window.adminApp.toggleAllStops(this)" style="width: 1.1rem; height: 1.1rem; accent-color: var(--primary);">
                        Select All Shown
                    </label>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem;">
                    ${rowsHtml}
                </div>
            </div>
        `;
        this.mainContent.innerHTML = html;
        
        const searchInput = document.getElementById('admin-stop-search');
        if (searchInput) {
            searchInput.focus();
            const val = searchInput.value;
            searchInput.value = '';
            searchInput.value = val;
            
            searchInput.addEventListener('input', (e) => {
                this.renderStops(e.target.value);
            });
        }
    }

    openDeleteStopModal(stopId) {
        const stop = store.getStopById(stopId);
        if (!stop) return;
        
        this.currentDeleteStopId = stopId;
        const container = document.getElementById('admin-modal-container');
        
        // Find if stop is used in any routes
        const routesUsingStop = store.getRouteStops().filter(rs => rs.stop_id === stopId).map(rs => rs.route_id);
        const uniqueRoutes = [...new Set(routesUsingStop)];
        const hasData = uniqueRoutes.length > 0;
        
        let contentHtml = '';
        if (hasData) {
            contentHtml = `
                <div style="background: #fef2f2; border: 1px solid #fca5a5; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
                    <h3 style="color: #b91c1c; font-weight: 700; margin-bottom: 0.5rem;">⚠ This stop is used in routes</h3>
                    <p style="color: #991b1b; font-size: 0.9rem; margin-bottom: 1rem;">Deleting this stop will remove it from ${uniqueRoutes.length} route(s) and delete associated timetable entries.</p>
                    
                    <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.875rem; color: #7f1d1d;">Type <strong style="user-select: all;">${stop.name}</strong> to confirm deletion</label>
                    <input type="text" id="delete-stop-confirm-input" placeholder="${stop.name}" style="width: 100%; padding: 0.75rem; border: 1px solid #fca5a5; border-radius: 4px; font-size: 1rem;" oninput="window.adminApp.validateDeleteStopInput('${stop.name.replace(/'/g, "\\'")}')">
                </div>
            `;
        } else {
            contentHtml = `
                <div style="background: #f8fafc; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; text-align: center;">
                    <p style="color: #475569; font-size: 1rem; margin-bottom: 0.5rem;"><strong>${stop.name}</strong> is not used in any routes.</p>
                    <p style="color: #64748b; font-size: 0.875rem;">Are you sure you want to delete it?</p>
                </div>
            `;
        }

        const html = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2 class="modal-title" style="color: #b91c1c;">Delete Stop?</h2>
                    <button class="modal-close-btn" onclick="window.adminApp.closeDeleteStopModal()">
                        <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                
                <div class="modal-body">
                    ${contentHtml}
                </div>
                
                <div class="modal-footer" style="background: var(--bg-page);">
                    <button class="btn btn-outline-primary" style="padding: 0.75rem 1.5rem; border-radius: 8px;" onclick="window.adminApp.closeDeleteStopModal()" id="delete-stop-cancel-btn">Cancel</button>
                    <button id="delete-stop-confirm-btn" class="btn" style="padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; background: #b91c1c; color: #fff; border: 1px solid #991b1b; ${hasData ? 'opacity: 0.5; cursor: not-allowed;' : ''}" ${hasData ? 'disabled' : ''} onclick="window.adminApp.executeDeleteStop(${hasData})">${hasData ? 'Delete Stop & Data' : 'Delete Stop'}</button>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        container.classList.remove('hidden');
        setTimeout(() => container.classList.add('show'), 10);
        
        if (hasData) {
            setTimeout(() => document.getElementById('delete-stop-confirm-input').focus(), 50);
        }
    }
    
    validateDeleteStopInput(expectedName) {
        const input = document.getElementById('delete-stop-confirm-input').value;
        const btn = document.getElementById('delete-stop-confirm-btn');
        if (input === expectedName) {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        } else {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        }
    }
    
    closeDeleteStopModal() {
        const container = document.getElementById('admin-modal-container');
        container.classList.remove('show');
        setTimeout(() => {
            container.classList.add('hidden');
            container.innerHTML = '';
        }, 300);
        this.currentDeleteStopId = null;
    }
    
    async executeDeleteStop(hasData) {
        const stopId = this.currentDeleteStopId;
        const stop = store.getStopById(stopId);
        if (!stop) return;
        
        const btn = document.getElementById('delete-stop-confirm-btn');
        const cancelBtn = document.getElementById('delete-stop-cancel-btn');
        btn.textContent = 'Deleting...';
        btn.disabled = true;
        btn.style.opacity = '0.7';
        cancelBtn.disabled = true;
        
        const input = document.getElementById('delete-stop-confirm-input');
        if (input) input.disabled = true;
        
        setTimeout(async () => {
            try {
                await store.deleteStop(stopId);
                
                window.toast('Stop deleted successfully', 'success');
                
                this.closeDeleteStopModal();
                this.renderStops();
            } catch (err) {
                console.error(err);
                btn.textContent = 'Error';
                btn.style.background = '#991b1b';
                setTimeout(() => {
                    alert('Unable to delete this stop. Please try again.');
                    this.closeDeleteStopModal();
                }, 100);
            }
        }, 500);
    }

    toggleAllStops(checkbox) {
        const checkboxes = document.querySelectorAll('.stop-checkbox');
        checkboxes.forEach(cb => cb.checked = checkbox.checked);
        this.updateMultipleDeleteButton();
    }

    updateMultipleDeleteButton() {
        const selected = document.querySelectorAll('.stop-checkbox:checked');
        const btn = document.getElementById('delete-selected-stops-btn');
        if (selected.length > 0) {
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
            btn.textContent = `Delete Selected (${selected.length})`;
        } else {
            btn.style.opacity = '0.5';
            btn.style.pointerEvents = 'none';
            btn.textContent = 'Delete Selected';
            const selectAll = document.getElementById('select-all-stops');
            if (selectAll) selectAll.checked = false;
        }
    }
    
    openDeleteMultipleStopsModal() {
        const selected = Array.from(document.querySelectorAll('.stop-checkbox:checked')).map(cb => cb.value);
        if (selected.length === 0) return;
        
        this.currentDeleteMultipleStopIds = selected;
        const container = document.getElementById('admin-modal-container');
        
        let usedRoutesCount = 0;
        selected.forEach(stopId => {
            const routesUsingStop = store.getRouteStops().filter(rs => rs.stop_id === stopId).map(rs => rs.route_id);
            usedRoutesCount += new Set(routesUsingStop).size;
        });
        
        const hasData = usedRoutesCount > 0;
        
        let contentHtml = '';
        if (hasData) {
            contentHtml = `
                <div style="background: #fef2f2; border: 1px solid #fca5a5; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
                    <h3 style="color: #b91c1c; font-weight: 700; margin-bottom: 0.5rem;">⚠ Some selected stops are used in routes</h3>
                    <p style="color: #991b1b; font-size: 0.9rem; margin-bottom: 1rem;">Deleting these stops will remove them from ${usedRoutesCount} route(s) and delete associated timetable entries.</p>
                    
                    <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.875rem; color: #7f1d1d;">Type <strong style="user-select: all;">DELETE</strong> to confirm deletion</label>
                    <input type="text" id="delete-multiple-stops-confirm-input" placeholder="DELETE" style="width: 100%; padding: 0.75rem; border: 1px solid #fca5a5; border-radius: 4px; font-size: 1rem;" oninput="window.adminApp.validateDeleteMultipleStopsInput()">
                </div>
            `;
        } else {
            contentHtml = `
                <div style="background: #f8fafc; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; text-align: center;">
                    <p style="color: #475569; font-size: 1rem; margin-bottom: 0.5rem;"><strong>${selected.length} stops</strong> selected for deletion.</p>
                    <p style="color: #64748b; font-size: 0.875rem;">Are you sure you want to delete them?</p>
                </div>
            `;
        }

        const html = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2 class="modal-title" style="color: #b91c1c;">Delete ${selected.length} Stops?</h2>
                    <button class="modal-close-btn" onclick="window.adminApp.closeDeleteMultipleStopsModal()">
                        <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                
                <div class="modal-body">
                    ${contentHtml}
                </div>
                
                <div class="modal-footer" style="background: var(--bg-page);">
                    <button class="btn btn-outline-primary" style="padding: 0.75rem 1.5rem; border-radius: 8px;" onclick="window.adminApp.closeDeleteMultipleStopsModal()" id="delete-multiple-stops-cancel-btn">Cancel</button>
                    <button id="delete-multiple-stops-confirm-btn" class="btn" style="padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; background: #b91c1c; color: #fff; border: 1px solid #991b1b; ${hasData ? 'opacity: 0.5; cursor: not-allowed;' : ''}" ${hasData ? 'disabled' : ''} onclick="window.adminApp.executeDeleteMultipleStops()">${hasData ? 'Delete Stops & Data' : 'Delete Stops'}</button>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        container.classList.remove('hidden');
        setTimeout(() => container.classList.add('show'), 10);
        
        if (hasData) {
            setTimeout(() => document.getElementById('delete-multiple-stops-confirm-input').focus(), 50);
        }
    }
    
    validateDeleteMultipleStopsInput() {
        const input = document.getElementById('delete-multiple-stops-confirm-input').value;
        const btn = document.getElementById('delete-multiple-stops-confirm-btn');
        if (input === 'DELETE') {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        } else {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        }
    }
    
    closeDeleteMultipleStopsModal() {
        const container = document.getElementById('admin-modal-container');
        container.classList.remove('show');
        setTimeout(() => {
            container.classList.add('hidden');
            container.innerHTML = '';
        }, 300);
        this.currentDeleteMultipleStopIds = null;
    }
    
    async executeDeleteMultipleStops() {
        const stopIds = this.currentDeleteMultipleStopIds;
        if (!stopIds || stopIds.length === 0) return;
        
        const btn = document.getElementById('delete-multiple-stops-confirm-btn');
        const cancelBtn = document.getElementById('delete-multiple-stops-cancel-btn');
        btn.textContent = 'Deleting...';
        btn.disabled = true;
        btn.style.opacity = '0.7';
        cancelBtn.disabled = true;
        
        const input = document.getElementById('delete-multiple-stops-confirm-input');
        if (input) input.disabled = true;
        
        setTimeout(async () => {
            try {
                await store.deleteMultipleStops(stopIds);
                
                window.toast(`${stopIds.length} stops deleted successfully`, 'success');
                
                this.closeDeleteMultipleStopsModal();
                this.renderStops();
            } catch (err) {
                console.error(err);
                btn.textContent = 'Error';
                btn.style.background = '#991b1b';
                setTimeout(() => {
                    alert('Unable to delete these stops. Please try again.');
                    this.closeDeleteMultipleStopsModal();
                }, 100);
            }
        }, 500);
    }

    // --- STOP EDITOR ---

    openStopEditor(stopId) {
        const stop = store.getStopById(stopId);
        if (stop) {
            this.currentEditStop = { ...stop }; // clone
            this.currentEditStopAliases = store.getAliases().filter(a => a.stop_id === stopId).map(a => a.alias);
            this.renderStopEditorModal('Edit Stop');
        }
    }

    openAddStopEditor() {
        this.currentEditStop = { id: null, name: '', area: '', status: 'active' };
        this.currentEditStopAliases = [];
        this.renderStopEditorModal('Add Stop');
    }

    renderStopEditorModal(title) {
        const container = document.getElementById('admin-modal-container');
        const s = this.currentEditStop;
        
        let aliasesHtml = '';
        this.currentEditStopAliases.forEach((alias, idx) => {
            aliasesHtml += `
                <div class="alias-row" style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <input type="text" class="edit-stop-alias form-control" value="${alias}" style="flex: 1;" oninput="window.adminApp.markStopDirty()" placeholder="e.g. KVTM, Kothamangalam Stand">
                    <button class="btn btn-outline-danger" style="padding: 0 1rem;" onclick="window.adminApp.removeStopAliasField(${idx})">
                        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </div>
            `;
        });

        const html = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title">${title}</h2>
                    <button class="modal-close-btn" onclick="window.adminApp.closeStopEditor()">
                        <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                
                <div class="modal-body">
                    <div id="stop-editor-error" class="hidden" style="background: #fee2e2; color: #991b1b; padding: 1rem; border-radius: 4px; margin-bottom: 1.5rem; font-weight: 500; font-size: 0.875rem;"></div>
                    
                    <div class="form-group">
                        <label>Stop Name <span style="color:#b91c1c">*</span></label>
                        <input type="text" id="edit-stop-name" value="${s.name}" class="form-control" oninput="window.adminApp.markStopDirty()" placeholder="e.g. Kothamangalam">
                    </div>

                    <div class="form-group" style="margin-top: 1.25rem;">
                        <label>Area (Optional)</label>
                        <input type="text" id="edit-stop-area" value="${s.area || ''}" class="form-control" oninput="window.adminApp.markStopDirty()" placeholder="e.g. Ernakulam District">
                    </div>
                    
                    <div class="form-group" style="margin-top: 1.25rem;">
                        <label>Status</label>
                        <select id="edit-stop-status" class="form-control" onchange="window.adminApp.markStopDirty()">
                            <option value="active" ${s.status==='active'?'selected':''}>Active</option>
                            <option value="inactive" ${s.status==='inactive'?'selected':''}>Inactive</option>
                        </select>
                    </div>

                    <div class="form-group" style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border-color);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                            <label style="margin: 0;">Aliases (Alternative Names)</label>
                            <button class="btn btn-outline-primary" style="padding: 0.25rem 0.75rem; font-size: 0.75rem; border-radius: 4px;" onclick="window.adminApp.addStopAliasField()">+ Add Alias</button>
                        </div>
                        <div id="edit-stop-aliases-container">
                            ${aliasesHtml}
                            ${this.currentEditStopAliases.length === 0 ? '<div style="color: var(--text-muted); font-size: 0.875rem; font-style: italic; background: var(--bg-page); padding: 1rem; border-radius: 6px; text-align: center;">No aliases added. Aliases help OCR recognize different spellings of this stop.</div>' : ''}
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn btn-outline-primary" style="padding: 0.75rem 1.5rem; border-radius: 8px;" onclick="window.adminApp.closeStopEditor()">Cancel</button>
                    <button id="save-stop-btn" class="btn btn-primary" style="padding: 0.75rem 2rem; border-radius: 8px;" onclick="window.adminApp.saveStop()">Save Changes</button>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        container.classList.remove('hidden');
        setTimeout(() => container.classList.add('show'), 10);
        this.stopDirty = false;
    }

    markStopDirty() {
        this.stopDirty = true;
    }

    addStopAliasField() {
        // Collect current values before re-rendering
        const inputs = document.querySelectorAll('.edit-stop-alias');
        this.currentEditStopAliases = Array.from(inputs).map(inp => inp.value);
        this.currentEditStopAliases.push('');
        this.markStopDirty();
        this.renderStopEditorModal(this.currentEditStop.id ? 'Edit Stop' : 'Add Stop');
    }

    removeStopAliasField(index) {
        const inputs = document.querySelectorAll('.edit-stop-alias');
        this.currentEditStopAliases = Array.from(inputs).map(inp => inp.value);
        this.currentEditStopAliases.splice(index, 1);
        this.markStopDirty();
        this.renderStopEditorModal(this.currentEditStop.id ? 'Edit Stop' : 'Add Stop');
    }

    closeStopEditor() {
        if (this.stopDirty) {
            if (!confirm('You have unsaved changes. Discard them?')) return;
        }
        
        const container = document.getElementById('admin-modal-container');
        container.classList.remove('show');
        setTimeout(() => {
            container.classList.add('hidden');
            container.innerHTML = '';
        }, 300);
        
        this.currentEditStop = null;
        this.currentEditStopAliases = null;
        this.stopDirty = false;
    }

    async saveStop() {
        const name = document.getElementById('edit-stop-name').value.trim();
        const area = document.getElementById('edit-stop-area').value.trim();
        const status = document.getElementById('edit-stop-status').value;
        
        const inputs = document.querySelectorAll('.edit-stop-alias');
        const aliases = Array.from(inputs).map(inp => inp.value.trim()).filter(v => v !== '');

        const errEl = document.getElementById('stop-editor-error');
        errEl.classList.add('hidden');
        
        if (!name) {
            errEl.textContent = "Stop name is required.";
            errEl.classList.remove('hidden');
            return;
        }

        const btn = document.getElementById('save-stop-btn');
        const oldText = btn.textContent;
        btn.textContent = 'Saving...';
        btn.disabled = true;

        try {
            let stopId = this.currentEditStop.id;
            
            if (stopId) {
                // Update existing
                await store.updateStop(stopId, { name, area, status });
            } else {
                // Create new
                stopId = await store.addStop(name, area);
                // addStop currently forces status='active', we can update it immediately if needed, 
                // but usually a new stop is active anyway.
            }
            
            // Save aliases
            await store.updateStopAliases(stopId, aliases);
            
            this.stopDirty = false;
            this.closeStopEditor();
            this.renderStops();
            
        } catch (err) {
            errEl.textContent = err.message || "Failed to save stop.";
            errEl.classList.remove('hidden');
            btn.textContent = oldText;
            btn.disabled = false;
        }
    }

    // --- ROUTES ---

    renderRoutes(searchQuery = '') {
        const routes = store.getAdminRoutes();
        const filteredRoutes = searchQuery
            ? routes.filter(r => {
                const bus = store.getBusById(r.bus_id);
                const busName = bus ? bus.name.toLowerCase() : '';
                const origin = store.getStopById(r.origin_stop_id);
                const dest = store.getStopById(r.destination_stop_id);
                const routeName = `${origin ? origin.name.toLowerCase() : ''} to ${dest ? dest.name.toLowerCase() : ''}`;
                return busName.includes(searchQuery.toLowerCase()) || routeName.includes(searchQuery.toLowerCase());
            })
            : routes;
            
        let rowsHtml = '';

        filteredRoutes.forEach(route => {
            const bus = store.getBusById(route.bus_id);
            const routeStops = store.getRouteStops().filter(rs => rs.route_id === route.id).sort((a,b)=>a.stop_order - b.stop_order);
            
            let timelineHtml = `<div class="timeline-container">
                                    <div class="timeline-track"></div>`;
            
            routeStops.forEach((rs, index) => {
                const stopName = store.getStopById(rs.stop_id).name;
                const isOrigin = index === 0;
                const isDest = index === routeStops.length - 1;
                let nodeClass = isOrigin ? 'origin' : (isDest ? 'destination' : 'via');
                
                timelineHtml += `
                    <div class="timeline-node ${nodeClass}">
                        <div class="timeline-dot"></div>
                        <div class="timeline-content">${stopName}</div>
                        ${rs.distance_from_previous ? `<div class="timeline-subtext">${rs.distance_from_previous} km from previous</div>` : ''}
                    </div>
                `;
            });
            
            timelineHtml += `</div>`;

            rowsHtml += `
                <div class="dashboard-card" style="display: flex; flex-direction: column; padding: 1.5rem; gap: 1rem; margin-bottom: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;">
                        <div>
                            <div style="font-weight: 800; font-size: 1.25rem; color: var(--text-main); margin-bottom: 0.25rem;">${bus ? bus.name : 'Unknown Bus'}</div>
                            <div style="color: var(--text-muted); font-size: 0.875rem;">${store.getStopById(route.origin_stop_id)?.name} &rarr; ${store.getStopById(route.destination_stop_id)?.name}</div>
                        </div>
                        <button class="btn btn-outline-primary" style="padding: 0.5rem 1rem; border-radius: 6px; font-size: 0.875rem;" onclick="window.adminApp.openRouteStopsEditor('${route.id}')">
                            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="vertical-align: text-bottom; margin-right: 4px;"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg> Edit Stops
                        </button>
                    </div>
                    
                    <div>
                        <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">Route Timeline</div>
                        ${timelineHtml}
                    </div>
                </div>
            `;
        });
        
        if (filteredRoutes.length === 0) {
            rowsHtml = `
                <div class="empty-state">
                    <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
                    <div class="empty-state-title">No routes found</div>
                    <div class="empty-state-desc">Create routes from the Bus Management page by configuring a bus.</div>
                    <button class="btn btn-primary" onclick="window.adminApp.renderBuses()">Go to Buses</button>
                </div>
            `;
        }

        const html = `
            <div style="max-width: 1000px; margin: 0 auto; padding-bottom: 3rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                    <h2 style="font-size: 1.75rem; font-weight: 800; margin: 0; color: var(--text-main); letter-spacing: -0.02em;">Route Management</h2>
                </div>
                
                <div style="margin-bottom: 2rem;">
                    <div style="position: relative; max-width: 400px;">
                        <svg style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--text-muted); width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" stroke-width="2"></circle><line x1="21" y1="21" x2="16.65" y2="16.65" stroke-width="2"></line></svg>
                        <input type="text" id="admin-route-search" placeholder="Search routes by bus or stop name..." value="${searchQuery}" class="form-control" style="padding-left: 2.75rem;">
                    </div>
                </div>
                
                <div>
                    ${rowsHtml}
                </div>
            </div>
        `;
        this.mainContent.innerHTML = html;
        
        const searchInput = document.getElementById('admin-route-search');
        if (searchInput) {
            searchInput.focus();
            const val = searchInput.value;
            searchInput.value = '';
            searchInput.value = val;
            
            searchInput.addEventListener('input', (e) => {
                this.renderRoutes(e.target.value);
            });
        }
    }

    // --- BUS EDITOR ---

    openBusEditor(busId) {
        const bus = store.getBusById(busId);
        if (bus) {
            this.currentEditBus = { ...bus }; // clone
            this.renderBusEditorModal('Edit Bus');
        }
    }

    openAddBusEditor() {
        this.currentEditBus = { id: null, name: '', operator: 'Private', type: 'Private', status: 'active' };
        this.renderBusEditorModal('Add Bus');
    }

    renderBusEditorModal(title) {
        const container = document.getElementById('admin-modal-container');
        const b = this.currentEditBus;
        
        const html = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2 class="modal-title">${title}</h2>
                    <button class="modal-close-btn" onclick="window.adminApp.closeBusEditor()">
                        <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                
                <div class="modal-body">
                    <div id="bus-editor-error" class="hidden" style="background: #fee2e2; color: #991b1b; padding: 1rem; border-radius: 4px; margin-bottom: 1.5rem; font-weight: 500; font-size: 0.875rem;"></div>
                    
                    <div class="form-group">
                        <label>Bus Name</label>
                        <input type="text" id="edit-bus-name" value="${b.name}" class="form-control" oninput="window.adminApp.markBusDirty()" placeholder="e.g. Navya, KSRTC Fast">
                    </div>

                    <div class="form-group" style="margin-top: 1.25rem;">
                        <label>Operator</label>
                        <input type="text" id="edit-bus-operator" value="${b.operator}" class="form-control" oninput="window.adminApp.markBusDirty()" placeholder="e.g. Private, KSRTC">
                    </div>

                    <div class="form-group" style="margin-top: 1.25rem;">
                        <label>Bus Type</label>
                        <select id="edit-bus-type" class="form-control" onchange="window.adminApp.markBusDirty()">
                            <option value="Private" ${b.type==='Private'?'selected':''}>Private</option>
                            <option value="KSRTC" ${b.type==='KSRTC'?'selected':''}>KSRTC</option>
                            <option value="KSRTC Swift" ${b.type==='KSRTC Swift'?'selected':''}>KSRTC Swift</option>
                            <option value="Other" ${b.type==='Other'?'selected':''}>Other</option>
                        </select>
                    </div>

                    <div class="form-group" style="margin-top: 1.25rem;">
                        <label>Status</label>
                        <select id="edit-bus-status" class="form-control" onchange="window.adminApp.markBusDirty()">
                            <option value="active" ${b.status==='active'?'selected':''}>Active</option>
                            <option value="inactive" ${b.status==='inactive'?'selected':''}>Inactive</option>
                        </select>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn btn-outline-primary" style="padding: 0.75rem 1.5rem; border-radius: 8px;" onclick="window.adminApp.closeBusEditor()">Cancel</button>
                    <button class="btn btn-primary" style="padding: 0.75rem 2rem; border-radius: 8px;" onclick="window.adminApp.saveBus()">Save Changes</button>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        container.classList.remove('hidden');
        setTimeout(() => container.classList.add('show'), 10);
        this.busDirty = false;
    }
    
    markBusDirty() {
        this.busDirty = true;
    }

    closeBusEditor() {
        if (this.busDirty) {
            if (!confirm('You have unsaved changes. Discard changes?')) {
                return;
            }
        }
        
        document.getElementById('admin-modal-container').classList.add('hidden');
        document.getElementById('admin-modal-container').innerHTML = '';
        this.currentEditBus = null;
        this.busDirty = false;
    }

    async saveBus() {
        const name = document.getElementById('edit-bus-name').value.trim();
        const operator = document.getElementById('edit-bus-operator').value.trim();
        const type = document.getElementById('edit-bus-type').value;
        const status = document.getElementById('edit-bus-status').value;
        const err = document.getElementById('bus-editor-error');

        if (!name) {
            err.textContent = "Bus name is required.";
            err.classList.remove('hidden');
            return;
        }
        if (!operator) {
            err.textContent = "Operator is required.";
            err.classList.remove('hidden');
            return;
        }

        let savedBusId;
        if (this.currentEditBus.id) {
            // Update existing
            savedBusId = this.currentEditBus.id;
            await store.updateBus(savedBusId, { name, operator, type, status });
            
            // Show success notification for update
            window.toast('Bus updated successfully', 'success');
            
            this.busDirty = false;
            this.closeBusEditor();
            this.renderBuses();
        } else {
            // Add new
            savedBusId = await store.addBus(name, operator, type, status);
            this.busDirty = false;
            
            // Transition to configuration prompt
            const container = document.getElementById('admin-modal-container');
            container.innerHTML = `
                <div class="modal-content" style="text-align: center; padding: 2rem;">
                    <div style="width: 64px; height: 64px; background: #dcfce7; color: #166534; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
                        <svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    </div>
                    <h2 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 0.5rem; color: var(--text-main);">Bus created successfully</h2>
                    <div style="font-size: 1.25rem; font-weight: 700; color: var(--primary); margin-bottom: 1rem;">${name}</div>
                    <p style="color: var(--text-muted); margin-bottom: 2rem;">Would you like to configure its route and timings now?</p>
                    
                    <div style="display: flex; gap: 1rem; justify-content: center;">
                        <button class="btn btn-outline-primary" style="padding: 0.75rem 1.5rem; border-radius: 8px;" onclick="window.adminApp.closeBusEditor(); window.adminApp.renderBuses();">Later</button>
                        <button class="btn btn-primary" style="padding: 0.75rem 1.5rem; border-radius: 8px;" onclick="window.adminApp.closeBusEditor(); window.adminApp.renderBusConfiguration('${savedBusId}');">Configure Route</button>
                    </div>
                </div>
            `;
            setTimeout(() => container.classList.add('show'), 10);
        }
    }
    
    // --- BUS CONFIGURATION HUB ---
    renderBusConfiguration(busId) {
        const bus = store.getBusById(busId);
        if (!bus) return;
        
        const routes = store.getAdminRoutes().filter(r => r.bus_id === busId);
        
        let routesHtml = '';
        if (routes.length === 0) {
            routesHtml = `
                <div style="text-align: center; padding: 3rem 1.5rem; background: var(--bg-page); border-radius: 8px; border: 1px dashed var(--border-color);">
                    <div style="color: var(--text-muted); margin-bottom: 1rem;">No routes configured yet. Add a route to make this bus searchable by commuters.</div>
                    <button class="btn btn-primary" onclick="window.adminApp.renderRouteCreationModal('${busId}')">+ Add Route</button>
                </div>
            `;
        } else {
            routesHtml = routes.map(route => {
                const routeStops = store.getRouteStops().filter(rs => rs.route_id === route.id);
                const trips = store.getAdminTrips().filter(t => t.route_id === route.id);
                const originStop = store.getStopById(route.origin_stop_id);
                const destStop = store.getStopById(route.destination_stop_id);
                
                return `
                    <div style="background: var(--bg-page); border: 1px solid var(--border-color); border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                            <div>
                                <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.25rem;">${originStop ? originStop.name : 'Unknown'} &rarr; ${destStop ? destStop.name : 'Unknown'}</h3>
                                <div style="color: var(--text-muted); font-size: 0.875rem;">${routeStops.length} stops &bull; ${trips.length} trips</div>
                            </div>
                            <div style="display: flex; gap: 0.5rem;">
                                <button class="btn" style="border: 1px solid var(--border-color); font-size: 0.875rem;" onclick="window.adminApp.openRouteStopsEditor('${route.id}')">Edit Stops</button>
                                <button class="btn" style="border: 1px solid var(--border-color); font-size: 0.875rem;" onclick="window.adminApp.renderTimingsConfigurationModal('${route.id}')">Manage Timings</button>
                            </div>
                        </div>
                        ${route.via_description ? `<div style="font-size: 0.875rem; color: var(--text-muted);"><strong>Via:</strong> ${route.via_description}</div>` : ''}
                    </div>
                `;
            }).join('');
            
            routesHtml += `
                <div style="margin-top: 1.5rem;">
                    <button class="btn btn-primary" style="font-size: 0.875rem;" onclick="window.adminApp.renderRouteCreationModal('${busId}')">+ Add Another Route</button>
                </div>
            `;
        }
        
        const html = `
            <div style="max-width: 800px; margin: 0 auto;">
                <div style="display: flex; align-items: center; margin-bottom: 2rem;">
                    <button class="btn" style="margin-right: 1rem; border: 1px solid var(--border-color); padding: 0.25rem 0.75rem;" onclick="window.adminApp.renderBuses()">&larr; Back</button>
                    <div>
                        <h2 style="font-size: 1.5rem; font-weight: 800; margin: 0;">${bus.name}</h2>
                        <div style="color: var(--text-muted); font-size: 0.875rem;">${bus.operator} &bull; ${bus.status.toUpperCase()}</div>
                    </div>
                </div>
                
                <div style="background: var(--bg-card); border-radius: 8px; box-shadow: var(--shadow-sm); padding: 2rem;">
                    <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-muted); margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">ROUTES</h3>
                    ${routesHtml}
                </div>
            </div>
        `;
        
        this.mainContent.innerHTML = html;
    }
    
    // --- ROUTE CREATION HUB ---
    renderRouteCreationModal(busId) {
        const bus = store.getBusById(busId);
        if (!bus) return;
        
        this.currentConfigureBusId = busId;
        this.currentRouteStops = []; // Array of stop objects
        
        const stops = store.getStops();
        let stopOptions = `<option value="">Select a stop...</option>`;
        stops.forEach(s => {
            stopOptions += `<option value="${s.id}">${s.name}</option>`;
        });
        
        const container = document.getElementById('admin-modal-container');
        const html = `
            <div style="max-width: 700px; width: 100%; margin: 0 auto; background: var(--bg-card); border-radius: 8px; box-shadow: 0 10px 25px -5px rgb(0 0 0 / 0.1); border: 1px solid var(--border-color); display: flex; flex-direction: column; max-height: 90vh;">
                <div style="padding: 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h2 style="font-size: 1.5rem; font-weight: 700; margin: 0;">Create Route</h2>
                        <div style="color: var(--primary); font-weight: 600; font-size: 0.875rem; margin-top: 0.25rem;">${bus.name}</div>
                    </div>
                    <button class="btn" onclick="window.adminApp.closeRouteCreationModal()" style="font-size: 1.5rem; line-height: 1; padding: 0.25rem 0.5rem;">&times;</button>
                </div>
                
                <div style="padding: 1.5rem; background: #f8fafc; overflow-y: auto; flex-grow: 1;">
                    <div id="route-creation-error" class="hidden" style="background: #fee2e2; color: #991b1b; padding: 1rem; border-radius: 4px; margin-bottom: 1rem; font-weight: 500; font-size: 0.875rem;"></div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem;">
                        <div>
                            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.875rem; color: #334155;">Origin</label>
                            <select id="route-creation-origin" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 4px; font-size: 1rem;" onchange="window.adminApp.updateRouteCreationStops()">
                                ${stopOptions}
                            </select>
                        </div>
                        <div>
                            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.875rem; color: #334155;">Destination</label>
                            <select id="route-creation-dest" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 4px; font-size: 1rem;" onchange="window.adminApp.updateRouteCreationStops()">
                                ${stopOptions}
                            </select>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 1.5rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                            <label style="font-weight: 600; font-size: 0.875rem; color: #334155; margin: 0;">Intermediate Stops</label>
                            <button class="btn" style="border: 1px dashed var(--primary); color: var(--primary); padding: 0.25rem 0.75rem; font-size: 0.75rem;" onclick="window.adminApp.addRouteCreationStop()">+ Add Stop</button>
                        </div>
                        
                        <div id="route-creation-stops-container" style="background: #fff; border: 1px solid var(--border-color); border-radius: 4px; padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem; min-height: 100px;">
                            <div style="text-align: center; color: var(--text-muted); font-size: 0.875rem; padding: 1rem;">Select origin and destination first.</div>
                        </div>
                    </div>
                    
                    <div>
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.875rem; color: #334155;">Automatically Generated Via</label>
                        <div id="route-creation-via" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 4px; font-size: 0.875rem; background: #e2e8f0; color: #475569; min-height: 2.5rem;">
                            (Will generate automatically)
                        </div>
                    </div>
                </div>
                
                <div style="padding: 1.5rem; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 1rem; background: #fff; border-radius: 0 0 8px 8px;">
                    <button class="btn" style="border: 1px solid var(--border-color); padding: 0.75rem 1.5rem; font-weight: 600;" onclick="window.adminApp.closeRouteCreationModal()">Cancel</button>
                    <button class="btn btn-primary" style="padding: 0.75rem 2rem; font-weight: 600;" onclick="window.adminApp.saveRouteCreation()">Save Route</button>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        container.classList.remove('hidden');
    }
    
    closeRouteCreationModal() {
        document.getElementById('admin-modal-container').classList.add('hidden');
        document.getElementById('admin-modal-container').innerHTML = '';
        this.currentConfigureBusId = null;
        this.currentRouteStops = [];
    }
    
    updateRouteCreationStops() {
        const originId = document.getElementById('route-creation-origin').value;
        const destId = document.getElementById('route-creation-dest').value;
        const container = document.getElementById('route-creation-stops-container');
        
        if (!originId || !destId) {
            container.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.875rem; padding: 1rem;">Select origin and destination first.</div>`;
            document.getElementById('route-creation-via').textContent = '(Will generate automatically)';
            return;
        }
        
        // Filter out origin/dest if they were added as intermediates
        this.currentRouteStops = this.currentRouteStops.filter(id => id !== originId && id !== destId);
        
        this.renderRouteCreationStopsList();
    }
    
    addRouteCreationStop() {
        const originId = document.getElementById('route-creation-origin').value;
        const destId = document.getElementById('route-creation-dest').value;
        if (!originId || !destId) {
            alert("Please select origin and destination first.");
            return;
        }
        
        this.currentRouteStops.push(""); // empty string represents unselected stop
        this.renderRouteCreationStopsList();
    }
    
    removeRouteCreationStop(index) {
        this.currentRouteStops.splice(index, 1);
        this.renderRouteCreationStopsList();
    }
    
    moveRouteCreationStop(index, direction) {
        if (direction === -1 && index > 0) {
            const temp = this.currentRouteStops[index];
            this.currentRouteStops[index] = this.currentRouteStops[index-1];
            this.currentRouteStops[index-1] = temp;
        } else if (direction === 1 && index < this.currentRouteStops.length - 1) {
            const temp = this.currentRouteStops[index];
            this.currentRouteStops[index] = this.currentRouteStops[index+1];
            this.currentRouteStops[index+1] = temp;
        }
        this.renderRouteCreationStopsList();
    }
    
    updateRouteCreationStopValue(index, val) {
        this.currentRouteStops[index] = val;
        this.updateRouteCreationVia();
    }
    
    renderRouteCreationStopsList() {
        const container = document.getElementById('route-creation-stops-container');
        const originId = document.getElementById('route-creation-origin').value;
        const destId = document.getElementById('route-creation-dest').value;
        
        const originStop = store.getStopById(originId);
        const destStop = store.getStopById(destId);
        const stops = store.getStops();
        
        let html = `
            <div style="padding: 0.5rem; background: #f1f5f9; border-radius: 4px; font-weight: 600; font-size: 0.875rem;">
                1. ${originStop ? originStop.name : 'Origin'}
            </div>
        `;
        
        this.currentRouteStops.forEach((stopId, idx) => {
            let options = `<option value="">Select a stop...</option>`;
            stops.forEach(s => {
                if (s.id !== originId && s.id !== destId) {
                    options += `<option value="${s.id}" ${stopId === s.id ? 'selected' : ''}>${s.name}</option>`;
                }
            });
            
            html += `
                <div style="display: flex; gap: 0.5rem; align-items: center; padding: 0.25rem 0;">
                    <span style="font-size: 0.875rem; font-weight: 600; width: 24px;">${idx + 2}.</span>
                    <select style="flex-grow: 1; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px;" onchange="window.adminApp.updateRouteCreationStopValue(${idx}, this.value)">
                        ${options}
                    </select>
                    <button class="btn" style="padding: 0.25rem 0.5rem; font-size: 0.875rem;" onclick="window.adminApp.moveRouteCreationStop(${idx}, -1)" ${idx===0?'disabled':''}>↑</button>
                    <button class="btn" style="padding: 0.25rem 0.5rem; font-size: 0.875rem;" onclick="window.adminApp.moveRouteCreationStop(${idx}, 1)" ${idx===this.currentRouteStops.length-1?'disabled':''}>↓</button>
                    <button class="btn" style="padding: 0.25rem 0.5rem; color: #b91c1c; font-size: 0.875rem;" onclick="window.adminApp.removeRouteCreationStop(${idx})">🗑</button>
                </div>
            `;
        });
        
        html += `
            <div style="padding: 0.5rem; background: #f1f5f9; border-radius: 4px; font-weight: 600; font-size: 0.875rem; margin-top: 0.5rem;">
                ${this.currentRouteStops.length + 2}. ${destStop ? destStop.name : 'Destination'}
            </div>
        `;
        
        container.innerHTML = html;
        this.updateRouteCreationVia();
    }
    
    updateRouteCreationVia() {
        const viaEl = document.getElementById('route-creation-via');
        const validIntermediates = this.currentRouteStops.filter(id => id !== "").map(id => store.getStopById(id)).filter(s => s);
        
        if (validIntermediates.length === 0) {
            viaEl.textContent = 'None';
            return;
        }
        
        const viaNames = validIntermediates.map(s => s.name);
        viaEl.textContent = viaNames.join(' • ');
    }
    
    async saveRouteCreation() {
        const originId = document.getElementById('route-creation-origin').value;
        const destId = document.getElementById('route-creation-dest').value;
        const err = document.getElementById('route-creation-error');
        
        if (!originId || !destId) {
            err.textContent = "Both origin and destination are required.";
            err.classList.remove('hidden');
            return;
        }
        if (originId === destId) {
            err.textContent = "Origin and destination cannot be the same.";
            err.classList.remove('hidden');
            return;
        }
        
        // Ensure no empty selections in intermediates
        if (this.currentRouteStops.includes("")) {
            err.textContent = "Please select a stop for all intermediate slots, or remove empty ones.";
            err.classList.remove('hidden');
            return;
        }
        
        // Ensure no duplicates
        const allStops = [originId, ...this.currentRouteStops, destId];
        const uniqueStops = new Set(allStops);
        if (uniqueStops.size !== allStops.length) {
            err.textContent = "Duplicate stops are not allowed in the same route.";
            err.classList.remove('hidden');
            return;
        }
        
        const viaDesc = document.getElementById('route-creation-via').textContent;
        const finalVia = viaDesc === 'None' ? '' : viaDesc;
        
        // Create the route
        const routeId = await store.addRoute(this.currentConfigureBusId, originId, destId, finalVia);
        
        // Create the route stops
        await store.addRouteStops(routeId, allStops);
        
        // Transition to Add Timings
        const container = document.getElementById('admin-modal-container');
        container.innerHTML = `
            <div style="max-width: 500px; margin: 0 auto; background: var(--bg-card); border-radius: 8px; box-shadow: 0 10px 25px -5px rgb(0 0 0 / 0.1); border: 1px solid var(--border-color); display: flex; flex-direction: column; text-align: center; padding: 2rem;">
                <div style="width: 64px; height: 64px; background: #dcfce7; color: #166534; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 1.5rem;">✓</div>
                <h2 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 0.5rem; color: var(--text-main);">Route created successfully</h2>
                <div style="font-size: 1.25rem; font-weight: 700; color: var(--primary); margin-bottom: 1rem;">${allStops.length} stops configured</div>
                
                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <button class="btn" style="border: 1px solid var(--border-color); padding: 0.75rem 1.5rem; font-weight: 600;" onclick="window.adminApp.closeRouteCreationModal(); window.adminApp.renderBusConfiguration('${this.currentConfigureBusId}');">Back to Bus</button>
                    <button class="btn btn-primary" style="padding: 0.75rem 1.5rem; font-weight: 600;" onclick="window.adminApp.closeRouteCreationModal(); window.adminApp.renderTimingsConfigurationModal('${routeId}');">Add Timings</button>
                </div>
            </div>
        `;
    }
    
    // --- TIMINGS CONFIGURATION HUB ---
    renderTimingsConfigurationModal(routeId) {
        const route = store.getRouteById(routeId);
        if (!route) return;
        
        const bus = store.getBusById(route.bus_id);
        const routeStops = store.getRouteStops().filter(rs => rs.route_id === route.id).sort((a,b)=>a.stop_order - b.stop_order);
        
        this.currentConfigureRouteId = routeId;
        this.currentTripsData = []; // Array of trip arrays. Each trip array has {stop_id, time}
        
        // Load existing trips if any
        const existingTrips = store.getAdminTrips().filter(t => t.route_id === routeId);
        if (existingTrips.length > 0) {
            existingTrips.forEach(trip => {
                const stopTimes = store.getStopTimes().filter(st => st.trip_id === trip.id);
                const tripData = routeStops.map(rs => {
                    const st = stopTimes.find(s => s.stop_id === rs.stop_id);
                    return { stop_id: rs.stop_id, time: st ? st.arrival_time : '' };
                });
                this.currentTripsData.push(tripData);
            });
        } else {
            // Start with one empty trip
            this.currentTripsData.push(routeStops.map(rs => ({ stop_id: rs.stop_id, time: '' })));
        }
        
        const container = document.getElementById('admin-modal-container');
        const html = `
            <div style="max-width: 800px; width: 100%; margin: 0 auto; background: var(--bg-card); border-radius: 8px; box-shadow: 0 10px 25px -5px rgb(0 0 0 / 0.1); border: 1px solid var(--border-color); display: flex; flex-direction: column; max-height: 90vh;">
                <div style="padding: 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h2 style="font-size: 1.5rem; font-weight: 700; margin: 0;">Manage Timings</h2>
                        <div style="color: var(--primary); font-weight: 600; font-size: 0.875rem; margin-top: 0.25rem;">${bus.name} &bull; ${store.getStopById(route.origin_stop_id).name} &rarr; ${store.getStopById(route.destination_stop_id).name}</div>
                    </div>
                    <button class="btn" onclick="window.adminApp.closeTimingsModal()" style="font-size: 1.5rem; line-height: 1; padding: 0.25rem 0.5rem;">&times;</button>
                </div>
                
                <div style="padding: 1.5rem; background: #f8fafc; overflow-y: auto; flex-grow: 1;">
                    <div id="timings-creation-error" class="hidden" style="background: #fee2e2; color: #991b1b; padding: 1rem; border-radius: 4px; margin-bottom: 1rem; font-weight: 500; font-size: 0.875rem;"></div>
                    <div id="timings-creation-warning" class="hidden" style="background: #fef3c7; color: #92400e; padding: 1rem; border-radius: 4px; margin-bottom: 1rem; font-weight: 500; font-size: 0.875rem;"></div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <label style="font-weight: 700; font-size: 1rem; color: #334155; margin: 0;">Trips & Departures</label>
                        <button class="btn" style="border: 1px dashed var(--primary); color: var(--primary); padding: 0.25rem 0.75rem; font-size: 0.875rem;" onclick="window.adminApp.addTimingsTrip()">+ Add Trip</button>
                    </div>
                    
                    <div id="timings-trips-container" style="display: flex; flex-direction: column; gap: 2rem;">
                        <!-- Rendered dynamically -->
                    </div>
                </div>
                
                <div style="padding: 1.5rem; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 1rem; background: #fff; border-radius: 0 0 8px 8px;">
                    <button class="btn" style="border: 1px solid var(--border-color); padding: 0.75rem 1.5rem; font-weight: 600;" onclick="window.adminApp.closeTimingsModal()">Cancel</button>
                    <button class="btn btn-primary" style="padding: 0.75rem 2rem; font-weight: 600;" onclick="window.adminApp.saveTimingsCreation()">Save Timetable</button>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        container.classList.remove('hidden');
        
        this.renderTimingsTripsList();
    }
    
    closeTimingsModal() {
        document.getElementById('admin-modal-container').classList.add('hidden');
        document.getElementById('admin-modal-container').innerHTML = '';
        this.currentConfigureRouteId = null;
        this.currentTripsData = null;
    }
    
    addTimingsTrip() {
        const routeId = this.currentConfigureRouteId;
        const routeStops = store.getRouteStops().filter(rs => rs.route_id === routeId).sort((a,b)=>a.stop_order - b.stop_order);
        this.currentTripsData.push(routeStops.map(rs => ({ stop_id: rs.stop_id, time: '' })));
        this.renderTimingsTripsList();
    }
    
    removeTimingsTrip(tripIndex) {
        if (this.currentTripsData.length <= 1) {
            alert("A route must have at least one trip.");
            return;
        }
        this.currentTripsData.splice(tripIndex, 1);
        this.renderTimingsTripsList();
    }
    
    updateTimingValue(tripIndex, stopIndex, val) {
        this.currentTripsData[tripIndex][stopIndex].time = val;
    }
    
    renderTimingsTripsList() {
        const container = document.getElementById('timings-trips-container');
        let html = '';
        
        this.currentTripsData.forEach((trip, tripIndex) => {
            let rowsHtml = '';
            trip.forEach((st, stopIndex) => {
                const stop = store.getStopById(st.stop_id);
                rowsHtml += `
                    <div style="display: grid; grid-template-columns: 1fr 120px; gap: 1rem; align-items: center; padding: 0.5rem; border-bottom: 1px solid var(--border-color);">
                        <div style="font-weight: 600; font-size: 0.875rem;">${stop ? stop.name : 'Unknown Stop'}</div>
                        <input type="time" value="${st.time}" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; font-family: monospace;" onchange="window.adminApp.updateTimingValue(${tripIndex}, ${stopIndex}, this.value)">
                    </div>
                `;
            });
            
            html += `
                <div style="background: #fff; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden;">
                    <div style="background: var(--bg-page); padding: 0.75rem 1rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                        <h4 style="margin: 0; font-size: 1rem; font-weight: 700;">Trip ${tripIndex + 1}</h4>
                        <button class="btn" style="color: #b91c1c; font-size: 0.75rem; padding: 0.25rem 0.5rem;" onclick="window.adminApp.removeTimingsTrip(${tripIndex})">Remove Trip</button>
                    </div>
                    <div style="padding: 1rem;">
                        ${rowsHtml}
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }
    
    async saveTimingsCreation() {
        const err = document.getElementById('timings-creation-error');
        const warn = document.getElementById('timings-creation-warning');
        err.classList.add('hidden');
        warn.classList.add('hidden');
        
        let hasValidationErrors = false;
        let validationWarnings = [];
        
        // Clean up data and run chronological validation
        const cleanedTrips = [];
        
        for (let i = 0; i < this.currentTripsData.length; i++) {
            const trip = this.currentTripsData[i];
            const stopTimes = [];
            let lastMinutes = -1;
            let missingTimes = false;
            
            for (let j = 0; j < trip.length; j++) {
                const time = trip[j].time;
                if (!time) {
                    missingTimes = true;
                    continue;
                }
                
                const [h, m] = time.split(':').map(Number);
                const totalMinutes = h * 60 + m;
                
                if (lastMinutes !== -1 && totalMinutes < lastMinutes) {
                    // Time went backward!
                    validationWarnings.push(`Trip ${i+1}: Stop ${j+1} time (${time}) is earlier than the previous stop. Are you sure?`);
                }
                lastMinutes = totalMinutes;
                
                stopTimes.push({ stop_id: trip[j].stop_id, time });
            }
            
            if (missingTimes && stopTimes.length === 0) {
                // Entire trip empty
                continue; 
            } else if (missingTimes) {
                hasValidationErrors = true;
                err.textContent = `Trip ${i+1} has missing times. Please complete all times or leave the entire trip empty to skip it.`;
                err.classList.remove('hidden');
                return;
            }
            
            cleanedTrips.push(stopTimes);
        }
        
        if (cleanedTrips.length === 0) {
            err.textContent = "You must configure at least one trip with valid times.";
            err.classList.remove('hidden');
            return;
        }
        
        // If there are warnings and they haven't been shown yet, show them and pause saving
        if (validationWarnings.length > 0 && !this.warningsAcknowledged) {
            warn.innerHTML = "<strong>Chronological Warning:</strong><br>" + validationWarnings.join('<br>') + "<br><br>Click 'Save Timetable' again to confirm and ignore this warning.";
            warn.classList.remove('hidden');
            this.warningsAcknowledged = true;
            return;
        }
        
        this.warningsAcknowledged = false;
        
        // Perform saving by removing old trips and adding new ones
        const routeId = this.currentConfigureRouteId;
        const existingTrips = store.getAdminTrips().filter(t => t.route_id === routeId);
        const existingTripIds = existingTrips.map(t => t.id);
        
        await store.resetTripsForRoute(routeId);
        
        // Add new data
        for (const stopTimesData of cleanedTrips) {
            const tripId = await store.addTrip(routeId);
            await store.addStopTimes(tripId, stopTimesData);
        }
        
        const route = store.getRouteById(routeId);
        const busId = route.bus_id;
        
        // Success and return to Bus Hub
        this.closeTimingsModal();
        
        const toast = document.createElement('div');
        toast.style.cssText = "position:fixed; bottom:20px; right:20px; background:#166534; color:#fff; padding:1rem 2rem; border-radius:8px; font-weight:600; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); z-index:100;";
        toast.innerHTML = `✓ Timetable saved successfully (${cleanedTrips.length} trips)`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
        
        this.renderBusConfiguration(busId);
    }
    
    // --- DELETE BUS ---
    openDeleteBusModal(busId) {
        const bus = store.getBusById(busId);
        if (!bus) return;
        
        this.currentDeleteBusId = busId;
        const container = document.getElementById('admin-modal-container');
        const counts = store.getBusRelatedDataCounts(busId);
        
        const hasData = counts.routes > 0 || counts.trips > 0;
        
        let contentHtml = '';
        if (hasData) {
            contentHtml = `
                <div style="background: #fef2f2; border: 1px solid #fca5a5; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
                    <h3 style="color: #b91c1c; font-weight: 700; margin-bottom: 0.5rem;">⚠ This bus has associated data</h3>
                    <p style="color: #991b1b; font-size: 0.9rem; margin-bottom: 1rem;">For safety, deleting this bus will also permanently remove its routes and schedules.</p>
                    <ul style="color: #7f1d1d; font-weight: 600; font-size: 0.9rem; margin-bottom: 1.5rem; padding-left: 1.5rem;">
                        <li>Routes: ${counts.routes}</li>
                        <li>Trips: ${counts.trips}</li>
                        <li>Timetable Entries: ${counts.stopTimes}</li>
                    </ul>
                    
                    <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.875rem; color: #7f1d1d;">Type <strong style="user-select: all;">${bus.name}</strong> to confirm deletion</label>
                    <input type="text" id="delete-bus-confirm-input" placeholder="${bus.name}" style="width: 100%; padding: 0.75rem; border: 1px solid #fca5a5; border-radius: 4px; font-size: 1rem;" oninput="window.adminApp.validateDeleteBusInput('${bus.name.replace(/'/g, "\\'")}')">
                </div>
            `;
        } else {
            contentHtml = `
                <div style="background: #f8fafc; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; text-align: center;">
                    <p style="color: #475569; font-size: 1rem; margin-bottom: 0.5rem;"><strong>${bus.name}</strong> has no routes or timetable data associated with it.</p>
                    <p style="color: #64748b; font-size: 0.875rem;">Are you sure you want to delete it?</p>
                </div>
            `;
        }

        const html = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2 class="modal-title" style="color: #b91c1c;">Delete Bus?</h2>
                    <button class="modal-close-btn" onclick="window.adminApp.closeDeleteBusModal()">
                        <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                
                <div class="modal-body">
                    ${contentHtml}
                </div>
                
                <div class="modal-footer" style="background: var(--bg-page);">
                    <button class="btn btn-outline-primary" style="padding: 0.75rem 1.5rem; border-radius: 8px;" onclick="window.adminApp.closeDeleteBusModal()" id="delete-bus-cancel-btn">Cancel</button>
                    <button id="delete-bus-confirm-btn" class="btn" style="padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; background: #b91c1c; color: #fff; border: 1px solid #991b1b; ${hasData ? 'opacity: 0.5; cursor: not-allowed;' : ''}" ${hasData ? 'disabled' : ''} onclick="window.adminApp.executeDeleteBus(${hasData})">${hasData ? 'Delete Everything' : 'Delete Bus'}</button>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        container.classList.remove('hidden');
        setTimeout(() => container.classList.add('show'), 10);
        
        if (hasData) {
            setTimeout(() => document.getElementById('delete-bus-confirm-input').focus(), 50);
        }
    }
    
    validateDeleteBusInput(expectedName) {
        const input = document.getElementById('delete-bus-confirm-input').value;
        const btn = document.getElementById('delete-bus-confirm-btn');
        if (input === expectedName) {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        } else {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        }
    }
    
    closeDeleteBusModal() {
        const container = document.getElementById('admin-modal-container');
        container.classList.remove('show');
        setTimeout(() => {
            container.classList.add('hidden');
            container.innerHTML = '';
        }, 300);
        this.currentDeleteBusId = null;
    }
    
    async executeDeleteBus(hasData) {
        const busId = this.currentDeleteBusId;
        const bus = store.getBusById(busId);
        if (!bus) return;
        
        // Loading State
        const btn = document.getElementById('delete-bus-confirm-btn');
        const cancelBtn = document.getElementById('delete-bus-cancel-btn');
        btn.textContent = 'Deleting...';
        btn.disabled = true;
        btn.style.opacity = '0.7';
        cancelBtn.disabled = true;
        
        const input = document.getElementById('delete-bus-confirm-input');
        if (input) input.disabled = true;
        
        // Emulate network delay
        setTimeout(async () => {
            try {
                await store.deleteBus(busId);
                
                if (hasData) {
                    window.toast('Bus and its associated data were deleted successfully', 'success');
                } else {
                    window.toast('Bus deleted successfully', 'success');
                }
                
                this.closeDeleteBusModal();
                this.renderBuses();
            } catch (err) {
                console.error('Delete bus error:', err);
                btn.textContent = 'Error';
                btn.style.background = '#991b1b';
                
                const errorToast = document.createElement('div');
                errorToast.style.cssText = "position:fixed; bottom:20px; right:20px; background:#991b1b; color:#fff; padding:1rem 2rem; border-radius:8px; font-weight:600; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); z-index:100;";
                errorToast.innerHTML = `❌ Unable to delete this bus. Please try again.<br><span style="font-size:0.875rem; font-weight:400;">${err.message || ''}</span>`;
                document.body.appendChild(errorToast);
                setTimeout(() => errorToast.remove(), 4000);
                
                setTimeout(() => {
                    this.closeDeleteBusModal();
                }, 1000);
            }
        }, 400);
    }

    // --- TIMINGS ---

    renderTimings(searchQuery = '') {
        const trips = store.getAdminTrips();
        // We will group trips by Route ID for a cleaner matrix view, 
        // similar to how the routes are displayed.
        const routesMap = new Map();
        
        trips.forEach(trip => {
            if (!routesMap.has(trip.route_id)) {
                routesMap.set(trip.route_id, []);
            }
            routesMap.get(trip.route_id).push(trip);
        });

        const routesList = Array.from(routesMap.keys()).map(rid => store.getRouteById(rid)).filter(r => r);
        
        const filteredRoutes = searchQuery
            ? routesList.filter(r => {
                const bus = store.getBusById(r.bus_id);
                const busName = bus ? bus.name.toLowerCase() : '';
                const origin = store.getStopById(r.origin_stop_id);
                const dest = store.getStopById(r.destination_stop_id);
                const routeName = `${origin ? origin.name.toLowerCase() : ''} to ${dest ? dest.name.toLowerCase() : ''}`;
                return busName.includes(searchQuery.toLowerCase()) || routeName.includes(searchQuery.toLowerCase());
            })
            : routesList;
            
        let rowsHtml = '';

        filteredRoutes.forEach(route => {
            const bus = store.getBusById(route.bus_id);
            const routeTrips = routesMap.get(route.id) || [];
            
            rowsHtml += `
                <div class="dashboard-card" style="display: flex; flex-direction: column; padding: 1.5rem; gap: 1rem; margin-bottom: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <div style="font-weight: 800; font-size: 1.25rem; color: var(--text-main); margin-bottom: 0.25rem;">${bus ? bus.name : 'Unknown Bus'}</div>
                            <div style="color: var(--text-muted); font-size: 0.875rem;">${store.getStopById(route.origin_stop_id)?.name} &rarr; ${store.getStopById(route.destination_stop_id)?.name}</div>
                            <div style="margin-top: 0.5rem; font-size: 0.875rem; font-weight: 600; color: var(--primary); background: var(--bg-page); display: inline-block; padding: 0.25rem 0.5rem; border-radius: 4px;">${routeTrips.length} active trips</div>
                        </div>
                        <button class="btn btn-outline-primary edit-timings-btn" data-route="${route.id}" style="padding: 0.5rem 1rem; border-radius: 6px; font-size: 0.875rem;" onclick="window.adminApp.renderTimingsConfigurationModal('${route.id}')">
                            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="vertical-align: text-bottom; margin-right: 4px;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Manage Timings
                        </button>
                    </div>
                </div>
            `;
        });
        
        if (filteredRoutes.length === 0) {
            rowsHtml = `
                <div class="empty-state">
                    <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <div class="empty-state-title">No timings found</div>
                    <div class="empty-state-desc">You haven't configured any schedules yet. Go to Bus Management to configure routes and timings.</div>
                </div>
            `;
        }

        const html = `
            <div style="max-width: 1000px; margin: 0 auto; padding-bottom: 3rem;" id="timings-list-view">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                    <h2 style="font-size: 1.75rem; font-weight: 800; margin: 0; color: var(--text-main); letter-spacing: -0.02em;">Timing Management</h2>
                </div>
                
                <div style="margin-bottom: 2rem;">
                    <div style="position: relative; max-width: 400px;">
                        <svg style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--text-muted); width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" stroke-width="2"></circle><line x1="21" y1="21" x2="16.65" y2="16.65" stroke-width="2"></line></svg>
                        <input type="text" id="admin-timing-search" placeholder="Search timings by bus or route..." value="${searchQuery}" class="form-control" style="padding-left: 2.75rem;">
                    </div>
                </div>
                
                <div>
                    ${rowsHtml}
                </div>
            </div>
            <div id="timings-editor-view"></div>
        `;
        this.mainContent.innerHTML = html;
        
        const searchInput = document.getElementById('admin-timing-search');
        if (searchInput) {
            searchInput.focus();
            const val = searchInput.value;
            searchInput.value = '';
            searchInput.value = val;
            
            searchInput.addEventListener('input', (e) => {
                this.renderTimings(e.target.value);
            });
        }
    }

    renderTimingEditor(tripId) {
        const trip = store.getAdminTrips().find(t => t.id === tripId);
        const route = store.getRouteById(trip.route_id);
        const bus = store.getBusById(route.bus_id);

        const routeStops = store.getRouteStops()
            .filter(rs => rs.route_id === route.id)
            .sort((a, b) => a.stop_order - b.stop_order);

        let stopsTimingsHtml = '';
        routeStops.forEach(rs => {
            const stop = store.getStopById(rs.stop_id);
            const timing = store.getStopTimes().find(st => st.trip_id === trip.id && st.stop_id === stop.id);
            const timeStr = timing ? timing.arrival_time : '';

            stopsTimingsHtml += `
                <div class="timing-row" style="display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem; border-bottom: 1px solid var(--border-color);">
                    <div style="font-weight: 600; color: var(--text-main);">${stop.name}</div>
                    <input type="time" class="timing-input form-control" data-trip="${trip.id}" data-stop="${stop.id}" value="${timeStr}" style="width: auto; font-family: monospace; font-size: 1rem;">
                </div>
            `;
        });

        const html = `
            <div style="max-width: 600px; margin: 0 auto; padding-bottom: 3rem;">
                <div style="margin-bottom: 2rem; display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <button onclick="window.location.hash='#timings'; setTimeout(()=>window.adminApp.renderTimings(), 10);" class="btn btn-outline-primary" style="padding: 0.5rem 1rem; border-radius: 6px;">← Back</button>
                        <div>
                            <h2 style="font-size: 1.5rem; font-weight: 800; margin: 0; color: var(--text-main);">Edit Timings: ${bus.name}</h2>
                            <div style="font-size: 0.875rem; color: var(--text-muted); font-weight: 500;">${store.getStopById(route.origin_stop_id).name} &rarr; ${store.getStopById(route.destination_stop_id).name}</div>
                        </div>
                    </div>
                    <button id="save-timings-btn" class="btn btn-primary" style="padding: 0.75rem 1.5rem; border-radius: 8px;">Save Changes</button>
                </div>
                
                <div class="dashboard-card" style="padding: 0; overflow: hidden;">
                    <div style="padding: 1rem 1.5rem; background: var(--bg-page); border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">
                        <div>Stop Name</div>
                        <div>Arrival / Departure Time</div>
                    </div>
                    ${stopsTimingsHtml}
                </div>
            </div>
        `;
        
        document.getElementById('timings-list-view').style.display = 'none';
        const editorView = document.getElementById('timings-editor-view');
        editorView.innerHTML = html;
        editorView.style.display = 'block';

        const saveBtn = document.getElementById('save-timings-btn');
        saveBtn.addEventListener('click', async () => {
            saveBtn.disabled = true;
            const originalText = saveBtn.innerText;
            saveBtn.innerText = 'SAVING...';
            try {
                const inputs = document.querySelectorAll('.timing-input');
                const promises = [];
                for (const input of inputs) {
                    const tId = input.getAttribute('data-trip');
                    const sId = input.getAttribute('data-stop');
                    const newTime = input.value;
                    if (newTime) {
                        promises.push(store.updateStopTime(tId, sId, newTime));
                    }
                }
                await Promise.all(promises);
                window.toast('Timings saved successfully', 'success');
                setTimeout(() => {
                    saveBtn.innerText = 'Save Changes';
                    saveBtn.disabled = false;
                }, 1000);
            } catch (err) {
                saveBtn.disabled = false;
                saveBtn.innerText = originalText;
            }
        });
    }

    // --- ROUTE STOPS EDITOR ---

    openRouteStopsEditor(routeId) {
        this.currentEditRouteId = routeId;
        const routeStops = store.getRouteStops().filter(rs => rs.route_id === routeId).sort((a,b) => a.stop_order - b.stop_order);
        this.currentEditStopIds = routeStops.map(rs => rs.stop_id);
        this.renderRouteStopsEditor();
    }

    renderRouteStopsEditor(innerScroll = 0, outerScroll = 0) {
        const container = document.getElementById('admin-modal-container');
        const route = store.getRouteById(this.currentEditRouteId);
        const bus = store.getBusById(route.bus_id);
        
        let stopsHtml = '';
        this.currentEditStopIds.forEach((stopId, index) => {
            const stop = store.getStopById(stopId);
            const isFirst = index === 0;
            const isLast = index === this.currentEditStopIds.length - 1;
            
            // Render each stop as a movable block
            stopsHtml += `
                <div id="route-stop-row-${index}" class="route-stop-row" style="display: flex; align-items: center; justify-content: space-between; padding: 1rem; border: 1px solid var(--border-color); border-radius: 4px; margin-bottom: 0.5rem; background: #fff;">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <div style="font-weight: 700; color: var(--primary); width: 24px; text-align: center;">${index + 1}</div>
                        <div style="font-weight: 600; font-size: 1.1rem;">${stop.name}</div>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn" style="padding: 0.25rem 0.75rem; font-size: 1.25rem; line-height: 1; border: 1px solid var(--border-color); ${isFirst ? 'opacity: 0.3; cursor: not-allowed;' : ''}" ${isFirst ? 'disabled' : `onclick="window.adminApp.moveStopUp(${index})"`}>↑</button>
                        <button class="btn" style="padding: 0.25rem 0.75rem; font-size: 1.25rem; line-height: 1; border: 1px solid var(--border-color); ${isLast ? 'opacity: 0.3; cursor: not-allowed;' : ''}" ${isLast ? 'disabled' : `onclick="window.adminApp.moveStopDown(${index})"`}>↓</button>
                        <button class="btn" style="padding: 0.25rem 0.75rem; color: #b91c1c; border: 1px solid #fca5a5; font-size: 1.25rem; line-height: 1; margin-left: 0.5rem; background: #fef2f2;" onclick="window.adminApp.removeStop(${index})">🗑</button>
                    </div>
                </div>
            `;
        });

        const allStops = store.getStops().sort((a,b) => a.name.localeCompare(b.name));
        let stopOptionsHtml = '<option value="">Search existing stops...</option>';
        allStops.forEach(s => {
            if (!this.currentEditStopIds.includes(s.id)) {
                stopOptionsHtml += `<option value="${s.id}">${s.name} ${s.area ? `(${s.area})` : ''}</option>`;
            }
        });

        const html = `
            <div style="max-width: 600px; margin: 0 auto; background: var(--bg-card); border-radius: 8px; box-shadow: 0 10px 25px -5px rgb(0 0 0 / 0.1); border: 1px solid var(--border-color); display: flex; flex-direction: column; max-height: 90vh;">
                <div style="padding: 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h2 style="font-size: 1.5rem; font-weight: 700; margin: 0;">Edit Route Stops</h2>
                        <div style="color: var(--text-muted); font-size: 1rem; margin-top: 0.25rem; font-weight: 500;">${bus.name}</div>
                    </div>
                    <button class="btn" onclick="window.adminApp.closeRouteStopsEditor()" style="font-size: 1.5rem; line-height: 1; padding: 0.25rem 0.5rem;">&times;</button>
                </div>
                
                <div id="route-stops-scroll-area" style="padding: 1.5rem; overflow-y: auto; flex: 1; background: #f8fafc;">
                    <div id="route-editor-error" class="hidden" style="background: #fee2e2; color: #991b1b; padding: 1rem; border-radius: 4px; margin-bottom: 1rem; font-weight: 500; font-size: 0.875rem;"></div>
                    
                    <div style="margin-bottom: 1.5rem;">
                        ${stopsHtml}
                    </div>
                    
                    <div style="background: #fff; padding: 1.5rem; border-radius: 8px; border: 1px dashed #cbd5e1;">
                        <div style="font-weight: 700; font-size: 1rem; margin-bottom: 0.75rem; color: #334155;">+ Add Stop</div>
                        <div style="display: flex; gap: 0.5rem;">
                            <select id="add-stop-select" style="flex: 1; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 4px; font-size: 1rem;">
                                ${stopOptionsHtml}
                            </select>
                            <button class="btn btn-primary" style="padding: 0 1.5rem;" onclick="window.adminApp.addStop()">Add</button>
                        </div>
                    </div>
                </div>
                
                <div style="padding: 1.5rem; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 1rem; background: #fff; border-radius: 0 0 8px 8px;">
                    <button class="btn" style="border: 1px solid var(--border-color); padding: 0.75rem 1.5rem; font-weight: 600;" onclick="window.adminApp.closeRouteStopsEditor()">Cancel</button>
                    <button class="btn btn-primary" style="padding: 0.75rem 2rem; font-weight: 600;" onclick="window.adminApp.saveRouteStops()">Save Changes</button>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        container.classList.remove('hidden');
        
        if (outerScroll > 0) container.scrollTop = outerScroll;
        const scrollArea = document.getElementById('route-stops-scroll-area');
        if (scrollArea && innerScroll > 0) scrollArea.scrollTop = innerScroll;
    }

    closeRouteStopsEditor() {
        const originalRouteStops = store.getRouteStops().filter(rs => rs.route_id === this.currentEditRouteId).sort((a,b) => a.stop_order - b.stop_order);
        const originalIds = originalRouteStops.map(rs => rs.stop_id);
        
        if (JSON.stringify(originalIds) !== JSON.stringify(this.currentEditStopIds)) {
            if (!confirm('You have unsaved changes. Leave anyway?')) {
                return;
            }
        }
        
        document.getElementById('admin-modal-container').classList.add('hidden');
        document.getElementById('admin-modal-container').innerHTML = '';
        this.currentEditRouteId = null;
        this.currentEditStopIds = null;
    }
    
    moveStopUp(index) {
        if (index > 0) {
            const scrollArea = document.getElementById('route-stops-scroll-area');
            const innerScroll = scrollArea ? scrollArea.scrollTop : 0;
            const outerScroll = document.getElementById('admin-modal-container').scrollTop;
            
            const temp = this.currentEditStopIds[index - 1];
            this.currentEditStopIds[index - 1] = this.currentEditStopIds[index];
            this.currentEditStopIds[index] = temp;
            this.renderRouteStopsEditor(innerScroll, outerScroll);
            
            // Trigger animation on the newly rendered elements
            const itemMovingUp = document.getElementById(`route-stop-row-${index - 1}`);
            const itemMovingDown = document.getElementById(`route-stop-row-${index}`);
            if (itemMovingUp) itemMovingUp.classList.add('route-stop-moving-up');
            if (itemMovingDown) itemMovingDown.classList.add('route-stop-moving-down');
        }
    }
    
    moveStopDown(index) {
        if (index < this.currentEditStopIds.length - 1) {
            const scrollArea = document.getElementById('route-stops-scroll-area');
            const innerScroll = scrollArea ? scrollArea.scrollTop : 0;
            const outerScroll = document.getElementById('admin-modal-container').scrollTop;
            
            const temp = this.currentEditStopIds[index + 1];
            this.currentEditStopIds[index + 1] = this.currentEditStopIds[index];
            this.currentEditStopIds[index] = temp;
            this.renderRouteStopsEditor(innerScroll, outerScroll);
            
            // Trigger animation on the newly rendered elements
            const itemMovingDown = document.getElementById(`route-stop-row-${index + 1}`);
            const itemMovingUp = document.getElementById(`route-stop-row-${index}`);
            if (itemMovingDown) itemMovingDown.classList.add('route-stop-moving-down');
            if (itemMovingUp) itemMovingUp.classList.add('route-stop-moving-up');
        }
    }
    
    removeStop(index) {
        const stopId = this.currentEditStopIds[index];
        const stopName = store.getStopById(stopId).name;
        if (confirm(`Remove ${stopName} from this route?`)) {
            const scrollArea = document.getElementById('route-stops-scroll-area');
            const innerScroll = scrollArea ? scrollArea.scrollTop : 0;
            const outerScroll = document.getElementById('admin-modal-container').scrollTop;
            
            this.currentEditStopIds.splice(index, 1);
            this.renderRouteStopsEditor(innerScroll, outerScroll);
        }
    }
    
    addStop() {
        const select = document.getElementById('add-stop-select');
        const stopId = select.value;
        if (!stopId) return;
        
        if (this.currentEditStopIds.includes(stopId)) {
            const err = document.getElementById('route-editor-error');
            const stopName = store.getStopById(stopId).name;
            err.textContent = `${stopName} is already included in this route.`;
            err.classList.remove('hidden');
            return;
        }
        
        const scrollArea = document.getElementById('route-stops-scroll-area');
        const innerScroll = scrollArea ? scrollArea.scrollTop : 0;
        const outerScroll = document.getElementById('admin-modal-container').scrollTop;
        
        this.currentEditStopIds.push(stopId);
        this.renderRouteStopsEditor(innerScroll, outerScroll);
        
        // Scroll to the bottom of the inner scroll area to show the new stop
        setTimeout(() => {
            const newScrollArea = document.getElementById('route-stops-scroll-area');
            if (newScrollArea) {
                newScrollArea.scrollTop = newScrollArea.scrollHeight;
            }
        }, 10);
    }
    
    async saveRouteStops() {
        const err = document.getElementById('route-editor-error');
        if (this.currentEditStopIds.length < 2) {
            err.textContent = "Route must contain at least two stops.";
            err.classList.remove('hidden');
            return;
        }
        
        await store.updateRouteStops(this.currentEditRouteId, this.currentEditStopIds);
        
        // Show success notification instead of alert() using a toast-style container if available,
        // but since we shouldn't use alert() for normal ops per prompt, we'll use a styled confirm/alert combo or custom toast.
        // Prompt says "Do NOT use JavaScript alert() for normal editing operations."
        // We will create a toast overlay dynamically.
        
        const toast = document.createElement('div');
        toast.style.cssText = "position:fixed; bottom:20px; right:20px; background:#166534; color:#fff; padding:1rem 2rem; border-radius:8px; font-weight:600; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); z-index:100;";
        toast.innerHTML = `✓ Route updated successfully<br><span style="font-size:0.875rem; font-weight:400;">${this.currentEditStopIds.length} stops are now configured.</span>`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
        
        this.currentEditRouteId = null;
        this.currentEditStopIds = null;
        document.getElementById('admin-modal-container').classList.add('hidden');
        document.getElementById('admin-modal-container').innerHTML = '';
        
        this.renderRoutes();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.adminApp = new AdminApp();
});

// --- TOAST NOTIFICATION SYSTEM ---
window.toast = function(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = "toast " + type;
    
    let icon = '';
    if (type === 'success') icon = '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
    else if (type === 'error') icon = '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
    else icon = '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    
    let title = type === 'success' ? 'Success' : (type === 'error' ? 'Error' : 'Notice');
    
    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;
    
    container.appendChild(toast);
    
    // Animate in
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Auto remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
};
 
