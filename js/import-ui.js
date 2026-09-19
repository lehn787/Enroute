class ImportApp {
    constructor() {
        this.container = document.getElementById('admin-main-content');
        this.currentData = null;
        this.rawText = '';
    }

    renderImportPage() {
        const html = `
            <div style="max-width: 800px; margin: 0 auto;" id="import-container">
                <div style="margin-bottom: 2rem;">
                    <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem;">Import Printed Timetable</h2>
                    <p style="color: var(--text-muted); font-size: 0.875rem;">Convert a printed bus timetable into structured EnRoute data.</p>
                </div>

                <div id="upload-card" style="background: var(--bg-card); border-radius: 8px; box-shadow: var(--shadow-sm); padding: 3rem; text-align: center; border: 2px dashed var(--border-color); margin-bottom: 2rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📄</div>
                    <h3 style="font-weight: 700; font-size: 1.25rem; margin-bottom: 0.5rem;">Upload timetable</h3>
                    <p style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 2rem;">JPG, PNG</p>
                    
                    <input type="file" id="timetable-file" accept="image/png, image/jpeg" style="display: none;">
                    <button class="btn btn-primary" onclick="document.getElementById('timetable-file').click()">Choose File</button>
                    
                    <div id="file-info" class="hidden" style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border-color);">
                        <p id="file-name" style="font-weight: 600; margin-bottom: 1rem;"></p>
                        <button id="extract-btn" class="btn btn-primary" style="width: 100%;">Extract Timetable</button>
                    </div>
                </div>

                <div id="progress-card" class="hidden" style="background: var(--bg-card); border-radius: 8px; box-shadow: var(--shadow-sm); padding: 2rem; text-align: center; margin-bottom: 2rem;">
                    <div class="spinner" style="margin: 0 auto 1.5rem; border-color: var(--primary) transparent var(--primary) transparent;"></div>
                    <h3 style="font-weight: 700; font-size: 1.1rem; margin-bottom: 0.5rem;">Processing Timetable</h3>
                    <p id="progress-text" style="color: var(--text-muted); font-size: 0.875rem; font-family: monospace;">Initializing...</p>
                </div>

                <div id="error-card" class="hidden" style="background: #fee2e2; border-left: 4px solid #b91c1c; padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem;">
                    <h3 style="color: #b91c1c; font-weight: 700; margin-bottom: 0.5rem;">Import Failed</h3>
                    <p id="error-text" style="color: #991b1b; font-size: 0.875rem; margin-bottom: 1rem;"></p>
                    
                    <details style="margin-bottom: 1.5rem; background: #fff; padding: 1rem; border-radius: 4px; border: 1px solid #f87171;">
                        <summary style="font-weight: 600; cursor: pointer; color: #b91c1c; font-size: 0.875rem;">View Raw OCR Text (Debug)</summary>
                        <pre id="error-raw-text" style="margin-top: 1rem; font-size: 0.75rem; font-family: monospace; white-space: pre-wrap; color: #7f1d1d; max-height: 200px; overflow-y: auto;"></pre>
                    </details>

                    <button class="btn" style="border: 1px solid #b91c1c; color: #b91c1c;" onclick="window.importApp.reset()">Try Again</button>
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
                <div class="stop-row ocr-stop-row" data-id="${stop.id}" style="display: flex; gap: 1rem; align-items: center; padding: 0.75rem 1rem; border-bottom: 1px solid var(--border-color); ${bg}">
                    <div style="display: flex; align-items: center;">
                        <input type="text" class="stop-name-input" value="${stop.canonicalName}" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px;">
                        ${warningHtml}
                    </div>
                    <div>
                        <input type="time" class="stop-time-input" value="${stop.time}" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; font-family: monospace;">
                    </div>
                    <div>
                        <button class="remove-stop-btn btn" style="padding: 0.25rem 0.5rem; color: #b91c1c; border: 1px solid #fca5a5;">✕</button>
                    </div>
                </div>
            `;
        });

        const html = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <h2 style="font-size: 1.5rem; font-weight: 700;">Review Extracted Timetable</h2>
            </div>
            
            <div style="background: #fffbeb; border-left: 4px solid #d97706; padding: 1rem; border-radius: 8px; margin-bottom: 2rem; color: #92400e; font-size: 0.875rem;">
                <strong>Please verify extracted information before saving.</strong> Fields marked with ⚠ need your attention.
            </div>

            <div class="ocr-form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem;">
                <div class="form-group">
                    <label style="display: block; font-size: 0.75rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text-muted);">BUS NAME</label>
                    <input type="text" id="review-bus-name" value="${this.currentData.busName}" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 4px; font-weight: 600;">
                </div>
                <div class="form-group">
                    <label style="display: block; font-size: 0.75rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text-muted);">OPERATOR</label>
                    <input type="text" id="review-operator" value="${this.currentData.operator}" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 4px;">
                </div>
                <div class="form-group">
                    <label style="display: block; font-size: 0.75rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text-muted);">ORIGIN</label>
                    <input type="text" id="review-origin" value="${this.currentData.origin}" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 4px;">
                </div>
                <div class="form-group">
                    <label style="display: block; font-size: 0.75rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text-muted);">DESTINATION</label>
                    <input type="text" id="review-destination" value="${this.currentData.destination}" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 4px;">
                </div>
            </div>

            <div style="background: var(--bg-card); border-radius: 8px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color); margin-bottom: 2rem; overflow: hidden;">
                <div class="data-grid-header" style="padding: 1rem 1.5rem; background: var(--bg-page); border-bottom: 1px solid var(--border-color); display: grid; grid-template-columns: 2fr 1fr 40px; gap: 1rem; font-size: 0.75rem; font-weight: 700; color: var(--text-muted);">
                    <div>STOP</div>
                    <div>TIME</div>
                    <div></div>
                </div>
                <div id="review-stops-list">
                    ${stopsHtml}
                </div>
                <div style="padding: 1rem;">
                    <button class="btn" style="border: 1px dashed var(--border-color); width: 100%; color: var(--text-muted);">+ Add Stop</button>
                </div>
            </div>
            
            <details style="margin-bottom: 3rem; background: var(--bg-page); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color);">
                <summary style="font-weight: 600; cursor: pointer; color: var(--primary);">View extracted text</summary>
                <pre style="margin-top: 1rem; font-size: 0.875rem; font-family: monospace; white-space: pre-wrap; color: var(--text-muted);">${this.rawText}</pre>
            </details>

            <div style="display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 1rem; border-top: 1px solid var(--border-color); padding-top: 2rem; margin-bottom: 4rem;">
                <button class="btn" style="border: 1px solid var(--border-color); flex: 1; min-width: max-content;" onclick="window.importApp.reset()">Reject Import</button>
                <button id="approve-save-btn" class="btn btn-primary" style="padding: 0.75rem 2rem; flex: 1; min-width: max-content;">Approve & Save</button>
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
            <div style="width: 80px; height: 80px; background: #dcfce7; color: #166534; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; margin: 0 auto 2rem;">✓</div>
            <h2 style="font-weight: 800; font-size: 2rem; margin-bottom: 1rem;">Timetable imported successfully</h2>
            <p style="color: var(--text-muted); font-size: 1.1rem; margin-bottom: 3rem;">${stopsCount} stops and timings were added to the database.</p>
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button class="btn" style="border: 1px solid var(--border-color); padding: 0.75rem 1.5rem;" onclick="window.location.hash='#routes'">View Routes</button>
                <button class="btn btn-primary" style="padding: 0.75rem 1.5rem;" onclick="window.importApp.reset()">Import Another Timetable</button>
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
