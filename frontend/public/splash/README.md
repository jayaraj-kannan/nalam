# iOS Splash Screens

This directory contains splash screen images for iOS devices.

## Required Splash Screen Sizes

iOS requires specific splash screen sizes for different devices:

### iPhone
- **640x1136** - iPhone 5/SE (iphone5_splash.png)
- **750x1334** - iPhone 6/7/8 (iphone6_splash.png)
- **1242x2208** - iPhone 6+/7+/8+ (iphoneplus_splash.png)
- **1125x2436** - iPhone X/XS (iphonex_splash.png)
- **828x1792** - iPhone XR (iphonexr_splash.png)
- **1242x2688** - iPhone XS Max (iphonexsmax_splash.png)

### iPad
- **1536x2048** - iPad (ipad_splash.png)
- **1668x2224** - iPad Pro 10.5" (ipadpro1_splash.png)
- **2048x2732** - iPad Pro 12.9" (ipadpro2_splash.png)

## Design Guidelines

For elderly-friendly splash screens:
- Use large, clear branding
- High contrast colors
- Simple, calming design
- Include app name in large text
- Avoid complex animations or details

## Generating Splash Screens

You can use:
- [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)
- [Appicon](https://appicon.co/)
- Design tools like Figma, Sketch, or Adobe XD

### Quick Generation

```bash
# Create a base splash screen design at 2048x2732 (largest size)
# Then resize for each device:

convert splash-base.png -resize 640x1136 -gravity center -extent 640x1136 iphone5_splash.png
convert splash-base.png -resize 750x1334 -gravity center -extent 750x1334 iphone6_splash.png
# ... etc for other sizes
```

## Placeholder Splash Screens

For development, you can use simple colored backgrounds with the app name. In production, replace with professionally designed splash screens.

## Accessibility Considerations

- Ensure text on splash screens meets WCAG contrast requirements
- Use minimum 18pt font size for any text
- Keep design simple and uncluttered
- Consider users with visual impairments
