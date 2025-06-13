'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePipeline } from '@/lib/hooks/use-pipeline';
import { Database } from '@/supabase/functions/_lib/database';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useChat } from 'ai/react';
import { useCase } from '@/lib/contexts/case-context';
import smartAdvocateClient from '@/lib/smartadvocate/client';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  Send,
  Loader2,
  Download,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SADocument {
  documentID: number;
  documentName: string;
  description: string;
  modifiedDate: string;
  categoryName: string;
  isReviewed: boolean;
}

interface DocumentSyncStatus {
  saDocument: SADocument;
  supabaseDocument?: any;
  status: 'ready' | 'needs_update' | 'not_synced' | 'error' | 'syncing';
  sectionCount?: number;
  embeddedSectionCount?: number;
  syncError?: string;
}

export default function ChatPage() {
  const supabase = createClientComponentClient<Database>();
  const { currentCase } = useCase();
  const [documentStatuses, setDocumentStatuses] = useState<DocumentSyncStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<{ [key: number]: boolean }>({});
  const [syncingAll, setSyncingAll] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]);

  const generateEmbedding = usePipeline(
    'feature-extraction',
    'Supabase/gte-small'
  );

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/chat`,
  });

  const isReady = !!generateEmbedding;

  // Load document sync status
  const loadDocumentStatus = async () => {
    if (!currentCase) return;

    setLoading(true);
    try {
      // Get documents from SmartAdvocate
      const saDocuments = await smartAdvocateClient.makeRequest(
        `case/${currentCase.caseID}`,
        { params: { currentPage: '0', pageSize: '200' } }
      );

      // Get synced documents from Supabase
      const { data: supabaseDocuments, error } = await supabase
        .from('document_sync_status')
        .select('*')
        .eq('sa_case_id', currentCase.caseID);

      if (error) throw error;

      // Map and compare documents
      const statuses: DocumentSyncStatus[] = saDocuments.map((saDoc: SADocument) => {
        const supabaseDoc = supabaseDocuments?.find(
          doc => doc.sa_document_id === saDoc.documentID
        );

        let status: DocumentSyncStatus['status'] = 'not_synced';

        if (supabaseDoc) {
          if (supabaseDoc.display_status === 'ready') {
            // Check if needs update based on modified date
            const saModified = new Date(saDoc.modifiedDate);
            const supaModified = new Date(supabaseDoc.sa_modified_date);

            if (saModified > supaModified) {
              status = 'needs_update';
            } else {
              status = 'ready';
            }
          } else if (supabaseDoc.display_status === 'error') {
            status = 'error';
          }
        }

        return {
          saDocument: saDoc,
          supabaseDocument: supabaseDoc,
          status,
          sectionCount: supabaseDoc?.section_count || 0,
          embeddedSectionCount: supabaseDoc?.embedded_section_count || 0,
          syncError: supabaseDoc?.sync_error
        };
      });

      setDocumentStatuses(statuses);
    } catch (error) {
      console.error('Failed to load document status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentCase) {
      loadDocumentStatus();
    }
  }, [currentCase]);

  // Sync a single document
  const syncDocument = async (documentId: number) => {
    setSyncing(prev => ({ ...prev, [documentId]: true }));

    try {
      const status = documentStatuses.find(d => d.saDocument.documentID === documentId);
      if (!status) return;

      // Get document content from SmartAdvocate
      const content = await smartAdvocateClient.getDocumentContent(documentId);

      // Upload to Supabase storage
      const fileName = `case-${currentCase?.caseID}/${documentId}-${status.saDocument.documentName}`;
      const fileBlob = new Blob([content.content || ''], { type: content.contentType || 'text/plain' });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('files')
        .upload(fileName, fileBlob, { upsert: true });

      if (uploadError) throw uploadError;

      // Create or update document record
      const { data: existingDoc } = await supabase
        .from('documents')
        .select('id')
        .eq('sa_document_id', documentId)
        .single();

      if (existingDoc) {
        // Update existing document
        await supabase
          .from('documents')
          .update({
            name: status.saDocument.documentName,
            sa_modified_date: status.saDocument.modifiedDate,
            sync_status: 'synced',
            last_sync_at: new Date().toISOString(),
            sync_error: null
          })
          .eq('id', existingDoc.id);
      } else {
        // Create new document
        await supabase
          .from('documents')
          .insert({
            name: status.saDocument.documentName,
            storage_object_id: uploadData.id,
            sa_document_id: documentId,
            sa_case_id: currentCase?.caseID,
            sa_modified_date: status.saDocument.modifiedDate,
            sync_status: 'synced',
            last_sync_at: new Date().toISOString()
          });
      }

      // Reload status
      await loadDocumentStatus();
    } catch (error) {
      console.error('Failed to sync document:', error);

      // Update sync error in database
      await supabase
        .from('documents')
        .update({
          sync_status: 'error',
          sync_error: error.message
        })
        .eq('sa_document_id', documentId);
    } finally {
      setSyncing(prev => ({ ...prev, [documentId]: false }));
    }
  };

  // Sync all documents
  const syncAllDocuments = async () => {
    setSyncingAll(true);

    const documentsToSync = documentStatuses.filter(
      d => d.status === 'not_synced' || d.status === 'needs_update'
    );

    for (const doc of documentsToSync) {
      await syncDocument(doc.saDocument.documentID);
    }

    setSyncingAll(false);
  };

  // Toggle document selection for chat
  const toggleDocumentSelection = (documentId: number) => {
    setSelectedDocuments(prev =>
      prev.includes(documentId)
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };

  // Custom handleSubmit with selected documents
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!generateEmbedding || !input.trim()) return;

    const output = await generateEmbedding(input, {
      pooling: 'mean',
      normalize: true,
    });

    const embedding = JSON.stringify(Array.from(output.data));

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Include selected documents in the request
    handleSubmit(e, {
      options: {
        headers: {
          authorization: `Bearer ${session.access_token}`,
        },
        body: {
          embedding,
          selectedDocuments: selectedDocuments.length > 0 ? selectedDocuments : undefined
        },
      },
    });
  };

  const getStatusIcon = (status: DocumentSyncStatus['status']) => {
    switch (status) {
      case 'ready':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'needs_update':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'not_synced':
        return <Clock className="w-4 h-4 text-gray-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'syncing':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-600" />;
    }
  };

  const getStatusBadge = (status: DocumentSyncStatus['status']) => {
    const variants = {
      ready: 'bg-green-100 text-green-800',
      needs_update: 'bg-yellow-100 text-yellow-800',
      not_synced: 'bg-gray-100 text-gray-800',
      error: 'bg-red-100 text-red-800',
      syncing: 'bg-blue-100 text-blue-800'
    };

    const labels = {
      ready: 'Ready',
      needs_update: 'Needs Update',
      not_synced: 'Not Synced',
      error: 'Error',
      syncing: 'Syncing...'
    };

    return (
      <Badge className={cn('text-xs', variants[status])}>
        {labels[status]}
      </Badge>
    );
  };

  if (!currentCase) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a case from the navigation bar to start chatting with documents.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Main return statement
  return (
    <div className="w-full max-w-8xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Chat with Case Documents</h1>
          <p className="text-gray-600 mt-1">
            Case #{currentCase.caseNumber}: {currentCase.caseName}
          </p>
        </div>
        <Button
          onClick={syncAllDocuments}
          disabled={syncingAll || documentStatuses.every(d => d.status === 'ready')}
          className="flex items-center space-x-2 w-full md:w-auto"
        >
          {syncingAll ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span>Sync All Documents</span>
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-180px)]">
        {/* Document Status Section */}
        <div className="w-full lg:w-1/3 xl:w-1/4">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Documents</CardTitle>
              <CardDescription className="text-xs">
                {documentStatuses.length} total • {documentStatuses.filter(d => d.status === 'ready').length} ready • {selectedDocuments.length} selected
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <ScrollArea className="h-[calc(100vh-220px)] pr-2">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documentStatuses.map((docStatus) => (
                      <div
                        key={docStatus.saDocument.documentID}
                        className={cn(
                          "border rounded-lg p-3 space-y-2 cursor-pointer transition-colors",
                          selectedDocuments.includes(docStatus.saDocument.documentID)
                            ? "border-blue-500 bg-blue-50"
                            : "hover:bg-gray-50"
                        )}
                        onClick={() => docStatus.status === 'ready' && toggleDocumentSelection(docStatus.saDocument.documentID)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-2 flex-1">
                            <FileText className="w-4 h-4 mt-0.5 text-gray-400" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {docStatus.saDocument.documentName}
                              </p>
                              <p className="text-xs text-gray-600">
                                {docStatus.saDocument.categoryName} •
                                Modified: {new Date(docStatus.saDocument.modifiedDate).toLocaleDateString()}
                              </p>
                              {docStatus.status === 'ready' && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {docStatus.sectionCount} sections •
                                  {docStatus.embeddedSectionCount} embedded
                                </p>
                              )}
                              {docStatus.syncError && (
                                <p className="text-xs text-red-600 mt-1">
                                  Error: {docStatus.syncError}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(syncing[docStatus.saDocument.documentID] ? 'syncing' : docStatus.status)}
                            {getStatusBadge(syncing[docStatus.saDocument.documentID] ? 'syncing' : docStatus.status)}
                            {(docStatus.status === 'not_synced' || docStatus.status === 'needs_update') && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  syncDocument(docStatus.saDocument.documentID);
                                }}
                                disabled={syncing[docStatus.saDocument.documentID]}
                              >
                                <RefreshCw className={cn(
                                  "w-3 h-3",
                                  syncing[docStatus.saDocument.documentID] && "animate-spin"
                                )} />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Chat Section */}
        <div className="flex-1 flex flex-col">
          <Card className="flex-1 flex flex-col">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-t-lg border-b">
              <CardTitle>AI Legal Assistant</CardTitle>
              <CardDescription>
                Ask questions about {selectedDocuments.length > 0 ? 'selected' : 'all synced'} documents
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0 flex flex-col">
              <div className="flex-1 p-4">
                <ScrollArea className="h-full pr-4">
                  <div className="space-y-4">
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={cn(
                          "flex",
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[80%] rounded-lg px-4 py-2",
                            message.role === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-800'
                          )}
                        >
                          <p className="text-sm">{message.content}</p>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-gray-100 rounded-lg px-4 py-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              <div className="border-t p-4">
                <div className="flex space-x-2">
                  <Input
                    type="text"
                    placeholder="Ask about the documents..."
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleChatSubmit(e);
                      }
                    }}
                    disabled={!isReady || isLoading}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleChatSubmit}
                    disabled={!isReady || isLoading || !input.trim()}
                    className="flex items-center space-x-2"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>Send</span>
                  </Button>
                </div>

                {!isReady && (
                  <div className="mt-2">
                    <p className="text-xs text-center text-muted-foreground">
                      <Loader2 className="inline w-3 h-3 mr-1 animate-spin" />
                      Loading AI model...
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
