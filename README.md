# ReserBee Actions

Reusable GitHub Actions workflows for all ReserBee repositories.

## Available Workflows

### Next.js CI (`nextjs-ci.yml`)

For Next.js/React frontend projects with TypeScript.

**Checks:**
- ESLint linting
- TypeScript type checking
- Build verification
- Bundle size analysis
- Image size optimization with auto-compression
- Security audit

**Image Optimization:**
Uses a hybrid approach with local pre-commit hooks and CI/CD auto-compression. See [Image Optimization Guide](./docs/IMAGE_OPTIMIZATION.md) for details.

**Usage:**
```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    uses: ReserBee-com/reserbee-actions/.github/workflows/nextjs-ci.yml@main
    with:
      node-version: '20'
      bundle-size-limit: 500    # KB
      image-size-limit: 200     # KB
```

**Inputs:**
| Input | Default | Description |
|-------|---------|-------------|
| `node-version` | `20` | Node.js version |
| `bundle-size-limit` | `500` | Max total JS bundle size (KB) |
| `image-size-limit` | `200` | Max individual image size (KB) |
| `skip-typecheck` | `false` | Skip TypeScript checking |
| `working-directory` | `.` | Project root directory |

---

### Vanilla JS CI (`vanilla-js-ci.yml`)

For vanilla JavaScript projects (no build step).

**Checks:**
- ESLint linting
- File size validation (line count)
- Image size optimization
- HTML validation
- Security scan

**Usage:**
```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    uses: ReserBee-com/reserbee-actions/.github/workflows/vanilla-js-ci.yml@main
    with:
      node-version: '20'
      file-size-limit: 850      # lines
      image-size-limit: 200     # KB
```

**Inputs:**
| Input | Default | Description |
|-------|---------|-------------|
| `node-version` | `20` | Node.js version |
| `file-size-limit` | `850` | Max lines per file |
| `image-size-limit` | `200` | Max individual image size (KB) |
| `working-directory` | `.` | Project root directory |

---

### Backend CI (`backend-ci.yml`)

For Node.js/Express backend projects with Jest testing.

**Checks:**
- ESLint linting
- File size validation
- Unit tests
- Coverage validation with thresholds
- Security audit

**Usage:**
```yaml
name: CI
on:
  push:
    branches: [main, cloudflare]
  pull_request:
    branches: [main, cloudflare]

jobs:
  ci:
    uses: ReserBee-com/reserbee-actions/.github/workflows/backend-ci.yml@main
    with:
      node-version: '22'
      coverage-threshold-lines: 80
      coverage-threshold-functions: 75
      coverage-threshold-branches: 70
```

**Inputs:**
| Input | Default | Description |
|-------|---------|-------------|
| `node-version` | `22` | Node.js version |
| `file-size-limit` | `850` | Max lines per file |
| `coverage-threshold-lines` | `80` | Min line coverage % |
| `coverage-threshold-functions` | `75` | Min function coverage % |
| `coverage-threshold-branches` | `70` | Min branch coverage % |
| `working-directory` | `.` | Project root directory |

---

## Repository Requirements

### For Next.js projects

Required in `package.json`:
```json
{
  "scripts": {
    "lint": "next lint",
    "build": "next build"
  }
}
```

### For Vanilla JS projects

Required in `package.json`:
```json
{
  "scripts": {
    "lint": "eslint . --max-warnings 0"
  },
  "devDependencies": {
    "eslint": "^9.x",
    "@eslint/js": "^9.x",
    "globals": "^15.x"
  }
}
```

### For Backend projects

Required in `package.json`:
```json
{
  "scripts": {
    "test:unit": "jest --testPathPattern=unit",
    "test:coverage": "jest --coverage"
  }
}
```

---

## Repositories Using These Workflows

| Repository | Workflow |
|------------|----------|
| `twt-frontend` | `nextjs-ci.yml` |
| `bife-frontend` | `nextjs-ci.yml` |
| `mtnmemories-frontend` | `nextjs-ci.yml` |
| `camellobandido-frontend` | `nextjs-ci.yml` |
| `reserbee-website` | `nextjs-ci.yml` |
| `reserbee-admin` | `vanilla-js-ci.yml` |
| `reserbee-superadmin` | `vanilla-js-ci.yml` |
| `reserbee-backend` | `backend-ci.yml` |

---

## Image Optimization Setup

Each project using the Next.js CI workflow gets automatic image compression.

### First Time Setup

For projects that haven't set up image optimization yet:

```bash
# 1. Copy scripts to your project
cp -r ~/.../reserbee-actions/scripts ./

# 2. Install dependencies
npm install sharp --save-dev

# 3. Setup pre-commit hook
bash scripts/setup-hooks.sh

# 4. Test it works
npm run compress:images
```

### For Existing Projects

The setup script adds a pre-commit hook that runs automatically.

```bash
# No additional setup needed - hook runs on every commit
git add your-changes
git commit -m "Your message"
# Hook automatically checks and compresses images
```

See [Image Optimization Guide](./docs/IMAGE_OPTIMIZATION.md) for detailed documentation.

---

## Contributing

When updating workflows:
1. Test changes in a feature branch first
2. Update version tag after merging to main
3. Update this README with any new inputs/features
4. If modifying image compression, update `docs/IMAGE_OPTIMIZATION.md`
