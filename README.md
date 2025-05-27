# Advanced Image Converter

A powerful web-based image converter with advanced features for image processing and manipulation.

## Features

- Multiple image format conversion (JPEG, PNG, WebP, AVIF)
- Image effects and filters
  - Basic effects (Grayscale, Sepia, Invert, Blur)
  - Color adjustments (Brightness, Contrast, Saturation, Hue)
  - Artistic effects (Vintage, Vignette, Oil Painting, Posterize)
  - Special effects (Noise, Pixelate, Duotone)
- Image resizing with aspect ratio maintenance
- Watermarking capabilities
- Batch processing
- Dark/Light theme support
- Responsive design
- Client-side processing (no server uploads)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/image-converter.git
cd image-converter
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will be available at `http://localhost:3000`.

## Development

### Running Tests

Run all tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Generate coverage report:
```bash
npm run test:coverage
```

### Code Quality

Run ESLint:
```bash
npm run lint
```

## Project Structure

```
image-converter/
├── index.html          # Main application page
├── privacy.html        # Privacy policy page
├── terms.html         # Terms of service page
├── script.js          # Main application logic
├── theme.js          # Theme handling
├── styles.css        # Styles
├── tests.js          # Unit tests
├── jest.setup.js     # Jest configuration
└── package.json      # Project configuration
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance Considerations

- All image processing is done client-side
- Large images (>5MB) are rejected to prevent browser crashes
- Efficient memory management for batch processing
- Lazy loading of images in the preview area
- Optimized canvas operations

## Security

- No server-side storage of images
- All processing done locally in the browser
- Secure cookie handling
- Content Security Policy implemented
- Regular dependency updates

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Bootstrap for UI components
- FontAwesome for icons
- JSZip for ZIP file handling
- Jest for testing framework 