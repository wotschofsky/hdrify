class HDRify {
  constructor() {
    this.currentImageData = null;
    this.originalImageUrl = null;
    this.originalFileName = null;
    this.processingTimeout = null;
    this.imageCache = new Map(); // Cache for processed images
    this.initializeElements();
    this.setupEventListeners();
  }

  initializeElements() {
    this.uploadArea = document.getElementById('uploadArea');
    this.imageInput = document.getElementById('imageInput');
    this.imageDisplay = document.getElementById('imageDisplay');
    this.resultImage = document.getElementById('resultImage');
    this.processingOverlay = document.getElementById('processingOverlay');
    this.hdrSlider = document.getElementById('hdrSlider');
    this.hdrValue = document.getElementById('hdrValue');
    this.controls = document.getElementById('controls');
    this.resetButton = document.getElementById('resetButton');
    this.downloadButton = document.getElementById('downloadButton');
    this.error = document.getElementById('error');
    this.errorMessage = document.getElementById('errorMessage');
  }

  setupEventListeners() {
    // Upload area interactions
    this.uploadArea.addEventListener('click', () => this.triggerFileInput());

    // Keyboard support for upload area
    this.uploadArea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.triggerFileInput();
      }
    });

    this.imageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.handleFile(file);
      }
    });

    // Drag and drop with better visual feedback
    this.uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadArea.classList.add('dragover');
    });

    this.uploadArea.addEventListener('dragleave', (e) => {
      if (!this.uploadArea.contains(e.relatedTarget)) {
        this.uploadArea.classList.remove('dragover');
      }
    });

    this.uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadArea.classList.remove('dragover');

      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        this.handleFile(file);
      } else {
        this.showError('Please drop a valid image file.');
      }
    });

    // HDR slider with improved feedback
    this.hdrSlider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      this.updateHdrValue(value);

      // Update download filename if download is enabled
      if (this.downloadButton.hasAttribute('href')) {
        let filename = `hdrified-image-${value}.png`;
        if (this.originalFileName) {
          const lastDotIndex = this.originalFileName.lastIndexOf('.');
          const nameWithoutExt = lastDotIndex > 0 ? this.originalFileName.substring(0, lastDotIndex) : this.originalFileName;
          filename = `${nameWithoutExt}-hdr-${value}.png`;
        }
        this.downloadButton.download = filename;
      }

      clearTimeout(this.processingTimeout);
      this.processingTimeout = setTimeout(() => {
        if (this.currentImageData) {
          this.processImage(value);
        }
      }, 250);
    });

    // Reset button
    this.resetButton.addEventListener('click', () => {
      this.reset();
    });

    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.currentImageData) {
        this.reset();
      }
    });
  }

  triggerFileInput() {
    this.imageInput.click();
  }

  updateHdrValue(value) {
    this.hdrValue.textContent = value.toFixed(1);

    // Add subtle visual feedback
    this.hdrValue.style.transform = 'scale(1.1)';
    setTimeout(() => {
      this.hdrValue.style.transform = 'scale(1)';
    }, 150);
  }

  handleFile(file) {
    // Validate file type
    const supportedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ];
    if (!supportedTypes.includes(file.type)) {
      this.showError(
        `Unsupported file format: ${
          file.type || 'unknown'
        }. Please upload JPEG, PNG, or WebP images.`
      );
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      this.showError(
        `File too large: ${(file.size / 1024 / 1024).toFixed(
          1
        )}MB. Maximum size is 10MB.`
      );
      return;
    }

    // Hide any existing errors
    this.hideError();

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target.result.split(',')[1];
      this.currentImageData = imageData;
      this.originalImageUrl = e.target.result;
      this.originalFileName = file.name;

      // Clear cache for new image
      this.imageCache.clear();

      // Smooth transition to image display
      this.transitionToImageView();

      const initialHdrValue = parseFloat(this.hdrSlider.value);
      this.processImage(initialHdrValue);
    };

    reader.onerror = () => {
      this.showError('Failed to read the image file.');
    };

    reader.readAsDataURL(file);
  }

  transitionToImageView() {
    // Fade out upload area and fade in image display
    this.uploadArea.style.opacity = '0';

    setTimeout(() => {
      this.uploadArea.style.display = 'none';
      this.imageDisplay.style.display = 'block';
      this.controls.style.display = 'flex';

      // Set initial state with original image, strong blur, and reduced opacity
      this.resultImage.src = this.originalImageUrl;
      this.resultImage.style.filter = 'blur(50px)';
      this.resultImage.style.opacity = '0.6';
      this.processingOverlay.style.display = 'flex';

      // Fade in new elements
      requestAnimationFrame(() => {
        this.imageDisplay.style.opacity = '1';
        this.controls.style.opacity = '1';
      });
    }, 150);
  }

  async processImage(hdrValue) {
    if (!this.currentImageData) return;

    // Check cache first
    const cacheKey = hdrValue.toFixed(1);
    if (this.imageCache.has(cacheKey)) {
      // Use cached result with instant transition
      const cachedImageData = this.imageCache.get(cacheKey);

      // Show original with strong blur and reduced opacity
      this.resultImage.src = this.originalImageUrl;
      this.resultImage.style.filter = 'blur(50px)';
      this.resultImage.style.opacity = '0.6';
      this.processingOverlay.style.display = 'none';

      // Instant transition to cached result
      this.resultImage.src = `data:image/png;base64,${cachedImageData}`;
      this.resultImage.style.filter = 'blur(0px)';
      this.resultImage.style.opacity = '1.0';

      // Enable download button for cached images
      this.enableDownload(cachedImageData);

      this.hideError();
      return;
    }

    // Show original image with very strong blur and reduced opacity during processing
    this.resultImage.src = this.originalImageUrl;
    this.resultImage.style.filter = 'blur(50px)';
    this.resultImage.style.opacity = '0.6';
    this.processingOverlay.style.display = 'flex';

    try {
      // Create URL-encoded form data for the upload endpoint
      const params = new URLSearchParams();
      params.append('image', this.currentImageData);
      params.append('hdr_value', hdrValue.toString());

      const response = await fetch('/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.image_data) {
        // Cache the result
        this.imageCache.set(cacheKey, result.image_data);

        // Hide processing overlay and instantly show clear processed image
        this.processingOverlay.style.display = 'none';
        this.resultImage.src = `data:image/png;base64,${result.image_data}`;
        this.resultImage.style.filter = 'blur(0px)';
        this.resultImage.style.opacity = '1.0';

        // Enable download button
        this.enableDownload(result.image_data);

        this.hideError();
      } else {
        this.showError(result.message || 'Failed to process image');
        this.fallbackToOriginal();
      }
    } catch (err) {
      this.showError('Network error: Could not connect to server');
      this.fallbackToOriginal();
    } finally {
      this.processingOverlay.style.display = 'none';
    }
  }

  fallbackToOriginal() {
    this.resultImage.src = this.originalImageUrl;
    this.resultImage.style.filter = 'blur(0px)';
    this.resultImage.style.opacity = '1.0';

    // Disable download button since we're showing original
    this.disableDownload();
  }

  enableDownload(imageData) {
    const hdrValue = this.hdrSlider.value;
    const dataUrl = `data:image/png;base64,${imageData}`;

    // Create filename based on original file name
    let filename = `hdrified-image-${hdrValue}.png`;
    if (this.originalFileName) {
      // Remove extension from original filename
      const lastDotIndex = this.originalFileName.lastIndexOf('.');
      const nameWithoutExt = lastDotIndex > 0 ? this.originalFileName.substring(0, lastDotIndex) : this.originalFileName;
      filename = `${nameWithoutExt}-hdr-${hdrValue}.png`;
    }

    // Set attributes
    this.downloadButton.setAttribute('href', dataUrl);
    this.downloadButton.setAttribute('download', filename);
  }

  disableDownload() {
    this.downloadButton.removeAttribute('href');
    this.downloadButton.removeAttribute('download');
  }

  reset() {
    // Clear data and cache
    this.currentImageData = null;
    this.originalImageUrl = null;
    this.originalFileName = null;
    this.imageCache.clear();
    this.imageInput.value = '';
    this.hdrSlider.value = '1.5';
    this.hdrValue.textContent = '1.5';

    // Disable download button
    this.disableDownload();

    // Clear timeout
    clearTimeout(this.processingTimeout);

    // Hide error
    this.hideError();

    // Smooth transition back to upload state
    this.imageDisplay.style.opacity = '0';
    this.controls.style.opacity = '0';

    setTimeout(() => {
      this.imageDisplay.style.display = 'none';
      this.controls.style.display = 'none';
      this.processingOverlay.style.display = 'none';

      this.uploadArea.style.display = 'flex';

      requestAnimationFrame(() => {
        this.uploadArea.style.opacity = '1';
      });
    }, 150);
  }

  showError(message) {
    this.errorMessage.textContent = message;
    this.error.style.display = 'block';
    this.error.style.opacity = '1';
  }

  hideError() {
    this.error.style.opacity = '0';
    setTimeout(() => {
      this.error.style.display = 'none';
    }, 200);
  }
}

// Initialize with smooth page load
document.addEventListener('DOMContentLoaded', () => {
  // Add subtle page load animation
  document.body.style.opacity = '0';

  requestAnimationFrame(() => {
    document.body.style.transition = 'opacity 0.3s ease';
    document.body.style.opacity = '1';
  });

  new HDRify();
});
