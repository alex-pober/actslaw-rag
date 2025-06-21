'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCase } from '@/lib/contexts/case-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building, Calendar, Clock, MapPin } from 'lucide-react';

interface CaseLayoutProps {
  children: React.ReactNode;
}

export default function CaseLayout({ children }: CaseLayoutProps) {
  const params = useParams();
  const router = useRouter();
  const { currentCase, loadCase, isLoading, error } = useCase();
  const caseId = params.caseId as string;

  useEffect(() => {
    // Only load case if we're actually on a case route and don't have the current case loaded
    if (caseId && (!currentCase || currentCase.caseNumber !== caseId)) {
      loadCase(caseId);
    }
  }, [caseId, currentCase, loadCase]);

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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'open':
        return 'bg-green-100 text-green-800';
      case 'closed':
      case 'resolved':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'urgent':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getCurrentTab = () => {
    const path = window.location.pathname;
    if (path.includes('/documents')) return 'documents';
    if (path.includes('/notes')) return 'notes';
    if (path.includes('/tasks')) return 'tasks';
    if (path.includes('/timeline')) return 'timeline';
    return 'overview';
  };

  const handleTabChange = (value: string) => {
    const basePath = `/smartadvocate/${caseId}`;
    if (value === 'overview') {
      router.push(basePath);
    } else {
      router.push(`${basePath}/${value}`);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="text-center py-12">
          <div className="text-lg">Loading case...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="text-center text-red-500 py-12">
          <div className="text-lg mb-2">Error loading case</div>
          <div className="text-sm">{error}</div>
          <Button
            onClick={() => router.push('/smartadvocate')}
            className="mt-4"
          >
            Back to Case Search
          </Button>
        </div>
      </div>
    );
  }

  if (!currentCase) {
    return (
      <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="text-center text-gray-500 py-12">
          <div className="text-lg mb-2">Case not found</div>
          <div className="text-sm">Case #{caseId} could not be loaded.</div>
          <Button
            onClick={() => router.push('/smartadvocate')}
            className="mt-4"
          >
            Back to Case Search
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full px-4 mx-auto">
      {/* Case Header */}
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{currentCase.caseName}</h1>
            <p className="text-lg text-gray-600">Case #{currentCase.caseNumber}</p>
          </div>
          <div className="text-right">
            <Badge className={getStatusColor(currentCase.caseStatus)}>
              {currentCase.caseStatus}
            </Badge>
            <div className="text-sm text-gray-500 mt-1">ID: {currentCase.caseID}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center space-x-2">
            <Building className="w-4 h-4 text-gray-400" />
            <div>
              <div className="text-sm font-medium text-gray-500">Office</div>
              <div className="text-sm">{currentCase.officeName}</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <div>
              <div className="text-sm font-medium text-gray-500">Incident Date</div>
              <div className="text-sm">{formatDate(currentCase.incident.incidentDate)}</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            <div>
              <div className="text-sm font-medium text-gray-500">State</div>
              <div className="text-sm">{currentCase.incident.state}</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <div>
              <div className="text-sm font-medium text-gray-500">Last Modified</div>
              <div className="text-sm">{formatDateTime(currentCase.modifiedDate)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={getCurrentTab()} onValueChange={handleTabChange} className="space-y-3">
        <TabsList className="grid w-full grid-cols-5 max-w-6xl mx-auto mt-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        {/* Page Content */}
        <div>{children}</div>
      </Tabs>
    </div>
  );
}
