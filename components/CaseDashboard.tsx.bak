// components/CaseDashboard.tsx
'use client';

import { useEffect, useState } from 'react';
import { useCase } from '@/lib/contexts/case-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Users, Calendar, Phone, Mail, MapPin, Building, Clock } from 'lucide-react';
import smartAdvocateClient from '@/lib/smartadvocate/client';
import DocumentsList from '@/components/DocumentsList';

interface Document {
  id: string;
  name: string;
  type: string;
  dateCreated: string;
  size?: string;
}

interface Note {
  id: string;
  content: string;
  author: string;
  dateCreated: string;
  category?: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  assignedTo: string;
  status: string;
  priority: string;
}

export default function CaseDashboard() {
  const {
    currentCase,
    caseDocuments,
    caseNotes,
    loadCaseDocuments,
    loadCaseNotes
  } = useCase();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentCase) {
      loadAdditionalData();
    }
  }, [currentCase]);

  const loadAdditionalData = async () => {
    if (!currentCase) return;

    setLoading(true);
    try {
      // Load documents
      await loadCaseDocuments();

      // Load notes
      // await loadCaseNotes();

      // Load tasks using makeRequest method
      // const tasksData = await smartAdvocateClient.makeRequest(`case/${currentCase.caseNumber}/tasks`);
      // setTasks(tasksData || []);

    } catch (error) {
      console.error('Failed to load additional case data:', error);
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

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!currentCase) {
    return (
      <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="text-center text-gray-500 py-12">
          <div className="text-lg mb-2">No case selected</div>
          <div className="text-sm">Search for a case using the SA number in the navigation bar.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
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

      {/* Tabs for different sections */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
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
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Case Documents
                  {caseDocuments && (
                    <Badge variant="outline" className="ml-2">
                      {caseDocuments.length} total
                    </Badge>
                  )}
                </span>
                <Button size="sm">Upload Document</Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading documents...</div>
              ) : caseDocuments && caseDocuments.length > 0 ? (
                <DocumentsList documents={caseDocuments} />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No documents found for this case.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="space-y-6">
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
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Case Tasks</span>
                <Button size="sm">Add Task</Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading tasks...</div>
              ) : tasks.length > 0 ? (
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <div key={task.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium">{task.title}</div>
                          <div className="text-sm text-gray-600">{task.description}</div>
                        </div>
                        <div className="flex space-x-2">
                          <Badge className={getPriorityColor(task.priority)}>
                            {task.priority}
                          </Badge>
                          <Badge className={getStatusColor(task.status)}>
                            {task.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-sm text-gray-500">
                        <span>Assigned to: {task.assignedTo}</span>
                        <span>Due: {formatDate(task.dueDate)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No tasks found for this case.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
