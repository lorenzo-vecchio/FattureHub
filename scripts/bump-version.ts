#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { join } from 'node:path'

const execAsync = promisify(exec)

interface VersionBumpOptions {
  major?: boolean
  minor?: boolean
  patch?: boolean
  version?: string
  dryRun?: boolean
  skipTag?: boolean
  skipBuild?: boolean
}

class VersionBumper {
  private packageJsonPath = './package.json'
  private cargoTomlPath = './src-tauri/Cargo.toml'
  private tauriConfPath = './src-tauri/tauri.conf.json'
  
  private currentVersion = ''
  private newVersion = ''
  
  async run(options: VersionBumpOptions) {
    try {
      console.log('🚀 Starting version bump...')
      
      // Determine new version
      await this.determineNewVersion(options)
      
      console.log(`📦 Current version: ${this.currentVersion}`)
      console.log(`🎯 New version: ${this.newVersion}`)
      
      if (options.dryRun) {
        console.log('🔍 Dry run - no files will be modified')
        return
      }
      
      // Update files
      await this.updatePackageJson()
      await this.updateCargoToml()
      await this.updateTauriConf()
      
      console.log('✅ All version files updated successfully!')
      
      // Run build to update lock files
      if (!options.skipBuild && !options.dryRun) {
        await this.runBuild()
      }
      
      // Create git commit and tag
      if (!options.skipTag && !options.dryRun) {
        await this.createGitTag()
      }
      
      console.log(`🎉 Version bumped to ${this.newVersion} successfully!`)
      
    } catch (error) {
      console.error('❌ Error during version bump:', error)
      process.exit(1)
    }
  }
  
  private async determineNewVersion(options: VersionBumpOptions) {
    // Read current version from package.json
    const packageJson = JSON.parse(await readFile(this.packageJsonPath, 'utf-8'))
    this.currentVersion = packageJson.version
    
    if (options.version) {
      // Use provided version
      if (!this.isValidVersion(options.version)) {
        throw new Error(`Invalid version format: ${options.version}. Use semantic versioning (e.g., 1.2.3)`)
      }
      this.newVersion = options.version
    } else {
      // Bump based on flags
      const [major, minor, patch] = this.currentVersion.split('.').map(Number)
      
      if (options.major) {
        this.newVersion = `${major + 1}.0.0`
      } else if (options.minor) {
        this.newVersion = `${major}.${minor + 1}.0`
      } else if (options.patch) {
        this.newVersion = `${major}.${minor}.${patch + 1}`
      } else {
        // Default to patch bump
        this.newVersion = `${major}.${minor}.${patch + 1}`
      }
    }
  }
  
  private isValidVersion(version: string): boolean {
    return /^\d+\.\d+\.\d+$/.test(version)
  }
  
  private async updatePackageJson() {
    console.log('📝 Updating package.json...')
    const packageJson = JSON.parse(await readFile(this.packageJsonPath, 'utf-8'))
    packageJson.version = this.newVersion
    await writeFile(this.packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n')
  }
  
  private async updateCargoToml() {
    console.log('📝 Updating Cargo.toml...')
    let cargoContent = await readFile(this.cargoTomlPath, 'utf-8')
    
    // Update version in [package] section
    cargoContent = cargoContent.replace(
      /^version\s*=\s*"[^"]+"$/m,
      `version = "${this.newVersion}"`
    )
    
    await writeFile(this.cargoTomlPath, cargoContent)
  }
  
  private async updateTauriConf() {
    console.log('📝 Updating tauri.conf.json...')
    const tauriConf = JSON.parse(await readFile(this.tauriConfPath, 'utf-8'))
    
    // Update version at root level (Tauri 2.x format)
    tauriConf.version = this.newVersion
    
    await writeFile(this.tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n')
  }
  
  private async runBuild() {
    console.log('🔨 Running build to update lock files...')
    
    try {
      // Run npm install to update package-lock.json
      console.log('📦 Updating package-lock.json...')
      await execAsync('npm install')
      
      // Run cargo check to update Cargo.lock
      console.log('🦀 Updating Cargo.lock...')
      await execAsync('cd src-tauri && cargo check')
      
      console.log('✅ Build completed and lock files updated!')
      
    } catch (error: any) {
      console.warn('⚠️  Build failed, but continuing with version bump:', error.message)
    }
  }
  
  private async createGitTag() {
    console.log('🏷️  Creating git tag...')
    
    try {
      // Stage all version-related files
      await execAsync('git add package.json package-lock.json src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/tauri.conf.json')
      
      // Create commit
      await execAsync(`git commit -m "chore: bump version to ${this.newVersion}"`)
      
      // Create tag in format vx.x.x
      const tagName = `v${this.newVersion}`
      await execAsync(`git tag -a ${tagName} -m "Version ${this.newVersion}"`)
      
      console.log(`📌 Created tag ${tagName}`)
      
    } catch (error: any) {
      // If commit fails (maybe no changes), still try to create tag
      if (error.message.includes('nothing to commit')) {
        console.log('📌 No changes to commit, creating tag only...')
        const tagName = `v${this.newVersion}`
        await execAsync(`git tag -a ${tagName} -m "Version ${this.newVersion}"`)
      } else {
        throw error
      }
    }
  }
}

// Parse command line arguments
function parseArgs(): VersionBumpOptions {
  const args = process.argv.slice(2)
  const options: VersionBumpOptions = {}
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    
    switch (arg) {
      case '--major':
        options.major = true
        break
      case '--minor':
        options.minor = true
        break
      case '--patch':
        options.patch = true
        break
      case '--dry-run':
        options.dryRun = true
        break
      case '--skip-tag':
        options.skipTag = true
        break
      case '--skip-build':
        options.skipBuild = true
        break
      case '--version':
        if (i + 1 < args.length) {
          options.version = args[++i]
        } else {
          throw new Error('--version requires a value')
        }
        break
      case '--help':
      case '-h':
        printHelp()
        process.exit(0)
      default:
        console.warn(`⚠️  Unknown argument: ${arg}`)
    }
  }
  
  return options
}

function printHelp() {
  console.log(`
Version Bump Script
===================

Usage: npm run bumpVersion [options]

Options:
  --major           Bump major version (1.0.0 → 2.0.0)
  --minor           Bump minor version (1.0.0 → 1.1.0)
  --patch           Bump patch version (1.0.0 → 1.0.1) [default]
  --version <ver>   Set specific version (e.g., 2.1.0)
  --dry-run         Show what would be changed without modifying files
  --skip-tag        Skip creating git tag
  --skip-build      Skip running build to update lock files
  --help, -h        Show this help message

Examples:
  npm run bumpVersion                    # Bump patch version, run build, create tag
  npm run bumpVersion --minor            # Bump minor version
  npm run bumpVersion --version 2.0.0    # Set to specific version
  npm run bumpVersion --dry-run --minor  # Dry run for minor bump
  npm run bumpVersion --skip-build       # Skip build (faster but lock files won't update)
  `)
}

// Main execution
async function main() {
  try {
    const options = parseArgs()
    const bumper = new VersionBumper()
    await bumper.run(options)
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

// Check if this is the main module (not imported)
const isMain = import.meta.url === `file://${process.argv[1]}`
if (isMain) {
  main()
}