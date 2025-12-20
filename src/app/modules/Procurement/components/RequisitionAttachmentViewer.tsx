import React, { FC, useState, useEffect } from 'react';
import { KTSVG } from '../../../../_metronic/helpers';
import { FileRefDto } from '../core/_models';

interface RequisitionAttachmentViewerProps {
  attachment: FileRefDto;
  onClose: () => void;
  onDownload: (attachment: FileRefDto) => void;
}

const API_URL = process.env.REACT_APP_API_URL || '/api';

const RequisitionAttachmentViewer: FC<RequisitionAttachmentViewerProps> = ({
  attachment,
  onClose,
  onDownload
}) => {
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);


  const getFileExtension = (filename: string): string => {
    const extension = filename.toLowerCase().split('.').pop() || '';
    return extension;
  };


  const isPdfFile = (filename: string): boolean => {
    const extension = getFileExtension(filename);
    return extension === 'pdf';
  };


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
  const formatFileSize = (sizeBytes: number): string => {
    if (sizeBytes < 1024) return `${sizeBytes} B`;
    if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  };


  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      window.innerWidth < 768;
  };


  useEffect(() => {
    const loadPdfPreview = async () => {
      if (!isPdfFile(attachment.fileName)) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);


        const fullUrl = `${API_URL}${attachment.url}`;
        console.log('Loading PDF from:', fullUrl);


        if (isMobileDevice()) {
          setDocumentUrl(`${fullUrl}#view=FitH&toolbar=1&navpanes=0&scrollbar=1`);
        } else {
          setDocumentUrl(fullUrl);
        }
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError(err instanceof Error ? err.message : 'Failed to load PDF');
      } finally {
        setLoading(false);
      }
    };

    loadPdfPreview();

    return () => {
      if (documentUrl && documentUrl.startsWith('blob:')) {
        URL.revokeObjectURL(documentUrl);
      }
    };
  }, [attachment]);

  // Handle download
  const handleDownload = async () => {
    try {
      setDownloading(true);

      const downloadUrl = `${API_URL}${attachment.url}`;
      console.log('Downloading file from:', downloadUrl);

      // Fetch the file as a blob
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }

      const blob = await response.blob();

      // Create a temporary URL for the blob
      const blobUrl = window.URL.createObjectURL(blob);

      // Create a temporary anchor element and trigger download
      const link = window.document.createElement('a');
      link.href = blobUrl;
      link.download = attachment.fileName;
      window.document.body.appendChild(link);
      link.click();

      // Clean up
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      console.log('✅ File downloaded successfully:', attachment.fileName);
      onDownload(attachment);
    } catch (err) {
      console.error('❌ Download error:', err);
      alert(`Failed to download file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDownloading(false);
    }
  };

  const fileExtension = getFileExtension(attachment.fileName);
  const isPdf = isPdfFile(attachment.fileName);



  return (
    <div className='modal fade show d-flex' tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1055 }}>
      <div className='modal-dialog modal-dialog-centered' style={{ maxWidth: '500px' }}>
        <div className='modal-content'>
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
                <h5 className='modal-title mb-0'>{attachment.fileName}</h5>
                <span className='text-muted fs-8'>{getFileTypeDisplayName(fileExtension)}</span>
              </div>
            </div>
            <button
              className='btn-close'
              onClick={onClose}
            ></button>
          </div>

          <div className='modal-body p-6 text-center'>
            <div className='mb-4'>
              <KTSVG
                path={getFileIcon(fileExtension)}
                className='svg-icon-4x text-primary mb-3'
              />
              <h4 className='text-gray-800 mb-2'>{attachment.fileName}</h4>
              <p className='text-muted mb-3'>{getFileTypeDisplayName(fileExtension)}</p>
            </div>

            <div className='mb-4'>
              <span className='badge badge-light-primary fs-8 me-2'>
                {formatFileSize(attachment.sizeBytes)}
              </span>
              <span className='badge badge-light-info fs-8'>
                {fileExtension.toUpperCase()}
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

export { RequisitionAttachmentViewer };