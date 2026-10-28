import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import fs from 'fs';
import path from 'path';
import { StatusBadge } from '../src/components/common/StatusBadge';
import { MetricCard } from '../src/components/common/MetricCard';
import { Modal } from '../src/components/common/Modal';
import { ToastProvider, ToastType } from '../src/context/ToastContext';
import { Activity, Shield } from 'lucide-react';

describe('Milestone 1 Typography & Theme Adversarial Stress Tests (Challenger 2)', () => {
  const rootDir = process.cwd();
  const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');
  const indexCss = fs.readFileSync(path.join(rootDir, 'src/index.css'), 'utf-8');

  describe('1. Google Font Loading and Fallback Fonts', () => {
    it('verifies Google Font preconnect links exist in index.html', () => {
      expect(indexHtml).toContain('<link rel="preconnect" href="https://fonts.googleapis.com">');
      expect(indexHtml).toContain('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>');
    });

    it('verifies Google Fonts link imports Newsreader, Inter, and JetBrains Mono with display=swap', () => {
      const match = indexHtml.match(/https:\/\/fonts\.googleapis\.com\/css2\?[^"']+/);
      expect(match).not.toBeNull();
      const fontUrl = match![0];
      expect(fontUrl).toContain('family=Newsreader');
      expect(fontUrl).toContain('family=Inter');
      expect(fontUrl).toContain('family=JetBrains+Mono');
      expect(fontUrl).toContain('display=swap');
    });

    it('verifies fallback font stack in src/index.css includes Georgia and serif for Newsreader', () => {
      expect(indexCss).toContain('--font-serif: "Newsreader", "Fraunces", Georgia, Cambria, serif;');
      expect(indexCss).toContain("font-family: 'Newsreader', 'Fraunces', Georgia, Cambria, serif;");
    });

    it('verifies fallback font stack in src/index.css includes system sans-serif for Inter', () => {
      expect(indexCss).toContain('--font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;');
    });

    it('verifies fallback font stack in src/index.css includes monospace fallbacks for JetBrains Mono', () => {
      expect(indexCss).toContain('--font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;');
    });
  });

  describe('2. Adversarial Color Palette Audit (No Pure Blacks or Saturated Neons)', () => {
    const targetFiles = [
      'index.html',
      'src/index.css',
      'src/context/ToastContext.tsx',
      'src/components/common/StatusBadge.tsx',
      'src/components/common/MetricCard.tsx',
      'src/components/common/Modal.tsx',
    ];

    const pureBlackPatterns = [
      /#000000\b/i,
      /#000\b/i,
      /\brgb\s*\(\s*0\s*,\s*0\s*,\s*0\s*\)/i,
      /\brgba\s*\(\s*0\s*,\s*0\s*,\s*0\s*,/i,
      /\btext-black\b/i,
      /\bbg-black\b/i,
      /\bborder-black\b/i,
    ];

    const saturatedNeonPatterns = [
      /\b(?:text|bg|border)-(?:red|green|blue|yellow|purple|pink|indigo|cyan|emerald|teal)-(?:400|500|600)\b/,
      /#ff0000\b/i,
      /#00ff00\b/i,
      /#0000ff\b/i,
      /#00ffff\b/i,
      /#ff00ff\b/i,
      /#ffff00\b/i,
    ];

    for (const file of targetFiles) {
      const content = fs.readFileSync(path.join(rootDir, file), 'utf-8');

      it(`verifies ${file} contains zero pure black instances`, () => {
        for (const pat of pureBlackPatterns) {
          const match = content.match(pat);
          expect(match, `Found pure black matching ${pat} in ${file}`).toBeNull();
        }
      });

      it(`verifies ${file} contains zero saturated neon instances`, () => {
        for (const pat of saturatedNeonPatterns) {
          const match = content.match(pat);
          expect(match, `Found saturated neon matching ${pat} in ${file}`).toBeNull();
        }
      });
    }
  });

  describe('3. ToastContext Concurrency, Rapid Additions, and Dismissals', () => {
    it('generates 50,000 unique IDs without a single collision in tight loop', () => {
      const ids = new Set<string>();
      const COUNT = 50000;
      for (let i = 0; i < COUNT; i++) {
        ids.add(`toast-${Date.now()}-${Math.random()}`);
      }
      expect(ids.size).toBe(COUNT);
    });

    it('handles simulated rapid concurrent additions and interleaved dismissals without state dropping', () => {
      type SimulatedToast = { id: string; type: ToastType; title: string; message: string; duration: number };
      let toasts: SimulatedToast[] = [];

      const addToast = (t: Omit<SimulatedToast, 'id'>) => {
        const id = `toast-${Date.now()}-${Math.random()}`;
        toasts = [...toasts, { ...t, id }];
        return id;
      };

      const removeToast = (id: string) => {
        toasts = toasts.filter(t => t.id !== id);
      };

      // Add 200 toasts rapidly
      const ids: string[] = [];
      for (let i = 0; i < 200; i++) {
        ids.push(addToast({
          type: (['success', 'warning', 'error', 'info'] as ToastType[])[i % 4],
          title: `Rapid Toast ${i}`,
          message: `Rapid message payload ${i}`,
          duration: 4000,
        }));
      }
      expect(toasts.length).toBe(200);

      // Dismiss 100 randomly
      const dismissSet = ids.slice(0, 100);
      for (const id of dismissSet) {
        removeToast(id);
      }
      expect(toasts.length).toBe(100);

      // Idempotent re-dismiss
      for (const id of dismissSet) {
        removeToast(id);
      }
      expect(toasts.length).toBe(100);

      // Dismiss all remaining
      for (const id of ids.slice(100)) {
        removeToast(id);
      }
      expect(toasts.length).toBe(0);
    });

    it('verifies ToastProvider renders container with fixed bottom-4 right-4 and pointer-events-none', () => {
      const html = renderToString(
        React.createElement(ToastProvider, null, React.createElement('div', null, 'App Body'))
      );
      expect(html).toContain('fixed bottom-4 right-4 z-50');
      expect(html).toContain('max-w-md w-full pointer-events-none');
    });
  });

  describe('4. Component Rendering Stability & Geometric Integrity', () => {
    it('verifies StatusBadge renders all clinical statuses with rounded-full pill geometry', () => {
      const statuses = [
        'Active', 'Critical', 'Observation', 'Inactive',
        'Authenticated', 'Pending Challenge', 'Failed Challenge', 'Quarantined', 'Blocked',
        'Anchored', 'Priority Anchored', 'Pending Batch',
        'Approved', 'Pending', 'Rejected', 'Revoked',
        'Normal Operation', 'Poor Signal Quality', 'Abnormal Vitals Detected',
        'Unauthorized Sensor Node', 'Repeated Replay Attack',
        'Fallback Unknown Status',
      ];

      for (const st of statuses) {
        const sm = renderToString(React.createElement(StatusBadge, { status: st, size: 'sm' }));
        const md = renderToString(React.createElement(StatusBadge, { status: st, size: 'md' }));
        expect(sm).toContain('rounded-full');
        expect(md).toContain('rounded-full');
        expect(sm).toContain('text-[10px]');
        expect(md).toContain('text-xs');
      }
    });

    it('verifies MetricCard handles extreme numbers and all badge variants', () => {
      const card = renderToString(
        React.createElement(MetricCard, {
          title: 'Total Cryptographic Invocations Across Active Healthcare Nodes',
          value: '18,446,744,073,709,551,615',
          subtitle: 'Sub-millisecond SHA-256 rolling digest count',
          icon: Activity,
          badge: { text: 'REALTIME', variant: 'info' },
          trend: { value: '+14.2% vs last block', isPositive: true },
        })
      );
      expect(card).toContain('rounded-[24px]');
      expect(card).toContain('font-serif');
      expect(card).toContain('font-mono');
      expect(card).toContain('rounded-full');
    });

    it('verifies Modal renders null when isOpen=false and renders warm backdrop when isOpen=true', () => {
      const closed = renderToString(
        React.createElement(Modal, {
          isOpen: false,
          onClose: () => {},
          title: 'Closed Modal',
          children: React.createElement('div', null, 'Test'),
        })
      );
      expect(closed).toBe('');

      const open = renderToString(
        React.createElement(Modal, {
          isOpen: true,
          onClose: () => {},
          title: 'Open Clinical Dialog',
          children: React.createElement('p', null, 'Modal Contents'),
        })
      );
      expect(open).toContain('rounded-[28px]');
      expect(open).toContain('font-serif');
      expect(open).toContain('backdrop-blur');
    });
  });
});
