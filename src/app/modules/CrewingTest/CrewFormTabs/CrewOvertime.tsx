import { FC, useState, useMemo, useEffect } from 'react';
import { KTSVG } from '../../../../_metronic/helpers';
import ViewOvertimeModal from './ViewOvertimeModal';
import AddOvertimeModal from './AddOvertimeModal';
import { useAuth } from '../../auth';

import { getCrewList, getRanks } from '../core/_requests';
import { Crew, Rank } from '../core/_models';

interface OvertimeEntry {
  id: number;
  date: string;
  extraHours: number;
  remarks: string;
}

interface CrewMember {
  id: number;
  name: string;
  rank: string;
  email?: string;
  active?: boolean;
  overtimeEntries?: OvertimeEntry[];
}

const CrewOvertime: FC = () => {
  const { currentUser } = useAuth();
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);

  const [sortConfig, setSortConfig] = useState<{
    key: keyof CrewMember | null;
    direction: 'asc' | 'desc';
  }>({
    key: 'name',
    direction: 'asc',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<CrewMember | null>(null);
  const [loading, setLoading] = useState(false);
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

        const enrichedCrew = crewData.map((crew) => ({
          ...crew,
          rank: ranksMap.get(crew.rankId) || 'Unknown Rank',
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

  const handleSort = (key: keyof CrewMember) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleDelete = (id: number) => {
    setCrewMembers(crewMembers.filter((member) => member.id !== id));
  };

  const handleView = (member: CrewMember) => {
    setSelectedMember(member);
    setIsViewModalOpen(true);
  };

  const handleAddOvertime = (member: CrewMember) => {
    setSelectedMember(member);
    setIsAddModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedMember(null);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setSelectedMember(null);
  };

  const handleAddOvertimeSubmit = (overtimeEntry: Omit<OvertimeEntry, 'id'>, memberId?: number) => {
    // If memberId is provided (from dropdown), use it; otherwise use selectedMember
    const targetMemberId = memberId || selectedMember?.id;
    if (!targetMemberId) return;
    
    const newEntry: OvertimeEntry = {
      ...overtimeEntry,
      id: Date.now(),
    };

    setCrewMembers(prevMembers => 
      prevMembers.map(member => 
        member.id === targetMemberId 
          ? {
              ...member,
              overtimeEntries: [...(member.overtimeEntries || []), newEntry]
            }
          : member
      )
    );
  };

  const handleOvertimeSubmit = (memberId: number, overtimeEntry: Omit<OvertimeEntry, 'id'>) => {
    const newEntry: OvertimeEntry = {
      ...overtimeEntry,
      id: Date.now(), // Simple ID generation
    };

    setCrewMembers(prevMembers => 
      prevMembers.map(member => 
        member.id === memberId 
          ? {
              ...member,
              overtimeEntries: [...(member.overtimeEntries || []), newEntry]
            }
          : member
      )
    );
  };

  const sortedMembers = useMemo(() => {
    let sortableItems = [...crewMembers];
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
  }, [crewMembers, sortConfig]);

  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentMembers = sortedMembers.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(sortedMembers.length / rowsPerPage);

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
            <h3 className='card-title fw-bold text-dark '>Crew Overtime</h3>
            <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>Add Overtime</button>
          </div>
        </div>
        <div className='border-top pt-5 px-5'>
          <div className="report-table table-responsive">
            <table className="table table-bordered align-middle" style={{ tableLayout: 'fixed' }}>
              <thead className="table-header text-start">
                <tr>
                  <th onClick={() => handleSort('name')} className="cursor-pointer" style={{ width: '33.33%', paddingLeft: "1rem" }}>
                    NAME
                    <KTSVG
                      path={`/media/map/sort-col-${sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? 'up-black' : 'down-black') : 'grey'}.svg`}
                      className="svg-icon ms-2 custom-sort-icon"
                    />
                  </th>
                  <th onClick={() => handleSort('rank')} className="cursor-pointer" style={{ width: '33.33%' }}>
                    RANK
                    <KTSVG
                      path={`/media/map/sort-col-${sortConfig.key === 'rank' ? (sortConfig.direction === 'asc' ? 'up-black' : 'down-black') : 'grey'}.svg`}
                      className="svg-icon ms-2 custom-sort-icon"
                    />
                  </th>
                  <th style={{ width: '33.34%' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody className="table-body text-start">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="text-center text-muted py-3">
                      <div className="d-flex justify-content-center align-items-center">
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Loading crew members...
                      </div>
                    </td>
                  </tr>
                ) : currentMembers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center text-muted py-3">
                      No crew members found.
                    </td>
                  </tr>
                ) : (
                  currentMembers.map((member) => (
                    <tr key={member.id}>
                      <td style={{ paddingLeft: "1rem" }}>{member.name}</td>
                      <td>{member.rank}</td>
                      <td>
                        <button
                          className="btn btn-sm px-0"
                          onClick={() => handleView(member)}
                          title="View Overtime"
                        >
                          <KTSVG path="/media/map/ph_eye.svg" />
                        </button>
                        <button
                          onClick={() => handleDelete(member.id)}
                          className="btn btn-sm px-0"
                          title="Delete Member"
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
                  Showing <strong>{((currentPage - 1) * rowsPerPage) + 1}-{Math.min(currentPage * rowsPerPage, sortedMembers.length)}</strong> of <strong>{sortedMembers.length}</strong>
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
      
      {/* View Overtime Modal */}
      <ViewOvertimeModal
        isOpen={isViewModalOpen}
        onClose={handleCloseViewModal}
        member={selectedMember}
      />
      
      {/* Add Overtime Modal */}
      <AddOvertimeModal
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        onSubmit={handleAddOvertimeSubmit}
        memberName={selectedMember?.name || ''}
        memberRank={selectedMember?.rank || ''}
        crewMembers={crewMembers.map(member => ({ id: member.id, name: member.name, rank: member.rank }))}
      />
    </div>
  );
};

export default CrewOvertime;
