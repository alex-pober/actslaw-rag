// components/DocumentViewer.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Download,
  X,
  FileText,
  FileImage,
  Mail,
  ExternalLink,
  Loader2,
  AlertCircle,
  Maximize2,
  Minimize2
} from 'lucide-react';
import smartAdvocateClient from '@/lib/smartadvocate/client';

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

interface DocumentViewerProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
}

interface DocumentContent {
  content?: string;
  contentType?: string;
  fileName?: string;
  fileSize?: number;
  downloadUrl?: string;
  previewAvailable?: boolean;
}

export default function DocumentViewer({ document, isOpen, onClose }: DocumentViewerProps) {
  const [content, setContent] = useState<DocumentContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (document && isOpen) {
      loadDocumentContent();
    } else {
      setContent(null);
      setError(null);
    }
  }, [document, isOpen]);

  const loadDocumentContent = async () => {
    if (!document) return;

    try {
      setLoading(true);
      setError(null);

      const docContent = await smartAdvocateClient.getDocumentContent(document.documentID);
      setContent(docContent);
    } catch (err: any) {
      setError(err.message || 'Failed to load document content');
      console.error('Error loading document:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!document) return;

    try {
      const blob = await smartAdvocateClient.downloadDocument(document.documentID);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = document.documentName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(`Download failed: ${err.message}`);
    }
  };

  const getDocumentIcon = (docType: string | undefined) => {
    if (!docType) return <FileText className="w-5 h-5" />;

    switch (docType.toLowerCase()) {
      case 'img':
      case 'incoming mail':
        return <FileImage className="w-5 h-5" />;
      case 'email':
        return <Mail className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDirectionColor = (direction: string | undefined) => {
    if (!direction) return 'bg-gray-100 text-gray-800';

    switch (direction.toLowerCase()) {
      case 'incoming':
        return 'bg-blue-100 text-blue-800';
      case 'outgoing':
        return 'bg-green-100 text-green-800';
      case 'memo':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canPreview = (contentType: string | undefined, docType: string | undefined) => {
    if (!contentType && !docType) return false;

    const previewableTypes = [
      'text/plain',
      'text/html',
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];

    return previewableTypes.some(type =>
      contentType?.includes(type) ||
      docType?.toLowerCase().includes('txt') ||
      docType?.toLowerCase().includes('pdf') ||
      docType?.toLowerCase().includes('img')
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-gray-600">Loading document...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-600" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={loadDocumentContent} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    if (!content) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center text-gray-500">
            <FileText className="w-8 h-8 mx-auto mb-2" />
            <p>No content available</p>
          </div>
        </div>
      );
    }

    // Handle PDF content that comes as text
    if (content.isPDFText && content.content?.startsWith('%PDF-')) {
      // Convert the PDF text to a blob URL for viewing
      const pdfBytes = new Uint8Array(content.content.length);
      for (let i = 0; i < content.content.length; i++) {
        pdfBytes[i] = content.content.charCodeAt(i);
      }
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      return (
        <div className="h-96">
          <iframe
            src={url}
            className="w-full h-full border rounded"
            title={document?.documentName}
            onLoad={() => {
              // Clean up the URL after the iframe loads
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
          />
        </div>
      );
    }

    // Handle regular image content
    if (content.contentType?.includes('image/')) {
      return (
        <div className="flex justify-center">
          <img
            src={content.downloadUrl || `data:${content.contentType};base64,${content.content}`}
            alt={document?.documentName}
            className="max-w-full max-h-96 object-contain border rounded"
          />
        </div>
      );
    }

    // Handle regular PDF content (if it comes as a proper URL or base64)
    if (content.contentType?.includes('application/pdf') && !content.isPDFText) {
      return (
        <div className="h-96">
          <iframe
            src={content.downloadUrl || `data:${content.contentType};base64,${content.content}`}
            className="w-full h-full border rounded"
            title={document?.documentName}
          />
        </div>
      );
    }

    // Handle text content
    if (content.contentType?.includes('text/') || content.content) {
      return (
        <div className="border rounded p-4 bg-gray-50 max-h-96 overflow-y-auto">
          <pre className="whitespace-pre-wrap text-sm font-mono">
            {content.content || 'No text content available'}
          </pre>
        </div>
      );
    }

    // For non-previewable content
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 mb-2">Preview not available for this file type</p>
          <p className="text-sm text-gray-500 mb-4">
            {content.contentType && `Content Type: ${content.contentType}`}
          </p>
          <Button onClick={handleDownload} className="flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Download to View</span>
          </Button>
        </div>
      </div>
    );
  };

  if (!document) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${isFullscreen ? 'max-w-[95vw] max-h-[95vh]' : 'max-w-4xl max-h-[80vh]'} overflow-hidden`}>
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1 min-w-0">
              <div className="text-gray-400 mt-1">
                {getDocumentIcon(document.docType)}
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg font-semibold text-gray-900 truncate">
                  {document.documentName}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-600 mt-1">
                  {document.description}
                </DialogDescription>

                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <Badge className={getDirectionColor(document.directionName)}>
                    {document.directionName || document.docType}
                  </Badge>
                  <Badge variant="outline">
                    {document.categoryName}
                    {document.subCategoryName && ` • ${document.subCategoryName}`}
                  </Badge>
                  <Badge variant="outline">
                    {document.priorityName}
                  </Badge>
                  {!document.isReviewed && (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                      Needs Review
                    </Badge>
                  )}
                </div>

                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  <span>{formatDate(document.documentDate)}</span>
                  {document.fromContactName && (
                    <span>From: {document.fromContactName}</span>
                  )}
                  {document.toContactName && document.toContactName !== document.fromContactName && (
                    <span>To: {document.toContactName}</span>
                  )}
                  {content?.fileSize && (
                    <span>Size: {formatFileSize(content.fileSize)}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 ml-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                title="Download"
              >
                <Download className="w-4 h-4" />
              </Button>
              {content?.downloadUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(content.downloadUrl, '_blank')}
                  title="Open in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
