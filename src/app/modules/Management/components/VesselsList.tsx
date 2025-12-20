import React, { FC, useEffect, useState } from 'react'
import { KTSVG } from '../../../../_metronic/helpers'
import { getGeneralInfoOfVessel, getVesselList } from '../core/_requests'
import { Vessel } from '../core/_models'
import AddVesselModal from './AddVesselModal'
import EditVesselModal from './EditVesselModal'
import ViewVesselModal from './ViewVesselModal'
import DeleteVesselModal from './DeleteVesselModal'
import AddAdditionalInfoModal from './AddAdditionalInfoModal'
import VesselLandingModal from './VesselLanding'
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import * as XLSX from 'xlsx';
import { useAuth } from '../../auth'

const VesselsList: FC = () => {
    const [vessels, setVessels] = useState<Vessel[]>([]);
    const [filteredVessels, setFilteredVessels] = useState<Vessel[]>([]);
    const [selectedVessel, setSelectedVessel] = useState<Vessel>();
    const [infoExists, setInfoExists] = useState<Record<number, boolean>>({})
    const [isEditMode, setIsEditMode] = useState(false)

    const [isAddVesselModalOpen, setIsAddVesselModalOpen] = useState(false)
    const [isEditVesselModalOpen, setIsEditVesselModalOpen] = useState(false)
    const [isViewVesselModalOpen, setIsViewVesselModalOpen] = useState(false)
    const [isDeleteVesselModalOpen, setIsDeleteVesselModalOpen] = useState(false)
    const [isAddAdditionalInfoModalOpen, setIsAddAdditionalInfoModalOpen] = useState(false)

    const [landingVesselId, setLandingVesselId] = useState<number | null>(null)

    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof Vessel | null, direction: 'asc' | 'desc' }>({
        key: null,
        direction: 'asc',
    });

    const { currentUser } = useAuth()
    const roleId = currentUser?.role?.id;
    const roleEntityId = currentUser?.roleEntityId;
    /** OPERATOR BEHAVIOR SPLIT **/
const companyGroupAdminId =
  (currentUser as any)?.companyGroupAdminId ??
  (currentUser as any)?.companyGroupAdmin?.id ??
  null

const isOperator = roleId === 6
const isSuperadminOperator = isOperator && companyGroupAdminId == null   // acts like Superadmin
const isCompanyOperator   = isOperator && companyGroupAdminId != null    // acts like Company Group Admin

// For CGA-like behavior, this is the CGA id we should act as (works for role 5 or operator under company)
const effectiveCgaId: number | null =
  roleId === 5
    ? Number(roleEntityId)
    : isCompanyOperator
      ? Number(companyGroupAdminId)
      : null

// Who can add/edit/delete vessels in UI
const canManageVessels =
  roleId === 1 || roleId === 5 || roleId === 2 || isSuperadminOperator || isCompanyOperator


    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const totalPages = Math.ceil(filteredVessels.length / rowsPerPage);
    const indexOfLastVessel = currentPage * rowsPerPage;
    const indexOfFirstVessel = indexOfLastVessel - rowsPerPage;
    const currentVessels = filteredVessels.slice(indexOfFirstVessel, Math.min(indexOfLastVessel, filteredVessels.length));

    // Fetch vessel list
    const fetchVessels = async () => {
        try {
            const vesselList = await getVesselList();
            console.log('Vessel List:', vesselList);
            setVessels(vesselList);
        } catch (error) {
            console.error('Failed to fetch vessel list:', error);
        }
    };


    // After fetching vessels, check which have additional info
    useEffect(() => {
        vessels.forEach(v => {
            getGeneralInfoOfVessel(v.id)
                .then(() => setInfoExists(prev => ({ ...prev, [v.id]: true })))
                .catch(() => setInfoExists(prev => ({ ...prev, [v.id]: false })))
        })
    }, [vessels])

    // Initial load
    useEffect(() => {
        fetchVessels()
    }, [])



    useEffect(() => {
  let filtered = vessels.filter(vessel => {
    const matchesSearch = vessel.fleet_name?.toLowerCase().includes(searchTerm.toLowerCase())
    const isActive = vessel.active

    // role gates
    // Superadmin OR Operator-under-Superadmin => see all active
    if (roleId === 1 || isSuperadminOperator) {
      return matchesSearch && isActive
    }

    // Company Group Admin OR Operator-under-Company => only vessels for their CGA
    if (roleId === 5 || isCompanyOperator) {
      return (
        matchesSearch &&
        isActive &&
        vessel.companyGroupAdmin?.id === Number(effectiveCgaId)
      )
    }

    // Company Admin => only vessels for their companyAdmin id
    if (roleId === 2) {
      return (
        matchesSearch &&
        isActive &&
        vessel.companyAdmin?.id === Number(roleEntityId)
      )
    }

    // other roles see nothing (keeps your previous behavior tight)
    return false
  })

  if (sortConfig.key) {
    filtered = [...filtered].sort((a, b) => {
      const aValue = (a[sortConfig.key!] ?? '').toString().toLowerCase()
      const bValue = (b[sortConfig.key!] ?? '').toString().toLowerCase()
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }

  setFilteredVessels(filtered)
  setCurrentPage(1)
}, [searchTerm, vessels, roleId, roleEntityId, sortConfig, isSuperadminOperator, isCompanyOperator, effectiveCgaId])

    const handleSort = (key: keyof Vessel) => {
        setSortConfig((prev) => {
            if (prev.key === key) {
                return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            } else {
                return { key, direction: 'asc' };
            }
        });
    };


    // useEffect(() => {
    //     const filtered = vessels.filter(vessel => {
    //         const matchesSearch = vessel.fleet_name?.toLowerCase().includes(searchTerm.toLowerCase());
    //         const isActive = vessel.active;

    //         // Apply role-based filtering only if roleId is 5 or 2
    //         const isRoleRelevant = roleId === 5 || roleId === 2;
    //         const roleFilter = !isRoleRelevant || (
    //             (roleId === 5 && vessel.companyGroupAdmin?.id === roleEntityId) ||
    //             (roleId === 2 && vessel.companyAdmin?.id === roleEntityId)
    //         );

    //         return matchesSearch && isActive && roleFilter;
    //     });

    //     setFilteredVessels(filtered);
    //     setCurrentPage(1);
    // }, [searchTerm, vessels, roleId, roleEntityId]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(1); // Reset to first page if the current page exceeds total pages
        }
    }, [filteredVessels, rowsPerPage]);



    const handleExcelDownload = () => {
        const table = document.querySelector('.report-table table') as HTMLTableElement;
        if (!table) return;

        const workbook = XLSX.utils.table_to_book(table, { sheet: "Vessels" });
        XLSX.writeFile(workbook, "vessels.xlsx");
    };

    
    const landingVessel = landingVesselId !== null
        ? vessels.find(v => v.id === landingVesselId) || null
        : null

    return (
        <div
            className='app-main flex-column flex-row-fluid'
            id='kt_app_main'
            style={{ height: '100vh' }}
        >
            <div className='d-flex flex-column flex-column-fluid'>
                <div
                    id='kt_app_content'
                    className='app-content flex-column-fluid d-flex flex-column'
                    style={{ flex: 1 }}
                >
                    <div className='card flex-column-fluid d-flex flex-column bg-white border-top' style={{ flex: 1 }}>
                        {/* Header */}
                        <div className='d-flex gap-3 pe-5'>
                            <div className='py-3 ms-3' style={{ flex: 5 }}>
                                <h3 className='card-title fw-bold text-dark mb-5'>Vessels</h3>
                                <div className='d-flex justify-content-between mb-5'>
                                    <div className='d-flex align-items-center gap-2'>
                                        <input
                                            type="text"
                                            className="form-control cp_search_input"
                                            placeholder="Vessel Name"
                                            value={searchTerm}
                                            onChange={(e) => {
                                                setSearchTerm(e.target.value);
                                            }}
                                        />
                                    </div>
                                    <div className='d-flex align-items-center gap-4'>
                                        <button className="btn p-0 m-0" onClick={handleExcelDownload}>
                                            <KTSVG path='/media/icons/duotune/general/download.svg' className='svg-icon-2x' />
                                        </button>
                                        {canManageVessels && (
  <button className='btn btn_primary' onClick={() => setIsAddVesselModalOpen(true)}>
    <KTSVG path='/media/map/zoom-in.svg' className='svg-icon-2' /> Add Vessel
  </button>
)}

                                    </div>
                                </div>
                                {/* Vessels Table */}
                                <div className='pt-3'>
                                    <div className="report-table table-responsive" style={{ maxHeight: '50rem', overflowY: 'auto' }}>
                                        <table className="table table-bordered align-middle">
                                            <thead className="table-header py-5">
                                                <tr>
                                                    <th onClick={() => handleSort('fleet_name')} className="cursor-pointer">
                                                        VESSEL NAME
                                                        <KTSVG
                                                            path="/media/map/report_table_filter.svg"
                                                            className={`svg-icon-small ms-2 ${sortConfig.key === 'fleet_name' && sortConfig.direction === 'asc' ? 'rotate-180' : ''}`}
                                                        />
                                                    </th>
                                                    <th onClick={() => handleSort('fleet_name')} className="cursor-pointer">
                                                        IMO NUMBER
                                                        <KTSVG
                                                            path="/media/map/report_table_filter.svg"
                                                            className={`svg-icon-small ms-2 ${sortConfig.key === 'fleet_name' && sortConfig.direction === 'asc' ? 'rotate-180' : ''}`}
                                                        />
                                                    </th>
                                                    <th onClick={() => handleSort('fleet_name')} className="cursor-pointer">
                                                        VESSEL TYPE
                                                        <KTSVG
                                                            path="/media/map/report_table_filter.svg"
                                                            className={`svg-icon-small ms-2 ${sortConfig.key === 'fleet_name' && sortConfig.direction === 'asc' ? 'rotate-180' : ''}`}
                                                        />
                                                    </th>
                                                    <th onClick={() => handleSort('fleet_name')} style={{ cursor: 'pointer' }}>
                                                        COMPANY NAME
                                                        <KTSVG path="/media/map/report_table_filter.svg" className="svg-icon-small ms-2" />
                                                    </th>
                                                    <th onClick={() => handleSort('fleet_name')} style={{ cursor: 'pointer' }}>
                                                        SUB-COMPANY NAME
                                                        <KTSVG path="/media/map/report_table_filter.svg" className="svg-icon-small ms-2" />
                                                    </th>
                                                    {<th>ACTIONS</th>}
                                                    {/* <th>ADDITIONAL DETAILS</th> */}
                                                </tr>
                                            </thead>
                                            <tbody className="table-body">
                                                {currentVessels.length > 0 ? (
                                                    currentVessels.map((vessel, idx) => (
                                                        <tr key={idx}>
                                                             <td>
                                                            {vessel.fleet_name ? (
                                                                <a
                                                                    href="#"
                                                                    onClick={(e) => {
                                                                        e.preventDefault()
                                                                        setLandingVesselId(vessel.id)
                                                                    }}
                                                                    style={{
                                                                        color: 'blue',
                                                                        cursor: 'pointer',
                                                                        textDecoration: 'underline',
                                                                        fontWeight: '500',
                                                                    }}
                                                                >
                                                                    {vessel.fleet_name}
                                                                </a>
                                                            ) : ('-')}
                                                        </td>
                                                            <td>{vessel.imoNumber ?? '-'}</td>
                                                            <td>{vessel.vesselType ?? '-'}</td>
                                                            <td>{vessel.companyGroupAdmin?.name ?? '-'}</td>
                                                            <td>{vessel.companyAdmin?.name ?? '-'}</td>

                                                            <td>
                                                                {canManageVessels && <> <button className="btn btn-sm px-0" onClick={() => { setIsEditVesselModalOpen(true); setSelectedVessel(vessel); }}>
                                                                    <KTSVG path='/media/map/edit-active.svg' className='' />
                                                                </button>
                                                                    {infoExists[vessel.id] ? (
                                                                        <button
                                                                            className="btn btn-sm px-0"
                                                                            onClick={() => {
                                                                                setSelectedVessel(vessel)
                                                                                setIsEditMode(true)
                                                                                setIsAddAdditionalInfoModalOpen(true)
                                                                            }}
                                                                        >
                                                                            <KTSVG path="/media/map/square-plus.svg" className="" />
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            className="btn btn-sm px-0"
                                                                            onClick={() => {
                                                                                setSelectedVessel(vessel)
                                                                                setIsEditMode(false)
                                                                                setIsAddAdditionalInfoModalOpen(true)
                                                                            }}
                                                                        >
                                                                            <KTSVG path="/media/map/square-plus.svg" className="" />
                                                                        </button>
                                                                    )}
                                                                    <button className="btn btn-sm px-0" onClick={() => { setIsDeleteVesselModalOpen(true); setSelectedVessel(vessel); }}>
                                                                        <KTSVG path='/media/map/trash.svg' className='' />
                                                                    </button></>}
                                                                <button className="btn btn-sm px-0" onClick={() => { setIsViewVesselModalOpen(true); setSelectedVessel(vessel); }}>
                                                                    <KTSVG path='/media/map/ph_eye.svg' className='' />
                                                                </button>
                                                            </td>
                                                            {/* <td>
                                {infoExists[vessel.id] ? (
                                  <button
                                    className="btn btn-sm px-0"
                                    onClick={() => {
                                      setSelectedVessel(vessel)
                                      setIsEditMode(true)
                                      setIsAddAdditionalInfoModalOpen(true)
                                    }}
                                  >
                                    <KTSVG path="/media/map/edit-active.svg" className="" />
                                  </button>
                                ) : (
                                  <button
                                    className="btn btn-sm px-0"
                                    onClick={() => {
                                      setSelectedVessel(vessel)
                                      setIsEditMode(false)
                                      setIsAddAdditionalInfoModalOpen(true)
                                    }}
                                  >
                                    <KTSVG path="/media/map/square-plus.svg" className="" />
                                  </button>
                                )}
                              </td> */}
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={roleId === 1 ? 7 : 6} className="text-center py-4 text-muted">
                                                            No vessels found
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                        {/* Pagination */}
                                        <div className="pagination-wrapper d-flex justify-content-between align-items-center py-3" style={{ borderTop: "1px solid #dee2e6" }}>
                                            <div className="d-flex align-items-center">
                                                <span className="text-muted me-2">Rows per page</span>
                                                <select
                                                    className="form-select"
                                                    style={{
                                                        borderRadius: "20px",
                                                        width: "70px",
                                                        border: "1px solid #dee2e6",
                                                        fontSize: "14px",
                                                        padding: "4px 8px",
                                                    }}
                                                    value={rowsPerPage}
                                                    onChange={(e) => {
                                                        setRowsPerPage(parseInt(e.target.value));
                                                        setCurrentPage(1);
                                                    }}
                                                >
                                                    <option value={10}>10</option>
                                                    <option value={20}>20</option>
                                                    <option value={50}>50</option>
                                                </select>
                                            </div>

                                            <div className="d-flex align-items-center">
                                                <span className="text-muted me-3" style={{ fontSize: "14px" }}>
                                                    Showing <strong>{(currentPage - 1) * rowsPerPage + 1}-{Math.min(currentPage * rowsPerPage, filteredVessels.length)}</strong> of <strong>{filteredVessels.length}</strong>
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
                                                                    borderRadius: "6px",
                                                                }}
                                                                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                                                disabled={currentPage === 1}
                                                            >
                                                                ‹
                                                            </button>
                                                        </li>

                                                        {(() => {
                                                            const pages = [];
                                                            const showPages = 5;
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
                                                                                borderRadius: "6px",
                                                                            }}
                                                                            onClick={() => setCurrentPage(1)}
                                                                        >
                                                                            1
                                                                        </button>
                                                                    </li>
                                                                );
                                                                if (startPage > 2) {
                                                                    pages.push(
                                                                        <li key="ellipsis1" className="page-item disabled">
                                                                            <span
                                                                                className="page-link border-0 text-muted"
                                                                                style={{ backgroundColor: "transparent", padding: "4px 8px" }}
                                                                            >
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
                                                                                boxShadow: "none",
                                                                            }}
                                                                            onClick={() => setCurrentPage(i)}
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
                                                                            <span
                                                                                className="page-link border-0 text-muted"
                                                                                style={{ backgroundColor: "transparent", padding: "4px 8px" }}
                                                                            >
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
                                                                                borderRadius: "6px",
                                                                            }}
                                                                            onClick={() => setCurrentPage(totalPages)}
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
                                                                    borderRadius: "6px",
                                                                }}
                                                                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
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
                        </div>
                    </div>
                </div>
                {isAddVesselModalOpen && (
                    <AddVesselModal isOpen={isAddVesselModalOpen}
                        onClose={() => { setIsAddVesselModalOpen(false) }}
                        onVesselAdded={fetchVessels}
                    />
                )}
                {isAddAdditionalInfoModalOpen && selectedVessel && (
                    <AddAdditionalInfoModal
                        isOpen={isAddAdditionalInfoModalOpen}
                        isEdit={isEditMode}
                        onClose={() => setIsAddAdditionalInfoModalOpen(false)}
                        onVesselAdded={fetchVessels}
                        vesselData={selectedVessel}
                    />
                )}
                {isDeleteVesselModalOpen && selectedVessel && (
                    <DeleteVesselModal
                        isOpen={isDeleteVesselModalOpen}
                        onClose={() => setIsDeleteVesselModalOpen(false)}
                        onVesselDeleted={fetchVessels}
                        vesselData={selectedVessel}
                    />
                )}
                {isEditVesselModalOpen && selectedVessel && (
                    <EditVesselModal
                        isOpen={isEditVesselModalOpen}
                        onClose={() => setIsEditVesselModalOpen(false)}
                        onVesselUpdated={fetchVessels}
                        vesselData={selectedVessel}
                    />
                )}
                {isViewVesselModalOpen && selectedVessel && (
                    <ViewVesselModal
                        isOpen={isViewVesselModalOpen}
                        onClose={() => { setIsViewVesselModalOpen(false) }}
                        vesselData={selectedVessel}
                    />
                )}

                {landingVessel && (
                    <VesselLandingModal
                        isOpen={!!landingVessel}
                        onClose={() => setLandingVesselId(null)}
                        vesselData={landingVessel}
                    />
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

export { VesselsList };

