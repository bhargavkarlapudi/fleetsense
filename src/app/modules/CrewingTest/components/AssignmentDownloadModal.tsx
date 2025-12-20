import React, { FC, useState, useEffect, useMemo } from 'react';
import { KTSVG } from '../../../../_metronic/helpers';

interface DownloadModalProps {
  records: any[];
  isOpen: boolean;
  onClose: () => void;
  onDownload: (selectedIds: number[]) => void;
  rankMap?: Record<number, string>;
}

const DownloadModal: FC<DownloadModalProps> = ({ records, isOpen, onClose, onDownload, rankMap = {} }) => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [selectAllActive, setSelectAllActive] = useState(false);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);

  // Sorting state
  const [sortColumn, setSortColumn] = useState<string>(''); // '', 'crewName', 'rank'
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Effect to reset state when the modal is opened
  useEffect(() => {
    if (isOpen) {
      setSelectedIds([]);
      setSelectAll(false);
      // Sorting state is preserved while the modal is open
    }
  }, [isOpen]);

  // Memoized sorting for performance. This runs only when records or sort order change.
  const sortedRecords = useMemo(() => {
    if (!records || records.length === 0) return [];

    const copy = [...records];

    if (!sortColumn) {
      return copy.sort((a, b) => b.id - a.id); // Default sort: newest first
    }

    if (sortColumn === 'crewName') {
      return copy.sort((a, b) => {
        const sa = String(a.crewName ?? '').toLowerCase();
        const sb = String(b.crewName ?? '').toLowerCase();
        return sortOrder === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
      });
    }

    if (sortColumn === 'rank') {
      return copy.sort((a, b) => {
        const ra = rankMap[a.rank] ?? '';
        const rb = rankMap[b.rank] ?? '';
        return sortOrder === 'asc' ? ra.localeCompare(rb) : rb.localeCompare(ra);
      });
    }

    return copy;
  }, [records, sortColumn, sortOrder, rankMap]);

  // This effect is the single source of truth for the 'Select All' checkbox state.
  // It runs whenever the selection (`selectedIds`) or the list of records changes.
  useEffect(() => {
    const visibleIds = sortedRecords.map((r) => r.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    setSelectAll(allVisibleSelected);
  }, [selectedIds, sortedRecords]);

  // Toggles the selection for a single record
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id]
    );
  };

  // Handles checking/unchecking the main "Select All" checkbox
  const handleHeaderCheckboxChange = (checked: boolean) => {
    const visibleIds = sortedRecords.map((r) => r.id);
    if (checked) {
      setSelectedIds(visibleIds); // Select all visible records
    } else {
      setSelectedIds([]); // Deselect all records
    }
  };

  // Handles column sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortOrder('asc');
    }
  };

  // Selects the first N records from the sorted list.
  const selectFirstN = (count: number) => {
    // 1. Get the IDs of the first `count` records.
    const firstNIds = sortedRecords.slice(0, count).map((rec) => rec.id);
    
    // 2. Set the selected IDs. This state update triggers a re-render.
    setSelectedIds(firstNIds);
    
    // 3. Close the dropdown with a slight delay to prevent event issues
    setTimeout(() => {
      setFilterDropdownOpen(false);
    }, 100);
  };

  // Triggers the download action with the selected IDs
  const handleDownload = () => {
    if (selectedIds.length === 0) {
      // In a real app, you might use a more elegant notification system
      console.warn('Please select at least one record to download.');
      return;
    }
    onDownload(selectedIds);
  };

  if (!isOpen) return null;

  return (
    <div className='modal-overlay' onClick={onClose}>
      <div
        className='modal-content'
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '600px', maxHeight: '80vh' }}
      >
        <div className='custom-modal-header d-flex justify-content-between align-items-center'>
          <h5 className='modal-title'>Select Records to Download</h5>
          <button type='button' className='btn-close' onClick={onClose} />
        </div>

        <div className='custom-modal-body' style={{ maxHeight: 'calc(80vh - 120px)', overflowY: 'auto' }}>
          <div className='mb-3 d-flex align-items-center gap-2'>
            {/* SELECT/DESELECT ALL Button */}
            <button
              className='btn btn_primary'
              onMouseDown={() => setSelectAllActive(true)}
              onMouseUp={() => setSelectAllActive(false)}
              onMouseLeave={() => setSelectAllActive(false)}
              onClick={() => handleHeaderCheckboxChange(!selectAll)}
            >
              <svg width='16' height='16' viewBox='0 0 16 16' fill='none' className='me-2' xmlns='http://www.w3.org/2000/svg'>
                <path d='M2 8L6 12L14 4' stroke={selectAllActive ? 'black' : 'white'} strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
              </svg>
              {selectAll ? 'DESELECT ALL' : 'SELECT ALL'}
            </button>

            {/* SELECT FIRST... Dropdown */}
            <div className='dropdown position-relative'>
              <button
                className='btn btn-outline-secondary dropdown-toggle'
                type='button'
                onClick={() => setFilterDropdownOpen((s) => !s)}
                style={{ height: 'auto', padding: '0.375rem 0.75rem', fontSize: '14px' }}
              >
                SELECT FIRST...
              </button>
              {filterDropdownOpen && (
                <div className='dropdown-menu show position-absolute' style={{ zIndex: 1050 }}>
                  {[10, 20, 50, 100].map((count) => (
                    <button
                      key={count}
                      className='dropdown-item'
                      type='button'
                      onMouseDown={(e) => e.preventDefault()} // Prevent blur event
                      onClick={() => selectFirstN(count)}
                      disabled={sortedRecords.length < count}
                    >
                      First {count} records
                    </button>
                  ))}
                  <div className='dropdown-divider'></div>
                  <button
                    className='dropdown-item'
                    type='button'
                    onMouseDown={(e) => e.preventDefault()} // Prevent blur event
                    onClick={() => selectFirstN(sortedRecords.length)}
                    disabled={sortedRecords.length === 0}
                  >
                    All {sortedRecords.length} records
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Records Table */}
          <div className='table-responsive'>
            <table className='table table-bordered align-middle'>
              <thead className='table-header'>
                <tr>
                  <th style={{ width: '50px' }}>
                    {/* <input
                      type='checkbox'
                      className='form-check-input'
                      checked={selectAll}
                      onChange={(e) => handleHeaderCheckboxChange(e.target.checked)}
                      aria-label='Select all visible records'
                    /> */}
                  </th>
                  <th>
                    CREW NAME
                    <button onClick={() => handleSort('crewName')} className='btn btn-link p-0 m-0 pb-1' disabled={records.length === 0} aria-label='Sort by crew name' title='Sort by crew name'>
                      <KTSVG path={`/media/map/${sortColumn === 'crewName' ? (sortOrder === 'asc' ? 'sort-col-up-black' : 'sort-col-down-black') : 'sort-col-grey'}.svg`} />
                    </button>
                  </th>
                  <th>
                    RANK
                    <button onClick={() => handleSort('rank')} className='btn btn-link p-0 m-0 pb-1' disabled={records.length === 0} aria-label='Sort by rank' title='Sort by rank'>
                      <KTSVG path={`/media/map/${sortColumn === 'rank' ? (sortOrder === 'asc' ? 'sort-col-up-black' : 'sort-col-down-black') : 'sort-col-grey'}.svg`} />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className='table-body'>
                {sortedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={3} className='text-center py-4 text-muted'>
                      No records found
                    </td>
                  </tr>
                ) : (
                  sortedRecords.map((record) => (
                    <tr key={record.id}>
                      <td>
                        <input
                          type='checkbox'
                          className='form-check-input'
                          checked={selectedIds.includes(record.id)}
                          onChange={() => toggleSelect(record.id)}
                          aria-label={`Select ${record.crewName}`}
                        />
                      </td>
                      <td>
                        <strong>{record.crewName}</strong>
                      </td>
                      <td>{rankMap[record.rank] ?? '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className='custom-modal-footer d-flex justify-content-between align-items-center'>
          <div className='text-muted'>
            {selectedIds.length} of {sortedRecords.length} records selected
          </div>
          <div>
            <button className='btn btn-secondary me-2' onClick={onClose}>
              Cancel
            </button>
            <button className='btn btn-primary' onClick={handleDownload} disabled={selectedIds.length === 0}>
              Download ({selectedIds.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DownloadModal;