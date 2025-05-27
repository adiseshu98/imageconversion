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

    // Handle watermark toggle
    $('#enableWatermark').change(function() {
        const isEnabled = $(this).is(':checked');
        $('#watermarkText, #watermarkOpacity, #watermarkPosition').prop('disabled', !isEnabled);
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

    // Theme handling
    const themeToggle = $('#themeToggle');
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Set initial theme based on user preference
    if (prefersDarkScheme.matches) {
        document.documentElement.setAttribute('data-bs-theme', 'dark');
        themeToggle.find('i').removeClass('fa-sun').addClass('fa-moon');
    }
    
    // Theme toggle handler
    themeToggle.click(function() {
        const currentTheme = document.documentElement.getAttribute('data-bs-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-bs-theme', newTheme);
        
        // Update icon
        const icon = $(this).find('i');
        icon.toggleClass('fa-sun fa-moon');
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

    function initializeRangeInputs(container = document) {
        const rangeInputs = {
            'qualitySlider': 'qualityValue',
            'effectStrengthSlider': 'effectStrengthValue',
            'watermarkOpacity': 'watermarkOpacityValue',
            'temperature': 'temperatureValue',
            'tint': 'tintValue'
        };

        Object.entries(rangeInputs).forEach(([inputId, valueId]) => {
            $(container).find(`#${inputId}`).on('input', function() {
                const value = $(this).val();
                const suffix = ['temperature', 'tint'].includes(inputId) ? '' : '%';
                $(container).find(`#${valueId}`).text(value + suffix);
            });
        });
    }

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
                        height: img.height,
                        settings: null // Will store custom settings if applied
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

        const imageContainer = $('<div>').addClass('preview-image-container');
        const img = $('<img>').addClass('preview-image mb-2').attr('src', src);
        
        // Create preview overlay with actions
        const overlay = $('<div>').addClass('preview-overlay');
        const actions = $('<div>').addClass('preview-actions');
        
        // Preview button
        const previewBtn = $('<button>')
            .addClass('preview-action-btn')
            .html('<i class="fas fa-eye"></i> Preview')
            .click(function(e) {
                e.stopPropagation();
                showImagePreview(id);
            });
        
        // Download button
        const downloadBtn = $('<button>')
            .addClass('preview-action-btn')
            .html('<i class="fas fa-download"></i> Download')
            .click(function(e) {
                e.stopPropagation();
                downloadSingle(originalImages.find(img => img.id === id));
            });
        
        // Settings button
        const settingsBtn = $('<button>')
            .addClass('preview-action-btn')
            .html('<i class="fas fa-cog"></i> Settings')
            .click(function(e) {
                e.stopPropagation();
                openImageSettings(id);
            });
        
        actions.append(previewBtn, downloadBtn, settingsBtn);
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

    // Handle save image settings
    $('#saveImageSettings').click(function() {
        const modalBody = $('#imageSettingsModal .modal-body');
        const settings = getSettingsFromForm(modalBody);
        
        const imageIndex = originalImages.findIndex(img => img.id === currentEditingImageId);
        if (imageIndex !== -1) {
            originalImages[imageIndex].settings = settings;
            $(`.preview-image-wrapper[data-image-id="${currentEditingImageId}"]`)
                .addClass('has-custom-settings');
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
        const useGlobalSettings = $('#useGlobalSettings').is(':checked');

        for (let img of originalImages) {
            try {
                // Use image's custom settings if available and global settings are not forced
                const settings = (!useGlobalSettings && img.settings) ? img.settings : globalSettings;
                
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
                        opacity: parseInt(settings.watermarkOpacity) / 100,
                        position: settings.watermarkPosition
                    } : null,
                    temperature: parseInt(settings.temperature),
                    tint: parseInt(settings.tint)
                });

                convertedImages.push({
                    id: img.id,
                    data: convertedImage,
                    name: img.file.name.replace(/\.[^/.]+$/, '') + '.' + settings.formatSelect
                });

                // Update preview to show the converted image
                const preview = $(`.preview-image-wrapper[data-image-id="${img.id}"]`);
                preview.find('img').attr('src', convertedImage);
                preview.find('.preview-info').text(img.file.name.replace(/\.[^/.]+$/, '') + '.' + settings.formatSelect);
            } catch (error) {
                console.error('Error converting image:', error);
                alert(`Error converting ${img.file.name}`);
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

                if (options.width && !options.height) {
                    targetHeight = (options.width / img.width) * img.height;
                } else if (options.height && !options.width) {
                    targetWidth = (options.height / img.height) * img.width;
                }

                canvas.width = targetWidth;
                canvas.height = targetHeight;

                // Apply base image
                ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

                // Apply effects
                if (options.effect !== 'none') {
                    applyEffect(ctx, canvas, options.effect, options.effectStrength);
                }

                // Apply other options (border, corner radius, shadow)
                // ... existing code for other effects ...

                try {
                    const mimeType = `image/${options.format}`;
                    const dataUrl = canvas.toDataURL(mimeType, options.quality);
                    resolve(dataUrl);
                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = reject;
            reader.readAsDataURL(file);
        });
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
}); 