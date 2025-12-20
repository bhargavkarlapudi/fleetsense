import { FC, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { KTSVG } from '../../../../_metronic/helpers'
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import * as XLSX from 'xlsx';
import AddCrewModal from './AddCrewModal'
import { getCrewList, getRanks, updateCrewStatus, getVesselList, getRanksforList } from '../core/_requests'
import { Crew, Rank } from '../core/_models'
import ViewCrewDetailsModal from './ViewCrewDetailsModal'
import EditCrewModal from './EditCrewModal'
import DeleteCrewModal from './DeleteCrewModal';
import { TrailRecordsModal } from './TrailRecordsModal'
import { useAuth } from '../../auth';
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import html2pdf from 'html2pdf.js';

const CrewList: FC = () => {
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
    const [rankMap, setRankMap] = useState<Record<number, string>>({});

    // Sorting State
    const [sortColumn, setSortColumn] = useState<string>(''); // Default sort by name
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc'); // Default is ascending
    const [addActive, setAddActive] = useState(false)


    const { currentUser } = useAuth()
    const roleEntityId = currentUser?.roleEntityId;
    const roleId = currentUser?.role?.id;

    const [trailCrewId, setTrailCrewId] = useState<number | null>(null)
    const [trailCrewName, setTrailCrewName] = useState<string>('');
    const [showIMOExportModal, setShowIMOExportModal] = useState<boolean>(false);
    const [showVesselFilterAlert, setShowVesselFilterAlert] = useState<boolean>(false);



    useEffect(() => {
        fetchCrew();
        fetchVessels();
    }, []);

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

    const fetchVessels = async () => {
        try {
            const vesselList = await getVesselList();

            const vesselsForCompany = vesselList.filter(vessel => {
                const isActive = vessel.active;

                if (roleId === 1) {
                    // Super Admin: return all active vessels
                    return isActive;
                } else if (roleId === 5) {
                    // Group Admin: return active vessels assigned to their group
                    return isActive && vessel.companyGroupAdmin?.id === roleEntityId;
                } else if (roleId === 2) {
                    // Company Admin: return active vessels assigned to their company
                    return isActive && vessel.companyAdmin?.id === roleEntityId;
                }

                return false; // default: no access
            });

            setVesselList(vesselsForCompany);
        } catch (error) {
            console.error('Failed to fetch vessel list:', error);
        }
    };

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
const handleExportIMO = () => {
  const element = document.getElementById('imo-pdf-content');
  if (!element) return;

  // Show the element temporarily if hidden
  element.style.display = 'block';

  const opt = {
    margin: [0.3, 0.3, 0.3, 0.3], // top, left, bottom, right in inches
    filename: 'IMO_Crew_List.pdf',
    image: { type: 'jpeg', quality: 1 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: true,
    },
    jsPDF: {
      unit: 'in',
      format: 'a4',
      orientation: 'portrait',
    },
  };

  html2pdf()
    .set(opt)
    .from(element)
    .toPdf()
    .get('pdf')
    .then((pdf: any) => {
      const pageCount = pdf.internal.getNumberOfPages();
      pdf.setFontSize(10);

      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        const w = pdf.internal.pageSize.getWidth();
        const h = pdf.internal.pageSize.getHeight();
        // 0.5in up from bottom, 0.5in in from right
        pdf.text(`Page ${i} of ${pageCount}`, w - 0.5, h - 0.5, {
          align: 'right'
        });
      }
    })
    .save()
    .then(() => {

    // Hide again after export
    element.style.display = 'none';
  });
};





    const sortedAndFilteredCrew = [...crew]
        .filter((crew) => {
            const matchesVessel =
                selectedVessel === 'all' ||
                crew.vessel?.fleet_name === selectedVessel ||
                (selectedVessel === 'onLeave' && !crew.vessel);
            const matchesActiveStatus = selectedActiveStatus === 'all' || (selectedActiveStatus === 'active' && crew.active) || (selectedActiveStatus === 'inactive' && !crew.active);
            return crew.name?.toLowerCase().includes(searchTerm.toLowerCase()) && matchesVessel && matchesActiveStatus;

        })
        .sort((a, b) => {
            // 🔀 newest first by id if no explicit sortColumn
            if (!sortColumn) {
                return b.id - a.id;
            }

            const aValue = a[sortColumn as keyof Crew] || '';
            const bValue = b[sortColumn as keyof Crew] || '';

            // Handle nested props and rank…
            if (sortColumn === 'vessel') {
                const va = a.vessel?.fleet_name || '';
                const vb = b.vessel?.fleet_name || '';
                return sortOrder === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
            }
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
        console.log(sortedAndFilteredCrew);
        if (currentPage > totalPages) {
            setCurrentPage(1);
        }
    }, [sortedAndFilteredCrew, rowsPerPage]);

    const headerData = sortedAndFilteredCrew[0] || {};



    // 1️⃣ fetch ranks once
    useEffect(() => {
        getRanksforList()
            .then(rs => {
                setRanks(rs);
                // build lookup: { [id]: rankName }
                const m: Record<number, string> = {};
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
        selectedVessel !== 'all' ||
        selectedActiveStatus !== 'all';

    // clear them all
    const clearFilters = () => {
        setSearchTerm('');
        setSelectedVessel('all');
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
                    <div className='card flex-column-fluid d-flex flex-column border-top' style={{ flex: 1, background: '#ffffff' }}>
                        {/* Header */}
                        <div className='d-flex gap-3 pe-5 ps-5'>
                            <div className='py-3 ms-3' style={{ flex: 5 }}>
                                <h3 className='card-title fw-bold text-dark mb-5'>Crew Members</h3>
                                <div className='d-flex justify-content-between mb-5'>
                                    <div className='d-flex align-items-center gap-2'>
                                        <input
                                            type="text"
                                            className="form-control cp_search_input"
                                            placeholder="Crew Name"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                        <select
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
                                        </select>
                                        <select
                                            className="form-select"
                                            value={selectedActiveStatus}
                                            onChange={(e) => setSelectedActiveStatus(e.target.value as 'all' | 'active' | 'inactive')}
                                        >
                                            <option value="all">All Status</option>
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                        {/* ← Clear Filters */}
                                        <button
                                            className="btn btn-outline-secondary"
                                            disabled={!isAnyFilterActive}
                                            onClick={clearFilters}
                                        >
                                            Clear&nbsp;Filters
                                        </button>
                                    </div>
                                    <div className='d-flex align-items-center gap-4'>

                                        <div className="position-relative d-inline-block export-dropdown">
                                            <button className="btn p-0 m-0">
                                                <KTSVG path='/media/icons/duotune/general/download.svg' className='svg-icon-2x' />
                                            </button>

                                            <div className="dropdown-menu">
                                                <div className="dropdown-item" onClick={() => {
                                                    // Check if vessel is filtered to a specific vessel
                                                    if (selectedVessel === 'all' || selectedVessel === 'onLeave') {
                                                        setShowVesselFilterAlert(true);
                                                    } else {
                                                        setShowIMOExportModal(true);
                                                    }
                                                }}>Export IMO Format</div>
                                                <div className="dropdown-item">Export Company Format</div>
                                            </div>
                                        </div>
                                        <button
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
                                        </button>
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
                                                                <td>{crew.vessel?.fleet_name || <span className='badge badge-light-warning'>ON LEAVE</span>}</td>
                                                                <td>{rankMap[crew.rankId] ?? '—'}</td>
                                                                <td>{crew.nationality}</td>
                                                                <td>
                                                                    <button
                                                                        className="btn btn-sm px-0"
                                                                        onClick={() => {
                                                                            setIsEditCrewModalOpen(true);
                                                                            setSelectedCrew(crew);
                                                                        }}
                                                                    >
                                                                        <KTSVG path="/media/map/edit-active.svg" className="" />
                                                                    </button>
                                                                    <button
                                                                        className="btn btn-sm px-0"
                                                                        onClick={() => {
                                                                            setIsViewCrewDetailsModalOpen(true);
                                                                            setSelectedCrew(crew);
                                                                        }}
                                                                    >
                                                                        <KTSVG path="/media/map/ph_eye.svg" className="svg-icon-2" />
                                                                    </button>
                                                                    {!crew.vessel?.fleet_name && <button
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
                                                                    </button>}
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

                                            {/* IMO FAL Form 5 Content (Hidden, only for PDF export)
                                This div will be targeted by html2pdf.js
                            */}
                            <div
    id="imo-pdf-content"
    style={{
        display: 'none', // hidden until export
        // visibility: 'hidden',
        // position: 'absolute',
        // left: '-9999px',
        zIndex: '-99',
        width: '750px',   // A4 width in pixels at 96 DPI
        minHeight: '1123px', // A4 height
        padding: '15px',  // safe margins
        boxSizing: 'border-box',
        backgroundColor: '#fff',
    }}
>
    <style>
        {`
        @page { size: A4 portrait; margin: 0; }
        #imo-pdf-content { margin: 0; padding: 0; font-family: serif; font-size: 10pt; }
        #imo-pdf-content .imo-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9pt;
            table-layout: fixed;
        }
        #imo-pdf-content .imo-table th, #imo-pdf-content .imo-table td {
            border: 1px solid black;
            padding: 3px 5px;
            vertical-align: top;
            text-align: left;
            word-wrap: break-word;
            word-break: break-word;
            overflow-wrap: break-word;
            max-width: 0;
        }
        #imo-pdf-content .imo-table th {
            font-weight: bold;
            background-color: #f2f2f2; /* Light grey background for headers */
            text-align: center; /* Center headers */
        }
        #imo-pdf-content .text-center-val { text-align: center; }
        #imo-pdf-content .imo-form-title { text-align: center; font-size: 14pt; font-weight: bold; margin-bottom: 2px; }
        #imo-pdf-content .imo-form-subtitle { text-align: center; font-size: 10pt; margin-top: 0; margin-bottom: 10px; }
        #imo-pdf-content .signature-box { border: 1px solid black; padding: 5px; min-height: 40px; margin-top: 15px; font-size: 9pt; }
        /* Specific styles for the top header cells to match the image */
        #imo-pdf-content .imo-table .top-header-cell {
            vertical-align: top;
            padding-top: 10px; /* Add some top padding to align content */
        }
        #imo-pdf-content .imo-table .checkbox-label {
            display: flex;
            align-items: center;
            gap: 3px;
            margin-bottom: 5px;
        }
        `}
                                                </style>

                                                {/* Date and Time when report was generated */}
                                                <div style={{
                                                    fontSize: '10pt',
                                                    fontWeight: 'bold',
                                                    marginBottom: '15px',
                                                    textAlign: 'left'
                                                }}>
                                                    Report Generated: {(() => {
                                                        const now = new Date();
                                                        const day = String(now.getDate()).padStart(2, '0');
                                                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                                        const month = months[now.getMonth()];
                                                        const year = now.getFullYear();
                                                        const hours = String(now.getHours()).padStart(2, '0');
                                                        const minutes = String(now.getMinutes()).padStart(2, '0');
                                                        return `${day}/${month}/${year} ${hours}:${minutes}`;
                                                    })()}
                                                </div>

                                                {/* Main Table for the entire form structure */}

                                                <table className="imo-table">
                                                    <thead>
                                                        {/* Title Row */}
                                                        <tr>
                                                            <th colSpan={12} className="imo-form-title">CREW LIST</th>
                                                        </tr>
                                                        <tr>
                                                            <th colSpan={12} className="imo-form-subtitle">(IMO FAL Form 5)</th>
                                                        </tr>

                                                        {/* Arrival/Departure Checkboxes and Page Number Row */}
                                                        <tr>
                                                            <td colSpan={6} className="top-header-cell">
                                                                <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '15px', marginBottom: '5px' }}>
                                                                    <label className="checkbox-label">
                                                                        <input type="checkbox" className="form-checkbox" style={{ verticalAlign: 'middle' }} checked={!!headerData.portOfArrival} readOnly />
                                                                        <span>Arrival</span>
                                                                    </label>
                                                                    <label className="checkbox-label">
                                                                        <input type="checkbox" className="form-checkbox" style={{ verticalAlign: 'middle' }} checked={!!headerData.portOfDeparture} readOnly/>
                                                                        <span>Departure</span>
                                                                    </label>
                                                                </div>
                                                            </td>
                                                            {/* <td colSpan={6} className="top-header-cell" style={{ textAlign: 'right' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '5px' }}>
                                                                    <span>Page</span>
                                                                    <span style={{ border: '1px solid black', padding: '2px 8px', minWidth: '40px', textAlign: 'center' }}></span>
                                                                </div>
                                                            </td> */}
                                                        </tr>

                                                        {/* Section 1.1 - 1.4 Headers */}
                                                        <tr>
                                                            <th colSpan={3}>1.1 Name of ship</th>
                                                            <th colSpan={3}>1.2 IMO number</th>
                                                            <th colSpan={3}>1.3 Call sign</th>
                                                            <th colSpan={3}>1.4 Voyage number</th>
                                                        </tr>
                                                        {/* Section 1.1 - 1.4 Data */}
                                                        <tr>
                                                            <td colSpan={3}>{headerData.vesselName || ''}</td>
                                                            <td colSpan={3}>{headerData.imoNumber || ''}</td>
                                                            <td colSpan={3}>{headerData.callSign || ''}</td>
                                                            <td colSpan={3}>{headerData.voyageNumber || ''}</td>

                                                        </tr>

                                                        {/* Section 2 - 5 Headers */}
                                                        <tr>
                                                            <th colSpan={4}>2. Port of arrival/departure</th>
                                                            <th colSpan={3}>3. Date of arrival/departure</th>
                                                            <th colSpan={3}>4. Flag State of ship</th>
                                                            <th colSpan={2}>5. Last port of call</th>
                                                        </tr>
                                                        {/* Section 2 - 5 Data */}
                                                        <tr>
                                                            <td colSpan={4}>{headerData.portOfArrival || ''}{' / '}{headerData.portOfDeparture || ''}</td>
                                                            <td colSpan={3}>
                                                                {headerData.dateOfArrival
                                                                    ? headerData.dateOfArrival.split('T')[0]
                                                                    : ''} {' / '}
                                                                    {headerData.dateOfDeparture
                                                                    ? headerData.dateOfDeparture.split('T')[0]
                                                                    : ''}
                                                            </td>
                                                            <td colSpan={3}>{headerData.flagState || ''}</td>
                                                            <td colSpan={2}>{headerData.portOfDeparture || ''}</td>
                                                        </tr>

                                                        {/* Main Crew List Headers (6. No. to 17. Expiry date) */}
                                                        <tr>
                                                            <th style={{ width: '4%' }}>6. No.</th>
                                                            <th style={{ width: '8%' }}>7. Family name</th>
                                                            <th style={{ width: '8%' }}>8. Given names</th>
                                                            <th style={{ width: '8%' }}>9. Rank or rating</th>
                                                            <th style={{ width: '8%' }}>10. Nationality</th>
                                                            <th style={{ width: '8%' }}>11. Date of birth</th>
                                                            <th style={{ width: '8%' }}>12. Place of birth</th>
                                                            <th style={{ width: '8%' }}>13. Gender</th>
                                                            <th style={{ width: '10%' }}>14. Nature of identity document</th>
                                                            <th style={{ width: '10%' }}>15. Number of identity document</th>
                                                            <th style={{ width: '8%' }}>16. Issuing State of identity document</th>
                                                            <th style={{ width: '8%' }}>17. Expiry date of identity document</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {currentCrew.length > 0 ? (
                                                            currentCrew.map((crewItem, index) => {
                                                                const nameParts = crewItem.name ? crewItem.name.trim().split(' ') : ['', ''];
                                                                const familyName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : crewItem.name || '';
                                                                const givenNames = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : '';

                                                                return (
                                                                    <tr key={crewItem.id || index}>
                                                                        <td className="text-center-val">{index + 1}</td>
                                                                        <td>{familyName}</td>
                                                                        <td>{givenNames}</td>
                                                                        <td>{rankMap[crewItem.rankId] || ''}</td>
                                                                        <td>{crewItem.nationality || ''}</td>
                                                                        <td>{crewItem.dateOfBirth || ''}</td>
                                                                        <td>{crewItem.placeOfBirth || ''}</td>
                                                                        <td>{crewItem.gender || ''}</td>
                                                                        <td>{crewItem.identityDocType || ''}</td>
                                                                        <td>{crewItem.identityDocNumber || ''}</td>
                                                                        <td>{crewItem.identityIssuingState || ''}</td>
                                                                        <td>
                                                                            {crewItem.identityExpiryDate
                                                                                ? crewItem.identityExpiryDate.split('T')[0]
                                                                                : ''}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={12} className="text-center-val">No crew data to display for IMO form.</td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>

                                                <div className="signature-box">
                                                    <p>18. Date and signature by master, authorized agent or officer</p>
                                                    {/* Placeholder for actual signature and date input if needed */}
                                                </div>
                                            </div>
                                            {/* End of IMO FAL Form 5 Content */}
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
                        onCrewAdded={(pwd, link) => {
                            setCrewLoginLink(link);
                            setNewCrewPassword(pwd);
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
                {isEditCrewModalOpen && (
                    <EditCrewModal
                        isOpen={isEditCrewModalOpen}
                        onClose={() => { setIsEditCrewModalOpen(false) }}
                        onCrewUpdated={fetchCrew}
                        crewData={selectedCrew}
                    />
                )}
                {isViewCrewDetailsModalOpen && (
                    <ViewCrewDetailsModal
                        isOpen={isViewCrewDetailsModalOpen}
                        onClose={() => { setIsViewCrewDetailsModalOpen(false) }}
                        crewData={selectedCrew}
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

                {/* IMO Export Confirmation Modal */}
                {showIMOExportModal && (
                    <div
                        className="modal fade show d-block"
                        tabIndex={-1}
                        style={{ background: 'rgba(0,0,0,0.5)' }}
                        onClick={() => setShowIMOExportModal(false)}
                    >
                        <div
                            className="modal-dialog modal-dialog-centered modal-sm"
                            onClick={e => e.stopPropagation()}
                            style={{ maxWidth: '400px' }}
                        >
                            <div className="modal-content">
                                <div className="modal-header py-2">
                                    <h6 className="modal-title mb-0">Export IMO Format</h6>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={() => setShowIMOExportModal(false)}
                                    />
                                </div>
                                <div className="modal-body text-center py-3">
                                    <p className="mb-3" style={{ fontSize: '14px' }}>
                                        The records of {selectedVessel} ({vesselList.find(v => v.fleet_name === selectedVessel)?.imoNumber || 'N/A'}) will be exported.
                                    </p>
                                    <p className="text-muted mb-0" style={{ fontSize: '13px' }}>
                                        Total records to be exported: <strong>{sortedAndFilteredCrew.length}</strong>
                                    </p>
                                </div>
                                <div className="modal-footer justify-content-center py-2">
                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-sm me-2"
                                        onClick={() => setShowIMOExportModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-primary btn-sm"
                                        onClick={() => {
                                            setShowIMOExportModal(false);
                                            handleExportIMO();
                                        }}
                                    >
                                        Download
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Vessel Filter Alert Modal */}
                {showVesselFilterAlert && (
                    <div
                        className="modal fade show d-block"
                        tabIndex={-1}
                        style={{ background: 'rgba(0,0,0,0.5)' }}
                        onClick={() => setShowVesselFilterAlert(false)}
                    >
                        <div
                            className="modal-dialog modal-dialog-centered modal-sm"
                            onClick={e => e.stopPropagation()}
                            style={{ maxWidth: '400px' }}
                        >
                            <div className="modal-content">
                                <div className="modal-header py-2">
                                    <h6 className="modal-title mb-0">Select Vessel</h6>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={() => setShowVesselFilterAlert(false)}
                                    />
                                </div>
                                <div className="modal-body text-center py-3">
                                    <p className="mb-3" style={{ fontSize: '14px' }}>
                                        Please select a specific vessel before exporting IMO format.
                                    </p>
                                    <p className="text-muted mb-0" style={{ fontSize: '13px' }}>
                                        Currently showing: <strong>{selectedVessel === 'all' ? 'All Vessels' : 'ON LEAVE'}</strong>
                                    </p>
                                </div>
                                <div className="modal-footer justify-content-center py-2">
                                    <button
                                        type="button"
                                        className="btn btn-primary btn-sm"
                                        onClick={() => setShowVesselFilterAlert(false)}
                                    >
                                        Okay
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

export { CrewList }
