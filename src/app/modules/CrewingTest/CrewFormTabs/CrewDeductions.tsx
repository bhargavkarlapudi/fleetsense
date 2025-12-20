import { FC, useState, useMemo, useEffect } from 'react'
import { KTSVG } from '../../../../_metronic/helpers'
import AddDeductionModal from './AddDeductionModal'
import { getCrewList, getRanks } from '../core/_requests';
import { Crew, Rank } from '../core/_models';

interface CrewMember {
  id: number;
  name: string;
  rank: string;
}

const CrewDeductions: FC = () => {
  // Define type for Crew Deduction
  interface CrewDeductionType {
    id: number;
    name: string;
    type: string;
    amount: number;
    remarks: string;
  }

  // State for sorting and pagination
  const [sortConfig, setSortConfig] = useState({
    key: 'name',
    direction: 'asc',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);

  useEffect(() => {
    const fetchCrewData = async () => {
      try {
        const crewData = await getCrewList();
        const ranksData = await getRanks();
        const ranksMap = new Map(ranksData.map(rank => [rank.id, rank.rank]));

        const enrichedCrew = crewData.map(crew => ({
          ...crew,
          rank: ranksMap.get(crew.rankId) || 'Unknown Rank',
        }));

        setCrewMembers(enrichedCrew);
      } catch (error) {
        console.error("Error fetching crew members:", error);
      }
    };

    fetchCrewData();
  }, []);

  const handleAddModalOpen = () => {
    setIsAddModalOpen(true);
  };

  const handleAddModalClose = () => {
    setIsAddModalOpen(false);
  };

  const handleAddDeductionSubmit = (deductionEntry: Omit<CrewDeductionType, 'id'>) => {
    const newEntry: CrewDeductionType = {
      id: Date.now(), // Simple ID generation
      ...deductionEntry
    };
    setCrewDeductions(prevDeductions => [...prevDeductions, newEntry]);
    handleAddModalClose();
  };

  // Placeholder crew deductions
  const [crewDeductions, setCrewDeductions] = useState<CrewDeductionType[]>([
    { id: 1, name: 'John Doe', type: 'Cash Advance', amount: 5000, remarks: 'Emergency cash advance for medical expenses' },
    { id: 2, name: 'Jane Smith', type: 'Internet Card', amount: 150, remarks: 'Monthly internet card deduction' },
    { id: 3, name: 'Mike Johnson', type: 'Others', amount: 200, remarks: 'Uniform replacement cost' },
  ]);

  const handleSort = (key: keyof CrewDeductionType) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedDeductions = useMemo(() => {
    let sortableItems = [...crewDeductions];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        const aVal = a[sortConfig.key as keyof CrewDeductionType];
        const bVal = b[sortConfig.key as keyof CrewDeductionType];
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [crewDeductions, sortConfig]);

  const indexOfLastDeduction = currentPage * rowsPerPage;
  const indexOfFirstDeduction = indexOfLastDeduction - rowsPerPage;
  const currentDeductions = sortedDeductions.slice(indexOfFirstDeduction, indexOfLastDeduction);
  const totalPages = Math.ceil(sortedDeductions.length / rowsPerPage);

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };
  
  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(parseInt(e.target.value));
    setCurrentPage(1); // Reset to first page
  };

  return (
    <div className='d-flex flex-column flex-column-fluid'>
      <div className='card flex-column-fluid d-flex flex-column bg-white' style={{ flex: 1 }}>
        <div className='px-5 py-3' style={{ backgroundColor: '#ffffff' }}>
          <div className='d-flex justify-content-between'>
            <h3 className='card-title fw-bold text-dark '>Crew Deductions</h3>
            <button className="btn btn-primary" onClick={handleAddModalOpen}>Add Deduction</button>
          </div>
        </div>
        <div className='border-top pt-5 px-5'>
          <div className="report-table table-responsive">
            <table className="table table-bordered align-middle" style={{ tableLayout: 'fixed' }}>
              <thead className="table-header text-start">
                <tr>
                  <th onClick={() => handleSort('name')} className="cursor-pointer" style={{ width: '25%', paddingLeft: "1rem" }}>
                    NAME
                    <KTSVG
                      path={`/media/map/sort-col-${sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? 'up-black' : 'down-black') : 'grey'}.svg`}
                      className="svg-icon ms-2 custom-sort-icon"
                    />
                  </th>
                  <th onClick={() => handleSort('type')} className="cursor-pointer" style={{ width: '20%' }}>
                    TYPE
                    <KTSVG
                      path={`/media/map/sort-col-${sortConfig.key === 'type' ? (sortConfig.direction === 'asc' ? 'up-black' : 'down-black') : 'grey'}.svg`}
                      className="svg-icon ms-2 custom-sort-icon"
                    />
                  </th>
                  <th onClick={() => handleSort('amount')} className="cursor-pointer" style={{ width: '20%' }}>
                    AMOUNT DEDUCTED
                    <KTSVG
                      path={`/media/map/sort-col-${sortConfig.key === 'amount' ? (sortConfig.direction === 'asc' ? 'up-black' : 'down-black') : 'grey'}.svg`}
                      className="svg-icon ms-2 custom-sort-icon"
                    />
                  </th>
                  <th onClick={() => handleSort('remarks')} className="cursor-pointer" style={{ width: '35%' }}>
                    REMARKS
                    <KTSVG
                      path={`/media/map/sort-col-${sortConfig.key === 'remarks' ? (sortConfig.direction === 'asc' ? 'up-black' : 'down-black') : 'grey'}.svg`}
                      className="svg-icon ms-2 custom-sort-icon"
                    />
                  </th>
                </tr>
              </thead>
              <tbody className="table-body text-start">
                {currentDeductions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-muted py-3">
                      No deductions found.
                    </td>
                  </tr>
                ) : (
                  currentDeductions.map(deduction => (
                    <tr key={deduction.id}>
                      <td style={{ paddingLeft: "1rem" }}>{deduction.name}</td>
                      <td>{deduction.type}</td>
                      <td>${deduction.amount.toLocaleString()}</td>
                      <td>{deduction.remarks}</td>
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
                  Showing <strong>{((currentPage - 1) * rowsPerPage) + 1}-{Math.min(currentPage * rowsPerPage, sortedDeductions.length)}</strong> of <strong>{sortedDeductions.length}</strong>
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
      
      <AddDeductionModal
        isOpen={isAddModalOpen}
        onClose={handleAddModalClose}
        onSubmit={handleAddDeductionSubmit}
        crewMembers={crewMembers.map(crew => ({ id: crew.id, name: crew.name, rank: crew.rank }))}
      />
    </div>
  )
}

export default CrewDeductions
