class PersonaVerification {
    constructor() {
        // Initialize elements
        this.form = document.getElementById('verificationForm');
        this.steps = document.querySelectorAll('.form-step');
        this.nextButtons = document.querySelectorAll('.next-step');
        this.prevButtons = document.querySelectorAll('.prev-step');
        this.currentStep = 1;
        
        // Message elements
        this.successDiv = document.getElementById('successDiv');
        this.errorDiv = document.getElementById('errorDiv');
        this.loadingDiv = document.getElementById('loadingDiv');
        this.loadingMessage = document.getElementById('loadingMessage');
        
        // Camera elements
        this.videoInput = document.getElementById('videoInput');
        this.captureCanvas = document.getElementById('captureCanvas');
        this.captureBtn = document.getElementById('captureBtn');
        
        // Results modal
        this.resultsModal = new bootstrap.Modal(document.getElementById('resultsModal'));
        this.resultsModalBody = document.getElementById('resultsModalBody');
        
        // Initialize selfies object
        this.selfies = {
            front: null,
            left: null,
            right: null
        };
        
        this.governmentId = null;
        this.stream = null;
        
        // Initialize event listeners
        this.initializeEventListeners();
        this.initializeFileUpload();
    }
    
    initializeEventListeners() {
        // Form submission
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleSubmit();
        });
        
        // Next button clicks
        this.nextButtons.forEach(button => {
            button.addEventListener('click', () => this.nextStep());
        });
        
        // Previous button clicks
        this.prevButtons.forEach(button => {
            button.addEventListener('click', () => this.prevStep());
        });
        
        // Capture button click
        const captureBtn = document.getElementById('captureBtn');
        if (captureBtn) {
            captureBtn.addEventListener('click', () => this.captureSelfie());
        }

        // Initialize capture boxes
        const captureBoxes = document.querySelectorAll('.capture-box');
        captureBoxes.forEach(box => {
            box.addEventListener('click', () => {
                // Remove active class from all boxes
                captureBoxes.forEach(b => b.classList.remove('active'));
                // Add active class to clicked box
                box.classList.add('active');
            });
        });

        // Set front view as default active
        const frontBox = document.querySelector('.capture-box[data-angle="front"]');
        if (frontBox) {
            frontBox.classList.add('active');
        }
        
        // Verify button click
        const verifyButton = document.getElementById('verifyButton');
        if (verifyButton) {
            verifyButton.addEventListener('click', () => this.verifyIdentity());
        }
    }

    initializeFileUpload() {
        const uploadBox = document.getElementById('govIdUploadBox');
        const fileInput = document.getElementById('govIdUpload');
        const previewDiv = document.getElementById('govIdPreview');

        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadBox.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        // Add visual feedback
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadBox.addEventListener(eventName, () => {
                uploadBox.classList.add('highlight');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadBox.addEventListener(eventName, () => {
                uploadBox.classList.remove('highlight');
            });
        });

        // Handle dropped files
        uploadBox.addEventListener('drop', (e) => {
            const file = e.dataTransfer.files[0];
            if (file) {
                this.handleFileUpload(file);
            }
        });

        // Handle file input change
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleFileUpload(file);
            }
        });

        // Handle click to upload
        uploadBox.addEventListener('click', () => {
            fileInput.click();
        });
    }

    handleFileUpload(file) {
        const previewDiv = document.getElementById('govIdPreview');
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showError('Please upload an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            this.showError('File size too large. Maximum size is 5MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            // Store the base64 data
            this.governmentId = e.target.result;
            
            // Show preview
            previewDiv.innerHTML = `
                <div class="position-relative">
                    <img src="${e.target.result}" class="img-fluid rounded" alt="ID Preview">
                    <button type="button" class="btn btn-sm btn-danger position-absolute top-0 end-0 m-2" 
                            onclick="document.getElementById('govIdUpload').value = ''; 
                                    document.getElementById('govIdPreview').innerHTML = '';">
                        <i class="bi bi-x"></i>
                    </button>
                </div>
            `;
            
            // Show success message
            this.showSuccess('Document uploaded successfully');
            
            // Update upload box
            const uploadBox = document.getElementById('govIdUploadBox');
            uploadBox.classList.add('uploaded');
        };

        reader.onerror = () => {
            this.showError('Error reading file. Please try again.');
        };

        reader.readAsDataURL(file);
    }
    
    async initCamera() {
        try {
            // Request camera access with specific constraints
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                },
                audio: false
            });
            
            // Store the stream and set up video element
            this.stream = stream;
            this.videoInput.srcObject = stream;
            
            // Wait for video to be loaded
            await new Promise((resolve) => {
                this.videoInput.onloadedmetadata = () => {
                    this.videoInput.play().then(resolve);
                };
            });
            
            // Show success message
            this.showSuccess('Camera initialized successfully');
            
            // Show camera container
            const cameraContainer = document.querySelector('.camera-container');
            if (cameraContainer) {
                cameraContainer.style.display = 'block';
            }
            
        } catch (error) {
            console.error('Camera initialization error:', error);
            const errorMessage = this.getCameraErrorMessage(error);
            this.showError(errorMessage);

            // Show error in camera container
            const cameraContainer = document.querySelector('.camera-container');
            if (cameraContainer) {
                cameraContainer.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        ${errorMessage}
                    </div>
                `;
            }
        }
    }
    
    getCameraErrorMessage(error) {
        switch (error.name) {
            case 'NotAllowedError':
                return 'Camera access denied. Please allow camera access in your browser settings.';
            case 'NotFoundError':
                return 'No camera found. Please connect a camera and try again.';
            case 'NotReadableError':
                return 'Camera is in use by another application. Please close other apps using the camera.';
            default:
                return `Camera error: ${error.message}`;
        }
    }
    
    nextStep() {
        if (this.currentStep < 3) {
            document.querySelector(`[data-step="${this.currentStep}"]`).classList.remove('active');
            this.steps[this.currentStep - 1].classList.add('d-none');
            
            this.currentStep++;
            
            document.querySelector(`[data-step="${this.currentStep}"]`).classList.add('active');
            this.steps[this.currentStep - 1].classList.remove('d-none');
            
            // Initialize camera on step 3
            if (this.currentStep === 3) {
                this.initCamera();
            }
        }
    }
    
    prevStep() {
        if (this.currentStep > 1) {
            document.querySelector(`[data-step="${this.currentStep}"]`).classList.remove('active');
            this.steps[this.currentStep - 1].classList.add('d-none');
            
            this.currentStep--;
            
            document.querySelector(`[data-step="${this.currentStep}"]`).classList.add('active');
            this.steps[this.currentStep - 1].classList.remove('d-none');
        }
    }
    
    validateCurrentStep() {
        const currentStepElement = this.steps[this.currentStep - 1];
        const inputs = currentStepElement.querySelectorAll('input[required]');
        let isValid = true;
        
        inputs.forEach(input => {
            if (!input.value) {
                isValid = false;
                input.classList.add('is-invalid');
            } else {
                input.classList.remove('is-invalid');
            }
        });
        
        return isValid;
    }
    
    async startCamera() {
        // Add camera UI elements if they don't exist
        if (!document.getElementById('cameraError')) {
            const errorDiv = document.createElement('div');
            errorDiv.id = 'cameraError';
            errorDiv.className = 'alert alert-danger d-none';
            document.getElementById('cameraContainer').before(errorDiv);
        }

        await this.initCamera();

        // Add event listener for visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Stop camera when tab is not visible
                if (this.stream) {
                    this.stream.getTracks().forEach(track => track.stop());
                }
            } else {
                // Restart camera when tab becomes visible
                this.initCamera();
            }
        });
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
            this.videoInput.srcObject = null;
        }
    }
    
    captureSelfie() {
        try {
            // Get the active capture box
            const activeBox = document.querySelector('.capture-box.active');
            if (!activeBox) {
                this.showError('Please select a capture angle (Front, Left, or Right)');
                return;
            }

            const angle = activeBox.dataset.angle;
            
            // Set up canvas
            const context = this.captureCanvas.getContext('2d');
            this.captureCanvas.width = this.videoInput.videoWidth;
            this.captureCanvas.height = this.videoInput.videoHeight;
            
            // Draw the video frame to the canvas
            context.save();
            context.scale(-1, 1); // Flip horizontally
            context.translate(-this.captureCanvas.width, 0);
            context.drawImage(this.videoInput, 0, 0);
            context.restore();
            
            // Convert to base64
            const imageData = this.captureCanvas.toDataURL('image/jpeg', 0.8);
            
            // Update preview and store data
            const img = activeBox.querySelector('img');
            if (img) {
                img.src = imageData;
                this.selfies[angle] = imageData;
                
                // Add captured class
                activeBox.classList.add('captured');
                
                // Show success message
                this.showSuccess(`${angle} view captured successfully!`);
                
                // Check if we have all required selfies
                if (this.selfies.front) {
                    // Enable verification if we have at least the front view
                    const verifyBtn = document.getElementById('verifyButton');
                    if (verifyBtn) {
                        verifyBtn.disabled = false;
                    }
                }
            }
        } catch (error) {
            console.error('Error capturing selfie:', error);
            this.showError('Failed to capture photo. Please try again.');
        }
    }
    
    async verifyIdentity() {
        try {
            this.showLoading('Verifying your identity...');
            
            // Create form data
            const formData = new FormData();
            
            // Add government ID if available
            if (this.governmentId) {
                formData.append('government_id', this.dataURLtoBlob(this.governmentId), 'government_id.jpg');
            } else {
                throw new Error('Please upload your government ID first');
            }
            
            // Add front selfie if available
            if (this.selfies.front) {
                formData.append('selfie_front', this.dataURLtoBlob(this.selfies.front), 'selfie_front.jpg');
            } else {
                throw new Error('Please take a front view selfie');
            }
            
            // Send verification request to the correct Flask backend URL
            const response = await fetch('http://127.0.0.1:5000/kyc', {
                method: 'POST',
                body: formData
            });
            if(response.status==200){
                this.showSuccess('Verification successful!');
                // this.verifyButton.disabled = true;
                // this.verifyButton.style.backgroundColor = 'green';
                // this.verifyButton.style.color = 'white';
                // this.verifyButton.textContent = 'Verified';
                alert("You'r are verified !! Your Transaction is confirmed ")
                // window.location.href="../../frontend/log_in_page/index.html";
            }
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Verification failed. Please try again.');
            }
            
            const result = await response.json();
            
            // Handle verification result
            if (result.success) {
                this.showSuccess('Verification successful!');
                this.displayResults(result);
            } else {
                throw new Error(result.message || 'Verification failed. Please try again.');
            }
        } catch (error) {
            console.error('Verification error:', error);
            this.showError(error.message);
        } finally {
            this.hideLoading();
        }
    }

    dataURLtoBlob(dataURL) {
        // Convert base64 to raw binary data held in a string
        const byteString = atob(dataURL.split(',')[1]);
        
        // Separate out the mime component
        const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
        
        // Write the bytes of the string to an ArrayBuffer
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        
        return new Blob([ab], {type: mimeString});
    }
    
    async handleSubmit() {
        try {
            this.showLoading('Verifying your identity...');
            
            // Validate form data
            if (!this.governmentId) {
                throw new Error('Please upload your government ID');
            }
            
            if (!this.selfies.front) {
                throw new Error('Please capture a front view selfie');
            }
            
            // Prepare verification data
            const verificationData = {
                id_image: this.governmentId,
                selfies: this.selfies
            };
            
            // Send verification request
            const response = await fetch('http://127.0.0.1:5000/kyc', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(verificationData)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Verification failed: ${errorText}`);
            }
            
            const result = await response.json();
            
            if (result.error) {
                throw new Error(result.error);
            }
            
            // Display results
            this.displayResults(result);
            
            if (result.verified) {
                this.showSuccess('Identity verified successfully!');
            } else {
                this.showError('Verification failed. Please check the details and try again.');
            }
            
        } catch (error) {
            console.error('Verification error:', error);
            this.showError(`Verification failed: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }
    
    showSuccess(message) {
        if (!this.successDiv) {
            // Create success div if it doesn't exist
            this.successDiv = document.createElement('div');
            this.successDiv.className = 'alert alert-success alert-dismissible fade show';
            this.successDiv.setAttribute('role', 'alert');
            this.successDiv.innerHTML = `
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            `;
            this.form.insertBefore(this.successDiv, this.form.firstChild);
        }
        
        // Update message
        this.successDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        this.successDiv.classList.remove('d-none');
        
        // Hide error if shown
        if (this.errorDiv) {
            this.errorDiv.classList.add('d-none');
        }
        
        // Auto hide after 3 seconds
        setTimeout(() => {
            if (this.successDiv) {
                this.successDiv.classList.add('d-none');
            }
        }, 3000);
    }

    showError(message) {
        if (!this.errorDiv) {
            // Create error div if it doesn't exist
            this.errorDiv = document.createElement('div');
            this.errorDiv.className = 'alert alert-danger alert-dismissible fade show';
            this.errorDiv.setAttribute('role', 'alert');
            this.errorDiv.innerHTML = `
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            `;
            this.form.insertBefore(this.errorDiv, this.form.firstChild);
        }
        
        // Update message
        this.errorDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        this.errorDiv.classList.remove('d-none');
        
        // Hide success if shown
        if (this.successDiv) {
            this.successDiv.classList.add('d-none');
        }
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            if (this.errorDiv) {
                this.errorDiv.classList.add('d-none');
            }
        }, 5000);
    }

    showLoading(message) {
        if (!this.loadingDiv) {
            // Create loading div if it doesn't exist
            this.loadingDiv = document.createElement('div');
            this.loadingDiv.className = 'alert alert-info d-flex align-items-center';
            this.loadingDiv.innerHTML = `
                <div class="spinner-border spinner-border-sm me-2" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <span id="loadingMessage"></span>
            `;
            this.form.insertBefore(this.loadingDiv, this.form.firstChild);
            this.loadingMessage = this.loadingDiv.querySelector('#loadingMessage');
        }
        
        if (this.loadingMessage) {
            this.loadingMessage.textContent = message;
        }
        this.loadingDiv.classList.remove('d-none');
    }

    hideLoading() {
        if (this.loadingDiv) {
            this.loadingDiv.classList.add('d-none');
        }
    }
    
    displayResults(result) {
        let html = '<div class="verification-results">';
        
        if (result.verified) {
            html += `
                <div class="alert alert-success mb-4">
                    <h4 class="alert-heading"><i class="bi bi-check-circle-fill me-2"></i>Verification Successful!</h4>
                    <p class="mb-0">Your identity has been verified with ${result.overall_confidence}% confidence.</p>
                </div>
            `;
        } else {
            html += `
                <div class="alert alert-danger mb-4">
                    <h4 class="alert-heading"><i class="bi bi-x-circle-fill me-2"></i>Verification Failed</h4>
                    <p class="mb-0">${result.error || 'Please try again with a clearer photo.'}</p>
                </div>
            `;
        }
        
        if (result.results && result.results.length > 0) {
            html += '<div class="card"><div class="card-body">';
            html += '<h5 class="card-title">Detailed Results:</h5>';
            html += '<div class="list-group">';
            
            result.results.forEach(r => {
                const statusClass = r.match ? 'success' : 'danger';
                const icon = r.match ? 'check-circle-fill' : 'x-circle-fill';
                
                html += `
                    <div class="list-group-item">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <i class="bi bi-${icon} text-${statusClass} me-2"></i>
                                <strong>${r.angle} View</strong>
                            </div>
                            <span class="badge bg-${statusClass}">${r.confidence}%</span>
                        </div>
                        ${r.error ? `<small class="text-danger d-block mt-1">${r.error}</small>` : ''}
                        ${r.details ? `
                            <div class="mt-2 small">
                                <div class="progress mb-1" style="height: 5px;">
                                    <div class="progress-bar" role="progressbar" style="width: ${r.details.template_match}%" 
                                         aria-valuenow="${r.details.template_match}" aria-valuemin="0" aria-valuemax="100"></div>
                                </div>
                                <div>Template Match: ${r.details.template_match}%</div>
                                <div>Structural Similarity: ${r.details.structural_similarity}%</div>
                                <div>Histogram Match: ${r.details.histogram_match}%</div>
                            </div>
                        ` : ''}
                    </div>
                `;
            });
            
            html += '</div></div></div>';
        }
        
        html += '</div>';
        
        // Show the results in the modal
        this.resultsModalBody.innerHTML = html;
        this.resultsModal.show();
    }
}

// Helper function to prevent default drag behaviors
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Initialize on page load
document.getElementById('verifyButton').addEventListener('submit', function(event) {
    event.preventDefault();  // Prevent the form from reloading the page
    // Your AJAX request or fetch here
});

document.addEventListener('DOMContentLoaded', () => {
    event.preventDefault();
    new PersonaVerification();
});
