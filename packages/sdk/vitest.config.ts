import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',
    
    // Test file patterns
    include: [
      'tests/unit/**/*.test.ts',
      'tests/integration/**/*.test.ts',
      'tests/property/**/*.test.ts'
    ],
    
    // Exclude patterns
    exclude: [
      'node_modules',
      'dist',
      '.gitkeep'
    ],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      
      // Coverage thresholds (>80% target per requirements 9.1)
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      },
      
      // Include source files for coverage
      include: ['src/**/*.ts'],
      
      // Exclude test files and type definitions
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'tests/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.config.ts'
      ]
    },
    
    // Global test timeout (30 seconds)
    testTimeout: 30000,
    
    // Hook timeout
    hookTimeout: 30000,
    
    // Globals (allows using describe, it, expect without imports)
    globals: true,
    
    // TypeScript support
    typecheck: {
      enabled: false // Can be enabled separately with vitest typecheck
    },
    
    // Reporter configuration
    reporters: ['verbose'],
    
    // Retry failed tests once (helps with flaky tests)
    retry: 1,
    
    // Run tests in parallel
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false
      }
    }
  },
  
  // Resolve configuration for TypeScript paths
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
