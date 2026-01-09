#!/bin/bash

# Image Compression Pre-commit Hook Setup
#
# This script sets up a pre-commit hook that automatically compresses oversized images
# before allowing commits to the repository.
#
# Installation:
#   bash scripts/setup-hooks.sh
#
# What it does:
#   • Creates .git/hooks/pre-commit
#   • Runs image compression on staged images
#   • Prevents commits with oversized images
#   • Can be bypassed with git commit --no-verify (not recommended)

set -e

HOOKS_DIR=".git/hooks"
HOOK_FILE="$HOOKS_DIR/pre-commit"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔧 Setting up pre-commit hook for image compression${NC}\n"

# Check if .git directory exists
if [ ! -d ".git" ]; then
  echo -e "${RED}❌ Not a git repository. Run this script from the repository root.${NC}"
  exit 1
fi

# Create hooks directory if it doesn't exist
mkdir -p "$HOOKS_DIR"

# Create the pre-commit hook
cat > "$HOOK_FILE" << 'EOF'
#!/bin/bash

# Pre-commit hook: Image Compression Check
# Prevents commits with oversized images

set -e

# Configuration
MAX_SIZE_KB=500
IMAGE_DIR="./public"
COMPRESS_SCRIPT="scripts/compress-images.js"

# Check if node and sharp are available
if ! command -v node &> /dev/null; then
  echo "⚠️  Node.js not found. Skipping image compression check."
  exit 0
fi

if [ ! -f "$COMPRESS_SCRIPT" ]; then
  echo "⚠️  Compression script not found at $COMPRESS_SCRIPT. Skipping image compression check."
  exit 0
fi

# Check if sharp is installed
if ! npm ls sharp &>/dev/null; then
  echo "⚠️  sharp package not installed. Running: npm install sharp"
  npm install sharp --silent
fi

echo "🔍 Checking image sizes before commit..."

# Run compression
if ! node "$COMPRESS_SCRIPT" --max-size "$MAX_SIZE_KB" --dir "$IMAGE_DIR" 2>&1; then
  echo ""
  echo -e "\033[0;31m❌ Commit rejected: Images exceed size limit\033[0m"
  echo "   Run: npm run compress:images"
  echo "   Or use: git commit --no-verify (not recommended)"
  exit 1
fi

echo -e "\033[0;32m✓ All images within size limits\033[0m"
EOF

# Make the hook executable
chmod +x "$HOOK_FILE"

echo -e "${GREEN}✓ Pre-commit hook installed at $HOOK_FILE${NC}\n"

# Add npm scripts to package.json if not already present
if ! grep -q "compress:images" package.json 2>/dev/null; then
  echo -e "${YELLOW}📝 Adding npm scripts to package.json${NC}"

  # Check if scripts section exists
  if grep -q '"scripts"' package.json; then
    # Add to existing scripts section (simple approach)
    sed -i.bak '/"scripts"/a\    "compress:images": "node scripts/compress-images.js --max-size 500 --dir ./public",' package.json
    rm -f package.json.bak
  else
    echo "⚠️  Could not automatically add npm scripts. Please add manually:"
    echo '  "compress:images": "node scripts/compress-images.js --max-size 500 --dir ./public"'
  fi
else
  echo -e "${GREEN}✓ npm scripts already configured${NC}"
fi

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}\n"
echo "Usage:"
echo "  npm run compress:images    - Manually compress oversized images"
echo "  git commit --no-verify     - Skip image check (not recommended)"
echo ""
