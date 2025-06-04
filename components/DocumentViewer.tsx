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
  Minimize2,
  Paperclip
} from 'lucide-react';
import smartAdvocateClient from '@/lib/smartadvocate/client';
import { parseMSGFile, type MSGContent } from '@/lib/smartadvocate/msg-parser';

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
  isMSGFile?: boolean;
  isPDFBlob?: boolean;
  isPDFBinary?: boolean;
  isPDFText?: boolean;
  rawData?: ArrayBuffer;
}

export default function DocumentViewer({ document, isOpen, onClose }: DocumentViewerProps) {
  const [content, setContent] = useState<DocumentContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [parsedMSG, setParsedMSG] = useState<MSGContent | null>(null);

  useEffect(() => {
    if (document && isOpen) {
      loadDocumentContent();
    } else {
      setContent(null);
      setError(null);
      setParsedMSG(null);
    }
  }, [document, isOpen]);

  const loadDocumentContent = async () => {
    if (!document) return;

    try {
      setLoading(true);
      setError(null);
      setParsedMSG(null);

      console.log('Loading document content for ID:', document.documentID);

      const docContent = await smartAdvocateClient.getDocumentContent(document.documentID);
      console.log('Document content loaded:', docContent);

      setContent(docContent);

      // If it's an MSG file, parse it immediately
      if (docContent.isMSGFile && docContent.rawData) {
        try {
          const parsed = parseMSGFile(docContent.rawData);
          setParsedMSG(parsed);
          console.log('MSG file parsed successfully:', parsed);
        } catch (msgError) {
          console.error('Failed to parse MSG file:', msgError);
          setError('Failed to parse email message format');
        }
      }
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

    // Handle MSG files (Outlook messages) with proper library
    if (content.isMSGFile && parsedMSG) {
      return (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4 h-full overflow-y-auto">
          {/* Email Header */}
          <div className="bg-white rounded-lg p-4 border">
            <div className="flex items-center mb-3">
              <Mail className="w-5 h-5 mr-2 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Email Message</h3>
            </div>

            <div className="grid grid-cols-1 gap-2 text-sm">
              {parsedMSG.subject && (
                <div className="flex">
                  <span className="font-medium text-gray-700 w-16 flex-shrink-0">Subject:</span>
                  <span className="text-gray-900 break-words">{parsedMSG.subject}</span>
                </div>
              )}

              {parsedMSG.from && (
                <div className="flex">
                  <span className="font-medium text-gray-700 w-16 flex-shrink-0">From:</span>
                  <span className="text-gray-900 break-all">{parsedMSG.from}</span>
                </div>
              )}

              {parsedMSG.to && (
                <div className="flex">
                  <span className="font-medium text-gray-700 w-16 flex-shrink-0">To:</span>
                  <span className="text-gray-900 break-all">{parsedMSG.to}</span>
                </div>
              )}

              {parsedMSG.cc && (
                <div className="flex">
                  <span className="font-medium text-gray-700 w-16 flex-shrink-0">CC:</span>
                  <span className="text-gray-900 break-all">{parsedMSG.cc}</span>
                </div>
              )}

              {parsedMSG.date && (
                <div className="flex">
                  <span className="font-medium text-gray-700 w-16 flex-shrink-0">Date:</span>
                  <span className="text-gray-900">{parsedMSG.date}</span>
                </div>
              )}
            </div>

            {/* Attachments */}
            {parsedMSG.attachments && parsedMSG.attachments.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center mb-2">
                  <Paperclip className="w-4 h-4 mr-2 text-gray-600" />
                  <span className="font-medium text-gray-700 text-sm">
                    Attachments ({parsedMSG.attachments.length})
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {parsedMSG.attachments.map((att, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      <FileText className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{att.fileName}</span>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        ({(att.contentLength / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Email Body */}
          {(parsedMSG.body || parsedMSG.htmlBody) && (
            <div className="bg-white rounded-lg p-4 border">
              <div className="font-medium text-gray-700 mb-3 text-sm">Message Content:</div>

              {parsedMSG.body && (
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-gray-900 font-sans bg-gray-50 p-3 rounded border overflow-x-auto">
                    {parsedMSG.body}
                  </pre>
                </div>
              )}

              {parsedMSG.htmlBody && !parsedMSG.body && (
                <div className="prose prose-sm max-w-none overflow-auto max-h-96">
                  <div
                    className="text-sm bg-gray-50 p-3 rounded border"
                    dangerouslySetInnerHTML={{ __html: parsedMSG.htmlBody }}
                  />
                </div>
              )}
            </div>
          )}

          {/* No Content Fallback */}
          {!parsedMSG.subject && !parsedMSG.from && !parsedMSG.body && !parsedMSG.htmlBody && (
            <div className="text-center py-8">
              <Mail className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 mb-2">Unable to parse email content</p>
              <p className="text-sm text-gray-500 mb-4">
                The email message format may not be supported for preview.
              </p>
              <Button onClick={handleDownload} className="flex items-center space-x-2">
                <Download className="w-4 h-4" />
                <span>Download MSG File</span>
              </Button>
            </div>
          )}

          {/* File Info Footer */}
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 text-xs text-gray-500 bg-white px-3 py-2 rounded-full border">
              <span>MSG File • {content.fileSize ? formatFileSize(content.fileSize) : 'Unknown size'}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="h-6 px-2 text-xs"
              >
                <Download className="w-3 h-3 mr-1" />
                Download
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // Handle MSG files that failed to parse
    if (content.isMSGFile && !parsedMSG) {
      return (
        <div className="text-center py-8">
          <Mail className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 mb-2">Unable to display MSG file content</p>
          <p className="text-sm text-gray-500 mb-4">
            The email message format is not supported for preview.
          </p>
          <Button onClick={handleDownload} className="flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Download MSG File</span>
          </Button>
        </div>
      );
    }

    // Handle PDF content from blob URL
    if (content.isPDFBlob && content.downloadUrl) {
      return (
        <div className="h-96">
          <iframe
            src={content.downloadUrl}
            className="w-full h-full border rounded"
            title={document?.documentName}
            onLoad={() => {
              console.log('PDF loaded successfully in iframe');
            }}
            onError={(e) => {
              console.error('PDF iframe error:', e);
              setError('Failed to display PDF in browser. The file may be corrupted or in an unsupported format.');
            }}
          />
          <div className="mt-2 text-sm text-gray-500 text-center">
            PDF • {content.fileSize ? formatFileSize(content.fileSize) : 'Unknown size'}
          </div>
        </div>
      );
    }

    // Handle PDF content from binary method
    if (content.isPDFBinary && content.downloadUrl) {
      return (
        <div className="h-96">
          <iframe
            src={content.downloadUrl}
            className="w-full h-full border rounded"
            title={document?.documentName}
            onLoad={() => {
              console.log('PDF loaded successfully in iframe');
            }}
            onError={(e) => {
              console.error('PDF iframe error:', e);
              setError('Failed to display PDF in browser. Try downloading it instead.');
            }}
          />
          <div className="mt-2 text-sm text-gray-500 text-center">
            PDF loaded from binary data • {content.fileSize ? formatFileSize(content.fileSize) : 'Unknown size'}
          </div>
        </div>
      );
    }

    // Handle PDF content that comes as text starting with %PDF-
    if (content.isPDFText && content.content?.startsWith('%PDF-')) {
      try {
        // Method 1: Try using base64 encoding if the content looks like it might be encoded
        let pdfUrl: string;

        // Check if the content contains non-printable characters (binary data as text)
        const hasNonPrintable = /[\x00-\x08\x0E-\x1F\x7F-\xFF]/.test(content.content);

        if (hasNonPrintable) {
          // Content appears to be binary data stored as text
          // Convert to proper binary format
          const bytes = new Uint8Array(content.content.length);
          for (let i = 0; i < content.content.length; i++) {
            bytes[i] = content.content.charCodeAt(i) & 0xFF;
          }
          const blob = new Blob([bytes], { type: 'application/pdf' });
          pdfUrl = URL.createObjectURL(blob);
        } else {
          // Content appears to be text representation
          // Try to encode as UTF-8 bytes
          const encoder = new TextEncoder();
          const bytes = encoder.encode(content.content);
          const blob = new Blob([bytes], { type: 'application/pdf' });
          pdfUrl = URL.createObjectURL(blob);
        }

        return (
          <div className="h-96">
            <iframe
              src={pdfUrl}
              className="w-full h-full border rounded"
              title={document?.documentName}
              onLoad={() => {
                // Clean up the URL after some time
                setTimeout(() => URL.revokeObjectURL(pdfUrl), 5000);
              }}
              onError={(e) => {
                console.error('PDF iframe error:', e);
                URL.revokeObjectURL(pdfUrl);
              }}
            />
            <div className="mt-2 text-sm text-gray-500 text-center">
              If the PDF doesn't display, try downloading it using the download button above.
            </div>
          </div>
        );
      } catch (error) {
        console.error('Error creating PDF blob:', error);

        // Fallback: Show raw content with download option
        return (
          <div className="flex flex-col items-center justify-center h-96">
            <div className="text-center mb-4">
              <FileText className="w-12 h-12 mx-auto mb-2 text-red-400" />
              <p className="text-red-600 mb-2">PDF preview failed</p>
              <p className="text-sm text-gray-500 mb-4">
                The PDF couldn't be displayed in the browser.
              </p>
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleDownload} className="flex items-center space-x-2">
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  // Show raw content in a modal or expanded view
                  const newWindow = window.open('', '_blank');
                  if (newWindow) {
                    newWindow.document.write(`
                      <html>
                        <head><title>Raw PDF Content - ${document?.documentName}</title></head>
                        <body style="font-family: monospace; white-space: pre-wrap; padding: 20px;">
                          ${content.content}
                        </body>
                      </html>
                    `);
                  }
                }}
              >
                View Raw Content
              </Button>
            </div>
          </div>
        );
      }
    }

    // Handle regular image content
    if (content.contentType?.includes('image/')) {
      return (
        <div className="flex justify-center">
          <img
            src={content.downloadUrl || `data:${content.contentType};base64,${content.content}`}
            alt={document?.documentName}
            className="max-w-full max-h-96 object-contain border rounded"
            onError={(e) => {
              console.error('Image load error:', e);
            }}
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
            onError={(e) => {
              console.error('PDF iframe error:', e);
            }}
          />
        </div>
      );
    }

    // Handle text content
    if (content.contentType?.includes('text/') || (content.content && !content.contentType?.includes('application/'))) {
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
      <DialogContent className={`${
        isFullscreen
          ? 'max-w-[98vw] max-h-[98vh] w-[98vw] h-[98vh]'
          : 'max-w-6xl max-h-[90vh] w-[90vw]'
      } flex flex-col overflow-hidden`}>

        {/* Header Section - Fixed height */}
        <DialogHeader className="flex-shrink-0 pb-4 border-b">
          <div className="flex items-start justify-between gap-4">
            {/* Left side - Document info */}
            <div className="flex items-start space-x-3 flex-1 min-w-0">
              <div className="text-gray-400 mt-1 flex-shrink-0">
                {getDocumentIcon(document.docType)}
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg font-semibold text-gray-900 break-words">
                  {document.documentName}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-600 mt-1 break-words">
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

                <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-500">
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

            {/* Right side - Action buttons */}
            <div className="flex items-center space-x-2 flex-shrink-0">
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

        {/* Content Section - Flexible height */}
        <div className="flex-1 overflow-auto pt-4">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
