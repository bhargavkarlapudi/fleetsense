import React, { useEffect, useRef, useState } from 'react';
import { getVesselList } from '../../Management/core/_requests';
import { getCrewList, getRanks, signOnCrew } from '../core/_requests';
import { toast } from 'react-toastify';
import { Vessel } from '../../operations/core/_models';
import { Crew, Rank } from '../core/_models';

import { useAuth } from '../../auth';
import { KTSVG } from '../../../../_metronic/helpers';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the API response after a successful sign-on. */
  onSignedOn: (data: {
    id: number;
    vesselId: number;
    crewId: number;
    signOnDate: string;
    portSignOn: string;
    status: string;
    loginLink: string;
  }) => void;
}

const SignOnModal: React.FC<Props> = ({ onClose, isOpen, onSignedOn  }) => {
    const { currentUser } = useAuth();
    const roleId       = currentUser?.role?.id;
    const roleEntityId = currentUser?.roleEntityId;

    const [vessels, setVessels] = useState<Vessel[]>([]);
    const [crews,   setCrews]   = useState<Crew[]>([]);
    const [ranks,   setRanks]   = useState<Rank[]>([]);
    const [rankMap, setRankMap] = useState<Record<number,string>>({});

    const [selectedVesselId, setSelectedVesselId] = useState<number | ''>('');
    const [selectedCrewId,   setSelectedCrewId]   = useState<number | ''>('');
  const [contractStartDate, setContractStartDate] = useState('');
  const [contractEndDate,   setContractEndDate]   = useState('');
  const [selectedReliever,  setSelectedReliever]  = useState('');
    const [error,            setError]            = useState('');
    

    // Only show approved crews in the dropdown
const onlyApproved = (list: Crew[]) => list.filter(c => c.approvalStatus === 'APPROVED');


    useEffect(() => {
        // 1️⃣ vessels
        fetchVessels();
        // 2️⃣ crews
    getCrewList()
      .then(list => setCrews(onlyApproved(list))) 
      .catch(console.error);

      console.log("crews aye: ", crews)

      console.log("currentUser: ", currentUser)

// 3️⃣ ranks → build map
    getRanks()
      .then(rs => {
        setRanks(rs);
        const m: Record<number,string> = {};
        rs.forEach(r => (m[r.id] = r.rank));
        setRankMap(m);
      }).catch(console.error);

      if (roleId === 4) {
    const vesselFromAuth = currentUser?.vessel;
    if (vesselFromAuth) {
      setSelectedVesselId(vesselFromAuth.id);
      handleVesselChange(vesselFromAuth.id); // Directly filter crew for role 4
    }
  }

    }, [roleId, roleEntityId]);



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

            setVessels(vesselsForCompany);

    //         // For roleId 4, preselect vessel and filter crews directly
    //   if (roleId === 4) {
    //     const vesselFromAuth = currentUser?.vessel;
    //     if (vesselFromAuth) {
    //       setSelectedVesselId(vesselFromAuth.id);
    //       filterCrewsByVessel(vesselFromAuth.id);
    //     }
    //   }
        } catch (error) {
            console.error('Failed to fetch vessel list:', error);
        }
    };

    // For role 4, directly filter the crews based on vessel
  const filterCrewsByVessel = async (vesselId: number) => {
    const selectedVessel = vessels.find(v => v.id === vesselId);
    if (selectedVessel) {
      const companyAdminId = selectedVessel.companyAdmin?.id;
      const companyGroupAdminId = selectedVessel.companyGroupAdmin?.id;

      try {
        const crewList = await getCrewList(); // Await the crew list here
        const filteredCrews = onlyApproved(crewList).filter(crew => {
          if (companyGroupAdminId && crew.companyGroupAdminId === companyGroupAdminId) {
            return true;
          }
          if (companyAdminId && crew.companyAdminId === companyAdminId) {
            return true;
          }
          return false;
        });
        setCrews(filteredCrews);

        // Safety: clear selection if it’s not in the approved list
if (!filteredCrews.some(c => c.id === Number(selectedCrewId))) {
  setSelectedCrewId('');
}
      } catch (error) {
        console.error('Failed to fetch crew list:', error);
      }
    }
  };


if (!isOpen) return null;

// When a vessel is selected, filter the crew based on the vessel's associated company or sub-company
  const handleVesselChange = async (vesselId: number) => {
    setSelectedVesselId(vesselId);

    if (!vesselId) {
      setCrews([]); // Reset crews if no vessel is selected
      return;
    }

    const selectedVessel = vessels.find(v => v.id === vesselId);
    if (selectedVessel) {
      const companyAdminId = selectedVessel.companyAdmin?.id;
      const companyGroupAdminId = selectedVessel.companyGroupAdmin?.id;

      try {
        const crewList = await getCrewList(); // Fetch the crew list
        const filteredCrews = onlyApproved(crewList).filter(crew => {
          // Filter crew based on the selected vessel's company or sub-company
          if (companyGroupAdminId && crew.companyGroupAdminId === companyGroupAdminId) {
            return true;
          }
          if (companyAdminId && crew.companyAdminId === companyAdminId) {
            return true;
          }
          return false;
        });
        setCrews(filteredCrews);

        // Safety: clear selection if it’s not in the approved list
if (!filteredCrews.some(c => c.id === Number(selectedCrewId))) {
  setSelectedCrewId('');
}
      } catch (error) {
        console.error('Failed to fetch crew list:', error);
      }
    }
  };

    const handleSubmit = async () => {
    if (
    //   !selectedVesselId ||
      !selectedCrewId   ||
      !contractStartDate ||
      !contractEndDate
    ) {
      setError('Please fill in all fields.');
      return;
    }

    setError('');

    // For roleId 4, use the vessel from currentUser, else use selectedVesselId
  const vesselIdToSend = roleId === 4 ? currentUser?.vessel?.id : selectedVesselId;

  if (!vesselIdToSend) {
    setError('Vessel is required.');
    return;
  }

    try {
      const payload = {
        vesselId:   Number(vesselIdToSend),
        crewId:     Number(selectedCrewId),
        contractStartDate,
        contractEndDate,
        relieverId: selectedReliever
      };

      const resp = await signOnCrew(payload);
      const vessel = vessels.find(v => v.id === selectedVesselId)!;
      const loginLink = `https://fleetdoctor.dexpertsystems.in/auth/${vessel.vesselType}/${vessel.imoNumber}/ship-login`;

      // build the exact same URL you used in AddCrewModal

      toast.success('Crew signed on successfully');
      onSignedOn({
        id:         resp.id,
        vesselId:   resp.vesselId,
        crewId:     resp.crewId,
        signOnDate: resp.signOnDate,
        portSignOn: resp.portSignOn,
        status:     resp.status,
        loginLink,
      });
      onClose();
    } catch (err: any) {
    console.error(err);

    if (err?.response?.data?.message?.includes("is already signed on that vessel")) {
      toast.error(`The selected rank is already assigned to this vessel.`);
    } else {
      toast.error('Failed to sign on crew');
    }

    }
  };

  // Lookup selected crew to show its rank
  const selectedCrew = crews.find(c => c.id === selectedCrewId);


    return (
        <div className="modal-overlay">
            <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '70rem' }}
            >
                <div className="custom-modal-header d-flex justify-content-between align-items-center">
                    <h5 className="m-0">Sign On Crew</h5>
                    <button className="close-btn" onClick={onClose}>
                        <KTSVG path='/media/map/x.svg' className='svg-icon-2x' />
                    </button>
                </div>

                <div className="custom-modal-body">
                    {error && <div className="alert alert-danger">{error}</div>}

                    <div className="row gy-4">
                       {/* For roleId 4, hide Vessel selection */}
            {roleId !== 4 && (
              <div className="col-md-6">
                <label className="modal_label">Select Vessel <span className="text-danger">*</span></label>
                <select
                  className="form-select"
                  value={selectedVesselId}
                  onChange={e => handleVesselChange(Number(e.target.value))}
                >
                  <option value="">-- Select Vessel --</option>
                  {vessels.map(v => (
                    <option key={v.id} value={v.id}>{v.fleet_name}</option>
                  ))}
                </select>
              </div>
            )}

                        {/* 2) Crew */}
                            <div className="col-md-6">
                            <label className="modal_label" >Select Crew <span className="text-danger">*</span></label>
                            <select
                                className="form-select"
                                value={selectedCrewId}
                                onChange={e => setSelectedCrewId(Number(e.target.value))}
                                    disabled={!selectedVesselId && roleId !== 4}// Disable crew selection until a vessel is selected, except for role 4
                                >
                                <option value="">-- Select Crew --</option>
                                {crews.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            </div>

                        {/* 3) Rank (read-only) */}
                        <div className="col-md-6">
                            <label className='modal_label' htmlFor="rank">Crew Rank <span className="text-danger">*</span></label>
                           
                                <input
                                type="text"
                                className="form-control"
                                readOnly
                                value={selectedCrew ? rankMap[selectedCrew.rankId] || '' : ''}
                                placeholder="—"
                            />
                        </div>

            {/* 4) Contract Start Date */}
            <div className="col-md-6">
              <label className="modal_label">Contract Start Date <span className="text-danger">*</span></label>
              <input
                type="date"
                className="form-control"
                value={contractStartDate}
                onChange={e => setContractStartDate(e.target.value)}
              />
            </div>

            {/* 5) Contract End Date */}
            <div className="col-md-6">
              <label className="modal_label">Contract End Date <span className="text-danger">*</span></label>
              <input
                type="date"
                className="form-control"
                value={contractEndDate}
                onChange={e => setContractEndDate(e.target.value)}
              />
            </div>

            {/* Select Reliever */}
            <div className="col-md-6">
              <label className="modal_label">Select Reliever</label>
              <select
                className="form-select"
                value={selectedReliever}
                onChange={e => setSelectedReliever(e.target.value)}
              >
                <option value="">-- Select Reliever --</option>
                {crews
                  .filter(c => c.id !== selectedCrewId) // Exclude the current crew member
                  .map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} - {rankMap[c.rankId] ?? 'Unknown Rank'}
                    </option>
                  ))
                }
              </select>
            </div>
                    </div>
                </div>

                <div className="d-flex justify-content-end gap-2">
                    <button className="btn btn_secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn_success" onClick={handleSubmit}>Save</button>
                </div>
            </div>
        </div >
    );
};

export default SignOnModal;
