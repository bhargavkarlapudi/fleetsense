import React, { useEffect, useState } from 'react'
import html2pdf from 'html2pdf.js'
import { getGeneralInfoOfVessel } from '../core/_requests'
import { VesselGeneralInfo } from '../core/_models'
import { getForUSACalls } from '../core/_requests'
import { ForUSACalls } from '../core/_models'
import {
  getSafetyHelicopter,
  getTankCoating,
  getBallast,
} from '../core/_requests'
import {
  SafetyHelicopter,
  TankCoating,
  Ballast,
} from '../core/_models'
import { getCargoSystem } from '../core/_requests'
import { CargoSystem } from '../core/_models'
import { getVacuumSystem, getPropulsionSystem } from '../core/_requests'
import { VacuumSystem, PropulsionSystem } from '../core/_models'



interface Props {
  isOpen: boolean
  onClose: () => void
  vesselData: { id: number; fleet_name?: string; imoNumber?: string } // minimal
}

const ViewVesselModal: React.FC<Props> = ({ isOpen, onClose, vesselData }) => {
  const [generalInfo, setGeneralInfo] = useState<VesselGeneralInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usaCalls, setUsaCalls] = useState<ForUSACalls | null>(null)
const [loadingUsa, setLoadingUsa] = useState(false)
const [errorUsa, setErrorUsa] = useState<string | null>(null)
// … alongside your generalInfo + usaCalls state …
const [safetyHeli, setSafetyHeli] = useState<SafetyHelicopter | null>(null)
const [loadingSafety, setLoadingSafety] = useState(false)
const [errorSafety, setErrorSafety] = useState<string | null>(null)

const [tankCoating, setTankCoating] = useState<TankCoating | null>(null)
const [loadingCoating, setLoadingCoating] = useState(false)
const [errorCoating, setErrorCoating] = useState<string | null>(null)

const [ballastInfo, setBallastInfo] = useState<Ballast | null>(null)
const [loadingBallast, setLoadingBallast] = useState(false)
const [errorBallast, setErrorBallast] = useState<string | null>(null)
const [cargoSystem, setCargoSystem] = useState<CargoSystem | null>(null)
const [loadingCargo, setLoadingCargo] = useState(false)
const [errorCargo, setErrorCargo] = useState<string | null>(null)
// VACUUM
const [vacuumSystem, setVacuumSystem] = useState<VacuumSystem | null>(null)
const [loadingVacuum, setLoadingVacuum] = useState(false)
const [errorVacuum, setErrorVacuum] = useState<string | null>(null)
// PROPULSION
const [propulsionSystem, setPropulsionSystem] = useState<PropulsionSystem | null>(null)
const [loadingPropulsion, setLoadingPropulsion] = useState(false)
const [errorPropulsion, setErrorPropulsion] = useState<string | null>(null)

// NEW: helper that turns "not found" responses into empty data instead of errors
const fetchOrNull = async <T,>(
  runner: () => Promise<T>,
  setData: (v: T | null) => void,
  setError: (v: string | null) => void,
  setLoading: (v: boolean) => void
) => {
  setLoading(true);
  setError(null);
  try {
    const data = await runner();
    setData(data ?? null);
  } catch (err: any) {
    const msg =
      err?.response?.data?.message ||
      err?.message ||
      'Request failed';
    // treat all "not found" style messages as empty state
    if (/not\s*found/i.test(msg)) {
      setData(null);
      setError(null);
    } else {
      setError(msg);
    }
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
  if (!isOpen) return;
  fetchOrNull<VesselGeneralInfo>(
    () => getGeneralInfoOfVessel(vesselData.id),
    setGeneralInfo,
    setError,
    setLoading
  );
}, [isOpen, vesselData.id]);


  useEffect(() => {
  if (!isOpen) return;
  fetchOrNull<ForUSACalls>(
    () => getForUSACalls(vesselData.id),
    setUsaCalls,
    setErrorUsa,
    setLoadingUsa
  );
}, [isOpen, vesselData.id]);

useEffect(() => {
  if (!isOpen) return;
  fetchOrNull<SafetyHelicopter>(
    () => getSafetyHelicopter(vesselData.id),
    setSafetyHeli,
    setErrorSafety,
    setLoadingSafety
  );
}, [isOpen, vesselData.id]);


useEffect(() => {
  if (!isOpen) return;
  fetchOrNull<TankCoating>(
    () => getTankCoating(vesselData.id),
    setTankCoating,
    setErrorCoating,
    setLoadingCoating
  );
}, [isOpen, vesselData.id]);



useEffect(() => {
  if (!isOpen) return;
  fetchOrNull<Ballast>(
    () => getBallast(vesselData.id),
    setBallastInfo,
    setErrorBallast,
    setLoadingBallast
  );
}, [isOpen, vesselData.id]);


useEffect(() => {
  if (!isOpen) return;
  fetchOrNull<CargoSystem>(
    () => getCargoSystem(vesselData.id),
    setCargoSystem,
    setErrorCargo,
    setLoadingCargo
  );
}, [isOpen, vesselData.id]);

useEffect(() => {
  if (!isOpen) return;
  fetchOrNull<VacuumSystem>(
    () => getVacuumSystem(vesselData.id),
    setVacuumSystem,
    setErrorVacuum,
    setLoadingVacuum
  );
}, [isOpen, vesselData.id]);


useEffect(() => {
  if (!isOpen) return;
  fetchOrNull<PropulsionSystem>(
    () => getPropulsionSystem(vesselData.id),
    setPropulsionSystem,
    setErrorPropulsion,
    setLoadingPropulsion
  );
}, [isOpen, vesselData.id]);




  const displayField = (label: string, value: string | number | undefined) => (
    <div className="col-md-6 mb-3">
      <label className="modal_label fw-semibold">{label}</label>
      <div className="form-control-plaintext border rounded p-2 bg-light">{value ?? '-'}</div>
    </div>
  );

  const exportGeneralInfoToPDF = () => {
    const element = document.querySelector('.pdf-content');
    if (!element) return;

    const opt = {
      margin: 10,
      filename: 'INTERTANKO_CHARTERING_QUESTIONNAIRE_88.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };

    html2pdf().set(opt).from(element).save();
  };

    if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '60rem' }}
      >
        {/* Header with Download at top */}
        <div className="custom-modal-header d-flex justify-content-between align-items-center">
          <h5 className="m-0">View Vessel</h5>
          <div>
            <button
              className="btn btn-primary btn-sm me-2"
              onClick={exportGeneralInfoToPDF}
            >
              Download PDF
            </button>
            <button
              className="close-btn btn btn-sm btn-light"
              onClick={onClose}
            >
              x
            </button>
          </div>
        </div>

        <div className="custom-modal-body p-4">
{loading ? <p>Loading...</p> : null}
{error ? <div className="alert alert-warning">Some data couldn’t be loaded. Missing fields are shown as “-”.</div> : null}
          {/* {!loading && !error && generalInfo && ( */}
          <div className="pdf-content">
            {/* Header */}
            <div className="header-section mb-4">
              <div className="d-flex justify-content-between align-items-center">
                <span>
                  INTERTANKO CHARTERING QUESTIONNAIRE 88 - OIL / CHEMICAL
                </span>
                <span>Version 6</span>
              </div>
            </div>

            {/* Main Table */}
            <table className="custom-vessel-table w-100">
              <tbody>
                {/* Section 1: General Information */}
                <tr>
                  <th colSpan={3} className="section-header">
                    1. GENERAL INFORMATION
                  </th>
                </tr>
                <tr>
                  <td className="number-col">1.1</td>
                  <td className="label-col">
                    Vessel's name (IMO number):
                  </td>
                  <td>
                      {generalInfo?.vesselName} ({ vesselData.imoNumber})
                    </td>
                </tr>
                <tr>
                  <td className="number-col">1.1b</td>
                  <td className="label-col">
                    Is the vessel owner/manager a member of INTERTANKO? If yes,
                    please provide IMO number of the vessel or organization
                  </td>
                 <td>
                      {generalInfo?.isIntertankoMember ? 'Yes' : 'No'}
                      {generalInfo?.isIntertankoMember && ` — ${generalInfo?.intertankoMemberImo}`}
                    </td>
                </tr>
                <tr>
                  <td className="number-col">1.2</td>
                  <td className="label-col">
                    Vessel's previous name(s) and date(s) of change:
                  </td>
                  <td>
                      {Object.entries(generalInfo?.previousNamesAndDates ?? {})
                        .map(([name, date]) => `${name} (${date})`)
                        .join(' — ') || '-'}
                    </td>
                </tr>
                <tr>
                  <td className="number-col">1.3</td>
                  <td className="label-col">
                    Date delivered/Builder (where built):
                  </td>
                   <td>
                      {generalInfo?.dateDelivered} / {generalInfo?.builder}
                    </td>
                </tr>
                <tr>
                  <td className="number-col">1.4</td>
                  <td className="label-col">Flag/Port of Registry:</td>
                  <td>{generalInfo?.flagPortOfRegistry}</td>
                </tr>
                <tr>
                  <td className="number-col">1.5</td>
                  <td className="label-col">Call sign/MMSI:</td>
                  <td>{generalInfo?.callSignMmsi}</td>
                </tr>
                <tr>
                  <td className="number-col">1.6</td>
                  <td className="label-col">
                    Vessel's contact details (satcom/fax/email etc.):
                  </td>
                  <td>
                      Tel: {generalInfo?.contactTel}
                      <br />
                      Fax: {generalInfo?.contactFax}
                      <br />
                      Email: {generalInfo?.contactEmail}
                    </td>
                </tr>
                <tr>
                  <td className="number-col">1.7</td>
                  <td className="label-col">
                    Type of vessel (as described in Form A or Form B Q1.11 of
                    the IOPPC):
                  </td>
                  <td>
                      {generalInfo?.vesselTypeIoppc}
                      {generalInfo?.otherVesselType && ` / ${generalInfo?.otherVesselType}`}
                    </td>
                </tr>
                {/* <tr>
                  <td className="number-col">1.7a</td>
                  <td className="label-col">
                    If other type of vessel, please specify:
                  </td>
                  <td>{vesselData.otherVesselType || 'NA'}</td>
                </tr> */}
                <tr>
                  <td className="number-col">1.8</td>
                  <td className="label-col">Type of hull:</td>
                   <td>{generalInfo?.hullType}</td>
                </tr>

               {/* Section 2: Ownership and Operation */}
<tr>
  <td colSpan={3} className="subsection-header">
    Ownership and Operation
  </td>
</tr>
<tr>
  <td className="number-col">1.10</td>
  <td className="label-col">
    Registered owner – Full style: IMO Number
  </td>
  <td>
    {generalInfo?.registeredOwner || '-'}{' '}
    {generalInfo?.registeredOwnerImo && `(IMO ${generalInfo.registeredOwnerImo})`}
  </td>
</tr>
<tr>
  <td className="number-col">1.11</td>
  <td className="label-col">
    Technical operator – Full style:
  </td>
  <td>
    {generalInfo?.technicalOperator || '-'}{' '}
    {generalInfo?.technicalOperatorImo && `(IMO ${generalInfo.technicalOperatorImo})`}
  </td>
</tr>

{/* Section 4: Classification */}
<tr>
  <td colSpan={3} className="subsection-header">
    Classification
  </td>
</tr>
<tr>
  <td className="number-col">1.18</td>
  <td className="label-col">Classification society:</td>
  <td>{generalInfo?.classificationSociety || '-'}</td>
</tr>
<tr>
  <td className="number-col">1.18a</td>
  <td className="label-col">
    Is Classification Society an IACS member?
  </td>
  <td>
    {generalInfo?.classificationSocietyIacsMember
      ? 'Yes'
      : 'No'}
  </td>
</tr>
<tr>
  <td className="number-col">1.19</td>
  <td className="label-col">Class notation:</td>
  <td>{generalInfo?.classNotation || '-'}</td>
</tr>
<tr>
  <td className="number-col">1.20</td>
  <td className="label-col">
    Does the vessel have any open conditions of Class? If yes list all open conditions
  </td>
  <td>{generalInfo?.openConditionsOfClass || 'None'}</td>
</tr>
<tr>
  <td className="number-col">1.22</td>
  <td className="label-col">
    Does the vessel have ice class? If yes, state what level:
  </td>
  <td>{generalInfo?.iceClassLevel || 'No'}</td>
</tr>

{/* Section: Dimensions */}
<tr>
  <td colSpan={3} className="subsection-header">Dimensions</td>
</tr>
<tr>
  <td className="number-col">1.27</td>
  <td className="label-col">Length overall (LOA):</td>
  <td>{generalInfo?.lengthOverall != null ? `${generalInfo.lengthOverall} m` : '-'}</td>
</tr>
<tr>
  <td className="number-col">1.28</td>
  <td className="label-col">Length between perpendiculars (LBP):</td>
  <td>{generalInfo?.lengthBetweenPerpendiculars != null ? `${generalInfo.lengthBetweenPerpendiculars} m` : '-'}</td>
</tr>
<tr>
  <td className="number-col">1.29</td>
  <td className="label-col">Extreme breadth (beam):</td>
  <td>{generalInfo?.extremeBreadth != null ? `${generalInfo.extremeBreadth} m` : '-'}</td>
</tr>
<tr>
  <td className="number-col">1.30</td>
  <td className="label-col">Moulded depth:</td>
  <td>{generalInfo?.mouldedDepth != null ? `${generalInfo.mouldedDepth} m` : '-'}</td>
</tr>
<tr>
  <td className="number-col">1.31</td>
  <td className="label-col">
    Keel to masthead (KTM)/Keel to masthead (KTM) in collapsed condition, if applicable:
  </td>
  <td>
    {generalInfo?.keelToMastheadHeight != null
      ? `${generalInfo.keelToMastheadHeight} m`
      : '-'}{' '}
    /{' '}
    {generalInfo?.keelToMastheadCollapsed != null
      ? `${generalInfo.keelToMastheadCollapsed} m`
      : '-'}
  </td>
</tr>
<tr>
  <td className="number-col">1.32</td>
  <td className="label-col">Distance bridge front to center of manifold:</td>
  <td>
    {generalInfo?.bridgeFrontToManifoldCentre != null
      ? `${generalInfo.bridgeFrontToManifoldCentre} m`
      : '-'}
  </td>
</tr>
<tr>
  <td className="number-col">1.33</td>
  <td className="label-col">
    Bow to center manifold (BCM)/Stern to center manifold (SCM):
  </td>
  <td>
    {generalInfo?.bowToManifoldCentre != null
      ? `${generalInfo.bowToManifoldCentre} m`
      : '-'}{' '}
    /{' '}
    {generalInfo?.sternToManifoldCentre != null
      ? `${generalInfo.sternToManifoldCentre} m`
      : '-'}
  </td>
</tr>
<tr>
  <td className="number-col">1.34</td>
  <td className="label-col">Parallel body distances</td>
  <td>
    <table className="custom-vessel-table">
      <thead>
        <tr>
          <th></th>
          <th>Lightship</th>
          <th>Normal Ballast</th>
          <th>Summer Dwt</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Forward to mid-point manifold:</td>
          <td>
            {generalInfo?.lightshipForwardToMid != null
              ? `${generalInfo.lightshipForwardToMid} m`
              : '-'}
          </td>
          <td>
            {generalInfo?.normalBallastForwardToMid != null
              ? `${generalInfo.normalBallastForwardToMid} m`
              : '-'}
          </td>
          <td>
            {generalInfo?.summerDwtForwardToMid != null
              ? `${generalInfo.summerDwtForwardToMid} m`
              : '-'}
          </td>
        </tr>
        <tr>
          <td>Aft to mid-point manifold:</td>
          <td>
            {generalInfo?.lightshipAftToMid != null
              ? `${generalInfo.lightshipAftToMid} m`
              : '-'}
          </td>
          <td>
            {generalInfo?.normalBallastAftToMid != null
              ? `${generalInfo.normalBallastAftToMid} m`
              : '-'}
          </td>
          <td>
            {generalInfo?.summerDwtAftToMid != null
              ? `${generalInfo.summerDwtAftToMid} m`
              : '-'}
          </td>
        </tr>
        <tr>
          <td>Parallel body length:</td>
          <td>
            {generalInfo?.lightshipParallelBody != null
              ? `${generalInfo.lightshipParallelBody} m`
              : '-'}
          </td>
          <td>
            {generalInfo?.normalBallastParallelBody != null
              ? `${generalInfo.normalBallastParallelBody} m`
              : '-'}
          </td>
          <td>
            {generalInfo?.summerDwtParallelBody != null
              ? `${generalInfo.summerDwtParallelBody} m`
              : '-'}
          </td>
        </tr>
      </tbody>
    </table>
  </td>
</tr>

      {/* --- Section 2: FOR USA CALLS --- */}
<tr>
  <th colSpan={3} className="section-header">2. FOR USA CALLS</th>
</tr>
{loadingUsa ? (
  <tr><td colSpan={3} className="text-center">Loading…</td></tr>
) : null}
<>
  <tr>
    <td className="number-col">2.1</td>
    <td className="label-col">Has the vessel Operator submitted a Vessel Spill Response Plan…</td>
    <td>{usaCalls?.submittedSpillResponsePlan ?? 'No'}</td>
  </tr>
  <tr>
    <td className="number-col">2.2</td>
    <td className="label-col">Qualified Individual (QI) – Full style:</td>
    <td>{usaCalls?.qualifiedIndividualFullStyle ?? '-'}</td>
  </tr>
  <tr>
    <td className="number-col">2.3</td>
    <td className="label-col">Oil Spill Response Organization (OSRO) – Full style:</td>
    <td>{usaCalls?.oilSpillResponseOrgFullStyle ?? '-'}</td>
  </tr>
  <tr>
    <td className="number-col">2.4</td>
    <td className="label-col">Salvage and Marine Firefighting Services (SMFF) – Full style:</td>
    <td>{usaCalls?.salvageAndMarineFirefightingServicesFullStyle ?? '-'}</td>
  </tr>
</>



{/* --- Section 3: SAFETY/HELICOPTER --- */}
<tr>
  <th colSpan={3} className="section-header">3. SAFETY/HELICOPTER</th>
</tr>
{loadingSafety ? (
  <tr><td colSpan={3} className="text-center">Loading…</td></tr>
) : null}
<>
  <tr>
    <td className="number-col">3.1</td>
    <td className="label-col">Winching / landing area details:</td>
    <td>{safetyHeli?.winchingAreaDetails ?? '-'}</td>
  </tr>
  <tr>
    <td className="number-col">3.2</td>
    <td className="label-col">Helicopter circle diameter:</td>
    <td>{safetyHeli?.helicopterCircleDiameter ?? '-'}</td>
  </tr>
</>


{/* --- Section 4: COATING/ANODES --- */}
<tr>
  <th colSpan={3} className="section-header">4. COATING/ANODES</th>
</tr>
{loadingCoating ? (
  <tr><td colSpan={3} className="text-center">Loading…</td></tr>
) : null}
<>
  <tr>
    <td className="number-col">4.1</td>
    <td className="label-col">Tank coating details:</td>
    <td>
      <table className="custom-vessel-table">
        <thead>
          <tr><th>Tank</th><th>Coated</th><th>Type</th><th>Extent</th><th>Anodes</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Cargo tanks</td>
            <td>{tankCoating?.cargoCoated ? 'Yes' : 'No'}</td>
            <td>{tankCoating?.cargoCoatingType ?? '-'}</td>
            <td>{tankCoating?.cargoCoatingExtent ?? '-'}</td>
            <td>{tankCoating?.cargoAnodes ? 'Yes' : 'No'}</td>
          </tr>
          <tr>
            <td>Ballast tanks</td>
            <td>{tankCoating?.ballastCoated ? 'Yes' : 'No'}</td>
            <td>{tankCoating?.ballastCoatingType ?? '-'}</td>
            <td>{tankCoating?.ballastCoatingExtent ?? '-'}</td>
            <td>{tankCoating?.ballastAnodes ? 'Yes' : 'No'}</td>
          </tr>
          <tr>
            <td>Slop tanks</td>
            <td>{tankCoating?.slopCoated ? 'Yes' : 'No'}</td>
            <td>{tankCoating?.slopCoatingType ?? '-'}</td>
            <td>{tankCoating?.slopCoatingExtent ?? '-'}</td>
            <td>{tankCoating?.slopAnodes ? 'Yes' : 'No'}</td>
          </tr>
        </tbody>
      </table>
    </td>
  </tr>
  <tr>
    <td className="number-col">4.2</td>
    <td className="label-col">Anodes Fitted (Ballast tanks):</td>
    <td>{tankCoating?.anodesFitted ? 'Yes' : 'No'}</td>
  </tr>
</>

{/* --- Section 5: BALLAST --- */}
<tr>
  <th colSpan={3} className="section-header">5. BALLAST</th>
</tr>
{loadingBallast ? (
  <tr><td colSpan={3} className="text-center">Loading…</td></tr>
) : null}
  <>
    <tr>
      <td className="number-col">5.1</td>
      <td className="label-col">Pump & Eductor details:</td>
      <td>
        <table className="custom-vessel-table">
          <thead>
            <tr>
              <th>Type</th><th>No.</th><th>Capacity</th><th>Head</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{ballastInfo?.pumpType ?? 'Ballast Pumps'}</td>
              <td>{ballastInfo?.pumpCount ?? '-'}</td>
              <td>{ballastInfo?.pumpCapacity ?? '-'}</td>
              <td>{ballastInfo?.pumpHead ?? '-'}</td>
            </tr>
            <tr>
              <td>{ballastInfo?.eductorType ?? 'Ballast Eductors'}</td>
              <td>{ballastInfo?.eductorCount ?? '-'}</td>
              <td>{ballastInfo?.eductorCapacity ?? '-'}</td>
              <td>{ballastInfo?.eductorHead ?? '-'}</td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
    <tr>
      <td className="number-col">5.2</td>
      <td className="label-col">Ballast handling data:</td>
      <td>{ballastInfo?.ballastHandlingData ?? '-'}</td>
    </tr>
    <tr>
      <td className="number-col">5.3</td>
      <td className="label-col">D1 performance:</td>
      <td>{ballastInfo?.d1Performance ? 'Yes' : 'No'}</td>
    </tr>
    <tr>
      <td className="number-col">5.4</td>
      <td className="label-col">D2 performance:</td>
      <td>{ballastInfo?.d2Performance ? 'Yes' : 'No'}</td>
    </tr>
    <tr>
      <td className="number-col">5.5</td>
      <td className="label-col">BWTS fitted?</td>
      <td>{ballastInfo?.bwtsFitted ? 'Yes' : 'No'}</td>
    </tr>
    <tr>
      <td className="number-col">5.6</td>
      <td className="label-col">BWTS type:</td>
      <td>{ballastInfo?.bwtsType ?? '-'}</td>
    </tr>
    <tr>
      <td className="number-col">5.7</td>
      <td className="label-col">BWTS manufacturer:</td>
      <td>{ballastInfo?.bwtsManufacturer ?? '-'}</td>
    </tr>
    <tr>
      <td className="number-col">5.8</td>
      <td className="label-col">IMO type approval:</td>
      <td>{ballastInfo?.imoTypeApproval ? 'Yes' : 'No'}</td>
    </tr>
    <tr>
      <td className="number-col">5.9</td>
      <td className="label-col">USCG approval:</td>
      <td>{ballastInfo?.uscgApproval ? 'Yes' : 'No'}</td>
    </tr>
  </>

{/* --- Section 6: CARGO – Oil --- */}
<tr>
  <th colSpan={3} className="section-header">6. CARGO – Oil</th>
</tr>
{loadingCargo ? (
  <tr><td colSpan={3} className="text-center">Loading…</td></tr>
) : null}
<>
    {/* 6.1 Centerline bulkhead */}
    <tr>
      <td className="number-col">6.1</td>
      <td className="label-col">
        Is vessel fitted with centerline bulkhead in all cargo tanks? If Yes, solid or perforated:
      </td>
      <td>
        {cargoSystem?.centerlineBulkheadFitted
          ? `Yes, ${cargoSystem.centerlineBulkheadType}`
          : 'No'}
      </td>
    </tr>

    {/* 6.2 Tank capacities */}
    <tr><td colSpan={3} className="subsection-header">Tank Capacities (98% full)</td></tr>
    <tr>
      <td className="number-col">6.2a</td>
      <td className="label-col">Centre / Total centre:</td>
      <td>
        {cargoSystem?.cargoTankCentre98Capacity ?? '-'} / 
        {cargoSystem?.cargoTankCentreTotalCount ?? '-'}
      </td>
    </tr>
    <tr>
      <td className="number-col">6.2b</td>
      <td className="label-col">Wing / Total wing:</td>
      <td>
        {cargoSystem?.cargoTankWing98Capacity ?? '-'} / 
        {cargoSystem?.cargoTankWingTotalCount ?? '-'}
      </td>
    </tr>
    <tr>
      <td className="number-col">6.2c</td>
      <td className="label-col">Deck / Total deck:</td>
      <td>
        {cargoSystem?.deckTank98Capacity ?? '-'} / 
        {cargoSystem?.deckTankTotalCount ?? '-'}
      </td>
    </tr>

    {/* 6.3 Segregation capacities */}
    <tr>
      <td className="number-col">6.3</td>
      <td className="label-col">Segregation capacities:</td>
      <td>{cargoSystem?.segregationCapacities ?? '-'}</td>
    </tr>

    {/* 6.4 Slops tank */}
    <tr>
      <td className="number-col">6.4</td>
      <td className="label-col">Slops tank (98% / 95% / count):</td>
      <td>
        {cargoSystem?.slopsTank98Capacity ?? '-'} / 
        {cargoSystem?.slopsTank95Capacity ?? '-'} / 
        {cargoSystem?.slopsTankTotalCount ?? '-'}
      </td>
    </tr>

    {/* 6.5 Grades & containment */}
    <tr>
      <td className="number-col">6.5</td>
      <td className="label-col">
        No. of grades for segregation & type of cargo containment:
      </td>
      <td>
        {cargoSystem?.gradesSegregationCount ?? '-'} grades / 
        {cargoSystem?.cargoContainmentType ?? '-'}
      </td>
    </tr>

    {/* 6.6 Filling restrictions */}
    <tr>
      <td className="number-col">6.6</td>
      <td className="label-col">
        Any filling restrictions? If yes, details:
      </td>
      <td>
        {cargoSystem?.fillingRestrictions
          ? cargoSystem.fillingRestrictionDetails
          : 'No'}
      </td>
    </tr>

    {/* 6.7 Loading rates */}
    <tr>
      <td className="number-col">6.7</td>
      <td className="label-col">Max loading with / without VECS:</td>
      <td>
        {cargoSystem?.maxLoadingWithVecs ?? '-'} / 
        {cargoSystem?.maxLoadingWithoutVecs ?? '-'}
      </td>
    </tr>
    <tr>
      <td className="number-col">6.8</td>
      <td className="label-col">Loaded per manifold / simultaneous:</td>
      <td>
        {cargoSystem?.loadedPerManifold ?? '-'} / 
        {cargoSystem?.loadedSimultaneously ?? '-'}
      </td>
    </tr>

    {/* 6.9 Cargo Control Room */}
    <tr>
      <td className="number-col">6.9</td>
      <td className="label-col">Cargo Control Room fitted?</td>
      <td>{cargoSystem?.cargoControlRoomFitted ? 'Yes' : 'No'}</td>
    </tr>
    <tr>
      <td className="number-col">6.10</td>
      <td className="label-col">Ullage readable from CCR?</td>
      <td>{cargoSystem?.ullageReadableFromCcr ? 'Yes' : 'No'}</td>
    </tr>

    {/* 6.11 Gauging & overflow */}
    <tr>
      <td className="number-col">6.11</td>
      <td className="label-col">
        Gauging certified & type / Overflow control & auto-close:
      </td>
      <td>
        Certified: {cargoSystem?.gaugingCertified ? 'Yes' : 'No'}<br/>
        Type: {cargoSystem?.gaugingSystemType ?? '-'}<br/>
        Overflow: {cargoSystem?.overflowControlFitted ? 'Yes' : 'No'}<br/>
        Auto-close: {cargoSystem?.overflowAutomaticClosing ? 'Yes' : 'No'}
      </td>
    </tr>

    {/* 6.12 Multipoint gauging */}
    <tr>
      <td className="number-col">6.12</td>
      <td className="label-col">
        Multipoint gauging fitted? Type & no. of portable units:
      </td>
      <td>
        {cargoSystem?.multipointGaugingFitted
          ? `${cargoSystem.multipointGaugingType}, units: ${cargoSystem.portableGaugingUnitsCount}`
          : 'No'}
      </td>
    </tr>

    {/* 6.13 Pumping systems */}
    <tr>
      <td className="number-col">6.13</td>
      <td className="label-col">No. of cargo pumps run simultaneously:</td>
      <td>{cargoSystem?.cargoPumpSimultaneousCount ?? '-'}</td>
    </tr>
    <tr>
      <td className="number-col">6.14</td>
      <td className="label-col">Cargo pump / eductor / stripping data:</td>
      <td>
        <table className="custom-vessel-table">
          <thead>
            <tr>
              <th>Type</th><th>No.</th><th>Capacity</th><th>Head (sg=1.0)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Cargo Pumps</td>
              <td>{cargoSystem?.cargoPumpCount ?? '-'}</td>
              <td>{cargoSystem?.cargoPumpCapacity ?? '-'}</td>
              <td>{cargoSystem?.cargoPumpHead ?? '-'}</td>
            </tr>
            <tr>
              <td>Cargo Eductors</td>
              <td>{cargoSystem?.cargoEductorCount ?? '-'}</td>
              <td>{cargoSystem?.cargoEductorCapacity ?? '-'}</td>
              <td>{cargoSystem?.cargoEductorHead ?? '-'}</td>
            </tr>
            <tr>
              <td>Stripping Pumps</td>
              <td>{cargoSystem?.strippingPumpCount ?? '-'}</td>
              <td>{cargoSystem?.strippingPumpCapacity ?? '-'}</td>
              <td>{cargoSystem?.strippingPumpHead ?? '-'}</td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
    <tr>
      <td className="number-col">6.15</td>
      <td className="label-col">Emergency portable pump provided?</td>
      <td>{cargoSystem?.emergencyPortablePumpProvided ? 'Yes' : 'No'}</td>
    </tr>

    {/* 6.16 Cleaning & washing */}
    <tr>
      <td className="number-col">6.16</td>
      <td className="label-col">Tank cleaning & washing systems:</td>
      <td>
        Fixed EQ: {cargoSystem?.cleaningEquipmentFixedInCargoTanks ? 'Yes' : 'No'}<br/>
        Portable EQ: {cargoSystem?.portableCleaningProvided ? 'Yes' : 'No'}<br/>
        Pump cap: {cargoSystem?.tankWashingPumpCapacity ?? '-'}<br/>
        Heater: {cargoSystem?.washingWaterHeaterFitted ? 'Yes' : 'No'}<br/>
        Max temp: {cargoSystem?.maxWashingWaterTemperature ?? '-'}<br/>
        Machines: {cargoSystem?.washingMachinesCount ?? '-'}
      </td>
    </tr>

    {/* 6.17 Monitoring & drier */}
    <tr>
      <td className="number-col">6.17</td>
      <td className="label-col">Remote monitoring & tank drier:</td>
      <td>
        Temp mon: {cargoSystem?.remoteTempMonitoringFitted
          ? cargoSystem.remoteTempMonitoringOperational ? 'Yes' : 'No'
          : 'No'}<br/>
        Press mon: {cargoSystem?.remotePressureMonitoringFitted
          ? cargoSystem.remotePressureMonitoringOperational ? 'Yes' : 'No'
          : 'No'}<br/>
        Drier: {cargoSystem?.cargoTankDrierFitted
          ? cargoSystem.cargoTankDrierOperational ? 'Yes' : 'No'
          : 'No'}<br/>
        Drier cap: {cargoSystem?.cargoTankDrierCapacity ?? '-'}
      </td>
    </tr>

    {/* 6.18 Cooling & steam */}
    <tr>
      <td className="number-col">6.18</td>
      <td className="label-col">Cargo cooling & steam availability:</td>
      <td>
        Cooling: {cargoSystem?.cargoCoolingSystemFitted
          ? cargoSystem.cargoCoolingSystemDetails
          : 'No'}<br/>
        Steam: {cargoSystem?.steamAvailableOnDeck ? 'Yes' : 'No'}
      </td>
    </tr>

    {/* 6.19 Manifolds & reducers */}
    <tr>
      <td className="number-col">6.19</td>
      <td className="label-col">Manifold heights & reducers:</td>
      <td>
        Ballast: {cargoSystem?.manifoldHeightNormalBallast ?? '-'}<br/>
        SDWT: {cargoSystem?.manifoldHeightSdwtCondition ?? '-'}<br/>
        Reducers: {cargoSystem?.reducerDetails ?? '-'}<br/>
        Stern manifold: {cargoSystem?.sternManifoldFitted
          ? cargoSystem.sternManifoldSize
          : 'No'}
      </td>
    </tr>

    {/* 6.20 Heating coils */}
    <tr>
      <td className="number-col">6.20</td>
      <td className="label-col">Heating coils & max/min cargo temp:</td>
      <td>
        Cargo: {cargoSystem?.cargoHeatingType}, coiled: {cargoSystem?.cargoHeatingCoiled ? 'Yes' : 'No'}, mat: {cargoSystem?.cargoHeatingMaterial}<br/>
        Slop: {cargoSystem?.slopHeatingType}, coiled: {cargoSystem?.slopHeatingCoiled ? 'Yes' : 'No'}, mat: {cargoSystem?.slopHeatingMaterial}<br/>
        Thermal oil: {cargoSystem?.thermalOilHeatingFitted
          ? cargoSystem.thermalOilSystemTanks
          : 'No'}<br/>
        Max/Min temp: {cargoSystem?.maxCargoTemperature} / {cargoSystem?.minCargoTemperature}
      </td>
    </tr>

    {/* 6.21 Valves & distances */}
    <tr>
      <td className="number-col">6.21</td>
      <td className="label-col">Valve type, material & distances:</td>
      <td>
        Valve: {cargoSystem?.manifoldValveType}<br/>
        Material: {cargoSystem?.manifoldMaterialRating}<br/>
        Centers: {cargoSystem?.distanceBetweenCargoManifoldCenters}<br/>
        Rail–manifold: {cargoSystem?.distanceShipRailToManifold}<br/>
        Manifold–side: {cargoSystem?.distanceManifoldToShipSide}<br/>
        Top rail–center: {cargoSystem?.topOfRailToCenterOfManifold}<br/>
        Deck–center: {cargoSystem?.distanceMainDeckToCenterOfManifold}<br/>
        Spill–grating: {cargoSystem?.distanceSpillTankGratingToCenterOfManifold}
      </td>
    </tr>

    {/* 6.22 VECS & VRS */}
    <tr>
      <td className="number-col">6.22</td>
      <td className="label-col">VRS / VECS details:</td>
      <td>
        VRS fitted: {cargoSystem?.vrsFitted ? 'Yes' : 'No'}<br/>
        OCIMF compliant: {cargoSystem?.vrsOcimfCompliant ? 'Yes' : 'No'}<br/>
        Segregations: {cargoSystem?.vrsSegregationCount}<br/>
        VECS cert: {cargoSystem?.vecCertificationFitted
          ? cargoSystem.vecCertificationIssuingAuthority
          : 'No'}<br/>
        Manifolds: {cargoSystem?.vecsManifoldCount} x {cargoSystem?.vecsManifoldSpecs}<br/>
        Reducers: {cargoSystem?.vecsReducerCount} x {cargoSystem?.vecsReducerSpecs}
      </td>
    </tr>

    {/* 6.23 Venting */}
    <tr>
      <td className="number-col">6.23</td>
      <td className="label-col">Type of venting system fitted:</td>
      <td>{cargoSystem?.ventingSystemType ?? '-'}</td>
    </tr>
  </>

{/* --- Section 7: VACUUM --- */}
<tr>
  <th colSpan={3} className="section-header">7. VACUUM</th>
</tr>
{loadingVacuum ? (
  <tr><td colSpan={3} className="text-center">Loading vacuum data…</td></tr>
) : null}
<>
    {/* 7.1 Mooring Wires */}
    <tr>
      <td colSpan={3} className="subsection-header">
        Mooring Wires (on drums)
      </td>
    </tr>
    <tr>
      <td className="number-col">7.1</td>
      <td className="label-col">Forecastle / Main deck fwd / Main deck aft / Poop deck:</td>
      <td style={{ whiteSpace: 'pre-wrap' }}>
        Forecastle: {vacuumSystem?.wiresForecastleCount ?? '-'} × Ø{vacuumSystem?.wiresForecastleDiameter ?? '-'}, {vacuumSystem?.wiresForecastleMaterial ?? '-'}, L={vacuumSystem?.wiresForecastleLength ?? '-'}, BS={vacuumSystem?.wiresForecastleBreakingStrength ?? '-'}<br/>
        Main fwd: {vacuumSystem?.wiresMainDeckFwdCount ?? '-'} × Ø{vacuumSystem?.wiresMainDeckFwdDiameter ?? '-'}, {vacuumSystem?.wiresMainDeckFwdMaterial ?? '-'}, L={vacuumSystem?.wiresMainDeckFwdLength ?? '-'}, BS={vacuumSystem?.wiresMainDeckFwdBreakingStrength ?? '-'}<br/>
        Main aft: {vacuumSystem?.wiresMainDeckAftCount ?? '-'} × Ø{vacuumSystem?.wiresMainDeckAftDiameter ?? '-'}, {vacuumSystem?.wiresMainDeckAftMaterial ?? '-'}, L={vacuumSystem?.wiresMainDeckAftLength ?? '-'}, BS={vacuumSystem?.wiresMainDeckAftBreakingStrength ?? '-'}<br/>
        Poop deck: {vacuumSystem?.wiresPoopDeckCount ?? '-'} × Ø{vacuumSystem?.wiresPoopDeckDiameter ?? '-'}, {vacuumSystem?.wiresPoopDeckMaterial ?? '-'}, L={vacuumSystem?.wiresPoopDeckLength ?? '-'}, BS={vacuumSystem?.wiresPoopDeckBreakingStrength ?? '-'}
      </td>
    </tr>

    {/* 7.2 Winches */}
    <tr>
      <td colSpan={3} className="subsection-header">
        Poop‐Deck Winches
      </td>
    </tr>
    <tr>
      <td className="number-col">7.2</td>
      <td className="label-col">Winches (on poop deck):</td>
      <td style={{ whiteSpace: 'pre-wrap' }}>
        {vacuumSystem?.winchesPoopDeckCount ?? '-'} × Ø{vacuumSystem?.winchesPoopDeckDiameter ?? '-'}, {vacuumSystem?.winchesPoopDeckMaterial ?? '-'}, L={vacuumSystem?.winchesPoopDeckLength ?? '-'}, BS={vacuumSystem?.winchesPoopDeckBrakingStrength ?? '-'}
      </td>
    </tr>

    {/* 7.3 Bollards & Bitts */}
    <tr>
      <td colSpan={3} className="subsection-header">
        Bollards & Bitts
      </td>
    </tr>
    <tr>
      <td className="number-col">7.3</td>
      <td className="label-col">Details:</td>
      <td >{vacuumSystem?.bollardsBittsDetails ?? '-'}</td>
    </tr>

    {/* 7.4 Fairleads & Chocks */}
    <tr>
      <td colSpan={3} className="subsection-header">
        Fairleads & Chocks
      </td>
    </tr>
    <tr>
      <td className="number-col">7.4</td>
      <td className="label-col">Details:</td>
      <td >{vacuumSystem?.fairleadsChocksDetails ?? '-'}</td>
    </tr>

    {/* 7.5 Shackles */}
    <tr>
      <td className="number-col">7.5</td>
      <td className="label-col">Shackles Port / Starboard:</td>
      <td>
        {vacuumSystem?.shacklesPortCount ?? '-'} / {vacuumSystem?.shacklesStarboardCount ?? '-'}
      </td>
    </tr>

    {/* 7.6 Emergency Towing */}
    <tr>
      <td className="number-col">7.6</td>
      <td className="label-col">Emergency Towing Fwd / Aft:</td>
      <td>
        {vacuumSystem?.emergencyTowingForwardType ?? '-'} (SWL {vacuumSystem?.emergencyTowingForwardSwl ?? '-'})<br/>
        {vacuumSystem?.emergencyTowingAftType ?? '-'} (SWL {vacuumSystem?.emergencyTowingAftSwl ?? '-'})
      </td>
    </tr>

    {/* 7.7 & 7.8 Other Vacuum Specs */}
    <tr>
      <td className="number-col">7.7</td>
      <td className="label-col">Stern chock / escort tug chock SWL / poop‐deck bollard SWL:</td>
      <td>
        Stern chock: {vacuumSystem?.sternChockFairleadSize ?? '-'}<br/>
        Escort tug chock SWL: {vacuumSystem?.escortTugChockFairleadSwl ?? '-'}<br/>
        Poop‐deck bollard SWL: {vacuumSystem?.poopDeckBollardSwl ?? '-'}
      </td>
    </tr>

    {/* 7.9 Crane & Gangway */}
    <tr>
      <td className="number-col">7.9</td>
      <td className="label-col">Crane / Gangway:</td>
      <td>
        Crane: {vacuumSystem?.craneDetails ?? '-'}<br/>
        Accom. ladder dir.: {vacuumSystem?.accommodationLadderDirection ?? '-'}<br/>
        Portable gangway: {vacuumSystem?.portableGangwayFitted ? `Yes, ${vacuumSystem.portableGangwayLength}` : 'No'}
      </td>
    </tr>

    {/* 7.10 SPM */}
    <tr>
      <td colSpan={3} className="subsection-header">
        Single Point Mooring (SPM) Equipment
      </td>
    </tr>
    <tr>
      <td className="number-col">7.10</td>
      <td className="label-col">
        OCIMF compliant / chain stoppers / distances / chock size:
      </td>
      <td style={{ whiteSpace: 'pre-wrap' }}>
        OCIMF compliant: {vacuumSystem?.spmOcimfCompliant ? 'Yes' : 'No'}<br/>
        Chain stoppers: {vacuumSystem?.spmChainStoppersCount ?? '-'}<br/>
        Details: {vacuumSystem?.spmChainStoppersDetails ?? '-'}<br/>
        Fairlead distance: {vacuumSystem?.spmFairleadDistance ?? '-'}<br/>
        Bow fairlead to bracket: {vacuumSystem?.spmBowFairleadToBracketDistance ?? '-'}<br/>
        Chock size OK: {vacuumSystem?.spmOcimfChockSizeOk ? 'Yes' : `No, ${vacuumSystem?.spmOcimfChockSizeDetails}`}
      </td>
    </tr>
  </>

{/* --- Section 8: PROPULSION --- */}
<tr>
  <th colSpan={3} className="section-header">8. PROPULSION</th>
</tr>
{loadingPropulsion ? (
  <tr><td colSpan={3} className="text-center">Loading propulsion data…</td></tr>
) : null}
<>

    {/* 8.1 Speed */}
    <tr>
      <td className="number-col">8.1</td>
      <td className="label-col">Speed (knots) Ballast / Laden (Max / Eco):</td>
      <td>
        Ballast: {propulsionSystem?.ballastSpeedMax ?? '-'} / {propulsionSystem?.ballastSpeedEconomical ?? '-'}<br/>
        Laden: {propulsionSystem?.ladenSpeedMax ?? '-'} / {propulsionSystem?.ladenSpeedEconomical ?? '-'}
      </td>
    </tr>

    {/* 8.2 Fuel */}
    <tr>
      <td className="number-col">8.2</td>
      <td className="label-col">Fuel for main propulsion / generating plant:</td>
      <td>
        Main: {propulsionSystem?.mainPropulsionFuel ?? '-'}<br/>
        Generating: {propulsionSystem?.generatingPlantFuel ?? '-'}
      </td>
    </tr>

    {/* 8.3 Bunker Tanks */}
    <tr>
      <td className="number-col">8.3</td>
      <td className="label-col">Bunker capacities (FO / DO / Other):</td>
      <td style={{ whiteSpace: 'pre-wrap' }}>
        FO: {propulsionSystem?.bunkerFuelOilCapacity ?? '-'}<br/>
        DO: {propulsionSystem?.bunkerDieselOilCapacity ?? '-'}<br/>
        Other: {propulsionSystem?.bunkerOtherSpecify ?? '-'}
      </td>
    </tr>

    {/* 8.4 Propeller */}
    <tr>
      <td className="number-col">8.4</td>
      <td className="label-col">Propeller pitch/type:</td>
      <td>{propulsionSystem?.propellerPitchType ?? '-'}</td>
    </tr>

    {/* 8.5 Engines / Boilers */}
    <tr>
      <td className="number-col">8.5</td>
      <td className="label-col">Main / Aux engines & boilers:</td>
      <td style={{ whiteSpace: 'pre-wrap' }}>
        Main engines: {propulsionSystem?.mainEngineCount} × {propulsionSystem?.mainEngineCapacity} ({propulsionSystem?.mainEngineMakeType})<br/>
        Aux engines: {propulsionSystem?.auxEngineCount} × {propulsionSystem?.auxEngineCapacity} ({propulsionSystem?.auxEngineMakeType})<br/>
        Power packs: {propulsionSystem?.powerPackCount} × {propulsionSystem?.powerPackCapacity}<br/>
        Boilers: {propulsionSystem?.boilerCount} × {propulsionSystem?.boilerCapacity} ({propulsionSystem?.boilerMakeType})
      </td>
    </tr>

    {/* 8.6 Thrusters */}
    <tr>
      <td colSpan={3} className="subsection-header">Bow / Stern Thrusters</td>
    </tr>
    <tr>
      <td className="number-col">8.6</td>
      <td className="label-col">Bow thruster BHP:</td>
      <td>{propulsionSystem?.bowThrusterBhp ?? '-'}</td>
    </tr>
    <tr>
      <td className="number-col">8.7</td>
      <td className="label-col">Stern thruster BHP:</td>
      <td>{propulsionSystem?.sternThrusterBhp ?? '-'}</td>
    </tr>

    {/* 8.8–8.11 EEDI/EEXI/CII/EIV */}
<tr>
  <td colSpan={3} className="subsection-header">Environmental / Emissions</td>
</tr>
{['EEDI','EEXI','CII','EIV'].map((r, i) => {
  const key = r.toLowerCase() as 'eedi'|'eexi'|'cii'|'eiv';
  // SAFE: use optional chaining on propulsionSystem and default to null
  const rec = (propulsionSystem as any)?.[key] ?? null;
  const rating     = rec?.[`${key}Rating`] ?? '-';
  const noReason   = rec?.[`${key}NoReason`] ?? '-';
  const verifiedBy = rec?.[`${key}VerifiedBy`] ?? '-';

  return (
    <tr key={i}>
      <td className="number-col">8.{8+i}</td>
      <td className="label-col">{r} Rating:</td>
      <td style={{ whiteSpace:'pre-wrap' }}>
        Rating: {rating}<br/>
        If no: {noReason}<br/>
        Verified by: {verifiedBy}
      </td>
    </tr>
  );
})}


    {/* 8.12 NOx & EGCS */}
    <tr>
      <td className="number-col">8.12</td>
      <td className="label-col">NOx control tier & equipment:</td>
      <td>
        Tier: {propulsionSystem?.noxControlTier ?? '-'}<br/>
        Equipment: {propulsionSystem?.noxEquipmentList ?? '-'}
      </td>
    </tr>
    <tr>
      <td className="number-col">8.13</td>
      <td className="label-col">EGCS fitted / type:</td>
      <td>
        {propulsionSystem?.egcsFitted ? `Yes, ${propulsionSystem?.scrubberType}` : 'No'}
      </td>
    </tr>
  </>


            </tbody>
          </table>
          </div>
          {/* )} */}
        </div>

        {/* Bottom Close button only */}
        <div className="d-flex justify-content-end border-top p-3">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewVesselModal;
