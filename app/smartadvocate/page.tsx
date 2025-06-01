'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import smartAdvocateClient from '@/lib/smartadvocate/client';
import { toast } from '@/components/ui/use-toast';

interface CaseData {
  caseID: number;
  caseNumber: string;
  caseName: string;
  caseGroup: string;
  caseType: string;
  caseStatus: string;
  caseStatusFrom: string;
  officeName: string;
  incident: {
    incidentDate: string;
    state: string;
  };
  plaintiffs: Array<{
    name: string;
    role: string;
    primary: boolean;
  }>;
  defendant: Array<{
    name: string;
    role: string;
    primary: boolean;
  }>;
  caseStaff: Array<{
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    phone?: string;
  }>;
  createdDate: string;
  modifiedDate: string;
}

export default function SmartAdvocatePage() {
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [caseNumber, setCaseNumber] = useState('25103');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCase = async () => {
    if (!caseNumber.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a case number",
      });
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await smartAdvocateClient.getCase(caseNumber);

      // Handle array response - take the first case
      const caseInfo = Array.isArray(data) ? data[0] : data;

      if (!caseInfo) {
        throw new Error('No case found with that number');
      }

      setCaseData(caseInfo);
      toast({
        title: "Success",
        description: `Loaded case ${caseInfo.caseNumber}`,
      });
    } catch (err: any) {
      setError(err.message);
      setCaseData(null);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="max-w-6xl m-4 sm:m-10 flex flex-col gap-8 grow">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold">SmartAdvocate Case Lookup</h1>
        <p className="text-gray-600">
          Enter a case number to retrieve and display case information from SmartAdvocate.
        </p>
      </div>

      {/* Case Number Input */}
      <div className="flex gap-4 items-end">
        <div className="flex flex-col gap-2">
          <label htmlFor="caseNumber" className="text-sm font-medium">Case Number</label>
          <Input
            id="caseNumber"
            type="text"
            value={caseNumber}
            onChange={(e) => setCaseNumber(e.target.value)}
            placeholder="Enter case number (e.g., 25103)"
            className="w-48"
          />
        </div>
        <Button onClick={loadCase} disabled={loading}>
          {loading ? 'Loading...' : 'Load Case'}
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error</h3>
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Case Data Display */}
      {caseData && (
        <div className="space-y-6">
          {/* Main Case Info */}
          <div className="bg-white border rounded-lg p-6 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{caseData.caseName}</h2>
                <p className="text-lg text-gray-600">Case #{caseData.caseNumber}</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Case ID</div>
                <div className="text-lg font-semibold">{caseData.caseID}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-500">Status</div>
                <div className="text-lg">{caseData.caseStatus}</div>
                <div className="text-xs text-gray-400">Since {formatDate(caseData.caseStatusFrom)}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Case Type</div>
                <div className="text-lg">{caseData.caseType}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Case Group</div>
                <div className="text-lg">{caseData.caseGroup}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Office</div>
                <div className="text-lg">{caseData.officeName}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Incident Date</div>
                <div className="text-lg">{formatDate(caseData.incident.incidentDate)}</div>
                <div className="text-xs text-gray-400">{caseData.incident.state}</div>
              </div>
            </div>
          </div>

          {/* Parties */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Plaintiffs */}
            <div className="bg-white border rounded-lg p-6 shadow-sm">
              <h3 className="text-xl font-semibold mb-4 text-green-700">Plaintiffs</h3>
              <div className="space-y-3">
                {caseData.plaintiffs.map((plaintiff, index) => (
                  <div key={index} className="border-l-4 border-green-200 pl-4">
                    <div className="font-medium">{plaintiff.name}</div>
                    <div className="text-sm text-gray-600">{plaintiff.role}</div>
                    {plaintiff.primary && (
                      <div className="text-xs text-green-600 font-medium">Primary</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Defendants */}
            <div className="bg-white border rounded-lg p-6 shadow-sm">
              <h3 className="text-xl font-semibold mb-4 text-red-700">Defendants</h3>
              <div className="space-y-3">
                {caseData.defendant.map((defendant, index) => (
                  <div key={index} className="border-l-4 border-red-200 pl-4">
                    <div className="font-medium">{defendant.name}</div>
                    <div className="text-sm text-gray-600">{defendant.role}</div>
                    {defendant.primary && (
                      <div className="text-xs text-red-600 font-medium">Primary</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Case Staff */}
          <div className="bg-white border rounded-lg p-6 shadow-sm">
            <h3 className="text-xl font-semibold mb-4">Case Staff</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {caseData.caseStaff.map((staff, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="font-medium">{staff.firstName} {staff.lastName}</div>
                  <div className="text-sm text-blue-600">{staff.role}</div>
                  <div className="text-sm text-gray-600">{staff.email}</div>
                  {staff.phone && (
                    <div className="text-sm text-gray-600">{staff.phone}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Case Dates */}
          <div className="bg-gray-50 border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3">Case Timeline</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-500">Created</div>
                <div className="text-lg">{formatDateTime(caseData.createdDate)}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Last Modified</div>
                <div className="text-lg">{formatDateTime(caseData.modifiedDate)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !caseData && !error && (
        <div className="text-center text-gray-500 py-12">
          <div className="text-lg mb-2">No case loaded</div>
          <div className="text-sm">Enter a case number and click "Load Case" to get started.</div>
        </div>
      )}
    </div>
  );
}
