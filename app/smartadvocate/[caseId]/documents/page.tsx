'use client';

import { useEffect, useState } from 'react';
import { useCase } from '@/lib/contexts/case-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, X } from 'lucide-react';
import DocumentsList from '@/components/DocumentsList';
import DocumentViewer from '@/components/DocumentViewer';

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
  modifiedDate: string;
  caseID: number;
  caseNumber: string;
  fromUniqueContactID?: number;
  templateID?: number;
  attachFlag?: boolean;
  deleteFlag?: boolean;
  docsrflag?: string;
  createdUserID: number;
  createdDate: string;
  modifiedUserID?: number;
  categoryID: number;
  subCategoryID?: number;
  subSubCategoryID?: number;
  subSubSubCategoryID?: number;
  priority: number;
  documentDirection: number;
  documentOrigin: number;
  deliveryMethodId?: number;
  deliveryName?: string;
  caseDocumentID: number;
  comments?: string;
}

export default function DocumentsPage() {
  const { currentCase, caseDocuments, loadCaseDocuments } = useCase();
  const [loading, setLoading] = useState(false);
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
    if (currentCase && !caseDocuments) {
      setLoading(true);
      loadCaseDocuments().finally(() => setLoading(false));
    }
  }, [currentCase, caseDocuments, loadCaseDocuments]);

  // Save pane width to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('documentsPaneWidth', rightPaneWidth.toString());
  }, [rightPaneWidth]);

  const handleDocumentSelect = (document: Document) => {
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

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging]);

  if (!currentCase) {
    return null;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Documents Header */}
      <div className="border-b bg-white pb-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            <h1 className="text-xl font-semibold">Documents</h1>
            {caseDocuments && (
              <Badge variant="outline" className="ml-3">
                {caseDocuments.length} total
              </Badge>
            )}
          </div>
          <Button size="sm">Upload Document</Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0" data-resize-container>
        {/* Documents List - Left Pane */}
        <div
          className="border-r bg-white transition-all duration-200 ease-out"
          style={{
            width: selectedDocument ? `${100 - rightPaneWidth}%` : '100%'
          }}
        >
          <div className="h-full overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-gray-600">Loading documents...</p>
                </div>
              </div>
            ) : caseDocuments && caseDocuments.length > 0 ? (
              <DocumentsList
                documents={caseDocuments}
                onDocumentSelect={handleDocumentSelect}
                selectedDocumentId={selectedDocument?.documentID}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg mb-2">No documents found</p>
                  <p className="text-sm">No documents are available for this case.</p>
                </div>
              </div>
            )}
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

        {/* Document Viewer - Right Pane */}
        {selectedDocument && (
          <div
            className="bg-gray-50 flex flex-col sticky top-16"
            style={{
              width: `${rightPaneWidth}%`,
              height: 'calc(100vh - 4rem)' // Subtract navbar height (4rem = 64px)
            }}
          >
            {/* Viewer Header */}
            <div className="flex items-center justify-between p-4 border-b bg-white">
              <h2 className="font-medium text-gray-900 truncate mr-4">
                Document Preview
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseViewer}
                className="flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Viewer Content */}
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
