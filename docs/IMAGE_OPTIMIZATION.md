# Image Optimization & Compression Guide

This document describes the automated image compression system implemented across all ReserBee frontend projects.

## Overview

The image optimization system has three layers:

1. **Local Development**: Pre-commit hook prevents oversized images from being committed
2. **CI/CD Pipeline**: Automatic compression of images that exceed the limit
3. **Manual Optimization**: Command-line tool for manual image compression

## Configuration

### Image Size Limit

The default image size limit is **500KB per image**. This is configured in each project's CI workflow:

```yaml
# .github/workflows/ci.yml
jobs:
  ci:
    uses: ReserBee-com/reserbee-actions/.github/workflows/nextjs-ci.yml@main
    with:
      image-size-limit: 500  # KB
```

To change the limit for your project, update this value in your `.github/workflows/ci.yml`.

## Hybrid Approach: How It Works

### 1. Local Development (Pre-commit Hook)

The pre-commit hook runs before each commit to check image sizes:

```bash
git commit -m "Add new images"
# Hook runs automatically
# ✓ All images within size limits
# Commit proceeds
```

**Setup:**
```bash
bash scripts/setup-hooks.sh
```

What the hook does:
- ✅ Checks all images in `./public` directory
- ✅ Automatically compresses oversized images to 500KB
- ✅ Prevents commit if compression fails
- ✅ Can be bypassed with `--no-verify` (not recommended)

### 2. CI/CD Pipeline (Auto-Compression)

During the GitHub Actions build, the image optimization step:

```
1. Runs image size check
2. Automatically compresses any oversized images
3. Commits changes back to the branch
4. Pushes compressed images to origin
```

This ensures that:
- ✅ Even if images slip past local hooks, CI will catch them
- ✅ Images are automatically compressed without blocking the build
- ✅ Team members always get optimized images

### 3. Manual Compression

For on-demand compression:

```bash
npm run compress:images
```

## Quick Start

### First Time Setup (New Project)

1. **Copy compression script** to your project:
   ```bash
   cp -r ~/.../reserbee-actions/scripts ./
   ```

2. **Setup pre-commit hook**:
   ```bash
   bash scripts/setup-hooks.sh
   ```

3. **Install dependencies**:
   ```bash
   npm install sharp --save-dev
   ```

4. **Add npm script to `package.json`**:
   ```json
   {
     "scripts": {
       "compress:images": "node scripts/compress-images.js --max-size 500 --dir ./public"
     }
   }
   ```

### Existing Projects

If your project already has the setup:

```bash
# Setup hook (one time)
bash scripts/setup-hooks.sh

# Compress images manually
npm run compress:images

# That's it! Hook will run automatically on git commit
```

## Usage Examples

### Check and compress all images

```bash
npm run compress:images
```

**Output:**
```
🔄 Compressing images (max size: 500KB)...

✓ public/images/gallery/photo-1.webp: 852KB → 398KB
✓ public/images/gallery/photo-2.webp: 1024KB → 487KB
⊘ public/images/gallery/photo-3.webp: Unsupported format

===========================================================
📊 IMAGE COMPRESSION REPORT
===========================================================
Total images checked: 150
Compressed: 142
Failed: 2
===========================================================
```

### Manual compression with custom settings

```bash
# Use different max size
node scripts/compress-images.js --max-size 300 --dir ./public

# Use different quality (lower = more compression)
node scripts/compress-images.js --quality 50 --dir ./public
```

### Environment variables for CI/CD

```bash
# Override settings via environment variables
IMAGE_MAX_SIZE=300 npm run compress:images
IMAGE_QUALITY=50 npm run compress:images
FAIL_ON_ERROR=false npm run compress:images  # Don't exit with error
```

## How Compression Works

The compression algorithm:

```
1. Check image size against limit (default: 500KB)
2. If under limit: DONE ✓
3. If over limit:
   a. Compress with quality 60%
   b. Check size again
   c. If still over: reduce quality by 5%
   d. Repeat until under limit or quality reaches 20%
   e. If still over: FAIL (image quality too important)
```

**Quality levels by format:**
- **WebP**: High quality even at low percentages (recommended format)
- **JPEG**: Good quality down to 50%
- **PNG**: Fixed compression level (lossless)

## Recommended Image Formats

### Best Performance ⭐⭐⭐
- **WebP**: Modern, superior compression, 25-35% smaller than JPEG
- Use for: Photos, complex images, galleries

### Good Performance ⭐⭐
- **JPEG**: Universal support, good compression
- Use for: Fallback for older browsers, photographs

### Avoid for Large Images ⚠️
- **PNG**: No compression advantage over WebP
- Use only when: Transparency required and WebP not supported

## Troubleshooting

### Images still exceed 500KB after compression

This can happen with very large, complex images. Options:

1. **Reduce further manually**:
   ```bash
   # Use ImageMagick
   convert input.webp -resize 1920x1080 -quality 50 output.webp
   ```

2. **Use a different format**:
   - Convert to WebP (if not already)
   - Try JPEG instead of PNG

3. **Accept the size** (if critical):
   - Update `image-size-limit` in CI workflow for that project
   - Add explicit gitignore rules if needed

### Hook not running on commit

Check if hook is executable:
```bash
ls -la .git/hooks/pre-commit
# Should show: -rwxr-xr-x (executable)

# Make it executable if needed
chmod +x .git/hooks/pre-commit
```

### Bypass hook (not recommended)

```bash
git commit --no-verify -m "Your message"
```

⚠️ **Warning**: This bypasses image checks and may cause CI failures

### Sharp installation fails

If `npm install sharp` fails:

```bash
# Try installing with specific Python version
npm install sharp --python=/usr/bin/python3

# Or use pre-built binaries
npm install @resvg/resvg-js
```

## Performance Impact

- **Hook overhead**: ~2-5 seconds per commit (checks & optional compression)
- **CI/CD overhead**: ~10-15 seconds (includes compression)
- **Developer experience**: Minimal - hook runs in background

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Developer Commits with Images                       │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │ Pre-commit Hook     │ ◄── scripts/setup-hooks.sh
         │ (Runs locally)      │
         │ - Check sizes       │
         │ - Auto-compress     │
         │ - Prevent commit    │
         └─────────────────────┘
                   │
        (if passes) │
                   ▼
         ┌─────────────────────┐
         │  Git Push           │
         │  (to GitHub)        │
         └─────────────────────┘
                   │
                   ▼
         ┌─────────────────────────────────────────┐
         │  GitHub Actions CI/CD Pipeline          │
         │  - Checkout code                        │
         │  - Run compression script               │ ◄── .github/workflows/scripts/
         │  - Auto-commit compressed images       │
         │  - Push back to origin                  │
         └─────────────────────────────────────────┘
```

## Best Practices

✅ **DO:**
- Run `npm run compress:images` before pushing large image changes
- Use WebP format for new images
- Review image quality after compression
- Test your changes locally before pushing

❌ **DON'T:**
- Use `--no-verify` to bypass hooks without reason
- Store uncompressed large images in git
- Commit multiple versions of the same image
- Keep backup PSD/source files in repository

## Contributing

If you modify the compression script:

1. Test locally first
2. Update this documentation
3. Ensure backwards compatibility
4. Update version in workflows
5. Create a tag: `git tag -a vX.Y.Z -m "Image compression script vX.Y.Z"`

## Support

For issues or improvements:
- Check `.github/workflows/nextjs-ci.yml` for current configuration
- Review `scripts/compress-images.js` for compression logic
- See `scripts/setup-hooks.sh` for hook setup details
