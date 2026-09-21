class ImportApp {
    constructor() {
        this.container = document.getElementById('admin-main-content');
        this.currentData = null;
        this.rawText = '';
    }

    renderImportPage() {
        const html = `
            <div style="max-width: 800px; margin: 0 auto; padding-bottom: 3rem;" id="import-container">
                <div style="margin-bottom: 2rem;">
                    <h2 style="font-size: 1.75rem; font-weight: 800; margin-bottom: 0.5rem; color: var(--text-main); letter-spacing: -0.02em;">Import Printed Timetable</h2>
                    <p style="color: var(--text-muted); font-size: 0.875rem;">Convert a printed bus timetable into structured EnRoute data using OCR.</p>
                </div>

                <div id="upload-card" class="dashboard-card" style="padding: 4rem 2rem; text-align: center; border: 2px dashed var(--border-color); margin-bottom: 2rem; background: var(--bg-page);">
                    <div style="width: 64px; height: 64px; background: #e0e7ff; color: #4f46e5; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
                        <svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                    </div>
                    <h3 style="font-weight: 800; font-size: 1.25rem; margin-bottom: 0.5rem; color: var(--text-main);">Upload Timetable Image</h3>
                    <p style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 2rem;">Supported formats: JPG, PNG (Max 5MB)</p>
                    
                    <input type="file" id="timetable-file" accept="image/png, image/jpeg" style="display: none;">
                    <button class="btn btn-primary" style="padding: 0.75rem 2rem; border-radius: 8px;" onclick="document.getElementById('timetable-file').click()">Select File</button>
                    
                    <div id="file-info" class="hidden" style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--border-color); text-align: left; background: var(--bg-card); border-radius: 8px; padding: 1rem; border: 1px solid var(--border-color);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                            <div style="display: flex; align-items: center; gap: 0.75rem;">
                                <div style="background: #f1f5f9; padding: 0.5rem; border-radius: 4px; color: #475569;">
                                    <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                </div>
                                <span id="file-name" style="font-weight: 600; color: var(--text-main); font-size: 0.875rem;"></span>
                            </div>
                        </div>
                        <button id="extract-btn" class="btn btn-primary" style="width: 100%; padding: 0.75rem; border-radius: 8px;">Extract Data</button>
                    </div>
                </div>

                <div id="progress-card" class="hidden dashboard-card" style="padding: 3rem 2rem; text-align: center; margin-bottom: 2rem;">
                    <div class="spinner" style="margin: 0 auto 1.5rem; border-color: var(--primary) transparent var(--primary) transparent;"></div>
                    <h3 style="font-weight: 800; font-size: 1.25rem; margin-bottom: 0.5rem; color: var(--text-main);">Analyzing Image...</h3>
                    <p id="progress-text" style="color: var(--text-muted); font-size: 0.875rem; font-family: monospace;">Connecting to OCR engine...</p>
                </div>

                <div id="error-card" class="hidden" style="background: #fef2f2; border: 1px solid #fca5a5; padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;">
                        <div style="color: #b91c1c;">
                            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        </div>
                        <h3 style="color: #b91c1c; font-weight: 800; margin: 0;">Extraction Failed</h3>
                    </div>
                    <p id="error-text" style="color: #991b1b; font-size: 0.875rem; margin-bottom: 1.5rem; margin-left: 2.25rem;"></p>
                    
                    <details style="margin-bottom: 1.5rem; margin-left: 2.25rem; background: #fff; padding: 1rem; border-radius: 4px; border: 1px solid #fca5a5;">
                        <summary style="font-weight: 600; cursor: pointer; color: #b91c1c; font-size: 0.875rem; user-select: none;">View Raw OCR Text (Debug)</summary>
                        <pre id="error-raw-text" style="margin-top: 1rem; font-size: 0.75rem; font-family: monospace; white-space: pre-wrap; color: #7f1d1d; max-height: 200px; overflow-y: auto;"></pre>
                    </details>

                    <div style="margin-left: 2.25rem;">
                        <button class="btn" style="border: 1px solid #fca5a5; background: #fff; color: #b91c1c; font-weight: 600; padding: 0.5rem 1rem;" onclick="window.importApp.reset()">Try Another Image</button>
                    </div>
                </div>
            </div>
            
            <div id="review-container" class="hidden" style="max-width: 1000px; margin: 0 auto;"></div>
            <div id="success-container" class="hidden" style="max-width: 600px; margin: 0 auto; text-align: center; padding: 4rem 0;"></div>
        `;
        
        this.container.innerHTML = html;

        document.getElementById('timetable-file').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                document.getElementById('file-name').textContent = file.name;
                document.getElementById('file-info').classList.remove('hidden');
            }
        });

        document.getElementById('extract-btn').addEventListener('click', async () => {
            const file = document.getElementById('timetable-file').files[0];
            if (!file) return;

            document.getElementById('upload-card').classList.add('hidden');
            document.getElementById('progress-card').classList.remove('hidden');
            
            try {
                // 1. OCR
                this.rawText = await window.ocrService.extractText(file, (status) => {
                    document.getElementById('progress-text').textContent = status;
                });
                
                // 2. Parse
                document.getElementById('progress-text').textContent = 'Structuring timetable data...';
                this.currentData = window.timetableParser.parse(this.rawText);

                // 3. Render Review
                this.renderReviewView();
                
            } catch (err) {
                document.getElementById('progress-card').classList.add('hidden');
                document.getElementById('error-card').classList.remove('hidden');
                document.getElementById('error-text').textContent = err.message;
                
                const errorRawEl = document.getElementById('error-raw-text');
                if (errorRawEl) {
                    errorRawEl.textContent = this.rawText || 'No text extracted.';
                }
            }
        });
    }

    renderReviewView() {
        document.getElementById('import-container').classList.add('hidden');
        const container = document.getElementById('review-container');
        
        let stopsHtml = '';
        this.currentData.stops.forEach((stop, index) => {
            const warningHtml = stop.warning ? `<span title="Please verify this stop name" style="color: #b91c1c; font-weight: 700; margin-left: 0.5rem; font-size: 1rem;">⚠</span>` : '';
            const bg = stop.warning ? 'background: #fef2f2;' : 'background: transparent;';
            
            stopsHtml += `
                <div class="stop-row ocr-stop-row" data-id="${stop.id}" style="display: flex; gap: 1rem; align-items: center; padding: 1rem 1.5rem; border-bottom: 1px solid var(--border-color); ${bg}">
                    <div style="display: flex; align-items: center; flex: 2;">
                        <input type="text" class="stop-name-input form-control" value="${stop.canonicalName}" style="width: 100%;">
                        ${warningHtml}
                    </div>
                    <div style="flex: 1;">
                        <input type="time" class="stop-time-input form-control" value="${stop.time}" style="width: 100%; font-family: monospace;">
                    </div>
                    <div>
                        <button class="remove-stop-btn btn btn-outline-danger" style="padding: 0.25rem 0.5rem; line-height: 1;"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
                    </div>
                </div>
            `;
        });

        const html = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <h2 style="font-size: 1.75rem; font-weight: 800; color: var(--text-main); letter-spacing: -0.02em;">Review Extracted Timetable</h2>
            </div>
            
            <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 1.25rem; border-radius: 8px; margin-bottom: 2rem; color: #92400e; font-size: 0.875rem; box-shadow: var(--shadow-sm);">
                <div style="display: flex; gap: 0.75rem; align-items: flex-start;">
                    <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-top: 2px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    <div><strong>Please verify extracted information before saving.</strong><br>Fields marked with <span style="color: #b91c1c; font-weight: 700;">⚠</span> indicate lower confidence and need your attention.</div>
                </div>
            </div>

            <div class="dashboard-card" style="padding: 1.5rem; margin-bottom: 2rem;">
                <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-muted); margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">Route Details</h3>
                <div class="ocr-form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                    <div class="form-group">
                        <label>Bus Name</label>
                        <input type="text" id="review-bus-name" value="${this.currentData.busName}" class="form-control" style="font-weight: 600;">
                    </div>
                    <div class="form-group">
                        <label>Operator</label>
                        <input type="text" id="review-operator" value="${this.currentData.operator}" class="form-control">
                    </div>
                    <div class="form-group">
                        <label>Origin</label>
                        <input type="text" id="review-origin" value="${this.currentData.origin}" class="form-control">
                    </div>
                    <div class="form-group">
                        <label>Destination</label>
                        <input type="text" id="review-destination" value="${this.currentData.destination}" class="form-control">
                    </div>
                </div>
            </div>

            <div class="dashboard-card" style="padding: 0; overflow: hidden; margin-bottom: 2rem;">
                <div style="padding: 1rem 1.5rem; background: var(--bg-page); border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between;">
                    <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-muted); margin: 0; text-transform: uppercase; letter-spacing: 0.05em;">Timetable Stops</h3>
                </div>
                <div class="data-grid-header" style="padding: 0.75rem 1.5rem; background: var(--bg-page); border-bottom: 1px solid var(--border-color); display: flex; gap: 1rem; font-size: 0.75rem; font-weight: 700; color: var(--text-muted);">
                    <div style="flex: 2;">STOP NAME</div>
                    <div style="flex: 1;">ARRIVAL TIME</div>
                    <div style="width: 40px;"></div>
                </div>
                <div id="review-stops-list">
                    ${stopsHtml}
                </div>
                <div style="padding: 1.5rem; background: var(--bg-page); text-align: center;">
                    <button id="add-stop-btn" class="btn btn-outline-primary" style="padding: 0.5rem 1.5rem; border-radius: 6px; font-weight: 600;">+ Add Stop Row</button>
                </div>
            </div>
            
            <details style="margin-bottom: 3rem; background: var(--bg-page); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color);">
                <summary style="font-weight: 600; cursor: pointer; color: var(--primary); user-select: none;">View original extracted text</summary>
                <pre style="margin-top: 1rem; font-size: 0.75rem; font-family: monospace; white-space: pre-wrap; color: var(--text-muted);">${this.rawText}</pre>
            </details>

            <div style="display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 1rem; border-top: 1px solid var(--border-color); padding-top: 2rem; margin-bottom: 4rem;">
                <button class="btn btn-outline-primary" style="padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600;" onclick="window.importApp.reset()">Reject & Retry</button>
                <button id="approve-save-btn" class="btn btn-primary" style="padding: 0.75rem 2rem; border-radius: 8px; font-weight: 600;">Approve & Save to Database</button>
            </div>
        `;
        
        container.innerHTML = html;
        container.classList.remove('hidden');

        // Handle stop removal
        document.querySelectorAll('.remove-stop-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.stop-row').remove();
            });
        });

        // Handle Add Stop
        document.getElementById('add-stop-btn').addEventListener('click', () => {
            const list = document.getElementById('review-stops-list');
            const newRow = document.createElement('div');
            newRow.className = 'stop-row ocr-stop-row';
            newRow.style = 'display: flex; gap: 1rem; align-items: center; padding: 1rem 1.5rem; border-bottom: 1px solid var(--border-color); background: transparent;';
            newRow.innerHTML = `
                <div style="display: flex; align-items: center; flex: 2;">
                    <input type="text" class="stop-name-input form-control" placeholder="Stop Name" style="width: 100%;">
                </div>
                <div style="flex: 1;">
                    <input type="time" class="stop-time-input form-control" style="width: 100%; font-family: monospace;">
                </div>
                <div>
                    <button class="remove-stop-btn btn btn-outline-danger" style="padding: 0.25rem 0.5rem; line-height: 1;"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
                </div>
            `;
            
            // Add remove listener to new button
            newRow.querySelector('.remove-stop-btn').addEventListener('click', (e) => {
                e.target.closest('.stop-row').remove();
            });
            
            list.appendChild(newRow);
        });

        // Handle Approve
        document.getElementById('approve-save-btn').addEventListener('click', async () => {
            await this.handleApproveAndSave();
        });
    }

    async handleApproveAndSave() {
        const busName = document.getElementById('review-bus-name').value.trim();
        const operator = document.getElementById('review-operator').value.trim();
        const origin = document.getElementById('review-origin').value.trim();
        const dest = document.getElementById('review-destination').value.trim();

        const stopRows = document.querySelectorAll('.stop-row');
        const parsedStops = [];
        
        stopRows.forEach(row => {
            const name = row.querySelector('.stop-name-input').value.trim();
            const time = row.querySelector('.stop-time-input').value.trim();
            if (name && time) {
                parsedStops.push({ name, time });
            }
        });

        if (!busName || parsedStops.length < 2) {
            alert('Validation failed: Bus name and at least two stops are required.');
            return;
        }

        try {
            // 1. Resolve Bus
            let bus = window.store.getBusByName(busName);
            let busId;
            if (!bus) {
                busId = await window.store.addBus(busName, operator, 'Private');
            } else {
                busId = bus.id;
            }

            // 2. Resolve Stops
            const stopIds = [];
            const stopTimesData = [];
            let viaNames = [];
            
            for (let index = 0; index < parsedStops.length; index++) {
                const ps = parsedStops[index];
                let stop = window.store.getStopByNameOrAlias(ps.name);
                let stopId;
                if (!stop) {
                    stopId = await window.store.addStop(ps.name, 'Kochi'); // Default area
                } else {
                    stopId = stop.id;
                }
                
                stopIds.push(stopId);
                stopTimesData.push({ stop_id: stopId, time: ps.time });
                
                if (index > 0 && index < parsedStops.length - 1) {
                    viaNames.push(ps.name);
                }
            }

            const originId = stopIds[0];
            const destId = stopIds[stopIds.length - 1];
            const via = viaNames.slice(0, 3).join(' • '); // max 3 via stops

            // 3. Create Route (Assuming a new route entry for simplicity of hacking)
            // A more robust system would check if this exact route already exists.
            const routeId = await window.store.addRoute(busId, originId, destId, via);

            // 4. Create Route Stops
            await window.store.addRouteStops(routeId, stopIds);

            // 5. Create Trip
            const tripId = await window.store.addTrip(routeId);

            // 6. Create Stop Times
            await window.store.addStopTimes(tripId, stopTimesData);

            window.store.logActivity('OCR Timetable', `successfully imported ${parsedStops.length} stops for ${busName}`, 'info');

            this.renderSuccess(parsedStops.length);

        } catch (error) {
            console.error(error);
            alert('Failed to save to database: ' + error.message);
        }
    }

    renderSuccess(stopsCount) {
        document.getElementById('review-container').classList.add('hidden');
        const container = document.getElementById('success-container');
        
        container.innerHTML = `
            <div style="background: var(--bg-card); border-radius: 12px; box-shadow: var(--shadow-md); padding: 4rem 2rem; border: 1px solid var(--border-color);">
                <div style="width: 80px; height: 80px; background: #dcfce7; color: #166534; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
                    <svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <h2 style="font-weight: 800; font-size: 2rem; margin-bottom: 1rem; color: var(--text-main); letter-spacing: -0.02em;">Timetable imported successfully</h2>
                <p style="color: var(--text-muted); font-size: 1.1rem; margin-bottom: 3rem;"><strong>${stopsCount}</strong> stops and timings were successfully added to the database.</p>
                <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                    <button class="btn btn-outline-primary" style="padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600;" onclick="window.location.hash='#routes'">View Routes</button>
                    <button class="btn btn-primary" style="padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600;" onclick="window.importApp.reset()">Import Another Timetable</button>
                </div>
            </div>
        `;
        container.classList.remove('hidden');
    }

    reset() {
        this.currentData = null;
        this.rawText = '';
        this.renderImportPage();
    }
}

window.importApp = new ImportApp();
