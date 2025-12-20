import React, {FC} from 'react'
import {KTSVG} from '../../../../_metronic/helpers'

interface DocumentItem {
  id: number
  title: string
  type: 'folder' | 'document'
  category: string
  filePath?: string | null
  fileSize?: string | null
  dateUploaded?: string | null
  parentId?: number | null
  createdBy?: string
  lastModified?: string
  children?: DocumentItem[]
  fileUrl?: string
}

interface FolderTreeItemProps {
  item: DocumentItem
  level: number
  expandedFolders: Set<number>
  selectedFolderId?: number
  onToggleFolder: (id: number, level: number) => void // Add level parameter
  onSelectFolder: (item: DocumentItem) => void
}

const FolderTreeItem: FC<FolderTreeItemProps> = ({
  item,
  level,
  expandedFolders,
  selectedFolderId,
  onToggleFolder,
  onSelectFolder,
}) => {
  const isExpanded = expandedFolders.has(item.id)
  const isSelected = selectedFolderId === item.id
  const hasChildren = item.children && item.children.length > 0

  // Handle folder click - both expand/collapse AND select
  const handleFolderClick = () => {
    if (item.type === 'folder') {
      // First expand/collapse if it has children
      if (hasChildren) {
        onToggleFolder(item.id, level) // Pass level parameter
      }
      // Then select the folder to show its documents
      onSelectFolder(item)
    }
  }

  // Handle only expand/collapse (for arrow click - same as folder click now)
  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent event bubbling
    if (hasChildren) {
      onToggleFolder(item.id, level) // Pass level parameter
    }
    // Also select the folder when arrow is clicked
    onSelectFolder(item)
  }

  return (
    <div>
      <div
        className={`d-flex align-items-center py-3 px-4 cursor-pointer rounded ${
          isSelected ? 'bg-light-primary' : ''
        } hover-bg-light-primary`}
        style={{marginLeft: `${level * 20}px`}}
        onClick={handleFolderClick}
      >
        {/* Expand/Collapse Icon - Separate click handler */}
        {hasChildren ? (
          <div
            onClick={handleToggleExpand}
            className='d-flex align-items-center justify-content-center'
            style={{
              width: '24px',
              height: '24px',
              cursor: 'pointer',
              borderRadius: '4px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <KTSVG
              path={`/media/icons/duotune/arrows/${isExpanded ? 'arr072' : 'arr071'}.svg`}
              className='svg-icon-5 text-muted'
            />
          </div>
        ) : (
          <span className='me-3' style={{width: '24px'}}></span>
        )}

        {/* Folder/Document Icon */}
        <KTSVG
          path={`/media/icons/duotune/files/${item.type === 'folder' ? 'fil012' : 'fil003'}.svg`}
          className={`svg-icon-3 me-3 ${item.type === 'folder' ? 'text-warning' : 'text-primary'}`}
        />

        {/* Title */}
        <span
          className={`fw-semibold ${
            isSelected ? 'text-primary' : 'text-gray-800'
          } fs-6 flex-grow-1`}
          style={{
            whiteSpace: 'nowrap', // keep in one line
            overflow: 'hidden', // hide overflow
            textOverflow: 'ellipsis', // show ...
            display: 'block', // needed for ellipsis
            maxWidth: '250px', // control max length before cutting
          }}
          title={item.title} // tooltip with full title
        >
          {item.title}
        </span>

        {/* Children Count Badge */}
        {hasChildren && (
          <span className='badge badge-light-primary ms-2'>{item.children?.length}</span>
        )}
      </div>

      {/* Render Children */}
      {item.type === 'folder' && isExpanded && hasChildren && (
        <div
          style={{
            maxHeight: '400px', // fixed height
            overflowY: 'auto', // vertical scroll
            width: '100%', // full width (responsive)
          }}
          className='sm:max-h-[250px] md:max-h-[400px]'
        >
          {item.children!.map((child) => (
            <FolderTreeItem
              key={child.id}
              item={child}
              level={level + 1}
              expandedFolders={expandedFolders}
              selectedFolderId={selectedFolderId}
              onToggleFolder={onToggleFolder}
              onSelectFolder={onSelectFolder}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export {FolderTreeItem}
