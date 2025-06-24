'use client';

import { useEffect, useState } from 'react';
import { useCase } from '@/lib/contexts/case-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, ClockIcon, AlertCircle, ChevronLeft, ChevronRight, FileText, Paperclip } from 'lucide-react';
import smartAdvocateClient from '@/lib/smartadvocate/client';
import DocumentViewer from '@/components/DocumentViewer';

interface Person {
  id: number;
  name: string;
  contactID: number;
}

interface TypeDescriptor {
  id: number;
  description: string;
}

interface Task {
  id: number;
  caseID: number;
  caseNumber: string;
  type?: TypeDescriptor;
  status?: TypeDescriptor;
  priority?: TypeDescriptor;
  summary: string;
  dueDate: string;
  startDate: string;
  timeSpent?: number;
  description?: string;
  requestor?: Person;
  assignee?: Person;
  documentIDs: number[];
  template?: TypeDescriptor;
  completedDate?: string;
}

interface Document {
  documentID: number;
  documentName: string;
  docType: string;
  description: string;
  categoryName: string;
  subCategoryName?: string;
  documentDate: string;
  fromContactName?: string;
  toContactName?: string;
  directionName?: string;
  priorityName: string;
  isReviewed: boolean;
}

export default function TasksPage() {
  const { 
    currentCase, 
    caseTasks, 
    loadCaseTasks, 
    taskPage, 
    taskPageSize, 
    setTaskPage,
    getPaginatedTasks,
    getTasksTotalCount
  } = useCase();
  const [loading, setLoading] = useState(false);
  const [taskDocuments, setTaskDocuments] = useState<Record<number, Document>>({});
  const [loadingDocuments, setLoadingDocuments] = useState<Record<number, boolean>>({});
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [rightPaneWidth, setRightPaneWidth] = useState(() => {
    // Initialize from localStorage or default to 50
    if (typeof window !== 'undefined') {
      const savedWidth = localStorage.getItem('documentsPaneWidth');
      return savedWidth ? parseInt(savedWidth, 10) : 50;
    }
    return 50;
  });
  const [isDragging, setIsDragging] = useState(false);

  
  useEffect(() => {
    if (currentCase && !caseTasks) {
      setLoading(true);
      loadCaseTasks().finally(() => setLoading(false));
    }
  }, [currentCase, caseTasks, loadCaseTasks]);

  // Save pane width to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('documentsPaneWidth', rightPaneWidth.toString());
  }, [rightPaneWidth]);
  
  // Set up mouse event handlers for resizing
  useEffect(() => {
    if (isDragging) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  // Fetch documents for visible tasks
  useEffect(() => {
    const visibleTasks = getPaginatedTasks();
    if (!visibleTasks) return;

    // Reset document loading state for new page
    setLoadingDocuments({});
    
    // For each visible task, fetch documents if they have documentIDs
    visibleTasks.forEach((task: Task) => {
      if (task.documentIDs && task.documentIDs.length > 0) {
        // Only fetch documents we haven't already loaded
        task.documentIDs.forEach(docId => {
          if (!taskDocuments[docId]) {
            setLoadingDocuments(prev => ({ ...prev, [docId]: true }));
            
            smartAdvocateClient.getDocument(docId.toString())
              .then(document => {
                setTaskDocuments(prev => ({
                  ...prev,
                  [docId]: document
                }));
              })
              .catch(error => {
                console.error(`Failed to load document ${docId}:`, error);
              })
              .finally(() => {
                setLoadingDocuments(prev => ({ ...prev, [docId]: false }));
              });
          }
        });
      }
    });
  }, [taskPage, caseTasks, getPaginatedTasks]);

  const handleDocumentClick = (document: Document) => {
    setSelectedDocument(document);
  };

  const handleCloseViewer = () => {
    setSelectedDocument(null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const container = document.querySelector('[data-resize-container]') as HTMLElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const newRightWidth = ((containerRect.right - e.clientX) / containerRect.width) * 100;

    // Constrain between 20% and 80%
    const constrainedWidth = Math.max(20, Math.min(80, newRightWidth));
    setRightPaneWidth(constrainedWidth);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'not started':
        return 'bg-gray-100 text-gray-800';
      case 'in progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
      case 'done':
        return 'bg-green-100 text-green-800';
      case 'on hold':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
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

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!currentCase) {
    return null;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Tasks Header */}
      <div className="border-b bg-white pb-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Paperclip className="w-5 h-5 mr-2" />
            <h1 className="text-xl font-semibold">Tasks</h1>
            {caseTasks && (
              <Badge variant="outline" className="ml-3">
                {getTasksTotalCount()} total
              </Badge>
            )}
          </div>
          <Button size="sm">Create Task</Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0" data-resize-container>
        {/* Tasks List - Left Pane */}
        <div
          className="bg-white transition-all duration-200 ease-out"
          style={{
            width: selectedDocument ? `${100 - rightPaneWidth}%` : '100%'
          }}
        >
          <div className="h-full overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4">
                <Card>
                  <CardHeader>
                    <CardTitle>All Tasks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="text-center py-8">Loading tasks...</div>
                    ) : caseTasks && caseTasks.length > 0 ? (
                      <>
                        <div className="space-y-4">
                          {getPaginatedTasks()
                            ?.sort((a: Task, b: Task) => {
                              const now = new Date();
                              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                              if (a.completedDate && !b.completedDate) return 1;
                              if (!a.completedDate && b.completedDate) return -1;
                              if (a.completedDate && b.completedDate) {
                                return new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime();
                              }
                              const aDate = new Date(a.dueDate);
                              const bDate = new Date(b.dueDate);
                              const aOverdue = aDate < today;
                              const bOverdue = bDate < today;
                              if (aOverdue && !bOverdue) return -1;
                              if (!aOverdue && bOverdue) return 1;
                              if (aOverdue && bOverdue) {
                                return aDate.getTime() - bDate.getTime();
                              }
                              return aDate.getTime() - bDate.getTime();
                            })
                            .map((task: Task) => (
                              <div key={task.id} className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <div className="font-medium text-lg">{task.summary}</div>
                                    {task.type && (
                                      <Badge variant="secondary" className="font-normal">{task.type.description}</Badge>
                                    )}
                                  </div>
                                  <div className={`flex items-center text-sm font-semibold ${getPriorityColor(task.priority?.description || 'Medium')}`}>
                                    {task.priority && <AlertCircle className="w-4 h-4 mr-1" />}
                                    {task.priority?.description}
                                  </div>
                                </div>

                                {task.description && (
                                  <>
                                    <Separator className="my-2" />
                                    <div className="text-sm text-gray-700 whitespace-pre-wrap mb-3">{task.description}</div>
                                  </>
                                )}

                                <div className="flex justify-between items-center mt-2">
                                  {task.assignee && (
                                    <div className="flex items-center gap-2">
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger>
                                            <Avatar className="h-8 w-8">
                                              <AvatarFallback>{getInitials(task.assignee.name)}</AvatarFallback>
                                            </Avatar>
                                          </TooltipTrigger>
                                          <TooltipContent><p>Assigned to: {task.assignee.name}</p></TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </div>
                                  )}
                                  <div className={`text-sm font-medium px-2 py-1 rounded-md ${getStatusColor(task.status?.description || 'Open')}`}>
                                    {task.status?.description}
                                  </div>
                                </div>

                                <Separator className="my-3" />

                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-600">
                                  <div className="flex items-center">
                                    <CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
                                    <strong>Due:</strong><span className="ml-1">{formatDate(task.dueDate)}</span>
                                  </div>
                                  <div className="flex items-center">
                                    <ClockIcon className="w-4 h-4 mr-2 text-gray-400" />
                                    <strong>Time Spent:</strong><span className="ml-1">{task.timeSpent || 0} hrs</span>
                                  </div>
                                </div>

                                {task.documentIDs && task.documentIDs.length > 0 && (
                                  <div className="mt-3">
                                    <h4 className="text-sm font-semibold mb-2">Attached Documents:</h4>
                                    <div className="flex flex-wrap gap-2">
                                      {task.documentIDs.map(docId => (
                                        <Badge
                                          key={docId}
                                          variant="outline"
                                          className="flex items-center gap-1 cursor-pointer hover:bg-gray-100"
                                          onClick={() => taskDocuments[docId] && handleDocumentClick(taskDocuments[docId])}
                                        >
                                          <FileText className="h-3 w-3" />
                                          {loadingDocuments[docId] ? (
                                            <span className="text-xs">Loading...</span>
                                          ) : taskDocuments[docId] ? (
                                            <span className="text-xs truncate max-w-[150px]">{taskDocuments[docId].documentName}</span>
                                          ) : (
                                            <span className="text-xs">Document {docId}</span>
                                          )}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>

                        {/* Pagination Controls */}
                        <div className="flex items-center justify-between border-t pt-4 mt-4">
                          <div className="text-sm text-muted-foreground">
                            {caseTasks && caseTasks.length > 0 ? (
                              <>Showing {taskPage * taskPageSize + 1}-{Math.min((taskPage + 1) * taskPageSize, getTasksTotalCount())} of {getTasksTotalCount()} tasks</>
                            ) : (
                              <>No tasks</>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setTaskPage(Math.max(0, taskPage - 1))}
                              disabled={taskPage === 0 || loading}
                            >
                              <ChevronLeft className="h-4 w-4 mr-1" />
                              Previous
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setTaskPage(taskPage + 1)}
                              disabled={(taskPage + 1) * taskPageSize >= getTasksTotalCount() || loading}
                            >
                              Next
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No tasks found for this case.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Resize Handle */}
        {selectedDocument && (
          <div
            className="w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize transition-colors duration-150 relative group"
            onMouseDown={handleMouseDown}
          >
            <div className="absolute inset-y-2 -inset-x-1 group-hover:bg-blue-400/20"></div>
          </div>
        )}

        {/* Overlay for resizing */}
        {isDragging && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 9999,
              cursor: 'col-resize',
              background: 'transparent',
            }}
            onMouseMove={handleMouseMove as any}
            onMouseUp={handleMouseUp as any}
          />
        )}

        {/* Document Viewer - Right Pane */}
        {selectedDocument && (
          <div
            className="bg-gray-50 flex flex-col sticky top-16"
            style={{
              width: `${rightPaneWidth}%`,
              height: 'calc(100vh - 4rem)'
            }}
          >
            <div className="flex-1 overflow-hidden">
              <DocumentViewer
                document={selectedDocument}
                isOpen={true}
                onClose={handleCloseViewer}
                mode="panel"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}