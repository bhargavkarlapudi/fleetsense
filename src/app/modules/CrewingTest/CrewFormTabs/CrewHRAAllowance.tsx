import { FC, useState, useMemo, useEffect } from 'react'
import { KTSVG } from '../../../../_metronic/helpers'
import AddHRAAllowanceModal from './AddHRAAllowanceModal'
import { getCrewList, getRanks } from '../core/_requests'
import { Crew, Rank } from '../core/_models'

const CrewHRAAllowance: FC = () => {
// Define type for HRA Allowance
  interface HRAAllowanceType {
    id: number;
    crewName: string;
    entryDate: string;
    exitDate: string;
    allowance: number;
    daysInHRA: number;
    dailyBasicWage: number;
  }

  // Define type for Crew with basic wage
  interface CrewWithWage {
    id: number;
    name: string;
    rank: string;
    dailyBasicWage: number;
  }

  // State for sorting and pagination
  const [sortConfig, setSortConfig] = useState<{
    key: keyof HRAAllowanceType | null;
    direction: 'asc' | 'desc';
  }>({
    key: 'crewName',
    direction: 'asc',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [crewMembers, setCrewMembers] = useState<CrewWithWage[]>([]);
  const [ranks, setRanks] = useState<Rank[]>([]);

  useEffect(() => {
    const fetchCrewAndRanks = async () => {
      setLoading(true);
      try {
        const [crewData, ranksData] = await Promise.all([
          getCrewList(),
          getRanks(),
        ]);

        const ranksMap = new Map(ranksData.map((rank) => [rank.id, rank.rank]));

        // Mock daily basic wage data - replace with actual API call
        const mockBasicWages: { [key: number]: number } = {
          1: 85.50,   // Captain
          2: 72.30,   // Chief Officer
          3: 68.75,   // Second Officer
          4: 65.20,   // Third Officer
          5: 58.90,   // Chief Engineer
          6: 52.40,   // Second Engineer
          7: 48.75,   // Third Engineer
          8: 45.60,   // Fourth Engineer
          9: 42.30,   // Bosun
          10: 38.20,  // AB Seaman
        };

        const enrichedCrew = crewData.map((crew) => ({
          id: crew.id,
          name: crew.name,
          rank: ranksMap.get(crew.rankId) || 'Unknown Rank',
          dailyBasicWage: mockBasicWages[crew.id] || 40.00, // Default wage if not found
        }));

        setCrewMembers(enrichedCrew);
        setRanks(ranksData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCrewAndRanks();
  }, []);

  const handleAddModalOpen = () => {
    setIsAddModalOpen(true);
  };

  const handleAddModalClose = () => {
    setIsAddModalOpen(false);
  };

  const handleAddHRAAllowanceSubmit = (allowanceEntry: Omit<HRAAllowanceType, 'id'>) => {
    const newEntry: HRAAllowanceType = {
      id: Date.now(), // Simple ID generation
      ...allowanceEntry
    };
    setHRAAllowances(prevAllowances => [...prevAllowances, newEntry]);
    handleAddModalClose();
  };

  // Calculate days between two dates
  const calculateDays = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Calculate HRA allowance using formula: 1 Day Basic Wage * (5 or Days in HRA — whichever is higher)
  const calculateHRAAllowance = (dailyWage: number, days: number): number => {
    const daysToUse = Math.max(5, days); // Use 5 or actual days, whichever is higher
    return dailyWage * daysToUse;
  };

  // Placeholder HRA allowances with calculated values
  const [hraAllowances, setHRAAllowances] = useState<HRAAllowanceType[]>([
    {
      id: 1,
      crewName: 'John Doe',
      entryDate: '2024-01-15',
      exitDate: '2024-06-15',
      daysInHRA: 152,
      dailyBasicWage: 85.50,
      allowance: 85.50 * Math.max(5, 152) // 13,356.00
    },
    {
      id: 2,
      crewName: 'Jane Smith',
      entryDate: '2024-02-01',
      exitDate: '2024-07-01',
      daysInHRA: 150,
      dailyBasicWage: 72.30,
      allowance: 72.30 * Math.max(5, 150) // 10,845.00
    },
    {
      id: 3,
      crewName: 'Mike Johnson',
      entryDate: '2024-03-10',
      exitDate: '2024-08-10',
      daysInHRA: 153,
      dailyBasicWage: 68.75,
      allowance: 68.75 * Math.max(5, 153) // 10,518.75
    },
    // Add more if needed
  ]);

  const handleSort = (key: keyof HRAAllowanceType) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleDelete = (id: number) => {
    setHRAAllowances(hraAllowances.filter((allowance) => allowance.id !== id));
  };

  const sortedAllowances = useMemo(() => {
    let sortableItems = [...hraAllowances];
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
  }, [hraAllowances, sortConfig]);

  const indexOfLastAllowance = currentPage * rowsPerPage;
  const indexOfFirstAllowance = indexOfLastAllowance - rowsPerPage;
  const currentAllowances = sortedAllowances.slice(indexOfFirstAllowance, indexOfLastAllowance);
  const totalPages = Math.ceil(sortedAllowances.length / rowsPerPage);

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
            <h3 className='card-title fw-bold text-dark'>HRA Allowance</h3>
            <button className="btn btn-primary" onClick={handleAddModalOpen}>Add HRA Allowance</button>
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
                  <th onClick={() => handleSort('entryDate')} className="cursor-pointer" style={{ width: '20%', padding: '0.75rem' }}>
                    ENTRY DATE
                    <KTSVG
                      path={`/media/map/sort-col-${sortConfig.key === 'entryDate' ? (sortConfig.direction === 'asc' ? 'up-black' : 'down-black') : 'grey'}.svg`}
                      className="svg-icon ms-2 custom-sort-icon"
                    />
                  </th>
                  <th onClick={() => handleSort('exitDate')} className="cursor-pointer" style={{ width: '20%', padding: '0.75rem' }}>
                    EXIT DATE
                    <KTSVG
                      path={`/media/map/sort-col-${sortConfig.key === 'exitDate' ? (sortConfig.direction === 'asc' ? 'up-black' : 'down-black') : 'grey'}.svg`}
                      className="svg-icon ms-2 custom-sort-icon"
                    />
                  </th>
                  <th onClick={() => handleSort('allowance')} className="cursor-pointer" style={{ width: '20%', padding: '0.75rem' }}>
                    ALLOWANCE
                    <KTSVG
                      path={`/media/map/sort-col-${sortConfig.key === 'allowance' ? (sortConfig.direction === 'asc' ? 'up-black' : 'down-black') : 'grey'}.svg`}
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
                        Loading HRA allowances...
                      </div>
                    </td>
                  </tr>
                ) : currentAllowances.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-3">
                      No HRA allowances found.
                    </td>
                  </tr>
                ) : (
                  currentAllowances.map((allowance) => (
                    <tr key={allowance.id}>
                      <td style={{ padding: "0.75rem 1rem" }}>{allowance.crewName}</td>
                      <td style={{ padding: "0.75rem" }}>{new Date(allowance.entryDate).toLocaleDateString()}</td>
                      <td style={{ padding: "0.75rem" }}>{new Date(allowance.exitDate).toLocaleDateString()}</td>
                      <td style={{ padding: "0.75rem" }}>
                        <div>${allowance.allowance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                        <small className="text-muted">
                          ${allowance.dailyBasicWage}/day × {Math.max(5, allowance.daysInHRA)} days
                        </small>
                      </td>
                      <td style={{ padding: "0.75rem", textAlign: "center" }}>
                        <button
                          onClick={() => handleDelete(allowance.id)}
                          className="btn btn-sm px-0"
                          title="Delete HRA Allowance"
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
                  Showing <strong>{((currentPage - 1) * rowsPerPage) + 1}-{Math.min(currentPage * rowsPerPage, sortedAllowances.length)}</strong> of <strong>{sortedAllowances.length}</strong>
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
      
      <AddHRAAllowanceModal
        isOpen={isAddModalOpen}
        onClose={handleAddModalClose}
        onSubmit={handleAddHRAAllowanceSubmit}
        crewMembers={crewMembers}
      />
    </div>
  )
}

export default CrewHRAAllowance
