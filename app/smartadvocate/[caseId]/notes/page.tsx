'use client';

import { useEffect, useState } from 'react';
import { useCase } from '@/lib/contexts/case-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, PhoneIcon, Users, AlertCircle } from 'lucide-react';

// Define the CaseNote type based on the provided data structure
type CaseNote = {
  noteID: number;
  caseID: number;
  caseNumber: string;
  noteText: string;
  noteDate: string;
  createdDate: string;
  noteTypeID: number;
  noteTypeName: string;
  subject: string;
  priority: string;
  uniqueContactId: number;
  uniqueContactName: string;
  userID: number;
  isSharedWithAll: boolean;
  isSharedinCP: boolean;
};

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

  // Get initials from a name for the avatar fallback
  const getInitials = (name: string) => {
    if (!name) return 'UN';
    return name
      .split(',')
      .map(part => part.trim()[0])
      .join('')
      .toUpperCase();
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'text-red-500 bg-red-100';
      case 'normal':
        return 'text-blue-500 bg-blue-100';
      case 'low':
        return 'text-green-500 bg-green-100';
      default:
        return 'text-gray-500 bg-gray-100';
    }
  };

  if (!currentCase) {
    return null;
  }

  return (
    <Card className="h-full max-w-4xl mx-auto">
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
          <ScrollArea className="h-[calc(100vh-220px)]">
            <div className="space-y-6 pr-4">
              {[...caseNotes]
                .sort((a: CaseNote, b: CaseNote) => {
                  // Sort by noteDate in descending order (most recent first)
                  return new Date(b.noteDate).getTime() - new Date(a.noteDate).getTime();
                })
                .map((note: CaseNote) => (
                <div key={note.noteID} className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={`/avatars/${note.uniqueContactId}.jpg`} alt={note.uniqueContactName} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {getInitials(note.uniqueContactName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{note.uniqueContactName}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <span className="flex items-center gap-1">
                                  <CalendarIcon className="h-3 w-3" />
                                  {formatDateTime(note.noteDate)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Note Date</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline" className={`${getPriorityColor(note.priority)} text-xs`}>
                        {note.priority}
                      </Badge>
                      <div className="text-xs text-muted-foreground">
                        Created: {formatDateTime(note.createdDate)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    {note.noteTypeName && (
                      <Badge variant="secondary" className="text-xs">
                        {note.noteTypeID === 123 ? <PhoneIcon className="h-3 w-3 mr-1" /> : null}
                        {note.noteTypeName}
                      </Badge>
                    )}
                    {note.isSharedWithAll && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="text-xs bg-green-50">
                              <Users className="h-3 w-3 mr-1" />
                              Shared
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Shared with all users</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>

                  <Separator className="my-2" />
                  
                  {note.noteTypeName === "eMail" ? (
                    <div 
                      className="text-sm text-gray-700 email-content" 
                      dangerouslySetInnerHTML={{ __html: note.noteText }}
                    />
                  ) : (
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">{note.noteText}</div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No notes found for this case.
          </div>
        )}
      </CardContent>
    </Card>
  );
}