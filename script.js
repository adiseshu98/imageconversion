$(document).ready(function() {
    let originalImages = [];
    let convertedImages = [];
    const maxFileSize = 5 * 1024 * 1024; // 5MB
    let imageSettingsModal = new bootstrap.Modal(document.getElementById('imageSettingsModal'));
    let currentEditingImageId = null;

    // Initialize all range inputs
    initializeRangeInputs();

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

    // Handle effect selection
    $('#effectSelect').change(function() {
        const effect = $(this).val();
        const needsStrength = [
            'blur', 'brightness', 'contrast', 'saturation', 'hue-rotate',
            'noise', 'pixelate', 'oil-painting', 'posterize'
        ].includes(effect);
        
        $('#effectStrength').toggleClass('d-none', !needsStrength);
        $('#effectOptions').toggleClass('d-none', !['duotone', 'vintage'].includes(effect));
        $('#duotoneOptions').toggleClass('d-none', effect !== 'duotone');
        $('#vintageOptions').toggleClass('d-none', effect !== 'vintage');
    });

    // Initialize watermark state
    $('#watermarkText, #watermarkOpacity, #watermarkPosition').prop('disabled', true);
    
    // Handle watermark toggle
    $('#enableWatermark').change(function() {
        const isEnabled = $(this).is(':checked');
        $('#watermarkOptions').toggleClass('d-none', !isEnabled);
        $('#watermarkText, #watermarkOpacity, #watermarkPosition').prop('disabled', !isEnabled);
    });

    // Handle aspect ratio maintenance
    let aspectRatio = 1;
    let originalWidth = 0;
    let originalHeight = 0;

    $('#resizeWidth, #resizeHeight').on('input', function() {
        if ($('#maintainAspectRatio').is(':checked') && aspectRatio > 0) {
            const isWidth = this.id === 'resizeWidth';
            const value = parseInt($(this).val()) || 0;
            
            if (value > 0) {
                if (isWidth) {
                    const newHeight = Math.round(value / aspectRatio);
                    $('#resizeHeight').val(newHeight);
                } else {
                    const newWidth = Math.round(value * aspectRatio);
                    $('#resizeWidth').val(newWidth);
                }
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

    // Handle advanced effect selection
    $('#advancedEffectSelect').change(function() {
        const effect = $(this).val();
        $('#advancedEffectStrength').toggleClass('d-none', !['noise', 'pixelate', 'oil-painting', 'posterize'].includes(effect));
    });

    // Handle shadow toggle
    $('#enableShadow').change(function() {
        $('#shadowOptions').toggleClass('d-none', !$(this).is(':checked'));
    });

    // Handle section reset buttons
    $('.reset-section').click(function() {
        const section = $(this).data('section');
        const container = $(this).closest('.mb-3');
        
        switch(section) {
            case 'format':
                $('#formatSelect').val('webp');
                break;
            case 'quality':
                $('#qualitySlider').val(90).trigger('input');
                break;
            case 'effects':
                $('#effectSelect').val('none');
                $('#effectStrength').addClass('d-none');
                $('#effectStrengthSlider').val(50).trigger('input');
                $('#effectOptions').addClass('d-none');
                $('#duotoneOptions').addClass('d-none');
                $('#vintageOptions').addClass('d-none');
                $('#duotoneColor1').val('#ff0000');
                $('#duotoneColor2').val('#0000ff');
                $('#vintageVignette').prop('checked', true);
                $('#vintageGrain').prop('checked', true);
                break;
            case 'resize':
                $('#resizeWidth').val('');
                $('#resizeHeight').val('');
                $('#maintainAspectRatio').prop('checked', true);
                break;
            case 'advanced':
                $('#autoRotate').prop('checked', false);
                $('#stripMetadata').prop('checked', false);
                $('#optimizeOutput').prop('checked', false);
                $('#sharpenImage').prop('checked', false);
                break;
            case 'watermark':
                $('#enableWatermark').prop('checked', false).trigger('change');
                $('#watermarkText').val('');
                $('#watermarkColor').val('#ffffff');
                $('#watermarkOpacity').val(30).trigger('input');
                $('#watermarkPosition').val('center');
                break;
            case 'color':
                $('#temperature').val(0).trigger('input');
                $('#tint').val(0).trigger('input');
                break;
            case 'border':
                $('#borderWidth').val(0);
                $('#borderColor').val('#000000');
                $('#borderStyle').val('solid');
                break;
            case 'corner':
                $('#cornerRadius').val(0).trigger('input');
                break;
            case 'shadow':
                $('#enableShadow').prop('checked', false).trigger('change');
                $('#shadowBlur').val(10).trigger('input');
                $('#shadowColor').val('#000000');
                $('#shadowOpacity').val(30).trigger('input');
                break;
        }
    });

    function initializeRangeInputs(container = document) {
        const rangeInputs = {
            'qualitySlider': 'qualityValue',
            'effectStrengthSlider': 'effectStrengthValue',
            'watermarkOpacity': 'watermarkOpacityValue',
            'temperature': 'temperatureValue',
            'tint': 'tintValue',
            'cornerRadius': 'cornerRadiusValue',
            'shadowBlur': 'shadowBlurValue',
            'shadowOpacity': 'shadowOpacityValue'
        };

        Object.entries(rangeInputs).forEach(([inputId, valueId]) => {
            const $input = $(container).find(`#${inputId}`);
            const $value = $(container).find(`#${valueId}`);
            
            // Set initial value
            const value = $input.val();
            const suffix = ['temperature', 'tint'].includes(inputId) ? '' : '%';
            if (inputId === 'shadowBlur') {
                $value.text(value + 'px');
            } else if (inputId === 'cornerRadius') {
                $value.text(value + 'px');
            } else {
                $value.text(value + suffix);
            }

            // Update on input change
            $input.on('input', function() {
                const value = $(this).val();
                if (inputId === 'shadowBlur') {
                    $value.text(value + 'px');
                } else if (inputId === 'cornerRadius') {
                    $value.text(value + 'px');
                } else {
                    $value.text(value + suffix);
                }
            });
        });
    }

    async function handleFiles(files) {
        try {
            const filesArray = Array.from(files);
            
            // Validate files
            const invalidFiles = filesArray.filter(file => !file.type.startsWith('image/'));
            const oversizedFiles = filesArray.filter(file => file.size > maxFileSize);
            
            if (invalidFiles.length > 0) {
                showError('Please select only image files.');
                return;
            }
            
            if (oversizedFiles.length > 0) {
                showError('Some files are larger than 5MB. Please select smaller files.');
                return;
            }

            for (const file of filesArray) {
                try {
                    const imageData = await readFileAsDataURL(file);
                    const img = await loadImage(imageData);
                    
                    aspectRatio = img.width / img.height;
                    originalWidth = img.width;
                    originalHeight = img.height;
                    
                    // Set initial resize values to original dimensions
                    $('#resizeWidth').attr('placeholder', originalWidth);
                    $('#resizeHeight').attr('placeholder', originalHeight);
                    
                    const imageId = 'img-' + Date.now() + '-' + originalImages.length;
                    originalImages.push({
                        id: imageId,
                        file: file,
                        data: imageData,
                        width: img.width,
                        height: img.height,
                        settings: null
                    });

                    const preview = createPreviewElement(imageId, imageData, file.name, file.size);
                    $('#imagePreview').append(preview);
                    updateButtons();
                } catch (err) {
                    console.error('Error processing file:', file.name, err);
                    showError(`Error processing file: ${file.name}`);
                }
            }
        } catch (err) {
            console.error('Error handling files:', err);
            showError('An error occurred while processing the files.');
        }
    }

    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(e);
            reader.readAsDataURL(file);
        });
    }

    function loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }

    function showError(message) {
        const errorDiv = $('<div>')
            .addClass('alert alert-danger alert-dismissible fade show')
            .attr('role', 'alert')
            .html(`
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            `);
        
        // Remove any existing error messages
        $('.alert-danger').remove();
        
        // Add new error message at the top of the preview area
        $('#imagePreview').before(errorDiv);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            errorDiv.alert('close');
        }, 5000);
    }

    function showLoading(imageId) {
        const wrapper = $(`.preview-image-wrapper[data-image-id="${imageId}"]`);
        wrapper.addClass('loading');
        wrapper.append($('<div>').addClass('loading-spinner'));
    }

    function hideLoading(imageId) {
        const wrapper = $(`.preview-image-wrapper[data-image-id="${imageId}"]`);
        wrapper.removeClass('loading');
        wrapper.find('.loading-spinner').remove();
    }

    // Create preview element with direct download functionality
    function createPreviewElement(id, src, name, size) {
        const preview = $('<div>')
            .addClass('col-md-4 preview-image-wrapper')
            .attr('data-image-id', id);

        const imageContainer = $('<div>').addClass('preview-image-container');
        const img = $('<img>').addClass('preview-image mb-2').attr('src', src);
        
        // Create preview overlay with actions
        const overlay = $('<div>').addClass('preview-overlay');
        const actions = $('<div>').addClass('preview-actions');
        
        // Preview button
        const previewBtn = $('<button>')
            .addClass('preview-action-btn')
            .attr('title', 'Preview')
            .html('<i class="fas fa-eye"></i>')
            .click(function(e) {
                e.stopPropagation();
                showImagePreview(id);
            });
        
        // Download button
        const downloadBtn = $('<button>')
            .addClass('preview-action-btn')
            .attr('title', 'Download')
            .html('<i class="fas fa-download"></i>')
            .click(async function(e) {
                e.stopPropagation();
                const convertedImage = convertedImages.find(img => img.id === id);
                if (convertedImage) {
                    const link = document.createElement('a');
                    link.href = convertedImage.data;
                    link.download = convertedImage.name;
                    link.click();
                } else {
                    showError('Please click "Convert" first to process the image');
                }
            });
        
        // Settings button with toggle
        const settingsContainer = $('<div>').addClass('settings-container d-flex align-items-center');
        
        // Add per-image settings toggle
        const settingsToggle = $('<div>').addClass('form-check form-switch me-2');
        const toggleInput = $('<input>')
            .addClass('form-check-input')
            .attr({
                type: 'checkbox',
                id: `perImageSettings-${id}`,
                'data-image-id': id
            })
            .on('change', function() {
                const isEnabled = $(this).is(':checked');
                const imageWrapper = $(`.preview-image-wrapper[data-image-id="${id}"]`);
                
                if (isEnabled) {
                    // Enable per-image settings
                    imageWrapper.addClass('has-custom-settings');
                    // Initialize with current global settings if no custom settings exist
                    const image = originalImages.find(img => img.id === id);
                    if (image && !image.settings) {
                        image.settings = getSettingsFromForm($('.settings-panel .card-body'));
                    }
                } else {
                    // Disable per-image settings
                    imageWrapper.removeClass('has-custom-settings');
                    // Remove custom settings
                    const image = originalImages.find(img => img.id === id);
                    if (image) {
                        delete image.settings;
                    }
                    // Remove from converted images to force reconversion with global settings
                    const convertedIndex = convertedImages.findIndex(img => img.id === id);
                    if (convertedIndex !== -1) {
                        convertedImages.splice(convertedIndex, 1);
                        // Reset preview to original image
                        imageWrapper.find('img').attr('src', image.data);
                        imageWrapper.find('.preview-info').text(image.file.name);
                    }
                }
            });

        const toggleLabel = $('<label>')
            .addClass('form-check-label small')
            .attr('for', `perImageSettings-${id}`)
            .text('Custom');

        settingsToggle.append(toggleInput, toggleLabel);
        
        // Settings button
        const settingsBtn = $('<button>')
            .addClass('preview-action-btn')
            .attr('title', 'Settings')
            .html('<i class="fas fa-cog"></i>')
            .click(function(e) {
                e.stopPropagation();
                // Only open settings if per-image settings is enabled
                if (toggleInput.is(':checked')) {
                    openImageSettings(id);
                } else {
                    showError('Please enable custom settings first');
                }
            });
        
        settingsContainer.append(settingsToggle, settingsBtn);
        actions.append(previewBtn, downloadBtn, settingsContainer);
        overlay.append(actions);
        
        imageContainer.append(img, overlay);
        preview.append(imageContainer);
        preview.append($('<div>').addClass('preview-info').text(name));
        preview.append($('<div>').addClass('preview-size').text(formatFileSize(size)));

        return preview;
    }

    function showImagePreview(imageId) {
        const image = originalImages.find(img => img.id === imageId);
        if (!image) return;

        // Create modal for preview
        const modal = $('<div>').addClass('modal fade').attr('id', 'previewModal');
        const dialog = $('<div>').addClass('modal-dialog modal-lg modal-dialog-centered');
        const content = $('<div>').addClass('modal-content');
        
        // Modal header
        const header = $('<div>').addClass('modal-header');
        header.append($('<h5>').addClass('modal-title').text('Image Preview'));
        header.append($('<button>').addClass('btn-close').attr({
            'type': 'button',
            'data-bs-dismiss': 'modal'
        }));
        
        // Modal body
        const body = $('<div>').addClass('modal-body text-center');
        const img = $('<img>').addClass('img-fluid').attr('src', image.data);
        body.append(img);
        
        // Modal footer with download button
        const footer = $('<div>').addClass('modal-footer');
        const downloadBtn = $('<button>')
            .addClass('btn btn-primary')
            .html('<i class="fas fa-download"></i> Download')
            .click(() => downloadSingle(image));
        footer.append(downloadBtn);
        
        content.append(header, body, footer);
        dialog.append(content);
        modal.append(dialog);
        
        // Remove existing modal if any
        $('#previewModal').remove();
        $('body').append(modal);
        
        // Show modal
        const previewModal = new bootstrap.Modal(modal);
        previewModal.show();
    }

    function openImageSettings(imageId) {
        currentEditingImageId = imageId;
        const image = originalImages.find(img => img.id === imageId);
        const modalBody = $('#imageSettingsModal .modal-body');
        
        // Clear previous content and add fresh clone
        modalBody.empty().append(cloneSettingsPanel());
        
        // If image has custom settings, apply them
        if (image.settings) {
            applySettingsToForm(modalBody, image.settings);
        } else {
            // If no custom settings, copy global settings
            const globalSettings = getSettingsFromForm($('.settings-panel .card-body'));
            applySettingsToForm(modalBody, globalSettings);
        }

        // Initialize all range inputs in modal
        initializeRangeInputs(modalBody);
        
        imageSettingsModal.show();
    }

    function applySettingsToForm(form, settings) {
        Object.entries(settings).forEach(([key, value]) => {
            const element = form.find(`#${key}`);
            if (element.length) {
                if (element.is(':checkbox')) {
                    element.prop('checked', value);
                } else {
                    element.val(value);
                }
                element.trigger('input'); // Trigger input event to update any dependent elements
            }
        });
    }

    // Update image settings save functionality
    $('#saveImageSettings').click(function() {
        const modalBody = $('#imageSettingsModal .modal-body');
        const settings = getSettingsFromForm(modalBody);
        
        const imageIndex = originalImages.findIndex(img => img.id === currentEditingImageId);
        if (imageIndex !== -1) {
            originalImages[imageIndex].settings = settings;

            // Remove any existing converted version of this image
            const convertedIndex = convertedImages.findIndex(img => img.id === currentEditingImageId);
            if (convertedIndex !== -1) {
                convertedImages.splice(convertedIndex, 1);
                // Reset preview to original image
                const preview = $(`.preview-image-wrapper[data-image-id="${currentEditingImageId}"]`);
                preview.find('img').attr('src', originalImages[imageIndex].data);
                preview.find('.preview-info').text(originalImages[imageIndex].file.name);
            }
        }
        
        imageSettingsModal.hide();
    });

    function getSettingsFromForm(form) {
        const settings = {};
        form.find('input, select').each(function() {
            const $input = $(this);
            const id = $input.attr('id');
            if (id) {
                if ($input.is(':checkbox')) {
                    settings[id] = $input.is(':checked');
                } else {
                    settings[id] = $input.val();
                }
            }
        });
        return settings;
    }

    // Fix for per-image settings
    function cloneSettingsPanel() {
        const settingsClone = $('.settings-panel .card-body').clone();
        
        // Remove global settings checkbox from clone
        settingsClone.find('#useGlobalSettings').closest('.form-check').remove();
        
        // Reset all form elements in the clone
        settingsClone.find('input[type="range"]').each(function() {
            $(this).trigger('input');
        });
        
        return settingsClone;
    }

    // Handle convert button click
    $('#convertBtn').click(async function() {
        if (originalImages.length === 0) return;

        $(this).prop('disabled', true).text('Converting...');
        $('.preview-image-wrapper').addClass('loading');
        convertedImages = [];

        const globalSettings = getSettingsFromForm($('.settings-panel .card-body'));

        for (let img of originalImages) {
            try {
                // Check if image has per-image settings enabled
                const perImageSettingsEnabled = $(`#perImageSettings-${img.id}`).is(':checked');
                // Use image's custom settings if enabled and available
                const settings = (perImageSettingsEnabled && img.settings) ? img.settings : globalSettings;
                
                const convertedImage = await convertImage(img.file, {
                    format: settings.formatSelect,
                    quality: parseInt(settings.qualitySlider) / 100,
                    effect: settings.effectSelect,
                    effectStrength: parseInt(settings.effectStrengthSlider) / 100,
                    width: parseInt(settings.resizeWidth) || null,
                    height: parseInt(settings.resizeHeight) || null,
                    autoRotate: settings.autoRotate,
                    stripMetadata: settings.stripMetadata,
                    optimizeOutput: settings.optimizeOutput,
                    sharpenImage: settings.sharpenImage,
                    watermark: settings.enableWatermark ? {
                        text: settings.watermarkText,
                        color: settings.watermarkColor,
                        opacity: parseInt(settings.watermarkOpacity) / 100,
                        position: settings.watermarkPosition
                    } : null,
                    temperature: parseInt(settings.temperature),
                    tint: parseInt(settings.tint)
                });

                // Store converted image with its settings
                convertedImages.push({
                    id: img.id,
                    data: convertedImage,
                    name: img.file.name.replace(/\.[^/.]+$/, '') + '.' + settings.formatSelect,
                    settings: settings
                });

                // Update preview to show the converted image
                const preview = $(`.preview-image-wrapper[data-image-id="${img.id}"]`);
                preview.find('img').attr('src', convertedImage);
                preview.find('.preview-info').text(img.file.name.replace(/\.[^/.]+$/, '') + '.' + settings.formatSelect);
            } catch (error) {
                console.error('Error converting image:', error);
                showError(`Error converting ${img.file.name}`);
            }
        }

        $(this).prop('disabled', false).text('Convert');
        $('.preview-image-wrapper').removeClass('loading');
        updateButtons();
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

                // Maintain aspect ratio if only one dimension is specified
                if (options.width && !options.height) {
                    targetHeight = Math.round((options.width / img.width) * img.height);
                } else if (options.height && !options.width) {
                    targetWidth = Math.round((options.height / img.height) * img.width);
                }

                // Add border width if enabled
                const borderWidth = parseInt($('#borderWidth').val()) || 0;
                canvas.width = targetWidth + (borderWidth * 2);
                canvas.height = targetHeight + (borderWidth * 2);

                // Create temporary canvas for corner radius
                const cornerRadius = parseInt($('#cornerRadius').val()) || 0;
                if (cornerRadius > 0) {
                    ctx.beginPath();
                    ctx.moveTo(cornerRadius, 0);
                    ctx.lineTo(canvas.width - cornerRadius, 0);
                    ctx.quadraticCurveTo(canvas.width, 0, canvas.width, cornerRadius);
                    ctx.lineTo(canvas.width, canvas.height - cornerRadius);
                    ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - cornerRadius, canvas.height);
                    ctx.lineTo(cornerRadius, canvas.height);
                    ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - cornerRadius);
                    ctx.lineTo(0, cornerRadius);
                    ctx.quadraticCurveTo(0, 0, cornerRadius, 0);
                    ctx.closePath();
                    ctx.clip();
                }

                // Apply background color (for border)
                if (borderWidth > 0) {
                    ctx.fillStyle = $('#borderColor').val();
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }

                // Draw the image with border offset
                ctx.drawImage(img, borderWidth, borderWidth, targetWidth, targetHeight);

                // Apply shadow if enabled
                if ($('#enableShadow').is(':checked')) {
                    const shadowBlur = parseInt($('#shadowBlur').val()) || 10;
                    const shadowColor = $('#shadowColor').val();
                    const shadowOpacity = parseInt($('#shadowOpacity').val()) / 100;
                    
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = canvas.width;
                    tempCanvas.height = canvas.height;
                    const tempCtx = tempCanvas.getContext('2d');
                    
                    tempCtx.shadowColor = shadowColor;
                    tempCtx.shadowBlur = shadowBlur;
                    tempCtx.shadowOffsetX = 5;
                    tempCtx.shadowOffsetY = 5;
                    tempCtx.drawImage(canvas, 0, 0);
                    
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.drawImage(tempCanvas, 0, 0);
                }

                // Apply effects
                if (options.effect !== 'none') {
                    applyEffect(ctx, canvas, options.effect, options.effectStrength);
                }

                // Apply color adjustments
                if (options.temperature !== 0) {
                    applyTemperature(ctx, canvas, options.temperature);
                }
                if (options.tint !== 0) {
                    applyTint(ctx, canvas, options.tint);
                }

                // Apply watermark if enabled
                if (options.watermark) {
                    applyWatermark(ctx, canvas, {
                        text: options.watermark.text,
                        color: $('#watermarkColor').val(),
                        opacity: options.watermark.opacity,
                        position: options.watermark.position
                    });
                }

                try {
                    const mimeType = `image/${options.format || 'webp'}`;
                    const quality = options.quality || 0.9;
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

    function applyTemperature(ctx, canvas, temperature) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        
        // Convert temperature range (-100 to 100) to RGB adjustments
        const rFactor = 1 + (temperature > 0 ? temperature / 100 : 0);
        const bFactor = 1 + (temperature < 0 ? -temperature / 100 : 0);
        
        for (let i = 0; i < pixels.length; i += 4) {
            pixels[i] *= rFactor;     // Red
            pixels[i + 2] *= bFactor; // Blue
            
            // Ensure values stay within bounds
            pixels[i] = Math.min(255, Math.max(0, pixels[i]));
            pixels[i + 2] = Math.min(255, Math.max(0, pixels[i + 2]));
        }
        
        ctx.putImageData(imageData, 0, 0);
    }

    function applyTint(ctx, canvas, tint) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        
        // Convert tint range (-100 to 100) to RGB adjustments
        const gFactor = 1 + (tint > 0 ? tint / 100 : 0);
        const rFactor = 1 + (tint < 0 ? -tint / 100 : 0);
        
        for (let i = 0; i < pixels.length; i += 4) {
            if (tint > 0) {
                pixels[i + 1] *= gFactor; // Increase green for positive tint (greenish)
            } else {
                pixels[i] *= rFactor;     // Increase red for negative tint (magenta)
            }
            
            // Ensure values stay within bounds
            pixels[i] = Math.min(255, Math.max(0, pixels[i]));
            pixels[i + 1] = Math.min(255, Math.max(0, pixels[i + 1]));
        }
        
        ctx.putImageData(imageData, 0, 0);
    }

    function applyWatermark(ctx, canvas, options) {
        const { text, color, opacity, position } = options;
        
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.fillStyle = color || '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let x = canvas.width / 2;
        let y = canvas.height / 2;
        
        switch (position) {
            case 'top-left':
                x = canvas.width * 0.1;
                y = canvas.height * 0.1;
                ctx.textAlign = 'left';
                break;
            case 'top-right':
                x = canvas.width * 0.9;
                y = canvas.height * 0.1;
                ctx.textAlign = 'right';
                break;
            case 'bottom-left':
                x = canvas.width * 0.1;
                y = canvas.height * 0.9;
                ctx.textAlign = 'left';
                break;
            case 'bottom-right':
                x = canvas.width * 0.9;
                y = canvas.height * 0.9;
                ctx.textAlign = 'right';
                break;
        }
        
        // Draw text stroke
        ctx.strokeText(text, x, y);
        // Draw text fill
        ctx.fillText(text, x, y);
        
        ctx.restore();
    }

    function applyEffect(ctx, canvas, effect, strength = 0.5) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;

        switch (effect) {
            // Basic Effects
            case 'grayscale':
                applyGrayscale(pixels);
                break;
            case 'sepia':
                applySepia(pixels);
                break;
            case 'invert':
                applyInvert(pixels);
                break;
            case 'blur':
                applyBlur(ctx, canvas, strength * 10);
                return; // Blur is applied directly to context

            // Color Adjustments
            case 'brightness':
                applyBrightness(pixels, strength * 2);
                break;
            case 'contrast':
                applyContrast(pixels, strength * 2);
                break;
            case 'saturation':
                applySaturation(pixels, strength * 2);
                break;
            case 'hue-rotate':
                applyHueRotate(pixels, strength * 360);
                break;

            // Artistic Effects
            case 'vintage':
                applyVintage(ctx, canvas, {
                    vignette: $('#vintageVignette').is(':checked'),
                    grain: $('#vintageGrain').is(':checked')
                });
                return; // Vintage is applied directly to context
            case 'vignette':
                applyVignette(ctx, canvas);
                return; // Vignette is applied directly to context
            case 'oil-painting':
                applyOilPainting(ctx, canvas, strength * 5);
                return; // Oil painting is applied directly to context
            case 'posterize':
                applyPosterize(pixels, Math.max(2, Math.floor((1 - strength) * 10)));
                break;

            // Special Effects
            case 'noise':
                applyNoise(pixels, strength * 100);
                break;
            case 'pixelate':
                applyPixelate(ctx, canvas, Math.max(1, Math.floor((1 - strength) * 20)));
                return; // Pixelate is applied directly to context
            case 'duotone':
                applyDuotone(pixels, $('#duotoneColor1').val(), $('#duotoneColor2').val());
                break;
        }

        ctx.putImageData(imageData, 0, 0);
    }

    // Effect implementation functions
    function applyGrayscale(pixels) {
        for (let i = 0; i < pixels.length; i += 4) {
            const avg = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
            pixels[i] = pixels[i + 1] = pixels[i + 2] = avg;
        }
    }

    function applySepia(pixels) {
        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            pixels[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
            pixels[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
            pixels[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
        }
    }

    function applyInvert(pixels) {
        for (let i = 0; i < pixels.length; i += 4) {
            pixels[i] = 255 - pixels[i];
            pixels[i + 1] = 255 - pixels[i + 1];
            pixels[i + 2] = 255 - pixels[i + 2];
        }
    }

    function applyBlur(ctx, canvas, radius) {
        ctx.filter = `blur(${radius}px)`;
        const temp = document.createElement('canvas');
        temp.width = canvas.width;
        temp.height = canvas.height;
        const tempCtx = temp.getContext('2d');
        tempCtx.drawImage(canvas, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(temp, 0, 0);
        ctx.filter = 'none';
    }

    function applyBrightness(pixels, factor) {
        for (let i = 0; i < pixels.length; i += 4) {
            pixels[i] = Math.min(255, pixels[i] * factor);
            pixels[i + 1] = Math.min(255, pixels[i + 1] * factor);
            pixels[i + 2] = Math.min(255, pixels[i + 2] * factor);
        }
    }

    function applyContrast(pixels, factor) {
        const factor2 = Math.pow((factor + 100) / 100, 2);
        for (let i = 0; i < pixels.length; i += 4) {
            pixels[i] = Math.min(255, ((pixels[i] / 255 - 0.5) * factor2 + 0.5) * 255);
            pixels[i + 1] = Math.min(255, ((pixels[i + 1] / 255 - 0.5) * factor2 + 0.5) * 255);
            pixels[i + 2] = Math.min(255, ((pixels[i + 2] / 255 - 0.5) * factor2 + 0.5) * 255);
        }
    }

    function applySaturation(pixels, factor) {
        for (let i = 0; i < pixels.length; i += 4) {
            const gray = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
            pixels[i] = Math.min(255, gray + (pixels[i] - gray) * factor);
            pixels[i + 1] = Math.min(255, gray + (pixels[i + 1] - gray) * factor);
            pixels[i + 2] = Math.min(255, gray + (pixels[i + 2] - gray) * factor);
        }
    }

    function applyHueRotate(pixels, degrees) {
        for (let i = 0; i < pixels.length; i += 4) {
            const [h, s, l] = rgbToHsl(pixels[i], pixels[i + 1], pixels[i + 2]);
            const newHue = (h + degrees / 360) % 1;
            const [r, g, b] = hslToRgb(newHue, s, l);
            pixels[i] = r;
            pixels[i + 1] = g;
            pixels[i + 2] = b;
        }
    }

    function applyVintage(ctx, canvas, options) {
        // Apply sepia-like effect
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            pixels[i] = r * 0.9 + g * 0.1;
            pixels[i + 1] = r * 0.2 + g * 0.7 + b * 0.1;
            pixels[i + 2] = r * 0.1 + b * 0.9;
        }
        ctx.putImageData(imageData, 0, 0);

        // Apply vignette if enabled
        if (options.vignette) {
            applyVignette(ctx, canvas);
        }

        // Apply grain if enabled
        if (options.grain) {
            applyNoise(ctx.getImageData(0, 0, canvas.width, canvas.height).data, 30);
            ctx.putImageData(imageData, 0, 0);
        }
    }

    function applyDuotone(pixels, color1, color2) {
        const c1 = hexToRgb(color1);
        const c2 = hexToRgb(color2);

        for (let i = 0; i < pixels.length; i += 4) {
            const gray = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3 / 255;
            pixels[i] = c1.r + (c2.r - c1.r) * gray;
            pixels[i + 1] = c1.g + (c2.g - c1.g) * gray;
            pixels[i + 2] = c1.b + (c2.b - c1.b) * gray;
        }
    }

    // Helper functions for color conversions
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    function rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        return [h, s, l];
    }

    function hslToRgb(h, s, l) {
        let r, g, b;

        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }

        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
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

    function applyPosterize(pixels, levels) {
        const factor = 255 / (levels - 1);
        
        for (let i = 0; i < pixels.length; i += 4) {
            // Process RGB channels
            for (let j = 0; j < 3; j++) {
                pixels[i + j] = Math.round(Math.round(pixels[i + j] / factor) * factor);
            }
            // Alpha channel remains unchanged
        }
    }

    function applyNoise(pixels, amount) {
        for (let i = 0; i < pixels.length; i += 4) {
            const noise = (Math.random() - 0.5) * amount;
            
            // Add noise to RGB channels
            for (let j = 0; j < 3; j++) {
                pixels[i + j] = Math.min(255, Math.max(0, pixels[i + j] + noise));
            }
            // Alpha channel remains unchanged
        }
    }

    function applyPixelate(ctx, canvas, pixelSize) {
        const w = canvas.width;
        const h = canvas.height;
        
        // Get current image data
        const imageData = ctx.getImageData(0, 0, w, h);
        const pixels = imageData.data;
        
        // Loop through each pixel block
        for (let y = 0; y < h; y += pixelSize) {
            for (let x = 0; x < w; x += pixelSize) {
                // Get the color of the first pixel in the block
                const i = (y * w + x) * 4;
                const r = pixels[i];
                const g = pixels[i + 1];
                const b = pixels[i + 2];
                
                // Fill the entire block with this color
                ctx.fillStyle = `rgb(${r},${g},${b})`;
                ctx.fillRect(x, y, pixelSize, pixelSize);
            }
        }
    }

    function applyVignette(ctx, canvas) {
        const gradient = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, 0,
            canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) / 1.5
        );
        
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.5)');
        
        ctx.fillStyle = gradient;
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'source-over';
    }

    function applyOilPainting(ctx, canvas, radius) {
        const w = canvas.width;
        const h = canvas.height;
        const imageData = ctx.getImageData(0, 0, w, h);
        const pixels = imageData.data;
        const output = new Uint8ClampedArray(pixels.length);
        
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = (y * w + x) * 4;
                let avgR = 0, avgG = 0, avgB = 0, count = 0;
                
                // Sample pixels in radius
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        
                        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                            const ni = (ny * w + nx) * 4;
                            avgR += pixels[ni];
                            avgG += pixels[ni + 1];
                            avgB += pixels[ni + 2];
                            count++;
                        }
                    }
                }
                
                // Average the colors
                output[i] = avgR / count;
                output[i + 1] = avgG / count;
                output[i + 2] = avgB / count;
                output[i + 3] = pixels[i + 3]; // Keep original alpha
            }
        }
        
        // Put the new image data back
        const newImageData = new ImageData(output, w, h);
        ctx.putImageData(newImageData, 0, 0);
    }

    // Add global reset button to settings panel header
    $('.settings-panel .card-header').append(
        $('<button>')
            .addClass('btn btn-sm btn-outline-secondary ms-2')
            .attr('title', 'Reset all settings')
            .html('<i class="fas fa-undo"></i>')
            .click(function() {
                // Reset all sections
                $('.reset-section').each(function() {
                    $(this).click();
                });
                // Reset global settings checkbox
                $('#useGlobalSettings').prop('checked', true);
            })
    );

    // Update image settings modal
    $('#imageSettingsModal').on('show.bs.modal', function() {
        const modalBody = $(this).find('.modal-body');
        modalBody.empty();

        // Add reset button to modal header
        const modalHeader = $(this).find('.modal-header');
        if (!modalHeader.find('.reset-all-btn').length) {
            modalHeader.append(
                $('<button>')
                    .addClass('btn btn-sm btn-outline-secondary reset-all-btn')
                    .attr('title', 'Reset all settings')
                    .html('<i class="fas fa-undo"></i>')
                    .click(function() {
                        modalBody.find('.reset-section').each(function() {
                            $(this).click();
                        });
                    })
            );
        }

        // Clone settings panel
        const settingsClone = cloneSettingsPanel();
        modalBody.append(settingsClone);
        
        // Initialize range inputs in modal
        initializeRangeInputs(modalBody);
        
        // Apply current image settings if available
        const image = originalImages.find(img => img.id === currentEditingImageId);
        if (image && image.settings) {
            applySettingsToForm(modalBody, image.settings);
        } else {
            // If no custom settings, copy global settings
            const globalSettings = getSettingsFromForm($('.settings-panel .card-body'));
            applySettingsToForm(modalBody, globalSettings);
        }
    });
}); 