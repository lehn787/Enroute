const store = window.store;

class App {
    constructor() {
        this.mainContent = document.getElementById('main-content');
        this.init();
    }

    async init() {
        await store.initializeData();
        this.initRouter();
        this.render();
        
        // Start real-time status interval
        setInterval(() => this.updateRealTimeStatus(), 60000);
        
        // Start live clock
        setInterval(() => this.updateLiveClock(), 1000);
        this.updateLiveClock();
    }

    formatTime(timeString) {
        if (!timeString || timeString.includes('Start') || timeString === '--:--') return timeString;
        const parts = timeString.split(':');
        if (parts.length < 2) return timeString;
        let h = parseInt(parts[0], 10);
        const m = parts[1];
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        h = h ? h : 12;
        return `${h.toString().padStart(2, '0')}:${m} ${ampm}`;
    }

    updateLiveClock() {
        const clockEl = document.getElementById('live-clock');
        if (!clockEl) return;
        
        const now = new Date();
        const options = { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit',
            hour12: true 
        };
        const formatter = new Intl.DateTimeFormat('en-US', options);
        clockEl.textContent = `${formatter.format(now)} Local`;
    }

    getMinuteDifference(busTimeStr) {
        if (!busTimeStr || busTimeStr.includes('Start') || busTimeStr === '--:--') return null;
        
        const now = new Date();
        const localHour = now.getHours();
        const localMinute = now.getMinutes();
        
        const localTotalMinutes = (localHour * 60) + localMinute;
        
        const busParts = busTimeStr.split(':');
        const busHour = parseInt(busParts[0], 10);
        const busMinute = parseInt(busParts[1], 10);
        const busTotalMinutes = (busHour * 60) + busMinute;
        
        let diffMinutes = busTotalMinutes - localTotalMinutes;
        
        // Handle midnight crossings (e.g. now is 23:00, bus is 01:00)
        // Only wrap around if the time difference is more than 18 hours (1080 mins)
        if (diffMinutes < -1080) diffMinutes += 1440; 
        if (diffMinutes > 1080) diffMinutes -= 1440;
        
        return diffMinutes;
    }

    updateRealTimeStatus() {
        document.querySelectorAll('.real-time-status').forEach(el => {
            const timeStr = el.getAttribute('data-time');
            const diffMinutes = this.getMinuteDifference(timeStr);
            if (diffMinutes === null) return;
            
            const labelEl = el.querySelector('.status-label');
            const timeEl = el.querySelector('.status-time');
            if (!labelEl || !timeEl) return;
            
            if (diffMinutes < 0) {
                labelEl.textContent = 'DEPARTED';
                timeEl.style.color = '#94a3b8'; // muted gray/red
            } else if (diffMinutes <= 5) {
                labelEl.textContent = 'LEAVING SOON';
                timeEl.style.color = '#f59e0b'; // amber
            } else {
                labelEl.textContent = 'UPCOMING';
                timeEl.style.color = 'var(--success)'; // green
            }
        });
    }

    initRouter() {
        // Failsafe: Bounce Supabase recovery tokens to the admin portal if they land here
        if (window.location.hash.includes('type=recovery') || window.location.hash.includes('access_token=')) {
            window.location.href = window.location.origin + '/admin.html' + window.location.hash;
            return;
        }

        window.addEventListener('hashchange', () => this.render());
        // Default route
        if (!window.location.hash) {
            window.location.hash = '#user';
        }

        // Navigation active states
        const updateNav = () => {
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
                if (window.location.hash.startsWith(link.getAttribute('href'))) {
                    link.classList.add('active');
                }
            });
        };
        window.addEventListener('hashchange', updateNav);
        updateNav();
    }

    render() {
        const hash = window.location.hash;
        this.mainContent.innerHTML = ''; // Clear current view

        if (hash.startsWith('#search-bus')) {
            this.renderBusSearch();
        } else if (hash.startsWith('#search-stop')) {
            this.renderStopSearch();
        } else if (hash.startsWith('#search')) {
            const params = new URLSearchParams(hash.split('?')[1]);
            this.renderSearchResults(params.get('origin'), params.get('dest'));
        } else if (hash.startsWith('#bus')) {
            const params = new URLSearchParams(hash.split('?')[1]);
            this.renderBusDetails(params.get('tripId'));
        } else {
            this.renderUserPortal();
        }
    }

    // --- USER PORTAL ---
    renderUserPortal() {
        const stops = store.getStops().filter(s => s.status === 'active').sort((a, b) => a.name.localeCompare(b.name));

        let stopOptions = '<option value="">Select stop</option>';
        stops.forEach(stop => {
            stopOptions += `<option value="${stop.id}">${stop.name}</option>`;
        });

        const html = `
            <div class="home-container" style="max-width: 600px; margin: 0 auto;">
                <div class="hero-section text-center" style="margin-bottom: 2rem;">
                    <img src="img/logo.png" alt="EnRoute Logo" style="display: block; margin: 0 auto 0.5rem auto; width: 120px; max-width: 100%; height: auto;">
                    <p style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.25rem;">Your bus. Your route. Your time.</p>
                    <p style="color: var(--text-muted);">Find the right city bus across Kochi.</p>
                </div>

                <div class="card search-card" style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--border-radius); box-shadow: var(--shadow-md);">
                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-muted); font-size: 0.875rem;">FROM</label>
                        <select id="origin-select" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; font-size: 1rem;">
                            ${stopOptions}
                        </select>
                    </div>

                    <div style="text-align: center; margin: 0.5rem 0;">
                        <button id="swap-stops-btn" style="background: none; border: 1px solid var(--border-color); border-radius: 50%; width: 40px; height: 40px; font-size: 1.2rem; cursor: pointer; color: var(--primary); transition: all 0.2s;">⇅</button>
                    </div>

                    <div class="form-group" style="margin-bottom: 1.5rem;">
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-muted); font-size: 0.875rem;">TO</label>
                        <select id="dest-select" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; font-size: 1rem;">
                            ${stopOptions}
                        </select>
                    </div>

                    <button id="find-buses-btn" class="btn btn-primary" style="width: 100%; font-size: 1.1rem; margin-bottom: 1.5rem;">FIND BUSES</button>
                    <div id="search-error" class="hidden" style="color: var(--danger); text-align: center; margin-top: 1rem; font-size: 0.9rem;"></div>
                    
                    <div style="text-align: center; color: var(--text-muted); font-weight: 600; margin-bottom: 1.5rem;">OR</div>
                    
                    <a href="#search-bus" class="btn" style="width: 100%; border: 1px solid var(--border-color); color: var(--text-main); margin-bottom: 1rem;">🔍 Search by bus name</a>
                    
                    <a href="#search-stop" class="btn" style="width: 100%; border: 1px solid var(--border-color); color: var(--text-main);">📍 Find buses at a stop</a>
                </div>
            </div>
        `;

        this.mainContent.innerHTML = html;

        // Bind events
        document.getElementById('swap-stops-btn').addEventListener('click', (e) => {
            e.preventDefault();
            const origin = document.getElementById('origin-select');
            const dest = document.getElementById('dest-select');
            const temp = origin.value;
            origin.value = dest.value;
            dest.value = temp;
        });

        document.getElementById('find-buses-btn').addEventListener('click', () => {
            const originId = document.getElementById('origin-select').value;
            const destId = document.getElementById('dest-select').value;
            const errorEl = document.getElementById('search-error');

            if (!originId || !destId) {
                errorEl.textContent = 'Please select both origin and destination.';
                errorEl.classList.remove('hidden');
                return;
            }
            if (originId === destId) {
                errorEl.textContent = 'Please choose two different stops.';
                errorEl.classList.remove('hidden');
                return;
            }

            // Navigate to results
            window.location.hash = `#search?origin=${originId}&dest=${destId}`;
        });
    }

    renderBusSearch() {
        let html = `
            <div style="max-width: 600px; margin: 0 auto;">
                <div style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 1rem;">
                    <a href="#user" style="font-size: 1.5rem; color: var(--text-main);">←</a>
                    <h2 style="font-size: 1.25rem;">Search Bus Name</h2>
                </div>
                
                <div class="card" style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--border-radius); box-shadow: var(--shadow-md); margin-bottom: 1.5rem;">
                    <input type="text" id="bus-search-input" placeholder="e.g. Antony" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; font-size: 1rem; margin-bottom: 1rem;">
                    <button id="search-bus-btn" class="btn btn-primary" style="width: 100%;">SEARCH</button>
                </div>
                
                <div id="bus-search-results"></div>
            </div>
        `;
        this.mainContent.innerHTML = html;

        document.getElementById('search-bus-btn').addEventListener('click', () => {
            const query = document.getElementById('bus-search-input').value;
            const results = store.searchBusesByName(query);
            let resHtml = '';

            if (results.length === 0) {
                resHtml = '<div style="text-align: center; color: var(--text-muted); padding: 2rem;">No buses found matching that name.</div>';
            } else {
                results.forEach(bus => {
                    const route = store.getRoutes().find(r => r.bus_id === bus.id);
                    resHtml += `
                        <div class="card" style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--border-radius); box-shadow: var(--shadow-sm); margin-bottom: 1rem; border-left: 4px solid var(--primary);">
                            <h3 style="font-size: 1.25rem; font-weight: 800; margin-bottom: 0.25rem;">${bus.name}</h3>
                            <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1rem;">
                                ${store.getStopById(route.origin_stop_id).name} → ${store.getStopById(route.destination_stop_id).name}
                            </p>
                            <div style="background: var(--bg-page); padding: 0.75rem; border-radius: 6px;">
                                <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); margin-right: 0.5rem;">VIA</span>
                                <span style="font-weight: 500; font-size: 0.9rem;">${route.via_description}</span>
                            </div>
                        </div>
                    `;
                });
            }
            document.getElementById('bus-search-results').innerHTML = resHtml;
        });
    }

    renderStopSearch() {
        const stops = store.getStops().filter(s => s.status === 'active').sort((a, b) => a.name.localeCompare(b.name));
        let stopOptions = '<option value="">Select stop</option>';
        stops.forEach(stop => {
            stopOptions += `<option value="${stop.id}">${stop.name}</option>`;
        });

        let html = `
            <div style="max-width: 600px; margin: 0 auto;">
                <div style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 1rem;">
                    <a href="#user" style="font-size: 1.5rem; color: var(--text-main);">←</a>
                    <h2 style="font-size: 1.25rem;">Find Buses at Stop</h2>
                </div>
                
                <div class="card" style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--border-radius); box-shadow: var(--shadow-md); margin-bottom: 1.5rem;">
                    <select id="stop-search-select" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; font-size: 1rem; margin-bottom: 1rem;">
                        ${stopOptions}
                    </select>
                    <button id="search-stop-btn" class="btn btn-primary" style="width: 100%;">SEARCH</button>
                </div>
                
                <div id="stop-search-results"></div>
            </div>
        `;
        this.mainContent.innerHTML = html;

        document.getElementById('search-stop-btn').addEventListener('click', () => {
            const stopId = document.getElementById('stop-search-select').value;
            if (!stopId) return;
            const results = store.findBusesAtStop(stopId);

            let resHtml = '';
            if (results.length === 0) {
                resHtml = '<div style="text-align: center; color: var(--text-muted); padding: 2rem;">No buses scheduled for this stop.</div>';
            } else {
                resHtml += `<p style="color: var(--text-muted); font-weight: 600; margin-bottom: 1rem; font-size: 0.875rem;">BUSES AT ${store.getStopById(stopId).name.toUpperCase()}</p>`;
                results.forEach(res => {
                    resHtml += `
                        <div class="card" style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--border-radius); box-shadow: var(--shadow-sm); margin-bottom: 1rem; border-left: 4px solid var(--primary);">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                                <div>
                                    <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.25rem;">${res.bus.name}</h3>
                                    <p style="color: var(--text-muted); font-size: 0.9rem;">
                                        ${store.getStopById(res.route.origin_stop_id).name} → ${store.getStopById(res.route.destination_stop_id).name}
                                    </p>
                                </div>
                                <div style="text-align: right;" class="real-time-status" data-time="${res.arrivalTime}">
                                    <p class="status-label" style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.25rem; transition: color 0.3s ease;">UPCOMING</p>
                                    <p class="status-time" style="font-size: 1.25rem; font-weight: 700; color: var(--success); transition: color 0.3s ease;">${this.formatTime(res.arrivalTime)}</p>
                                </div>
                            </div>
                            <div style="background: var(--bg-page); padding: 0.75rem; border-radius: 6px; margin-bottom: 1rem;">
                                <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); margin-right: 0.5rem;">VIA</span>
                                <span style="font-weight: 500; font-size: 0.9rem;">${res.route.via_description}</span>
                            </div>
                            <a href="#bus?tripId=${res.trip.id}" class="btn" style="width: 100%; border: 1px solid var(--primary); color: var(--primary);">VIEW ROUTE</a>
                        </div>
                    `;
                });
            }
            document.getElementById('stop-search-results').innerHTML = resHtml;
            this.updateRealTimeStatus();
        });
    }

    renderSearchResults(originId, destId) {
        const origin = store.getStopById(originId);
        const dest = store.getStopById(destId);

        if (!origin || !dest) {
            window.location.hash = '#user';
            return;
        }

        const results = store.findBusesBetweenStops(originId, destId);

        let html = `
            <div style="max-width: 600px; margin: 0 auto;">
                <div style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 1rem;">
                    <a href="#user" style="font-size: 1.5rem; color: var(--text-main);">←</a>
                    <h2 style="font-size: 1.25rem;">${origin.name} → ${dest.name}</h2>
                </div>
        `;

        if (results.length === 0) {
            html += `
                <div class="card text-center" style="background: var(--bg-card); padding: 2rem; border-radius: var(--border-radius); box-shadow: var(--shadow-sm);">
                    <h3 style="margin-bottom: 0.5rem;">NO BUSES FOUND</h3>
                    <p style="color: var(--text-muted); margin-bottom: 1.5rem;">We couldn't find a bus for this route.</p>
                    <a href="#user" class="btn btn-primary">CHANGE SEARCH</a>
                </div>
            `;
        } else {
            html += `<p style="color: var(--text-muted); font-weight: 600; margin-bottom: 1rem; font-size: 0.875rem;">${results.length} BUSES FOUND</p>`;

            results.forEach(result => {
                const routeOrigin = store.getStopById(result.stops[0].stop_id);
                const routeDest = store.getStopById(result.stops[result.stops.length - 1].stop_id);
                
                html += `
                    <div class="card bus-card" style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--border-radius); box-shadow: var(--shadow-md); margin-bottom: 1rem; border-left: 4px solid var(--primary);">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                            <div>
                                <h3 style="font-size: 1.5rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.25rem;">${result.bus.name}</h3>
                                <p style="color: var(--text-muted); font-size: 0.9rem;">${routeOrigin ? routeOrigin.name : ''} → ${routeDest ? routeDest.name : ''}</p>
                            </div>
                            <div style="text-align: right;" class="real-time-status" data-time="${result.originTime}">
                                <p class="status-label" style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.25rem; transition: color 0.3s ease;">UPCOMING</p>
                                <p class="status-time" style="font-size: 1.25rem; font-weight: 700; color: var(--success); transition: color 0.3s ease;">${this.formatTime(result.originTime)}</p>
                            </div>
                        </div>
                        
                        <div style="background: var(--bg-page); padding: 0.75rem; border-radius: 6px; margin-bottom: 1rem;">
                            <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); margin-right: 0.5rem;">VIA</span>
                            <span style="font-weight: 500; font-size: 0.9rem;">${result.route.via_description}</span>
                        </div>
                        
                        <a href="#bus?tripId=${result.trip.id}&origin=${originId}&dest=${destId}" class="btn" style="width: 100%; border: 1px solid var(--primary); color: var(--primary);">VIEW ROUTE</a>
                    </div>
                `;
            });
        }

        html += `</div>`;
        this.mainContent.innerHTML = html;
        this.updateRealTimeStatus();
    }

    renderBusDetails(tripId) {
        const trip = store.getTrips().find(t => t.id === tripId);
        if (!trip) return;
        const route = store.getRouteById(trip.route_id);
        const bus = store.getBusById(route.bus_id);

        const routeStops = store.getRouteStops()
            .filter(rs => rs.route_id === route.id)
            .sort((a, b) => a.stop_order - b.stop_order);

        let html = `
            <div style="max-width: 600px; margin: 0 auto;">
                <div style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 1rem;">
                    <button onclick="window.history.back()" style="font-size: 1.5rem; color: var(--text-main);">←</button>
                    <h2 style="font-size: 1.25rem;">Route Details</h2>
                </div>
                
                <div class="card" style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--border-radius); box-shadow: var(--shadow-md); margin-bottom: 1.5rem; border-left: 4px solid var(--primary);">
                    <h3 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 0.25rem;">${bus.name}</h3>
                    <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1rem;">
                        ${store.getStopById(route.origin_stop_id).name} → ${store.getStopById(route.destination_stop_id).name}
                    </p>
                    <div style="background: var(--bg-page); padding: 0.75rem; border-radius: 6px;">
                        <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); margin-right: 0.5rem;">VIA</span>
                        <span style="font-weight: 500; font-size: 0.9rem;">${route.via_description}</span>
                    </div>
                </div>
                
                <div class="timeline" style="background: var(--bg-card); padding: 1.5rem; border-radius: var(--border-radius); box-shadow: var(--shadow-sm);">
        `;

        routeStops.forEach((rs, index) => {
            const stop = store.getStopById(rs.stop_id);
            const timing = store.getStopTimes().find(st => st.trip_id === trip.id && st.stop_id === stop.id);
            const timeStr = timing ? this.formatTime(timing.arrival_time) : '--:--';

            const isLast = index === routeStops.length - 1;

            html += `
                <div style="display: flex; gap: 1rem; margin-bottom: ${isLast ? '0' : '1.5rem'}; position: relative;">
                    ${!isLast ? '<div style="position: absolute; left: 0.45rem; top: 1.5rem; bottom: -1rem; width: 2px; background: var(--border-color);"></div>' : ''}
                    <div style="width: 1rem; height: 1rem; border-radius: 50%; background: var(--primary); margin-top: 0.25rem; z-index: 1;"></div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600;">${stop.name}</div>
                        <div style="color: var(--text-muted); font-size: 0.9rem;">${timeStr}</div>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
        this.mainContent.innerHTML = html;
    }

}

// Initialize App on DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
