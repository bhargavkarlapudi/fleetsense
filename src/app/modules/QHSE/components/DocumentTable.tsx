import React, {FC, useState} from 'react'
import {KTSVG} from '../../../../_metronic/helpers'
import {DocumentItem} from '../core/_models'

interface DocumentTableProps {
  documents: DocumentItem[]
  allDocuments: DocumentItem[]  // Add this to access the full document tree
  onDocumentClick: (document: DocumentItem) => void
  onDownload: (document: DocumentItem) => void
  onDelete: (document: DocumentItem) => void
  onStartRename: (document: DocumentItem) => void
  onRenameChange: (value: string) => void
  onCancelRename: () => void
  onCommitRename: (document: DocumentItem) => void
  renamingId: number | null
  renamingValue: string
  renamingBusy?: boolean
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

const DocumentTable: FC<DocumentTableProps> = ({
  documents,
  allDocuments,
  onDocumentClick,
  onDownload,
  onDelete,
  onStartRename,
  onRenameChange,
  onCancelRename,
  onCommitRename,
  renamingId,
  renamingValue,
  renamingBusy,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: 'asc' });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const buildCategoryPath = (documentId: number): string => {
    const findDocumentPath = (items: DocumentItem[], targetId: number, currentPath: string[] = []): string[] | null => {
      for (const item of items) {
        if (item.type === 'folder') {
          const newPath = [...currentPath, item.title]
          
          if (item.children) {
            const foundDoc = item.children.find(child => child.id === targetId && child.type === 'document')
            if (foundDoc) {
              return newPath
            }
            
            const result = findDocumentPath(item.children, targetId, newPath)
            if (result) {
              return result
            }
          }
        }
      }
      return null
    }

    const path = findDocumentPath(allDocuments, documentId)
    return path ? path.join('/') : 'Uncategorized'
  }

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedDocuments = React.useMemo(() => {
    let sortableDocuments = [...documents];
    if (sortConfig.key) {
      sortableDocuments.sort((a, b) => {
        let aValue: any = '';
        let bValue: any = '';

        switch (sortConfig.key) {
          case 'title':
            aValue = a.title.toLowerCase();
            bValue = b.title.toLowerCase();
            break;
          case 'category':
            aValue = buildCategoryPath(a.id).toLowerCase();
            bValue = buildCategoryPath(b.id).toLowerCase();
            break;
          case 'fileSize':
            // Convert file size to bytes for proper sorting
            aValue = parseFloat(a.fileSize?.replace(/[^\d.]/g, '') || '0');
            bValue = parseFloat(b.fileSize?.replace(/[^\d.]/g, '') || '0');
            break;
          case 'dateUploaded':
            aValue = new Date(a.dateUploaded || '').getTime();
            bValue = new Date(b.dateUploaded || '').getTime();
            break;
          case 'docType':
            aValue = (a.docType || '').toLowerCase();
            bValue = (b.docType || '').toLowerCase();
            break;
          case 'versionTag':
            aValue = (a.versionTag || '').toLowerCase();
            bValue = (b.versionTag || '').toLowerCase();
            break;
          default:
            return 0;
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableDocuments;
  }, [documents, sortConfig, allDocuments]);

  // Pagination logic
  const totalPages = Math.ceil(sortedDocuments.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentDocuments = sortedDocuments.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(Number(event.target.value));
    setCurrentPage(1); 
  };

  const renderDocTypeBadge = (doc: DocumentItem) => {
    if (!doc.docType) return <span className='badge badge-light text-muted'>Doc</span>;
    const label = doc.docType === 'form' ? 'Form' : 'Manual';
    const color = doc.docType === 'form' ? 'badge-light-primary' : 'badge-light-secondary';
    return <span className={`badge ${color}`}>{label}</span>;
  };

  const renderVersionBadge = (doc: DocumentItem) => {
    if (!doc.versionTag) return <span className='text-muted'>—</span>;
    return (
      <div className='d-flex align-items-center gap-2 flex-wrap'>
        <span className='badge badge-light-dark'>v{doc.versionTag.replace(/^v/i, '')}</span>
        {doc.isCurrentVersion === false && (
          <span className='badge badge-light-danger'>Old</span>
        )}
        {doc.isCurrentVersion !== false && doc.versionTag && (
          <span className='badge badge-light-success'>Current</span>
        )}
      </div>
    );
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
    
      <div 
        className="table-responsive" 
        style={{ 
          flex: 1,
          maxHeight: 'calc(100vh - 500px)', 
          overflowY: 'auto',
          overflowX: 'hidden',
          border: '1px solid #e4e6ea',
          borderRadius: '0.625rem'
        }}
      >
        <table className='table table-row-dashed table-row-gray-300 align-middle gs-0 gy-4 mb-0'>
          <thead>
            <tr className='fw-bold text-muted' style={{
              position: 'sticky',
              top: 0,
              backgroundColor: '#f9f9f9',
              zIndex: 10,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <th className="text-center" style={{ 
                width: '70px',
                position: 'sticky',
                top: 0,
                backgroundColor: '#f9f9f9',
                zIndex: 10,
                paddingTop: '1rem',
                paddingBottom: '1rem'
              }}>
                SR/NO
              </th>
              <th 
                onClick={() => handleSort('title')} 
                className='text-nowrap ps-4 cursor-pointer' 
                style={{ 
                  minWidth: '200px',
                  position: 'sticky',
                  top: 0,
                  backgroundColor: '#f9f9f9',
                  zIndex: 10,
                  paddingTop: '1rem',
                  paddingBottom: '1rem'
                }}
              >
                Document Title
                <KTSVG
                  path={`/media/map/sort-col-${sortConfig.key === 'title' 
                    ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' 
                    : 'grey'}.svg`}
                  className="svg-icon ms-2 custom-sort-icon"
                />
              </th>
              <th 
                onClick={() => handleSort('docType')} 
                className='text-nowrap cursor-pointer' 
                style={{ 
                  minWidth: '100px',
                  position: 'sticky',
                  top: 0,
                  backgroundColor: '#f9f9f9',
                  zIndex: 10,
                  paddingTop: '1rem',
                  paddingBottom: '1rem'
                }}
              >
                Type
                <KTSVG
                  path={`/media/map/sort-col-${sortConfig.key === 'docType' 
                    ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' 
                    : 'grey'}.svg`}
                  className="svg-icon ms-2 custom-sort-icon"
                />
              </th>
              <th 
                onClick={() => handleSort('versionTag')} 
                className='text-nowrap cursor-pointer' 
                style={{ 
                  minWidth: '120px',
                  position: 'sticky',
                  top: 0,
                  backgroundColor: '#f9f9f9',
                  zIndex: 10,
                  paddingTop: '1rem',
                  paddingBottom: '1rem'
                }}
              >
                Version
                <KTSVG
                  path={`/media/map/sort-col-${sortConfig.key === 'versionTag' 
                    ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' 
                    : 'grey'}.svg`}
                  className="svg-icon ms-2 custom-sort-icon"
                />
              </th>
              <th 
                onClick={() => handleSort('category')} 
                className='text-nowrap cursor-pointer' 
                style={{ 
                  minWidth: '150px',
                  position: 'sticky',
                  top: 0,
                  backgroundColor: '#f9f9f9',
                  zIndex: 10,
                  paddingTop: '1rem',
                  paddingBottom: '1rem'
                }}
              >
                Category
                <KTSVG
                  path={`/media/map/sort-col-${sortConfig.key === 'category' 
                    ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' 
                    : 'grey'}.svg`}
                  className="svg-icon ms-2 custom-sort-icon"
                />
              </th>
              <th 
                onClick={() => handleSort('fileSize')} 
                className='text-nowrap cursor-pointer' 
                style={{ 
                  minWidth: '100px',
                  position: 'sticky',
                  top: 0,
                  backgroundColor: '#f9f9f9',
                  zIndex: 10,
                  paddingTop: '1rem',
                  paddingBottom: '1rem'
                }}
              >
                Size
                <KTSVG
                  path={`/media/map/sort-col-${sortConfig.key === 'fileSize' 
                    ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' 
                    : 'grey'}.svg`}
                  className="svg-icon ms-2 custom-sort-icon"
                />
              </th>
              <th 
                onClick={() => handleSort('dateUploaded')} 
                className='text-nowrap cursor-pointer' 
                style={{ 
                  minWidth: '120px',
                  position: 'sticky',
                  top: 0,
                  backgroundColor: '#f9f9f9',
                  zIndex: 10,
                  paddingTop: '1rem',
                  paddingBottom: '1rem'
                }}
              >
                Date Uploaded
                <KTSVG
                  path={`/media/map/sort-col-${sortConfig.key === 'dateUploaded' 
                    ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' 
                    : 'grey'}.svg`}
                  className="svg-icon ms-2 custom-sort-icon"
                />
              </th>
              <th className='text-nowrap text-end pe-4' style={{ 
                minWidth: '100px',
                position: 'sticky',
                top: 0,
                backgroundColor: '#f9f9f9',
                zIndex: 10,
                paddingTop: '1rem',
                paddingBottom: '1rem'
              }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {currentDocuments.length === 0 ? (
              <tr>
                <td colSpan={8} className='text-center py-10'>
                  <div className='d-flex flex-column align-items-center'>
                    <KTSVG
                      path='/media/icons/duotune/files/fil024.svg'
                      className='svg-icon-4x svg-icon-muted mb-4'
                    />
                    <span className='text-muted fs-6'>No documents found</span>
                  </div>
                </td>
              </tr>
            ) : (
              currentDocuments.map((document, index) => (
                <tr key={document.id} className='hover-bg-light-primary'>
                  <td className='text-center'>
                    <span className='text-muted fw-semibold fs-7'>
                      {startIndex + index + 1}
                    </span>
                  </td>
                  <td className='text-left ps-4'>
                    <div className='d-flex align-items-center'>
                      <KTSVG
                        path='/media/icons/duotune/files/fil003.svg'
                        className='svg-icon-2 text-primary me-3'
                      />
                      <div className='d-flex flex-column flex-grow-1'>
                        {renamingId === document.id ? (
                          <div className='d-flex align-items-center gap-2'>
                            <input
                              className='form-control form-control-sm'
                              value={renamingValue}
                              onChange={(e) => onRenameChange(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  onCommitRename(document)
                                }
                                if (e.key === 'Escape') {
                                  onCancelRename()
                                }
                              }}
                              autoFocus
                              style={{ maxWidth: 260 }}
                            />
                            <button
                              className='btn btn-sm p-0'
                              style={{ backgroundColor: 'transparent', border: 'none' }}
                              title='Save'
                              disabled={renamingBusy}
                              onClick={() => onCommitRename(document)}
                            >
                              <KTSVG path="/media/icons/duotune/general/gen043.svg" className="svg-icon-4 text-success" />
                            </button>
                            <button
                              className='btn btn-sm p-0'
                              style={{ backgroundColor: 'transparent', border: 'none' }}
                              title='Cancel'
                              onClick={onCancelRename}
                            >
                              <KTSVG path="/media/icons/duotune/general/gen040.svg" className="svg-icon-4 text-muted" />
                            </button>
                          </div>
                        ) : (
                          <span
                            className='text-gray-800 fw-bold text-hover-primary cursor-pointer fs-6'
                            onClick={() => onDocumentClick(document)}
                            onDoubleClick={() => onStartRename(document)}
                            title='Double click to rename'
                          >
                            {document.title}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className='text-muted fw-semibold fs-7'>
                      {buildCategoryPath(document.id)}
                    </span>
                  </td>
                  <td>
                    {renderDocTypeBadge(document)}
                  </td>
                  <td>
                    {renderVersionBadge(document)}
                  </td>
                  <td>
                    <span className='text-muted fw-semibold fs-7'>{document.fileSize}</span>
                  </td>
                  <td>
                    <span className='text-muted fw-semibold fs-7'>
                      {document.dateUploaded && formatDate(document.dateUploaded)}
                    </span>
                  </td>
                  <td className='text-center pe-4'>
                    <div className='d-flex justify-content-end'>
                      <button
                        className='btn btn-sm p-2'
                        style={{
                          backgroundColor: 'transparent',
                          border: 'none',
                          outline: 'none',
                          boxShadow: 'none'
                        }}
                        onClick={() => onStartRename(document)}
                        title='Rename Document'
                        disabled={renamingId === document.id && renamingBusy}
                      >
                        <KTSVG path="/media/icons/duotune/general/gen055.svg" className="svg-icon-3 text-muted" />
                      </button>
                      <button
                        className='btn btn-sm p-2'
                        style={{
                          backgroundColor: 'transparent',
                          border: 'none',
                          outline: 'none',
                          boxShadow: 'none'
                        }}
                        onClick={() => onDocumentClick(document)}
                        title='View Document'
                      >
                        <KTSVG path="/media/map/ph_eye.svg" className="svg-icon-3" />
                      </button>
                      <button
                        className='btn btn-sm p-2'
                        style={{
                          backgroundColor: 'transparent',
                          border: 'none',
                          outline: 'none',
                          boxShadow: 'none'
                        }}
                        onClick={() => onDelete(document)}
                        title='Delete Document'
                      >
                        <KTSVG path="/media/icons/duotune/general/gen027.svg" className="svg-icon-3 text-danger" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/*Pagination  */}
      <div className="pagination-wrapper d-flex justify-content-between align-items-center py-3" style={{ flexShrink: 0 }}>
        <div className="d-flex align-items-center">
          <span className="text-muted me-2">Rows per page</span>
          <select
            className="form-select"
            style={{
              borderRadius: "20px",
              width: "70px",
              border: "1px solid #dee2e6",
              fontSize: "14px",
              padding: "4px 8px"
            }}
            value={rowsPerPage}
            onChange={handleRowsPerPageChange}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>

        <div className="d-flex align-items-center">
          <span className="text-muted me-3" style={{ fontSize: "14px" }}>
            Showing <strong>{((currentPage - 1) * rowsPerPage) + 1}-{Math.min(currentPage * rowsPerPage, sortedDocuments.length)}</strong> of <strong>{sortedDocuments.length}</strong>
          </span>

          <nav>
            <ul className="pagination pagination-sm mb-0" style={{ gap: "2px" }}>
              <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                <button
                  className="page-link text-muted"
                  style={{
                    backgroundColor: "#f8f9fa",
                    border: "1px solid #dee2e6",
                    padding: "8px 12px",
                    fontSize: "14px",
                    borderRadius: "6px"
                  }}
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  ‹
                </button>
              </li>

              {(() => {
                const pages = [];
                const showPages = 5; // Show 5 page numbers at most
                let startPage = Math.max(1, currentPage - 2);
                let endPage = Math.min(totalPages, startPage + showPages - 1);

                // Adjust start if we're near the end
                if (endPage - startPage < showPages - 1) {
                  startPage = Math.max(1, endPage - showPages + 1);
                }

                // Add first page and ellipsis if needed
                if (startPage > 1) {
                  pages.push(
                    <li key={1} className="page-item">
                      <button
                        className="page-link text-muted"
                        style={{
                          backgroundColor: "#f8f9fa",
                          border: "1px solid #dee2e6",
                          padding: "8px 12px",
                          fontSize: "14px",
                          minWidth: "40px",
                          borderRadius: "6px"
                        }}
                        onClick={() => handlePageChange(1)}
                      >
                        1
                      </button>
                    </li>
                  );

                  if (startPage > 2) {
                    pages.push(
                      <li key="ellipsis1" className="page-item disabled">
                        <span className="page-link border-0 text-muted" style={{ backgroundColor: "transparent", padding: "4px 8px" }}>
                          ...
                        </span>
                      </li>
                    );
                  }
                }

                // Add page numbers
                for (let i = startPage; i <= endPage; i++) {
                  pages.push(
                    <li key={i} className={`page-item ${currentPage === i ? "active" : ""}`}>
                      <button
                        className="page-link text-muted"
                        style={{
                          backgroundColor: currentPage === i ? "#F4F9FF" : "transparent",
                          border: "1px solid #dee2e6",
                          padding: "8px 12px",
                          fontSize: "14px",
                          minWidth: "40px",
                          borderRadius: "6px",
                          outline: "none",
                          boxShadow: "none"
                        }}
                        onClick={() => handlePageChange(i)}
                      >
                        {i}
                      </button>
                    </li>
                  );
                }

                // Add ellipsis and last page if needed
                if (endPage < totalPages) {
                  if (endPage < totalPages - 1) {
                    pages.push(
                      <li key="ellipsis2" className="page-item disabled">
                        <span className="page-link border-0 text-muted" style={{ backgroundColor: "transparent", padding: "4px 8px" }}>
                          ...
                        </span>
                      </li>
                    );
                  }

                  pages.push(
                    <li key={totalPages} className="page-item">
                      <button
                        className="page-link text-muted"
                        style={{
                          backgroundColor: "#f8f9fa",
                          border: "1px solid #dee2e6",
                          padding: "8px 12px",
                          fontSize: "14px",
                          minWidth: "40px",
                          borderRadius: "6px"
                        }}
                        onClick={() => handlePageChange(totalPages)}
                      >
                        {totalPages}
                      </button>
                    </li>
                  );
                }

                return pages;
              })()}

              <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                <button
                  className="page-link text-muted"
                  style={{
                    backgroundColor: "#f8f9fa",
                    border: "1px solid #dee2e6",
                    padding: "8px 12px",
                    fontSize: "14px",
                    borderRadius: "6px"
                  }}
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  ›
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>
  )
}

export {DocumentTable}
