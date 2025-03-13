import os
import base64
import requests    
from flask import Flask, request, render_template_string
from werkzeug.utils import secure_filename
from deepface import DeepFace

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

index_html = """
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Persona - Identity Verification</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
    <link href="./static/styles.css" rel="stylesheet">
    <style>
        /* Minimal inline styles for demonstration */
        .d-none { display: none; }
        .camera-preview { width: 320px; height: 240px; border: 1px solid #333; }
        .upload-box { cursor: pointer; border: 2px dashed #ccc; padding: 20px; text-align: center; }
        .animate-fade-in { animation: fadeIn 1s; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    </style>
</head>

<body>
    <div class="container-fluid vh-100 d-flex flex-column">
        <nav class="navbar navbar-expand-lg">
            <div class="container">
                <a class="navbar-brand" href="../landing_page/index.html">
                    <i class="bi bi-shield-check me-2"></i>Persona
                </a>
                <div class="ms-auto">
                    <span class="support-text">
                        <i class="bi bi-headset me-2"></i>Support: +91 7044779074
                    </span>
                </div>
            </div>
        </nav>

        <div class="row flex-grow-1 align-items-center justify-content-center">
            <div class="col-12 col-md-10 col-lg-8 col-xl-6">
                <div class="verification-card animate-fade-in">
                    <div class="progress-bar-container mb-4">
                        <div class="progress-steps d-flex justify-content-around">
                            
                            <div class="step" data-step="1">
                                <div class="step-circle">1</div>
                                <div class="step-label">Documents</div>
                            </div>
                            <div class="step" data-step="2">
                                <div class="step-circle">2</div>
                                <div class="step-label">Verification</div>
                            </div>
                        </div>
                    </div>

                    <div class="card-body p-4 p-md-5">
                        <div class="container mt-5">
                            <div class="row justify-content-center">
                                <div class="col-md-8">
                                    <div id="errorDiv" class="alert alert-danger d-none"></div>
                                    <div id="successDiv" class="alert alert-success d-none"></div>
                                    <div id="loadingDiv" class="alert alert-info d-none">
                                        <div class="spinner-border spinner-border-sm" role="status">
                                            <span class="visually-hidden">Loading...</span>
                                        </div>
                                        <span id="loadingMessage" class="ms-2">Processing...</span>
                                    </div>

                                    <!-- Verification Results Modal (optional) -->
                                    <div class="modal fade" id="resultsModal" tabindex="-1" aria-labelledby="resultsModalLabel" aria-hidden="true">
                                        <div class="modal-dialog">
                                            <div class="modal-content">
                                                <div class="modal-header">
                                                    <h5 class="modal-title" id="resultsModalLabel">Verification Results</h5>
                                                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                                </div>
                                                <div class="modal-body" id="resultsModalBody">
                                                    <!-- Results will be inserted here -->
                                                </div>
                                                <div class="modal-footer">
                                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Main Form -->
                                    <form id="verificationForm" class="needs-validation" action="/verify" method="POST" enctype="multipart/form-data" novalidate>
                                        <div class="form-step d-none" id="step1">
                                            <h3 class="text-center mb-4">Document Verification</h3>
                                            <div class="upload-container mb-4">
                                                <label class="form-label">Government ID</label>
                                                <div class="upload-box" id="govIdUploadBox">
                                                    <input type="file" name="id_doc" id="govIdUpload" accept="image/*" class="d-none" required>
                                                    <div class="upload-content">
                                                        <i class="bi bi-cloud-upload"></i>
                                                        <p class="mt-2">Drag & drop your ID here or click to browse</p>
                                                        <small class="text-muted">Supported formats: JPG, PNG (Max 5MB)</small>
                                                    </div>
                                                </div>
                                                <div id="govIdPreview" class="mt-3"></div>
                                            </div>
                                            <div class="d-flex gap-3">
                                                <button type="button" class="btn btn-outline-secondary prev-step">Back</button>
                                                <button type="button" class="btn btn-primary flex-grow-1 next-step">Continue</button>
                                            </div>
                                        </div>

                                        <!-- Step 3: Selfie Verification -->
                                        <div class="form-step d-none" id="step2">
                                            <h3 class="text-center mb-4">Selfie Verification</h3>
                                            <p class="text-muted text-center">Please take a clear photo of your face</p>

                                            <div class="camera-container mb-4">
                                                <div id="cameraError" class="alert alert-danger d-none"></div>
                                                <video id="videoInput" class="camera-preview" autoplay playsinline muted></video>
                                                <canvas id="captureCanvas" class="d-none" width="320" height="240"></canvas>
                                            </div>

                                            <!-- Hidden input to store the captured face image -->
                                            <input type="hidden" name="face_data" id="face_data">

                                            <div class="d-flex gap-3 mt-4">
                                                <button type="button" class="btn btn-outline-secondary prev-step">Back</button>
                                                <button type="button" class="btn btn-primary flex-grow-1" id="captureBtn">
                                                    <i class="bi bi-camera"></i> Capture Photo
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <!-- Final Submit Button -->
                                        <div class="text-center mt-4">
                                            <button type="submit" class="btn btn-primary btn-lg" id="submitBtn">
                                                Verify Identity
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <footer class="py-3">
            <div class="container text-center">
                <p class="mb-0">
                    <i class="bi bi-shield-lock me-2"></i>
                    &copy; 2025 Persona | Project Made by Ashwin Khowala
                </p>
            </div>
        </footer>
    </div>

    <!-- Include Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // --- Navigation between steps ---
        const nextSteps = document.querySelectorAll('.next-step');
        const prevSteps = document.querySelectorAll('.prev-step');
        const formSteps = document.querySelectorAll('.form-step');
        let currentStep = 0;
        function showStep(step) {
            formSteps.forEach((el, index) => {
                el.classList.toggle('d-none', index !== step);
            });
        }
        nextSteps.forEach(button => {
            button.addEventListener('click', () => {
                if (currentStep < formSteps.length - 1) {
                    currentStep++;
                    showStep(currentStep);
                }
            });
        });
        prevSteps.forEach(button => {
            button.addEventListener('click', () => {
                if (currentStep > 0) {
                    currentStep--;
                    showStep(currentStep);
                }
            });
        });
        showStep(currentStep);

        // --- ID Document Upload Preview ---
        const govIdUploadBox = document.getElementById('govIdUploadBox');
        const govIdUpload = document.getElementById('govIdUpload');
        const govIdPreview = document.getElementById('govIdPreview');
        govIdUploadBox.addEventListener('click', () => {
            govIdUpload.click();
        });
        govIdUpload.addEventListener('change', () => {
            const file = govIdUpload.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    govIdPreview.innerHTML = '<img src="' + e.target.result + '" class="img-fluid" alt="ID Preview">';
                }
                reader.readAsDataURL(file);
            }
        });

        // --- Webcam Access and Selfie Capture ---
        const videoInput = document.getElementById('videoInput');
        const captureCanvas = document.getElementById('captureCanvas');
        const captureBtn = document.getElementById('captureBtn');
        const faceDataInput = document.getElementById('face_data');

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(stream => {
                    videoInput.srcObject = stream;
                    videoInput.play();
                })
                .catch(error => {
                    console.error("Error accessing webcam: ", error);
                    document.getElementById('cameraError').classList.remove('d-none');
                    document.getElementById('cameraError').textContent = "Error accessing webcam. Please allow access.";
                });
        } else {
            document.getElementById('cameraError').classList.remove('d-none');
            document.getElementById('cameraError').textContent = "Webcam not supported by your browser.";
        }

        // Capture the selfie from the video stream and save it into the hidden input
        captureBtn.addEventListener('click', () => {
            const context = captureCanvas.getContext('2d');
            context.drawImage(videoInput, 0, 0, captureCanvas.width, captureCanvas.height);
            const dataURL = captureCanvas.toDataURL('image/png');
            faceDataInput.value = dataURL;
            alert('Selfie captured successfully!');
        });
    </script>
</body>
</html>
"""

# A simple result page template.
result_html = """
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Verification Result</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
  <div class="container mt-5">
    <div class="alert alert-info">
      <h4>Verification Result</h4>  
      <p>{{ message }}</p>
      <a href="http://127.0.0.1:3000/frontend/log_in_page/index.html" class="btn btn-primary">Go Back</a>
    </div>
  </div>
</body>
</html>
"""

def save_base64_image(data_url, filename):
    """
    Decodes a Base64 image (data URL) and saves it to disk.
    Expected format: "data:image/png;base64,...."
    """
    try:
        header, encoded = data_url.split(',', 1)
    except Exception as e:
        raise ValueError("Invalid image data format") from e
    data = base64.b64decode(encoded)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    with open(filepath, 'wb') as f:
        f.write(data)
    return filepath

@app.route('/')
def index():
    return render_template_string(index_html)

@app.route('/verify', methods=['POST'])
def verify():
    # Retrieve personal information (if needed)
    full_name = request.form.get('fullName')
    # email = request.form.get('email')
    # phone = request.form.get('phone')
    
    # Retrieve the captured face image (Base64 string) from the hidden input
    face_data = request.form.get('face_data')
    
    # Retrieve the uploaded government ID document
    id_doc = request.files.get('id_doc')
    
    if not face_data:
        return render_template_string(result_html, message="Face capture is required.")
    if not id_doc:
        return render_template_string(result_html, message="Government ID upload is required.")
    
    try:
        face_image_path = save_base64_image(face_data, 'captured_face.png')
    except Exception as e:
        return render_template_string(result_html, message="Failed to process face image: " + str(e))
    
    id_filename = secure_filename(id_doc.filename)
    id_image_path = os.path.join(app.config['UPLOAD_FOLDER'], id_filename)
    id_doc.save(id_image_path)
    
    try:
        # Use DeepFace to verify if the selfie and the uploaded ID document have matching faces
        result = DeepFace.verify(img1_path=face_image_path, img2_path=id_image_path)
        if result.get("verified"):
            message = "Faces match! (Fraud not detected)"
        else:
            message = "Faces do not match! (Possible fraud)"
    except Exception as e:
        message = "Error during verification: " + str(e)
    
    return render_template_string(result_html, message=message),200
    # return jsonify({
#             "success": True,
#             "message": "KYC verification successful",
#             "name": name,
#             "dob": dob
#         }), 200




face_verification_page = """
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Persona - Identity Verification</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
    <link href="./static/styles.css" rel="stylesheet">
    <style>
        /* Minimal inline styles for demonstration */
        .d-none { display: none; }
        .camera-preview { width: 320px; height: 240px; border: 1px solid #333; }
        .upload-box { cursor: pointer; border: 2px dashed #ccc; padding: 20px; text-align: center; }
        .animate-fade-in { animation: fadeIn 1s; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    </style>
</head>

<body>
    <div class="container-fluid vh-100 d-flex flex-column">
        <nav class="navbar navbar-expand-lg">
            <div class="container">
                <a class="navbar-brand" href="../landing_page/index.html">
                    <i class="bi bi-shield-check me-2"></i>Persona
                </a>
                <div class="ms-auto">
                    <span class="support-text">
                        <i class="bi bi-headset me-2"></i>Support: +91 7044779074
                    </span>
                </div>
            </div>
        </nav>

        <div class="row flex-grow-1 align-items-center justify-content-center">
            <div class="col-12 col-md-10 col-lg-8 col-xl-6">
                <div class="verification-card animate-fade-in">
                    <div class="progress-bar-container mb-4">
                        <div class="progress-steps d-flex justify-content-around">
                            
                            <div class="step" data-step="1">
                                <div class="step-circle">1</div>
                                <div class="step-label">Documents</div>
                            </div>
                            <div class="step" data-step="2">
                                <div class="step-circle">2</div>
                                <div class="step-label">Verification</div>
                            </div>
                        </div>
                    </div>

                    <div class="card-body p-4 p-md-5">
                        <div class="container mt-5">
                            <div class="row justify-content-center">
                                <div class="col-md-8">
                                    <div id="errorDiv" class="alert alert-danger d-none"></div>
                                    <div id="successDiv" class="alert alert-success d-none"></div>
                                    <div id="loadingDiv" class="alert alert-info d-none">
                                        <div class="spinner-border spinner-border-sm" role="status">
                                            <span class="visually-hidden">Loading...</span>
                                        </div>
                                        <span id="loadingMessage" class="ms-2">Processing...</span>
                                    </div>

                                    <!-- Verification Results Modal (optional) -->
                                    <div class="modal fade" id="resultsModal" tabindex="-1" aria-labelledby="resultsModalLabel" aria-hidden="true">
                                        <div class="modal-dialog">
                                            <div class="modal-content">
                                                <div class="modal-header">
                                                    <h5 class="modal-title" id="resultsModalLabel">Verification Results</h5>
                                                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                                </div>
                                                <div class="modal-body" id="resultsModalBody">
                                                    <!-- Results will be inserted here -->
                                                </div>
                                                <div class="modal-footer">
                                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Main Form -->
                                    <form id="verificationForm" class="needs-validation" action="/verify-transaction?transactionId={{ transaction_id }}" method="POST" enctype="multipart/form-data" novalidate>
                                        <div class="form-step d-none" id="step1">
                                            <h3 class="text-center mb-4">Document Verification</h3>
                                            <div class="upload-container mb-4">
                                                <label class="form-label">Government ID</label>
                                                <div class="upload-box" id="govIdUploadBox">
                                                    <input type="file" name="id_doc" id="govIdUpload" accept="image/*" class="d-none" required>
                                                    <div class="upload-content">
                                                        <i class="bi bi-cloud-upload"></i>
                                                        <p class="mt-2">Drag & drop your ID here or click to browse</p>
                                                        <small class="text-muted">Supported formats: JPG, PNG (Max 5MB)</small>
                                                    </div>
                                                </div>
                                                <div id="govIdPreview" class="mt-3"></div>
                                            </div>
                                            <div class="d-flex gap-3">
                                                <button type="button" class="btn btn-outline-secondary prev-step">Back</button>
                                                <button type="button" class="btn btn-primary flex-grow-1 next-step">Continue</button>
                                            </div>
                                        </div>

                                        <!-- Step 3: Selfie Verification -->
                                        <div class="form-step d-none" id="step2">
                                            <h3 class="text-center mb-4">Selfie Verification</h3>
                                            <p class="text-muted text-center">Please take a clear photo of your face</p>

                                            <div class="camera-container mb-4">
                                                <div id="cameraError" class="alert alert-danger d-none"></div>
                                                <video id="videoInput" class="camera-preview" autoplay playsinline muted></video>
                                                <canvas id="captureCanvas" class="d-none" width="320" height="240"></canvas>
                                            </div>

                                            <!-- Hidden input to store the captured face image -->
                                            <input type="hidden" name="face_data" id="face_data">

                                            <div class="d-flex gap-3 mt-4">
                                                <button type="button" class="btn btn-outline-secondary prev-step">Back</button>
                                                <button type="button" class="btn btn-primary flex-grow-1" id="captureBtn">
                                                    <i class="bi bi-camera"></i> Capture Photo
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <!-- Final Submit Button -->
                                        <div class="text-center mt-4">
                                            <button type="submit" class="btn btn-primary btn-lg" id="submitBtn">
                                                Verify Identity
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <footer class="py-3">
            <div class="container text-center">
                <p class="mb-0">
                    <i class="bi bi-shield-lock me-2"></i>
                    &copy; 2025 Persona | Project Made by Ashwin Khowala
                </p>
            </div>
        </footer>
    </div>

    <!-- Include Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // --- Navigation between steps ---
        const nextSteps = document.querySelectorAll('.next-step');
        const prevSteps = document.querySelectorAll('.prev-step');
        const formSteps = document.querySelectorAll('.form-step');
        let currentStep = 0;
        function showStep(step) {
            formSteps.forEach((el, index) => {
                el.classList.toggle('d-none', index !== step);
            });
        }
        nextSteps.forEach(button => {
            button.addEventListener('click', () => {
                if (currentStep < formSteps.length - 1) {
                    currentStep++;
                    showStep(currentStep);
                }
            });
        });
        prevSteps.forEach(button => {
            button.addEventListener('click', () => {
                if (currentStep > 0) {
                    currentStep--;
                    showStep(currentStep);
                }
            });
        });
        showStep(currentStep);

        // --- ID Document Upload Preview ---
        const govIdUploadBox = document.getElementById('govIdUploadBox');
        const govIdUpload = document.getElementById('govIdUpload');
        const govIdPreview = document.getElementById('govIdPreview');
        govIdUploadBox.addEventListener('click', () => {
            govIdUpload.click();
        });
        govIdUpload.addEventListener('change', () => {
            const file = govIdUpload.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    govIdPreview.innerHTML = '<img src="' + e.target.result + '" class="img-fluid" alt="ID Preview">';
                }
                reader.readAsDataURL(file);
            }
        });

        // --- Webcam Access and Selfie Capture ---
        const videoInput = document.getElementById('videoInput');
        const captureCanvas = document.getElementById('captureCanvas');
        const captureBtn = document.getElementById('captureBtn');
        const faceDataInput = document.getElementById('face_data');

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(stream => {
                    videoInput.srcObject = stream;
                    videoInput.play();
                })
                .catch(error => {
                    console.error("Error accessing webcam: ", error);
                    document.getElementById('cameraError').classList.remove('d-none');
                    document.getElementById('cameraError').textContent = "Error accessing webcam. Please allow access.";
                });
        } else {
            document.getElementById('cameraError').classList.remove('d-none');
            document.getElementById('cameraError').textContent = "Webcam not supported by your browser.";
        }

        // Capture the selfie from the video stream and save it into the hidden input
        captureBtn.addEventListener('click', () => {
            const context = captureCanvas.getContext('2d');
            context.drawImage(videoInput, 0, 0, captureCanvas.width, captureCanvas.height);
            const dataURL = captureCanvas.toDataURL('image/png');
            faceDataInput.value = dataURL;
            alert('Selfie captured successfully!');
        });
    </script>
</body>
</html>
"""

result1_html = """
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Verification Result</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
  <div class="container mt-5">
    <div class="alert alert-info">
      <h4>Verification Result</h4>  
      <p>{{ message }}</p>
      <a href="http://127.0.0.1:3000/frontend/dashboard_page/dashboard.html" class="btn btn-primary">Go Back</a>
    </div>
  </div>
</body>
</html>
"""

def save_base64_image(data_url, filename):
    try:
        header, encoded = data_url.split(',', 1)
    except Exception as e:
        raise ValueError("Invalid image data format") from e
    data = base64.b64decode(encoded)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    with open(filepath, 'wb') as f:
        f.write(data)
    return filepath

@app.route('/verify-transaction', methods=['GET', 'POST'])
def verify_transaction():
    transaction_id = request.args.get('transactionId')
    print(transaction_id)
    if request.method == 'GET':
        # Render the face capture page, embedding the transaction id.
        return render_template_string(face_verification_page, transaction_id=transaction_id)
        # return render_template_string(index_html, transaction_id=transaction_id)
    else:
        # POST: Process face verification.
        face_data = request.form.get('face_data')
        if not face_data:
            return "Face data not provided", 400

        try:
            # Save the captured face.
            face_image_filename = f"approval_{transaction_id}.png"
            face_image_path = save_base64_image(face_data, face_image_filename)
        except Exception as e:
            return f"Error processing face image: {e}", 500

        id_doc = request.files.get('id_doc')
        id_filename = secure_filename(id_doc.filename)
        id_image_path = os.path.join(app.config['UPLOAD_FOLDER'], id_filename)
        id_doc.save(id_image_path)
        try:
            verification = DeepFace.verify(img1_path=face_image_path, img2_path=id_image_path)
        except Exception as e:
            return f"Error during face verification: {e}", 500

        if verification.get("verified"):
            # If verified, call Node.js backend to complete the transaction.
            node_backend_url = f'http://localhost:8080/api/complete-transaction?transactionId={transaction_id}'
            try:
                resp = requests.post(node_backend_url)
                if resp.status_code == 200:
                    # return "Face verified! Transaction approved and completed."
                    return render_template_string(result1_html, message="Face verified !  Transaction approved and verified")
                else:
                    # return f"Face verified, but completing transaction failed: {resp.text}", 500
                    return render_template_string(result1_html, message="Face verified, but completing transaction failed:")
            except Exception as e:
                # return f"Error calling Node.js backend: {e}", 500
                return render_template_string(result_html, message="Error calling Node.js backend.")
        else:
            # return "Face verification failed. Transaction not approved.", 400
            return render_template_string(result1_html, message="Face verification failed. Transaction not approved.")



if __name__ == '__main__':
    app.run(debug=True,port=5050)
