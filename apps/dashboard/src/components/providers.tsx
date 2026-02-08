'use client';

import React, { useEffect, useState } from 'react';
import '@rainbow-me/rainbowkit/styles.css';
import {
    getDefaultConfig,
    RainbowKitProvider,
    darkTheme,
    lightTheme,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import {
    baseSepolia,
    arbitrumSepolia,
} from 'wagmi/chains';
import {
    QueryClientProvider,
    QueryClient,
} from "@tanstack/react-query";

const config = getDefaultConfig({
    appName: 'JACK',
    projectId: 'YOUR_PROJECT_ID', // Replaced with dummy for MVP
    chains: [baseSepolia, arbitrumSepolia],
    ssr: true, // If your dApp uses server side rendering (SSR)
});

const queryClient = new QueryClient();

const jackDarkTheme = darkTheme({
    accentColor: '#F2B94B',
    accentColorForeground: '#0B1020',
    borderRadius: 'large',
    fontStack: 'system',
});

const jackLightTheme = lightTheme({
    accentColor: '#D97706',
    accentColorForeground: '#FFFFFF',
    borderRadius: 'large',
    fontStack: 'system',
});

export function Providers({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<'dark' | 'light'>(() => {
        if (typeof document !== 'undefined') {
            const current = document.documentElement.getAttribute('data-theme');
            if (current === 'light') return 'light';
        }
        return 'dark';
    });

    useEffect(() => {
        // Watch for theme changes
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.attributeName === 'data-theme') {
                    const val = document.documentElement.getAttribute('data-theme');
                    setTheme(val === 'light' ? 'light' : 'dark');
                }
            }
        });
        observer.observe(document.documentElement, { attributes: true });
        return () => observer.disconnect();
    }, []);

    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider theme={theme === 'light' ? jackLightTheme : jackDarkTheme}>
                    <>{children}</>
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
