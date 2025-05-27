$(document).ready(function() {
    let originalImages = [];
    let convertedImages = [];
    const maxFileSize = 5 * 1024 * 1024; // 5MB

    // Drag and drop handlers
    const dropZone = $('#dropZone');
    
    dropZone.on('dragover dragenter', function(e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).addClass('drag-over');
    });

    dropZone.on('dragleave dragend drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).removeClass('drag-over');
    });

    dropZone.on('drop', function(e) {
        e.preventDefault();
        const files = e.originalEvent.dataTransfer.files;
        handleFiles(files);
    });

    // Update quality and effect strength value display
    $('#qualitySlider, #effectStrengthSlider').on('input', function() {
        const value = $(this).val() + '%';
        if (this.id === 'qualitySlider') {
            $('#qualityValue').text(value);
        } else {
            $('#effectStrengthValue').text(value);
        }
    });

    // Handle effect selection
    $('#effectSelect').change(function() {
        const effect = $(this).val();
        $('#effectStrength').toggleClass('d-none', !['blur', 'brightness', 'contrast', 'saturation'].includes(effect));
    });

    // Handle aspect ratio maintenance
    let aspectRatio = 1;
    $('#resizeWidth, #resizeHeight').on('input', function() {
        if ($('#maintainAspectRatio').is(':checked')) {
            const isWidth = this.id === 'resizeWidth';
            const value = parseInt($(this).val()) || 0;
            if (value > 0) {
                const otherInput = isWidth ? $('#resizeHeight') : $('#resizeWidth');
                otherInput.val(Math.round(isWidth ? value / aspectRatio : value * aspectRatio));
            }
        }
    });

    // Handle file input change
    $('#imageInput').change(function(e) {
        handleFiles(this.files);
    });

    // Handle remove all button
    $('#removeAllBtn').click(function() {
        originalImages = [];
        convertedImages = [];
        $('#imagePreview').empty();
        updateButtons();
    });

    function handleFiles(files) {
        const filesArray = Array.from(files);
        
        // Validate files
        const invalidFiles = filesArray.filter(file => !file.type.startsWith('image/'));
        const oversizedFiles = filesArray.filter(file => file.size > maxFileSize);
        
        if (invalidFiles.length > 0) {
            alert('Please select only image files.');
            return;
        }
        
        if (oversizedFiles.length > 0) {
            alert('Some files are larger than 5MB. Please select smaller files.');
            return;
        }

        filesArray.forEach(file => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                    aspectRatio = img.width / img.height;
                    const imageId = 'img-' + Date.now() + '-' + originalImages.length;
                    originalImages.push({
                        id: imageId,
                        file: file,
                        data: e.target.result,
                        width: img.width,
                        height: img.height
                    });

                    const preview = createPreviewElement(imageId, e.target.result, file.name, file.size);
                    $('#imagePreview').append(preview);
                    updateButtons();
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    function createPreviewElement(id, src, name, size) {
        const preview = $('<div>')
            .addClass('col-md-4 preview-image-wrapper')
            .attr('data-image-id', id);

        preview.append($('<img>').addClass('preview-image mb-2').attr('src', src));
        preview.append($('<div>').addClass('preview-info').text(name));
        preview.append($('<div>').addClass('preview-size').text(formatFileSize(size)));
        
        // Add remove button
        const removeBtn = $('<button>')
            .addClass('btn btn-sm btn-danger remove-btn')
            .html('<i class="fas fa-trash-alt"></i>')
            .click(function(e) {
                e.stopPropagation();
                originalImages = originalImages.filter(img => img.id !== id);
                preview.remove();
                updateButtons();
            });
        
        preview.append(removeBtn);
        return preview;
    }

    // Handle convert button click
    $('#convertBtn').click(async function() {
        if (originalImages.length === 0) return;

        $(this).prop('disabled', true).text('Converting...');
        $('.preview-image-wrapper').addClass('loading');
        convertedImages = [];

        const format = $('#formatSelect').val();
        const quality = parseInt($('#qualitySlider').val()) / 100;
        const effect = $('#effectSelect').val();
        const effectStrength = parseInt($('#effectStrengthSlider').val()) / 100;
        const width = parseInt($('#resizeWidth').val()) || null;
        const height = parseInt($('#resizeHeight').val()) || null;
        const options = {
            format,
            quality,
            effect,
            effectStrength,
            width,
            height,
            autoRotate: $('#autoRotate').is(':checked'),
            stripMetadata: $('#stripMetadata').is(':checked'),
            optimizeOutput: $('#optimizeOutput').is(':checked')
        };

        for (let img of originalImages) {
            try {
                const convertedImage = await convertImage(img.file, options);
                convertedImages.push({
                    id: img.id,
                    data: convertedImage,
                    name: img.file.name.replace(/\.[^/.]+$/, '') + '.' + format
                });
            } catch (error) {
                console.error('Error converting image:', error);
                alert(`Error converting ${img.file.name}`);
            }
        }

        $(this).prop('disabled', false).text('Convert');
        $('.preview-image-wrapper').removeClass('loading');
        updateButtons();
        
        // Update previews with converted images
        convertedImages.forEach(img => {
            const preview = $(`.preview-image-wrapper[data-image-id="${img.id}"]`);
            preview.find('img').attr('src', img.data);
            preview.find('.preview-info').text(img.name);
            
            // Add download button
            const downloadBtn = $('<button>')
                .addClass('btn btn-sm btn-primary download-btn')
                .html('<i class="fas fa-download"></i>')
                .click(() => downloadSingle(img));
            
            preview.find('.download-btn').remove();
            preview.append(downloadBtn);
        });
    });

    // Handle single image download
    function downloadSingle(img) {
        const link = document.createElement('a');
        link.href = img.data;
        link.download = img.name;
        link.click();
    }

    // Handle download all button click
    $('#downloadBtn').click(function() {
        convertedImages.forEach((img, index) => {
            setTimeout(() => downloadSingle(img), index * 100);
        });
    });

    // Handle ZIP download button click
    $('#downloadZipBtn').click(async function() {
        const zip = new JSZip();
        
        convertedImages.forEach(img => {
            const imageData = img.data.split(',')[1];
            zip.file(img.name, imageData, {base64: true});
        });
        
        const content = await zip.generateAsync({type: 'blob'});
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = 'converted_images.zip';
        link.click();
        URL.revokeObjectURL(link.href);
    });

    // Helper function to convert image
    async function convertImage(file, options) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const reader = new FileReader();

            reader.onload = function(e) {
                img.src = e.target.result;
            };

            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Handle resize
                let targetWidth = options.width || img.width;
                let targetHeight = options.height || img.height;

                if (options.width && !options.height) {
                    targetHeight = (options.width / img.width) * img.height;
                } else if (options.height && !options.width) {
                    targetWidth = (options.height / img.height) * img.width;
                }

                canvas.width = targetWidth;
                canvas.height = targetHeight;

                // Apply effects
                if (options.effect !== 'none') {
                    switch (options.effect) {
                        case 'grayscale':
                            ctx.filter = 'grayscale(100%)';
                            break;
                        case 'sepia':
                            ctx.filter = 'sepia(100%)';
                            break;
                        case 'invert':
                            ctx.filter = 'invert(100%)';
                            break;
                        case 'blur':
                            ctx.filter = `blur(${options.effectStrength * 10}px)`;
                            break;
                        case 'brightness':
                            ctx.filter = `brightness(${options.effectStrength * 200}%)`;
                            break;
                        case 'contrast':
                            ctx.filter = `contrast(${options.effectStrength * 200}%)`;
                            break;
                        case 'saturation':
                            ctx.filter = `saturate(${options.effectStrength * 200}%)`;
                            break;
                    }
                }

                // Handle auto-rotation based on EXIF
                if (options.autoRotate) {
                    // Note: This is a simplified version. In a real implementation,
                    // you would need to read the EXIF orientation and apply the appropriate rotation
                    ctx.save();
                    ctx.translate(canvas.width / 2, canvas.height / 2);
                    ctx.rotate(0);
                    ctx.drawImage(img, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
                    ctx.restore();
                } else {
                    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
                }

                try {
                    const mimeType = `image/${options.format}`;
                    let quality = options.quality;
                    
                    // If optimize output is enabled, adjust quality based on image size
                    if (options.optimizeOutput) {
                        const imageSize = canvas.toDataURL(mimeType, quality).length;
                        if (imageSize > 1024 * 1024) { // If larger than 1MB
                            quality *= 0.8; // Reduce quality by 20%
                        }
                    }
                    
                    const dataUrl = canvas.toDataURL(mimeType, quality);
                    resolve(dataUrl);
                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // Helper function to format file size
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Helper function to update button states
    function updateButtons() {
        const hasOriginalImages = originalImages.length > 0;
        const hasConvertedImages = convertedImages.length > 0;
        
        $('#convertBtn').prop('disabled', !hasOriginalImages);
        $('#removeAllBtn').prop('disabled', !hasOriginalImages);
        $('#downloadBtn').prop('disabled', !hasConvertedImages);
        $('#downloadZipBtn').prop('disabled', !hasConvertedImages);
    }
}); 