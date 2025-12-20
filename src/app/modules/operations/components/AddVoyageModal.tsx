import React, { useEffect, useState } from 'react';
import { useAuth } from '../../auth';
import { getVesselList } from '../../Management/core/_requests';
import { Vessel } from '../../Management/core/_models';
import { toast } from 'react-toastify';
import { KTSVG } from '../../../../_metronic/helpers';
import { createVoyage, getVoyageNumber } from '../core/_requests';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onVoyageAdded: () => void;
}

const AddVoyageModal: React.FC<Props> = ({ onClose, isOpen, onVoyageAdded }) => {
    const [voyageNumber, setVoyageNumber] = useState('');
    const [vessels, setVessels] = useState<Vessel[]>([]);
    const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null);
    const [departurePort, setDeparturePort] = useState('');
    const [arrivalPort, setArrivalPort] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [legId, setLegId] = useState('');
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');
    const [securityLevel, setSecurityLevel] = useState('');
    const [iceVoyage, setIceVoyage] = useState(false);
    const [eca, setEca] = useState(false);
    const [cosp, setCosp] = useState('');
    const [eosp, setEosp] = useState('');
    const [arrivalFew, setArrivalFew] = useState('');
    const [eta, setEta] = useState('');
    const [estimatedDistance, setEstimatedDistance] = useState('');
    const [displacement, setDisplacement] = useState('');
    const [draftFore, setDraftFore] = useState('');
    const [draftMid, setDraftMid] = useState('');
    const [draftAft, setDraftAft] = useState('');
    const [totalCargoOnboard, setTotalCargoOnboard] = useState('');
    const [loadingCondition, setLoadingCondition] = useState('');
    const [chartererName, setChartererName] = useState('');
    const [chartererNo, setChartererNo] = useState('');
    const [cpSpeed, setCpSpeed] = useState('');
    const [cpConsumptionTotal, setCpConsumptionTotal] = useState('');
    // const roleEntityId = sessionStorage.getItem("roleEntityId");
    // const roleId = sessionStorage.getItem("roleId");
    const { currentUser } = useAuth()
    const roleId = currentUser?.role?.id;
    const roleEntityId = currentUser?.roleEntityId;
    const vesselId = currentUser?.vessel?.id;

    useEffect(() => {
        fetchVessels();
        if(roleId === 4 && vesselId)
        {
            fetchVoyageNumber(vesselId)
        }
    }, []);

    const fetchVessels = async () => {
        try {
            const vesselList = await getVesselList();
            let filteredVessels: Vessel[] = []
            if (roleId === 5) {
                filteredVessels = vesselList.filter(vessel => vessel.active && vessel.companyGroupAdmin?.id === roleEntityId)
            } else if (roleId === 2) {
                filteredVessels = vesselList.filter(vessel => vessel.active && vessel.companyAdmin?.id === roleEntityId)
            } else {
                filteredVessels = vesselList
            }
            console.log(filteredVessels);
            setVessels(filteredVessels);
        } catch (error) {
            console.error('Failed to fetch vessel list:', error);
        }
    };
    const fetchVoyageNumber = async (vesselId: number) => {
        try {
            const response = await getVoyageNumber(vesselId);

            console.log(voyageNumber);
            setVoyageNumber(response.voyageNumber);
        } catch (error) {
            console.error('Failed to fetch vessel list:', error);
        }
    };

    const handleSubmit = async () => {
        if (!voyageNumber || !departurePort || !arrivalPort || !startDate) {
            setError('Please fill in all fields.');
            return;
        }

        try {

            // Use selectedVesselId for role 2 or 5
            const vesselId =
                roleId === 2 || roleId === 5 || roleId === 1 || roleId === 6
                    ? selectedVessel?.id
                    : currentUser?.vessel?.id;

          const companyId = roleId === 6 ? currentUser?.companyGroupAdminId  :
                roleId === 2
                    ? selectedVessel?.companyAdmin?.id
                    : roleId === 5 || roleId === 1
                        ? selectedVessel?.companyGroupAdmin?.id
                        : currentUser?.vessel?.companyGroupAdminId;


            await createVoyage(
                voyageNumber,
                departurePort,
                arrivalPort,
                startDate,
                endDate,
                `${departurePort} - ${arrivalPort}`,
                Number(vesselId),
                Number(companyId),
                legId,
                status,
                securityLevel,
                iceVoyage,
                eca,
                cosp,
                eosp,
                arrivalFew,
                eta,
                estimatedDistance,
                displacement,
                draftFore,
                draftMid,
                draftAft,
                totalCargoOnboard,
                loadingCondition,
                chartererName,
                chartererNo,
                cpSpeed,
                cpConsumptionTotal
            );

            toast.success("Voyage added successfully");

            onVoyageAdded();
            clearForm();
            onClose();
        } catch (err) {
            console.error('Failed to add voyage:', err);
            setError("Failed to add voyage.");
            toast.error("Failed to add voyage.");
        }
        setError('');

    };

    const clearForm = () => {
        setVoyageNumber('');
        setDeparturePort('');
        setArrivalPort('');
        setStartDate('');
        setEndDate('');
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '70rem' }}
            >
                <div className="custom-modal-header d-flex justify-content-between align-items-center">
                    <h5 className="m-0">Add Voyage</h5>
                    <button className="close-btn" onClick={onClose}>
                        <KTSVG path='/media/map/x.svg' className='svg-icon-2x' />
                    </button>
                </div>

                <div className="custom-modal-body">
                    {error && <div className="alert alert-danger">{error}</div>}

                    <div className="row">
                        {(roleId === 2 || roleId === 5 || roleId === 1 || roleId === 6) && <div className="col-md-4 mb-3">
                            <label htmlFor="vessel" className="modal_label">Select Vessel <span className="text-danger">*</span></label>
                            <select
                                id="vessel"
                                className="form-control"
                                value={selectedVessel?.id}
                                onChange={(e) => {
                                    const vesselId = Number(e.target.value);
                                    const vessel = vessels.find(v => v.id === vesselId) || null;
                                    setSelectedVessel(vessel);
                                    fetchVoyageNumber(vesselId);
                                }}                            >
                                <option value="">-- Select Vessel --</option>
                                {vessels.map((vessel) => (
                                    <option key={vessel.id} value={vessel.id}>
                                        {vessel.fleet_name}
                                    </option>
                                ))}
                            </select>
                        </div>}
                        <div className="col-md-4 mb-3">
                            <label className="modal_label">Voyage Number <span className="text-danger">*</span></label>
                            <input
                                type="text"
                                className="form-control"
                                value={voyageNumber}
                                onChange={(e) => setVoyageNumber(e.target.value)}
                                readOnly
                            />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className="modal_label">Departure Port <span className="text-danger">*</span></label>
                            <input
                                type="text"
                                className="form-control"
                                value={departurePort}
                                onChange={(e) => setDeparturePort(e.target.value)}
                            />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className="modal_label">Arrival Port <span className="text-danger">*</span></label>
                            <input
                                type="text"
                                className="form-control"
                                value={arrivalPort}
                                onChange={(e) => setArrivalPort(e.target.value)}
                            />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className="modal_label">Departure Datetime <span className="text-danger">*</span></label>
                            <input
                                type="datetime-local"
                                className="form-control"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className="modal_label">Arrival Datetime </label>
                            <input
                                type="datetime-local"
                                className="form-control"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className="modal_label">Status</label>
                            <input type="text" className="form-control" value={status} onChange={(e) => setStatus(e.target.value)} />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className="modal_label">Leg ID</label>
                            <input type="text" className="form-control" value={legId} onChange={(e) => setLegId(e.target.value)} />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className="modal_label">Security Level</label>
                            <input type="text" className="form-control" value={securityLevel} onChange={(e) => setSecurityLevel(e.target.value)} />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className="modal_label">Ice Voyage</label>
                            <input type="checkbox" className="form-check-input" checked={iceVoyage} onChange={(e) => setIceVoyage(e.target.checked)} />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className="modal_label">ECA</label>
                            <input type="checkbox" className="form-check-input" checked={eca} onChange={(e) => setEca(e.target.checked)} />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className="modal_label">COSP</label>
                            <input type="datetime-local" className="form-control" value={cosp} onChange={(e) => setCosp(e.target.value)} />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className="modal_label">EOSP</label>
                            <input type="datetime-local" className="form-control" value={eosp} onChange={(e) => setEosp(e.target.value)} />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className="modal_label">Arrival FEW</label>
                            <input type="datetime-local" className="form-control" value={arrivalFew} onChange={(e) => setArrivalFew(e.target.value)} />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className="modal_label">ETA</label>
                            <input type="datetime-local" className="form-control" value={eta} onChange={(e) => setEta(e.target.value)} />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className="modal_label">Estimated Distance</label>
                            <input type="number" className="form-control" value={estimatedDistance} onChange={(e) => setEstimatedDistance(e.target.value)} />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className="modal_label">Displacement</label>
                            <input type="number" className="form-control" value={displacement} onChange={(e) => setDisplacement(e.target.value)} />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className="modal_label">Draft Fore</label>
                            <input type="number" className="form-control" value={draftFore} onChange={(e) => setDraftFore(e.target.value)} />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className="modal_label">Draft Mid</label>
                            <input type="number" className="form-control" value={draftMid} onChange={(e) => setDraftMid(e.target.value)} />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className="modal_label">Draft Aft</label>
                            <input type="number" className="form-control" value={draftAft} onChange={(e) => setDraftAft(e.target.value)} />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className="modal_label">Total Cargo Onboard</label>
                            <input type="number" className="form-control" value={totalCargoOnboard} onChange={(e) => setTotalCargoOnboard(e.target.value)} />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className="modal_label">Loading Condition</label>
                            <input type="text" className="form-control" value={loadingCondition} onChange={(e) => setLoadingCondition(e.target.value)} />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className="modal_label">Charterer Name</label>
                            <input type="text" className="form-control" value={chartererName} onChange={(e) => setChartererName(e.target.value)} />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className="modal_label">Charterer No</label>
                            <input type="text" className="form-control" value={chartererNo} onChange={(e) => setChartererNo(e.target.value)} />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className="modal_label">CP Speed</label>
                            <input type="number" className="form-control" value={cpSpeed} onChange={(e) => setCpSpeed(e.target.value)} />
                        </div>

                        <div className="col-md-4 mb-3">
                            <label className="modal_label">CP Consumption Total</label>
                            <input type="number" className="form-control" value={cpConsumptionTotal} onChange={(e) => setCpConsumptionTotal(e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="d-flex justify-content-end gap-2">
                    <button className="btn btn_secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn_success" onClick={handleSubmit}>Save</button>
                </div>
            </div>
        </div>
    );

};


export default AddVoyageModal;
