#!/usr/bin/env node

/**
 * Image Compression Script
 *
 * Compresses images that exceed size limits to ensure CI/CD compliance.
 * Automatically reduces quality until images meet the size threshold.
 *
 * Usage:
 *   node scripts/compress-images.js [--max-size 500] [--quality 60] [--dir ./public]
 *
 * Environment Variables:
 *   IMAGE_MAX_SIZE: Maximum image size in KB (default: 500)
 *   IMAGE_QUALITY: Starting quality level 0-100 (default: 60)
 *   IMAGE_DIR: Directory to scan for images (default: ./public)
 *   FAIL_ON_ERROR: Exit with code 1 if images exceed limit (default: true)
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Parse arguments
const args = process.argv.slice(2);
const getArg = (flag, defaultValue) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : defaultValue;
};

const CONFIG = {
  maxSizeKB: parseInt(getArg('--max-size', process.env.IMAGE_MAX_SIZE || 500)),
  initialQuality: parseInt(getArg('--quality', process.env.IMAGE_QUALITY || 60)),
  imageDir: getArg('--dir', process.env.IMAGE_DIR || './public'),
  failOnError: args.includes('--no-fail') ? false : (process.env.FAIL_ON_ERROR !== 'false'),
};

const MAX_ITERATIONS = 5; // Don't degrade quality more than 5 times
const QUALITY_STEP = 5; // Reduce quality by 5% each iteration

class ImageCompressor {
  constructor() {
    this.stats = {
      total: 0,
      compressed: 0,
      skipped: 0,
      failed: 0,
      oversized: [],
    };
  }

  log(message) {
    console.log(message);
  }

  formatSize(bytes) {
    return Math.round(bytes / 1024) + 'KB';
  }

  async compressImage(filePath, quality = CONFIG.initialQuality) {
    const ext = path.extname(filePath).toLowerCase();
    const sizeKB = Math.round(fs.statSync(filePath).size / 1024);

    if (sizeKB <= CONFIG.maxSizeKB) {
      return { success: true, message: `✓ ${filePath}: ${sizeKB}KB (within limit)` };
    }

    try {
      const tmpPath = filePath + '.tmp';
      let attempts = 0;
      let finalSizeKB = sizeKB;

      // Try to compress with decreasing quality
      while (finalSizeKB > CONFIG.maxSizeKB && attempts < MAX_ITERATIONS) {
        const currentQuality = Math.max(20, CONFIG.initialQuality - (attempts * QUALITY_STEP));

        if (ext === '.webp') {
          await sharp(filePath)
            .webp({ quality: currentQuality, alphaQuality: currentQuality })
            .toFile(tmpPath);
        } else if (['.jpg', '.jpeg'].includes(ext)) {
          await sharp(filePath)
            .jpeg({ quality: currentQuality, progressive: true })
            .toFile(tmpPath);
        } else if (ext === '.png') {
          await sharp(filePath)
            .png({ compressionLevel: 9 })
            .toFile(tmpPath);
        } else {
          return { success: false, message: `⊘ ${filePath}: Unsupported format` };
        }

        finalSizeKB = Math.round(fs.statSync(tmpPath).size / 1024);
        attempts++;
      }

      if (finalSizeKB <= CONFIG.maxSizeKB) {
        fs.renameSync(tmpPath, filePath);
        return {
          success: true,
          message: `✓ ${filePath}: ${sizeKB}KB → ${finalSizeKB}KB`,
        };
      } else {
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
        return {
          success: false,
          oversized: true,
          message: `✗ ${filePath}: ${finalSizeKB}KB (still exceeds ${CONFIG.maxSizeKB}KB limit after compression)`,
        };
      }
    } catch (error) {
      return { success: false, message: `✗ ${filePath}: ${error.message}` };
    }
  }

  async processDirectory(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });

    for (const file of files) {
      const filePath = path.join(dir, file.name);

      if (file.isDirectory()) {
        if (!['node_modules', '.next', '.git', 'dist', 'build'].includes(file.name)) {
          await this.processDirectory(filePath);
        }
      } else {
        const ext = path.extname(file.name).toLowerCase();
        if (['.webp', '.png', '.jpg', '.jpeg', '.gif'].includes(ext)) {
          this.stats.total++;
          const result = await this.compressImage(filePath);
          this.log(result.message);

          if (!result.success) {
            this.stats.failed++;
            if (result.oversized) {
              this.stats.oversized.push(filePath);
            }
          } else {
            this.stats.compressed++;
          }
        }
      }
    }
  }

  printReport() {
    console.log('\n' + '='.repeat(70));
    console.log('📊 IMAGE COMPRESSION REPORT');
    console.log('='.repeat(70));
    console.log(`Total images checked: ${this.stats.total}`);
    console.log(`Compressed: ${this.stats.compressed}`);
    console.log(`Failed: ${this.stats.failed}`);

    if (this.stats.oversized.length > 0) {
      console.log(`\n⚠️  Images still exceeding ${CONFIG.maxSizeKB}KB limit:`);
      this.stats.oversized.forEach(file => {
        const sizeKB = Math.round(fs.statSync(file).size / 1024);
        console.log(`  • ${file}: ${sizeKB}KB`);
      });
    }
    console.log('='.repeat(70) + '\n');
  }

  async run() {
    if (!fs.existsSync(CONFIG.imageDir)) {
      this.log(`❌ Directory not found: ${CONFIG.imageDir}`);
      process.exit(1);
    }

    this.log(`🔄 Compressing images (max size: ${CONFIG.maxSizeKB}KB)...\n`);
    await this.processDirectory(CONFIG.imageDir);
    this.printReport();

    if (this.stats.oversized.length > 0 && CONFIG.failOnError) {
      process.exit(1);
    }
  }
}

// Run
const compressor = new ImageCompressor();
compressor.run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
