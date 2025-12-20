import { FC, useState, useMemo } from 'react';
import { KTSVG } from '../../../../_metronic/helpers';
import AddReimbursementModal from './AddReimbursementModal';

interface ReimbursementEntry {
  id: number;
  crewName: string;
  date: string;
  purpose: string;
  amount: number;
  supportingDocument: string;
}

const CrewReimbursement: FC = () => {
  // State for sorting and pagination
  const [sortConfig, setSortConfig] = useState<{
    key: keyof ReimbursementEntry | null;
    direction: 'asc' | 'desc';
  }>({
    key: 'date',
    direction: 'desc',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);

  const [reimbursementEntries, setReimbursementEntries] = useState<ReimbursementEntry[]>([
    {
      id: 1,
      crewName: 'John Smith',
      date: '2024-01-15',
      purpose: 'Medical Expenses',
      amount: 250.00,
      supportingDocument: 'medical_receipt_001.pdf'
    },
    {
      id: 2,
      crewName: 'Maria Garcia',
      date: '2024-01-20',
      purpose: 'Travel Allowance',
      amount: 180.50,
      supportingDocument: 'travel_receipt_002.pdf'
    }
  ]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleAddModalOpen = () => {
    setIsAddModalOpen(true);
  };

  const handleAddModalClose = () => {
    setIsAddModalOpen(false);
  };

  const handleAddReimbursementSubmit = (entry: Omit<ReimbursementEntry, 'id'>) => {
    const newEntry: ReimbursementEntry = {
      id: Date.now(), // Simple ID generation
      ...entry
    };
    setReimbursementEntries(prevEntries => [...prevEntries, newEntry]);
    handleAddModalClose();
  };

  const handleSort = (key: keyof ReimbursementEntry) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleDelete = (id: number) => {
    setReimbursementEntries(reimbursementEntries.filter((entry) => entry.id !== id));
  };

  const sortedEntries = useMemo(() => {
    let sortableItems = [...reimbursementEntries];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        const key = sortConfig.key!;
        const aVal = a[key];
        const bVal = b[key];
        
        if (aVal === undefined || bVal === undefined) {
          return 0;
        }
        
        if (aVal < bVal) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [reimbursementEntries, sortConfig]);

  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentEntries = sortedEntries.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(sortedEntries.length / rowsPerPage);

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(parseInt(e.target.value));
    setCurrentPage(1); // reset to first page
  };

  return (
    <div className='d-flex flex-column flex-column-fluid'>
      <div className='card flex-column-fluid d-flex flex-column bg-white' style={{ flex: 1 }}>
        <div className='px-5 py-3' style={{ backgroundColor: '#ffffff' }}>
          <div className='d-flex justify-content-between'>
            <h3 className='card-title fw-bold text-dark'>Crew Reimbursement</h3>
            <button className="btn btn-primary" onClick={handleAddModalOpen}>Add Reimbursement</button>
          </div>
        </div>
        <div className='border-top pt-5 px-5'>
          <div className="report-table table-responsive">
            <table className="table table-bordered align-middle" style={{ tableLayout: 'fixed' }}>
              <thead className="table-header text-start">
                <tr>
                  <th onClick={() => handleSort('crewName')} className="cursor-pointer" style={{ width: '25%', padding: '0.75rem 1rem' }}>
                    CREW NAME
                    <KTSVG
                      path={`/media/map/sort-col-${sortConfig.key === 'crewName' ? (sortConfig.direction === 'asc' ? 'up-black' : 'down-black') : 'grey'}.svg`}
                      className="svg-icon ms-2 custom-sort-icon"
                    />
                  </th>
                  <th onClick={() => handleSort('date')} className="cursor-pointer" style={{ width: '20%', padding: '0.75rem' }}>
                    DATE
                    <KTSVG
                      path={`/media/map/sort-col-${sortConfig.key === 'date' ? (sortConfig.direction === 'asc' ? 'up-black' : 'down-black') : 'grey'}.svg`}
                      className="svg-icon ms-2 custom-sort-icon"
                    />
                  </th>
                  <th onClick={() => handleSort('purpose')} className="cursor-pointer" style={{ width: '35%', padding: '0.75rem' }}>
                    PURPOSE
                    <KTSVG
                      path={`/media/map/sort-col-${sortConfig.key === 'purpose' ? (sortConfig.direction === 'asc' ? 'up-black' : 'down-black') : 'grey'}.svg`}
                      className="svg-icon ms-2 custom-sort-icon"
                    />
                  </th>
                  <th onClick={() => handleSort('amount')} className="cursor-pointer" style={{ width: '30%', padding: '0.75rem' }}>
                    AMOUNT
                    <KTSVG
                      path={`/media/map/sort-col-${sortConfig.key === 'amount' ? (sortConfig.direction === 'asc' ? 'up-black' : 'down-black') : 'grey'}.svg`}
                      className="svg-icon ms-2 custom-sort-icon"
                    />
                  </th>
                  <th style={{ width: '15%', padding: '0.75rem', textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody className="table-body text-start">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-3">
                      <div className="d-flex justify-content-center align-items-center">
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Loading reimbursement entries...
                      </div>
                    </td>
                  </tr>
                ) : currentEntries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-3">
                      No reimbursement entries found.
                    </td>
                  </tr>
                ) : (
                  currentEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td style={{ padding: "0.75rem 1rem" }}>{entry.crewName}</td>
                      <td style={{ padding: "0.75rem" }}>{new Date(entry.date).toLocaleDateString()}</td>
                      <td style={{ padding: "0.75rem" }}>{entry.purpose}</td>
                      <td style={{ padding: "0.75rem" }}>${entry.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td style={{ padding: "0.75rem", textAlign: "center" }}>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="btn btn-sm px-0"
                          title="Delete Entry"
                        >
                          <KTSVG path="/media/map/trash.svg" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="pagination-wrapper d-flex justify-content-between align-items-center py-3">
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
                  Showing <strong>{((currentPage - 1) * rowsPerPage) + 1}-{Math.min(currentPage * rowsPerPage, sortedEntries.length)}</strong> of <strong>{sortedEntries.length}</strong>
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

                      if (endPage - startPage < showPages - 1) {
                        startPage = Math.max(1, endPage - showPages + 1);
                      }

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
        </div>
      </div>

      <AddReimbursementModal
        isOpen={isAddModalOpen}
        onClose={handleAddModalClose}
        onSubmit={handleAddReimbursementSubmit}
      />
    </div>
  );
};

export default CrewReimbursement;
