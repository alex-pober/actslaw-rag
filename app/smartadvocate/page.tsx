// app/smartadvocate/page.tsx - Updated to use the new dashboard
'use client';

import CaseDashboard from '@/components/CaseDashboard';
import { useCase } from '@/lib/contexts/case-context';

export default function SmartAdvocatePage() {
  return <CaseDashboard />;
}
