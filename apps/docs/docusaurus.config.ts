import {themes as prismThemes} from 'prism-react-renderer';
import fs from 'fs';
import path from 'path';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const readPackageVersion = (filePath: string): string => {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw).version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
};

const docsBuildVersion = readPackageVersion(
  path.resolve(__dirname, '../../package.json'),
);
const protocolTrack = process.env.JACK_PROTOCOL_TRACK || 'v1';

const config: Config = {
  title: 'JACK Docs',
  tagline: 'Cross-chain execution kernel for intent-based transactions',
  favicon: 'img/jack-logo.png',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://docs.jack.lukas.money',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'hashpass-tech', // Usually your GitHub org/user name.
  projectName: 'JACK', // Usually your repo name.

  onBrokenLinks: 'throw',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],
  themes: ['@docusaurus/theme-mermaid'],
  markdown: {
    mermaid: true,
  },
  customFields: {
    docsBuildVersion,
    jackProtocolTrack: protocolTrack,
  },

  themeConfig: {
    // Replace with your project's social card
    image: 'img/jack-social-card.png',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: 'JACK',
      logo: {
        alt: 'JACK Logo',
        src: 'img/jack-logo.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {to: '/docs/demo-script', label: 'Demo', position: 'left'},
        {
          type: 'custom-jackRuntime' as any,
          position: 'right',
        },
        {
          to: '/go/dashboard',
          label: 'Dashboard',
          position: 'right',
          className: 'jack-navbar__cta',
        },
        {
          to: '/go/landing',
          label: 'Landing',
          position: 'right',
        },
        {
          href: 'https://github.com/hashpass-tech/JACK',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'light',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Mission & Overview',
              to: '/docs/overview',
            },
            {
              label: 'Setup',
              to: '/docs/setup',
            },
            {
              label: 'Architecture',
              to: '/docs/architecture',
            },
          ],
        },
        {
          title: 'Product',
          items: [
            {
              label: 'Landing',
              to: '/go/landing',
            },
            {
              label: 'Dashboard',
              to: '/go/dashboard',
            },
            {
              label: 'Demo Narrative',
              to: '/docs/demo-script',
            },
          ],
        },
        {
          title: 'Operations',
          items: [
            {
              label: 'Runbooks',
              to: '/docs/operations',
            },
            {
              label: 'Release Flow',
              to: '/docs/operations/release-flow',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/hashpass-tech/JACK',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} JACK.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
