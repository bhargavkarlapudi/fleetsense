import { FC, useEffect, useState } from 'react'
import { KTSVG } from '../../../../_metronic/helpers'
import AddVoyageModal from './AddVoyageModal'
import { Voyage } from '../core/_models'
import DeleteVoyageModal from './DeleteVoyageModal'
import EditVoyageModal from './EditVoyageModal'
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import StartEndVoyageModal from './StartEndVoyage';
import * as XLSX from 'xlsx';
import { getVoyageList } from '../core/_requests'
import { useAuth } from '../../auth'

const VoyageList: FC = () => {
    const [isAddVoyageModalOpen, setIsAddVoyageModalOpen] = useState(false)
    const [isEditVoyageModalOpen, setIsEditVoyageModalOpen] = useState(false)
    const [isDeleteVoyageModalOpen, setIsDeleteVoyageModalOpen] = useState(false)
    const [isStartEndVoyageModalOpen, setIsStartEndVoyageModalOpen] = useState(false)
    const [selectedVoyage, setSelectedVoyage] = useState<Voyage>()
    const [currentPage, setCurrentPage] = useState(1)
    const [rowsPerPage, setRowsPerPage] = useState(10)
    const [searchTerm, setSearchTerm] = useState('')
    const [voyages, setVoyages] = useState<Voyage[]>([]);
    const [filteredVoyages, setFilteredVoyages] = useState<Voyage[]>([]);
    const [sortConfig, setSortConfig] = useState<{ key: keyof Voyage | null, direction: 'asc' | 'desc' }>({
        key: null,
        direction: 'asc',
    });
    const { currentUser } = useAuth()
    const roleId = currentUser?.role?.id;
    const handleSort = (key: keyof Voyage) => {
        setSortConfig((prev) => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
        }));
    }

    const formatDate = (dateString: string) => {
        console.log(dateString);
        if (!dateString) return null;
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';

        const datePart = date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        }).replace(/ /g, '-');

        const timePart = date.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });

        return `${datePart} ${timePart}`;
    };

    // Filter voyages by search term
    const handlePageChange = (page: number) => {
        if (page > 0 && page <= totalPages) {
            setCurrentPage(page);
        }
    };
    const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setRowsPerPage(parseInt(e.target.value));
        setCurrentPage(1); // reset to first page
    };

    useEffect(() => {
        fetchVoyages()
    }, [])

    useEffect(() => {
        if (voyages.length > 0 && searchTerm) {
            const hasMatch = voyages.some(v => v.voyageNumber?.toLowerCase().includes(searchTerm.toLowerCase()));
            if (!hasMatch) {
                setSearchTerm(''); // Clear search if it causes empty view
            }
        }
    }, [voyages]);


    // Compute total pages based on filtered voyages
    const totalPages = Math.ceil(filteredVoyages.length / rowsPerPage) || 1

    // Ensure currentPage is within bounds when filteredVoyages or rowsPerPage change
    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(1)
        }
    }, [filteredVoyages, rowsPerPage, totalPages])

    // Slice filtered voyages for current page
    const displayedVoyages = filteredVoyages.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    )

    const fetchVoyages = async () => {
        try {
            const voyageList = await getVoyageList()
            setVoyages(voyageList)
        } catch (error) {
            console.error('Failed to fetch voyage list:', error)
        }
    }

    const handleExcelDownload = () => {
        const table = document.querySelector('.report-table table') as HTMLTableElement;
        if (!table) return;

        const workbook = XLSX.utils.table_to_book(table, { sheet: "Voyages" });
        XLSX.writeFile(workbook, "voyages.xlsx");
    };

    useEffect(() => {
        const filteredVoyages = voyages.filter(v => v.voyageNumber.toLowerCase().includes(searchTerm.toLowerCase()))
        let sortedVoyages = [...filteredVoyages];

        if (sortConfig.key === 'vessel') {
            sortedVoyages.sort((a, b) => {
                const valA = (a.vessel?.fleet_name ?? '').toLowerCase();
                const valB = (b.vessel?.fleet_name ?? '').toLowerCase();

                return sortConfig.direction === 'asc'
                    ? valA.localeCompare(valB)
                    : valB.localeCompare(valA);
            });
        }

        if (sortConfig.key !== null) {
            sortedVoyages.sort((a, b) => {
                const valA = (a[sortConfig.key!] ?? '').toString().toLowerCase();
                const valB = (b[sortConfig.key!] ?? '').toString().toLowerCase();

                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        setFilteredVoyages(sortedVoyages);
    }, [voyages, sortConfig, searchTerm]);

    return (
        <div className='app-main flex-column flex-row-fluid' id='kt_app_main' style={{ height: '100vh' }}>
            <div className='d-flex flex-column flex-column-fluid'>
                <div id='kt_app_content' className='app-content flex-column-fluid d-flex flex-column' style={{ flex: 1 }}>
                    <div className='card flex-column-fluid d-flex flex-column bg-white' style={{ flex: 1 }}>
                        {/* Header and Controls */}
                        <div className='d-flex gap-3 pe-5 border-top'>
                            <div className='py-3 ms-3' style={{ flex: 5 }}>
                                <h3 className='card-title fw-bold text-dark mb-5'>Voyages</h3>
                                <div className='d-flex justify-content-between mb-5'>
                                    <div className='d-flex align-items-center gap-2'>
                                        <input
                                            type='text'
                                            className='form-control cp_search_input'
                                            placeholder='Voyage Number'
                                            value={searchTerm}
                                            onChange={e => {
                                                setSearchTerm(e.target.value)
                                                setCurrentPage(1)
                                            }}
                                        />
                                    </div>
                                    <div className='d-flex align-items-center gap-4'>
                                        <button className="btn p-0 m-0" onClick={handleExcelDownload}>
                                            <KTSVG path='/media/icons/duotune/general/download.svg' className='svg-icon-2x' />
                                        </button>
                                        <button className='btn btn_primary' onClick={() => setIsAddVoyageModalOpen(true)}>
                                            <KTSVG path='/media/map/zoom-in.svg' className='svg-icon-2' /> Add Voyage
                                        </button>
                                    </div>
                                </div>
                                {/* Table */}
                                <div className='report-table table-responsive' style={{ maxHeight: '50rem', overflowY: 'auto' }}>
                                    <table className="table table-bordered align-middle">
                                        <thead className="table-header text-start">
                                            <tr>
                                                <th onClick={() => handleSort('voyageNumber')} className="cursor-pointer">
                                                    VOYAGE NUMBER
                                                    <KTSVG
                                                        path={`/media/map/sort-col-${sortConfig.key === 'voyageNumber'
                                                            ? sortConfig.direction === 'asc'
                                                                ? 'up-black'
                                                                : 'down-black'
                                                            : 'grey'
                                                            }.svg`}
                                                        className="svg-icon ms-2 custom-sort-icon"
                                                    />
                                                </th>

                                                <th onClick={() => handleSort('vessel')} className="cursor-pointer">
                                                    VESSEL
                                                    <KTSVG
                                                        path={`/media/map/sort-col-${sortConfig.key === 'vessel'
                                                            ? sortConfig.direction === 'asc'
                                                                ? 'up-black'
                                                                : 'down-black'
                                                            : 'grey'
                                                            }.svg`}
                                                        className="svg-icon ms-2 custom-sort-icon"
                                                    />
                                                </th>

                                                <th onClick={() => handleSort('departurePort')} className="cursor-pointer">
                                                    DEPARTURE PORT
                                                    <KTSVG
                                                        path={`/media/map/sort-col-${sortConfig.key === 'departurePort'
                                                            ? sortConfig.direction === 'asc'
                                                                ? 'up-black'
                                                                : 'down-black'
                                                            : 'grey'
                                                            }.svg`}
                                                        className="svg-icon ms-2 custom-sort-icon"
                                                    />
                                                </th>

                                                <th onClick={() => handleSort('arrivalPort')} className="cursor-pointer">
                                                    ARRIVAL PORT
                                                    <KTSVG
                                                        path={`/media/map/sort-col-${sortConfig.key === 'arrivalPort'
                                                            ? sortConfig.direction === 'asc'
                                                                ? 'up-black'
                                                                : 'down-black'
                                                            : 'grey'
                                                            }.svg`}
                                                        className="svg-icon ms-2 custom-sort-icon"
                                                    />
                                                </th>

                                                <th onClick={() => handleSort('startDate')} className="cursor-pointer">
                                                    DEPARTURE DATETIME
                                                    <KTSVG
                                                        path={`/media/map/sort-col-${sortConfig.key === 'startDate'
                                                            ? sortConfig.direction === 'asc'
                                                                ? 'up-black'
                                                                : 'down-black'
                                                            : 'grey'
                                                            }.svg`}
                                                        className="svg-icon ms-2 custom-sort-icon"
                                                    />
                                                </th>

                                                <th onClick={() => handleSort('endDate')} className="cursor-pointer">
                                                    ARRIVAL DATETIME
                                                    <KTSVG
                                                        path={`/media/map/sort-col-${sortConfig.key === 'endDate'
                                                            ? sortConfig.direction === 'asc'
                                                                ? 'up-black'
                                                                : 'down-black'
                                                            : 'grey'
                                                            }.svg`}
                                                        className="svg-icon ms-2 custom-sort-icon"
                                                    />
                                                </th>

                                               {
                                            //    roleId !== 6 && 
                                                <th>ACTIONS</th>}


                                            </tr>
                                        </thead>
                                        <tbody className="table-body text-start">
                                            {displayedVoyages.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} className="text-center py-4 text-muted">
                                                        No voyages found
                                                    </td>
                                                </tr>
                                            ) : (
                                                displayedVoyages.map((voyage, idx) => (
                                                    <tr key={idx}>
                                                        <td
                                                            className="text-primary fw-bold cursor-pointer"
                                                            onClick={() => {
                                                                // if (roleId !== 6) {
                                                                    setSelectedVoyage(voyage)
                                                                    setIsStartEndVoyageModalOpen(true)
                                                                // }
                                                            }}
                                                        >
                                                            {voyage.voyageNumber}
                                                        </td>
                                                        <td>{voyage.vessel.fleet_name}</td>
                                                        <td>{voyage.departurePort}</td>
                                                        <td>{voyage.arrivalPort}</td>
                                                        <td>{formatDate(voyage.startDate)}</td>
                                                        <td>{formatDate(voyage.endDate)}</td>
                                                        {
                                                        // roleId !== 6 && 
                                                        <td>
                                                            <button
                                                                className="btn btn-sm px-0"
                                                                onClick={() => {
                                                                    setSelectedVoyage(voyage)
                                                                    setIsEditVoyageModalOpen(true)
                                                                }}
                                                            >
                                                                <KTSVG path="/media/map/edit-active.svg" />
                                                            </button>
                                                        </td>}
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>

                                    {/* Pagination */}
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
                                                Showing <strong>{((currentPage - 1) * rowsPerPage) + 1}-{Math.min(currentPage * rowsPerPage, voyages.length)}</strong> of <strong>{voyages.length}</strong>
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

                                                        // Adjust start if we're near the end
                                                        if (endPage - startPage < showPages - 1) {
                                                            startPage = Math.max(1, endPage - showPages + 1);
                                                        }

                                                        // Add first page and ellipsis if needed
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

                                                        // Add page numbers
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

                                                        // Add ellipsis and last page if needed
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
                    </div>
                </div>
            </div>
            {/* Modals */}
            {isAddVoyageModalOpen && (
                <AddVoyageModal isOpen onClose={() => setIsAddVoyageModalOpen(false)} onVoyageAdded={fetchVoyages} />
            )}
            {isDeleteVoyageModalOpen && selectedVoyage && (
                <DeleteVoyageModal
                    isOpen
                    onClose={() => setIsDeleteVoyageModalOpen(false)}
                    onVoyageDeleted={fetchVoyages}
                    voyageData={selectedVoyage}
                />
            )}
            {isEditVoyageModalOpen && selectedVoyage && (
                <EditVoyageModal
                    isOpen
                    onClose={() => setIsEditVoyageModalOpen(false)}
                    onVoyageUpdated={fetchVoyages}
                    voyageData={selectedVoyage}
                />
            )}
            {isStartEndVoyageModalOpen && selectedVoyage && (
                <StartEndVoyageModal
                    isOpen
                    onClose={() => setIsStartEndVoyageModalOpen(false)}
                    voyage={selectedVoyage}
                />
            )}

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
                style={{ top: '5rem' }}
            />
        </div>
    )
}

export { VoyageList }
