class TimetableParser {
    
    /**
     * Parses raw OCR text into structured timetable data.
     * @param {string} rawText - The text output from OCR.
     * @returns {Object} Structured timetable data.
     */
    parse(rawText) {
        if (!rawText) return null;

        const lines = rawText.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        if (lines.length < 3) {
            throw new Error('Not enough text found to constitute a timetable.');
        }

        // We assume the first line is the bus name.
        // It might be messy, but the admin can edit it.
        const busName = lines[0];

        const stops = [];
        let order = 1;

        // Regex to detect times: e.g. 08:15, 8.15, 8:15 AM, 20:15, 0815 (Added 'g' flag for multiple matches)
        const timeRegex = /(0?[0-9]|1[0-9]|2[0-3])[:. ]?([0-5][0-9])(?:\s*([AaPp]\.?[Mm]\.?))?/g;

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            const timeMatches = [...line.matchAll(timeRegex)];

            if (timeMatches && timeMatches.length > 0) {
                // Just take the first time for the primary trip
                const firstTimeMatch = timeMatches[0];
                let extractedTime = firstTimeMatch[0];
                
                // Format the time slightly to ensure HH:MM format for the input[type=time]
                let hours = firstTimeMatch[1];
                const minutes = firstTimeMatch[2];
                const ampm = firstTimeMatch[3] ? firstTimeMatch[3].toUpperCase().replace(/\./g, '') : null;
                
                // Convert 12-hour AM/PM to 24-hour if necessary for input[type=time]
                if (ampm) {
                    let h = parseInt(hours, 10);
                    if (ampm === 'PM' && h < 12) h += 12;
                    if (ampm === 'AM' && h === 12) h = 0;
                    hours = h.toString().padStart(2, '0');
                } else if (hours.length === 1) {
                    hours = '0' + hours; // zero pad
                }
                
                const formattedTime = `${hours}:${minutes}`;

                // Extract stop name by removing ALL matched times from the line
                let rawStopName = line;
                timeMatches.forEach(match => {
                    rawStopName = rawStopName.replace(match[0], '');
                });

                // Remove non-alphabetical characters (handles table borders like | or dashes)
                rawStopName = rawStopName.replace(/[^a-zA-Z\s]/g, '').trim();

                if (rawStopName.length > 1) {
                    // Try to match the stop
                    const matchedStop = window.store.getStopByNameOrAlias(rawStopName);
                    
                    stops.push({
                        id: 'parsed_' + Date.now() + '_' + order, // temp ID for UI tracking
                        rawName: rawStopName,
                        canonicalName: matchedStop ? matchedStop.name : rawStopName,
                        canonicalId: matchedStop ? matchedStop.id : null,
                        warning: !matchedStop, // true if it needs human verification
                        time: formattedTime,
                        order: order
                    });
                    
                    order++;
                }
            }
        }

        if (stops.length < 2) {
            throw new Error('Could not identify at least two valid stops and timings in the text.');
        }

        return {
            busName: busName,
            operator: 'Unknown',
            origin: stops[0].canonicalName || stops[0].rawName,
            destination: stops[stops.length - 1].canonicalName || stops[stops.length - 1].rawName,
            stops: stops
        };
    }
}

window.timetableParser = new TimetableParser();
