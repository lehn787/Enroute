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
                } else if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
                    if (event === 'SIGNED_OUT') this._isRecovery = false;
                    this.route();
                }
            });
        }
        
        this.route();
    }

    async route() {
        if (this._isRouting) return;
        this._isRouting = true;
        try {
            let hash = window.location.hash || '#dashboard';
        
        let session = null;
        if (window.authService) {
            session = await window.authService.getSession();
        }

        // Auth guard
        if (!session) {
            this.appContainer.classList.add('hidden');
            this.authContainer.classList.remove('hidden');
            
            if (hash === '#signup') {
                this.renderSignup();
            } else if (hash === '#forgot-password') {
                this.renderForgotPassword();
            } else if (hash.startsWith('#reset-password') || hash.includes('access_token=')) {
                // If they have no session but are trying to reset password, the link is expired/used.
                this.renderResetExpired();
            } else {
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
            <div class="card" style="width: 100%; max-width: 400px; padding: 2rem; background: var(--bg-card); border-radius: var(--border-radius); box-shadow: var(--shadow-md);">
                <div style="text-align: center; margin-bottom: 2rem;">
                    <h2 style="color: var(--primary); font-weight: 800; font-size: 1.5rem; margin-bottom: 0.5rem;">EnRoute Admin</h2>
                    <p style="color: var(--text-muted); font-size: 0.875rem;">Manage Kochi's bus routes, stops and schedules.</p>
                </div>
                <div id="auth-error" class="hidden" style="background: #fee2e2; color: #b91c1c; padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; font-size: 0.875rem;"></div>
                <form id="login-form">
                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-main);">Email</label>
                        <input type="email" id="login-email" required style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 4px;">
                    </div>
                    <div class="form-group" style="margin-bottom: 1.5rem;">
                        <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-main);">Password</label>
                        <input type="password" id="login-password" required style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 4px;">
                    </div>
                    <button type="submit" id="login-btn" class="btn btn-primary" style="width: 100%; margin-bottom: 1rem;">SIGN IN</button>
                </form>
                <div style="text-align: center; font-size: 0.875rem;">
                    <span style="color: var(--text-muted);">Don't have an admin account?</span>
                    <a href="#signup" style="color: var(--primary); font-weight: 600; text-decoration: none; margin-left: 0.5rem;">Create Admin Account</a>
                </div>
                <div style="text-align: center; font-size: 0.875rem; margin-top: 1rem;">
                    <a href="#forgot-password" style="color: var(--text-muted); text-decoration: none;">Forgot password?</a>
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
                errDiv.textContent = error.message;
                errDiv.classList.remove('hidden');
                btn.textContent = 'SIGN IN';
                btn.disabled = false;
            } else {
                window.location.hash = '#dashboard';
            }
        });
    }

    renderSignup() {
        const html = `
            <div class="card" style="width: 100%; max-width: 400px; padding: 2rem; background: var(--bg-card); border-radius: var(--border-radius); box-shadow: var(--shadow-md);">
                <div style="text-align: center; margin-bottom: 2rem;">
                    <h2 style="color: var(--primary); font-weight: 800; font-size: 1.5rem; margin-bottom: 0.5rem;">Create Admin Account</h2>
                    <p style="color: var(--text-muted); font-size: 0.875rem;">Join the EnRoute management team.</p>
                </div>
                <div id="auth-error" class="hidden" style="background: #fee2e2; color: #b91c1c; padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; font-size: 0.875rem;"></div>
                <form id="signup-form">
                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-main);">Full Name</label>
                        <input type="text" id="signup-name" required style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 4px;">
                    </div>
                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-main);">Email</label>
                        <input type="email" id="signup-email" required style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 4px;">
                    </div>
                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-main);">Password</label>
                        <input type="password" id="signup-password" required minlength="8" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 4px;">
                    </div>
                    <div class="form-group" style="margin-bottom: 1.5rem;">
                        <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-main);">Confirm Password</label>
                        <input type="password" id="signup-confirm" required minlength="8" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 4px;">
                    </div>
                    <button type="submit" id="signup-btn" class="btn btn-primary" style="width: 100%; margin-bottom: 1rem;">CREATE ADMIN ACCOUNT</button>
                </form>
                <div style="text-align: center; font-size: 0.875rem;">
                    <span style="color: var(--text-muted);">Already have an account?</span>
                    <a href="#login" style="color: var(--primary); font-weight: 600; text-decoration: none; margin-left: 0.5rem;">Sign In</a>
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
                errDiv.textContent = 'Passwords do not match.';
                errDiv.classList.remove('hidden');
                return;
            }

            btn.textContent = 'CREATING...';
            btn.disabled = true;

            const { data, error } = await window.authService.signUp(email, password, name);
            
            if (error) {
                errDiv.textContent = error.message;
                errDiv.classList.remove('hidden');
                btn.textContent = 'CREATE ADMIN ACCOUNT';
                btn.disabled = false;
            } else {
                window.location.hash = '#dashboard';
            }
        });
    }

    renderForgotPassword() {
        const html = `
            <div class="card" style="width: 100%; max-width: 400px; padding: 2rem; background: var(--bg-card); border-radius: var(--border-radius); box-shadow: var(--shadow-md);">
                <div id="forgot-form-container">
                    <div style="text-align: center; margin-bottom: 2rem;">
                        <h2 style="color: var(--primary); font-weight: 800; font-size: 1.5rem; margin-bottom: 0.5rem;">EnRoute Admin</h2>
                        <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.5rem;">Reset your password</h3>
                        <p style="color: var(--text-muted); font-size: 0.875rem;">Enter the email address associated with your admin account and we'll send you a password reset link.</p>
                    </div>
                    <div id="auth-error" class="hidden" style="background: #fee2e2; color: #b91c1c; padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; font-size: 0.875rem;"></div>
                    <form id="forgot-form">
                        <div class="form-group" style="margin-bottom: 1.5rem;">
                            <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-main);">Email</label>
                            <input type="email" id="forgot-email" required style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 4px;">
                        </div>
                        <button type="submit" id="forgot-btn" class="btn btn-primary" style="width: 100%; margin-bottom: 1.5rem;">SEND RESET LINK</button>
                    </form>
                    <div style="text-align: center; font-size: 0.875rem;">
                        <span style="color: var(--text-muted);">Remember your password?</span>
                        <a href="#login" style="color: var(--primary); font-weight: 600; text-decoration: none; margin-left: 0.5rem;">Back to Sign In</a>
                    </div>
                </div>
                <div id="forgot-success-container" class="hidden" style="text-align: center;">
                    <div style="width: 64px; height: 64px; background: #dcfce7; color: #166534; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 1.5rem;">✓</div>
                    <h2 style="font-weight: 800; font-size: 1.5rem; margin-bottom: 0.5rem;">Check your email</h2>
                    <p style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 1rem;">If an account exists for this email address, we've sent you a password reset link.</p>
                    <p id="forgot-success-email" style="font-weight: 600; font-size: 0.95rem; margin-bottom: 2rem;"></p>
                    <a href="#login" class="btn" style="width: 100%; border: 1px solid var(--border-color); margin-bottom: 1.5rem;">BACK TO SIGN IN</a>
                    <div style="font-size: 0.875rem;">
                        <span style="color: var(--text-muted);">Didn't receive the email?</span>
                        <a href="#forgot-password" onclick="document.getElementById('forgot-success-container').classList.add('hidden'); document.getElementById('forgot-form-container').classList.remove('hidden'); return false;" style="color: var(--primary); font-weight: 600; text-decoration: none; margin-left: 0.5rem;">Try Again</a>
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
                errDiv.textContent = error.message;
                errDiv.classList.remove('hidden');
                btn.textContent = 'SEND RESET LINK';
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
            <div class="card" style="width: 100%; max-width: 400px; padding: 2rem; background: var(--bg-card); border-radius: var(--border-radius); box-shadow: var(--shadow-md);">
                <div id="reset-form-container">
                    <div style="text-align: center; margin-bottom: 2rem;">
                        <h2 style="color: var(--primary); font-weight: 800; font-size: 1.5rem; margin-bottom: 0.5rem;">EnRoute Admin</h2>
                        <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.5rem;">Create a new password</h3>
                        <p style="color: var(--text-muted); font-size: 0.875rem;">Enter a new password for your admin account.</p>
                    </div>
                    <div id="auth-error" class="hidden" style="background: #fee2e2; color: #b91c1c; padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; font-size: 0.875rem;"></div>
                    <form id="reset-form">
                        <div class="form-group" style="margin-bottom: 1rem;">
                            <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-main);">New Password</label>
                            <input type="password" id="reset-password" required minlength="8" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 4px;">
                        </div>
                        <div class="form-group" style="margin-bottom: 1.5rem;">
                            <label style="display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-main);">Confirm New Password</label>
                            <input type="password" id="reset-confirm" required minlength="8" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 4px;">
                        </div>
                        <button type="submit" id="reset-btn" class="btn btn-primary" style="width: 100%;">UPDATE PASSWORD</button>
                    </form>
                </div>
                
                <div id="reset-success-container" class="hidden" style="text-align: center;">
                    <div style="width: 64px; height: 64px; background: #dcfce7; color: #166534; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 1.5rem;">✓</div>
                    <h2 style="font-weight: 800; font-size: 1.5rem; margin-bottom: 0.5rem;">Password updated successfully</h2>
                    <p style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 2rem;">Your admin password has been changed.</p>
                    <a href="#login" class="btn btn-primary" style="width: 100%; margin-bottom: 1.5rem;">SIGN IN</a>
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
                errDiv.textContent = 'Passwords do not match.';
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
                    errDiv.textContent = error.message;
                    errDiv.classList.remove('hidden');
                    btn.textContent = 'UPDATE PASSWORD';
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
            <div class="card" style="width: 100%; max-width: 400px; padding: 2.5rem 2rem; background: var(--bg-card); border-radius: var(--border-radius); box-shadow: var(--shadow-md); text-align: center;">
                <div style="width: 64px; height: 64px; background: #fee2e2; color: #b91c1c; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 1.5rem;">!</div>
                <h2 style="font-weight: 800; font-size: 1.5rem; margin-bottom: 0.5rem;">Password reset link expired</h2>
                <p style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 2rem;">This password reset link is no longer valid. Please request a new one.</p>
                <a href="#forgot-password" class="btn btn-primary" style="width: 100%;">REQUEST NEW RESET LINK</a>
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
    
    renderDashboard() {
        const html = `
            <div style="max-width: 1000px; margin: 0 auto;">
                <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 2rem;">Dashboard Overview</h2>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 3rem;">
                    <div style="background: var(--bg-card); padding: 1.5rem; border-radius: 8px; box-shadow: var(--shadow-sm); border-left: 4px solid var(--primary);">
                        <div style="font-size: 0.875rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.5rem;">TOTAL BUSES</div>
                        <div style="font-size: 2.5rem; font-weight: 800; color: var(--text-main);">${store.getAdminBuses().length}</div>
                    </div>
                    <div style="background: var(--bg-card); padding: 1.5rem; border-radius: 8px; box-shadow: var(--shadow-sm); border-left: 4px solid var(--primary);">
                        <div style="font-size: 0.875rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.5rem;">TOTAL STOPS</div>
                        <div style="font-size: 2.5rem; font-weight: 800; color: var(--text-main);">${store.getStops().length}</div>
                    </div>
                    <div style="background: var(--bg-card); padding: 1.5rem; border-radius: 8px; box-shadow: var(--shadow-sm); border-left: 4px solid var(--primary);">
                        <div style="font-size: 0.875rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.5rem;">TOTAL ROUTES</div>
                        <div style="font-size: 2.5rem; font-weight: 800; color: var(--text-main);">${store.getAdminRoutes().length}</div>
                    </div>
                    <div style="background: var(--bg-card); padding: 1.5rem; border-radius: 8px; box-shadow: var(--shadow-sm); border-left: 4px solid var(--primary);">
                        <div style="font-size: 0.875rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.5rem;">ACTIVE TRIPS</div>
                        <div style="font-size: 2.5rem; font-weight: 800; color: var(--text-main);">${store.getAdminTrips().filter(t=>t.status==='active').length}</div>
                    </div>
                </div>

                <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem;">Recent Updates</h3>
                <div style="background: var(--bg-card); border-radius: 8px; box-shadow: var(--shadow-sm); overflow: hidden;">
                    <div style="padding: 1rem 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; align-items: center;">
                        <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--success); margin-right: 1rem;"></div>
                        <div>
                            <div style="font-weight: 600;">St. Antony</div>
                            <div style="font-size: 0.875rem; color: var(--text-muted);">Timing updated: 8:15 AM → 8:20 AM</div>
                        </div>
                    </div>
                    <div style="padding: 1rem 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; align-items: center;">
                        <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--success); margin-right: 1rem;"></div>
                        <div>
                            <div style="font-weight: 600;">Mary Matha</div>
                            <div style="font-size: 0.875rem; color: var(--text-muted);">Route updated: Added Kalamassery stop</div>
                        </div>
                    </div>
                    <div style="padding: 1rem 1.5rem; display: flex; align-items: center;">
                        <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--success); margin-right: 1rem;"></div>
                        <div>
                            <div style="font-weight: 600;">KSRTC Swift</div>
                            <div style="font-size: 0.875rem; color: var(--text-muted);">New stop added: Ernakulam South</div>
                        </div>
                    </div>
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
            rowsHtml += `
                <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr; gap: 1rem; padding: 1rem 1.5rem; border-bottom: 1px solid var(--border-color); align-items: center;">
                    <div style="font-weight: 600;">${bus.name}</div>
                    <div style="color: var(--text-muted); font-size: 0.875rem;">${bus.operator}</div>
                    <div style="color: var(--text-muted); font-size: 0.875rem;">${bus.type}</div>
                    <div><span style="background: ${bus.status==='active'?'#dcfce7':'#fee2e2'}; color: ${bus.status==='active'?'#166534':'#991b1b'}; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">${bus.status.toUpperCase()}</span></div>
                    <div style="text-align: right;">
                        <button class="btn" style="border: 1px solid var(--border-color); padding: 0.25rem 0.75rem; font-size: 0.875rem;" onclick="window.adminApp.openBusEditor('${bus.id}')">Edit</button>
                        <button class="btn" style="border: 1px solid var(--border-color); padding: 0.25rem 0.75rem; font-size: 0.875rem; margin-left: 0.5rem; background: var(--bg-page);" onclick="window.adminApp.renderBusConfiguration('${bus.id}')">Configure</button>
                        <button class="btn" style="border: 1px solid #fca5a5; background: #fef2f2; color: #b91c1c; padding: 0.25rem 0.75rem; font-size: 0.875rem; margin-left: 0.5rem;" onclick="window.adminApp.openDeleteBusModal('${bus.id}')">Delete</button>
                    </div>
                </div>
            `;
        });
        
        if (filteredBuses.length === 0) {
            rowsHtml = `<div style="padding: 2rem; text-align: center; color: var(--text-muted);">No buses found.</div>`;
        }

        const html = `
            <div style="max-width: 1000px; margin: 0 auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                    <h2 style="font-size: 1.5rem; font-weight: 700;">Bus Management</h2>
                    <button class="btn btn-primary" onclick="window.adminApp.openAddBusEditor()">+ Add Bus</button>
                </div>
                
                <div style="margin-bottom: 1.5rem;">
                    <input type="text" id="admin-bus-search" placeholder="Search buses by name or operator..." value="${searchQuery}" style="width: 100%; max-width: 400px; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 4px; font-size: 1rem;">
                </div>
                
                <div style="background: var(--bg-card); border-radius: 8px; box-shadow: var(--shadow-sm); overflow: hidden;">
                    <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr; gap: 1rem; padding: 1rem 1.5rem; background: var(--bg-page); border-bottom: 1px solid var(--border-color); font-weight: 700; font-size: 0.875rem; color: var(--text-muted);">
                        <div>BUS NAME</div>
                        <div>OPERATOR</div>
                        <div>TYPE</div>
                        <div>STATUS</div>
                        <div style="text-align: right;">ACTIONS</div>
                    </div>
                    ${rowsHtml}
                </div>
            </div>
        `;
        this.mainContent.innerHTML = html;
        
        // Add event listener to search input
        const searchInput = document.getElementById('admin-bus-search');
        if (searchInput) {
            searchInput.focus();
            // Put cursor at the end
            const val = searchInput.value;
            searchInput.value = '';
            searchInput.value = val;
            
            searchInput.addEventListener('input', (e) => {
                this.renderBuses(e.target.value);
            });
        }
    }

    // --- STOPS ---

    renderStops() {
        const stops = store.getStops();
        let rowsHtml = '';

        stops.forEach(stop => {
            const aliases = store.getAliases().filter(a => a.stop_id === stop.id).map(a => a.alias).join(', ');
            rowsHtml += `
                <div style="display: grid; grid-template-columns: 40px 2fr 1fr 2fr 1fr 1fr; gap: 1rem; padding: 1rem 1.5rem; border-bottom: 1px solid var(--border-color); align-items: center;">
                    <div><input type="checkbox" class="stop-checkbox" value="${stop.id}" onchange="window.adminApp.updateMultipleDeleteButton()" style="cursor: pointer; width: 1.2rem; height: 1.2rem;"></div>
                    <div style="font-weight: 600;">${stop.name}</div>
                    <div style="color: var(--text-muted); font-size: 0.875rem;">${stop.area}</div>
                    <div style="color: var(--text-muted); font-size: 0.875rem;">${aliases || '-'}</div>
                    <div><span style="background: ${stop.status==='active'?'#dcfce7':'#fee2e2'}; color: ${stop.status==='active'?'#166534':'#991b1b'}; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">${stop.status.toUpperCase()}</span></div>
                    <div style="text-align: right;">
                        <button class="btn" style="border: 1px solid var(--border-color); padding: 0.25rem 0.75rem; font-size: 0.875rem;" onclick="alert('Edit functionality not fully implemented in prototype')">Edit</button>
                        <button class="btn" style="border: 1px solid #fca5a5; background: #fef2f2; color: #b91c1c; padding: 0.25rem 0.75rem; font-size: 0.875rem; margin-left: 0.5rem;" onclick="window.adminApp.openDeleteStopModal('${stop.id}')">Delete</button>
                    </div>
                </div>
            `;
        });

        const html = `
            <div style="max-width: 1000px; margin: 0 auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                    <h2 style="font-size: 1.5rem; font-weight: 700;">Stop Management</h2>
                    <div>
                        <button class="btn" id="delete-selected-stops-btn" style="border: 1px solid #fca5a5; background: #fef2f2; color: #b91c1c; padding: 0.5rem 1rem; font-size: 0.875rem; margin-right: 1rem; opacity: 0.5; pointer-events: none;" onclick="window.adminApp.openDeleteMultipleStopsModal()">Delete Selected</button>
                        <button class="btn btn-primary">+ Add Stop</button>
                    </div>
                </div>
                
                <div style="background: var(--bg-card); border-radius: 8px; box-shadow: var(--shadow-sm); overflow: hidden;">
                    <div style="display: grid; grid-template-columns: 40px 2fr 1fr 2fr 1fr 1fr; gap: 1rem; padding: 1rem 1.5rem; background: var(--bg-page); border-bottom: 1px solid var(--border-color); font-weight: 700; font-size: 0.875rem; color: var(--text-muted); align-items: center;">
                        <div><input type="checkbox" id="select-all-stops" onchange="window.adminApp.toggleAllStops(this)" style="cursor: pointer; width: 1.2rem; height: 1.2rem;"></div>
                        <div>STOP NAME</div>
                        <div>AREA</div>
                        <div>ALIASES</div>
                        <div>STATUS</div>
                        <div style="text-align: right;">ACTIONS</div>
                    </div>
                    ${rowsHtml}
                </div>
            </div>
        `;
        this.mainContent.innerHTML = html;
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
            <div style="max-width: 500px; margin: 0 auto; background: var(--bg-card); border-radius: 8px; box-shadow: 0 10px 25px -5px rgb(0 0 0 / 0.1); border: 1px solid var(--border-color); display: flex; flex-direction: column;">
                <div style="padding: 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                    <h2 style="font-size: 1.5rem; font-weight: 700; margin: 0; color: #b91c1c;">Delete Stop?</h2>
                    <button class="btn" onclick="window.adminApp.closeDeleteStopModal()" style="font-size: 1.5rem; line-height: 1; padding: 0.25rem 0.5rem;">&times;</button>
                </div>
                
                <div style="padding: 1.5rem; background: #fff;">
                    ${contentHtml}
                </div>
                
                <div style="padding: 1.5rem; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 1rem; background: #f8fafc; border-radius: 0 0 8px 8px;">
                    <button class="btn" style="border: 1px solid var(--border-color); padding: 0.75rem 1.5rem; font-weight: 600;" onclick="window.adminApp.closeDeleteStopModal()" id="delete-stop-cancel-btn">Cancel</button>
                    <button id="delete-stop-confirm-btn" class="btn" style="padding: 0.75rem 1.5rem; font-weight: 600; background: #b91c1c; color: #fff; border: 1px solid #991b1b; ${hasData ? 'opacity: 0.5; cursor: not-allowed;' : ''}" ${hasData ? 'disabled' : ''} onclick="window.adminApp.executeDeleteStop(${hasData})">${hasData ? 'Delete Stop & Data' : 'Delete Stop'}</button>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        container.classList.remove('hidden');
        
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
        document.getElementById('admin-modal-container').classList.add('hidden');
        document.getElementById('admin-modal-container').innerHTML = '';
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
                
                const toast = document.createElement('div');
                toast.style.cssText = "position:fixed; bottom:20px; right:20px; background:#166534; color:#fff; padding:1rem 2rem; border-radius:8px; font-weight:600; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); z-index:100;";
                toast.innerHTML = `✓ Stop deleted successfully<br><span style="font-size:0.875rem; font-weight:400;">${stop.name} was deleted.</span>`;
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 4000);
                
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
            document.getElementById('select-all-stops').checked = false;
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
            <div style="max-width: 500px; margin: 0 auto; background: var(--bg-card); border-radius: 8px; box-shadow: 0 10px 25px -5px rgb(0 0 0 / 0.1); border: 1px solid var(--border-color); display: flex; flex-direction: column;">
                <div style="padding: 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                    <h2 style="font-size: 1.5rem; font-weight: 700; margin: 0; color: #b91c1c;">Delete ${selected.length} Stops?</h2>
                    <button class="btn" onclick="window.adminApp.closeDeleteMultipleStopsModal()" style="font-size: 1.5rem; line-height: 1; padding: 0.25rem 0.5rem;">&times;</button>
                </div>
                
                <div style="padding: 1.5rem; background: #fff;">
                    ${contentHtml}
                </div>
                
                <div style="padding: 1.5rem; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 1rem; background: #f8fafc; border-radius: 0 0 8px 8px;">
                    <button class="btn" style="border: 1px solid var(--border-color); padding: 0.75rem 1.5rem; font-weight: 600;" onclick="window.adminApp.closeDeleteMultipleStopsModal()" id="delete-multiple-stops-cancel-btn">Cancel</button>
                    <button id="delete-multiple-stops-confirm-btn" class="btn" style="padding: 0.75rem 1.5rem; font-weight: 600; background: #b91c1c; color: #fff; border: 1px solid #991b1b; ${hasData ? 'opacity: 0.5; cursor: not-allowed;' : ''}" ${hasData ? 'disabled' : ''} onclick="window.adminApp.executeDeleteMultipleStops()">${hasData ? 'Delete Stops & Data' : 'Delete Stops'}</button>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        container.classList.remove('hidden');
        
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
        document.getElementById('admin-modal-container').classList.add('hidden');
        document.getElementById('admin-modal-container').innerHTML = '';
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
                
                const toast = document.createElement('div');
                toast.style.cssText = "position:fixed; bottom:20px; right:20px; background:#166534; color:#fff; padding:1rem 2rem; border-radius:8px; font-weight:600; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); z-index:100;";
                toast.innerHTML = `✓ ${stopIds.length} stops deleted successfully`;
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 4000);
                
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

    // --- ROUTES ---

    renderRoutes() {
        const routes = store.getAdminRoutes();
        let rowsHtml = '';

        routes.forEach(route => {
            const bus = store.getBusById(route.bus_id);
            const routeStops = store.getRouteStops().filter(rs => rs.route_id === route.id).sort((a,b)=>a.stop_order - b.stop_order);
            const stopsList = routeStops.map((rs, i) => `${i+1}. ${store.getStopById(rs.stop_id).name}`).join('<br>');

            rowsHtml += `
                <div style="background: var(--bg-card); padding: 1.5rem; border-radius: 8px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color); margin-bottom: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;">
                        <div>
                            <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.25rem;">${bus.name}</h3>
                            <div style="color: var(--text-muted); font-size: 0.875rem;">${store.getStopById(route.origin_stop_id).name} → ${store.getStopById(route.destination_stop_id).name}</div>
                        </div>
                        <button class="btn" style="border: 1px solid var(--border-color); padding: 0.25rem 0.75rem; font-size: 0.875rem;" onclick="window.adminApp.openRouteStopsEditor('${route.id}')">Edit Stops</button>
                    </div>
                    <div>
                        <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.5rem;">STOP SEQUENCE</div>
                        <div style="font-size: 0.875rem; color: var(--text-main); line-height: 1.5;">${stopsList}</div>
                    </div>
                </div>
            `;
        });

        const html = `
            <div style="max-width: 1000px; margin: 0 auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                    <h2 style="font-size: 1.5rem; font-weight: 700;">Route Management</h2>
                </div>
                ${rowsHtml}
            </div>
        `;
        this.mainContent.innerHTML = html;
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
            <div style="max-width: 500px; margin: 0 auto; background: var(--bg-card); border-radius: 8px; box-shadow: 0 10px 25px -5px rgb(0 0 0 / 0.1); border: 1px solid var(--border-color); display: flex; flex-direction: column;">
                <div style="padding: 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                    <h2 style="font-size: 1.5rem; font-weight: 700; margin: 0;">${title}</h2>
                    <button class="btn" onclick="window.adminApp.closeBusEditor()" style="font-size: 1.5rem; line-height: 1; padding: 0.25rem 0.5rem;">&times;</button>
                </div>
                
                <div style="padding: 1.5rem; background: #f8fafc;">
                    <div id="bus-editor-error" class="hidden" style="background: #fee2e2; color: #991b1b; padding: 1rem; border-radius: 4px; margin-bottom: 1rem; font-weight: 500; font-size: 0.875rem;"></div>
                    
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.875rem; color: #334155;">Bus Name</label>
                        <input type="text" id="edit-bus-name" value="${b.name}" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 4px; font-size: 1rem;" oninput="window.adminApp.markBusDirty()">
                    </div>

                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.875rem; color: #334155;">Operator</label>
                        <input type="text" id="edit-bus-operator" value="${b.operator}" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 4px; font-size: 1rem;" oninput="window.adminApp.markBusDirty()">
                    </div>

                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.875rem; color: #334155;">Bus Type</label>
                        <select id="edit-bus-type" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 4px; font-size: 1rem;" onchange="window.adminApp.markBusDirty()">
                            <option value="Private" ${b.type==='Private'?'selected':''}>Private</option>
                            <option value="KSRTC" ${b.type==='KSRTC'?'selected':''}>KSRTC</option>
                            <option value="KSRTC Swift" ${b.type==='KSRTC Swift'?'selected':''}>KSRTC Swift</option>
                            <option value="Other" ${b.type==='Other'?'selected':''}>Other</option>
                        </select>
                    </div>

                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.875rem; color: #334155;">Status</label>
                        <select id="edit-bus-status" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 4px; font-size: 1rem;" onchange="window.adminApp.markBusDirty()">
                            <option value="active" ${b.status==='active'?'selected':''}>Active</option>
                            <option value="inactive" ${b.status==='inactive'?'selected':''}>Inactive</option>
                        </select>
                    </div>
                </div>
                
                <div style="padding: 1.5rem; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 1rem; background: #fff; border-radius: 0 0 8px 8px;">
                    <button class="btn" style="border: 1px solid var(--border-color); padding: 0.75rem 1.5rem; font-weight: 600;" onclick="window.adminApp.closeBusEditor()">Cancel</button>
                    <button class="btn btn-primary" style="padding: 0.75rem 2rem; font-weight: 600;" onclick="window.adminApp.saveBus()">Save Changes</button>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        container.classList.remove('hidden');
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
            const toast = document.createElement('div');
            toast.style.cssText = "position:fixed; bottom:20px; right:20px; background:#166534; color:#fff; padding:1rem 2rem; border-radius:8px; font-weight:600; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); z-index:100;";
            toast.innerHTML = `✓ Bus updated successfully`;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 4000);
            
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
                <div style="max-width: 500px; margin: 0 auto; background: var(--bg-card); border-radius: 8px; box-shadow: 0 10px 25px -5px rgb(0 0 0 / 0.1); border: 1px solid var(--border-color); display: flex; flex-direction: column; text-align: center; padding: 2rem;">
                    <div style="width: 64px; height: 64px; background: #dcfce7; color: #166534; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 1.5rem;">✓</div>
                    <h2 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 0.5rem; color: var(--text-main);">Bus created successfully</h2>
                    <div style="font-size: 1.25rem; font-weight: 700; color: var(--primary); margin-bottom: 1rem;">${name}</div>
                    <p style="color: var(--text-muted); margin-bottom: 2rem;">Would you like to configure its route and timings now?</p>
                    
                    <div style="display: flex; gap: 1rem; justify-content: center;">
                        <button class="btn" style="border: 1px solid var(--border-color); padding: 0.75rem 1.5rem; font-weight: 600;" onclick="window.adminApp.closeBusEditor(); window.adminApp.renderBuses();">Later</button>
                        <button class="btn btn-primary" style="padding: 0.75rem 1.5rem; font-weight: 600;" onclick="window.adminApp.closeBusEditor(); window.adminApp.renderBusConfiguration('${savedBusId}');">Configure Route</button>
                    </div>
                </div>
            `;
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
            <div style="max-width: 500px; margin: 0 auto; background: var(--bg-card); border-radius: 8px; box-shadow: 0 10px 25px -5px rgb(0 0 0 / 0.1); border: 1px solid var(--border-color); display: flex; flex-direction: column;">
                <div style="padding: 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                    <h2 style="font-size: 1.5rem; font-weight: 700; margin: 0; color: #b91c1c;">Delete Bus?</h2>
                    <button class="btn" onclick="window.adminApp.closeDeleteBusModal()" style="font-size: 1.5rem; line-height: 1; padding: 0.25rem 0.5rem;">&times;</button>
                </div>
                
                <div style="padding: 1.5rem; background: #fff;">
                    ${contentHtml}
                </div>
                
                <div style="padding: 1.5rem; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 1rem; background: #f8fafc; border-radius: 0 0 8px 8px;">
                    <button class="btn" style="border: 1px solid var(--border-color); padding: 0.75rem 1.5rem; font-weight: 600;" onclick="window.adminApp.closeDeleteBusModal()" id="delete-bus-cancel-btn">Cancel</button>
                    <button id="delete-bus-confirm-btn" class="btn" style="padding: 0.75rem 1.5rem; font-weight: 600; background: #b91c1c; color: #fff; border: 1px solid #991b1b; ${hasData ? 'opacity: 0.5; cursor: not-allowed;' : ''}" ${hasData ? 'disabled' : ''} onclick="window.adminApp.executeDeleteBus(${hasData})">${hasData ? 'Delete Everything' : 'Delete Bus'}</button>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        container.classList.remove('hidden');
        
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
        document.getElementById('admin-modal-container').classList.add('hidden');
        document.getElementById('admin-modal-container').innerHTML = '';
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
                
                // Show success notification
                const toast = document.createElement('div');
                toast.style.cssText = "position:fixed; bottom:20px; right:20px; background:#166534; color:#fff; padding:1rem 2rem; border-radius:8px; font-weight:600; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); z-index:100;";
                if (hasData) {
                    toast.innerHTML = `✓ Bus deleted successfully<br><span style="font-size:0.875rem; font-weight:400;">${bus.name} and its associated data were deleted.</span>`;
                } else {
                    toast.innerHTML = `✓ Bus deleted successfully<br><span style="font-size:0.875rem; font-weight:400;">${bus.name} was deleted.</span>`;
                }
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 4000);
                
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

    renderTimings() {
        const trips = store.getAdminTrips();
        let rowsHtml = '';

        trips.forEach(trip => {
            const route = store.getRouteById(trip.route_id);
            const bus = store.getBusById(route.bus_id);
            
            rowsHtml += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; border-bottom: 1px solid var(--border-color);">
                    <div>
                        <div style="font-weight: 600;">${bus.name}</div>
                        <div style="color: var(--text-muted); font-size: 0.875rem;">${store.getStopById(route.origin_stop_id).name} → ${store.getStopById(route.destination_stop_id).name}</div>
                    </div>
                    <button class="btn btn-primary edit-timings-btn" data-trip="${trip.id}" style="padding: 0.5rem 1rem; font-size: 0.875rem;">Manage Timings</button>
                </div>
            `;
        });

        const html = `
            <div style="max-width: 1000px; margin: 0 auto;" id="timings-list-view">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                    <h2 style="font-size: 1.5rem; font-weight: 700;">Timings Management</h2>
                </div>
                <div style="background: var(--bg-card); border-radius: 8px; box-shadow: var(--shadow-sm); overflow: hidden; border: 1px solid var(--border-color);">
                    ${rowsHtml}
                </div>
            </div>
            <div id="timings-editor-view"></div>
        `;
        this.mainContent.innerHTML = html;

        document.querySelectorAll('.edit-timings-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tripId = e.target.getAttribute('data-trip');
                this.renderTimingEditor(tripId);
            });
        });
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
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem; border-bottom: 1px solid var(--border-color);">
                    <div style="font-weight: 500;">${stop.name}</div>
                    <input type="time" class="timing-input" data-trip="${trip.id}" data-stop="${stop.id}" value="${timeStr}" style="padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; font-family: monospace; font-size: 1rem;">
                </div>
            `;
        });

        const html = `
            <div style="max-width: 600px; margin: 0 auto;">
                <div style="margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <button onclick="window.location.hash='#timings'; setTimeout(()=>window.adminApp.renderTimings(), 10);" class="btn" style="border: 1px solid var(--border-color); padding: 0.5rem 1rem;">← Back</button>
                        <div>
                            <h2 style="font-size: 1.25rem; font-weight: 700; margin: 0;">Edit Timings: ${bus.name}</h2>
                            <div style="font-size: 0.875rem; color: var(--text-muted);">${store.getStopById(route.origin_stop_id).name} → ${store.getStopById(route.destination_stop_id).name}</div>
                        </div>
                    </div>
                    <button id="save-timings-btn" class="btn btn-primary" style="padding: 0.5rem 1.5rem;">SAVE CHANGES</button>
                </div>
                
                <div id="save-msg" class="hidden" style="background: #dcfce7; color: #166534; padding: 1rem; border-radius: 4px; margin-bottom: 1.5rem; text-align: center; font-weight: 600;">Changes saved successfully!</div>

                <div style="background: var(--bg-card); border-radius: 8px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color); overflow: hidden;">
                    <div style="padding: 1rem 1.5rem; background: var(--bg-page); border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 700; color: var(--text-muted);">
                        <div>STOP NAME</div>
                        <div>ARRIVAL / DEPARTURE TIME</div>
                    </div>
                    ${stopsTimingsHtml}
                </div>
            </div>
        `;
        
        document.getElementById('timings-list-view').style.display = 'none';
        const editorView = document.getElementById('timings-editor-view');
        editorView.innerHTML = html;
        editorView.style.display = 'block';

        document.getElementById('save-timings-btn').addEventListener('click', async () => {
            const inputs = document.querySelectorAll('.timing-input');
            for (const input of inputs) {
                const tId = input.getAttribute('data-trip');
                const sId = input.getAttribute('data-stop');
                const newTime = input.value;
                if (newTime) {
                    await store.updateStopTime(tId, sId, newTime);
                }
            }
            const msg = document.getElementById('save-msg');
            msg.classList.remove('hidden');
            setTimeout(() => msg.classList.add('hidden'), 3000);
        });
    }

    // --- ROUTE STOPS EDITOR ---

    openRouteStopsEditor(routeId) {
        this.currentEditRouteId = routeId;
        const routeStops = store.getRouteStops().filter(rs => rs.route_id === routeId).sort((a,b) => a.stop_order - b.stop_order);
        this.currentEditStopIds = routeStops.map(rs => rs.stop_id);
        this.renderRouteStopsEditor();
    }

    renderRouteStopsEditor() {
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
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 1rem; border: 1px solid var(--border-color); border-radius: 4px; margin-bottom: 0.5rem; background: #fff;">
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
                
                <div style="padding: 1.5rem; overflow-y: auto; flex: 1; background: #f8fafc;">
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
            const temp = this.currentEditStopIds[index - 1];
            this.currentEditStopIds[index - 1] = this.currentEditStopIds[index];
            this.currentEditStopIds[index] = temp;
            this.renderRouteStopsEditor();
        }
    }
    
    moveStopDown(index) {
        if (index < this.currentEditStopIds.length - 1) {
            const temp = this.currentEditStopIds[index + 1];
            this.currentEditStopIds[index + 1] = this.currentEditStopIds[index];
            this.currentEditStopIds[index] = temp;
            this.renderRouteStopsEditor();
        }
    }
    
    removeStop(index) {
        const stopId = this.currentEditStopIds[index];
        const stopName = store.getStopById(stopId).name;
        if (confirm(`Remove ${stopName} from this route?`)) {
            this.currentEditStopIds.splice(index, 1);
            this.renderRouteStopsEditor();
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
        
        this.currentEditStopIds.push(stopId);
        this.renderRouteStopsEditor();
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
