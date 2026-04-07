import React, { FC, useState, useEffect } from 'react'
import { KTSVG } from '../../../../_metronic/helpers'
import { Vessel, VesselLandingResponse  } from '../core/_models'
import ViewVesselModal from './ViewVesselModal'
import { getVesselLanding, getVesselImageUrl  } from '../core/_requests'
import MapView from '../../../pages/dashboard/components/MapView'
import type { Vessel as DashVessel } from '../../../pages/dashboard/core/_models'

const MaximizeIcon: FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" className={className}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="3" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const RestoreIcon: FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" className={className}>
    <path d="M15 3.5H9C6.5 3.5 4.5 5.5 4.5 8V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="8.5" y="8.5" width="11" height="11" rx="3" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const ExpandIcon: FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" className={className}>
    <path d="M4 8V4H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20 8V4H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 16V20H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20 16V20H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CollapseIcon: FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" className={className}>
    <path d="M8 4V8H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 4V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 20V16H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 20V16H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

interface Props {
  isOpen: boolean
  onClose: () => void
  vesselData: Vessel
}

const VesselLandingModal: FC<Props> = ({ isOpen, onClose, vesselData }) => {

  const [isQ88ModalOpen, setIsQ88ModalOpen] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [isMapExpanded, setIsMapExpanded] = useState(false)
  const [shareStatus, setShareStatus] = useState<'idle' | 'loading' | 'copied'>('idle');
  const [landing, setLanding] = useState<VesselLandingResponse | null>(null)
const [loadingLanding, setLoadingLanding] = useState(false)
const [errorLanding, setErrorLanding] = useState<string | null>(null)

const [vesselImgUrl, setVesselImgUrl] = useState<string | null>(null)
const [imgLoading, setImgLoading] = useState<boolean>(false)
const [imgError, setImgError] = useState<string | null>(null)

const text = (v: any) => (v !== null && v !== undefined && String(v).trim() !== '' ? String(v) : '—')
const mt  = (v: any) => (v ? `${v} MT` : '—')
const nm  = (v: any) => (v ? `${v} NM` : '—')
const kn  = (v: any) => (v ? `${v} kn` : '—')
const deg = (v: any) => (v ? `${v}°` : '—')


  useEffect(() => {
  if (!isOpen || !vesselData?.id) return
  let ignore = false
  setLoadingLanding(true)
  setErrorLanding(null)

  getVesselLanding(vesselData.id)
    .then((data) => { if (!ignore) setLanding(data) })
    .catch((e) => { if (!ignore) setErrorLanding(e?.message || 'Failed to load landing data') })
    .finally(() => { if (!ignore) setLoadingLanding(false) })

  return () => { ignore = true }
}, [isOpen, vesselData?.id])

// Fetch vessel image (single image)
useEffect(() => {
  if (!isOpen || !vesselData?.id) return
  let ignore = false
  let objectUrlToRevoke: string | null = null

  setImgLoading(true)
  setImgError(null)
  setVesselImgUrl(null)

  getVesselImageUrl(vesselData.id)
    .then((url) => {
      if (ignore) return
      if (url) {
        setVesselImgUrl(url)
        // We can’t know for sure if it's an object URL we created,
        // but if it starts with "blob:", clean up on unmount.
        if (url.startsWith('blob:')) objectUrlToRevoke = url
      } else {
        setVesselImgUrl(null)
      }
    })
    .catch((e) => {
      if (!ignore) setImgError(e?.message || 'Failed to load vessel image')
    })
    .finally(() => {
      if (!ignore) setImgLoading(false)
    })

  return () => {
    ignore = true
    if (objectUrlToRevoke) {
      URL.revokeObjectURL(objectUrlToRevoke)
    }
  }
}, [isOpen, vesselData?.id])



  if (!isOpen) return null

  const handleToggleMaximize = () => {
    setIsMaximized(!isMaximized)
  }

  const handleShare = async () => {
    if (shareStatus !== 'idle') return;

    setShareStatus('loading');

    await new Promise(resolve => setTimeout(resolve, 1000));
    const token = Math.random().toString(36).substring(2, 12);

    const publicUrl = `${window.location.origin}/public/vessel/${vesselData.id || '12345'}-${token}`;

    try {
      await navigator.clipboard.writeText(publicUrl);
      setShareStatus('copied');
    } catch (err) {
      console.error('Failed to copy link: ', err);
      setShareStatus('idle');
    }

    setTimeout(() => {
      setShareStatus('idle');
    }, 3000);
  };

  // Build a single "dashboard Vessel" from the modal's data (typed to Dashboard model)
const singleVesselMarker: DashVessel = {
  id: vesselData.id,
  fleet_name: landing?.vesseldto?.fleet_name ?? vesselData.fleet_name,
  imoNumber: landing?.vesseldto?.imoNumber ?? vesselData.imoNumber,
  vesselType: landing?.vesseldto?.vesselType ?? vesselData.vesselType,
  status: landing?.status ?? 'Unknown',
  port: landing?.nextPort ?? '',
  eta: landing?.latestVoyage?.eta ?? '',
  // coords optional; MapView will fetch tracking by id
};


  const handleWhatsAppClick = (phoneNumber: string) => {
    const cleanedNumber = phoneNumber.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${cleanedNumber}`, '_blank');
  };

  return (
    <>
      <div 
        className="modal-overlay" 
        onClick={isMapExpanded ? undefined : onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 1050,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div
          className="modal-content"
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: isMaximized ? '100%' : '115rem',
            width: isMaximized ? '100%' : '90%',
            maxHeight: isMaximized ? '100%' : '90vh',
            height: isMaximized ? '100%' : 'auto',
            overflowY: 'auto',
            backgroundColor: '#f8f9fa',
            borderRadius: isMaximized ? '0' : '8px',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
         
          <div className="d-flex justify-content-between align-items-center bg-white" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #dee2e6', flexShrink: 0 }}>
            <h5 className="m-0">Vessel Details - {vesselData.fleet_name || 'Ocean Voyager'}</h5>
            <div className="d-flex align-items-center gap-2">
              <button className="btn btn-sm btn-light" onClick={handleToggleMaximize}>
                {isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
              </button>
              <button className="btn btn-sm btn-light" onClick={onClose}>
                <KTSVG path='/media/map/x.svg' className='svg-icon-2x svg-icon-gray-700' />
              </button>
            </div>
          </div>

          
          <div style={{ padding: '0', flex: 1, overflowY: 'auto' }}>
            {/* HEADER SUMMARY BAR */}
            <div className="bg-white border-bottom px-4 py-3 d-flex align-items-center justify-content-between">
  {/* Left: vessel name + meta */}
  <div className="me-3">
    <h3 className="fw-bold mb-1">
      {text(landing?.vesseldto?.fleet_name ?? vesselData.fleet_name ?? 'Ocean Voyager')}
    </h3>
    <p className="text-muted mb-0">
      IMO: {text(landing?.vesseldto?.imoNumber ?? vesselData.imoNumber ?? '9123456')} |{' '}
      Flag: {text(landing?.vesseldto?.flag ?? vesselData.flag ?? 'Panama')} |{' '}
      Type: {text((landing?.vesseldto?.vesselType ?? vesselData.vesselType)?.replace(/_/g, ' ') ?? 'Bulk Carrier')}
    </p>
  </div>

  {/* Middle: small banner image (shown from md and up) */}
<div className="d-none d-md-block mx-3 flex-grow-1" style={{ maxWidth: 360 }}>
  <div
    className="rounded d-flex align-items-center justify-content-center"
    style={{
      height: 80,
      backgroundImage: vesselImgUrl
        ? `url("${vesselImgUrl}")`
        : 'none',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      border: '1px solid #e9ecef',
      position: 'relative',
      overflow: 'hidden'
    }}
  >
    {/* Loading / error / fallback overlay */}
    {imgLoading && (
      <div className="w-100 h-100 d-flex align-items-center justify-content-center" style={{ background: 'rgba(255,255,255,0.6)' }}>
        <span className="text-muted small">Loading image…</span>
      </div>
    )}
    {!imgLoading && !vesselImgUrl && (
      <div className="w-100 h-100 d-flex align-items-center justify-content-center bg-light">
        <span className="text-muted small">
          {imgError ? 'No image available' : 'No image'}
        </span>
      </div>
    )}
  </div>
</div>


  {/* Right: actions */}
  <div className="d-flex gap-2 ms-3 flex-shrink-0">
    {/* <button className="btn btn-sm btn-primary" onClick={handleShare} disabled={shareStatus !== 'idle'}>
      {shareStatus === 'idle' && 'Share'}
      {shareStatus === 'loading' && 'Generating...'}
      {shareStatus === 'copied' && 'Link Copied!'}
    </button> */}
    <button className="btn btn-sm btn-primary" onClick={() => setIsQ88ModalOpen(true)}>View Q88</button>
  </div>
</div>
            
{loadingLanding && (
  <div className="bg-warning text-dark small px-4 py-2 border-bottom">
    Loading latest vessel data…
  </div>
)}
{errorLanding && (
  <div className="bg-danger text-white small px-4 py-2 border-bottom">
    Failed to load
  </div>
)}

            {/* SUMMARY CARDS */}
            <div className="bg-white border-bottom p-3">
  <div className="row g-2">
    <div className="col-lg col-md-3 col-6">
      <div className="border rounded p-2 h-100">
        <p className="text-muted small mb-1">Tonnage</p>
        <div className="d-flex justify-content-between small">
          <span className="text-muted">DWT:</span>
          <span className="fw-bold">{mt(landing?.vesseldto?.dwt ?? vesselData.dwt)}</span>
        </div>
        <div className="d-flex justify-content-between small">
          <span className="text-muted">GRT:</span>
          <span className="fw-bold">—</span>
        </div>
        <div className="d-flex justify-content-between small">
          <span className="text-muted">NRT:</span>
          <span className="fw-bold">—</span>
        </div>
      </div>
    </div>

    <div className="col-lg col-md-3 col-6">
      <div className="border rounded p-2 h-100">
        <p className="text-muted small mb-1">Build Year</p>
        <h6 className="fw-bold mb-0">—</h6>
      </div>
    </div>

    <div className="col-lg col-md-3 col-6">
      <div className="border rounded p-2 h-100">
        <p className="text-muted small mb-1">Vessel Type</p>
        <h6 className="fw-bold mb-0">
          {text((landing?.vesseldto?.vesselType ?? vesselData.vesselType)?.replace(/_/g, ' '))}
        </h6>
      </div>
    </div>

    <div className="col-lg col-md-3 col-6">
  <div className="border rounded p-2 h-100">
    <p className="text-muted small mb-1">Status</p>
    <h6 className="fw-bold mb-0">{text(landing?.status)}</h6>
  </div>
</div>

    <div className="col-lg col-md-3 col-6">
      <div className="border rounded p-2 h-100">
        <p className="text-muted small mb-1">Call Sign</p>
        <h6 className="fw-bold mb-0">{text(landing?.vesseldto?.call_sign ?? '—')}</h6>
      </div>
    </div>

    <div className="col-lg col-md-3 col-6">
      <div className="border rounded p-2 h-100">
        <p className="text-muted small mb-1">MMSI</p>
        <h6 className="fw-bold mb-0">{text(landing?.vesseldto?.mmsi ?? '—')}</h6>
      </div>
    </div>

    <div className="col-lg col-md-3 col-6">
      <div className="border rounded p-2 h-100">
        <p className="text-muted small mb-1">Last Port</p>
        <h6 className="fw-bold mb-0">{text(landing?.lastPort ?? '—')}</h6>
      </div>
    </div>

    <div className="col-lg col-md-3 col-6">
      <div className="border rounded p-2 h-100">
        <p className="text-muted small mb-1">Next Port</p>
        <h6 className="fw-bold mb-0">{text(landing?.nextPort ?? '—')}</h6>
      </div>
    </div>
  </div>
</div>

{/* Four boxes side-by-side (single row) */}
<div className="row g-0">


  {/* 1) Navigation */}
  <div className="col-12 col-md-6 col-xl-4">
    <div className="bg-white p-3 border h-100">
      <h5 className="text-primary fw-bold">Navigation & Command</h5>
      <div className="mt-2">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="mb-0">Current Position</h6>
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={() => setIsMapExpanded(!isMapExpanded)}
            aria-label={isMapExpanded ? 'Collapse Map' : 'Expand Map'}
            title={isMapExpanded ? 'Collapse Map' : 'Expand Map'}
          >
            {isMapExpanded ? <CollapseIcon /> : <ExpandIcon />}
          </button>
        </div>

        <div className="rounded mt-2" style={{ height: 160, border: '1px solid #e9ecef', overflow: 'hidden' }}>
  <MapView vesselMarkers={[singleVesselMarker]} height={160} compact />
</div>

        <div className="mt-2 small">
          <div className="d-flex justify-content-between mb-1">
            <span className="text-muted">Lat/Long:</span>
            <span>{text(landing?.latitude)} , {text(landing?.longitude)}</span>
          </div>
          <div className="d-flex justify-content-between mb-1">
            <span className="text-muted">Speed:</span>
            <span>{kn(landing?.speed)}</span>
          </div>
          <div className="d-flex justify-content-between">
            <span className="text-muted">Course:</span>
            <span>{deg(landing?.course)}</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  {/* 2) Communication (Master & Chief Engineer only) */}
  <div className="col-12 col-md-6 col-xl-4">
    <div className="bg-white p-3 border h-100">
      <h5 className="text-primary fw-bold">Communication</h5>

      <div className="mt-2">
        <div className="mb-3">
          <h6 className="fw-bold mb-2">Master (Captain)</h6>
          <div className="small mb-1">
            <span className="text-muted">Name:</span>
            <span className="ms-2">{text(landing?.masterName)}</span>
          </div>
          <div className="small mb-1">
            <span className="text-muted">Phone:</span>
            <a
              href="#"
              className="ms-2"
              onClick={(e) => { e.preventDefault(); if (landing?.masterContactNumber) handleWhatsAppClick(landing.masterContactNumber) }}
            >
              {text(landing?.masterContactNumber)}
            </a>
          </div>
          <div className="small">
            <span className="text-muted">Email:</span>
            <span className="ms-2">{text(landing?.masterEmail)}</span>
          </div>
        </div>

        <div>
          <h6 className="fw-bold mb-2">Chief Engineer</h6>
          <div className="small mb-1">
            <span className="text-muted">Name:</span>
            <span className="ms-2">{text(landing?.chiefEngineerName)}</span>
          </div>
          <div className="small mb-1">
            <span className="text-muted">Phone:</span>
            <a
              href="#"
              className="ms-2"
              onClick={(e) => { e.preventDefault(); if (landing?.chiefEngineerContactNumber) handleWhatsAppClick(landing.chiefEngineerContactNumber) }}
            >
              {text(landing?.chiefEngineerContactNumber)}
            </a>
          </div>
          <div className="small">
            <span className="text-muted">Email:</span>
            <span className="ms-2">{text(landing?.chiefEngineerEmail)}</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  {/* 3) Voyage Information (use latestVoyage.voyageNumber) */}
  <div className="col-12 col-md-6 col-xl-4">
    <div className="bg-white p-3 border h-100">
      <h5 className="text-primary fw-bold">Voyage Information</h5>
      <div className="mt-2 p-2 rounded" style={{ background: '#f8f9fa', border: '1px solid #e9ecef' }}>
        <div className="d-flex justify-content-between small mb-1">
          <span className="text-muted">Voyage:</span>
          <span>{text(landing?.latestVoyage?.voyageNumber)}</span>
        </div>
        <div className="d-flex justify-content-between small mb-1">
          <span className="text-muted">Last Port:</span>
          <span>{text(landing?.lastPort)}</span>
        </div>
        <div className="d-flex justify-content-between small mb-1">
          <span className="text-muted">Next Port:</span>
          <span>{text(landing?.nextPort)}</span>
        </div>
        <div className="d-flex justify-content-between small mb-1">
          <span className="text-muted">Distance:</span>
          <span>{nm(landing?.distanceObserved)}</span>
        </div>
        <div className="d-flex justify-content-between small">
          <span className="text-muted">Cargo:</span>
          <span>{mt(landing?.cargoWeight)}</span>
        </div>
      </div>
    </div>
  </div>

  {/* 4) Reserved */}
  {/* <div className="col-12 col-md-6 col-xl-3">
    <div className="bg-white p-3 border h-100 d-flex flex-column align-items-center justify-content-center text-center">
      <KTSVG path="/media/icons/duotune/general/gen045.svg" className="svg-icon-3x text-muted mb-2" />
      <h6 className="text-muted mb-1">Reserved for Future Features</h6>
      <p className="small text-secondary mb-0">This section will be updated</p>
    </div>
  </div> */}
</div>




          </div>
        </div>
      </div>

      {isQ88ModalOpen && (
        <div style={{ position: 'relative', zIndex: 1060 }}>
          <ViewVesselModal
            isOpen={isQ88ModalOpen}
            onClose={() => setIsQ88ModalOpen(false)}
            vesselData={vesselData}
          />
        </div>
      )}

      {/* Full Screen Map Modal */}
      {isMapExpanded && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            zIndex: 1070,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setIsMapExpanded(false)}
        >
          <div 
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              maxWidth: '1400px',
              maxHeight: '900px',
              backgroundColor: 'white',
              borderRadius: '8px',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Map Close Button */}
            <button 
              onClick={() => setIsMapExpanded(false)}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                zIndex: 1,
                width: '40px',
                height: '40px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: 'white',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                color: '#666'
              }}
            >
              ×
            </button>
            
            {/* Full Screen Map */}
            <div style={{ width: '100%', height: '100%' }}>
  <MapView vesselMarkers={[singleVesselMarker]} height="100%" />
</div>

          </div>
        </div>
      )}
    </>
  )
}

export default VesselLandingModal