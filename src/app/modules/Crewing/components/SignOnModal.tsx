import React, { useEffect, useRef, useState } from 'react';
import { getVesselList } from '../../Management/core/_requests';
import { getCrewList, getRanks, getRanksforList, signOnCrew } from '../core/_requests';
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
const companyGroupAdminIdForRole6 = currentUser?.companyGroupAdminId
// Operator flavors:
// - No companyGroupAdminId => acts like Superadmin
// - Has companyGroupAdminId => acts like Company Group Admin
const isOperator = roleId === 6
const operatorActsLikeSuperadmin = isOperator && !companyGroupAdminIdForRole6
const operatorActsLikeGroupAdmin = isOperator && !!companyGroupAdminIdForRole6

    const [vessels, setVessels] = useState<Vessel[]>([]);
    const [crews,   setCrews]   = useState<Crew[]>([]);
    const [ranks,   setRanks]   = useState<Rank[]>([]);
    const [rankMap, setRankMap] = useState<Record<number,string>>({});

    const [selectedVesselId, setSelectedVesselId] = useState<number | ''>('');
    const [selectedCrewId,   setSelectedCrewId]   = useState<number | ''>('');
    const [signOnPort,       setSignOnPort]       = useState('');
    const [signOnDate,       setSignOnDate]       = useState('');
    const [error,            setError]            = useState('');


    // A crew is "already on a vessel" if either vesselId or vessel?.id is truthy.
const hasVessel = (c: Crew) => Boolean((c as any).vesselId || c?.vessel?.id);
const isUnassigned = (c: Crew) => !hasVessel(c);

// Keep only approved AND unassigned
const onlyApproved = (list: Crew[]) =>
  list.filter(c => c.approvalStatus === 'APPROVED' && isUnassigned(c));
    

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
    getRanksforList()
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
      // handleVesselChange(vesselFromAuth.id); // Directly filter crew for role 4
    }
  }

    }, [roleId, roleEntityId, operatorActsLikeSuperadmin, operatorActsLikeGroupAdmin]);

    useEffect(() => {
  if (roleId === 4 && currentUser?.vessel?.id && vessels.length > 0) {
    setSelectedVesselId(currentUser.vessel.id);
    filterCrewsByVessel(currentUser.vessel.id);
  }
}, [roleId, currentUser?.vessel?.id, vessels.length]);




    const fetchVessels = async () => {
        try {
            const vesselList = await getVesselList();

            const vesselsForCompany = vesselList.filter((vessel) => {
                const isActive = vessel.active;

      if (roleId === 1 || operatorActsLikeSuperadmin) {
        // Superadmin or Operator acting like Superadmin => all active
        return isActive;
      } else if (roleId === 5 || operatorActsLikeGroupAdmin) {
        // Group Admin or Operator acting like CGA => scope to that group
        const groupId = roleId === 5 ? roleEntityId : companyGroupAdminIdForRole6;
        return isActive && vessel.companyGroupAdmin?.id === groupId;
      } else if (roleId === 2) {
        // Company Admin
        return isActive && vessel.companyAdmin?.id === roleEntityId;
      } else if (roleId === 4) {
        // Vessel User
        return isActive && vessel.id === currentUser?.vessel?.id;
      }

      // default: no access
      return false;
    });

    setVessels(vesselsForCompany);
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
        })
        .filter(isUnassigned);
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
        })
        .filter(isUnassigned);  // ← exclude crews who already have a vessel
        setCrews(filteredCrews);

        // If previously selected crew is no longer available (not approved or not in company), clear it
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
      !signOnPort       ||
      !signOnDate
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
        signOnDate,            // in "YYYY-MM-DD" format
        portSignOn: signOnPort
      };

      const resp = await signOnCrew(payload);

      const vesselForLink =
        roleId === 4
          ? currentUser?.vessel
          : vessels.find(v => v.id === Number(selectedVesselId));

      const loginLink = `https://elecmeksolutions.com/auth/${vesselForLink?.vesselType}/${vesselForLink?.imoNumber}/ship-login`;

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
      toast.error(`The selected rank is already assigned to the vessel.`);
    } else {
      toast.error('Failed to sign on crew');
    }

    }
  };

  // Lookup selected crew to show its rank
  const selectedCrew = crews.find(c => c.id === Number(selectedCrewId));


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

                        {/* 4) Sign On Port */}
            <div className="col-md-6">
              <label className="modal_label">Sign On Port <span className="text-danger">*</span></label>
              <input
                type="text"
                className="form-control"
                value={signOnPort}
                onChange={e => setSignOnPort(e.target.value)}
              />
            </div>

            {/* 5) Sign On Date */}
            <div className="col-md-6">
              <label className="modal_label">Sign On Date <span className="text-danger">*</span></label>
              <input
                type="date"
                className="form-control"
                value={signOnDate}
                onChange={e => setSignOnDate(e.target.value)}
              />
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
