import React, { FC, useState } from 'react'
import Select from 'react-select'
import { FaChevronRight, FaChevronUp } from 'react-icons/fa'
import { toast } from 'react-toastify'
import { KTSVG } from '../../../../_metronic/helpers'
import Tooltip from '@mui/material/Tooltip';

const Procurement: FC = () => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
    const openModal = () => { setIsCreateModalOpen(true) };
    const closeModal = () => setIsCreateModalOpen(false);

    const steps = [
        'Voyage Information',
        'Events',
        'Speed Position & Navigation',
        'Weather & Sea Condition',
        'Cargo & Stability',
        'Machinery',
        'Environment Compliance',
        'Miscellaneous Consumables'
    ];

    const voyages = [
        { name: 'VM010', current: true, start_port: 'Singapore', end_port: 'Lagos', start_date: '01/05/2024', end_date: '01/05/2024', completed: 33, errors: 12, },
        { name: 'VM009', current: false, start_port: 'Mumbai', end_port: 'Singapore', start_date: '01/05/2024', end_date: '01/05/2024', completed: 33, errors: 12, },
        { name: 'VM008', current: false, start_port: 'Chennai', end_port: 'Dubai', start_date: '01/05/2024', end_date: '01/05/2024', completed: 33, errors: 12, },
        { name: 'VM009', current: false, start_port: 'Kochi', end_port: 'Colombo', start_date: '01/05/2024', end_date: '01/05/2024', completed: 33, errors: 12, },
        { name: 'VM006', current: false, start_port: 'Vizag', end_port: 'Hong Kong', start_date: '01/05/2024', end_date: '01/05/2024', completed: 33, errors: 12, },
        { name: 'VM005', current: false, start_port: 'Kolkata', end_port: 'Jakarta', start_date: '01/05/2024', end_date: '01/05/2024', completed: 33, errors: 12, },
        { name: 'VM009', current: false, start_port: 'Mangalore', end_port: 'Bangkok', start_date: '01/05/2024', end_date: '01/05/2024', completed: 33, errors: 12, },
        { name: 'VM003', current: false, start_port: 'Paradip', end_port: 'Port Klang', start_date: '01/05/2024', end_date: '01/05/2024', completed: 33, errors: 12, },
        { name: 'VM002', current: false, start_port: 'Haidia', end_port: 'Busan', start_date: '01/05/2024', end_date: '01/05/2024', completed: 33, errors: 12, },
    ];

    const reports = [
        { name: "Departure", leg: "3BC", date: "18/05/24 11:30 UTC", by: "Master", status: "Draft" },
        { name: "Noon at sea", leg: "3BC", date: "19/05/24 11:30 UTC", by: "Chief engineer", status: "Submitted" },
        { name: "Arrival", leg: "3BC", date: "21/05/24 11:30 UTC", by: "2nd engineer", status: "Submitted" },
    ];

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
                        <div className='d-flex gap-3 pe-5'>
                            <div className='py-3 ms-3' style={{ flex: 5 }}>
                                <div className='d-flex justify-content-between'>
                                    <h3 className='card-title fw-bold text-dark '>Dashboard</h3>
                                    <div className='d-flex align-items-center gap-4'>
                                        {/* <KTSVG path='/media/icons/duotune/general/download.svg' className='svg-icon-2x' /> */}
                                        <button className='btn btn_primary' onClick={openModal}>
                                            <KTSVG path='/media/map/zoom-in.svg' className='svg-icon-2' /> New Requisition
                                        </button>
                                    </div>
                                </div>
                                {/* <div className='d-flex justify-content-between mt-3'>
                                    <p>Vessel name: <strong>RTM Cabot</strong></p>
                                    <p>IMO number: <strong>8741239</strong></p>
                                    <p>Vessel type: <strong>Gas carrier</strong></p>
                                    <p>VM010: <strong>Singapore - Lagos</strong></p>
                                </div> */}
                                {/* Summary Cards */}
                                <div className='border-top pt-3'>
                                    <div className="row mb-4">
                                        {[
                                            { title: "Total Requisitions", value: "48", status: "Last 30 days", path: "/media/map/fuel-consumption.svg" },
                                            { title: "Pending Approval", value: "12", status: "Awaiting review", path: "/media/map/Speed.svg" },
                                            { title: "Approved", value: "28", status: "Ready for procurement", path: "/media/map/rpm.svg" },
                                            { title: "Rejected", value: "8", status: "Requires revision", path: "/media/map/eta.svg" },
                                        ].map((card, index) => (
                                            <div key={index} className="col-md-3 mb-3">
                                                <div className="custom-card p-3">
                                                    <div className='d-flex justify-content-between'>
                                                        <div>
                                                            <h2 className="fw-bold mb-1">{card.value}</h2>
                                                            <h6 className="card-title">{card.title}</h6>
                                                            <h6 className="text-sm text-muted" style={{ fontWeight: 400, fontSize: '1rem' }}>{card.status}</h6>
                                                        </div>
                                                        <KTSVG path={card.path} className='svg-icon svg-icon-2x' />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="custom-card p-3">
                                        <h2 className='card-title fw-bold text-dark '>Recent Requisitions</h2>
                                        <h6 className=" text-sm text-muted" style={{ fontWeight: 400, fontSize: '1rem' }}>Overview of recently created requisitions</h6>

                                        <div className="d-flex flex-column gap-3">
                                            {[
                                                {
                                                    id: 'REQ-2023-053',
                                                    title: 'Engine Spare Parts',
                                                    date: '2025-05-18',
                                                    priority: 'high',
                                                    status: 'pending',
                                                },
                                                {
                                                    id: 'REQ-2023-052',
                                                    title: 'Safety Equipment',
                                                    date: '2025-05-17',
                                                    priority: 'medium',
                                                    status: 'approved',
                                                },
                                                {
                                                    id: 'REQ-2023-051',
                                                    title: 'Navigation Tools',
                                                    date: '2025-05-15',
                                                    priority: 'low',
                                                    status: 'approved',
                                                },
                                            ].map((req, index) => (
                                                <div key={index} className="d-flex justify-content-between align-items-start border-bottom pb-2">
                                                    <div>
                                                        <h6 className="fw-semibold mb-1 text-dark">
                                                            {req.id}: {req.title}
                                                        </h6>
                                                        <span className="text-muted small">Created on {req.date}</span>
                                                    </div>
                                                    <div className="d-flex gap-2">
                                                        <span
                                                            className={`badge rounded-pill text-capitalize ${req.priority === 'high' ? 'bg-danger-subtle text-danger' :
                                                                req.priority === 'medium' ? 'bg-warning-subtle text-warning' :
                                                                    'bg-success-subtle text-success'}`}>
                                                            {req.priority}
                                                        </span>
                                                        <span
                                                            className={`badge rounded-pill text-capitalize ${req.status === 'pending' ? 'bg-warning-subtle text-warning' :
                                                                'bg-success-subtle text-success'}`}>
                                                            {req.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>


                                    </div>

                                    <div className="mt-4 alert alert-primary d-flex align-items-center gap-2 py-2 px-3">
                                        <span className="bullet bg-success h-10px w-10px me-2"></span>
                                        <span>Connected to shore. All requisitions will sync immediately.</span>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
                {/* {
                    isCreateModalOpen && (
                        <CreateReportModal isOpen={isCreateModalOpen} onClose={closeModal} />
                    )
                } */}
            </div>
        </div>

    )
}

export { Procurement }
