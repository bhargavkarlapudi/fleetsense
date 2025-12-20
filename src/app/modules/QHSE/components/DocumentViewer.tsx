import React, { FC, useState, useEffect } from 'react';
import { KTSVG } from '../../../../_metronic/helpers';
import { useAuth } from '../../../../app/modules/auth';
import { downloadPdfDocumentRequest } from '../core/_requests';

interface DocumentItem {
  id: number;
  title: string;
  type: 'folder' | 'document';
  category: string;
  filePath?: string | null;
  fileSize?: string | null | undefined;
  dateUploaded?: string | null | undefined;
  parentId?: number | null;
  createdBy?: string;
  lastModified?: string;
  children?: DocumentItem[];
  fileUrl?: string;
}

interface DocumentViewerProps {
  document: DocumentItem;
  allDocuments: DocumentItem[];
  onClose: () => void;
  onDownload: (document: DocumentItem) => void;
}

const API_URL = process.env.REACT_APP_API_URL
const DOCUMENTS_API_URL = `${API_URL}/qhse/documents`

const DocumentViewer: FC<DocumentViewerProps> = ({ document, allDocuments, onClose, onDownload }) => {
  console.log(document);
  const { auth } = useAuth();
  const token = auth?.auth.jwt;

  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  console.log(documentUrl);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  // Get file extension from title
  const getFileExtension = (title: string): string => {
    const extension = title.toLowerCase().split('.').pop() || '';
    return extension;
  };

  // Check if file is PDF
  const isPdfFile = (title: string): boolean => {
    const extension = getFileExtension(title);
    return extension === 'pdf';
  };

  // Get file type display name
  const getFileTypeDisplayName = (extension: string): string => {
    switch (extension.toLowerCase()) {
      case 'doc':
      case 'docx':
        return 'Word Document';
      case 'xls':
      case 'xlsx':
        return 'Excel Spreadsheet';
      case 'ppt':
      case 'pptx':
        return 'PowerPoint Presentation';
      case 'pdf':
        return 'PDF Document';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'Image File';
      case 'txt':
        return 'Text Document';
      default:
        return 'Document';
    }
  };

  // Get file icon based on extension
  const getFileIcon = (extension: string): string => {
    switch (extension.toLowerCase()) {
      case 'doc':
      case 'docx':
        return '/media/icons/duotune/files/fil018.svg';
      case 'xls':
      case 'xlsx':
        return '/media/icons/duotune/files/fil019.svg';
      case 'ppt':
      case 'pptx':
        return '/media/icons/duotune/files/fil020.svg';
      case 'pdf':
        return '/media/icons/duotune/files/fil021.svg';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return '/media/icons/duotune/files/fil012.svg';
      default:
        return '/media/icons/duotune/files/fil003.svg';
    }
  };

  // Format file size
  const formatFileSize = (size: string | null | undefined): string => {
    if (size === null || size === undefined) return 'Unknown size';
    return size;
  };

  // Format upload date
  const formatUploadDate = (date: string | null | undefined): string => {
    if (date === null || date === undefined) return 'Unknown date';
    try {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  // Detect mobile device
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
  };

  // Fetch PDF document for preview
  useEffect(() => {
    const fetchPdfDocument = async () => {
      if (!isPdfFile(document.title)) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log('Fetching PDF for document ID:', document.id);

        const response = await fetch(
          `${DOCUMENTS_API_URL}/view/${document.id}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        console.log('PDF Response status:', response.status);
        console.log('PDF Response headers:', response.headers);

        if (!response.ok) {
          throw new Error(`Failed to load PDF: ${response.status} ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type') || '';
        console.log('PDF Content-Type:', contentType);
        
        // Check if response is JSON (contains download URL) or direct PDF blob
        if (contentType.includes('application/json')) {
          // API returns JSON with download URL
          const responseData = await response.json();
          console.log('PDF Response data:', responseData);
          
          let pdfUrl = responseData.url || responseData.downloadUrl || responseData.fileUrl || 
                       (responseData.data && responseData.data.url) || responseData;
          
          if (pdfUrl && typeof pdfUrl === 'string' && pdfUrl.startsWith('http')) {
            console.log('Using PDF URL:', pdfUrl);
            // For mobile devices, add PDF.js viewer parameters
            if (isMobileDevice()) {
              setDocumentUrl(`${pdfUrl}#view=FitH&toolbar=1&navpanes=0&scrollbar=1`);
            } else {
              setDocumentUrl(pdfUrl);
            }
          } else {
            throw new Error('No valid PDF URL found in response');
          }
        } else if (contentType.includes('application/pdf')) {
          // Direct PDF blob response
          const blob = await response.blob();
          console.log('PDF Blob size:', blob.size);
          
          if (blob.size > 0) {
            const url = URL.createObjectURL(blob);
            console.log('Created PDF blob URL:', url);
            setDocumentUrl(url);
          } else {
            throw new Error('PDF file is empty');
          }
        } else {
          // Try to parse as JSON first, then fallback
          try {
            const responseData = await response.json();
            console.log('Fallback JSON response:', responseData);
            
            let pdfUrl = responseData.url || responseData.downloadUrl || responseData.fileUrl || 
                         (responseData.data && responseData.data.url) || responseData;
            
            if (pdfUrl && typeof pdfUrl === 'string' && pdfUrl.startsWith('http')) {
              setDocumentUrl(pdfUrl);
            } else {
              throw new Error('No valid PDF URL found');
            }
          } catch (jsonError) {
            console.log('Not JSON response, treating as blob');
            // Try as blob
            const blob = await response.blob();
            if (blob.size > 0) {
              const url = URL.createObjectURL(blob);
              setDocumentUrl(url);
            } else {
              throw new Error('Unable to load PDF - unknown response format');
            }
          }
        }
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError(err instanceof Error ? err.message : 'Failed to load PDF');
      } finally {
        setLoading(false);
      }
    };

    if (token && document.id) {
      fetchPdfDocument();
    }

    return () => {
      if (documentUrl) {
        URL.revokeObjectURL(documentUrl);
      }
    };
  }, [document.id, token, document.title]);

  // Handle download
  const handleDownload = async () => {
    try {
      setDownloading(true);
      
      const downloadUrl = await downloadPdfDocumentRequest(token!, document.id)

      const link = window.document.createElement('a');
      link.href = downloadUrl;
      link.download = document.title;
      link.target = '_blank';
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);

      onDownload(document);
    } catch (err) {
      console.error('Download error:', err);
      // Fallback: try direct URL
      try {
        const fallbackUrl = `${DOCUMENTS_API_URL}/download/${document.id}?token=${encodeURIComponent(token || '')}`;
        window.open(fallbackUrl, '_blank');
      } catch {
        alert(`Failed to download document: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    } finally {
      setDownloading(false);
    }
  };

  const fileExtension = getFileExtension(document.title);
  const isPdf = isPdfFile(document.title);

  // PDF Fullscreen View
  if (isPdf) {
    return (
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100vw', 
        height: '100vh', 
        backgroundColor: '#fff',
        zIndex: 1055,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* PDF Header Bar */}
        <div className='bg-light border-bottom px-2 px-md-4 py-2 py-md-3 d-flex align-items-center justify-content-between'>
          <div className='d-flex align-items-center flex-grow-1 me-2' style={{ minWidth: 0 }}>
            <div className='symbol symbol-30px symbol-md-40px me-2 me-md-3 flex-shrink-0'>
              <div className='symbol-label bg-light-primary'>
                <KTSVG path='/media/icons/duotune/files/fil021.svg' className='svg-icon-2 text-primary' />
              </div>
            </div>
            <div className='flex-grow-1' style={{ minWidth: 0 }}>
              <h6 className='mb-0 fw-bold fs-7 fs-md-6' style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '100%'
              }}>
                {document.title}
              </h6>
              <span className='text-muted fs-8 d-none d-sm-inline'>{getFileTypeDisplayName(fileExtension)}</span>
            </div>
          </div>
          
          <div className='d-flex align-items-center gap-1 gap-md-2 flex-shrink-0'>
            <span className='text-muted fs-8 d-none d-lg-inline me-2'>
              {formatFileSize(document.fileSize)} • {formatUploadDate(document.dateUploaded)}
            </span>
            <button
              className='btn btn-sm btn-primary d-none d-sm-flex'
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? (
                <>
                  <div className="spinner-border spinner-border-sm me-2" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <span className='d-none d-md-inline'>Downloading...</span>
                </>
              ) : (
                <>
                  <KTSVG path='/media/icons/duotune/arrows/arr091.svg' className='svg-icon-4 me-1 me-md-2' />
                  <span className='d-none d-md-inline'>Download</span>
                </>
              )}
            </button>
            {/* Mobile Download Button */}
            <button
              className='btn btn-sm btn-icon btn-primary d-flex d-sm-none'
              onClick={handleDownload}
              disabled={downloading}
              title="Download"
            >
              {downloading ? (
                <div className="spinner-border spinner-border-sm" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              ) : (
                <KTSVG path='/media/icons/duotune/arrows/arr091.svg' className='svg-icon-4' />
              )}
            </button>
            <button
              className='btn btn-sm btn-secondary d-none d-sm-flex'
              onClick={onClose}
            >
              <KTSVG path='/media/icons/duotune/arrows/arr061.svg' className='svg-icon-4 me-1 me-md-2' />
              <span className='d-none d-md-inline'>Close</span>
            </button>
            {/* Mobile Close Button */}
            <button
              className='btn btn-sm btn-icon btn-secondary d-flex d-sm-none'
              onClick={onClose}
              title="Close"
            >
              <KTSVG path='/media/icons/duotune/arrows/arr061.svg' className='svg-icon-4' />
            </button>
          </div>
        </div>

        {/* PDF Content */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {loading ? (
            <div className='d-flex justify-content-center align-items-center h-100'>
              <div className='text-center'>
                <div className='spinner-border text-primary mb-3' role='status'>
                  <span className='visually-hidden'>Loading PDF...</span>
                </div>
                <p className='text-muted'>Loading PDF preview...</p>
              </div>
            </div>
          ) : error ? (
            <div className='d-flex justify-content-center align-items-center h-100'>
              <div className='text-center px-4'>
                <KTSVG path='/media/icons/duotune/general/gen040.svg' className='svg-icon-4x text-danger mb-3' />
                <h5 className='text-danger mb-2'>Failed to Load PDF</h5>
                <p className='text-muted mb-4'>{error}</p>
                <div className='d-flex gap-2 justify-content-center'>
                  <button className='btn btn-primary' onClick={handleDownload}>
                    Download Instead
                  </button>
                  <button className='btn btn-secondary' onClick={onClose}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          ) : documentUrl ? (
            <>
              {/* Desktop PDF Viewer */}
              <iframe
                src={documentUrl}
                title={document.title}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  border: 'none',
                  display: window.innerWidth >= 768 ? 'block' : 'none'
                }}
                className='d-none d-md-block'
                onError={(e) => {
                  console.error('PDF iframe loading error:', e);
                  setError('Failed to display PDF in browser');
                }}
                onLoad={() => {
                  console.log('PDF loaded successfully in iframe');
                }}
              />
              
              {/* Mobile PDF Viewer */}
              <div className='d-block d-md-none h-100'>
                <iframe
                  src={`${documentUrl}#view=FitH&toolbar=1&navpanes=0&scrollbar=1`}
                  title={document.title}
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    border: 'none',
                    minHeight: '500px'
                  }}
                  onError={(e) => {
                    console.error('Mobile PDF iframe loading error:', e);
                    // Fallback for mobile - direct download
                    setError('PDF preview not supported on this device');
                  }}
                  onLoad={() => {
                    console.log('Mobile PDF loaded successfully in iframe');
                  }}
                />
                
                {/* Mobile Fallback */}
                <div className='position-absolute top-50 start-50 translate-middle d-none' id='mobile-fallback'>
                  <div className='text-center'>
                    <KTSVG path='/media/icons/duotune/files/fil021.svg' className='svg-icon-4x text-primary mb-3' />
                    <h6 className='mb-3'>PDF Preview Unavailable</h6>
                    <p className='text-muted mb-3 small'>This PDF cannot be previewed on your device.</p>
                    <button className='btn btn-primary btn-sm' onClick={handleDownload}>
                      <KTSVG path='/media/icons/duotune/arrows/arr091.svg' className='svg-icon-4 me-2' />
                      Download PDF
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className='d-flex justify-content-center align-items-center h-100'>
              <div className='text-center'>
                <p className='text-muted mb-3'>Unable to preview PDF</p>
                <div className='d-flex gap-2 justify-content-center'>
                  <button className='btn btn-primary' onClick={handleDownload}>
                    Download PDF
                  </button>
                  <button className='btn btn-secondary' onClick={onClose}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Non-PDF Modal (Download Only)
  return (
    <div className='modal fade show d-flex' tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1055 }}>
      <div className='modal-dialog modal-dialog-centered' style={{ maxWidth: '500px' }}>
        <div className='modal-content'>
          {/* Header */}
          <div className='modal-header bg-light border-bottom px-4 py-3'>
            <div className='d-flex align-items-center flex-grow-1'>
              <div className='symbol symbol-40px me-3'>
                <div className='symbol-label bg-light-primary'>
                  <KTSVG
                    path={getFileIcon(fileExtension)}
                    className='svg-icon-2 text-primary'
                  />
                </div>
              </div>
              <div>
                <h5 className='modal-title mb-0'>{document.title}</h5>
                <span className='text-muted fs-8'>{getFileTypeDisplayName(fileExtension)}</span>
              </div>
            </div>
            <button
              className='btn btn-sm btn-icon btn-active-light-primary'
              onClick={onClose}
            >
              <KTSVG path='/media/icons/duotune/arrows/arr061.svg' className='svg-icon-2' />
            </button>
          </div>

          {/* Content - Download Box */}
          <div className='modal-body p-6 text-center'>
            <div className='mb-4'>
              <KTSVG
                path={getFileIcon(fileExtension)}
                className='svg-icon-4x text-primary mb-3'
              />
              <h4 className='text-gray-800 mb-2'>{document.title}</h4>
              <p className='text-muted mb-3'>{getFileTypeDisplayName(fileExtension)}</p>
            </div>

            <div className='mb-4'>
              <span className='badge badge-light-primary fs-8 me-2'>
                {formatFileSize(document.fileSize)}
              </span>
              <span className='badge badge-light-info fs-8 me-2'>
                {fileExtension.toUpperCase()}
              </span>
              <span className='badge badge-light-success fs-8'>
                {formatUploadDate(document.dateUploaded)}
              </span>
            </div>

            <p className='text-muted fs-7 mb-4'>
              This file type cannot be previewed online. Click the button below to download.
            </p>

            <div className='d-flex gap-2 justify-content-center'>
              <button
                className='btn btn-primary'
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading ? (
                  <>
                    <div className="spinner-border spinner-border-sm me-2" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    Downloading...
                  </>
                ) : (
                  <>
                    <KTSVG path='/media/icons/duotune/arrows/arr091.svg' className='svg-icon-4 me-2' />
                    Download File
                  </>
                )}
              </button>
              <button
                className='btn btn-secondary'
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { DocumentViewer };