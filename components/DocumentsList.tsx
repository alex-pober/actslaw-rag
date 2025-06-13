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
  Mail,
  FileImage,
  Search,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  Folder,
  FolderOpen,
  Info
} from 'lucide-react';
import smartAdvocateClient from '@/lib/smartadvocate/client';
import DocumentViewer from './DocumentViewer';

interface Document {
  modifiedDate: string;
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
  deleteFlag?: boolean;
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
  documentFolder?: string;
}

interface DocumentsListProps {
  documents: Document[];
  onDocumentSelect?: (document: Document) => void;
  selectedDocumentId?: number;
}

const ITEMS_PER_PAGE = 20;

export default function DocumentsList({ documents, onDocumentSelect, selectedDocumentId }: DocumentsListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDirection, setSelectedDirection] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'category'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(true);

  const handleViewDocument = (document: Document) => {
    onDocumentSelect?.(document);
  };

  const handleDownloadDocument = async (doc: Document) => {
    try {
      const blob = await smartAdvocateClient.downloadDocument(doc.documentID);
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = doc.documentName;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
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

  // Build category tree structure
  const categoryTree = useMemo(() => {
    const tree: { [key: string]: any } = {};

    documents.forEach(doc => {
      if (!doc.categoryName) return;

      const categoryName = doc.categoryName;
      const subCategoryName = doc.subCategoryName;

      if (!tree[categoryName]) {
        tree[categoryName] = {
          children: {},
          fullPath: categoryName,
          hasDocuments: false
        };
      }

      if (subCategoryName) {
        const fullPath = `${categoryName}::${subCategoryName}`;
        if (!tree[categoryName].children[subCategoryName]) {
          tree[categoryName].children[subCategoryName] = {
            children: {},
            fullPath: fullPath,
            hasDocuments: true
          };
        }
      } else {
        tree[categoryName].hasDocuments = true;
      }
    });

    return tree;
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

  // Build folder tree structure
  const folderTree = useMemo(() => {
    const tree: { [key: string]: any } = {};
    const allFolders = documents
      .map(doc => doc.documentFolder)
      .filter(Boolean) as string[];

    allFolders.forEach(folderPath => {
      const parts = folderPath.split('\\');
      let current = tree;
      let currentPath = '';

      parts.forEach((part, index) => {
        currentPath = currentPath ? `${currentPath}\\${part}` : part;

        if (!current[part]) {
          current[part] = {
            children: {},
            fullPath: currentPath,
            hasDocuments: false
          };
        }

        // Mark if this exact path has documents
        if (index === parts.length - 1) {
          current[part].hasDocuments = true;
        }

        current = current[part].children;
      });
    });

    return tree;
  }, [documents]);

  const toggleFolder = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  const toggleCategory = (categoryPath: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryPath)) {
      newExpanded.delete(categoryPath);
    } else {
      newExpanded.add(categoryPath);
    }
    setExpandedCategories(newExpanded);
  };

  // Filter and sort documents
  const filteredAndSortedDocuments = useMemo(() => {
    let filtered = documents.filter(doc => {
      // Skip deleted documents
      if (doc.deleteFlag) return false;

      const matchesSearch = searchTerm === '' ||
        (doc.documentName && doc.documentName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (doc.fromContactName && doc.fromContactName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (doc.toContactName && doc.toContactName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory = selectedCategory === 'all' ||
        doc.categoryName === selectedCategory ||
        (selectedCategory.includes('::') && `${doc.categoryName}::${doc.subCategoryName}` === selectedCategory);
      const matchesDirection = selectedDirection === 'all' || doc.directionName === selectedDirection;
      const matchesType = selectedType === 'all' || getFileExtension(doc.documentName) === selectedType;
      const matchesPriority = selectedPriority === 'all' || doc.priorityName === selectedPriority;
      const matchesFolder = selectedFolder === 'all' || doc.documentFolder === selectedFolder;

      return matchesSearch && matchesCategory && matchesDirection && matchesType && matchesPriority && matchesFolder;
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
  }, [documents, searchTerm, selectedCategory, selectedDirection, selectedType, selectedPriority, selectedFolder, sortBy, sortOrder]);

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

  // Recursive category tree component
  const CategoryTreeNode = ({
    name,
    node,
    level = 0
  }: {
    name: string;
    node: any;
    level?: number;
  }) => {
    const hasChildren = Object.keys(node.children).length > 0;
    const isExpanded = expandedCategories.has(node.fullPath);
    const isSelected = selectedCategory === node.fullPath;
    const indentStyle = { paddingLeft: `${level * 16}px` };

    return (
      <div key={node.fullPath}>
        <div
          className={`flex items-center space-x-2 cursor-pointer p-1 rounded-lg transition-colors ${
            isSelected
              ? 'bg-blue-50 border border-blue-200'
              : 'hover:bg-gray-100'
          }`}
          style={indentStyle}
          onClick={() => {
            if (node.hasDocuments) {
              setSelectedCategory(node.fullPath);
              handleFilterChange();
            }
            if (hasChildren) {
              toggleCategory(node.fullPath);
            }
          }}
        >
          {hasChildren ? (
            <div className="w-4 h-4 flex items-center justify-center">
              {isExpanded ? (
                <ChevronDown className="w-3 h-3 text-gray-500" />
              ) : (
                <ChevronRightIcon className="w-3 h-3 text-gray-500" />
              )}
            </div>
          ) : (
            <div className="w-4 h-4" />
          )}

          <div className="w-4 h-4 flex items-center justify-center">
            {hasChildren ? (
              isExpanded ? (
                <FolderOpen className="w-4 h-4 text-blue-500" />
              ) : (
                <Folder className="w-4 h-4 text-blue-500" />
              )
            ) : (
              <Folder className="w-4 h-4 text-blue-400" />
            )}
          </div>

          <span className={`text-sm ${isSelected ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>
            {name}
          </span>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {Object.entries(node.children).map(([childName, childNode]) => (
              <CategoryTreeNode
                key={(childNode as any).fullPath}
                name={childName}
                node={childNode as any}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Recursive folder tree component
  const FolderTreeNode = ({
    name,
    node,
    level = 0
  }: {
    name: string;
    node: any;
    level?: number;
  }) => {
    const hasChildren = Object.keys(node.children).length > 0;
    const isExpanded = expandedFolders.has(node.fullPath);
    const isSelected = selectedFolder === node.fullPath;
    const indentStyle = { paddingLeft: `${level * 16}px` };

    return (
      <div key={node.fullPath}>
        <div
          className={`flex items-center space-x-2 cursor-pointer p-1 rounded-lg transition-colors ${
            isSelected
              ? 'bg-blue-50 border border-blue-200'
              : 'hover:bg-gray-100'
          }`}
          style={indentStyle}
          onClick={() => {
            if (node.hasDocuments) {
              setSelectedFolder(node.fullPath);
              handleFilterChange();
            }
            if (hasChildren) {
              toggleFolder(node.fullPath);
            }
          }}
        >
          {hasChildren ? (
            <div className="w-4 h-4 flex items-center justify-center">
              {isExpanded ? (
                <ChevronDown className="w-3 h-3 text-gray-500" />
              ) : (
                <ChevronRightIcon className="w-3 h-3 text-gray-500" />
              )}
            </div>
          ) : (
            <div className="w-4 h-4" />
          )}

          <div className="w-4 h-4 flex items-center justify-center">
            {hasChildren ? (
              isExpanded ? (
                <FolderOpen className="w-4 h-4 text-amber-500" />
              ) : (
                <Folder className="w-4 h-4 text-amber-500" />
              )
            ) : (
              <Folder className="w-4 h-4 text-amber-400" />
            )}
          </div>


          <span className={`text-sm ${isSelected ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>
            {name}
          </span>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {Object.entries(node.children).map(([childName, childNode]) => (
              <FolderTreeNode
                key={(childNode as any).fullPath}
                name={childName}
                node={childNode as any}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen relative">
      {/* Collapsible Filter Sidebar */}
      {showFilters && (
        <div className="absolute top-0 left-0 w-60 bg-gray-50 border-r flex flex-col h-full z-10">
          <div className="p-4 border-b bg-white">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Filters</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(false)}
              >
                <PanelLeftClose className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="overflow-y-auto p-4 space-y-4 flex-1">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-3 block">Category</label>
              <div className="space-y-1">
                <div
                  className={`flex items-center space-x-3 cursor-pointer p-2 rounded-lg transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => {
                    setSelectedCategory('all');
                    handleFilterChange();
                  }}
                >
                  <div className="w-4 h-4" />
                  <FolderOpen className="w-4 h-4 text-blue-500" />
                  <span className={`text-sm ${selectedCategory === 'all' ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>
                    All Categories
                  </span>
                </div>
                {Object.entries(categoryTree).map(([name, node]) => (
                  <CategoryTreeNode key={node.fullPath} name={name} node={node} />
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-3 block">Document Folder</label>
              <div className="space-y-1">
                <div
                  className={`flex items-center space-x-3 cursor-pointer p-2 rounded-lg transition-colors ${
                    selectedFolder === 'all'
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => {
                    setSelectedFolder('all');
                    handleFilterChange();
                  }}
                >
                  <div className="w-4 h-4" />
                  <FolderOpen className="w-4 h-4 text-amber-500" />
                  <span className={`text-sm ${selectedFolder === 'all' ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>
                    All Folders
                  </span>
                </div>
                {Object.entries(folderTree).map(([name, node]) => (
                  <FolderTreeNode key={node.fullPath} name={name} node={node} />
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Direction</label>
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
                    <SelectItem key={direction} value={direction || ''}>{direction}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">File Type</label>
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
              <label className="text-sm font-medium text-gray-700 mb-2 block">Priority</label>
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
        </div>
      )}

      {/* Main Content Area */}
      <div className={`flex flex-col h-full ${showFilters ? 'ml-60' : ''}`}>
        {/* Search and Controls Bar */}
        <div className="p-4 bg-white border-b flex-shrink-0">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2"
            >
              {showFilters ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
              <span>Filters</span>
            </Button>

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

          {/* Results Summary */}
          <div className="flex items-center justify-between text-sm text-gray-600 mt-4">
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

        {/* Documents List - Scrollable */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="space-y-2">
          {paginatedDocuments.map((doc) => (
            <div
              key={doc.documentID}
              className={`border rounded-lg p-4 transition-colors cursor-pointer ${
                selectedDocumentId === doc.documentID
                  ? 'bg-blue-50 border-blue-200 shadow-sm'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => handleViewDocument(doc)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1 min-w-0">
                  <div className="text-gray-400 mt-1">
                    {getDocumentIcon(doc.documentName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-gray-900 truncate">
                        {doc.description}
                      </h4>
                      {doc.attachFlag && (
                        <Badge variant="outline" className="text-xs">Attachment</Badge>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 mb-2">{doc.documentName || 'No description'}</p>

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

                          <span>{formatDate(doc.modifiedDate)}</span>
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
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadDocument(doc);
                    }}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            </div>
          ))}
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t bg-white">
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
          </div>
        )}
      </div>
    </div>
  );
}
