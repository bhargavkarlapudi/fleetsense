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
  onDeleteFolder: (item: DocumentItem) => void
  onStartRename: (item: DocumentItem) => void
  onRenameChange: (value: string) => void
  onCancelRename: () => void
  onCommitRename: (item: DocumentItem) => void
  renamingId: number | null
  renamingValue: string
  renamingBusy?: boolean
}

const FolderTreeItem: FC<FolderTreeItemProps> = ({
  item,
  level,
  expandedFolders,
  selectedFolderId,
  onToggleFolder,
  onSelectFolder,
  onDeleteFolder,
  onStartRename,
  onRenameChange,
  onCancelRename,
  onCommitRename,
  renamingId,
  renamingValue,
  renamingBusy,
}) => {
  const isExpanded = expandedFolders.has(item.id)
  const isSelected = selectedFolderId === item.id
  const hasChildren = item.children && item.children.length > 0
  const isRenaming = renamingId === item.id

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
        {isRenaming ? (
          <div className='d-flex align-items-center gap-2 flex-grow-1' onClick={(e) => e.stopPropagation()}>
            <input
              className='form-control form-control-sm'
              value={renamingValue}
              onChange={(e) => onRenameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onCommitRename(item)
                }
                if (e.key === 'Escape') {
                  onCancelRename()
                }
              }}
              autoFocus
              style={{ maxWidth: '200px' }}
            />
            <button
              type='button'
              className='btn btn-sm p-0'
              style={{ backgroundColor: 'transparent', border: 'none' }}
              title='Save'
              disabled={renamingBusy}
              onClick={(e) => {
                e.stopPropagation()
                onCommitRename(item)
              }}
            >
              <KTSVG path='/media/icons/duotune/general/gen043.svg' className='svg-icon-4 text-success' />
            </button>
            <button
              type='button'
              className='btn btn-sm p-0'
              style={{ backgroundColor: 'transparent', border: 'none' }}
              title='Cancel'
              onClick={(e) => {
                e.stopPropagation()
                onCancelRename()
              }}
            >
              <KTSVG path='/media/icons/duotune/general/gen040.svg' className='svg-icon-4 text-muted' />
            </button>
          </div>
        ) : (
          <span
            className={`fw-semibold ${
              isSelected ? 'text-primary' : 'text-gray-800'
            } fs-6 flex-grow-1`}
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: 'block',
              maxWidth: '250px',
            }}
            title={item.title}
            onDoubleClick={(e) => {
              e.stopPropagation()
              onStartRename(item)
            }}
          >
            {item.title}
          </span>
        )}

        <div className='d-flex align-items-center gap-2'>
          {/* Children Count Badge */}
          {hasChildren && (
            <span className='badge badge-light-primary'>{item.children?.length}</span>
          )}
          {!isRenaming && (
            <button
              type='button'
              className='btn btn-sm p-0'
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                outline: 'none',
                boxShadow: 'none',
              }}
              title='Rename'
              onClick={(e) => {
                e.stopPropagation()
                onStartRename(item)
              }}
            >
              <KTSVG path='/media/icons/duotune/general/gen055.svg' className='svg-icon-4 text-muted' />
            </button>
          )}
          {item.type === 'folder' && (
            <button
              type='button'
              className='btn btn-sm p-0'
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                outline: 'none',
                boxShadow: 'none',
              }}
              title='Delete folder'
              onClick={(e) => {
                e.stopPropagation()
                onDeleteFolder(item)
              }}
            >
              <KTSVG path='/media/icons/duotune/general/gen027.svg' className='svg-icon-4 text-danger' />
            </button>
          )}
        </div>
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
              onDeleteFolder={onDeleteFolder}
              onStartRename={onStartRename}
              onRenameChange={onRenameChange}
              onCancelRename={onCancelRename}
              onCommitRename={onCommitRename}
              renamingId={renamingId}
              renamingValue={renamingValue}
              renamingBusy={renamingBusy}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export {FolderTreeItem}
