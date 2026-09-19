class Store {
    constructor() {
        this.data = {
            buses: [],
            stops: [],
            routes: [],
            route_stops: [],
            trips: [],
            stop_times: [],
            aliases: []
        };
        this.currentUserId = null;
        this.initialized = false;
    }

    async initializeData() {
        if (!window.authService || !window.authService.supabase) {
            console.warn('Supabase not configured, cannot load data.');
            return;
        }

        const supabase = window.authService.supabase;
        
        try {
            const session = await window.authService.getSession();
            this.currentUserId = session ? session.user.id : null;

            const [busesRes, stopsRes, routesRes, routeStopsRes, tripsRes, stopTimesRes, aliasesRes] = await Promise.all([
                supabase.from('buses').select('*'),
                supabase.from('stops').select('*'),
                supabase.from('routes').select('*'),
                supabase.from('route_stops').select('*'),
                supabase.from('trips').select('*'),
                supabase.from('stop_times').select('*'),
                supabase.from('aliases').select('*')
            ]);

            if (busesRes.error) console.error("Error loading buses", busesRes.error);
            if (stopsRes.error) console.error("Error loading stops", stopsRes.error);

            this.data = {
                buses: busesRes.data || [],
                stops: stopsRes.data || [],
                routes: routesRes.data || [],
                route_stops: routeStopsRes.data || [],
                trips: tripsRes.data || [],
                stop_times: stopTimesRes.data || [],
                aliases: aliasesRes.data || []
            };
            this.initialized = true;
        } catch (err) {
            console.error('Failed to initialize store data from Supabase', err);
        }
    }

    // Getters (Public Data)
    getBuses() { return this.data.buses; }
    getStops() { return this.data.stops; }
    getRoutes() { return this.data.routes; }
    getRouteStops() { return this.data.route_stops; }
    getTrips() { return this.data.trips; }
    getStopTimes() { return this.data.stop_times; }
    getAliases() { return this.data.aliases; }

    // Getters (Admin Private Data)
    getAdminBuses() { return this.data.buses.filter(b => b.created_by === this.currentUserId); }
    getAdminRoutes() { return this.data.routes.filter(r => r.created_by === this.currentUserId); }
    getAdminTrips() { return this.data.trips.filter(t => t.created_by === this.currentUserId); }
    
    getBusById(id) { return this.data.buses.find(b => b.id === id); }
    getStopById(id) { return this.data.stops.find(s => s.id === id); }
    getRouteById(id) { return this.data.routes.find(r => r.id === id); }

    getBusByName(name) {
        if (!name) return null;
        return this.data.buses.find(b => b.name.toLowerCase() === name.toLowerCase());
    }

    getStopByNameOrAlias(name) {
        if (!name) return null;
        const normalized = name.toLowerCase().trim();
        const exactStop = this.data.stops.find(s => s.name.toLowerCase() === normalized);
        if (exactStop) return exactStop;
        
        const alias = this.data.aliases.find(a => a.alias.toLowerCase() === normalized);
        if (alias) {
            return this.getStopById(alias.stop_id);
        }
        return null;
    }

    findBusesBetweenStops(originId, destinationId) {
        if (!originId || !destinationId || originId === destinationId) return [];

        const matchingTrips = [];
        const routes = this.getRoutes().filter(r => r.status === 'active');

        routes.forEach(route => {
            const routeStops = this.getRouteStops()
                .filter(rs => rs.route_id === route.id)
                .sort((a, b) => a.stop_order - b.stop_order);

            const originIndex = routeStops.findIndex(rs => rs.stop_id === originId);
            const destIndex = routeStops.findIndex(rs => rs.stop_id === destinationId);

            if (originIndex !== -1 && destIndex !== -1 && originIndex < destIndex) {
                const bus = this.getBusById(route.bus_id);
                if (!bus || bus.status !== 'active') return;

                const trips = this.getTrips().filter(t => t.route_id === route.id && t.status === 'active');

                trips.forEach(trip => {
                    const originTime = this.getStopTimes().find(st => st.trip_id === trip.id && st.stop_id === originId);
                    const destTime = this.getStopTimes().find(st => st.trip_id === trip.id && st.stop_id === destinationId);

                    if (originTime && destTime) {
                        matchingTrips.push({
                            bus: this.getBusById(route.bus_id),
                            route: route,
                            trip: trip,
                            originTime: originTime.departure_time,
                            destTime: destTime.arrival_time,
                            stops: routeStops
                        });
                    }
                });
            }
        });

        return matchingTrips.sort((a, b) => a.originTime.localeCompare(b.originTime));
    }

    searchBusesByName(query) {
        if (!query) return [];
        const q = query.toLowerCase();
        return this.getBuses().filter(b => b.status === 'active' && b.name.toLowerCase().includes(q));
    }

    findBusesAtStop(stopId) {
        if (!stopId) return [];
        const routesThroughStop = this.getRouteStops().filter(rs => rs.stop_id === stopId).map(rs => rs.route_id);
        const matchingBuses = [];

        const activeTrips = this.getTrips().filter(t => t.status === 'active');
        activeTrips.forEach(trip => {
            if (routesThroughStop.includes(trip.route_id)) {
                const stopTime = this.getStopTimes().find(st => st.trip_id === trip.id && st.stop_id === stopId);
                if (stopTime) {
                    const route = this.getRouteById(trip.route_id);
                    const bus = this.getBusById(route.bus_id);
                    if (bus && bus.status === 'active') {
                        matchingBuses.push({
                            bus: bus,
                            route: route,
                            trip: trip,
                            arrivalTime: stopTime.arrival_time
                        });
                    }
                }
            }
        });

        return matchingBuses.sort((a, b) => a.arrivalTime.localeCompare(b.arrivalTime));
    }

    // --- ADMIN ASYNC CRUD ---

    async updateStopTime(tripId, stopId, newTime) {
        const timeEntry = this.data.stop_times.find(st => st.trip_id === tripId && st.stop_id === stopId);
        if (timeEntry) {
            timeEntry.arrival_time = newTime;
            timeEntry.departure_time = newTime;
            
            await window.authService.supabase.from('stop_times')
                .update({ arrival_time: newTime, departure_time: newTime })
                .eq('trip_id', tripId)
                .eq('stop_id', stopId);
        }
    }

    async addBus(name, operator, type, status = 'active') {
        if (!this.currentUserId) throw new Error("Not authenticated");
        const id = 'b_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const newBus = { id, name, operator, type, status, created_by: this.currentUserId };
        
        const { error } = await window.authService.supabase.from('buses').insert([newBus]);
        if (error) throw error;
        
        this.data.buses.push(newBus);
        return id;
    }

    getBusRelatedDataCounts(busId) {
        const routes = this.data.routes.filter(r => r.bus_id === busId);
        const routeIds = routes.map(r => r.id);
        
        const routeStops = this.data.route_stops.filter(rs => routeIds.includes(rs.route_id));
        const trips = this.data.trips.filter(t => routeIds.includes(t.route_id));
        const tripIds = trips.map(t => t.id);
        
        const stopTimes = this.data.stop_times.filter(st => tripIds.includes(st.trip_id));
        
        return {
            routes: routes.length,
            routeStops: routeStops.length,
            trips: trips.length,
            stopTimes: stopTimes.length
        };
    }

    async deleteBus(busId) {
        if (!this.currentUserId) throw new Error("Not authenticated");
        
        const { error } = await window.authService.supabase.from('buses').delete().eq('id', busId);
        if (error) throw error;

        this.data.buses = this.data.buses.filter(b => b.id !== busId);
        
        const routeIds = this.data.routes.filter(r => r.bus_id === busId).map(r => r.id);
        this.data.routes = this.data.routes.filter(r => r.bus_id !== busId);
        this.data.route_stops = this.data.route_stops.filter(rs => !routeIds.includes(rs.route_id));
        
        const tripIds = this.data.trips.filter(t => routeIds.includes(t.route_id)).map(t => t.id);
        this.data.trips = this.data.trips.filter(t => !routeIds.includes(t.route_id));
        this.data.stop_times = this.data.stop_times.filter(st => !tripIds.includes(st.trip_id));
    }

    async updateBus(id, updates) {
        const { error } = await window.authService.supabase.from('buses').update(updates).eq('id', id);
        if (error) throw error;
        
        const bus = this.getBusById(id);
        if (bus) Object.assign(bus, updates);
    }

    async addStop(name, area) {
        const id = 's_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const newStop = { id, name, area, status: 'active' };
        
        const { error } = await window.authService.supabase.from('stops').insert([newStop]);
        if (error) throw error;
        
        this.data.stops.push(newStop);
        return id;
    }

    async updateStop(id, updates) {
        const { error } = await window.authService.supabase.from('stops').update(updates).eq('id', id);
        if (error) throw error;
        
        const stop = this.getStopById(id);
        if (stop) Object.assign(stop, updates);
    }

    async updateStopAliases(stopId, newAliasList) {
        // First delete all existing aliases for this stop
        const { error: delError } = await window.authService.supabase.from('aliases').delete().eq('stop_id', stopId);
        if (delError) throw delError;

        // Insert new aliases
        if (newAliasList && newAliasList.length > 0) {
            const records = newAliasList.map(a => ({
                stop_id: stopId,
                alias: a.trim()
            }));
            const { error: insError } = await window.authService.supabase.from('aliases').insert(records);
            if (insError) throw insError;
        }

        // Update local store
        this.data.aliases = this.data.aliases.filter(a => a.stop_id !== stopId);
        if (newAliasList && newAliasList.length > 0) {
            newAliasList.forEach(a => {
                this.data.aliases.push({ stop_id: stopId, alias: a.trim() });
            });
        }
    }

    async deleteStop(stopId) {
        const { error } = await window.authService.supabase.from('stops').delete().eq('id', stopId);
        if (error) throw error;
        await this.initializeData();
    }

    async deleteMultipleStops(stopIds) {
        if (!stopIds || stopIds.length === 0) return;
        const { error } = await window.authService.supabase.from('stops').delete().in('id', stopIds);
        if (error) throw error;
        await this.initializeData();
    }

    async addRoute(busId, originId, destId, via = '') {
        if (!this.currentUserId) throw new Error("Not authenticated");
        const id = 'r_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const newRoute = {
            id,
            bus_id: busId,
            origin_stop_id: originId,
            destination_stop_id: destId,
            via_description: via,
            status: 'active',
            created_by: this.currentUserId
        };
        
        const { error } = await window.authService.supabase.from('routes').insert([newRoute]);
        if (error) throw error;
        
        this.data.routes.push(newRoute);
        return id;
    }

    async addRouteStops(routeId, stopIdsInOrder) {
        if (!this.currentUserId) throw new Error("Not authenticated");
        const newRouteStops = stopIdsInOrder.map((stopId, index) => ({
            route_id: routeId,
            stop_id: stopId,
            stop_order: index + 1,
            created_by: this.currentUserId
        }));
        
        const { error } = await window.authService.supabase.from('route_stops').insert(newRouteStops);
        if (error) throw error;
        
        this.data.route_stops.push(...newRouteStops);
    }

    async updateRouteStops(routeId, newStopIds) {
        if (!newStopIds || newStopIds.length < 2) return false;
        if (!this.currentUserId) throw new Error("Not authenticated");

        await window.authService.supabase.from('route_stops').delete().eq('route_id', routeId);
        
        const newRouteStops = newStopIds.map((stopId, index) => ({
            route_id: routeId,
            stop_id: stopId,
            stop_order: index + 1,
            created_by: this.currentUserId
        }));
        
        await window.authService.supabase.from('route_stops').insert(newRouteStops);

        const route = this.getRouteById(routeId);
        if (route) {
            const originId = newStopIds[0];
            const destId = newStopIds[newStopIds.length - 1];
            
            const viaStopIds = newStopIds.slice(1, -1).slice(0, 3);
            const viaNames = viaStopIds.map(id => {
                const s = this.getStopById(id);
                return s ? s.name : '';
            }).filter(n => n);
            const via = viaNames.join(' • ');

            await window.authService.supabase.from('routes').update({
                origin_stop_id: originId,
                destination_stop_id: destId,
                via_description: via
            }).eq('id', routeId);
        }

        await this.initializeData();
        return true;
    }

    async addTrip(routeId) {
        if (!this.currentUserId) throw new Error("Not authenticated");
        const id = 't_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const newTrip = {
            id,
            route_id: routeId,
            day_type: 'everyday',
            status: 'active',
            created_by: this.currentUserId
        };
        
        const { error } = await window.authService.supabase.from('trips').insert([newTrip]);
        if (error) throw error;
        
        this.data.trips.push(newTrip);
        return id;
    }

    async addStopTimes(tripId, stopTimesData) {
        if (!this.currentUserId) throw new Error("Not authenticated");
        const newStopTimes = stopTimesData.map(st => ({
            trip_id: tripId,
            stop_id: st.stop_id,
            arrival_time: st.time,
            departure_time: st.time,
            created_by: this.currentUserId
        }));
        
        const { error } = await window.authService.supabase.from('stop_times').insert(newStopTimes);
        if (error) throw error;
        
        this.data.stop_times.push(...newStopTimes);
    }
}

window.store = new Store();
