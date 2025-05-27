const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const cors = require('cors');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.static('public'));

// Single image conversion
app.post('/convert', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('No image file uploaded');
        }

        const conversionType = req.body.conversionType;
        let convertedImage;
        let contentType;

        switch (conversionType) {
            case 'png-to-webp':
                convertedImage = await sharp(req.file.buffer)
                    .webp({ quality: 80 })
                    .toBuffer();
                contentType = 'image/webp';
                break;

            case 'jpg-to-webp':
                convertedImage = await sharp(req.file.buffer)
                    .webp({ quality: 80 })
                    .toBuffer();
                contentType = 'image/webp';
                break;

            case 'png-to-jpg':
                convertedImage = await sharp(req.file.buffer)
                    .jpeg({ quality: 80 })
                    .toBuffer();
                contentType = 'image/jpeg';
                break;

            case 'jpg-to-png':
                convertedImage = await sharp(req.file.buffer)
                    .png()
                    .toBuffer();
                contentType = 'image/png';
                break;

            default:
                return res.status(400).send('Invalid conversion type');
        }

        res.set('Content-Type', contentType);
        res.set('Content-Disposition', 'attachment');
        res.send(Buffer.from(convertedImage));
    } catch (error) {
        console.error('Conversion error:', error);
        res.status(500).send('Error converting image');
    }
});

// Multiple images conversion
app.post('/convert-all', upload.array('images'), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).send('No image files uploaded');
        }

        const conversionType = req.body.conversionType;
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        res.attachment('converted-images.zip');
        archive.pipe(res);

        for (const file of req.files) {
            let convertedImage;
            let extension;

            switch (conversionType) {
                case 'png-to-webp':
                    convertedImage = await sharp(file.buffer)
                        .webp({ quality: 80 })
                        .toBuffer();
                    extension = 'webp';
                    break;

                case 'jpg-to-webp':
                    convertedImage = await sharp(file.buffer)
                        .webp({ quality: 80 })
                        .toBuffer();
                    extension = 'webp';
                    break;

                case 'png-to-jpg':
                    convertedImage = await sharp(file.buffer)
                        .jpeg({ quality: 80 })
                        .toBuffer();
                    extension = 'jpg';
                    break;

                case 'jpg-to-png':
                    convertedImage = await sharp(file.buffer)
                        .png()
                        .toBuffer();
                    extension = 'png';
                    break;

                default:
                    return res.status(400).send('Invalid conversion type');
            }

            const filename = path.parse(file.originalname).name;
            archive.append(Buffer.from(convertedImage), { name: `${filename}.${extension}` });
        }

        await archive.finalize();
    } catch (error) {
        console.error('Conversion error:', error);
        res.status(500).send('Error converting images');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 