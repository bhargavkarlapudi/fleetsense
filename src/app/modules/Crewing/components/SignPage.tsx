import {FC, useEffect, useState} from 'react'
import {toast} from 'react-toastify'
import {KTSVG} from '../../../../_metronic/helpers'
import {ToastContainer} from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import * as XLSX from 'xlsx'

import SignOnModal from './SignOnModal'
import {getCrewList, getRanks, getSignOnOffRecords, SignOnOffRecord, getVesselList, getRanksforList} from '../core/_requests'
import {Crew, Rank} from '../core/_models'
import SignOffModal from './SignOffModal'
import ViewAssignmentModal from './ViewAssignmentModal'
import EditAssignmentModal from './EditAssignmentModal';
import { useAuth } from '../../auth'

// Remove every SIGNED_OFF record
const sanitizeRecords = (recs: SignOnOffRecord[]) =>
  (recs || []).filter(r => r.status !== 'SIGNED_OFF');

// Build a lowercased string of searchable fields for global search
const haystackOf = (
  rec: SignOnOffRecord,
  rankMap: Record<number, string>
): string => {
  const fields = [
    rec.crewName ?? '',
    rankMap[rec.rank] ?? '',        // rank name from id
    rec.vesselName ?? '',
    rec.portSignOn ?? '',
    rec.portSignOff ?? '',
    rec.status ?? '',
    rec.signOnDate ?? '',
    rec.signOffDate ?? '',
  ];
  return fields.join(' | ').toLowerCase();
};


/** format “YYYY-MM-DD” (or ISO) → “DD-MMM-YYYY” e.g. “12-Jul-2025” */
// allow string|null|undefined
const formatDate = (iso?: string | null) => {
  // 1) no value
  if (!iso) {
    return '—'
  }
  const d = new Date(iso)
  // 2) invalid date
  if (isNaN(d.getTime())) {
    return '—'
  }
  const dd = String(d.getDate()).padStart(2, '0')
  const mmm = d.toLocaleString('en-US', { month: 'short' })
  const yyyy = d.getFullYear()
  return `${dd}-${mmm}-${yyyy}`
}

// --- Rank sorting helpers (same as Crew Details) ---
const RANK_ORDER = [
  'MASTER','CHIEF OFFICER','SECOND OFFICER','THIRD OFFICER','DECK CADET',
  'CHIEF ENGINEER','SECOND ENGINEER','THIRD ENGINEER','FOURTH ENGINEER',
  'TRAINEE MARINE ENGINEER','ELECTRICAL OFFICER','BOSUN','PUMPMAN',
  'ABLE SEAMAN','ORDINARY SEAMAN','TR. SEAMAN','OILER','WIPER','TR WIPER',
  'FITTER','CHIEF COOK','GENERAL STEWARD',
] as const;

const RANK_REGEX: Record<string, RegExp[]> = {
  MASTER: [/(^|\s)master\b/i],
  'CHIEF OFFICER': [/chief\s*officer/i, /\bc\s*\/\s*o\b/i],
  'SECOND OFFICER': [/second\s*officer/i, /\b2\s*\/\s*o\b/i],
  'THIRD OFFICER': [/third\s*officer/i, /\b3\s*\/\s*o\b/i],
  'DECK CADET': [/deck\s*cadet/i],
  'CHIEF ENGINEER': [/chief\s*engineer/i, /\bc\s*\/\s*e\b/i],
  'SECOND ENGINEER': [/second\s*engineer/i, /\b2\s*\/\s*e\b/i],
  'THIRD ENGINEER': [/third\s*engineer/i, /\b3\s*\/\s*e\b/i],
  'FOURTH ENGINEER': [/fourth\s*engineer/i, /\b4\s*\/\s*e\b/i, /fouth\s*engineer/i],
  'TRAINEE MARINE ENGINEER': [/engine\s*cadet/i, /trainee\s*marine\s*engineer/i, /\btme\b/i],
  'ELECTRICAL OFFICER': [/electrician/i, /electrical/i, /\beto\b/i],
  BOSUN: [/\bbosun\b/i, /boatswain/i],
  PUMPMAN: [/pumpman/i],
  'ABLE SEAMAN': [/able\s*seaman/i, /\bab\b(?![a-z])/i],
  'ORDINARY SEAMAN': [/ordinary\s*seaman/i, /\bos\b(?![a-z])/i],
  'TR. SEAMAN': [/trainee.*seaman/i, /\btr\.?\s*seaman\b/i],
  OILER: [/oiler/i, /motorman/i],
  WIPER: [/wiper\b/i],
  'TR WIPER': [/trainee.*wiper/i, /\btr\.?\s*wiper\b/i],
  FITTER: [/fitter\b/i],
  'CHIEF COOK': [/chief\s*cook/i],
  'GENERAL STEWARD': [/steward/i, /messman/i],
};

const getCanonicalRank = (label?: string): string => {
  const s = (label ?? '').trim();
  for (const [canon, patterns] of Object.entries(RANK_REGEX)) {
    if (patterns.some(rx => rx.test(s))) return canon;
  }
  return 'OTHER';
};

const getRankSuffix = (label?: string): number => {
  const s = (label ?? '').trim();
  const m = s.match(/-\s*(\d+)\s*$/);
  return m ? Number(m[1]) : 0; // 0 => base
};

const rankTuple = (label?: string): [number, number, number, string] => {
  const canon = getCanonicalRank(label);
  const groupIdx = canon === 'OTHER' ? 999 : RANK_ORDER.indexOf(canon as any) + 1;
  const suffix = getRankSuffix(label);
  const baseFirstFlag = suffix === 0 ? 0 : 1;
  return [groupIdx, baseFirstFlag, suffix, (label ?? '')];
};

const compareRank = (a?: string, b?: string, dir: 'asc' | 'desc' = 'asc'): number => {
  const A = rankTuple(a);
  const B = rankTuple(b);
  const cmp = (A[0] - B[0]) || (A[1] - B[1]) || (A[2] - B[2]) || A[3].localeCompare(B[3]);
  return dir === 'asc' ? cmp : -cmp;
};


const SignPage: FC = () => {
  const [isSignOnModalOpen, setIsSignOnModalOpen] = useState<boolean>(false) // ← renamed

  const [records, setRecords] = useState<SignOnOffRecord[]>([])
    const [isViewAssignmentModalOpen, setIsViewAssignmentModalOpen] = useState(false);
    const [isEditAssignmentModalOpen, setIsEditAssignmentModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<SignOnOffRecord | null>(null);

  const [crew, setCrew] = useState<Crew[]>([])
    // Vessels for filter
  const [vesselList, setVesselList] = useState<string[]>([])            // ← new
  const [selectedVessel, setSelectedVessel] = useState<string>('all')  // ← new

  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [searchTerm, setSearchTerm] = useState('')
  const indexOfLastCompany = currentPage * rowsPerPage
  const indexOfFirstCompany = indexOfLastCompany - rowsPerPage

  const [showCrewCreds, setShowCrewCreds] = useState(false)
  const [newCrewPassword, setNewCrewPassword] = useState<string | null>(null)
  const [crewLoginLink, setCrewLoginLink] = useState<string | null>(null)
  const [ranks, setRanks] = useState<Rank[]>([])
  const [rankMap, setRankMap] = useState<Record<number, string>>({})

  const [hoveredSignOffId, setHoveredSignOffId] = useState<number | null>(null)

  const [isSignOffModalOpen, setIsSignOffModalOpen] = useState(false)
  const [signOffRecordId, setSignOffRecordId] = useState<number | null>(null)
  const [recordToSignOff, setRecordToSignOff] = useState<SignOnOffRecord | null>(null)
  const [signOnActive, setSignOnActive] = useState(false)

  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Sorting
  const [sortColumn, setSortColumn] = useState<string>('rank')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const [signOnLink, setSignOnLink] = useState<string | null>(null);
  const [showSignOnLink, setShowSignOnLink] = useState(false);

  const { currentUser } = useAuth();
  const userRankId = currentUser?.rank?.id;
    const userRankName = currentUser?.rank?.rank; // Get rank name
const userVesselId = currentUser?.vessel?.id;  

//   useEffect(() =>{
//     console.log("currentUser:", currentUser)
//   })

  // fetch records & ranks once
  useEffect(() => {
    getSignOnOffRecords()
      .then((recs) => setRecords(sanitizeRecords(recs)))
      .catch((err) => console.error('Failed to fetch records', err));

    getRanksforList()
      .then((rs) => {
        const m: Record<number, string> = {}
        rs.forEach((r) => (m[r.id] = r.rank))
        setRanks(rs)
        setRankMap(m)
      })
      .catch((err) => console.error('Failed to fetch ranks', err))

      // ← fetch vessels
    getVesselList()
     .then((vs) => setVesselList(vs.map((v) => v.fleet_name)))
    .catch(console.error);
  }, [])

  useEffect(() => {
    console.log(searchTerm)
    console.log(crew)
  }, [crew, searchTerm])

  useEffect(() => {
    if (crew.length > 0 && searchTerm) {
      const hasMatch = crew.some((c) => c.name?.toLowerCase().includes(searchTerm.toLowerCase()))
      if (!hasMatch) {
        setSearchTerm('') // Clear search if it causes empty view
      }
    }
  }, [crew])

  const handleExcelDownload = () => {
    const table = document.querySelector('.report-table table') as HTMLTableElement
    if (!table) return

    const workbook = XLSX.utils.table_to_book(table, {sheet: 'CrewAssignment'})
    XLSX.writeFile(workbook, 'crewassignments.xlsx')
  }

  const fetchCrew = async () => {
    try {
      const crewList = await getCrewList()
      console.log('Crew List:', crewList)

      setCrew(crewList)
    } catch (error) {
      console.error('Failed to fetch company list:', error)
    }
  }

  // 2️⃣ fetch crew as before
  useEffect(() => {
    fetchCrew()
  }, [])

  // Handle filter change
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  };

  const handleVesselChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedVessel(e.target.value)
    setCurrentPage(1)
  }

    const handleSort = (column: string) => {                            // ← new
    if (sortColumn === column) {
      setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortOrder('asc')
    }
  }
  // Log rankId for debugging
  useEffect(() => {
    console.log("User Rank ID: ", userRankId);
  }, [userRankId]);

// Show "Sign On Crew" button only if rank name contains "Master"
  const canSignOnCrew = userRankId === 1; // Check if "Master" is in the rank name


  const handleSignOn = async (data: any) => {
  setIsSignOnModalOpen(false)
  try {
    // re-fetch the full list, so every record has crewName, vesselName, rank, etc.
    const all = await getSignOnOffRecords()
    setRecords(sanitizeRecords(all)); // keep SIGNED_OFF out
  } catch(err) {
    console.error(err)
    toast.error('Failed to refresh assignments')
  }
}


const handleViewClick = (record: SignOnOffRecord) => {
    setSelectedRecord(record);
    setIsViewAssignmentModalOpen(true);
  };

  const handleEditClick = (record: SignOnOffRecord) => {
    if (record.status === "PLANNED" || record.status === "SIGNED_ON" || record.status === "PLANNED_SIGN_OFF") {
        setSelectedRecord(record);
        setIsEditAssignmentModalOpen(true); // Open the modal for editing
    }
};

const handleUpdate = (updatedRecord: SignOnOffRecord) => {
  // Update the record in the list after editing
  setRecords((prevRecords) =>
    prevRecords.map((rec) =>
      rec.id === updatedRecord.id ? updatedRecord : rec
    )
  );
  setIsEditAssignmentModalOpen(false);
};

// Combined filtering + sorting (SIGNED_OFF already removed at source)
const filtered = records.filter((rec) => {
  // Global search across many fields (already excludes SIGNED_OFF)
  const matchesSearch = haystackOf(rec, rankMap).includes(searchTerm.trim().toLowerCase());

  // Status: "All" means any non-signed-off status; otherwise must match
  const matchesStatus =
    statusFilter === 'All' ? true : rec.status === statusFilter;

  // Must belong to current user's vessel (if we know it)
  const matchesUserVessel = userVesselId ? rec.vesselId === userVesselId : true;

  // Role 4 & not master → restrict to own crew assignment
  if (currentUser?.role?.id === 4 && !userRankName?.toLowerCase().includes('master')) {
    return rec.crewId === currentUser?.roleEntityId && matchesSearch && matchesStatus && matchesUserVessel;
  }

  return matchesSearch && matchesStatus && matchesUserVessel;
});


  const sorted = [...filtered].sort((a, b) => {
  // Default: newest-first by id if no explicit sort
  if (!sortColumn) return b.id - a.id;

  // Rank column → use custom ordering from helpers (rankMap maps id -> name)


  if (sortColumn === 'rank') {
    const ra = rankMap[a.rank] || ''
    const rb = rankMap[b.rank] || ''
    return compareRank(ra, rb, sortOrder)
  }

  // For date fields you might also handle them as dates:
  if (sortColumn === 'signOnDate' || sortColumn === 'signOffDate') {
     const da = new Date((a as any)[sortColumn] ?? '');
    const db = new Date((b as any)[sortColumn] ?? '');
    const diff = da.getTime() - db.getTime();
    return sortOrder === 'asc' ? diff : -diff;
  }

  // Text/other columns
  const av = String((a as any)[sortColumn] ?? '');
  const bv = String((b as any)[sortColumn] ?? '');
  return sortOrder === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
});


   const totalPages = Math.ceil(sorted.length / rowsPerPage)
  const current = sorted.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  )


   // 1️⃣ Detect if any filter is active
  const isAnyFilterActive =
    searchTerm.trim() !== '' ||
    statusFilter !== 'All' ||
    selectedVessel !== 'all';

  // 2️⃣ Handler to reset them all
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('All');
    setSelectedVessel('all');
    setCurrentPage(1);
  };

  
  if (!currentUser) {
  return null; // or a lightweight loader
}

  return (
    <div className='app-main flex-column flex-row-fluid' id='kt_app_main' style={{height: '100vh'}}>
      <div className='d-flex flex-column flex-column-fluid'>
        <div
          id='kt_app_content'
          className='app-content flex-column-fluid d-flex flex-column '
          style={{flex: 1}}
        >
          <div className='card flex-column-fluid d-flex flex-column' style={{flex: 1}}>
            {/* Header */}
            <div className='d-flex gap-3 pe-5 ps-5'>
              <div className='py-3 ms-3' style={{flex: 5}}>
                <h3 className='card-title fw-bold text-dark mb-5'>Crew Onboard</h3>
                <div className='d-flex justify-content-between mb-5'>
                  <div className='d-flex align-items-center gap-2'>
                    <input
                      type='text'
                      className='form-control cp_search_input'
                      placeholder='Crew Name'
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                     {/* Filter Dropdown */}
{!(currentUser?.role?.id === 4 && !userRankName?.toLowerCase().includes("master")) && (
  <select
    id="statusFilter"
    className="form-select custom-dropdown"
    value={statusFilter}
    onChange={handleFilterChange}
  >
    <option value="All">All Crew</option>
    <option value="SIGNED_ON">Signed On</option>
    {/* <option value="SIGNED_OFF">Signed Off</option> */}
    <option value="PLANNED">Planned Sign On</option>
    <option value="PLANNED_SIGN_OFF">Planned Sign Off</option>
  </select>
)}


                    {/* vessel dropdown */}
                    {/* <select
                      className="form-select"
                      value={selectedVessel}
                      onChange={handleVesselChange}
                    >
                      <option value="all">All Vessels</option>
                      {vesselList.map((v, i) => (
                        <option key={i} value={v}>
                          {v}
                        </option>
                      ))}
                    </select> */}

                    {/* 3️⃣ Clear Filters button */}
        {/* <button
          className='btn btn-outline-secondary border border-secondary'
          disabled={!isAnyFilterActive}
          onClick={clearFilters}
        >Clear&nbsp;Filters
          
        </button> */}

                  </div>
                  <div className='d-flex align-items-center gap-4'>
                    <button className='btn p-0 m-0' onClick={handleExcelDownload}>
                      <KTSVG
                        path='/media/icons/duotune/general/download.svg'
                        className='svg-icon-2x'
                      />
                    </button>
                   {/* Only show "Sign On Crew" button for Master (Captain) */}
                    {canSignOnCrew && (
                      <button
                        className="btn btn_primary"
                        onMouseDown={() => setSignOnActive(true)}
                        onMouseUp={() => setSignOnActive(false)}
                        onMouseLeave={() => setSignOnActive(false)}
                        onClick={() => setIsSignOnModalOpen(true)}
                      >
                        <KTSVG path={`/media/map/${signOnActive ? 'signon-black' : 'signon-white'}.svg`} className="svg-icon-2" />
                        SIGN ON CREW
                      </button>
                    )}
                  </div>
                </div>
                {/* Summary Cards */}
                <div className='py-3'>
                  {/* Reports Table */}
                  <div
                    className='report-table table-responsive'
                    style={{maxHeight: '50rem', overflowY: 'auto'}}
                  >
                    <table className='table table-bordered align-middle'>
                      <thead className='table-header py-5'>
                        <tr>
                        {[
                          { key: 'srNo', label: 'SR/NO' , isStatic: true},
                          { key: 'crewName', label: 'NAME' },
                          { key: 'rank', label: 'RANK' },
                          // { key: 'vesselName', label: 'VESSEL' },
                          { key: 'portSignOn', label: 'SIGN ON PORT' },
                          { key: 'signOnDate', label: 'SIGN ON DATE' },
                          { key: 'portSignOff', label: 'SIGN OFF PORT' },
                          { key: 'signOffDate', label: 'SIGN OFF DATE' },
                          { key: 'status', label: 'STATUS' },
                        ].map(col => (
                          <th key={col.key}>
                            {col.label}
                            <button
                              onClick={() => handleSort(col.key)}
                              className="btn btn-link p-0 m-0 pb-1"
                              disabled={records.length === 0}
                            >
                              <KTSVG
                                path={`/media/map/sort-col-${
                                  sortColumn === col.key
                                    ? sortOrder === 'asc'
                                      ? 'up-black'
                                      : 'down-black'
                                    : 'grey'
                                }.svg`}
                              />
                            </button>
                          </th>
                        ))}
                        <th>ACTIONS</th>
                      </tr>
                      </thead>
                      <tbody className='table-body'>
                        {current.length === 0 ? (
                          <tr>
                            <td colSpan={8} className='text-center py-4 text-muted'>
                              No crew found
                            </td>
                          </tr>
                        ) : (
                          current.map((rec, idx) => (
                            <tr key={idx}>
                              <td className="text-nowrap">{(currentPage - 1) * rowsPerPage + idx + 1}</td>
                              <td className="text-nowrap">{rec.crewName}</td>
                              <td className="text-nowrap">{rankMap[rec.rank] ?? '—'}</td>
                              {/* <td>{rec.vesselName}</td> */}
                              <td className="text-nowrap">{rec.portSignOn}</td>
                              <td className="text-nowrap">{formatDate(rec.signOnDate)}</td>
                              <td className="text-nowrap">{rec.portSignOff|| (
                                    // <span className='badge badge-light-warning'>
                                      "—"
                                    // </span>
                                  )
                                  // <span className="badge bg-warning text-dark">Not Yet Signed Off</span>
                                }</td>
                              <td className="text-nowrap">
                                {
                                  formatDate(rec.signOffDate || (
                                    // <span className='badge badge-light-warning'>
                                      "—"
                                    // </span>
                                  )
                                  )
                                  // <span className="badge bg-warning text-dark">Not Yet Signed Off</span>
                                }
                              </td>
                              <td className="text-nowrap">
  {rec.status === 'SIGNED_ON' ? (
    <span className="badge badge-light-success ">SIGNED ON</span>
  ) : rec.status === 'SIGNED_OFF' ? (
    <span className="badge badge-light-secondary ">SIGNED OFF</span>
  ) : rec.status === 'PLANNED' ? (
    <span className="badge badge-light-warning ">PLANNED SIGNED ON</span>
  ) : rec.status === 'PLANNED_SIGN_OFF' ? (
    <span className="badge badge-light-danger ">PLANNED SIGNED OFF</span>
  ) : (
    <span className="badge bg-light-warning text-dark">Unknown</span>
  )}
</td>

                              <td className="text-nowrap">
                               <button
                                className="btn btn-sm btn-secondary btn-icon mb-2 me-2"
                                onClick={() => handleEditClick(rec)}
                                disabled={
                                    (rec.status !== "PLANNED" && rec.status !== "SIGNED_ON" && rec.status !== "PLANNED_SIGN_OFF")
 } // Disable for other statuses
                                >
                                <KTSVG
                                    path={(
                                    rec.status === "PLANNED" || rec.status === "SIGNED_ON" || rec.status === "PLANNED_SIGN_OFF")
                                        ? "/media/map/edit-active.svg" // active status, regular icon
                                        : "/media/map/edit-active-grey.svg" // inactive status, greyed out icon
                                    }
                                />
                                </button>

                                <button
                                  className='btn btn-sm btn-secondary btn-icon mb-2 me-2'
                                  onClick={() => handleViewClick(rec)} 
                                >
                                  <KTSVG path='/media/map/ph_eye.svg' className='' />
                                </button>
                                <button
  className={`btn btn-sm mb-2 ${
    rec.status === 'SIGNED_OFF' || rec.status === 'PLANNED_SIGN_OFF'
      ? 'btn-secondary opacity-50 cursor-not-allowed'
      : 'btn-light-danger btn-outlined border border-1 border-danger'
  }`}
  onClick={() => {
    if (rec.status === 'SIGNED_OFF' || rec.status === 'PLANNED_SIGN_OFF') return // no-op
    setRecordToSignOff(rec)
    setSignOffRecordId(rec.id)
    setIsSignOffModalOpen(true)
  }}
  onMouseEnter={() => rec.status !== 'SIGNED_OFF' && setHoveredSignOffId(rec.id)}
  onMouseLeave={() => setHoveredSignOffId(null)}
  disabled={rec.status === 'SIGNED_OFF' || rec.status === 'PLANNED_SIGN_OFF'}
>
  <KTSVG
    path={
      rec.status === 'SIGNED_OFF' || rec.status === 'PLANNED_SIGN_OFF'
        ? '/media/map/signoff-grey.svg'      // a greyed-out icon if you have one
        : hoveredSignOffId === rec.id
        ? '/media/map/signoff-white.svg'
        : '/media/map/signoff-red.svg'
    }
  />
  {/* SIGN OFF */}
</button>

                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                    {/* Pagination */}
                    <div className='pagination-wrapper d-flex justify-content-between align-items-center'>
                      <div>
                        Rows per page
                        <select
                          className='form-select d-inline-block w-auto ms-2'
                          style={{borderRadius: '20px'}}
                          value={rowsPerPage}
                          onChange={(e) => {
                            setRowsPerPage(parseInt(e.target.value))
                            setCurrentPage(1) // Reset to page 1
                          }}
                        >
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                        </select>
                      </div>

                      <nav>
                        <ul className='pagination'>
                          <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                            <button
                              className='page-link'
                              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                            >
                              ‹
                            </button>
                          </li>
                          {Array.from({length: totalPages}, (_, i) => (
                            <li
                              key={i}
                              className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}
                            >
                              <button className='page-link' onClick={() => setCurrentPage(i + 1)}>
                                {i + 1}
                              </button>
                            </li>
                          ))}
                          <li
                            className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}
                          >
                            <button
                              className='page-link'
                              onClick={() =>
                                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                              }
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
          </div>
        </div>
        {isSignOnModalOpen && (
          <SignOnModal
            isOpen={isSignOnModalOpen}
            onClose={() => {
              setIsSignOnModalOpen(false)
            }}
            onSignedOn={data => {
                //1)referesh the list
                handleSignOn(data);
                // 2) stash + show the login link
                setSignOnLink(data.loginLink);
                setShowSignOnLink(true);
            }} 
          />
        )}
        {isSignOffModalOpen && signOffRecordId != null && (
  <SignOffModal
    isOpen={isSignOffModalOpen}
    recordId={signOffRecordId}
    signOnDate={recordToSignOff!.signOnDate}          
    onClose={() => setIsSignOffModalOpen(false)}
    onSignedOff={async () => {
  const all = await getSignOnOffRecords();
  setRecords(sanitizeRecords(all)); // drop SIGNED_OFF after operation
  setIsSignOffModalOpen(false);
}}
  />
)}

{/* View Assignment Modal */}
       {isViewAssignmentModalOpen && selectedRecord && (
        <ViewAssignmentModal
          isOpen={isViewAssignmentModalOpen}
          recordData={selectedRecord}
          rankMap={rankMap}
          onClose={() => setIsViewAssignmentModalOpen(false)}
        />
      )}
        {isEditAssignmentModalOpen && selectedRecord && (
    <EditAssignmentModal
        isOpen={isEditAssignmentModalOpen}
        onClose={() => setIsEditAssignmentModalOpen(false)}
        recordData={selectedRecord}
        onUpdate={(handleUpdate) }
    />
)}
        {/* {showSignOnLink  && signOnLink  && (
          <div className="modal-overlay" onClick={() => setShowSignOnLink(false)}>
            <div
              className='modal-content'
              onClick={(e) => e.stopPropagation()}
            //   style={{ maxWidth: '30rem' }}
            >
                <div className='custom-modal-header d-flex justify-content-between'>
                  <h5 className='modal-title'>Login Link</h5>
                  <button
                    type='button'
                    className='btn-close'
                    onClick={() => setShowSignOnLink(false)}
                  />
                </div>
                <div className='custom-modal-body'>
                  <p>
                    <strong>Use this link to login:</strong>
                  </p>
                  <a href={signOnLink} target="_blank" rel="noopener noreferrer">
                    {signOnLink}
                    </a>

                  <button
                    className='btn btn-light mb-3'
                    onClick={() => {
                      navigator.clipboard.writeText(signOnLink)
                      toast.success('Login link copied to clipboard')
                    }}
                  >
                    Copy Link
                  </button>

                 
                </div>

                
            </div>
          </div>
        )} */}

        <ToastContainer
          position='top-center'
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          style={{top: '5rem'}}
        />
      </div>
    </div>
  )
}

export {SignPage}
