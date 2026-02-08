#!/usr/bin/env node
/**
 * Asset Upload Script for JACK Dashboard
 * 
 * Uploads public assets (videos, images) to Google Cloud Storage
 * for reliable CDN delivery across environments.
 * 
 * Usage:
 *   pnpm upload:assets [--env=testnet|production] [--dry-run]
 */

import { Storage } from '@google-cloud/storage';
import { createReadStream, statSync, readdirSync } from 'fs';
import { join, relative, extname } from 'path';
import { createHash } from 'crypto';

interface UploadConfig {
  env: 'testnet' | 'production';
  dryRun: boolean;
  bucketName: string;
  projectId: string;
  assetsDir: string;
  cdnUrl: string;
}

const CONFIGS: Record<string, Partial<UploadConfig>> = {
  testnet: {
    bucketName: 'jack-dashboard-testnet-assets',
    projectId: 'lsts-482607',
    cdnUrl: 'https://assets-testnet.jack.lukas.money',
  },
  production: {
    bucketName: 'jack-dashboard-assets',
    projectId: 'lsts-482607',
    cdnUrl: 'https://assets.jack.lukas.money',
  },
};

const ASSET_PATTERNS = [
  { dir: 'apps/dashboard/public/videos', contentType: 'video/mp4', cacheControl: 'public, max-age=31536000, immutable' },
  { dir: 'apps/dashboard/public', extensions: ['.png', '.jpg', '.jpeg', '.svg', '.ico', '.webmanifest'], contentType: 'auto', cacheControl: 'public, max-age=31536000, immutable' },
];

const CONTENT_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

function parseArgs(): UploadConfig {
  const args = process.argv.slice(2);
  const env = args.find(arg => arg.startsWith('--env='))?.split('=')[1] as 'testnet' | 'production' || 'testnet';
  const dryRun = args.includes('--dry-run');

  const config = CONFIGS[env];
  if (!config) {
    throw new Error(`Invalid environment: ${env}. Use 'testnet' or 'production'`);
  }

  return {
    env,
    dryRun,
    bucketName: config.bucketName!,
    projectId: config.projectId!,
    assetsDir: 'apps/dashboard/public',
    cdnUrl: config.cdnUrl!,
  };
}

function getFileHash(filePath: string): string {
  const hash = createHash('md5');
  const stream = createReadStream(filePath);
  
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  }) as any;
}

function getContentType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  return CONTENT_TYPES[ext] || 'application/octet-stream';
}

function* walkDir(dir: string, extensions?: string[]): Generator<string> {
  try {
    const files = readdirSync(dir, { withFileTypes: true });
    
    for (const file of files) {
      const fullPath = join(dir, file.name);
      
      if (file.isDirectory()) {
        yield* walkDir(fullPath, extensions);
      } else if (file.isFile()) {
        if (!extensions || extensions.includes(extname(file.name).toLowerCase())) {
          yield fullPath;
        }
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not read directory ${dir}:`, error);
  }
}

async function uploadFile(
  storage: Storage,
  bucketName: string,
  localPath: string,
  remotePath: string,
  contentType: string,
  cacheControl: string,
  dryRun: boolean
): Promise<void> {
  const stats = statSync(localPath);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
  
  console.log(`  📄 ${remotePath} (${sizeMB} MB)`);
  
  if (dryRun) {
    console.log(`     [DRY RUN] Would upload to gs://${bucketName}/${remotePath}`);
    return;
  }

  const bucket = storage.bucket(bucketName);
  const file = bucket.file(remotePath);

  await file.save(createReadStream(localPath), {
    metadata: {
      contentType,
      cacheControl,
      metadata: {
        uploadedAt: new Date().toISOString(),
      },
    },
    public: true,
    resumable: false,
  });

  console.log(`     ✅ Uploaded successfully`);
}

async function ensureBucket(storage: Storage, bucketName: string, projectId: string, dryRun: boolean): Promise<void> {
  if (dryRun) {
    console.log(`[DRY RUN] Would ensure bucket: ${bucketName}`);
    return;
  }

  const bucket = storage.bucket(bucketName);
  
  try {
    const [exists] = await bucket.exists();
    
    if (!exists) {
      console.log(`Creating bucket: ${bucketName}...`);
      await storage.createBucket(bucketName, {
        location: 'US',
        storageClass: 'STANDARD',
        iamConfiguration: {
          uniformBucketLevelAccess: {
            enabled: true,
          },
        },
        cors: [
          {
            origin: ['*'],
            method: ['GET', 'HEAD'],
            responseHeader: ['Content-Type', 'Access-Control-Allow-Origin'],
            maxAgeSeconds: 3600,
          },
        ],
      });
      
      // Make bucket publicly readable
      await bucket.setMetadata({
        iamConfiguration: {
          publicAccessPrevention: 'inherited',
        },
      });
      
      console.log(`✅ Bucket created: ${bucketName}`);
    } else {
      console.log(`✅ Bucket exists: ${bucketName}`);
    }
  } catch (error: any) {
    console.error(`Error ensuring bucket: ${error.message}`);
    throw error;
  }
}

async function main() {
  const config = parseArgs();
  
  console.log('🚀 JACK Dashboard Asset Upload');
  console.log('================================');
  console.log(`Environment: ${config.env}`);
  console.log(`Bucket: ${config.bucketName}`);
  console.log(`CDN URL: ${config.cdnUrl}`);
  console.log(`Dry Run: ${config.dryRun ? 'YES' : 'NO'}`);
  console.log('');

  const storage = new Storage({
    projectId: config.projectId,
  });

  // Ensure bucket exists
  await ensureBucket(storage, config.bucketName, config.projectId, config.dryRun);
  console.log('');

  let totalFiles = 0;
  let totalSize = 0;

  // Upload assets by pattern
  for (const pattern of ASSET_PATTERNS) {
    const files = Array.from(walkDir(pattern.dir, pattern.extensions));
    
    if (files.length === 0) {
      console.log(`⚠️  No files found in ${pattern.dir}`);
      continue;
    }

    console.log(`📦 Uploading from ${pattern.dir}:`);
    
    for (const filePath of files) {
      const relativePath = relative(config.assetsDir, filePath);
      const contentType = pattern.contentType === 'auto' ? getContentType(filePath) : pattern.contentType;
      
      try {
        await uploadFile(
          storage,
          config.bucketName,
          filePath,
          relativePath,
          contentType,
          pattern.cacheControl,
          config.dryRun
        );
        
        const stats = statSync(filePath);
        totalFiles++;
        totalSize += stats.size;
      } catch (error: any) {
        console.error(`     ❌ Failed: ${error.message}`);
      }
    }
    
    console.log('');
  }

  const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);
  console.log('================================');
  console.log(`✅ Upload complete!`);
  console.log(`   Files: ${totalFiles}`);
  console.log(`   Total size: ${totalSizeMB} MB`);
  console.log('');
  console.log(`🌐 Assets available at: ${config.cdnUrl}`);
  console.log('');
  console.log('Next steps:');
  console.log(`  1. Update NEXT_PUBLIC_CDN_URL=${config.cdnUrl} in your .env`);
  console.log(`  2. Update video src to use CDN URL in components`);
  console.log(`  3. Redeploy dashboard with new environment variable`);
}

main().catch((error) => {
  console.error('❌ Upload failed:', error);
  process.exit(1);
});
