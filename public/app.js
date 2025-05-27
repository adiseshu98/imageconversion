$(document).ready(function() {
    const dropZone = $('#dropZone');
    const fileInput = $('#fileInput');
    const browseBtn = $('#browseBtn');
    const previewContainer = $('#previewContainer');
    const conversionType = $('#conversionType');
    const downloadAllBtn = $('#downloadAll');
    const acceptedTypes = {
        'png-to-webp': ['image/png'],
        'jpg-to-webp': ['image/jpeg'],
        'png-to-jpg': ['image/png'],
        'jpg-to-png': ['image/jpeg']
    };
    let uploadedFiles = [];

    // Drag and drop handlers
    dropZone.on('dragover', function(e) {
        e.preventDefault();
        $(this).addClass('dragover');
    });

    dropZone.on('dragleave drop', function(e) {
        e.preventDefault();
        $(this).removeClass('dragover');
    });

    dropZone.on('drop', function(e) {
        const files = e.originalEvent.dataTransfer.files;
        handleFiles(files);
    });

    // Browse button handler
    browseBtn.on('click', function() {
        fileInput.click();
    });

    fileInput.on('change', function() {
        handleFiles(this.files);
    });

    // Conversion type change handler
    conversionType.on('change', function() {
        if (!this.value) {
            dropZone.addClass('disabled');
        } else {
            dropZone.removeClass('disabled');
        }
        previewContainer.empty();
        uploadedFiles = [];
        updateDownloadAllButton();
    });

    function handleFiles(files) {
        if (!conversionType.val()) {
            showNotification('Please select a conversion type first!');
            return;
        }

        const allowedTypes = acceptedTypes[conversionType.val()];
        
        Array.from(files).forEach(file => {
            if (!allowedTypes.includes(file.type)) {
                showNotification(`File "${file.name}" is not a valid image type for the selected conversion.`);
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                const fileId = Date.now() + Math.random().toString(36).substr(2, 9);
                addPreview(e.target.result, file, fileId);
                uploadedFiles.push({ id: fileId, file: file });
                updateDownloadAllButton();
            };
            reader.readAsDataURL(file);
        });
    }

    function addPreview(src, file, fileId) {
        const previewCard = $(`
            <div class="preview-card" data-file-id="${fileId}" style="opacity: 0">
                <img src="${src}" alt="${file.name}">
                <div class="preview-info">
                    <div class="preview-actions">
                        <button class="remove-btn">
                            <i class="fas fa-trash"></i> Remove
                        </button>
                        <button class="download-btn">
                            <i class="fas fa-download"></i> Download
                        </button>
                    </div>
                    <p class="image-name">
                        <span class="copy-name" title="Click to copy">${file.name}</span>
                    </p>
                </div>
            </div>
        `);

        previewContainer.append(previewCard);
        
        // Fade in animation
        setTimeout(() => {
            previewCard.css({
                opacity: 1,
                transform: 'translateY(0)',
                transition: 'opacity 0.3s ease, transform 0.3s ease'
            });
        }, 50);

        // Remove button handler
        previewCard.find('.remove-btn').on('click', function() {
            previewCard.css({
                opacity: 0,
                transform: 'translateY(20px)'
            });
            setTimeout(() => {
                uploadedFiles = uploadedFiles.filter(f => f.id !== fileId);
                previewCard.remove();
                updateDownloadAllButton();
            }, 300);
        });

        // Download button handler
        previewCard.find('.download-btn').on('click', function() {
            const btn = $(this);
            btn.prop('disabled', true)
               .html('<i class="fas fa-spinner fa-spin"></i> Converting...');
            convertAndDownload(fileId, btn);
        });

        // Copy filename handler
        previewCard.find('.copy-name').on('click', function() {
            const text = $(this).text();
            navigator.clipboard.writeText(text).then(() => {
                showNotification('Filename copied to clipboard!');
            });
        });
    }

    function updateDownloadAllButton() {
        const actionButtons = $('#actionButtons');
        if (uploadedFiles.length > 1) {
            actionButtons.fadeIn();
        } else {
            actionButtons.fadeOut();
        }
    }

    function convertAndDownload(fileId, btn) {
        const fileData = uploadedFiles.find(f => f.id === fileId);
        if (!fileData) return;

        const formData = new FormData();
        formData.append('image', fileData.file);
        formData.append('conversionType', conversionType.val());

        $.ajax({
            url: '/convert',
            method: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            xhrFields: {
                responseType: 'blob'
            },
            success: function(response) {
                const url = window.URL.createObjectURL(new Blob([response], { 
                    type: response.type 
                }));
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = getOutputFilename(fileData.file.name);
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                
                btn.prop('disabled', false)
                   .html('<i class="fas fa-download"></i> Download');
                showNotification('Image converted and downloaded successfully!');
            },
            error: function() {
                showNotification('Error converting image. Please try again.', 'error');
                btn.prop('disabled', false)
                   .html('<i class="fas fa-download"></i> Download');
            }
        });
    }

    // Download all handler
    downloadAllBtn.on('click', function() {
        if (uploadedFiles.length === 0) return;

        const btn = $(this);
        btn.prop('disabled', true)
           .html('<i class="fas fa-spinner fa-spin"></i> Converting...');

        const formData = new FormData();
        uploadedFiles.forEach(fileData => {
            formData.append('images', fileData.file);
        });
        formData.append('conversionType', conversionType.val());

        $.ajax({
            url: '/convert-all',
            method: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            xhrFields: {
                responseType: 'blob'
            },
            success: function(response) {
                const url = window.URL.createObjectURL(new Blob([response], { 
                    type: 'application/zip' 
                }));
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = 'converted-images.zip';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                
                btn.prop('disabled', false)
                   .html('<i class="fas fa-download"></i> Download All as ZIP');
                showNotification('All images converted and downloaded successfully!');
            },
            error: function() {
                showNotification('Error converting images. Please try again.', 'error');
                btn.prop('disabled', false)
                   .html('<i class="fas fa-download"></i> Download All as ZIP');
            }
        });
    });

    function getOutputFilename(filename) {
        const extension = conversionType.val().split('-to-')[1];
        return filename.substring(0, filename.lastIndexOf('.')) + '.' + extension;
    }

    function showNotification(message, type = 'success') {
        const notification = $(`
            <div class="notification ${type}">
                <p>${message}</p>
            </div>
        `).appendTo('body');

        setTimeout(() => {
            notification.addClass('show');
        }, 100);

        setTimeout(() => {
            notification.removeClass('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Add notification styles
    $('<style>')
        .text(`
            .notification {
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 1rem 2rem;
                border-radius: 8px;
                background: white;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                transform: translateY(100px);
                opacity: 0;
                transition: all 0.3s ease;
                z-index: 1000;
            }
            .notification.show {
                transform: translateY(0);
                opacity: 1;
            }
            .notification.success {
                border-left: 4px solid #2ecc71;
            }
            .notification.error {
                border-left: 4px solid #e74c3c;
            }
        `)
        .appendTo('head');

    // Initial state
    dropZone.addClass('disabled');
}); 