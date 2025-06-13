'use client';

import { useCase } from '@/lib/contexts/case-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function TimelinePage() {
  const { currentCase } = useCase();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!currentCase) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Case Timeline</CardTitle>
        <CardDescription>
          Key events and milestones for this case
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-start space-x-4">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
            <div>
              <div className="font-medium">Case Created</div>
              <div className="text-sm text-gray-600">{formatDateTime(currentCase.createdDate)}</div>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
            <div>
              <div className="font-medium">Incident Date</div>
              <div className="text-sm text-gray-600">{formatDate(currentCase.incident.incidentDate)}</div>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
            <div>
              <div className="font-medium">Status: {currentCase.caseStatus}</div>
              <div className="text-sm text-gray-600">Since {formatDate(currentCase.caseStatusFrom)}</div>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <div className="w-2 h-2 bg-gray-500 rounded-full mt-2"></div>
            <div>
              <div className="font-medium">Last Modified</div>
              <div className="text-sm text-gray-600">{formatDateTime(currentCase.modifiedDate)}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}