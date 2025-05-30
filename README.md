# HDRify

A modern, minimalist web application that converts SDR images to HDR with adjustable intensity. Features a contemporary glass-morphism interface with smooth animations and intuitive interactions.

Based on the [HDR Emoji guide](https://sharpletters.net/2025/04/16/hdr-emoji/) by Corry Haines.

## Features

- 🎨 **Modern Design**: Glass-morphism effects with gradient backgrounds
- 📁 **Intuitive Upload**: Large drag & drop area with visual feedback
- 🎚️ **Real-time Processing**: HDR slider (0.5x - 3.0x) with instant preview
- 🖼️ **Smooth Transitions**: Animated state changes and processing overlay
- ⌨️ **Keyboard Support**: Full keyboard navigation (Space/Enter to upload, Esc to reset)
- ⚡ **Fast Processing**: ImageMagick-powered HDR enhancement
- 📱 **Responsive**: Optimized for desktop and mobile

## Design Highlights

- **Typography**: Modern SF Pro Display font stack
- **Colors**: Sophisticated gradient palette with purple accents
- **Effects**: Backdrop blur and subtle shadows
- **Animations**: Smooth cubic-bezier transitions
- **Accessibility**: ARIA labels and keyboard navigation

## How It Works

Uses ImageMagick with the exact pipeline from the article:
1. Floating-point RGB colorspace conversion
2. Auto-gamma correction
3. Brightness multiplication by HDR value
4. Power curve adjustment (0.9)
5. sRGB conversion with 16-bit depth
6. Rec. 2020 color profile application

## Quick Start

**Docker:**
```bash
docker build -t hdrify .
docker run -p 3000:3000 hdrify
```

**Local:**
```bash
brew install imagemagick  # or apt-get install imagemagick
cargo run
```

Open `http://localhost:3000`

## Usage

1. **Upload**: Drag & drop or click the upload area
2. **Adjust**: Use the HDR slider for real-time intensity control
3. **Process**: Watch the smooth blur-to-sharp transition
4. **Reset**: Click Reset or press Escape to start over

The interface provides visual feedback during processing with a blurred preview and animated overlay.
Works best on HDR displays with Chrome/Slack.

## Technical

- **Backend**: Rust + warp
- **Frontend**: Modern vanilla HTML/CSS/JS
- **Styling**: CSS3 with backdrop-filter and gradients
- **Processing**: ImageMagick CLI
- **Profile**: Rec. 2020 HDR

## API

`POST /api/process`
```json
{
  "image_data": "base64_image",
  "hdr_value": 1.5
}
```

MIT License
