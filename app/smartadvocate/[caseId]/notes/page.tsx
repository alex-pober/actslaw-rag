'use client';

import { useEffect, useState } from 'react';
import { useCase } from '@/lib/contexts/case-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function NotesPage() {
  const { currentCase, caseNotes, loadCaseNotes } = useCase();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentCase && !caseNotes) {
      setLoading(true);
      loadCaseNotes().finally(() => setLoading(false));
    }
  }, [currentCase, caseNotes, loadCaseNotes]);

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
        <CardTitle className="flex items-center justify-between">
          <span>Case Notes</span>
          <Button size="sm">Add Note</Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Loading notes...</div>
        ) : caseNotes && caseNotes.length > 0 ? (
          <div className="space-y-4">
            {caseNotes.map((note, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium">{note.author || 'Unknown Author'}</div>
                  <div className="text-sm text-gray-500">
                    {note.dateCreated && formatDateTime(note.dateCreated)}
                  </div>
                </div>
                {note.category && (
                  <Badge variant="outline" className="mb-2">{note.category}</Badge>
                )}
                <div className="text-gray-700">{note.content}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No notes found for this case.
          </div>
        )}
      </CardContent>
    </Card>
  );
}