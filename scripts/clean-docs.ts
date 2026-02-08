#!/usr/bin/env node
/**
 * Clean Documentation Script
 * 
 * Archives non-essential markdown files from the root directory to docs/archive.
 * Keeps only critical root-level documentation files like README, LICENSE, CHANGELOG.
 * 
 * Usage:
 *   pnpm clean:docs
 *   node scripts/clean-docs.ts
 */

import { readdir, mkdir, rename, access } from 'fs/promises';
import { join, basename } from 'path';
import { constants } from 'fs';

// Essential files that should stay in root
const KEEP_IN_ROOT = new Set([
  'README.md',
  'CHANGELOG.md',
  'LICENSE.md',
  'LICENSE',
  'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md',
  'SECURITY.md',
]);

// Archive directory
const ARCHIVE_DIR = 'docs/archive';

/**
 * Check if a file exists
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all markdown files in root directory
 */
async function getRootMarkdownFiles(): Promise<string[]> {
  const files = await readdir('.');
  return files.filter(file => 
    file.endsWith('.md') && 
    !file.startsWith('.') &&
    !KEEP_IN_ROOT.has(file)
  );
}

/**
 * Archive a file to docs/archive with timestamp
 */
async function archiveFile(filename: string): Promise<void> {
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const baseName = basename(filename, '.md');
  const archiveName = `${baseName}_${timestamp}.md`;
  const archivePath = join(ARCHIVE_DIR, archiveName);
  
  // Check if archive file already exists
  if (await fileExists(archivePath)) {
    // Add time suffix if file exists
    const timeStamp = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('_');
    const uniqueArchiveName = `${baseName}_${timeStamp}.md`;
    const uniqueArchivePath = join(ARCHIVE_DIR, uniqueArchiveName);
    await rename(filename, uniqueArchivePath);
    console.log(`  ✓ Archived: ${filename} → ${uniqueArchivePath}`);
  } else {
    await rename(filename, archivePath);
    console.log(`  ✓ Archived: ${filename} → ${archivePath}`);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🧹 Cleaning root documentation files...\n');
  
  // Ensure archive directory exists
  try {
    await mkdir(ARCHIVE_DIR, { recursive: true });
    console.log(`📁 Archive directory ready: ${ARCHIVE_DIR}\n`);
  } catch (error) {
    console.error(`❌ Failed to create archive directory: ${error}`);
    process.exit(1);
  }
  
  // Get files to archive
  const filesToArchive = await getRootMarkdownFiles();
  
  if (filesToArchive.length === 0) {
    console.log('✨ No files to archive. Root is clean!\n');
    return;
  }
  
  console.log(`📦 Found ${filesToArchive.length} file(s) to archive:\n`);
  
  // Archive each file
  let successCount = 0;
  let errorCount = 0;
  
  for (const file of filesToArchive) {
    try {
      await archiveFile(file);
      successCount++;
    } catch (error) {
      console.error(`  ❌ Failed to archive ${file}: ${error}`);
      errorCount++;
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Successfully archived: ${successCount} file(s)`);
  if (errorCount > 0) {
    console.log(`❌ Failed to archive: ${errorCount} file(s)`);
  }
  console.log('\n📋 Keeping in root:');
  KEEP_IN_ROOT.forEach(file => console.log(`  - ${file}`));
  console.log('='.repeat(60) + '\n');
  
  if (errorCount > 0) {
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
