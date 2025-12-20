import { FC, useState, useMemo } from 'react';
import { KTSVG } from '../../../../_metronic/helpers';
import AddCrewTrainingModal from './AddCrewTrainingModal';

interface TrainingEntry {
  id: number;
  name: string;
  trainingName: string;
  vesselType: string;
  applicableRank: string;
  completionDate: string;
}

const CrewTraining: FC = () => {
  const [trainingEntries, setTrainingEntries] = useState<TrainingEntry[]>([
    {
      id: 1,
      name: 'John Doe',
      trainingName: 'Basic Safety Training',
      vesselType: 'Container Ship',
      applicableRank: 'Able Seaman',
      completionDate: '2024-01-15'
    },
    {
      id: 2,
      name: 'Jane Smith',
      trainingName: 'Advanced Fire Fighting',
      vesselType: 'Bulk Carrier',
      applicableRank: 'Second Officer',
      completionDate: '2024-02-20'
    },
    {
      id: 3,
      name: 'Mike Johnson',
      trainingName: 'Medical First Aid',
      vesselType: 'Tanker',
      applicableRank: 'Chief Officer',
      completionDate: '2024-03-10'
    }
  ]);

  const [sortConfig, setSortConfig] = useState<{
    key: keyof TrainingEntry | null;
    direction: 'asc' | 'desc';
  }>({
    key: 'name',
    direction: 'asc',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleAddModalOpen = () => {
    setIsAddModalOpen(true);
  };

  const handleAddModalClose = () => {
    setIsAddModalOpen(false);
  };

  const handleAddTrainingSubmit = (trainingEntry: Omit<TrainingEntry, 'id'>) => {
    const newEntry: TrainingEntry = {
      id: Date.now(), // Simple ID generation
      ...trainingEntry
    };
    setTrainingEntries(prevEntries => [...prevEntries, newEntry]);
    handleAddModalClose();
  };

  const handleSort = (key: keyof TrainingEntry) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedTrainings = useMemo(() => {
    let sortableItems = [...trainingEntries];
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
  }, [trainingEntries, sortConfig]);

  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentTrainings = sortedTrainings.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(sortedTrainings.length / rowsPerPage);

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
            <h3 className='card-title fw-bold text-dark '>Crew Training</h3>
            <button className="btn btn-primary" onClick={handleAddModalOpen}>Add Training</button>
          </div>
        </div>
        <div className='border-top pt-5 px-5'>
          <div className="report-table table-responsive">
            <table className="table table-bordered align-middle" style={{ tableLayout: 'fixed' }}>
              <thead className="table-header text-start">
                <tr>
                  <th onClick={() => handleSort('name')} className="cursor-pointer" style={{ width: '20%', paddingLeft: "1rem" }}>
                    NAME
                    <KTSVG
                      path={`/media/map/sort-col-${sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? 'up-black' : 'down-black') : 'grey'}.svg`}
                      className="svg-icon ms-2 custom-sort-icon"
                    />
                  </th>
                  <th onClick={() => handleSort('trainingName')} className="cursor-pointer" style={{ width: '20%' }}>
                    TRAINING NAME
                    <KTSVG
                      path={`/media/map/sort-col-${sortConfig.key === 'trainingName' ? (sortConfig.direction === 'asc' ? 'up-black' : 'down-black') : 'grey'}.svg`}
                      className="svg-icon ms-2 custom-sort-icon"
                    />
                  </th>
                  <th onClick={() => handleSort('vesselType')} className="cursor-pointer" style={{ width: '20%' }}>
                    VESSEL TYPE
                    <KTSVG
                      path={`/media/map/sort-col-${sortConfig.key === 'vesselType' ? (sortConfig.direction === 'asc' ? 'up-black' : 'down-black') : 'grey'}.svg`}
                      className="svg-icon ms-2 custom-sort-icon"
                    />
                  </th>
                  <th onClick={() => handleSort('applicableRank')} className="cursor-pointer" style={{ width: '20%' }}>
                    APPLICABLE RANK
                    <KTSVG
                      path={`/media/map/sort-col-${sortConfig.key === 'applicableRank' ? (sortConfig.direction === 'asc' ? 'up-black' : 'down-black') : 'grey'}.svg`}
                      className="svg-icon ms-2 custom-sort-icon"
                    />
                  </th>
                  <th onClick={() => handleSort('completionDate')} className="cursor-pointer" style={{ width: '20%' }}>
                    COMPLETION DATE
                    <KTSVG
                      path={`/media/map/sort-col-${sortConfig.key === 'completionDate' ? (sortConfig.direction === 'asc' ? 'up-black' : 'down-black') : 'grey'}.svg`}
                      className="svg-icon ms-2 custom-sort-icon"
                    />
                  </th>
                </tr>
              </thead>
              <tbody className="table-body text-start">
                {currentTrainings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-3">
                      No training records found.
                    </td>
                  </tr>
                ) : (
                  currentTrainings.map((training) => (
                    <tr key={training.id}>
                      <td style={{ paddingLeft: "1rem" }}>{training.name}</td>
                      <td>{training.trainingName}</td>
                      <td>{training.vesselType}</td>
                      <td>{training.applicableRank}</td>
                      <td>{new Date(training.completionDate).toLocaleDateString()}</td>
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
                  Showing <strong>{((currentPage - 1) * rowsPerPage) + 1}-{Math.min(currentPage * rowsPerPage, sortedTrainings.length)}</strong> of <strong>{sortedTrainings.length}</strong>
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
      
      <AddCrewTrainingModal
        isOpen={isAddModalOpen}
        onClose={handleAddModalClose}
        onSubmit={handleAddTrainingSubmit}
      />
    </div>
  );
};

export default CrewTraining;
