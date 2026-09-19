// Initial Mock Data representing the requested schema
window.initialData = {
    buses: [
        { id: 'b1', name: 'St. Antony', operator: 'Private', type: 'Private', status: 'active' },
        { id: 'b2', name: 'Mary Matha', operator: 'Private', type: 'Private', status: 'active' },
        { id: 'b3', name: 'KSRTC Swift', operator: 'KSRTC', type: 'KSRTC', status: 'active' }
    ],
    stops: [
        { id: 's1', name: 'Aluva', area: 'Aluva', status: 'active' },
        { id: 's2', name: 'Edappally', area: 'Kochi', status: 'active' },
        { id: 's3', name: 'Palarivattom', area: 'Kochi', status: 'active' },
        { id: 's4', name: 'Kaloor', area: 'Kochi', status: 'active' },
        { id: 's5', name: 'Menaka', area: 'Kochi', status: 'active' },
        { id: 's6', name: 'Kalamassery', area: 'Kochi', status: 'active' },
        { id: 's7', name: 'Vytilla', area: 'Kochi', status: 'active' },
        { id: 's8', name: 'Thevara', area: 'Kochi', status: 'active' },
        { id: 's9', name: 'Ernakulam', area: 'Kochi', status: 'active' }
    ],
    aliases: [
        { id: 'a1', alias: 'Alwaye', stop_id: 's1' },
        { id: 'a2', alias: 'Aluva Bus Stand', stop_id: 's1' },
        { id: 'a3', alias: 'Edapally', stop_id: 's2' },
        { id: 'a4', alias: 'Vyttila', stop_id: 's7' }
    ],
    routes: [
        { id: 'r1', bus_id: 'b1', origin_stop_id: 's1', destination_stop_id: 's5', via_description: 'Edappally • Palarivattom • MG Road', status: 'active' },
        { id: 'r2', bus_id: 'b2', origin_stop_id: 's1', destination_stop_id: 's5', via_description: 'Kalamassery • Vytilla • Thevara', status: 'active' },
        { id: 'r3', bus_id: 'b3', origin_stop_id: 's1', destination_stop_id: 's9', via_description: 'Edappally • Palarivattom', status: 'active' }
    ],
    route_stops: [
        // St Antony (Aluva -> Edappally -> Palarivattom -> Kaloor -> Menaka)
        { route_id: 'r1', stop_id: 's1', stop_order: 1 },
        { route_id: 'r1', stop_id: 's2', stop_order: 2 },
        { route_id: 'r1', stop_id: 's3', stop_order: 3 },
        { route_id: 'r1', stop_id: 's4', stop_order: 4 },
        { route_id: 'r1', stop_id: 's5', stop_order: 5 },
        // Mary Matha (Aluva -> Kalamassery -> Vytilla -> Thevara -> Menaka)
        { route_id: 'r2', stop_id: 's1', stop_order: 1 },
        { route_id: 'r2', stop_id: 's6', stop_order: 2 },
        { route_id: 'r2', stop_id: 's7', stop_order: 3 },
        { route_id: 'r2', stop_id: 's8', stop_order: 4 },
        { route_id: 'r2', stop_id: 's5', stop_order: 5 },
        // KSRTC Swift (Aluva -> Edappally -> Palarivattom -> Ernakulam)
        { route_id: 'r3', stop_id: 's1', stop_order: 1 },
        { route_id: 'r3', stop_id: 's2', stop_order: 2 },
        { route_id: 'r3', stop_id: 's3', stop_order: 3 },
        { route_id: 'r3', stop_id: 's9', stop_order: 4 }
    ],
    trips: [
        { id: 't1', route_id: 'r1', day_type: 'everyday', status: 'active' },
        { id: 't2', route_id: 'r2', day_type: 'everyday', status: 'active' },
        { id: 't3', route_id: 'r3', day_type: 'everyday', status: 'active' }
    ],
    stop_times: [
        // St. Antony Timings
        { trip_id: 't1', stop_id: 's1', arrival_time: '08:15', departure_time: '08:15' },
        { trip_id: 't1', stop_id: 's2', arrival_time: '08:27', departure_time: '08:27' },
        { trip_id: 't1', stop_id: 's3', arrival_time: '08:36', departure_time: '08:36' },
        { trip_id: 't1', stop_id: 's4', arrival_time: '08:47', departure_time: '08:47' },
        { trip_id: 't1', stop_id: 's5', arrival_time: '08:58', departure_time: '08:58' },
        // Mary Matha Timings
        { trip_id: 't2', stop_id: 's1', arrival_time: '08:30', departure_time: '08:30' },
        { trip_id: 't2', stop_id: 's6', arrival_time: '08:45', departure_time: '08:45' },
        { trip_id: 't2', stop_id: 's7', arrival_time: '08:55', departure_time: '08:55' },
        { trip_id: 't2', stop_id: 's8', arrival_time: '09:05', departure_time: '09:05' },
        { trip_id: 't2', stop_id: 's5', arrival_time: '09:15', departure_time: '09:15' },
        // KSRTC Swift Timings
        { trip_id: 't3', stop_id: 's1', arrival_time: '08:40', departure_time: '08:40' },
        { trip_id: 't3', stop_id: 's2', arrival_time: '08:52', departure_time: '08:52' },
        { trip_id: 't3', stop_id: 's3', arrival_time: '09:02', departure_time: '09:02' },
        { trip_id: 't3', stop_id: 's9', arrival_time: '09:15', departure_time: '09:15' }
    ]
};
