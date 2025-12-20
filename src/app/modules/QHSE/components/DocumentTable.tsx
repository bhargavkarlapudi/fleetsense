import React, {FC} from 'react'
import {KTSVG} from '../../../../_metronic/helpers'

interface DocumentItem {
  id: number;
  title: string;
  type: 'folder' | 'document';
  category: string;              // Can be comma-separated values like "Imported,Imported"
  filePath?: string | null;      // Optional, can be null
  fileSize?: string | null;      // Optional, can be null
  dateUploaded?: string | null;  // Optional, can be null
  parentId?: number | null;      // Optional, can be null
  createdBy?: string;            // Optional, e.g., "system"
  lastModified?: string;         // Optional ISO string
  children?: DocumentItem[];     // Optional for nested folders
  fileUrl?: string;              // Optional alternative to filePath
}

interface DocumentTableProps {
  documents: DocumentItem[]
  allDocuments: DocumentItem[]  // Add this to access the full document tree
  onDocumentClick: (document: DocumentItem) => void
  onDownload: (document: DocumentItem) => void
}

const DocumentTable: FC<DocumentTableProps> = ({documents, allDocuments, onDocumentClick, onDownload}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // Function to build category path from folder hierarchy
  const buildCategoryPath = (documentId: number): string => {
    const findDocumentPath = (items: DocumentItem[], targetId: number, currentPath: string[] = []): string[] | null => {
      for (const item of items) {
        if (item.type === 'folder') {
          const newPath = [...currentPath, item.title]
          
          // Check if document is directly in this folder
          if (item.children) {
            const foundDoc = item.children.find(child => child.id === targetId && child.type === 'document')
            if (foundDoc) {
              return newPath
            }
            
            // Recursively search in subfolders
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

  return (
    <div className='table-responsive'>
      <table className='table table-row-dashed table-row-gray-300 align-middle gs-0 gy-4'>
        <thead>
          <tr className='fw-bold text-muted'>
            <th className='min-w-200px'>Document Title</th>
            <th className='min-w-150px'>Category</th>
            <th className='min-w-100px'>Size</th>
            <th className='min-w-120px'>Date Uploaded</th>
            <th className='min-w-100px text-end'>Actions</th>
          </tr>
        </thead>
        <tbody>
          {documents.length === 0 ? (
            <tr>
              <td colSpan={5} className='text-center py-10'>
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
            documents.map((document) => (
              <tr key={document.id} className='hover-bg-light-primary'>
                <td className='text-left'>
                  <div className='d-flex align-items-center'>
                    <KTSVG
                      path='/media/icons/duotune/files/fil003.svg'
                      className='svg-icon-2 text-primary ms-3 me-3'
                    />
                    <div className='d-flex flex-column'>
                      <span
                        className='text-gray-800 fw-bold text-hover-primary cursor-pointer fs-6'
                        onClick={() => onDocumentClick(document)}
                      >
                        {document.title}
                      </span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className='text-muted fw-semibold fs-7'>
                    {buildCategoryPath(document.id)}
                  </span>
                </td>
                <td>
                  <span className='text-muted fw-semibold fs-7'>{document.fileSize}</span>
                </td>
                <td>
                  <span className='text-muted fw-semibold fs-7'>
                    {document.dateUploaded && formatDate(document.dateUploaded)}
                  </span>
                </td>
                <td className='text-center'>
                  <div className='d-flex justify-content-end'>
                    <button
                      className='btn btn-sm btn-light btn-active-light-primary me-2'
                      onClick={() => onDocumentClick(document)}
                      title='View Document'
                    >
                      <KTSVG
                        path='/media/icons/duotune/general/gen004.svg'
                        className='svg-icon-4'
                      />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export {DocumentTable}