# PWA Icons

This directory contains the app icons for the Progressive Web App.

## Required Icon Sizes

The following icon sizes are required for full PWA support:

- **72x72** - Android Chrome minimum
- **96x96** - Android Chrome
- **128x128** - Android Chrome
- **144x144** - Microsoft Tile
- **152x152** - iOS Safari
- **192x192** - Android Chrome standard
- **384x384** - Android Chrome
- **512x512** - Android Chrome splash screen

## Icon Design Guidelines

For elderly-friendly design:
- Use high contrast colors
- Simple, recognizable symbols
- Clear medical/health theme
- Avoid complex details that don't scale well

## Generating Icons

You can use tools like:
- [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)
- [RealFaviconGenerator](https://realfavicongenerator.net/)
- Adobe Photoshop/Illustrator with export presets

### Quick Generation with ImageMagick

```bash
# From a 512x512 source image
convert icon-512.png -resize 72x72 icon-72.png
convert icon-512.png -resize 96x96 icon-96.png
convert icon-512.png -resize 128x128 icon-128.png
convert icon-512.png -resize 144x144 icon-144.png
convert icon-512.png -resize 152x152 icon-152.png
convert icon-512.png -resize 192x192 icon-192.png
convert icon-512.png -resize 384x384 icon-384.png
```

## Placeholder Icons

For development, you can use placeholder icons. In production, replace these with professionally designed icons that match your brand and accessibility requirements.

## Emergency Icon

The emergency shortcut icon should be:
- Bright red color
- Clear emergency symbol (e.g., medical cross, alert symbol)
- Highly visible and recognizable
