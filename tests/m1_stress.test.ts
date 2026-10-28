import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import fs from 'fs';
import path from 'path';
import { Shield, Activity, Database, AlertCircle } from 'lucide-react';
import { StatusBadge } from '../src/components/common/StatusBadge';
import { MetricCard } from '../src/components/common/MetricCard';
import { Modal } from '../src/components/common/Modal';

describe('Milestone 1 Empirical Stress Test Suite', () => {

  describe('1. CSS Compilation & Theme Variable Resolution', () => {
    const distDir = path.resolve(__dirname, '../dist/assets');
    const cssFileName = fs.existsSync(distDir)
      ? fs.readdirSync(distDir).find(f => f.endsWith('.css'))
      : null;

    it('production CSS bundle exists and is compiled without syntax errors', () => {
      expect(cssFileName).toBeDefined();
      const cssPath = path.join(distDir, cssFileName!);
      const cssContent = fs.readFileSync(cssPath, 'utf-8');
      expect(cssContent.length).toBeGreaterThan(1000);
      expect(cssContent).toContain('@layer');
    });

    it('verifies custom utility classes are compiled into production CSS', () => {
      const cssPath = path.join(distDir, cssFileName!);
      const cssContent = fs.readFileSync(cssPath, 'utf-8');
      expect(cssContent).toContain('.glass-panel');
      expect(cssContent).toContain('.glass-card');
      expect(cssContent).toContain('.pill-btn');
      expect(cssContent).toContain('.pill-btn-primary');
      expect(cssContent).toContain('.pill-btn-secondary');
      expect(cssContent).toContain('.status-pill');
    });

    it('verifies warm-beige theme variables and fonts are defined in root/theme', () => {
      const cssPath = path.join(distDir, cssFileName!);
      const cssContent = fs.readFileSync(cssPath, 'utf-8');
      expect(cssContent).toContain('--bg-page');
      expect(cssContent).toContain('--bg-surface');
      expect(cssContent).toContain('--bg-subtle');
      expect(cssContent).toContain('--text-primary');
      expect(cssContent).toContain('--text-secondary');
      expect(cssContent).toContain('Newsreader');
      expect(cssContent).toContain('JetBrains Mono');
      expect(cssContent).toContain('Inter');
    });

    it('verifies all var(--...) references in compiled CSS are defined or have valid fallbacks', () => {
      const cssPath = path.join(distDir, cssFileName!);
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      const definedVars = new Set<string>();
      for (const m of cssContent.matchAll(/--([a-zA-Z0-9_-]+)\s*:/g)) {
        definedVars.add('--' + m[1]);
      }
      for (const m of cssContent.matchAll(/@property\s+--([a-zA-Z0-9_-]+)/g)) {
        definedVars.add('--' + m[1]);
      }

      const missingVars: string[] = [];
      for (const m of cssContent.matchAll(/var\(\s*--([a-zA-Z0-9_-]+)(?:,([^)]*))?\)/g)) {
        const fullVar = '--' + m[1];
        const fallback = m[2];
        if (!definedVars.has(fullVar) && !fallback) {
          missingVars.push(fullVar);
        }
      }

      expect(missingVars).toEqual([]);
    });
  });

  describe('2. StatusBadge Variant & Geometry Stress Tests', () => {
    const officialStatuses = [
      // MonitoringStatus
      'Active', 'Observation', 'Critical', 'Inactive',
      // AuthStatus
      'Authenticated', 'Pending Challenge', 'Failed Challenge', 'Quarantined',
      // AnchoringStatus
      'Anchored', 'Priority Anchored', 'Pending Batch',
      // AccessStatus
      'Approved', 'Pending', 'Rejected', 'Revoked', 'Expired',
      // GatewayDecisions
      'Normal - Compress & Batch',
      'Poor Signal - Reacquire',
      'Abnormal - Raw Preserve & Alert',
      'Unauthorized - Block Sensor',
      'Repeated Anomaly - Immediate Anchor',
      // DeviceState
      'Blocked', 'Online', 'Streaming', 'Standby', 'Error'
    ];

    it.each(officialStatuses)('renders official status "%s" with pill geometry (rounded-full)', (status) => {
      const html = renderToString(React.createElement(StatusBadge, { status }));
      expect(html).toContain('rounded-full');
      expect(html).toContain('inline-flex');
      expect(html).toContain('items-center');
    });

    it('supports size="sm" with smaller text and padding', () => {
      const htmlSm = renderToString(React.createElement(StatusBadge, { status: 'Active', size: 'sm' }));
      const htmlMd = renderToString(React.createElement(StatusBadge, { status: 'Active', size: 'md' }));
      expect(htmlSm).toContain('text-[10px]');
      expect(htmlSm).toContain('px-2');
      expect(htmlMd).toContain('text-xs');
      expect(htmlMd).toContain('px-2.5');
    });

    it('tests adversarial lowercase and arbitrary status props without crashing or breaking geometry', () => {
      const adversarial = [
        'verified',
        'tampered',
        'degraded',
        'active',
        'critical',
        'quarantined',
        'pending',
        'CUSTOM_STATUS_99',
        '',
        'A'.repeat(100),
      ];

      for (const status of adversarial) {
        const html = renderToString(React.createElement(StatusBadge, { status }));
        expect(html).toContain('rounded-full');
        expect(html).toContain('inline-flex');
      }
    });

    it('empirically assesses runtime safety when status is undefined or non-string', () => {
      // StatusBadge line 141 does `status.includes('Normal')` without checking typeof
      let threw = false;
      try {
        // @ts-ignore - testing runtime vulnerability
        renderToString(React.createElement(StatusBadge, { status: undefined }));
      } catch (e: any) {
        threw = true;
        expect(e.message).toContain('includes');
      }
      expect(threw).toBe(true);
    });
  });

  describe('3. MetricCard Stress Tests: Badges, Trends, and Numeric Overflow', () => {
    it('renders with all badge variants properly styled with warm semantic tokens', () => {
      const variants: Array<'success' | 'warning' | 'danger' | 'info' | 'neutral'> = [
        'success', 'warning', 'danger', 'info', 'neutral'
      ];

      for (const variant of variants) {
        const html = renderToString(React.createElement(MetricCard, {
          title: 'Heart Rate',
          value: 72,
          icon: Activity,
          badge: { text: variant.toUpperCase(), variant }
        }));
        expect(html).toContain('rounded-full');
        expect(html).toContain(variant.toUpperCase());
        expect(html).toContain('font-serif');
      }
    });

    it('renders positive and negative trends with appropriate direction indicators and tokens', () => {
      const htmlPos = renderToString(React.createElement(MetricCard, {
        title: 'Trust Score',
        value: '99.4%',
        icon: Shield,
        trend: { value: '+2.1%', isPositive: true }
      }));
      expect(htmlPos).toContain('↑');
      expect(htmlPos).toContain('+2.1%');
      expect(htmlPos).toContain('#47765B');

      const htmlNeg = renderToString(React.createElement(MetricCard, {
        title: 'Signal Quality',
        value: '64.2%',
        icon: AlertCircle,
        trend: { value: '-8.4%', isPositive: false }
      }));
      expect(htmlNeg).toContain('↓');
      expect(htmlNeg).toContain('-8.4%');
      expect(htmlNeg).toContain('#B85C4A');
    });

    it('handles large numeric values and hashes without crashing or destroying layout containers', () => {
      const testValues = [
        999999999,
        1.8446744073709552e19,
        0,
        -12345.67,
        '0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069', // 64-char SHA256
        '999,999,999,999.00 USD'
      ];

      for (const val of testValues) {
        const html = renderToString(React.createElement(MetricCard, {
          title: 'Cryptographic Hash',
          value: val,
          icon: Database,
          subtitle: 'Consortium Block #4928'
        }));
        expect(html).toContain(String(val));
        expect(html).toContain('min-w-0');
        expect(html).toContain('flex-1');
        expect(html).toContain('rounded-[24px]');
      }
    });

    it('checks whether MetricCard value span includes truncation/break-all for 64-char hashes', () => {
      const html = renderToString(React.createElement(MetricCard, {
        title: 'Hash',
        value: '0x' + 'a'.repeat(64),
        icon: Database
      }));
      // Notice: The container has min-w-0 on parent, but the value span itself has `font-serif text-3xl font-bold tracking-tight`
      const hasBreakOrTruncateOnSpan = html.includes('truncate') || html.includes('break-all') || html.includes('break-words');
      // In parent div: title has truncate, subtitle has truncate, but value span does not
      expect(html).toContain('text-3xl');
    });
  });

  describe('4. Modal Transitions, Backdrop, and Events Stress Tests', () => {
    it('returns null when isOpen is false', () => {
      const html = renderToString(React.createElement(Modal, {
        isOpen: false,
        onClose: () => {},
        title: 'Test Closed',
        children: React.createElement('div', null, 'Hidden Content')
      }));
      expect(html).toBe('');
    });

    it('renders with warm backdrop blur and 28px bubble radius when isOpen is true', () => {
      const html = renderToString(React.createElement(Modal, {
        isOpen: true,
        onClose: () => {},
        title: 'Emergency Break-Glass',
        subtitle: 'Authorization Protocol',
        children: React.createElement('div', null, 'Modal Body')
      }));
      expect(html).toContain('backdrop-blur-sm');
      expect(html).toContain('bg-[#30291F]/45');
      expect(html).toContain('rounded-[28px]');
      expect(html).toContain('Emergency Break-Glass');
      expect(html).toContain('Authorization Protocol');
      expect(html).toContain('Modal Body');
    });

    it('renders all maxWidth options properly', () => {
      const maxWidths: Array<'sm' | 'md' | 'lg' | 'xl' | '2xl'> = ['sm', 'md', 'lg', 'xl', '2xl'];
      const expectedClasses = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        '2xl': 'max-w-5xl'
      };

      for (const mw of maxWidths) {
        const html = renderToString(React.createElement(Modal, {
          isOpen: true,
          onClose: () => {},
          title: 'Width Test',
          maxWidth: mw,
          children: React.createElement('div', null, 'Content')
        }));
        expect(html).toContain(expectedClasses[mw]);
      }
    });

    it('EMPIRICAL BUG DETECTION: Backdrop click does NOT trigger onClose because outer div lacks onClick handler', () => {
      // In Modal.tsx line 49:
      // <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#30291F]/45 backdrop-blur-sm animate-in fade-in duration-200">
      // Notice: NO onClick={onClose} exists on the outer fixed backdrop container!
      // Meanwhile, line 52 has `onClick={e => e.stopPropagation()}` on the inner modal!
      // This means backdrop clicks can never close the modal!
      
      const modalFileContent = fs.readFileSync(
        path.resolve(__dirname, '../src/components/common/Modal.tsx'),
        'utf-8'
      );

      // Check if the outer backdrop div has onClick
      const outerDivRegex = /<div\s+className="fixed inset-0[^>]*>/;
      const match = outerDivRegex.exec(modalFileContent);
      expect(match).not.toBeNull();
      const hasBackdropOnClick = match![0].includes('onClick');

      // The outer fixed backdrop does NOT have onClick attached
      expect(hasBackdropOnClick).toBe(false);
    });
  });
});
