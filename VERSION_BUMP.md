# Version Bump Script

A comprehensive TypeScript script for managing version bumps across all project files in the FattureHub Tauri application.

## Overview

This script automates the process of updating version numbers across all configuration files, running builds to update lock files, and creating git tags. It ensures consistency between:

- `package.json` (Node.js/JavaScript)
- `src-tauri/Cargo.toml` (Rust)
- `src-tauri/tauri.conf.json` (Tauri configuration)

## Installation

The script is already set up in the project. It requires:
- Node.js (comes with the project)
- `tsx` (already installed as dev dependency)
- Git (for tag creation)

## Usage

### Basic Commands

```bash
# Bump patch version (default: 1.0.0 → 1.0.1)
npm run bumpVersion

# Bump minor version (1.0.0 → 1.1.0)
npm run bumpVersion -- --minor

# Bump major version (1.0.0 → 2.0.0)
npm run bumpVersion -- --major

# Set specific version
npm run bumpVersion -- --version 2.1.0

# Dry run (preview changes without modifying files)
npm run bumpVersion -- --dry-run --minor

# Skip build (faster, but lock files won't update)
npm run bumpVersion -- --skip-build

# Skip git tag creation
npm run bumpVersion -- --skip-tag

# Show help
npm run bumpVersion -- --help
```

**Note**: The double dash `--` is required to pass arguments to the underlying script when using npm run.

## What the Script Does

### 1. **Determines New Version**
- Reads current version from `package.json`
- Calculates new version based on flags:
  - `--major`: Increments major version, resets minor/patch to 0
  - `--minor`: Increments minor version, resets patch to 0
  - `--patch`: Increments patch version (default)
  - `--version`: Uses specified version (must be semantic: `X.X.X`)

### 2. **Updates Version Files**
- **`package.json`**: Updates `version` field
- **`src-tauri/Cargo.toml`**: Updates `version` in `[package]` section
- **`src-tauri/tauri.conf.json`**: Updates `version` at root level

### 3. **Runs Build (Optional)**
When not using `--skip-build`:
- Runs `npm install` to update `package-lock.json`
- Runs `cargo check` to update `Cargo.lock`
- Build failures are logged but don't stop the process

### 4. **Creates Git Tag (Optional)**
When not using `--skip-tag`:
1. Stages version-related files
2. Creates commit: `"chore: bump version to X.X.X"`
3. Creates annotated tag: `vX.X.X` with message `"Version X.X.X"`
4. If commit fails (no changes), creates tag only

## Examples

### Example 1: Standard Patch Bump
```bash
npm run bumpVersion
```
**Result**: `1.0.0` → `1.0.1`
- Updates all version files
- Runs build to update lock files
- Creates git tag `v1.0.1`

### Example 2: Minor Bump with Preview
```bash
npm run bumpVersion -- --dry-run --minor
```
**Output**:
```
🚀 Starting version bump...
📦 Current version: 1.0.0
🎯 New version: 1.1.0
🔍 Dry run - no files will be modified
```

### Example 3: Set Specific Version
```bash
npm run bumpVersion -- --version 2.0.0 --skip-build
```
**Result**: Sets version to `2.0.0`
- Updates version files
- Skips build (faster)
- Creates git tag `v2.0.0`

## Workflow Recommendations

### For Development
```bash
# Regular patch bumps during development
npm run bumpVersion

# When adding features (minor bump)
npm run bumpVersion -- --minor

# Preview before actual bump
npm run bumpVersion -- --dry-run --minor
```

### For Releases
```bash
# 1. Preview the bump
npm run bumpVersion -- --dry-run --minor

# 2. Execute the bump
npm run bumpVersion -- --minor

# 3. Push changes and tags
git push && git push --tags
```

### CI/CD Integration
The script can be integrated into CI/CD pipelines:
```bash
# In CI script
npm run bumpVersion -- --minor --skip-tag
# Then use CI's native tagging
```

## File Structure

```
scripts/
├── bump-version.ts    # Main script
package.json           # npm script: "bumpVersion"
src-tauri/
├── Cargo.toml         # Rust package manifest
├── Cargo.lock         # Rust dependencies (auto-updated)
└── tauri.conf.json    # Tauri configuration
```

## Error Handling

The script includes robust error handling:

- **Invalid version format**: Validates semantic versioning (`X.X.X`)
- **File not found**: Graceful exit with error message
- **Build failures**: Continues with version bump, logs warning
- **Git errors**: Attempts to create tag even if commit fails
- **Dry run**: No side effects, only shows what would happen

## Customization

To modify the script behavior, edit `scripts/bump-version.ts`:

- **Add more files**: Extend the file update methods
- **Change commit message**: Modify `createGitTag()` method
- **Add pre/post hooks**: Insert custom logic before/after steps
- **Change tag format**: Update tag creation logic (currently `vX.X.X`)

## Troubleshooting

### Common Issues

1. **"Unknown argument" warning**
   - Ensure you're using `--` before script arguments: `npm run bumpVersion -- --minor`

2. **Git tag already exists**
   - Delete existing tag: `git tag -d vX.X.X`
   - Force update: `git tag -f -a vX.X.X -m "Version X.X.X"`

3. **Build takes too long**
   - Use `--skip-build` for faster execution
   - Lock files won't be updated automatically

4. **Version files out of sync**
   - The script will sync all files to the new version
   - Current mismatches (package.json: 1.0.0, Cargo.toml: 1.1.1) are handled

### Debug Mode
For detailed output, you can modify the script to add verbose logging or run with Node debug flags:
```bash
node --inspect scripts/bump-version.ts --dry-run --minor
```

## Best Practices

1. **Always dry run first**: Preview changes before executing
2. **Commit changes before bumping**: Ensure clean working directory
3. **Use semantic versioning**: Follow `MAJOR.MINOR.PATCH` conventions
4. **Push tags**: Remember to `git push --tags` after bumping
5. **Document version changes**: Update CHANGELOG.md alongside version bumps

## Versioning Strategy

- **MAJOR**: Breaking changes, incompatible API changes
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, minor improvements, backward compatible

Example workflow:
- Development: `1.0.0` → `1.0.1` → `1.0.2` (patch bumps)
- Feature release: `1.0.2` → `1.1.0` (minor bump)
- Major overhaul: `1.1.0` → `2.0.0` (major bump)

## License

This script is part of the FattureHub project and follows the same licensing terms.