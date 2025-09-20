# PWA Icons

This directory is for PWA icons. Currently, the manifest uses `/placeholder-logo.png` as a temporary icon.

## Required Icon Sizes

For a complete PWA icon set, you should include these sizes:

- 72x72 (Android launcher)
- 96x96 (Android launcher)
- 128x128 (Chrome Web Store)
- 144x144 (Android launcher)
- 152x152 (iOS)
- 192x192 (Android launcher)
- 384x384 (Android splash screen)
- 512x512 (Android splash screen)

## Icon Guidelines

- Use PNG format
- Include both maskable and any purpose icons
- Icons should be square with rounded corners
- Consider the medical/healthcare theme
- Use the app's primary color (#059669) as a base

## Updating Icons

1. Generate your icon set
2. Place them in this directory with the naming convention: `icon-{size}x{size}.png`
3. Update `/public/manifest.json` to reference the new icon files
4. Update `/app/layout.tsx` to reference the new favicon
5. Update `/public/sw.js` notification icons if needed

## Tools for Icon Generation

- [PWA Icon Generator](https://www.pwabuilder.com/imageGenerator)
- [RealFaviconGenerator](https://realfavicongenerator.net/)
- [Favicon.io](https://favicon.io/)
