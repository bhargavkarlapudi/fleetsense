import { FC, useState, useMemo, useEffect } from 'react'
import { KTSVG } from '../../../../_metronic/helpers'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { createInvoice, getInvoices, markInvoiceAsPaid } from '../core/_requests'
import { CreateInvoiceRequest, Invoice } from '../core/_models'
import { useAuth } from '../../auth'

interface CreateInvoiceModalProps {
    visible: boolean
    onClose: () => void
    onSubmit: () => void
}

const CreateInvoiceModal: FC<CreateInvoiceModalProps> = ({ visible, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        purchaseOrderId: '',
        goodsReceiptId: '',
        invoiceDate: '',
        amount: '',
        currency: 'USD'
    })
    const [errors, setErrors] = useState<{ [key: string]: string }>({})
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }))
        }
    }

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {}

        if (!formData.purchaseOrderId) newErrors.purchaseOrderId = 'Purchase Order ID is required'
        if (!formData.invoiceDate) newErrors.invoiceDate = 'Invoice Date is required'
        if (!formData.amount) newErrors.amount = 'Amount is required'
        if (formData.amount && parseFloat(formData.amount) <= 0) newErrors.amount = 'Amount must be greater than 0'
        if (!formData.currency) newErrors.currency = 'Currency is required'

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async () => {
        if (!validateForm()) return

        setIsSubmitting(true)
        try {
            const payload: CreateInvoiceRequest = {
                purchaseOrderId: parseInt(formData.purchaseOrderId),
                goodsReceiptId: formData.goodsReceiptId ? parseInt(formData.goodsReceiptId) : null,
                invoiceDate: formData.invoiceDate,
                amount: parseFloat(formData.amount),
                currency: formData.currency
            }

            console.log('Creating invoice with payload:', payload)
            const result = await createInvoice(payload)
            console.log('Invoice created successfully:', result)

            toast.success(`Invoice created successfully! Invoice Number: ${result.invoiceNumber}`)
            handleClose()
            onSubmit()
        } catch (error: any) {
            console.error('Error creating invoice:', error)
            toast.error(error.message || 'Failed to create invoice')
        } finally {
            setIsSubmitting(false)
        }
    }

    const resetForm = () => {
        setFormData({
            purchaseOrderId: '',
            goodsReceiptId: '',
            invoiceDate: '',
            amount: '',
            currency: 'USD'
        })
        setErrors({})
    }

    const handleClose = () => {
        resetForm()
        onClose()
    }

    if (!visible) return null

    return (
        <div
            className="modal fade show d-flex align-items-center justify-content-center"
            tabIndex={-1}
            style={{
                backgroundColor: 'rgba(0,0,0,0.5)',
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 1050,
            }}
        >
            <div className='modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable' role='document'>
                <div className='modal-content bg-white' style={{ color: '#181C32' }}>
                    <div className='modal-header'>
                        <div>
                            <h5 className='modal-title'>Create New Invoice</h5>
                            <p className='text-muted mb-0 fs-7'>Enter invoice details for three-way matching</p>
                        </div>
                        <button type='button' className='btn-close' onClick={handleClose}></button>
                    </div>

                    <div className='modal-body' style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        <div className='row g-3'>
                            <div className='col-md-6'>
                                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Purchase Order ID</label>
                                <input
                                    type='number'
                                    className={`form-control ${errors.purchaseOrderId ? 'is-invalid' : ''}`}
                                    name='purchaseOrderId'
                                    value={formData.purchaseOrderId}
                                    onChange={handleInputChange}
                                    placeholder='Enter Purchase Order ID'
                                    style={{ color: '#000' }}
                                />
                                {errors.purchaseOrderId && <div className='invalid-feedback'>{errors.purchaseOrderId}</div>}
                            </div>

                            <div className='col-md-6'>
                                <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                                    Goods Receipt ID <span className='text-muted'>(Optional)</span>
                                </label>
                                <input
                                    type='number'
                                    className={`form-control ${errors.goodsReceiptId ? 'is-invalid' : ''}`}
                                    name='goodsReceiptId'
                                    value={formData.goodsReceiptId}
                                    onChange={handleInputChange}
                                    placeholder='Enter Goods Receipt ID (optional)'
                                    style={{ color: '#000' }}
                                />
                                {errors.goodsReceiptId && <div className='invalid-feedback'>{errors.goodsReceiptId}</div>}
                            </div>

                            <div className='col-md-6'>
                                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Invoice Date</label>
                                <input
                                    type='date'
                                    className={`form-control ${errors.invoiceDate ? 'is-invalid' : ''}`}
                                    name='invoiceDate'
                                    value={formData.invoiceDate}
                                    onChange={handleInputChange}
                                    style={{ color: '#000' }}
                                />
                                {errors.invoiceDate && <div className='invalid-feedback'>{errors.invoiceDate}</div>}
                            </div>

                            <div className='col-md-6'>
                                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Amount</label>
                                <input
                                    type='number'
                                    step='0.01'
                                    className={`form-control ${errors.amount ? 'is-invalid' : ''}`}
                                    name='amount'
                                    value={formData.amount}
                                    onChange={handleInputChange}
                                    placeholder='Enter invoice amount'
                                    style={{ color: '#000' }}
                                />
                                {errors.amount && <div className='invalid-feedback'>{errors.amount}</div>}
                            </div>

                            <div className='col-md-12'>
                                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Currency</label>
                                <select
                                    className={`form-select ${errors.currency ? 'is-invalid' : ''}`}
                                    name='currency'
                                    value={formData.currency}
                                    onChange={handleInputChange}
                                >
                                    <option value='USD'>USD - US Dollar</option>
                                    <option value='EUR'>EUR - Euro</option>
                                    <option value='GBP'>GBP - British Pound</option>
                                    <option value='SGD'>SGD - Singapore Dollar</option>
                                    <option value='JPY'>JPY - Japanese Yen</option>
                                    <option value='CNY'>CNY - Chinese Yuan</option>
                                </select>
                                {errors.currency && <div className='invalid-feedback'>{errors.currency}</div>}
                            </div>
                        </div>
                    </div>

                    <div className='modal-footer'>
                        <button type='button' className='btn btn-light btn-sm' onClick={handleClose} disabled={isSubmitting}>
                            Cancel
                        </button>
                        <button
                            type='button'
                            className='btn btn_primary'
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Creating...' : 'Create Invoice'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

const InvoiceManagement: FC = () => {
    const { currentUser } = useAuth()
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [rowsPerPage, setRowsPerPage] = useState(10)
    const [invoiceData, setInvoiceData] = useState<Invoice[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [sortConfig, setSortConfig] = useState<{
        key: keyof Invoice | null
        direction: 'asc' | 'desc'
    }>({ key: null, direction: 'asc' })
    const [isCreateModalVisible, setIsCreateModalVisible] = useState(false)

    // Check if user has permission to create invoices (Role 1: Superadmin, Role 5: Company)
    const canCreateInvoice = currentUser?.role?.id === 1 || currentUser?.role?.id === 5

    // Fetch invoices on component mount
    useEffect(() => {
        loadInvoices()
    }, [])

    const loadInvoices = async () => {
        setIsLoading(true)
        try {
            const invoices = await getInvoices()
            console.log('Invoices loaded:', invoices)
            setInvoiceData(invoices)
        } catch (error: any) {
            console.error('Error loading invoices:', error)
            toast.error('Failed to load invoices')
        } finally {
            setIsLoading(false)
        }
    }

    const handleCreateInvoice = () => {
        setIsCreateModalVisible(true)
    }

    const handleModalClose = () => {
        setIsCreateModalVisible(false)
    }

    const handleInvoiceCreated = () => {
        // Refresh invoice data after creation
        loadInvoices()
    }

    const handleMarkAsPaid = async (invoiceId: number) => {
        if (!window.confirm('Are you sure you want to mark this invoice as paid?')) {
            return
        }

        try {
            await markInvoiceAsPaid(invoiceId)
            toast.success('Invoice marked as paid successfully!')
            loadInvoices() // Refresh the list
        } catch (error: any) {
            console.error('Error marking invoice as paid:', error)
            toast.error(error.message || 'Failed to mark invoice as paid')
        }
    }

    const handleViewInvoice = (invoiceId: number) => {
        // TODO: Implement view invoice details modal
        console.log('View invoice:', invoiceId)
        toast.info('View invoice details - Coming soon!')
    }

    // Calculate summary statistics based on API status
    const pendingCount = invoiceData.filter(d => d.status === 'PENDING').length
    const matchedCount = invoiceData.filter(d => d.status === 'THREE_WAY_MATCHED').length
    const discrepanciesCount = invoiceData.filter(d => d.status === 'DISCREPANCY').length
    const paidCount = invoiceData.filter(d => d.status === 'PAID').length
    const totalValue = invoiceData.reduce((sum, d) => sum + d.amount, 0)

    const filteredData = useMemo(() => {
        return invoiceData.filter(record => {
            const matchesSearch = searchTerm === '' ||
                record.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                record.id.toString().includes(searchTerm.toLowerCase()) ||
                record.purchaseOrderId.toString().includes(searchTerm.toLowerCase())

            return matchesSearch
        })
    }, [searchTerm, invoiceData])

    const sortedData = useMemo(() => {
        let sortedRecords = [...filteredData]

        if (sortConfig.key !== null) {
            sortedRecords.sort((a, b) => {
                const aVal = String(a[sortConfig.key!] || '').toLowerCase()
                const bVal = String(b[sortConfig.key!] || '').toLowerCase()

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
                return 0
            })
        }
        return sortedRecords
    }, [filteredData, sortConfig])

    const handleSort = (key: keyof Invoice) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
        }))
    }

    const indexOfLastRecord = currentPage * rowsPerPage
    const indexOfFirstRecord = indexOfLastRecord - rowsPerPage
    const currentRecords = sortedData.slice(indexOfFirstRecord, indexOfLastRecord)
    const totalPages = Math.ceil(sortedData.length / rowsPerPage)

    const handlePageChange = (page: number) => {
        if (page > 0 && page <= totalPages) {
            setCurrentPage(page)
        }
    }

    const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setRowsPerPage(parseInt(e.target.value))
        setCurrentPage(1)
    }

    const getStatusBadge = (status: string) => {
        const statusColors: Record<string, string> = {
            'THREE_WAY_MATCHED': 'bg-success',
            'PENDING': 'bg-warning',
            'DISCREPANCY': 'bg-danger',
            'PAID': 'bg-info'
        }
        const statusLabels: Record<string, string> = {
            'THREE_WAY_MATCHED': 'Matched',
            'PENDING': 'Pending',
            'DISCREPANCY': 'Discrepancy',
            'PAID': 'Paid'
        }
        return (
            <span className={`badge ${statusColors[status] || 'bg-secondary'} text-white`}>
                {statusLabels[status] || status}
            </span>
        )
    }

    return (
        <div className='app-main flex-column flex-row-fluid' id='kt_app_main'>
            <div className='d-flex flex-column flex-column-fluid'>
                <div id='kt_app_content' className='app-content flex-column-fluid bg-white'>
                    <div className='card'>
                        <div className='card-header border-0 pt-6 bg-white'>
                            <div className='d-flex justify-content-between align-items-center w-100'>
                                <div>
                                    <h3 className='card-label text-dark fw-bold'>Invoice Management</h3>
                                    <p className='text-muted mb-0'>Three-way matching of invoices, purchase orders, and goods receipts</p>
                                </div>
                                {canCreateInvoice && (
                                    <button
                                        className='btn btn_primary'
                                        onClick={handleCreateInvoice}
                                    >
                                        <KTSVG path='/media/icons/duotune/arrows/arr075.svg' className='svg-icon-2' />
                                        Create Invoice
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className='card-body py-4 bg-white border-top'>
                            {/* Summary Cards */}
                            <div className="row mb-4">
                                {[
                                    { title: "Pending", value: pendingCount.toString(), path: "/media/icons/duotune/general/gen049.svg", color: "primary" },
                                    { title: "Matched", value: matchedCount.toString(), path: "/media/icons/duotune/communication/com006.svg", color: "success" },
                                    { title: "Paid", value: paidCount.toString(), path: "/media/icons/duotune/finance/fin006.svg", color: "info" },
                                    { title: "Total Value", value: `${(totalValue / 1000).toFixed(2)}K`, path: "/media/icons/duotune/general/gen014.svg", color: "warning" },
                                ].map((card, index) => (
                                    <div key={index} className="col-md-3 mb-3">
                                        <div className="custom-card p-3">
                                            <div className='d-flex justify-content-between'>
                                                <div>
                                                    <h2 className="fw-bold mb-1">{card.value}</h2>
                                                    <h6 className="card-title">{card.title}</h6>
                                                </div>
                                                <KTSVG path={card.path} className='svg-icon svg-icon-2x' />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Search Bar */}
                            <div className='row gx-3 gy-3 mb-4'>
                                <div className='col-md-4'>
                                    <label className='form-label text-muted fw-semibold fs-7 mb-2'>Search</label>
                                    <div className='position-relative'>
                                        <div
                                            className='position-absolute ms-3'
                                            style={{ top: '50%', transform: 'translateY(-50%)' }}
                                        >
                                            <KTSVG
                                                path='/media/icons/duotune/general/gen021.svg'
                                                className='svg-icon-2'
                                            />
                                        </div>
                                        <input
                                            type='text'
                                            className='form-control form-control-sm ps-10'
                                            placeholder='Search by invoice number, ID, or PO ID...'
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Invoice Management Table */}
                            <div className='mb-8'>
                                <h4 className='fw-bold text-primary mb-4'>Invoice Management Items ({sortedData.length} entries)</h4>
                                {isLoading ? (
                                    <div className='text-center py-5'>
                                        <div className='spinner-border text-primary' role='status'>
                                            <span className='visually-hidden'>Loading...</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className='report-table table-responsive'>
                                        <div style={{ overflowX: 'auto' }}>
                                            <table className='table table-bordered align-middle'>
                                                <thead className='table-header text-start'>
                                                    <tr>
                                                        <th onClick={() => handleSort('id')} className='cursor-pointer align-middle' style={{ padding: '12px 16px' }}>
                                                            <div className='d-flex align-items-center'>
                                                                <span style={{ color: '#3F4254', fontWeight: 600 }}>ID</span>
                                                                <div style={{ transform: 'translateY(-2px)' }}>
                                                                    <KTSVG
                                                                        path={`/media/map/sort-col-${sortConfig.key === 'id' ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                                                        className='svg-icon ms-2 custom-sort-icon'
                                                                    />
                                                                </div>
                                                            </div>
                                                        </th>
                                                        <th onClick={() => handleSort('invoiceNumber')} className='cursor-pointer align-middle' style={{ padding: '12px 16px' }}>
                                                            <div className='d-flex align-items-center'>
                                                                <span style={{ color: '#3F4254', fontWeight: 600 }}>INVOICE NUMBER</span>
                                                                <div style={{ transform: 'translateY(-2px)' }}>
                                                                    <KTSVG
                                                                        path={`/media/map/sort-col-${sortConfig.key === 'invoiceNumber' ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                                                        className='svg-icon ms-2 custom-sort-icon'
                                                                    />
                                                                </div>
                                                            </div>
                                                        </th>
                                                        <th onClick={() => handleSort('invoiceDate')} className='cursor-pointer align-middle' style={{ padding: '12px 16px' }}>
                                                            <div className='d-flex align-items-center'>
                                                                <span style={{ color: '#3F4254', fontWeight: 600 }}>INVOICE DATE</span>
                                                                <div style={{ transform: 'translateY(-2px)' }}>
                                                                    <KTSVG
                                                                        path={`/media/map/sort-col-${sortConfig.key === 'invoiceDate' ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                                                        className='svg-icon ms-2 custom-sort-icon'
                                                                    />
                                                                </div>
                                                            </div>
                                                        </th>
                                                        <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>PO ID</th>
                                                        <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>GR ID</th>
                                                        <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>VENDOR ID</th>
                                                        <th onClick={() => handleSort('amount')} className='cursor-pointer align-middle' style={{ padding: '12px 16px' }}>
                                                            <div className='d-flex align-items-center'>
                                                                <span style={{ color: '#3F4254', fontWeight: 600 }}>AMOUNT</span>
                                                                <div style={{ transform: 'translateY(-2px)' }}>
                                                                    <KTSVG
                                                                        path={`/media/map/sort-col-${sortConfig.key === 'amount' ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                                                        className='svg-icon ms-2 custom-sort-icon'
                                                                    />
                                                                </div>
                                                            </div>
                                                        </th>
                                                        <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>CURRENCY</th>
                                                        <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>STATUS</th>
                                                        <th className='align-middle text-center' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>3-WAY MATCH</th>
                                                        <th className='align-middle text-center' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>ACTIONS</th>
                                                    </tr>
                                                </thead>
                                                <tbody className='table-body text-start'>
                                                    {currentRecords.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={11} className='text-center text-muted py-5'>
                                                                {isLoading ? 'Loading invoices...' : 'No invoices found.'}
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        currentRecords.map((record) => (
                                                            <tr key={record.id} style={{ borderBottom: '1px solid #E4E6EF' }}>
                                                                <td className='text-dark fw-semibold fs-6' style={{ padding: '12px 16px' }}>{record.id}</td>
                                                                <td className='text-dark fw-semibold fs-6' style={{ padding: '12px 16px' }}>{record.invoiceNumber}</td>
                                                                <td className='text-dark fs-6' style={{ padding: '12px 16px' }}>{record.invoiceDate}</td>
                                                                <td className='text-dark fs-6' style={{ padding: '12px 16px' }}>PO-{record.purchaseOrderId}</td>
                                                                <td className='text-dark fs-6' style={{ padding: '12px 16px' }}>
                                                                    {record.goodsReceiptId ? `GR-${record.goodsReceiptId}` : <span className='text-muted'>-</span>}
                                                                </td>
                                                                <td className='text-dark fs-6' style={{ padding: '12px 16px' }}>V-{record.vendorId}</td>
                                                                <td className='text-dark fw-semibold fs-6' style={{ padding: '12px 16px' }}>
                                                                    {record.currency} {record.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                </td>
                                                                <td className='text-dark fs-6' style={{ padding: '12px 16px' }}>{record.currency}</td>
                                                                <td style={{ padding: '12px 16px' }}>{getStatusBadge(record.status)}</td>
                                                                <td className='text-center' style={{ padding: '12px 16px' }}>
                                                                    {record.threeWayMatched ? (
                                                                        <span className='badge bg-success'>
                                                                            <i className='bi bi-check-circle me-1'></i>
                                                                            Matched
                                                                        </span>
                                                                    ) : (
                                                                        <span className='badge bg-warning'>
                                                                            <i className='bi bi-exclamation-circle me-1'></i>
                                                                            Not Matched
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className='text-center' style={{ padding: '12px 16px' }}>
                                                                    <button
                                                                        className='btn btn-sm px-0'
                                                                        title='View'
                                                                        onClick={() => handleViewInvoice(record.id)}
                                                                    >
                                                                        <KTSVG path='/media/map/ph_eye.svg' />
                                                                    </button>
                                                                    {record.status !== 'PAID' && (
                                                                        <button
                                                                            className='btn btn-sm btn-success'
                                                                            title='Mark as Paid'
                                                                            onClick={() => handleMarkAsPaid(record.id)}
                                                                        >
                                                                            Mark as Paid
                                                                        </button>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Pagination */}
                                        <div
                                            className='pagination-wrapper d-flex justify-content-between align-items-center py-3'
                                            style={{
                                                position: 'static',
                                                bottom: 0,
                                                backgroundColor: '#fff',
                                                zIndex: 10,
                                                borderTop: '1px solid #dee2e6',
                                                marginTop: 'auto'
                                            }}
                                        >
                                            <div className='d-flex align-items-center'>
                                                <span className='text-muted me-2'>Rows per page</span>
                                                <select
                                                    className='form-select'
                                                    style={{
                                                        borderRadius: '20px',
                                                        width: '70px',
                                                        border: '1px solid #dee2e6',
                                                        fontSize: '14px',
                                                        padding: '4px 8px'
                                                    }}
                                                    value={rowsPerPage}
                                                    onChange={handleRowsPerPageChange}
                                                >
                                                    <option value={10}>10</option>
                                                    <option value={20}>20</option>
                                                    <option value={50}>50</option>
                                                </select>
                                            </div>
                                            <div className='d-flex align-items-center'>
                                                <span className='text-muted me-3' style={{ fontSize: '14px' }}>
                                                    Showing <strong>{currentRecords.length > 0 ? ((currentPage - 1) * rowsPerPage) + 1 : 0}-{Math.min(currentPage * rowsPerPage, sortedData.length)}</strong> of <strong>{sortedData.length}</strong>
                                                </span>

                                                <nav>
                                                    <ul className='pagination pagination-sm mb-0' style={{ gap: '2px' }}>
                                                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                                            <button
                                                                className='page-link text-muted'
                                                                style={{
                                                                    backgroundColor: '#f8f9fa',
                                                                    border: '1px solid #dee2e6',
                                                                    padding: '8px 12px',
                                                                    fontSize: '14px',
                                                                    borderRadius: '6px'
                                                                }}
                                                                onClick={() => handlePageChange(currentPage - 1)}
                                                                disabled={currentPage === 1}
                                                            >
                                                                ‹
                                                            </button>
                                                        </li>

                                                        {(() => {
                                                            const pages = []
                                                            const showPages = 5
                                                            let startPage = Math.max(1, currentPage - 2)
                                                            let endPage = Math.min(totalPages, startPage + showPages - 1)

                                                            if (endPage - startPage < showPages - 1) {
                                                                startPage = Math.max(1, endPage - showPages + 1)
                                                            }

                                                            if (startPage > 1) {
                                                                pages.push(
                                                                    <li key={1} className='page-item'>
                                                                        <button
                                                                            className='page-link text-muted'
                                                                            style={{
                                                                                backgroundColor: '#f8f9fa',
                                                                                border: '1px solid #dee2e6',
                                                                                padding: '8px 12px',
                                                                                fontSize: '14px',
                                                                                minWidth: '40px',
                                                                                borderRadius: '6px'
                                                                            }}
                                                                            onClick={() => handlePageChange(1)}
                                                                        >
                                                                            1
                                                                        </button>
                                                                    </li>
                                                                )

                                                                if (startPage > 2) {
                                                                    pages.push(
                                                                        <li key='ellipsis1' className='page-item disabled'>
                                                                            <span className='page-link border-0 text-muted' style={{ backgroundColor: 'transparent', padding: '4px 8px' }}>...</span>
                                                                        </li>
                                                                    )
                                                                }
                                                            }

                                                            for (let i = startPage; i <= endPage; i++) {
                                                                pages.push(
                                                                    <li key={i} className={`page-item ${currentPage === i ? 'active' : ''}`}>
                                                                        <button
                                                                            className='page-link text-muted'
                                                                            style={{
                                                                                backgroundColor: currentPage === i ? '#F4F9FF' : 'transparent',
                                                                                border: '1px solid #dee2e6',
                                                                                padding: '8px 12px',
                                                                                fontSize: '14px',
                                                                                minWidth: '40px',
                                                                                borderRadius: '6px',
                                                                                outline: 'none',
                                                                                boxShadow: 'none'
                                                                            }}
                                                                            onClick={() => handlePageChange(i)}
                                                                        >
                                                                            {i}
                                                                        </button>
                                                                    </li>
                                                                )
                                                            }

                                                            if (endPage < totalPages) {
                                                                if (endPage < totalPages - 1) {
                                                                    pages.push(
                                                                        <li key='ellipsis2' className='page-item disabled'>
                                                                            <span className='page-link border-0 text-muted' style={{ backgroundColor: 'transparent', padding: '4px 8px' }}>...</span>
                                                                        </li>
                                                                    )
                                                                }

                                                                pages.push(
                                                                    <li key={totalPages} className='page-item'>
                                                                        <button
                                                                            className='page-link text-muted'
                                                                            style={{
                                                                                backgroundColor: '#f8f9fa',
                                                                                border: '1px solid #dee2e6',
                                                                                padding: '8px 12px',
                                                                                fontSize: '14px',
                                                                                minWidth: '40px',
                                                                                borderRadius: '6px'
                                                                            }}
                                                                            onClick={() => handlePageChange(totalPages)}
                                                                        >
                                                                            {totalPages}
                                                                        </button>
                                                                    </li>
                                                                )
                                                            }

                                                            return pages
                                                        })()}

                                                        <li className={`page-item ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}`}>
                                                            <button
                                                                className='page-link text-muted'
                                                                style={{
                                                                    backgroundColor: '#f8f9fa',
                                                                    border: '1px solid #dee2e6',
                                                                    padding: '8px 12px',
                                                                    fontSize: '14px',
                                                                    borderRadius: '6px'
                                                                }}
                                                                onClick={() => handlePageChange(currentPage + 1)}
                                                                disabled={currentPage === totalPages || totalPages === 0}
                                                            >
                                                                ›
                                                            </button>
                                                        </li>
                                                    </ul>
                                                </nav>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Create Invoice Modal */}
            <CreateInvoiceModal
                visible={isCreateModalVisible}
                onClose={handleModalClose}
                onSubmit={handleInvoiceCreated}
            />

            {/* Toast Container */}
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
    )
}

export default InvoiceManagement
