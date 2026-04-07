import React, { FC, useState, useEffect, useMemo } from 'react';
import { KTSVG } from '../../../../_metronic/helpers';
import { useAuth } from '../../../../app/modules/auth';
import { downloadPdfDocumentRequest } from '../core/_requests';
import { DocumentItem, FormFieldSchema, FormSchema } from '../core/_models';

interface DocumentViewerProps {
  document: DocumentItem;
  allDocuments: DocumentItem[];
  onClose: () => void;
  onDownload: (document: DocumentItem) => void;
  simpleView?: boolean;
}

const API_URL = process.env.REACT_APP_API_URL
const DOCUMENTS_API_URL = `${API_URL}/qhse/documents`

const DocumentViewer: FC<DocumentViewerProps> = ({ document, allDocuments, onClose, onDownload, simpleView }) => {
  console.log(document);
  const { auth } = useAuth();
  const token = auth?.auth.jwt;

  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  console.log(documentUrl);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'fill'>('preview');
  const [formValues, setFormValues] = useState<Record<string, any>>({});

  const showFormFeatures = !simpleView;
  const isForm = useMemo(
    () =>
      showFormFeatures &&
      (document.docType === 'form' ||
        (document.category || '').toLowerCase().includes('form') ||
        Boolean(document.formSchema)),
    [document, showFormFeatures]
  );

  const formSchema: FormSchema = useMemo(() => {
    if (document.formSchema) return document.formSchema;

    // Fallback schema to make the UI render even before backend supplies real schema
    const fallbackSections = [
      {
        title: 'Header',
        description: 'Basic details required before starting the checklist.',
        fields: [
          {key: 'vesselName', label: 'Vessel Name', type: 'text', required: true, placeholder: 'e.g. MV Aurora'},
          {key: 'date', label: 'Date', type: 'date', required: true},
          {key: 'terminalBerth', label: 'Terminal / Berth', type: 'text', required: true},
        ] as FormFieldSchema[],
      },
      {
        title: 'Checks',
        description: 'Y/N/NA with remarks for each item.',
        fields: [
          {key: 'q1_answer', label: 'Adequate depth / air draught?', type: 'select', required: true, options: [
            {value: 'Y', label: 'Yes'},
            {value: 'N', label: 'No'},
            {value: 'NA', label: 'N/A'},
          ]},
          {key: 'q1_remark', label: 'Remark', type: 'textarea', placeholder: 'Add context or corrective actions'},
          {key: 'q2_answer', label: 'Mooring arrangements adequate?', type: 'select', required: true, options: [
            {value: 'Y', label: 'Yes'},
            {value: 'N', label: 'No'},
            {value: 'NA', label: 'N/A'},
          ]},
          {key: 'q2_remark', label: 'Remark', type: 'textarea'},
        ] as FormFieldSchema[],
      },
    ];

    return {
      title: document.title,
      version: document.versionTag || undefined,
      sections: fallbackSections,
      signatures: [
        {key: 'masterSignature', label: 'Master / Vessel Rep Signature'},
        {key: 'shoreSignature', label: 'Terminal / Shore Rep Signature'},
      ],
    };
  }, [document]);

  // Build defaults when schema changes
  useEffect(() => {
    const defaults: Record<string, any> = {};
    formSchema.sections.forEach(section =>
      section.fields.forEach(field => {
        if (defaults[field.key] === undefined) {
          defaults[field.key] = field.type === 'checkbox' ? false : '';
        }
      })
    );
    if (formSchema.overlay) {
      formSchema.overlay.fields.forEach(field => {
        if (defaults[field.key] === undefined) {
          defaults[field.key] = '';
        }
      });
    }
    if (formSchema.checklist) {
      formSchema.checklist.headerRows.forEach(row => {
        if (defaults[row.left.key] === undefined) defaults[row.left.key] = '';
        if (defaults[row.right.key] === undefined) defaults[row.right.key] = '';
      });
      formSchema.checklist.rows.forEach(row => {
        if (row.type === 'question') {
          if (defaults[row.answerKey] === undefined) defaults[row.answerKey] = '';
          if (defaults[row.remarkKey] === undefined) defaults[row.remarkKey] = '';
        }
      });
    }
    formSchema.signatures?.forEach(sig => {
      defaults[sig.key] = '';
    });
    setFormValues(defaults);
  }, [formSchema]);

  useEffect(() => {
    setActiveTab(isForm ? 'preview' : 'preview');
  }, [isForm, document.id]);

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

  const handleFieldChange = (key: string, value: any) => {
    setFormValues(prev => ({...prev, [key]: value}));
  };

  const renderFieldInput = (field: FormFieldSchema) => {
    const commonProps = {
      value: formValues[field.key] ?? '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        handleFieldChange(field.key, e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value),
      className: 'form-control form-control-sm',
      required: field.required,
      placeholder: field.placeholder,
    };

    switch (field.type) {
      case 'textarea':
        return <textarea {...commonProps as any} rows={3} />;
      case 'select':
        return (
          <select {...commonProps as any}>
            <option value=''>Select</option>
            {(field.options || []).map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      case 'date':
        return <input type='date' {...commonProps as any} />;
      case 'number':
        return <input type='number' {...commonProps as any} />;
      case 'checkbox':
        return (
          <div className='form-check'>
            <input
              className='form-check-input'
              type='checkbox'
              checked={!!formValues[field.key]}
              onChange={(e) => handleFieldChange(field.key, e.target.checked)}
            />
          </div>
        );
      case 'radio':
        return (
          <div className='d-flex gap-3 flex-wrap'>
            {(field.options || []).map(opt => (
              <label key={opt.value} className='form-check form-check-sm form-check-custom form-check-solid'>
                <input
                  className='form-check-input'
                  type='radio'
                  name={field.key}
                  value={opt.value}
                  checked={formValues[field.key] === opt.value}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                />
                <span className='form-check-label'>{opt.label}</span>
              </label>
            ))}
          </div>
        );
      default:
        return <input type='text' {...commonProps as any} />;
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    // Backend wiring will replace this placeholder
    console.log('Form submission payload', {
      documentId: document.id,
      templateId: document.formTemplateId,
      version: document.versionTag,
      values: formValues,
    });
    alert('Form data captured. Hook up API to persist and generate PDFs.');
  };

  const renderChecklistForm = () => {
    if (!formSchema.checklist) return null;
    const checklist = formSchema.checklist;

    return (
      <form onSubmit={handleSubmitForm} className='h-100 overflow-auto'>
        <div className='border rounded p-3 mb-3' style={{ backgroundColor: '#f7f9fb' }}>
          <div className='d-flex justify-content-between align-items-start flex-wrap gap-2'>
            <div>
              <div className='text-muted small'>Document ID</div>
              <div className='fw-semibold'>{checklist.documentId || 'N/A'}</div>
            </div>
            <div className='text-end'>
              <div className='text-muted small'>Issued Date</div>
              <div className='fw-semibold'>{checklist.issuedDate || 'N/A'}</div>
            </div>
          </div>
          <div className='text-center mt-2'>
            <h5 className='mb-0 text-primary'>{formSchema.title}</h5>
            {formSchema.version && <div className='text-muted small'>Version {formSchema.version}</div>}
          </div>
        </div>

        <div className='border rounded mb-3'>
          <table className='table table-bordered mb-0' style={{ borderColor: '#0b5aa3' }}>
            <tbody>
              {checklist.headerRows.map((row, idx) => (
                <tr key={`header-${idx}`}>
                  <th style={{ backgroundColor: '#0b5aa3', color: '#fff', width: '18%', fontSize: 12 }}>
                    {row.left.label}
                  </th>
                  <td style={{ width: '32%' }}>
                    <input
                      type='text'
                      className='form-control form-control-sm'
                      value={formValues[row.left.key] ?? ''}
                      onChange={(e) => handleFieldChange(row.left.key, e.target.value)}
                    />
                  </td>
                  <th style={{ backgroundColor: '#0b5aa3', color: '#fff', width: '18%', fontSize: 12 }}>
                    {row.right.label}
                  </th>
                  <td style={{ width: '32%' }}>
                    <input
                      type={row.right.type === 'date' ? 'date' : 'text'}
                      className='form-control form-control-sm'
                      value={formValues[row.right.key] ?? ''}
                      onChange={(e) => handleFieldChange(row.right.key, e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {checklist.instructions && (
          <div className='border rounded p-3 mb-3' style={{ fontSize: 12 }}>
            {checklist.instructions}
          </div>
        )}

        <div className='border rounded mb-4'>
          <table className='table table-bordered align-middle mb-0' style={{ borderColor: '#0b5aa3' }}>
            <thead>
              <tr style={{ backgroundColor: '#0b5aa3', color: '#fff' }}>
                <th style={{ width: '6%', fontSize: 12 }}>No.</th>
                <th style={{ width: '54%', fontSize: 12 }}>Pre-Operation Checks</th>
                <th style={{ width: '15%', fontSize: 12 }}>Y/N/NA</th>
                <th style={{ width: '25%', fontSize: 12 }}>Remark</th>
              </tr>
            </thead>
            <tbody>
              {checklist.rows.map((row, idx) => {
                if (row.type === 'group') {
                  return (
                    <tr key={`group-${idx}`}>
                      <td colSpan={4} style={{ backgroundColor: '#e7f0fb', fontWeight: 600 }}>
                        {row.title}
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={`q-${row.number}`}>
                    <td style={{ fontSize: 12 }}>{row.number}</td>
                    <td style={{ fontSize: 12 }}>{row.text}</td>
                    <td>
                      <select
                        className='form-select form-select-sm'
                        value={formValues[row.answerKey] ?? ''}
                        onChange={(e) => handleFieldChange(row.answerKey, e.target.value)}
                      >
                        <option value=''>Select</option>
                        <option value='Y'>Y</option>
                        <option value='N'>N</option>
                        <option value='NA'>NA</option>
                      </select>
                    </td>
                    <td>
                      <textarea
                        className='form-control form-control-sm'
                        rows={2}
                        value={formValues[row.remarkKey] ?? ''}
                        onChange={(e) => handleFieldChange(row.remarkKey, e.target.value)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {formSchema.signatures && formSchema.signatures.length > 0 && (
          <div className='border rounded p-3 mb-4'>
            <div className='row g-3'>
              {formSchema.signatures.map(sig => (
                <div key={sig.key} className='col-md-6'>
                  <label className='form-label fw-semibold text-muted fs-7'>{sig.label}</label>
                  <input
                    type='text'
                    className='form-control form-control-sm'
                    placeholder='Sign by typing your name'
                    value={formValues[sig.key] ?? ''}
                    onChange={(e) => handleFieldChange(sig.key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className='d-flex justify-content-end gap-2 border-top pt-3'>
          <button type='button' className='btn btn-light' onClick={() => setFormValues(prev => {
            const reset: Record<string, any> = {};
            checklist.headerRows.forEach(row => {
              reset[row.left.key] = '';
              reset[row.right.key] = '';
            });
            checklist.rows.forEach(row => {
              if (row.type === 'question') {
                reset[row.answerKey] = '';
                reset[row.remarkKey] = '';
              }
            });
            formSchema.signatures?.forEach(sig => { reset[sig.key] = ''; });
            return reset;
          })}>
            Clear
          </button>
          <button type='submit' className='btn btn-primary'>
            Save & Submit
          </button>
        </div>
      </form>
    );
  };

  const renderOverlayForm = () => {
    if (!formSchema.overlay) return null;
    if (!documentUrl) {
      return (
        <div className='d-flex justify-content-center align-items-center h-100'>
          <div className='text-center'>
            <div className='spinner-border text-primary mb-3' role='status'>
              <span className='visually-hidden'>Loading PDF...</span>
            </div>
            <p className='text-muted'>Preparing overlay...</p>
          </div>
        </div>
      );
    }

    const overlay = formSchema.overlay;
    const pdfUrl = `${documentUrl.split('#')[0]}#page=${overlay.page}&view=FitH`;

    return (
      <div className='d-flex justify-content-center'>
        <div
          className='position-relative border rounded shadow-sm bg-white'
          style={{
            width: '100%',
            maxWidth: 900,
            aspectRatio: `${overlay.width} / ${overlay.height}`,
            overflow: 'hidden',
          }}
        >
          <iframe
            src={pdfUrl}
            title={`${document.title}-overlay`}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              border: 'none',
              pointerEvents: 'none',
            }}
          />
          <div
            className='position-absolute top-0 start-0 w-100 h-100'
            style={{ zIndex: 2, pointerEvents: 'auto' }}
          >
            {overlay.fields.map(field => (
              <div
                key={field.key}
                style={{
                  position: 'absolute',
                  left: `${field.xPct}%`,
                  top: `${field.yPct}%`,
                  width: `${field.widthPct}%`,
                  height: `${field.heightPct}%`,
                }}
                title={field.label}
              >
                {field.type === 'select' ? (
                  <select
                    className='form-select form-select-sm'
                    value={formValues[field.key] ?? ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    style={{ height: '100%', padding: '0 6px', fontSize: 12 }}
                  >
                    <option value=''>Select</option>
                    {(field.options || []).map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    className='form-control form-control-sm'
                    value={formValues[field.key] ?? ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    style={{ height: '100%', fontSize: 12, padding: '4px 6px', resize: 'none' }}
                  />
                ) : (
                  <input
                    type={field.type === 'date' ? 'date' : 'text'}
                    className='form-control form-control-sm'
                    value={formValues[field.key] ?? ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    style={{ height: '100%', fontSize: 12, padding: '0 6px' }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderFormContent = () => {
    if (formSchema.template === 'checklist-table' && formSchema.checklist) {
      return renderChecklistForm();
    }
    if (formSchema.template === 'pdf-overlay' && formSchema.overlay) {
      return (
        <form onSubmit={handleSubmitForm} className='d-flex flex-column gap-3'>
          <div className='alert alert-light-primary py-2'>
            <span className='fw-semibold'>Overlay mode:</span> inputs are positioned on top of the PDF page. Adjust coordinates in the schema for pixel-perfect alignment.
          </div>
          {renderOverlayForm()}
          <div className='d-flex justify-content-end gap-2 border-top pt-3'>
            <button type='button' className='btn btn-light' onClick={() => setFormValues(prev => {
              const reset: Record<string, any> = {};
              formSchema.overlay?.fields.forEach(field => { reset[field.key] = ''; });
              return reset;
            })}>
              Clear
            </button>
            <button type='submit' className='btn btn-primary'>
              Save & Submit
            </button>
          </div>
        </form>
      );
    }
    return (
    <form onSubmit={handleSubmitForm} className='h-100 overflow-auto'>
      <div className='bg-light px-4 py-3 mb-3 rounded border'>
        <div className='d-flex justify-content-between align-items-center flex-wrap gap-2'>
          <div>
            <h6 className='mb-1'>{formSchema.title}</h6>
            <span className='text-muted small'>
              {formSchema.version ? `Version ${formSchema.version}` : 'Unversioned'}
              {document.retentionYears ? ` • Retention ${document.retentionYears} yrs` : ''}
            </span>
          </div>
          <div className='d-flex align-items-center gap-2'>
            <span className='badge badge-light-primary'>Fillable</span>
            {document.isCurrentVersion === false && (
              <span className='badge badge-light-danger'>Old Version</span>
            )}
          </div>
        </div>
      </div>

      <div className='d-flex flex-column gap-4 pb-5'>
        {formSchema.sections.map((section, idx) => (
          <div key={section.title + idx} className='border rounded p-4'>
            <div className='d-flex justify-content-between align-items-start mb-3'>
              <div>
                <h6 className='mb-1 text-dark'>{section.title}</h6>
                {section.description && <p className='text-muted small mb-0'>{section.description}</p>}
              </div>
            </div>
            <div className='row g-3'>
              {section.fields.map(field => (
                <div key={field.key} className='col-md-6'>
                  <label className='form-label fw-semibold text-muted fs-7'>
                    {field.label}{field.required && <span className='text-danger ms-1'>*</span>}
                  </label>
                  {renderFieldInput(field)}
                  {field.helpText && <div className='text-muted small mt-1'>{field.helpText}</div>}
                </div>
              ))}
            </div>
          </div>
        ))}

        {formSchema.signatures && formSchema.signatures.length > 0 && (
          <div className='border rounded p-4'>
            <h6 className='mb-3 text-dark'>Signatures</h6>
            <div className='row g-3'>
              {formSchema.signatures.map(sig => (
                <div key={sig.key} className='col-md-6'>
                  <label className='form-label fw-semibold text-muted fs-7'>{sig.label}</label>
                  <input
                    type='text'
                    className='form-control form-control-sm'
                    placeholder='Sign by typing your name (replace with canvas signature later)'
                    value={formValues[sig.key] ?? ''}
                    onChange={(e) => handleFieldChange(sig.key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className='d-flex justify-content-end gap-2 border-top pt-3'>
        <button type='button' className='btn btn-light' onClick={() => setFormValues(prev => {
          const reset: Record<string, any> = {};
          formSchema.sections.forEach(section =>
            section.fields.forEach(field => {
              reset[field.key] = field.type === 'checkbox' ? false : '';
            })
          );
          formSchema.signatures?.forEach(sig => { reset[sig.key] = ''; });
          return reset;
        })}>
          Clear
        </button>
        <button type='submit' className='btn btn-primary'>
          Save & Submit
        </button>
      </div>
    </form>
    );
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
      
      const downloadResult = await downloadPdfDocumentRequest(token!, document.id)
      let urlToDownload: string | null = null
      let shouldRevokeUrl = false

      if (downloadResult.type === 'url') {
        urlToDownload = downloadResult.url
      } else {
        urlToDownload = URL.createObjectURL(downloadResult.blob)
        shouldRevokeUrl = true
      }

      if (!urlToDownload) {
        throw new Error('Download URL not found')
      }

      const link = window.document.createElement('a');
      link.href = urlToDownload;
      link.download = document.title;
      link.target = '_blank';
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);

      if (shouldRevokeUrl) {
        window.setTimeout(() => URL.revokeObjectURL(urlToDownload as string), 0)
      }

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

        {isForm && (
          <div className='border-bottom bg-white px-3'>
            <ul className='nav nav-tabs nav-line-tabs nav-line-tabs-2x'>
              <li className='nav-item'>
                <button
                  className={`nav-link py-3 ${activeTab === 'preview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('preview')}
                >
                  Preview
                </button>
              </li>
              <li className='nav-item'>
                <button
                  className={`nav-link py-3 ${activeTab === 'fill' ? 'active' : ''}`}
                  onClick={() => setActiveTab('fill')}
                >
                  Fill Form
                </button>
              </li>
            </ul>
          </div>
        )}

        {/* PDF Content */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {isForm && activeTab === 'fill' ? (
            <div className='h-100 overflow-auto px-3 py-3 bg-white'>
              {renderFormContent()}
            </div>
          ) : loading ? (
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

            {isForm && (
              <div className='mt-5 text-start'>
                <div className='alert alert-light-primary d-flex align-items-start'>
                  <KTSVG path='/media/icons/duotune/general/gen046.svg' className='svg-icon-2 me-2 mt-1' />
                  <div>
                    <div className='fw-semibold mb-1'>Fill this form directly</div>
                    <div className='text-muted small'>Preview is unavailable for this file type, but you can still capture responses below. Hook the submit action to your new API.</div>
                  </div>
                </div>
                {renderFormContent()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export { DocumentViewer };
