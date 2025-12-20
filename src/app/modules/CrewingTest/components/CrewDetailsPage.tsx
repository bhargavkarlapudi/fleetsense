import { FC, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { KTSVG } from '../../../../_metronic/helpers'
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import * as XLSX from 'xlsx';
import AddCrewModal from './AddCrewModal'
import { getCrewList, getRanks, updateCrewStatus, getVesselList    } from '../core/_requests'
import { Crew, Rank } from '../core/_models'
import ViewCrewDetailsModal from './ViewCrewDetailsModal'
import EditCrewModal from './EditCrewModal'
import DeleteCrewModal from './DeleteCrewModal';
import { TrailRecordsModal } from './TrailRecordsModal'
import { useAuth } from '../../auth';

const CrewDetails: FC = () => {
    const [isAddCrewModalOpen, setIsAddCrewModalOpen] = useState<boolean>(false);
    const [isEditCrewModalOpen, setIsEditCrewModalOpen] = useState<boolean>(false);
    const [isDeleteCrewModalOpen, setIsDeleteCrewModalOpen] = useState<boolean>(false);
    const [isViewCrewDetailsModalOpen, setIsViewCrewDetailsModalOpen] = useState<boolean>(false);
    const [crew, setCrew] = useState<Crew[]>([]);
    const [selectedCrew, setSelectedCrew] = useState<Crew>();
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [vesselList, setVesselList] = useState<any[]>([]);  // Add state for vessels
    const [selectedVessel, setSelectedVessel] = useState<string>('all');  // To filter by selected vessel
    const [selectedActiveStatus, setSelectedActiveStatus] = useState<'all' | 'active' | 'inactive'>('all'); // Active/Inactive Filter
    // const filteredSubCompanies = crew.filter(crew =>
    //     crew.name?.toLowerCase().includes(searchTerm.toLowerCase())

    // );
    // const currentCrew = filteredSubCompanies.slice(indexOfFirstCompany, indexOfLastCompany);
    // const totalPages = Math.ceil(filteredSubCompanies.length / rowsPerPage);
    const [showCrewCreds, setShowCrewCreds] = useState(false);
    const [newCrewPassword, setNewCrewPassword] = useState<string | null>(null);
    const [crewLoginLink, setCrewLoginLink] = useState<string | null>(null);

    const [ranks, setRanks] = useState<Rank[]>([]);
    const [rankMap, setRankMap] = useState<Record<number,string>>({});

    // Sorting State
    const [sortColumn, setSortColumn] = useState<string>(''); // Default sort by name
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc'); // Default is ascending
      const [addActive, setAddActive] = useState(false)


    const { currentUser } = useAuth()
    const roleEntityId = currentUser?.roleEntityId;
    const roleId = currentUser?.role?.id;
    const vesselId = currentUser?.vessel?.id;

    const [trailCrewId, setTrailCrewId] = useState<number | null>(null)
    const [trailCrewName, setTrailCrewName] = useState<string>('');


    
    useEffect(() => {
        fetchCrew();
        // fetchVessels();
    }, [vesselId]);

    useEffect(() => {
        console.log(searchTerm)
        console.log(crew);
    }, [crew, searchTerm]);

        const fetchCrew = async () => {
        try {
            const crewList = await getCrewList();
            console.log('Crew List:', crewList);

            setCrew(crewList);
        } catch (error) {
            console.error('Failed to fetch company list:', error);
        }
    };

    // const fetchVessels = async () => {
    //         try {
    //             const vesselList = await getVesselList();
    
    //             const vesselsForCompany = vesselList.filter(vessel => {
    //                 const isActive = vessel.active;
    
    //                 if (roleId === 1) {
    //                     // Super Admin: return all active vessels
    //                     return isActive;
    //                 } else if (roleId === 5) {
    //                     // Group Admin: return active vessels assigned to their group
    //                     return isActive && vessel.companyGroupAdmin?.id === roleEntityId;
    //                 } else if (roleId === 2) {
    //                     // Company Admin: return active vessels assigned to their company
    //                     return isActive && vessel.companyAdmin?.id === roleEntityId;
    //                 }
    
    //                 return false; // default: no access
    //             });
    
    //             setVesselList(vesselsForCompany);
    //         } catch (error) {
    //             console.error('Failed to fetch vessel list:', error);
    //         }
    //     };

    useEffect(() => {
        if (crew.length > 0 && searchTerm) {
            const hasMatch = crew.some(c => c.name?.toLowerCase().includes(searchTerm.toLowerCase()));
            if (!hasMatch) {
                setSearchTerm(''); // Clear search if it causes empty view
            }
        }
    }, [crew]);

    const handleExcelDownload = () => {
        const table = document.querySelector('.report-table table') as HTMLTableElement;
        if (!table) return;

        const workbook = XLSX.utils.table_to_book(table, { sheet: "Crews" });
        XLSX.writeFile(workbook, "crews.xlsx");
    };

    // Sorting logic
     const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortOrder('asc'); // Default to ascending for a new column
        }
    };

    const sortedAndFilteredCrew = [...crew]
        .filter((crew) => {
                const matchesActiveStatus = selectedActiveStatus === 'all' || (selectedActiveStatus === 'active' && crew.active) || (selectedActiveStatus === 'inactive' && !crew.active);
            return crew.name?.toLowerCase().includes(searchTerm.toLowerCase()) && matchesActiveStatus;

        })
        .sort((a, b) => {
    // 🔀 newest first by id if no explicit sortColumn
    if (!sortColumn) {
      return b.id - a.id;
    }

    const aValue = a[sortColumn as keyof Crew] || '';
    const bValue = b[sortColumn as keyof Crew] || '';

    // Handle nested props and rank…
    if (sortColumn === 'rank') {
      return sortOrder === 'asc'
        ? a.rankId - b.rankId
        : b.rankId - a.rankId;
    }

    // fallback string compare
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

    // Filter crew by vessel
    // const filteredCrew = crew.filter((crew) => {
    //     const matchesVessel =
    //         selectedVessel === 'all' ||
    //         crew.vessel?.fleet_name === selectedVessel ||
    //         (selectedVessel === 'onLeave' && !crew.vessel);
    //     return crew.name?.toLowerCase().includes(searchTerm.toLowerCase()) && matchesVessel;
    // });

    // Paginate filtered crew
    const indexOfLastCrew = currentPage * rowsPerPage;
    const indexOfFirstCrew = indexOfLastCrew - rowsPerPage;
    const currentCrew = sortedAndFilteredCrew.slice(indexOfFirstCrew, indexOfLastCrew);
    const totalPages = Math.ceil(sortedAndFilteredCrew.length / rowsPerPage);

        useEffect(() => {
        console.log(sortedAndFilteredCrew );
        if (currentPage > totalPages) {
            setCurrentPage(1);
        }
    }, [sortedAndFilteredCrew , rowsPerPage]);




    // 1️⃣ fetch ranks once
  useEffect(() => {
    getRanks()
      .then(rs => {
        setRanks(rs);
        // build lookup: { [id]: rankName }
        const m: Record<number,string> = {};
        rs.forEach(r => m[r.id] = r.rank);
        setRankMap(m);
      })
      .catch(err => console.error('Failed to load ranks', err));
  }, []);

  // 2️⃣ fetch crew as before
  useEffect(() => { fetchCrew() }, []);

  const handleToggleActiveStatus = (crewId: number, isActive: boolean) => {
    const crewToUpdate = crew.find((c) => c.id === crewId); // Find the specific crew

    if (!crewToUpdate) {
        console.error('Crew not found');
        return;
    }

    if (isActive) {
        setSelectedCrew(crewToUpdate); // Set the selected crew
        setIsDeleteCrewModalOpen(true); // Show confirmation modal for deactivating
    } else {
        // Directly update status to active if inactive
        updateCrewStatus(crewId, true).then(() => {
            fetchCrew();
            toast.success('Crew marked as active');
        }).catch((err) => {
            console.error('Failed to update crew status:', err);
            toast.error('Failed to update crew status');
        });
    }
};

// detect if any filter is non-default
const isAnyFilterActive =
  searchTerm.trim() !== '' ||
  selectedActiveStatus !== 'all';

// clear them all
const clearFilters = () => {
  setSearchTerm('');
  setSelectedActiveStatus('all');
  setCurrentPage(1);
};


    return (
        <div
            className='app-main flex-column flex-row-fluid'
            id='kt_app_main'
            style={{ height: '100vh' }}
        >
            <div className='d-flex flex-column flex-column-fluid' >
                <div
                    id='kt_app_content'
                    className='app-content flex-column-fluid d-flex flex-column '
                    style={{ flex: 1 }}
                >
                    <div className='card flex-column-fluid d-flex flex-column' style={{ flex: 1, }}>
                        {/* Header */}
                        <div className='d-flex gap-3 pe-5 ps-5'>
                            <div className='py-3 ms-3' style={{ flex: 5 }}>
                                <h3 className='card-title fw-bold text-dark mb-5'>Crew Details</h3>
                                <div className='d-flex justify-content-between mb-5'>
                                    <div className='d-flex align-items-center gap-2'>
                                        <input
                                            type="text"
                                            className="form-control cp_search_input"
                                            placeholder="Crew Name"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                        {/* <select
                                            className="form-select"
                                            value={selectedVessel}
                                            onChange={(e) => setSelectedVessel(e.target.value)}
                                        >
                                            <option value="all">All Vessels</option>
                                            <option value="onLeave" className='badge-light-warning'>ON LEAVE</option>
                                            {vesselList.map((vessel, index) => (
                                                <option key={index} value={vessel.fleet_name}>
                                                    {vessel.fleet_name}
                                                </option>
                                            ))}
                                        </select> */}
                                        {/* <select
                                            className="form-select"
                                            value={selectedActiveStatus}
                                            onChange={(e) => setSelectedActiveStatus(e.target.value as 'all' | 'active' | 'inactive')}
                                        >
                                            <option value="all">All Status</option>
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select> */}
                                        {/* ← Clear Filters */}
                                        {/* <button
                                            className="btn btn-outline-secondary"
                                            disabled={!isAnyFilterActive}
                                            onClick={clearFilters}
                                        >
                                            Clear&nbsp;Filters
                                        </button> */}
                                    </div>
                                    <div className='d-flex align-items-center gap-4'>
                                        
                                        <button className="btn p-0 m-0" onClick={handleExcelDownload}>
                                            <KTSVG path='/media/icons/duotune/general/download.svg' className='svg-icon-2x' />
                                        </button>
                                        {/* <button
      className='btn btn_primary'
      onMouseDown={() => setAddActive(true)}
      onMouseUp={() => setAddActive(false)}
      onMouseLeave={() => setAddActive(false)}
      onClick={() => setIsAddCrewModalOpen(true)}
    > 
      <KTSVG
        path={`/media/map/${addActive ? 'zoom-in-black' : 'zoom-in'}.svg`}
        className='svg-icon-2'
      />
      Add Crew
    </button> */}
                                    </div>
                                </div>
                                {/* Summary Cards */}
                                <div className='py-3'>
                                    {/* Reports Table */}
                                    <div className="report-table table-responsive" style={{ maxHeight: '50rem', overflowY: 'auto' }}>
                                        <table className="table table-bordered align-middle">
                                            <thead className="table-header py-5">
                                                <tr>
                                                    <th>
                                                        CREW NAME
                                                        <button
                                                            onClick={() => handleSort('name')}
                                                            className="btn btn-link p-0 m-0 pb-1"
                                                            disabled={crew.length === 0}
                                                        >
                                                            <KTSVG path={`/media/map/sort-col-${sortColumn === 'name' ? (sortOrder === 'asc' ? 'up-black' : 'down-black') : 'grey'}.svg`} />
                                                        </button>
                                                    </th>
                                                    <th>
                                                        VESSEL
                                                        <button
                                                            onClick={() => handleSort('vessel')}
                                                            className="btn btn-link p-0 m-0 pb-1"
                                                            disabled={crew.length === 0}
                                                        >
                                                            <KTSVG path={`/media/map/sort-col-${sortColumn === 'vessel' ? (sortOrder === 'asc' ? 'up-black' : 'down-black') : 'grey'}.svg`} />
                                                        </button>
                                                    </th>
                                                    <th>
                                                        RANK
                                                        <button
                                                            onClick={() => handleSort('rank')}
                                                            className="btn btn-link p-0 m-0 pb-1"
                                                            disabled={crew.length === 0}
                                                        >
                                                            <KTSVG path={`/media/map/sort-col-${sortColumn === 'rank' ? (sortOrder === 'asc' ? 'up-black' : 'down-black') : 'grey'}.svg`} />
                                                        </button>
                                                    </th>
                                                    <th>
                                                        NATIONALITY
                                                        <button
                                                            onClick={() => handleSort('nationality')}
                                                            className="btn btn-link p-0 m-0 pb-1"
                                                            disabled={crew.length === 0}
                                                        >
                                                            <KTSVG path={`/media/map/sort-col-${sortColumn === 'nationality' ? (sortOrder === 'asc' ? 'up-black' : 'down-black') : 'grey'}.svg`} />
                                                        </button>
                                                    </th>
                                                    <th>ACTIONS</th>
                                                </tr>
                                            </thead>
                                            <tbody className="table-body">
                                                {currentCrew
                                                    .length === 0 ? (
                                                    <tr>
                                                        <td colSpan={8} className="text-center py-4 text-muted">
                                                            No crew found
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    currentCrew
                                                        .map((crew, idx) => (
                                                            <tr key={idx}>
                                                                <td
                                                                    className="clickable"
                                                                    onClick={() => {
                                                                        setTrailCrewId(crew.id);
                                                                        setTrailCrewName(crew.name);
                                                                    }}
                                                                    style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                                                    >
                                                                    {crew.name}
                                                                    </td>
                                                                <td>{crew.vessel?.fleet_name ||<span className='badge badge-light-warning'>ON LEAVE</span>}</td>
                                                                <td>{rankMap[crew.rankId] ?? '—'}</td>
                                                                <td>{crew.nationality}</td>
                                                                <td>
                                                                    {/* <button
                                                                        className="btn btn-sm px-0"
                                                                        onClick={() => { 
                                                                            setIsEditCrewModalOpen(true);
                                                                            setSelectedCrew(crew);
                                                                        }}
                                                                    >
                                                                        <KTSVG path="/media/map/edit-active.svg" className="" />
                                                                    </button> */}
                                                                    <button
                                                                        className="btn btn-sm px-0"
                                                                        onClick={() => {
                                                                            setIsViewCrewDetailsModalOpen(true);
                                                                            setSelectedCrew(crew);
                                                                        }}
                                                                    >
                                                                        <KTSVG path="/media/map/ph_eye.svg" className="svg-icon-2" />
                                                                    </button>
                                                                   {/* <button
                                                                    className="btn btn-sm px-0"
                                                                    // for now this is just an icon; you can wire up an onClick to flip it later
                                                                    onClick={() => handleToggleActiveStatus(crew.id, crew.active)}>
                                                                    <KTSVG
                                                                        path={
                                                                        crew.active
                                                                            ? '/media/map/toggle-on-green.svg'
                                                                            : '/media/map/toggle-off-grey.svg'
                                                                        }
                                                                        className="svg-icon-2"
                                                                    />
                                                                    </button> */}
                                                                     {/* <button
                                                                        className='btn btn-sm px-0'
                                                                        onClick={() => {
                                                                            setSelectedCrew(crew);
                                                                            setIsDeleteCrewModalOpen(true)
                                                                        }}
                                                                    >
                                                                        <KTSVG path='/media/map/red-cross-icon.svg' />
                                                                    </button> */}

                                                                </td>
                                                            </tr>
                                                        ))
                                                )}
                                            </tbody>
                                        </table>
                                        {/* Pagination */}
                                        <div className="pagination-wrapper d-flex justify-content-between align-items-center">
                                            <div>
                                                Rows per page
                                                <select
                                                    className="form-select d-inline-block w-auto ms-2"
                                                    style={{ borderRadius: "20px" }}
                                                    value={rowsPerPage}
                                                    onChange={(e) => {
                                                        setRowsPerPage(parseInt(e.target.value));
                                                        setCurrentPage(1); // Reset to page 1
                                                    }}
                                                >
                                                    <option value={10}>10</option>
                                                    <option value={20}>20</option>
                                                    <option value={50}>50</option>
                                                </select>

                                            </div>

                                            <nav>
                                                <ul className="pagination">
                                                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                                        <button className="page-link" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}>‹</button>
                                                    </li>
                                                    {Array.from({ length: totalPages }, (_, i) => (
                                                        <li key={i} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                                                            <button className="page-link" onClick={() => setCurrentPage(i + 1)}>{i + 1}</button>
                                                        </li>
                                                    ))}
                                                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                                        <button className="page-link" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}>›</button>
                                                    </li>
                                                </ul>
                                            </nav>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
                {isAddCrewModalOpen && (
                    <AddCrewModal
                        isOpen={isAddCrewModalOpen}
                        onClose={() => { setIsAddCrewModalOpen(false) }}
                        onCrewAdded={({ password, link, created }) => {
    setCrew((prev) => (prev.some((c) => c.id === created.id) ? prev : [created, ...prev]));

                            setCrewLoginLink(link);
                            setNewCrewPassword(password);
                            setShowCrewCreds(true);
                            fetchCrew();             // refresh your list
                        }} />
                )}
                {isDeleteCrewModalOpen && (
                    <DeleteCrewModal
                        isOpen={isDeleteCrewModalOpen}
                        onClose={() => { setIsDeleteCrewModalOpen(false) }}
                        onCrewDeleted={fetchCrew}
                        crewData={selectedCrew}
                    />
                )}
                {isEditCrewModalOpen && selectedCrew && (
                    <EditCrewModal
    isOpen={isEditCrewModalOpen}
    onClose={() => setIsEditCrewModalOpen(false)}
    crewId={selectedCrew.id}                 // <== PASS crewId here
    onUpdated={fetchCrew}                    // <== refresh list after update
  />
                )}
                {isViewCrewDetailsModalOpen && selectedCrew && (
                    <ViewCrewDetailsModal
                        isOpen={isViewCrewDetailsModalOpen}
                        onClose={() => { setIsViewCrewDetailsModalOpen(false) }}
                        crewId={selectedCrew.id}
                    />
                )}
                {trailCrewId !== null && (
  <TrailRecordsModal
    crewId={trailCrewId}
    crewName={trailCrewName}         
    onClose={() => setTrailCrewId(null)}
  />
)}

                {showCrewCreds && newCrewPassword && crewLoginLink && (
                    <div
                        className="modal fade show d-block"
                        tabIndex={-1}
                        style={{ background: 'rgba(0,0,0,0.5)' }}
                        onClick={() => setShowCrewCreds(false)}
                    >
                        <div
                            className="modal-dialog modal-dialog-centered"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Crew Created!</h5>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={() => setShowCrewCreds(false)}
                                    />
                                </div>
                                <div className="modal-body">
                                    <p><strong>Generated Password:</strong> {newCrewPassword}</p>
                                    <p className="text-danger">Please copy this password now. It will not be shown again.</p>

                                    <button
                                        className="btn btn-light mb-3"
                                        onClick={() => {
                                            navigator.clipboard.writeText(newCrewPassword);
                                            toast.success("Password copied to clipboard");
                                        }}
                                    >
                                        Copy Password to Clipboard
                                    </button>

                                    {/* <hr />

                                    <p><strong>Login Link:</strong></p>
                                    <a
                                        href={crewLoginLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary d-block mb-2"
                                    >
                                        {crewLoginLink}
                                    </a>

                                    <button
                                        className="btn btn-light"
                                        onClick={() => {
                                            navigator.clipboard.writeText(crewLoginLink);
                                            toast.success("Login link copied to clipboard");
                                        }}
                                    >
                                        Copy Login Link to Clipboard
                                    </button> */}
                                </div>

                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowCrewCreds(false)}>
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <ToastContainer
                    position="top-center"
                    autoClose={3000}
                    hideProgressBar={false}
                    newestOnTop={false}
                    closeOnClick
                    rtl={false}
                    pauseOnFocusLoss
                    draggable
                    pauseOnHover
                    style={{ top: "5rem" }}
                />
            </div>
        </div>

    )
}

export { CrewDetails }
