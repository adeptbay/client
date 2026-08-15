'use client';

import { useEffect } from 'react';
import Clarity from '@microsoft/clarity';

const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

/**
 * Session recording / heatmaps. Off entirely when no project id is
 * configured, matching the AdSense gating pattern in next.config.mjs —
 * the CSP only opens Clarity's hosts when this env var is set.
 */
export function ClarityAnalytics() {
  useEffect(() => {
    if (projectId) Clarity.init(projectId);
  }, []);

  return null;
}
