import { Navigate, Route, Routes, Outlet } from 'react-router-dom'
import Overview from './components/Overview'
import { RequisitionList } from './components/RequisitionList'
import Approvals from './components/Approvals'
import RFQManagement from './components/RFQManagement'
import { QuotationManagement } from './components/QuotationManagement'
import { PurchaseOrdersList } from './components/PurchaseOrderList'
import DeliveryTracking from './components/DeliveryTracking'
import GoodsReceipt from './components/GoodsReceipt'
import InvoiceManagement from './components/InvoiceManagement'
import AuditTrail from './components/AuditTrail'
import { InventoryList } from './components/InventoryList'
import User_Management from './components/User_Management'

const ProcurementPage = () => {
    return (
        <Routes>
            <Route element={<Outlet />}>
                <Route
                    index
                    element={<Navigate to={'overview'} replace />}
                />
                <Route
                    path='overview'
                    element={<Overview />}
                />
                <Route
                    path='requisition'
                    element={<RequisitionList />}
                />
                <Route
                    path='approvals'
                    element={<Approvals />}
                />
                <Route
                    path='rfq-management'
                    element={<RFQManagement />}
                />
                <Route
                    path='quotation-management'
                    element={<QuotationManagement />}
                />
                <Route
                    path='purchase-orders'
                    element={<PurchaseOrdersList />}
                />
                <Route
                    path='delivery-tracking'
                    element={<DeliveryTracking />}
                />
                <Route
                    path='goods-receipt'
                    element={<GoodsReceipt />}
                />
                <Route
                    path='invoice-management'
                    element={<InvoiceManagement />}
                />
                <Route
                    path='audit-trail'
                    element={<AuditTrail />}
                />
                <Route
                    path='inventory-management'
                    element={<InventoryList />}
                />
                <Route
                    path='user-management'
                    element={<User_Management />}
                />
            </Route>
        </Routes>
    )
}

export default ProcurementPage