// components/DocumentsList.tsx
'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  FileText,
  Filter,
  Download,
  Eye,
  Mail,
  FileImage,
  Search,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown
} from 'lucide-react';
import DocumentViewer from '@/components/DocumentViewer';
import smartAdvocateClient from '@/lib/smartadvocate/client';

interface Document {
  documentID: number;
  caseID: number;
  caseNumber: string;
  documentName: string;
  fromUniqueContactID?: number;
  fromContactName?: string;
  toContactName?: string;
  docType: string;
  templateID?: number;
  attachFlag?: boolean;
  description: string;
  docsrflag?: string;
  createdUserID: number;
  createdDate: string;
  modifiedUserID?: number;
  categoryID: number;
  categoryName: string;
  subCategoryID?: number;
  subCategoryName?: string;
  subSubCategoryID?: number;
  subSubSubCategoryID?: number;
  isReviewed: boolean;
  documentDate: string;
  priority: number;
  priorityName: string;
  documentDirection: number;
  directionName?: string;
  documentOrigin: number;
  originName?: string;
  deliveryMethodId?: number;
  deliveryName?: string;
  caseDocumentID: number;
  comments?: string;
}

interface DocumentsListProps {
  documents: Document[];
}

const ITEMS_PER_PAGE = 20;

export default function DocumentsList({ documents }: DocumentsListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDirection, setSelectedDirection] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'category'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Document viewer state
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const handleViewDocument = (document: Document) => {
    setSelectedDocument(document);
    setIsViewerOpen(true);
  };

  const handleCloseViewer = () => {
    setIsViewerOpen(false);
    setSelectedDocument(null);
  };

  const handleDownloadDocument = async (document: Document) => {
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
    } catch (error) {
      console.error('Download failed:', error);
      // You could add a toast notification here
    }
  };

  // Helper function to extract file extension from document name
  const getFileExtension = (documentName: string) => {
    if (!documentName) return 'unknown';
    const lastDotIndex = documentName.lastIndexOf('.');
    if (lastDotIndex === -1) return 'no extension';
    return documentName.substring(lastDotIndex + 1).toLowerCase();
  };

  // Get unique values for filters
  const categories = useMemo(() => {
    const cats = Array.from(new Set(documents.map(doc => doc.categoryName).filter(Boolean))).sort();
    return cats;
  }, [documents]);

  const directions = useMemo(() => {
    const dirs = Array.from(new Set(documents.map(doc => doc.directionName).filter(Boolean))).sort();
    return dirs;
  }, [documents]);

  const types = useMemo(() => {
    const extensions = Array.from(new Set(documents.map(doc => getFileExtension(doc.documentName)).filter(Boolean))).sort();
    return extensions;
  }, [documents]);

  const priorities = useMemo(() => {
    const priorities = Array.from(new Set(documents.map(doc => doc.priorityName).filter(Boolean))).sort();
    return priorities;
  }, [documents]);

  // Filter and sort documents
  const filteredAndSortedDocuments = useMemo(() => {
    let filtered = documents.filter(doc => {
      const matchesSearch = searchTerm === '' ||
        (doc.documentName && doc.documentName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (doc.fromContactName && doc.fromContactName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (doc.toContactName && doc.toContactName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory = selectedCategory === 'all' || doc.categoryName === selectedCategory;
      const matchesDirection = selectedDirection === 'all' || doc.directionName === selectedDirection;
      const matchesType = selectedType === 'all' || getFileExtension(doc.documentName) === selectedType;
      const matchesPriority = selectedPriority === 'all' || doc.priorityName === selectedPriority;

      return matchesSearch && matchesCategory && matchesDirection && matchesType && matchesPriority;
    });

    // Sort documents
    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case 'name':
          aValue = (a.documentName || '').toLowerCase();
          bValue = (b.documentName || '').toLowerCase();
          break;
        case 'category':
          aValue = (a.categoryName || '').toLowerCase();
          bValue = (b.categoryName || '').toLowerCase();
          break;
        case 'date':
        default:
          aValue = new Date(a.documentDate || 0).getTime();
          bValue = new Date(b.documentDate || 0).getTime();
          break;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [documents, searchTerm, selectedCategory, selectedDirection, selectedType, selectedPriority, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedDocuments.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedDocuments = filteredAndSortedDocuments.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset page when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDocumentIcon = (documentName: string) => {
    const extension = getFileExtension(documentName);

    switch (extension) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-red-500" />;
      case 'docx':
      case 'doc':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'msg':
        return <Mail className="w-4 h-4 text-green-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
      case 'tiff':
        return <FileImage className="w-4 h-4 text-purple-500" />;
      case 'xlsx':
      case 'xls':
        return <FileText className="w-4 h-4 text-green-600" />;
      case 'pptx':
      case 'ppt':
        return <FileText className="w-4 h-4 text-orange-500" />;
      case 'txt':
        return <FileText className="w-4 h-4 text-gray-500" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getDirectionColor = (direction: string | undefined | null) => {
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

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1:
        return 'bg-red-100 text-red-800';
      case 2:
        return 'bg-yellow-100 text-yellow-800';
      case 3:
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                handleFilterChange();
              }}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </Button>
          <Select value={sortBy} onValueChange={(value: 'date' | 'name' | 'category') => setSortBy(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Sort by Date</SelectItem>
              <SelectItem value="name">Sort by Name</SelectItem>
              <SelectItem value="category">Sort by Category</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            <ArrowUpDown className="w-4 h-4" />
          </Button>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Category</label>
              <Select value={selectedCategory} onValueChange={(value) => {
                setSelectedCategory(value);
                handleFilterChange();
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Direction</label>
              <Select value={selectedDirection} onValueChange={(value) => {
                setSelectedDirection(value);
                handleFilterChange();
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Directions</SelectItem>
                  {directions.map(direction => (
                    <SelectItem key={direction} value={direction}>{direction}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">File Type</label>
              <Select value={selectedType} onValueChange={(value) => {
                setSelectedType(value);
                handleFilterChange();
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All File Types</SelectItem>
                  {types.map(type => (
                    <SelectItem key={type} value={type}>
                      .{type} {type === 'unknown' ? '(no extension)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Priority</label>
              <Select value={selectedPriority} onValueChange={(value) => {
                setSelectedPriority(value);
                handleFilterChange();
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  {priorities.map(priority => (
                    <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Results Summary */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Showing {paginatedDocuments.length} of {filteredAndSortedDocuments.length} documents
            {filteredAndSortedDocuments.length !== documents.length &&
              ` (filtered from ${documents.length} total)`
            }
          </span>
          {filteredAndSortedDocuments.length > ITEMS_PER_PAGE && (
            <span>
              Page {currentPage} of {totalPages}
            </span>
          )}
        </div>
      </div>

      {/* Documents List */}
      <div className="space-y-2">
        {paginatedDocuments.map((doc) => (
          <div key={doc.documentID} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1 min-w-0">
                <div className="text-gray-400 mt-1">
                  {getDocumentIcon(doc.documentName)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium text-gray-900 truncate">
                      {doc.documentName}
                    </h4>
                    {doc.attachFlag && (
                      <Badge variant="outline" className="text-xs">Attachment</Badge>
                    )}
                    {!doc.isReviewed && (
                      <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700">
                        Needs Review
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-2">{doc.description || 'No description'}</p>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <Badge className={getDirectionColor(doc.directionName)}>
                      {doc.directionName || doc.docType || 'Unknown'}
                    </Badge>
                    <Badge variant="outline">
                      {doc.categoryName}
                      {doc.subCategoryName && ` • ${doc.subCategoryName}`}
                    </Badge>
                    <Badge className={getPriorityColor(doc.priority)}>
                      {doc.priorityName}
                    </Badge>
                    <Badge variant="outline" className="bg-gray-50">
                      .{getFileExtension(doc.documentName)}
                    </Badge>

                    <div className="flex items-center space-x-4 ml-2">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(doc.documentDate)}</span>
                      </div>

                      {doc.fromContactName && (
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3" />
                          <span>From: {doc.fromContactName}</span>
                        </div>
                      )}

                      {doc.toContactName && doc.toContactName !== doc.fromContactName && (
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3" />
                          <span>To: {doc.toContactName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewDocument(doc)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadDocument(doc)}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>

          <div className="flex items-center space-x-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Document Viewer Modal */}
      <DocumentViewer
        document={selectedDocument}
        isOpen={isViewerOpen}
        onClose={handleCloseViewer}
      />
    </div>
  );
}
