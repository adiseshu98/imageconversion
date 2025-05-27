# Image Format Converter

A web-based application for converting images between different formats with drag-and-drop functionality.

## Features

- Convert images between formats:
  - PNG to WEBP
  - JPG to WEBP
  - PNG to JPG
  - JPG to PNG
- Drag-and-drop file upload
- Image preview
- Single image download
- Bulk download as ZIP
- Copy filename functionality
- Image replacement
- Individual image removal

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)

## Installation

1. Clone the repository or download the source code
2. Navigate to the project directory
3. Install dependencies:

```bash
npm install
```

## Usage

1. Start the server:

```bash
npm start
```

2. Open your web browser and navigate to `http://localhost:3000`

3. Select the desired conversion type from the dropdown menu

4. Upload images by either:
   - Dragging and dropping them onto the drop zone
   - Clicking the "Browse Files" button and selecting files

5. Use the available actions for each image:
   - Download: Convert and download the individual image
   - Remove: Remove the image from the list
   - Copy filename: Click on the filename to copy it to clipboard

6. Use the "Download All as ZIP" button to convert and download all images as a ZIP file

## Technical Details

- Frontend: HTML5, CSS3, jQuery
- Backend: Node.js with Express
- Image Processing: Sharp
- File Handling: Multer
- ZIP Creation: Archiver

## Notes

- The application processes images in memory for better performance
- Converted images maintain good quality (80% quality setting for lossy formats)
- The interface is responsive and works well on different screen sizes
- All file operations are handled securely on the server side 