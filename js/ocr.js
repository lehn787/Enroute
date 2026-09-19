class OCRService {
    constructor() {
        this.tesseract = window.Tesseract;
    }

    /**
     * Preprocesses an image to improve OCR accuracy and extracts text using Tesseract.js.
     * @param {File} file - The uploaded image file.
     * @param {Function} progressCallback - Callback for logging progress (status string).
     * @returns {Promise<string>} The raw extracted text.
     */
    async extractText(file, progressCallback) {
        if (!this.tesseract) {
            throw new Error('Tesseract.js library not loaded.');
        }

        progressCallback('Reading image file...');
        const imageUrl = URL.createObjectURL(file);

        try {
            // Optional: Image preprocessing could go here. 
            // For hackathon simplicity and browser performance, Tesseract handles basic contrast well natively.
            // Advanced preprocessing (grayscale, contrast thresholding via Canvas) can be added if accuracy drops.

            progressCallback('Initializing OCR engine...');
            
            // We use the simpler recognize API for Tesseract.js v5
            progressCallback('Extracting text (this may take a few seconds)...');
            const result = await this.tesseract.recognize(
                imageUrl,
                'eng',
                {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            const p = Math.round(m.progress * 100);
                            progressCallback(`Extracting text... ${p}%`);
                        }
                    }
                }
            );

            progressCallback('Text extraction complete.');
            return result.data.text;
            
        } catch (error) {
            console.error('OCR Error:', error);
            throw new Error('Failed to extract text from the image. Please try a clearer image.');
        } finally {
            URL.revokeObjectURL(imageUrl);
        }
    }
}

window.ocrService = new OCRService();
