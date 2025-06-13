'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCase } from '@/lib/contexts/case-context';

export default function SmartAdvocatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentCase, loadCase } = useCase();

  const caseParam = searchParams.get('case');

  useEffect(() => {
    if (caseParam) {
      if (currentCase && currentCase.caseNumber === caseParam) {
        router.push(`/smartadvocate/${caseParam}`);
      } else {
        loadCase(caseParam).then(() => {
          router.push(`/smartadvocate/${caseParam}`);
        });
      }
    } else if (currentCase) {
      router.push(`/smartadvocate/${currentCase.caseNumber}`);
    }
  }, [caseParam, currentCase, router, loadCase]);

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="text-center text-gray-500 py-12">
        <div className="text-lg mb-2">SmartAdvocate Case Management</div>
        <div className="text-sm">
          {caseParam ? (
            'Loading case...'
          ) : (
            'Search for a case using the SA number in the navigation bar.'
          )}
        </div>
      </div>
    </div>
  );
}
