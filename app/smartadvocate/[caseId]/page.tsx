'use client';

import { useCase } from '@/lib/contexts/case-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Mail, Phone } from 'lucide-react';

export default function CaseOverviewPage() {
  const { currentCase } = useCase();

  if (!currentCase) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Parties */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Plaintiffs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-green-700 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Plaintiffs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentCase.plaintiffs.map((plaintiff, index) => (
              <div key={index} className="border-l-4 border-green-200 pl-4">
                <div className="font-medium">{plaintiff.name}</div>
                <div className="text-sm text-gray-600">{plaintiff.role}</div>
                {plaintiff.primary && (
                  <Badge variant="outline" className="text-xs text-green-600">Primary</Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Defendants */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-red-700 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Defendants
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentCase.defendant.map((defendant, index) => (
              <div key={index} className="border-l-4 border-red-200 pl-4">
                <div className="font-medium">{defendant.name}</div>
                <div className="text-sm text-gray-600">{defendant.role}</div>
                {defendant.primary && (
                  <Badge variant="outline" className="text-xs text-red-600">Primary</Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Case Staff */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Case Staff
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentCase.caseStaff.map((staff, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="font-medium">{staff.firstName} {staff.lastName}</div>
                <div className="text-sm text-blue-600 font-medium">{staff.role}</div>
                <div className="flex items-center text-sm text-gray-600 mt-2">
                  <Mail className="w-3 h-3 mr-1" />
                  {staff.email}
                </div>
                {staff.phone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="w-3 h-3 mr-1" />
                    {staff.phone}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}