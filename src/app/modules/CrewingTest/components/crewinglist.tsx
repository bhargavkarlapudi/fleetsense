import React, { FC, useState, useEffect, useRef, useMemo } from 'react'
import { KTSVG } from '../../../../_metronic/helpers'
import { Crew, Rank, Vessel } from '../core/_models'
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify'
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AddCrewModal from './AddCrewModal'
import { getCrewList, getRanks, updateCrewStatus, getVesselList, getRanksforList, updateCrew, updateCrewApprovalStatus   } from '../core/_requests'
import ViewCrewDetailsModal from './ViewCrewDetailsModal'
import EditCrewModal from './EditCrewModal'
import DeleteCrewModal from './DeleteCrewModal';
import { TrailRecordsModal } from './TrailRecordsModal'
import { useAuth } from '../../auth';
import html2pdf from 'html2pdf.js';
import AssessmentModal, { AssessmentFormData } from './AssessmentModal';
import ViewAssessmentModal from './ViewAssessmentModal';
import PromotionModal, { PromotionFormData } from './PromotionModal';
import type { ApprovalStatus } from '../core/_models'

// Define interface for crew member data
interface CrewMember {
    id: number;
    name: string;
    rank: string;
    vessel: string;
    signOnDate: string;
    signOffDate: string;
    contractEndDate: string;
    contractStartDate: string;
    status: 'Active' | 'On Leave' | 'InActive' | 'Due For Relief' | 'Planned Assigned';
    relieverName: string;
    dateOfAvailability: string;
    assessmentStatus: 'pending' | 'approved' | 'rejected';
    assessmentData?: AssessmentFormData;
}

const CrewingList: FC = () => {
    const [isPromotionModalOpen, setIsPromotionModalOpen] = useState<boolean>(false);
    const [isViewAssessmentModalOpen, setIsViewAssessmentModalOpen] = useState(false);
    const [selectedAssessmentData, setSelectedAssessmentData] = useState<AssessmentFormData | null>(null);
    const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState<boolean>(false);
    const [vesselList, setVesselList] = useState<any[]>([]);  // Add state for vessels
    const [activeTab, setActiveTab] = useState('approved');
    const [trailCrewName, setTrailCrewName] = useState<string>('');
    const [trailCrewId, setTrailCrewId] = useState<number | null>(null)
    const [isViewCrewDetailsModalOpen, setIsViewCrewDetailsModalOpen] = useState<boolean>(false);
    const [isEditCrewModalOpen, setIsEditCrewModalOpen] = useState<boolean>(false);
    const [selectedCrew, setSelectedCrew] = useState<Crew | null>(null);
    const [isDeleteCrewModalOpen, setIsDeleteCrewModalOpen] = useState<boolean>(false);
    const [showCrewCreds, setShowCrewCreds] = useState(false);
    const [newCrewPassword, setNewCrewPassword] = useState<string | null>(null);
    const [isAddCrewModalOpen, setIsAddCrewModalOpen] = useState<boolean>(false);
    const [crewLoginLink, setCrewLoginLink] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
    const [filteredCrewMembers, setFilteredCrewMembers] = useState<CrewMember[]>([]);
    const [crew, setCrew] = useState<Crew[]>([]);
    const [ranks, setRanks] = useState<Rank[]>([]);
    const [vessels, setVessels] = useState<Vessel[]>([]);
    const [rankMap, setRankMap] = useState<Record<number, string>>({});
    const menuRef = useRef<HTMLUListElement | null>(null);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc'); // Default is ascending
    const [sortColumn, setSortColumn] = useState<string>('');
    const [sortConfig, setSortConfig] = useState<{
    key: keyof CrewMember | null;
    direction: 'asc' | 'desc';
}>({
    // default: sort by Rank using your custom order
    key: 'rank',
    direction: 'asc',
});


    // Filter state variables
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRank, setSelectedRank] = useState('');
    const [selectedVessel, setSelectedVessel] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [signOnDateFrom, setSignOnDateFrom] = useState('');
    const [signOnDateTo, setSignOnDateTo] = useState('');
    const [contractEndDateFrom, setContractEndDateFrom] = useState('');
    const [contractEndDateTo, setContractEndDateTo] = useState('');
    const [showIMOExportModal, setShowIMOExportModal] = useState<boolean>(false);
    const [showVesselFilterAlert, setShowVesselFilterAlert] = useState<boolean>(false);
    const [selectedActiveStatus, setSelectedActiveStatus] = useState<'all' | 'active' | 'inactive'>('all'); // Active/Inactive Filter
    const [contractRangePreset, setContractRangePreset] = useState<'1m'|'6m'|'1y'|'5y'|'all'>('all'); // <== edited ADDED


     const pendingAssessmentDataRef = useRef<AssessmentFormData | null>(null);
 const [isSavingApproval, setIsSavingApproval] = useState(false);


    // Modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null);
    const [selectedCrewMember, setSelectedCrewMember] = useState<CrewMember | null>(null);

    //loading of crewlist fix
      const [isCrewLoading, setIsCrewLoading] = useState(true);
  const [isRanksLoading, setIsRanksLoading] = useState(true);
  const [isVesselsLoading, setIsVesselsLoading] = useState(true);
  const isBootLoading = isCrewLoading || isRanksLoading || isVesselsLoading;
  // delay before showing the "No crew members found." empty state (prevents flicker)
  const [noDataDelayPassed, setNoDataDelayPassed] = useState(false);

  useEffect(() => {
   const t = setTimeout(() => setNoDataDelayPassed(true), 700); // 0.7s feels snappy but avoids flicker
   return () => clearTimeout(t);
 }, []);


    const StatusBubble: React.FC<{ color: 'red' | 'yellow'; tooltip: string }> = ({ color, tooltip }) => (
  <span
    title={tooltip}
    style={{
      display: 'inline-block',
      width: '12px',
      height: '12px',
      backgroundColor: color,
      borderRadius: '50%',
      marginRight: '8px', // Changed from marginLeft to marginRight
      verticalAlign: 'middle',
    }}
  ></span>
);

const getContractStatus = (endDateString?: string | null): 'expired' | 'expiring_soon' | 'safe' => {
  if (!endDateString) {
    return 'safe'; // No date, so no warning
  }

  const today = new Date();
  const endDate = new Date(endDateString);

  // Normalize dates to the start of the day to avoid timezone issues
  today.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  // Check if the contract has already expired
  if (endDate < today) {
    return 'expired';
  }

  // Calculate the difference in days
  const timeDiff = endDate.getTime() - today.getTime();
  const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  // Check if the contract is expiring within the next 30 days
  if (daysRemaining <= 30) {
    return 'expiring_soon';
  }

  return 'safe';
};

const handleExportIMO = () => {
  // Check vessel selection first
  if (!selectedVessel || selectedVessel === 'all') {
    setShowVesselFilterAlert(true);
    return;
  }

  const element = document.getElementById('imo-pdf-content');
  if (!element) return;

  // Show the element temporarily if hidden
  element.style.display = 'block';

  const opt = {
    margin: [0.3, 0.3, 0.3, 0.3], // top, left, bottom, right in inches
    filename: 'IMO_Crew_List.pdf',
    image: { type: 'jpeg', quality: 1 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: true,
    },
    jsPDF: {
      unit: 'in',
      format: 'a4',
      orientation: 'portrait',
    },
  };

  html2pdf()
    .set(opt)
    .from(element)
    .toPdf()
    .get('pdf')
    .then((pdf: any) => {
      const pageCount = pdf.internal.getNumberOfPages();
      pdf.setFontSize(10);

      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        const w = pdf.internal.pageSize.getWidth();
        const h = pdf.internal.pageSize.getHeight();
        pdf.text(`Page ${i} of ${pageCount}`, w - 0.5, h - 0.5, {
          align: 'right'
        });
      }
    })
    .save()
    .then(() => {
      // Hide again after export
      element.style.display = 'none';
    });
};
// ADDED — toggle active/inactive (with a tiny confirm for deactivation)
const handleToggleActiveStatus = async (crewId: number, isActive: boolean) => {
  const target = crew.find(c => c.id === crewId);
  if (!target) {
    console.error('Crew not found:', crewId);
    return;
  }

  try {
    if (isActive) {
      // confirm before deactivating
      const ok = window.confirm(`Deactivate ${target.name}? They will be marked inactive.`);
      if (!ok) return;
      await updateCrewStatus(crewId, false);
      toast.success('Crew marked as inactive');
    } else {
      await updateCrewStatus(crewId, true);
      toast.success('Crew marked as active');
    }
    await fetchCrew();
  } catch (err) {
    console.error('Failed to update crew status:', err);
    toast.error('Failed to update crew status');
  }
};


const handleOpenAssessmentModal = (member: CrewMember) => {
    const crewToSet = crew.find(c => c.id === member.id);
    if (crewToSet) {
        setSelectedCrew(crewToSet);
        setIsAssessmentModalOpen(true);
    } else {
        console.error("Could not find the original crew member to open the modal.");
    }
};

const handleOpenPromotionModal = (member: CrewMember) => {
    const originalCrew = crew.find(c => c.id === member.id);
    if (originalCrew) {
        setSelectedCrew(originalCrew);
        setIsPromotionModalOpen(true);
    } else {
        console.error("Could not find the original crew member to open the promotion modal.");
    }
};

const handleClosePromotionModal = () => {
    setIsPromotionModalOpen(false);
};

const handlePromotionSubmit = (formData: PromotionFormData) => {
    console.log('Promotion Form Submitted:', {
        crewMember: selectedCrew,
        promotionDetails: formData,
    });
    // You can add logic here to save the data via an API call.
    
    // For now, we'll just close the modal.
    handleClosePromotionModal();
};

const handleOpenViewAssessmentModal = (member: CrewMember) => {
    // --- Start Advanced Debug ---
    console.clear(); // Clears the console for a fresh view
    console.log("--- DEBUGGING VIEW ASSESSMENT MODAL ---");
    console.log("1. Click received for member:", member);
    console.log("2. Checking if 'member.assessmentData' exists on this object...");

    if (member.assessmentData) {
        console.log("3. SUCCESS: 'assessmentData' was found:", member.assessmentData);
        const originalCrew = crew.find(c => c.id === member.id);
        console.log("4. Found the full original crew object:", originalCrew);

        if (originalCrew) {
            console.log("5. All data is present. Setting state to open the modal now.");
            setSelectedCrew(originalCrew);
            setSelectedAssessmentData(member.assessmentData);
            setIsViewAssessmentModalOpen(true);
        } else {
            console.error("6. FAILED: Could not find a matching crew member in the main 'crew' array.");
        }
    } else {
        console.error("3. FAILED: The 'member.assessmentData' property is missing or undefined. The modal will not open.");
        alert("No assessment data is available for this crew member. Please submit an assessment for them first.");
    }
    console.log("--- END DEBUG ---");
};

const handleCloseAssessmentModal = () => {
        setIsAssessmentModalOpen(false);
        setSelectedCrewMember(null); // Clear the selected member on close
    };


const handleConfirm = async () => {
   if (!selectedCrew || !confirmAction) return;
   const crewId = selectedCrew.id;
   const toStatus: ApprovalStatus = confirmAction === 'approve' ? 'APPROVED' : 'REJECTED';
   const approving = toStatus === 'APPROVED';
   setIsSavingApproval(true);
   try {
     // Build the required payload from the existing crew object.
     // updateCrew requires several core fields; we reuse what we already have.
await updateCrewApprovalStatus(crewId, toStatus);

     // Keep base crew[] in sync
     setCrew(prev => prev.map(c => (c.id === crewId ? { ...c, approvalStatus: toStatus } : c)));

     // Update the visible table data (and attach the assessment data if approved)
     setCrewMembers(prev => prev.map(m =>
       m.id === crewId
         ? {
             ...m,
             assessmentStatus: approving ? 'approved' : 'rejected',
             ...(approving && pendingAssessmentDataRef.current
               ? { assessmentData: pendingAssessmentDataRef.current }
               : {}),
           }
         : m
     ));

     toast.success(approving ? 'Crew assessment approved' : 'Crew assessment rejected');
   } catch (err: any) {
     console.error('Failed to persist approval state', err);
     toast.error('Could not save. Please try again.');
   } finally {
     setIsSavingApproval(false);
     pendingAssessmentDataRef.current = null;
     setShowConfirmModal(false);
     setConfirmAction(null);
   }
 };


    // Form state for new crew member
    const [formData, setFormData] = useState({
        // Personal Details
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        nationality: '',
        phoneNumber: '',
        email: '',
        address: '',
        emergencyContact: '',
        emergencyPhone: '',

        // Position Details
        rank: '',
        department: '',
        experience: '',

        // Documents
        passport: '',
        passportExpiry: '',
        seamansBook: '',
        seamansBookExpiry: '',
        medicalCertificate: '',
        medicalExpiry: '',
        stcwBasic: '',
        stcwBasicExpiry: '',

        // Dangerous Cargo Endorsements
        tankerEndorsement: false,
        chemicalTanker: false,
        gasCarrier: false,
        oilTanker: false,

        // Academic Background
        highestEducation: '',
        marineInstitute: '',
        graduationYear: '',
        additionalCertifications: ''
    });

const mapApprovalToStatus = (
  val: ApprovalStatus | null | undefined
): CrewMember['assessmentStatus'] => 
    val === 'APPROVED' ? 'approved' : val === 'REJECTED' ? 'rejected' : 'pending';


    // Fetch crew data like in CrewList.tsx
    const fetchCrew = async () => {
        try {
            setIsCrewLoading(true);
            const crewList = await getCrewList();
            console.log('Crew List:', crewList);
            setCrew(crewList);
        } catch (error) {
            console.error('Failed to fetch crew list:', error);
            // Use dummy data if API fails
            setCrew([]);
        } finally {
            setIsCrewLoading(false);
        }
    };

    const formatYYYYMMDD = (d: Date) => { 
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// useEffect(() => { 
//   const today = new Date();
//   if (contractRangePreset === 'all') {
//     setContractEndDateFrom(''); 
//     setContractEndDateTo('');   
//     return;
//   }
//   const from = new Date(today);
//   switch (contractRangePreset) {
//     case '1m': from.setMonth(from.getMonth() - 1); break;
//     case '6m': from.setMonth(from.getMonth() - 6); break;
//     case '1y': from.setFullYear(from.getFullYear() - 1); break;
//     case '5y': from.setFullYear(from.getFullYear() - 5); break;
//   }
//   setContractEndDateFrom(formatYYYYMMDD(from));   
//   setContractEndDateTo(formatYYYYMMDD(today));    
// }, [contractRangePreset]); 


    // Fetch ranks like in CrewList.tsx
    useEffect(() => {
        setIsRanksLoading(true);
        getRanksforList()
            .then(rs => {
                setRanks(rs);
                // build lookup: { [id]: rankName }
                const m: Record<number, string> = {};
                rs.forEach(r => m[r.id] = r.rank);
                setRankMap(m);
            })
            .catch(err => console.error('Failed to load ranks', err))
            .finally(() => setIsRanksLoading(false));
    }, []);

    // Fetch vessels for filter dropdown
    useEffect(() => {
        
        setIsVesselsLoading(true);
        getVesselList()
            .then(vs => {
                setVessels(vs);
            })
            .catch(err => console.error('Failed to load vessels', err))
            .finally(() => setIsVesselsLoading(false));    
    }, []);

    useEffect(() => {
        fetchCrew();
    }, []);

    const formatDateforDateOfAvailability = (iso?: string | null) => {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '-'
  const dd = String(d.getDate()).padStart(2, '0')
  const mmm = d.toLocaleString('en-US', { month: 'short' })
  const yyyy = d.getFullYear()
  return `${dd}-${mmm}-${yyyy}`
}

    // Transform crew data for display
useEffect(() => {
    if (crew.length > 0 && Object.keys(rankMap).length > 0) {
        // This will be an array of fully-detailed crew members
        const transformedCrew: CrewMember[] = crew.map((member: Crew, index: number) => {
            const baseDate = new Date(2024, (member.id % 12), (member.id % 28) + 1);
            const signOnDate = baseDate.toISOString().split('T')[0];
            const signOffDate = baseDate.toISOString().split('T')[0];
            const contractStartDate = new Date(baseDate);
            const contractEndDate = new Date(baseDate);
            contractEndDate.setMonth(contractEndDate.getMonth() + 6);
            // const nextAvailableDate = new Date(contractEndDate);
            // nextAvailableDate.setDate(nextAvailableDate.getDate() + 5);

            let crewStatus: 'Active' | 'On Leave' | 'InActive' | 'Due For Relief' | 'Planned Assigned' = 'On Leave';
            if (member.vessel && member.active) {
                const today = new Date();
                const daysUntilEnd = Math.ceil((contractEndDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
                if (daysUntilEnd <= 30 && daysUntilEnd > 0) {
                    crewStatus = 'Due For Relief';
                } else {
                    crewStatus = 'Active';
                }
            } else if (!member.active) {
                crewStatus = 'InActive';
            }
            
            const relieverNames = ['Michael Johnson', 'Sarah Davis', 'James Wilson', 'Lisa Anderson'];
            const relieverName = relieverNames[member.id % relieverNames.length] || 'TBD';

            // This return statement creates the complete object with all dummy data
            return {
                ...member, // Keep original data
                // --- Your display data ---
                id: member.id,
                name: member.name || `Crew Member ${index + 1}`,
                rank: rankMap[member.rankId] || 'Unknown Rank',
                vessel: member.vessel?.fleet_name || 'On Leave',
                signOnDate,
                signOffDate,
                contractStartDate: contractEndDate.toISOString().split('T')[0],
                contractEndDate: contractEndDate.toISOString().split('T')[0],
                status: crewStatus,
                relieverName,
                dateOfAvailability: formatDateforDateOfAvailability(member.dateOfAvailability),
                assessmentStatus: mapApprovalToStatus(member.approvalStatus),


                // --- DUMMY DATA FOR THE MODAL ---
                // academicQualifications: [
                //     {
                //         qualification: 'SSC (10th Grade)',
                //         institutionName: `Test School #${member.id}`,
                //         boardUniversity: 'State Board',
                //         dateOfPassing: '2015-05-20T00:00:00Z',
                //         gradePercentage: `${80 + (member.id % 15)}%`,
                //     },
                //     {
                //         qualification: 'HSC (12th Grade)',
                //         institutionName: `Test College #${member.id}`,
                //         boardUniversity: 'State Board',
                //         dateOfPassing: '2017-05-18T00:00:00Z',
                //         gradePercentage: `${82 + (member.id % 13)}%`,
                //     }
                // ],
                // identityDocuments: [
                //     {
                //         documentType: 'Passport',
                //         number: `P${789000 + member.id}`,
                //         dateOfIssue: '2018-10-01T00:00:00Z',
                //         placeOfIssue: 'Mumbai',
                //         dateOfExpiry: '2028-09-30T00:00:00Z',
                //         ecnr: true,
                //         min4BlankPages: true,
                //     },
                //      {
                //         documentType: 'U.S. VISA C1/D',
                //         number: `V${554433 + member.id}`,
                //         dateOfIssue: '2022-03-11T00:00:00Z',
                //         placeOfIssue: 'US Consulate',
                //         dateOfExpiry: '2032-03-10T00:00:00Z',
                //     },
                // ],
                // professionalCertificates: [
                //     {
                //         documentType: 'COC',
                //         gradeLevel: 'II/2',
                //         number: `COC${9900 + member.id}`,
                //         issuingAuthority: 'DG Shipping',
                //         dateOfIssue: '2020-01-10T00:00:00Z',
                //         dateOfExpiry: '2025-01-09T00:00:00Z',
                //     }
                // ],
                // cargoEndorsements: [
                //     {
                //         endorsementType: 'Oil',
                //         gradeLevel: 'Advanced',
                //         number: `OIL${2233 + member.id}`,
                //         dateOfIssue: '2020-02-20T00:00:00Z',
                //         placeOfIssue: 'Chennai',
                //         dateOfExpiry: '2025-02-19T00:00:00Z',
                //     }
                // ]
            };
        });
        setCrewMembers(transformedCrew);
        // setFilteredCrewMembers(transformedCrew);
    } 
}, [crew, rankMap]);

    // Apply filters //inside just the tab gate and filters
//     useEffect(() => {
//     // 1. First, filter by the active tab to create a base list
//     let filtered = [...crewMembers];

//         // Filter by active tab
//         filtered = filtered.filter(member => {

//         if (activeTab === 'rejected') {
//             return member.assessmentStatus === 'rejected';
//         }
//          if (activeTab === 'pending') {
//             return member.assessmentStatus === 'pending';
//         }
//         //default tab
//                 // if (activeTab === 'approved') {
//             return member.assessmentStatus === 'approved';
//         // }
//         // The default 'pending' tab
//         // return member.assessmentStatus === 'pending';
//     });

//     // ✅ Hide ON LEAVE by default on Approved tab
//   // …unless the user explicitly selects a vessel/status filter.
//   if (activeTab === 'approved' && !selectedVessel && !selectedStatus) {
//     filtered = filtered.filter(m => m.status !== 'On Leave');
//   }

//     // 2. Start with the list that has already been filtered by the active tab
//     // let filtered = [...tabFilteredMembers];

//     // 3. Apply all your other existing filters on top of the tab-filtered list
//     // Global search across all fields
//     if (searchTerm) {
//         const searchTermLower = searchTerm.toLowerCase();
//         filtered = filtered.filter(member => {
//             // Search through all string fields
//             return (
//                 member.name.toLowerCase().includes(searchTermLower) ||
//                 member.rank.toLowerCase().includes(searchTermLower) ||
//                 member.vessel.toLowerCase().includes(searchTermLower) ||
//                 member.status.toLowerCase().includes(searchTermLower) ||
//                 member.relieverName.toLowerCase().includes(searchTermLower) ||
//                 member.signOnDate.toLowerCase().includes(searchTermLower) ||
//                 member.signOffDate.toLowerCase().includes(searchTermLower) ||
//                 member.contractStartDate.toLowerCase().includes(searchTermLower) ||
//                 member.contractEndDate.toLowerCase().includes(searchTermLower) ||
//                 member.dateOfAvailability.toLowerCase().includes(searchTermLower)
//             );
//         });
//     }

//     // Filter by rank
//     if (selectedRank) {
//         filtered = filtered.filter(member => member.rank === selectedRank);
//     }

//     // ✅ Vessel filter (supports special "onLeave" option)
//   if (selectedVessel) {
//     if (selectedVessel === 'onLeave') {
//       filtered = filtered.filter(m => m.status === 'On Leave' || m.vessel === 'On Leave');
//     } else {
//       filtered = filtered.filter(m => m.vessel === selectedVessel);
//     }
//   }

//     // Filter by status
//     if (selectedStatus) {
//         filtered = filtered.filter(member => member.status === selectedStatus);
//     }

//     // Filter by sign-on date range
//     if (signOnDateFrom) {
//         filtered = filtered.filter(member => member.signOnDate >= signOnDateFrom);
//     }
//     if (signOnDateTo) {
//         filtered = filtered.filter(member => member.signOnDate <= signOnDateTo);
//     }

//     // Filter by contract end date range
//     if (contractEndDateFrom) {
//         filtered = filtered.filter(member => member.contractEndDate >= contractEndDateFrom);
//     }
//     if (contractEndDateTo) {
//         filtered = filtered.filter(member => member.contractEndDate <= contractEndDateTo);
//     }

//     setFilteredCrewMembers(filtered);
//     setCurrentPage(1); // Reset to first page when filters change
// }, [
//     crewMembers, 
//     activeTab,  // <-- 4. Add `activeTab` to the dependency array
//     searchTerm, 
//     selectedRank, 
//     selectedVessel, 
//     selectedStatus, 
//     signOnDateFrom, 
//     signOnDateTo, 
//     contractEndDateFrom, 
//     contractEndDateTo
// ]);

// Apply filters (global-search should ignore tab + default On-Leave hide)
useEffect(() => {
  const search = searchTerm.trim().toLowerCase();
  const globalMode = search.length > 0;

  let filtered = [...crewMembers];

  // 1) Tab gate ONLY when not in global search mode
  if (!globalMode) {
    filtered = filtered.filter((member) => {
      if (activeTab === 'rejected') return member.assessmentStatus === 'rejected';
      if (activeTab === 'pending') return member.assessmentStatus === 'pending';
      // default (approved)
      return member.assessmentStatus === 'approved';
    });

    // Hide ON LEAVE by default on Approved tab, but NOT in global search
    if (activeTab === 'approved' && !selectedVessel && !selectedStatus) {
      filtered = filtered.filter((m) => m.status !== 'On Leave');
    }
  }

  // 2) Global search across all fields (always applied if searchTerm present)
  if (globalMode) {
    filtered = filtered.filter((member) => {
      const fields = [
        member.name,
        member.rank,
        member.vessel,
        member.status,
        member.relieverName,
        // member.signOnDate,
        // member.signOffDate,
        // member.contractStartDate,
        // member.contractEndDate,
        member.dateOfAvailability,
      ].map((v) => (v ?? '').toString().toLowerCase());
      return fields.some((f) => f.includes(search));
    });
  }

  // 3) Other explicit filters still apply
  if (selectedRank) {
    filtered = filtered.filter((m) => m.rank === selectedRank);
  }

  // Vessel filter (supports special onLeave)
  if (selectedVessel) {
    if (selectedVessel === 'onLeave') {
      filtered = filtered.filter((m) => m.status === 'On Leave' || m.vessel === 'On Leave');
    } else {
      filtered = filtered.filter((m) => m.vessel === selectedVessel);
    }
  }

  if (selectedStatus) {
    filtered = filtered.filter((m) => m.status === selectedStatus);
  }

//   if (signOnDateFrom) {
//     filtered = filtered.filter((m) => m.signOnDate >= signOnDateFrom);
//   }
//   if (signOnDateTo) {
//     filtered = filtered.filter((m) => m.signOnDate <= signOnDateTo);
//   }

//   if (contractEndDateFrom) {
//     filtered = filtered.filter((m) => m.contractEndDate >= contractEndDateFrom);
//   }
//   if (contractEndDateTo) {
//     filtered = filtered.filter((m) => m.contractEndDate <= contractEndDateTo);
//   }

  setFilteredCrewMembers(filtered);
  setCurrentPage(1);
}, [
  crewMembers,
  activeTab,
  searchTerm,
  selectedRank,
  selectedVessel,
  selectedStatus,
//   signOnDateFrom,
//   signOnDateTo,
//   contractEndDateFrom,
//   contractEndDateTo,
]);


    const indexOfLast = currentPage * rowsPerPage;
    const indexOfFirst = indexOfLast - rowsPerPage;
    const currentCrewMembers = filteredCrewMembers.slice(indexOfFirst, indexOfLast);
    const totalPages = Math.ceil(filteredCrewMembers.length / rowsPerPage);

//helper
    const columnsCount = (activeTab === 'approved' ? 12 : 3) + 1;

    // Sorting handler
    const handleSort = (key: keyof CrewMember) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
        }));
    };

    // Page change handler
    const handlePageChange = (page: number) => {
        if (page > 0 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    // Rows per page change handler
    const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setRowsPerPage(parseInt(e.target.value));
        setCurrentPage(1); // reset to first page
    };

    // Status badge color function
    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'Active':
                return 'badge bg-success';
            case 'On Leave':
                return 'badge bg-warning text-dark';
            case 'InActive':
                return 'badge bg-secondary';
            case 'Due For Relief':
                return 'badge bg-danger';
            case 'Planned Assigned':
                return 'badge bg-primary';
            default:
                return 'badge bg-secondary';
        }
    };

    // Format date function
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        }).replace(/ /g, '-');
    };

    // --- Rank sorting helpers (paste above the component) ---
const RANK_ORDER = [
  'MASTER',
  'CHIEF OFFICER',
  'SECOND OFFICER',
  'THIRD OFFICER',
  'DECK CADET',
  'CHIEF ENGINEER',
  'SECOND ENGINEER',
  'THIRD ENGINEER',
  'FOURTH ENGINEER',
  'TRAINEE MARINE ENGINEER',
  'ELECTRICAL OFFICER',
  'BOSUN',
  'PUMPMAN',
  'ABLE SEAMAN',
  'ORDINARY SEAMAN',
  'TR. SEAMAN',
  'OILER',
  'WIPER',
  'TR WIPER',
  'FITTER',
  'CHIEF COOK',
  'GENERAL STEWARD',
] as const;

const RANK_REGEX: Record<string, RegExp[]> = {
  MASTER: [/(^|\s)master\b/i], // "Master (Captain)"
  'CHIEF OFFICER': [/chief\s*officer/i, /\bc\s*\/\s*o\b/i],
  'SECOND OFFICER': [/second\s*officer/i, /\b2\s*\/\s*o\b/i],
  'THIRD OFFICER': [/third\s*officer/i, /\b3\s*\/\s*o\b/i],
  'DECK CADET': [/deck\s*cadet/i],
  'CHIEF ENGINEER': [/chief\s*engineer/i, /\bc\s*\/\s*e\b/i],
  'SECOND ENGINEER': [/second\s*engineer/i, /\b2\s*\/\s*e\b/i],
  'THIRD ENGINEER': [/third\s*engineer/i, /\b3\s*\/\s*e\b/i],
  'FOURTH ENGINEER': [/fourth\s*engineer/i, /\b4\s*\/\s*e\b/i, /fouth\s*engineer/i],
  'TRAINEE MARINE ENGINEER': [/engine\s*cadet/i, /trainee\s*marine\s*engineer/i, /\btme\b/i],
  'ELECTRICAL OFFICER': [/electrician/i, /electrical/i, /\beto\b/i],
  BOSUN: [/\bbosun\b/i, /boatswain/i],
  PUMPMAN: [/pumpman/i],
  'ABLE SEAMAN': [/able\s*seaman/i, /\bab\b(?![a-z])/i],
  'ORDINARY SEAMAN': [/ordinary\s*seaman/i, /\bos\b(?![a-z])/i],
  'TR. SEAMAN': [/trainee.*seaman/i, /\btr\.?\s*seaman\b/i],
  OILER: [/oiler/i, /motorman/i],
  WIPER: [/wiper\b/i],
  'TR WIPER': [/trainee.*wiper/i, /\btr\.?\s*wiper\b/i],
  FITTER: [/fitter\b/i],
  'CHIEF COOK': [/chief\s*cook/i],
  'GENERAL STEWARD': [/steward/i, /messman/i],
};

const getCanonicalRank = (label?: string): string => {
  const s = (label ?? '').trim();
  for (const [canon, patterns] of Object.entries(RANK_REGEX)) {
    if (patterns.some((rx) => rx.test(s))) return canon;
  }
  return 'OTHER';
};

const getRankSuffix = (label?: string): number => {
  const s = (label ?? '').trim();
  const m = s.match(/-\s*(\d+)\s*$/);
  return m ? Number(m[1]) : 0; // 0 => base (no suffix)
};

const rankTuple = (label?: string): [number, number, number, string] => {
  const canon = getCanonicalRank(label);
  const groupIdx =
    canon === 'OTHER' ? 999 : RANK_ORDER.indexOf(canon as any) + 1; // 1-based; unknowns sink
  const suffix = getRankSuffix(label); // 0 (base) comes first
  const baseFirstFlag = suffix === 0 ? 0 : 1; // base (0) before numbered (1)
  return [groupIdx, baseFirstFlag, suffix, (label ?? '')];
};

const compareRank = (
  aLabel?: string,
  bLabel?: string,
  direction: 'asc' | 'desc' = 'asc'
): number => {
  const A = rankTuple(aLabel);
  const B = rankTuple(bLabel);
  const cmp =
    A[0] - B[0] || // group
    A[1] - B[1] || // base before numbered
    A[2] - B[2] || // suffix ascending
    A[3].localeCompare(B[3]); // final tie-break
  return direction === 'asc' ? cmp : -cmp;
};


    // Apply sorting
    // This is the corrected code
// replace your whole "Apply sorting" useEffect with this:
// Apply sorting (special handling for Rank)
useEffect(() => {
  if (filteredCrewMembers.length === 0) return;

  const key = (sortConfig.key ?? 'id') as keyof CrewMember;
  const direction = sortConfig.key ? sortConfig.direction : 'desc';

  const sorted = [...filteredCrewMembers].sort((a, b) => {
    if (key === 'rank') {
      return compareRank(a.rank, b.rank, direction);
    }

    const aValue = (a as any)[key] ?? '';
    const bValue = (b as any)[key] ?? '';

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return direction === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  // avoid loops
  const changed = sorted.some((item, idx) => item.id !== filteredCrewMembers[idx]?.id);
  if (changed) setFilteredCrewMembers(sorted);
}, [sortConfig, filteredCrewMembers]);

    // Clear all filters
    const clearFilters = () => {
        setSearchTerm('');
        setSelectedRank('');
        setSelectedVessel('');
        setSelectedStatus('');
        setSignOnDateFrom('');
        setSignOnDateTo('');
        setContractEndDateFrom('');
        setContractEndDateTo('');
        setContractRangePreset('all');
    };

    // Handle form input changes
    const handleInputChange = (field: string, value: string | boolean) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Handle form submission
    // const handleSubmit = (e: React.FormEvent) => {
    //     e.preventDefault();
    //     // TODO: Add validation and API call to save crew member
    //     console.log('Form data:', formData);

    //     // Reset form and close modal
    //     setFormData({
    //         firstName: '',
    //         lastName: '',
    //         dateOfBirth: '',
    //         nationality: '',
    //         phoneNumber: '',
    //         email: '',
    //         address: '',
    //         emergencyContact: '',
    //         emergencyPhone: '',
    //         rank: '',
    //         department: '',
    //         experience: '',
    //         passport: '',
    //         passportExpiry: '',
    //         seamansBook: '',
    //         seamansBookExpiry: '',
    //         medicalCertificate: '',
    //         medicalExpiry: '',
    //         stcwBasic: '',
    //         stcwBasicExpiry: '',
    //         tankerEndorsement: false,
    //         chemicalTanker: false,
    //         gasCarrier: false,
    //         oilTanker: false,
    //         highestEducation: '',
    //         marineInstitute: '',
    //         graduationYear: '',
    //         additionalCertifications: ''
    //     });
    //     setShowAddModal(false);
    // };

    // This is the new, corrected code
    const handleApprove = (formData: AssessmentFormData) => {
   if (!selectedCrew) return;
   // Hold the form data until user confirms
   pendingAssessmentDataRef.current = formData;
   handleCloseAssessmentModal();
   setConfirmAction('approve');
   setShowConfirmModal(true);
 };

    const handleReject = () => {
        setConfirmAction('reject');
        setShowConfirmModal(true);
    };


    // Handle modal close
    // const handleCloseModal = () => {
    //     setShowAddModal(false);
    //     // Reset form data when closing 
    //     //keep the form data as it is not clear them
    //     // setFormData({
    //     //     firstName: '',
    //     //     lastName: '',
    //     //     dateOfBirth: '',
    //     //     nationality: '',
    //     //     phoneNumber: '',
    //     //     email: '',
    //     //     address: '',
    //     //     emergencyContact: '',
    //     //     emergencyPhone: '',
    //     //     rank: '',
    //     //     department: '',
    //     //     experience: '',
    //     //     passport: '',
    //     //     passportExpiry: '',
    //     //     seamansBook: '',
    //     //     seamansBookExpiry: '',
    //     //     medicalCertificate: '',
    //     //     medicalExpiry: '',
    //     //     stcwBasic: '',
    //     //     stcwBasicExpiry: '',
    //     //     tankerEndorsement: false,
    //     //     chemicalTanker: false,
    //     //     gasCarrier: false,
    //     //     oilTanker: false,
    //     //     highestEducation: '',
    //     //     marineInstitute: '',
    //     //     graduationYear: '',
    //     //     additionalCertifications: ''
    //     // });
    // };

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

  // --- robust export handler ---
  const handleExportExcel = () => {
    const headers = [
      'Present Rank',
      'Rank Applied For',
      'Family Name',
      'Name',
      'Tel No',
      'Mobile No',
      'Alternate Mobile No',
      'Email ID',
      'Date of Birth',
      'Skype ID',
      'Nationality',
      'Place of Birth',
      'Date of Availability',
      'Marital status',
      'Willing to accept lower Rank',
      'Boiler Suit Size',
      'Height (cms)',
      'Weight (kgs)',
      'BMI Index',
      'Blood Group',
      'Shoe Size',
      'Address'
    ];

    const wb = XLSX.utils.book_new();
    const ws: XLSX.WorkSheet = {};

    const headerStyle = { font: { bold: true } };

    headers.forEach((header, i) => {
      const cellRef = XLSX.utils.encode_cell({ c: i, r: 0 });
      const cell = {
        v: header,
        t: 's',
        s: headerStyle
      };
      ws[cellRef] = cell; // Now valid
    });

    const range = { s: { c: 0, r: 0 }, e: { c: headers.length - 1, r: 0 } };
    ws['!ref'] = XLSX.utils.encode_range(range); // Now valid

    ws['!cols'] = headers.map(header => ({ wch: header.length})); // Now valid

    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, 'Data_Template.xlsx');
  };

  const sortedAndFilteredCrew = [...crew]
            .filter((crew) => {
                const matchesVessel =
                    selectedVessel === 'all' ||
                    crew.vessel?.fleet_name === selectedVessel ||
                    (selectedVessel === 'onLeave' && !crew.vessel);
                const matchesActiveStatus = selectedActiveStatus === 'all' || (selectedActiveStatus === 'active' && crew.active) || (selectedActiveStatus === 'inactive' && !crew.active);
                
                // Global search across all fields
                const searchTermLower = searchTerm.toLowerCase();
                const matchesSearch = searchTerm === '' || (
                    (crew.name?.toLowerCase().includes(searchTermLower) || false) ||
                    (rankMap[crew.rankId]?.toLowerCase().includes(searchTermLower) || false) ||
                    (crew.vessel?.fleet_name?.toLowerCase().includes(searchTermLower) || false) ||
                    (crew.active?.toString().toLowerCase().includes(searchTermLower) || false)
                );
                
                return matchesSearch && matchesVessel && matchesActiveStatus;
    
            })
            .sort((a, b) => {
                // 🔀 newest first by id if no explicit sortColumn
                if (!sortConfig.key) {
                    return b.id - a.id;
                }
    
                const aValue = a[sortConfig.key as keyof Crew] || '';
                const bValue = b[sortConfig.key as keyof Crew] || '';
    
                // Handle nested props and rank…
                if (sortConfig.key === 'vessel') {
                    const va = a.vessel?.fleet_name || '';
                    const vb = b.vessel?.fleet_name || '';
                    return sortConfig.direction === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
                }
                if (sortConfig.key === 'rank') {
                    const ra = rankMap[a.rankId] || '';
                    const rb = rankMap[b.rankId] || '';
                    return compareRank(ra, rb, sortConfig.direction);
                }
    
                // fallback string compare
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
    
        // Filter crew by vessel
        // const filteredCrew = crew.filter((crew) => {
        //     const matchesVessel =
        //         selectedVessel === 'all' ||
        //         crew.vessel?.fleet_name === selectedVessel ||
        //         (selectedVessel === 'onLeave' && !crew.vessel);
        //     return crew.name?.toLowerCase().includes(searchTerm.toLowerCase()) && matchesVessel;
        // });
    
        // Paginate filtered crew
        const indexOfLastCrew = currentPage * rowsPerPage;
        const indexOfFirstCrew = indexOfLastCrew - rowsPerPage;
        const currentCrew = sortedAndFilteredCrew.slice(indexOfFirstCrew, indexOfLastCrew);
    
        useEffect(() => {
            console.log(sortedAndFilteredCrew);
            if (currentPage > totalPages) {
                setCurrentPage(1);
            }
        }, [sortedAndFilteredCrew, rowsPerPage]);
    
        const headerData = sortedAndFilteredCrew[0] || {};

    return (
        <>
            <AddCrewModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onCrewAdded={({ password, link, created }) => {
                    setCrew((prev) => (prev.some((c) => c.id === created.id) ? prev : [created, ...prev]));
setNewCrewPassword(password);
    setCrewLoginLink(link);
    setShowCrewCreds(true);

                    console.log(`Crew added with password: ${password}, link: ${link}`);
                    // Refresh the crew list after adding
                    fetchCrew();
                }}
            />

            <AssessmentModal
                isOpen={isAssessmentModalOpen}
                onClose={handleCloseAssessmentModal}
                crewMember={selectedCrew}
                rankName={selectedCrew ? rankMap[selectedCrew.rankId] : ''}
                onApprove={handleApprove}
                onReject={handleReject}
            />
            <ViewAssessmentModal
                isOpen={isViewAssessmentModalOpen}
                onClose={() => setIsViewAssessmentModalOpen(false)}
                crewMember={selectedCrew}
                rankName={selectedCrew ? rankMap[selectedCrew.rankId] : ''}
                assessmentData={selectedAssessmentData}
            />
            {isPromotionModalOpen && (
                <PromotionModal
                    isOpen={isPromotionModalOpen}
                    onClose={handleClosePromotionModal}
                    onSubmit={handlePromotionSubmit}
                    crewMember={selectedCrew}
                    currentRank={selectedCrew ? rankMap[selectedCrew.rankId] : ''}
                />
            )}
            {showConfirmModal && (
                <div className="modal fade show d-block" tabIndex={-1} style={{border:'#000000'}}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content" style={{padding:'0px'}}>
                            <div className="modal-header">
                                <h5 className="modal-title">Confirm Action</h5>
                                <button type="button" className="btn-close" onClick={() => setShowConfirmModal(false)}></button>
                            </div>
                            <div className="modal-body" style={{fontSize:'14px'}}>
                                <p>
                                    Are you sure you want to {confirmAction} <strong>{selectedCrew?.name}</strong> (<em>{selectedCrew ? rankMap[selectedCrew.rankId] : ''}</em>)?
                                </p>
                            </div>
                            <div className="modal-footer" style={{padding:'12px'}}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowConfirmModal(false)}>No</button>
<button type="button" className="btn btn-primary" onClick={handleConfirm} disabled={isSavingApproval}>
   {isSavingApproval ? 'Saving…' : 'Yes'}
 </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <div className='app-main flex-column flex-row-fluid' id='kt_app_main'>
                <div className='d-flex flex-column flex-column-fluid'>
                    <div id='kt_app_content' className='app-content flex-column-fluid bg-white'>
                        <div className='card'>
                            {/* Header */}
                            <div className='px-5 py-3' style={{ backgroundColor: '#ffffff' }}>
                                <div className='d-flex justify-content-between'>
                                    <h3 className='card-title fw-bold text-dark'>Crew Management</h3>
                                    

                                    
                                </div>
                                {/* <div className='d-flex mt-3' style={{ gap: '6rem' }}>
                                    <p><span className='text-muted'>Total Crew Members:</span> <span style={{ fontWeight: '500' }}>{filteredCrewMembers.length}</span></p>
                                    <p><span className='text-muted'>Active:</span> <span style={{ fontWeight: '500' }}>{filteredCrewMembers.filter(c => c.status === 'Active').length}</span></p>
                                    <p><span className='text-muted'>Due For Relief:</span> <span style={{ fontWeight: '500' }}>{filteredCrewMembers.filter(c => c.status === 'Due For Relief').length}</span></p>
                                </div> */}


                                {/* Filter Controls */}
                                {/* <div className='px-5 py-3 border-top'> */}
                                {/* Main flex container with justify-content-between */}
                                <div className='d-flex mt-3 align-items-end flex-wrap justify-content-between gap-3'>

                                    {/* LEFT SIDE: All filters are grouped here */}
                                    <div className='d-flex align-items-end flex-wrap gap-3'>
                                        {/* Global Search */}
                                        <div style={{ minWidth: '200px' }}>
                                            <label className='form-label text-muted fw-semibold fs-7'>Global Search</label>
                                            <input
                                                type='text'
                                                className='form-control form-control-sm'
                                                placeholder='Search across all fields...'
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                        </div>

                                        {/* Rank Filter */}
                                        <div style={{ minWidth: '150px' }}>
                                            <label className='form-label text-muted fw-semibold fs-7'>Rank</label>
                                            <select
                                                className='form-select form-select-sm'
                                                value={selectedRank}
                                                onChange={(e) => setSelectedRank(e.target.value)}
                                            >
                                                <option value=''>All Ranks</option>
                                                {ranks.map(rank => (
                                                    <option key={rank.id} value={rank.rank}>
                                                        {rank.rank}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Conditional Filters */}
                                        {activeTab === 'approved' && (
                                            <>
                                                {/* Vessel Filter */}
                                                <div style={{ minWidth: '150px' }}>
                                                    <label className='form-label text-muted fw-semibold fs-7'>Vessel</label>
                                                    <select
                                                        className='form-select form-select-sm'
                                                        value={selectedVessel}
                                                        onChange={(e) => setSelectedVessel(e.target.value)}
                                                    >
                                                        <option value=''>All Vessels</option>
                                                        <option value='onLeave' className='badge-light-warning'>On Leave</option>
                                                        {vessels.map(vessel => (
                                                            <option key={vessel.id} value={vessel.fleet_name}>
                                                                {vessel.fleet_name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Status Filter */}
                                                <div style={{ minWidth: '120px' }}>
                                                    <label className='form-label text-muted fw-semibold fs-7'>Status</label>
                                                    <select
                                                        className='form-select form-select-sm'
                                                        value={selectedStatus}
                                                        onChange={(e) => setSelectedStatus(e.target.value)}
                                                    >
                                                        <option value=''>All Status</option>
                                                        <option value='Active'>Active</option>
                                                        <option value='On Leave'>On Leave</option>
                                                        <option value='InActive'>InActive</option>
                                                        <option value='Due For Relief'>Due For Relief</option>
                                                        <option value='Planned Assigned'>Planned Assigned</option>
                                                    </select>
                                                </div>
                                            
                                                {/* Contract End Range Preset */} 
{/* <div style={{ minWidth: '200px' }}> 
  <label className='form-label text-muted fw-semibold fs-7'>Contract Ended On</label> 
  <select
    className='form-select form-select-sm'  
    value={contractRangePreset}             
    onChange={(e) => setContractRangePreset(e.target.value as any)} 
  >
    <option value='1m'>Past 1 month</option>      
    <option value='6m'>Past 6 months</option>     
    <option value='1y'>Past 1 year (default)</option>
    <option value='5y'>Past 5 years</option>      
    <option value='all'>All</option>              
  </select>
  
</div> */}

                                            </>
                                        )}
                                        
                                        {/* Clear Filters Button */}
                                        <button
                                            className='btn btn-light btn-sm'
                                            onClick={clearFilters}
                                        >
                                            <KTSVG path='/media/icons/duotune/arrows/arr078.svg' className='svg-icon-2' />
                                            Clear Filters
                                        </button>
                                    </div>

                                    {/* RIGHT SIDE: Action buttons are grouped here. Note the use of align-items-center. */}
                                    <div className='d-flex align-items-center gap-2'>

                                        {/* Download Button - only shown in approved tab */}
                                        {activeTab === 'approved' && (
                                            <div className="position-relative d-inline-block export-dropdown">
                                                <button className="btn p-0 m-0">
                                                    <KTSVG path='/media/icons/duotune/general/download.svg' className='svg-icon-2x' />
                                                </button>
                                                <div className="dropdown-menu">
                                                    <div className="dropdown-item" onClick={() => {
                                                        if (selectedVessel === 'all' || selectedVessel === 'onLeave') {
                                                            setShowVesselFilterAlert(true);
                                                        } else {
                                                            setShowIMOExportModal(true);
                                                        }
                                                    }}>Export IMO Format</div>
                                                    <div className="dropdown-item">Export Company Format</div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Add Crew Button (This button will now be vertically centered as well) */}
                                        <div
                                            className="dropdown"
                                            onMouseEnter={() => {
                                                if (menuRef.current) menuRef.current.style.display = 'block';
                                            }}
                                            onMouseLeave={() => {
                                                if (menuRef.current) menuRef.current.style.display = 'none';
                                            }}
                                            style={{ position: 'relative' }}
                                        >
                                            <button
                                                className="btn btn_primary dropdown-toggle"
                                                type="button"
                                                onClick={() => setShowAddModal(true)}
                                            >
                                                Add Crew
                                            </button>
                                            <ul
                                                ref={menuRef}
                                                className="dropdown-menu"
                                                style={{ display: 'none', position: 'absolute', top: '100%', left: 0, marginTop: '2px', minWidth: '150px' }}
                                            >
                                                <li>
                                                    <button className="dropdown-item" onClick={() => { setShowAddModal(true); if (menuRef.current) menuRef.current.style.display = 'none'; }}>
                                                        Fill Here
                                                    </button>
                                                </li>
                                                {/* <li>
                                                    <button className="dropdown-item" onClick={handleExportExcel}>
                                                        Export as Excel
                                                    </button>
                                                </li>
                                                <li>
                                                    <button className="dropdown-item">Import CSV</button>
                                                </li> */}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                                {/* </div> */}
                            </div>

                            {/* Crew Table */}
                            <div className='border-top pt-5 px-5 bg-white'>
                                {/* Status Tabs */}
                                        <div className="btn-group" style={{marginBottom: '10px'}}>
                                             <button
                                            className={`btn btn-sm ${activeTab === 'approved' ? 'btn-primary' : 'btn-light'}`}
                                            onClick={() => setActiveTab('approved')}
                                            >
                                            Approved
                                            </button>
                                            <button
                                            className={`btn btn-sm ${activeTab === 'pending' ? 'btn-primary' : 'btn-light'}`}
                                            onClick={() => setActiveTab('pending')}
                                            >
                                            Pending
                                            </button>
                                           
                                            <button
                                            className={`btn btn-sm ${activeTab === 'rejected' ? 'btn-primary' : 'btn-light'}`}
                                            onClick={() => setActiveTab('rejected')}
                                            >
                                            Rejected
                                            </button>
                                        </div>

                                <div className="report-table table-responsive">
                                    <table className="table table-bordered align-middle">
                                        <thead className="table-header text-start">
                                            <tr>
                                                {/* These columns are ALWAYS visible */}
                                                <th style={{ width: '70px' }} className="text-center">SR/NO</th>
                                                <th onClick={() => handleSort('name')} className="cursor-pointer" style={{ paddingLeft: "2rem" }}>
                                                    NAME
                                                    <KTSVG
                                                        path={`/media/map/sort-col-${sortConfig.key === 'name' 
                                                            ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' 
                                                            : 'grey'}.svg`}
                                                        className="svg-icon ms-2 custom-sort-icon"
                                                    />
                                                </th>
                                                <th onClick={() => handleSort('rank')} className="cursor-pointer">
                                                    RANK
                                                    <KTSVG
                                                        path={`/media/map/sort-col-${sortConfig.key === 'rank' 
                                                            ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' 
                                                            : 'grey'}.svg`}
                                                        className="svg-icon ms-2 custom-sort-icon"
                                                    />
                                                </th>

                                                {/* FIX: These columns will now ONLY show if the tab is 'approved' */}
                                                {activeTab === 'approved' && (
                                                    <>
                                                        <th onClick={() => handleSort('vessel')} className="cursor-pointer">
                                                            VESSEL
                                                            <KTSVG
                                                                path={`/media/map/sort-col-${sortConfig.key === 'vessel' 
                                                                    ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' 
                                                                    : 'grey'}.svg`}
                                                                className="svg-icon ms-2 custom-sort-icon"
                                                            />
                                                        </th>
                                                        {/* <th onClick={() => handleSort('signOnDate')} className="cursor-pointer">
                                                            SIGN-ON DATE
                                                            <KTSVG
                                                                path={`/media/map/sort-col-${sortConfig.key === 'signOnDate' 
                                                                    ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' 
                                                                    : 'grey'}.svg`}
                                                                className="svg-icon ms-2 custom-sort-icon"
                                                            />
                                                        </th>
                                                        <th onClick={() => handleSort('signOffDate')} className="cursor-pointer">
                                                            SIGN-OFF DATE
                                                            <KTSVG
                                                                path={`/media/map/sort-col-${sortConfig.key === 'signOffDate' 
                                                                    ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' 
                                                                    : 'grey'}.svg`}
                                                                className="svg-icon ms-2 custom-sort-icon"
                                                            />
                                                        </th> */}
                                                        {/* <th onClick={() => handleSort('contractStartDate')} className="cursor-pointer">
                                                            CONTRACT START DATE
                                                            <KTSVG
                                                                path={`/media/map/sort-col-${sortConfig.key === 'contractStartDate' 
                                                                    ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' 
                                                                    : 'grey'}.svg`}
                                                                className="svg-icon ms-2 custom-sort-icon"
                                                            />
                                                        </th>
                                                        <th onClick={() => handleSort('contractEndDate')} className="cursor-pointer">
                                                            CONTRACT END DATE
                                                            <KTSVG
                                                                path={`/media/map/sort-col-${sortConfig.key === 'contractEndDate' 
                                                                    ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' 
                                                                    : 'grey'}.svg`}
                                                                className="svg-icon ms-2 custom-sort-icon"
                                                            />
                                                        </th> */}
                                                        {/* <th onClick={() => handleSort('status')} className="cursor-pointer">
                                                            PROMOTION DUE
                                                            <KTSVG
                                                                path={`/media/map/sort-col-${sortConfig.key === 'status' 
                                                                    ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' 
                                                                    : 'grey'}.svg`}
                                                                className="svg-icon ms-2 custom-sort-icon"
                                                            />
                                                        </th> */}
                                                        <th onClick={() => handleSort('status')} className="cursor-pointer">
                                                            STATUS
                                                            <KTSVG
                                                                path={`/media/map/sort-col-${sortConfig.key === 'status' 
                                                                    ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' 
                                                                    : 'grey'}.svg`}
                                                                className="svg-icon ms-2 custom-sort-icon"
                                                            />
                                                        </th>
                                                        {/* <th onClick={() => handleSort('relieverName')} className="cursor-pointer">
                                                            RELIEVER NAME
                                                            <KTSVG
                                                                path={`/media/map/sort-col-${sortConfig.key === 'relieverName' 
                                                                    ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' 
                                                                    : 'grey'}.svg`}
                                                                className="svg-icon ms-2 custom-sort-icon"
                                                            />
                                                        </th> */}
                                                        <th onClick={() => handleSort('dateOfAvailability')} className="cursor-pointer">
                                                            NEXT AVAILABLE DATE
                                                            <KTSVG
                                                                path={`/media/map/sort-col-${sortConfig.key === 'dateOfAvailability' 
                                                                    ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' 
                                                                    : 'grey'}.svg`}
                                                                className="svg-icon ms-2 custom-sort-icon"
                                                            />
                                                        </th>
                                                    </>
                                                )}

                                                {/* This column is ALWAYS visible */}
                                                <th style={{ width: '220px' }}>ACTIONS</th>
                                            </tr>
                                        </thead>
                                        <tbody className="table-body text-start">
                                        { (isBootLoading || !noDataDelayPassed) ? (
                                            <tr>
                                                <td colSpan={columnsCount} className="text-center py-10">
                                                    <div className="spinner-border text-primary" role="status" />
                                                        <div className="mt-2 text-muted">Loading crews…</div>
                                                        </td>
                                                        </tr>
                                                        ) : currentCrewMembers.length === 0 ? (
                                                            <tr>
                                                                <td colSpan={columnsCount} className="text-center text-muted py-5">
                                                                    No crew members found.
                                                                </td>
                                                            </tr>
                                                        ) : (


                                            currentCrewMembers.map((member, i) => {
                                                const srNo = indexOfFirst + i + 1; // keeps counting across pages
                                                const contractStatus = getContractStatus(member.contractEndDate);
                                                const originalCrew = crew.find(c => c.id === member.id);

                                                return (
                                                    <tr key={member.id}>
                                                        <td className="text-center">{srNo}</td>
                                                        <td style={{ paddingLeft: "2rem" }}>
                                                            <div className="d-flex align-items-center">
                                                                {/* --- MOVED: The bubble is now rendered BEFORE the name --- */}
                                                                {/* {activeTab === 'approved' && (
                                                                    <>
                                                                        {contractStatus === 'expired' && (
                                                                            <StatusBubble color="red" tooltip="Contract has expired" />
                                                                        )}
                                                                        {contractStatus === 'expiring_soon' && (
                                                                            <StatusBubble color="yellow" tooltip="Contract expires within 30 days" />
                                                                        )}
                                                                    </>
                                                                )} */}
                                                                
                                                                <a
                                                                    href="#"
                                                                    className="text-dark fw-bold text-hover-primary clickable"
                                                                    onClick={() => {
                                                                        setTrailCrewId(member.id);
                                                                        setTrailCrewName(member.name);
                                                                    }}
                                                                >
                                                                    {member.name}
                                                                </a>
                                                            </div>
                                                        </td>

                                                        {/* The rest of your table row remains the same */}
                                                        <td>{member.rank}</td>
                                                        {activeTab === 'approved' && (
                                                            <>
                                                                <td>{member.vessel}</td>
                                                                {/* <td>{formatDate(member.signOnDate)}</td>
                                                                <td>{formatDate(member.signOffDate)}</td> */}
                                                                {/* <td>{formatDate(member.contractStartDate)}</td>
                                                                <td>{formatDate(member.contractEndDate)}</td> */}
                                                                {/* <td>No</td> */}
                                                                <td>
                                                                    <span className={getStatusBadgeClass(member.status)}>
                                                                        {member.status}
                                                                    </span>
                                                                </td>
                                                                {/* <td>{member.relieverName}</td> */}
                                                                <td>{member.dateOfAvailability}</td>
                                                            </>
                                                        )}
                                                        {/* The Actions column is ALWAYS visible */}
                                                        <td>
                                                            <div className="d-flex align-items-center gap-3">
                                                                {/* --- Dropdown Button Group --- */}
                                                                <div className="btn-group">
                                                                    <button
                                                                        className="btn btn-sm btn-icon"
                                                                        title="View Options"
                                                                        data-bs-toggle="dropdown"
                                                                        aria-expanded="false"
                                                                        onClick={() => {
                                                                                    if (originalCrew) {
                                                                                        setSelectedCrew(originalCrew);
                                                                                        setIsViewCrewDetailsModalOpen(true);
                                                                                    }
                                                                                }}
                                                                    >
                                                                        <KTSVG path="/media/map/ph_eye.svg" className="svg-icon-3" />
                                                                    </button>
                                                                    <ul className="dropdown-menu">
                                                                        {/* This option is ALWAYS visible */}
                                                                        <li>
                                                                            <button
                                                                                className="dropdown-item"
                                                                                onClick={() => {
                                                                                    if (originalCrew) {
                                                                                        setSelectedCrew(originalCrew);
                                                                                        setIsViewCrewDetailsModalOpen(true);
                                                                                    }
                                                                                }}
                                                                            >
                                                                                View Crew Details
                                                                            </button>
                                                                        </li>
                                                                        
                                                                        {/* These options are ONLY visible on 'approved' and 'rejected' tabs */}
                                                                        {activeTab !== 'pending' && (
                                                                            <>
                                                                                {/* <li>
                                                                                    <button
                                                                                        className="dropdown-item"
                                                                                        onClick={() => handleOpenViewAssessmentModal(member)}
                                                                                    >
                                                                                        View Crew Assessment
                                                                                    </button>
                                                                                </li> */}
                                                                                {/* <li><hr className="dropdown-divider" /></li> */}
                                                                                {/* <li>
                                                                                    <button
                                                                                        className="dropdown-item"
                                                                                        onClick={() => {
                                                                                            console.log("Download Crew Details for:", originalCrew?.name);
                                                                                        }}
                                                                                    >
                                                                                        Download Crew Details
                                                                                    </button>
                                                                                </li>
                                                                                <li>
                                                                                    <button
                                                                                        className="dropdown-item"
                                                                                        onClick={() => {
                                                                                            console.log("Download Crew Assignment for:", originalCrew?.name);
                                                                                        }}
                                                                                    >
                                                                                        Download Crew Assessment
                                                                                    </button>
                                                                                </li> */}
                                                                            </>
                                                                        )}
                                                                    </ul>
                                                                </div>
                                                                {/* --- End Dropdown --- */}

                                                                <button
                                                                    className="btn btn-sm btn-icon"
                                                                    title="Edit"
                                                                    onClick={() => {
                                                                        if (originalCrew) {
                                                                            setSelectedCrew(originalCrew);
                                                                            setIsEditCrewModalOpen(true);
                                                                        }
                                                                    }}
                                                                >
                                                                    <KTSVG path="/media/map/edit-active.svg" className="svg-icon-3" />
                                                                </button>
                                                                {!originalCrew?.vessel?.fleet_name && (
                                                                <button
                                                                    className="btn btn-sm px-0"
                                                                    title={originalCrew?.active ? 'Deactivate' : 'Activate'}
                                                                    onClick={() => handleToggleActiveStatus(member.id, !!originalCrew?.active)}
                                                                >
                                                                    <KTSVG
                                                                    path={
                                                                        originalCrew?.active
                                                                        ? '/media/map/toggle-on-green.svg'
                                                                        : '/media/map/toggle-off-grey.svg'
                                                                    }
                                                                    className="svg-icon-2"
                                                                    />
                                                                </button>
                                                                )}
                                                                {/* <button
                                                                    className="btn btn-sm btn-icon"
                                                                    title="Delete"
                                                                    onClick={() => {
                                                                        if (originalCrew) {
                                                                            setSelectedCrew(originalCrew);
                                                                            setIsDeleteCrewModalOpen(true);
                                                                        }
                                                                    }}
                                                                >
                                                                    <KTSVG path="/media/map/trash.svg" className="svg-icon-3" />
                                                                </button> */}
                                                                
                                                                {/* Show Assessment button on Pending and Rejected tabs */}
                                                                {(activeTab === 'pending') && (
                                                                    <button
                                                                        className="btn btn_primary"
                                                                        type="button"
                                                                        title="Assessment"
                                                                        onClick={() => handleOpenAssessmentModal(member)}
                                                                    >
                                                                        <KTSVG path="/media/icons/duotune/abstract/abs027.svg" className="svg-icon-3" />
                                                                        {/* ASSESSMENT */}
                                                                        Approve/Reject
                                                                    </button>
                                                                )}
                                                                 {/* Show Assessment button on Pending and Rejected tabs */}
                                                                {/* {(activeTab === 'rejected') && (
                                                                    <button
                                                                        className="btn btn_primary"
                                                                        type="button"
                                                                        title="Assessment"
                                                                        onClick={() => handleOpenAssessmentModal(member)}
                                                                    >
                                                                        <KTSVG path="/media/icons/duotune/abstract/abs027.svg" className="svg-icon-3 text-nowrap" />
                                                                        <span>REASSESSMENT</span>
                                                                    </button>
                                                                )} */}

                                                                {/* Show Promotion button only on Approved tab */}
                                                                {/* {activeTab === 'approved' && (
                                                                    <button
                                                                        className="btn btn_primary"
                                                                        type="button"
                                                                        title="Promotion"
                                                                        onClick={() => handleOpenPromotionModal(member)}
                                                                    >
                                                                        <KTSVG path="/media/icons/duotune/arrows/arr062.svg" className="svg-icon-3" />
                                                                        PROMOTION
                                                                    </button>
                                                                )} */}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            })
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
                                                Showing <strong>{((currentPage - 1) * rowsPerPage) + 1}-{Math.min(currentPage * rowsPerPage, filteredCrewMembers.length)}</strong> of <strong>{filteredCrewMembers.length}</strong>
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
                                        {/* IMO FAL Form 5 Content (Hidden, only for PDF export)
                                This div will be targeted by html2pdf.js
                            */}
                            <div
                                id="imo-pdf-content"
                                style={{
                                    display: 'none', // hidden until export
                                    zIndex: '-99',
                                    width: '750px',   // A4 width in pixels at 96 DPI
                                    // Remove fixed minHeight to allow natural content flow
                                    padding: '15px',  // safe margins
                                    boxSizing: 'border-box',
                                    backgroundColor: '#fff',
                                }}
                            >
                                <style>
                                    {`
                                    @page { 
                                        size: A4 portrait; 
                                        margin: 15px; 
                                    }
                                    #imo-pdf-content { 
                                        margin: 0; 
                                        padding: 0; 
                                        font-family: serif; 
                                        font-size: 10pt;
                                        /* Allow natural height based on content */
                                        height: auto;
                                        min-height: auto;
                                    }
                                    #imo-pdf-content .imo-table {
                                        width: 100%;
                                        border-collapse: collapse;
                                        font-size: 9pt;
                                        table-layout: fixed;
                                        /* Prevent unnecessary page breaks */
                                        page-break-inside: auto;
                                    }
                                    #imo-pdf-content .imo-table th, #imo-pdf-content .imo-table td {
                                        border: 1px solid black;
                                        padding: 3px 5px;
                                        vertical-align: top;
                                        text-align: left;
                                        word-wrap: break-word;
                                        word-break: break-word;
                                        overflow-wrap: break-word;
                                        max-width: 0;
                                    }
                                    #imo-pdf-content .imo-table th {
                                        font-weight: bold;
                                        background-color: #f2f2f2;
                                        text-align: center;
                                    }
                                    #imo-pdf-content .imo-table thead {
                                        /* Keep header together */
                                        page-break-inside: avoid;
                                        page-break-after: avoid;
                                    }
                                    #imo-pdf-content .imo-table tbody tr {
                                        /* Prevent row breaks across pages unless necessary */
                                        page-break-inside: avoid;
                                        page-break-after: auto;
                                    }
                                    #imo-pdf-content .text-center-val { text-align: center; }
                                    #imo-pdf-content .imo-form-title { 
                                        text-align: center; 
                                        font-size: 14pt; 
                                        font-weight: bold; 
                                        margin-bottom: 2px; 
                                    }
                                    #imo-pdf-content .imo-form-subtitle { 
                                        text-align: center; 
                                        font-size: 10pt; 
                                        margin-top: 0; 
                                        margin-bottom: 10px; 
                                    }
                                    #imo-pdf-content .signature-box { 
                                        border: 1px solid black; 
                                        padding: 5px; 
                                        min-height: 40px; 
                                        margin-top: 15px; 
                                        font-size: 9pt;
                                        /* Keep signature box with content if possible */
                                        page-break-inside: avoid;
                                    }
                                    #imo-pdf-content .imo-table .top-header-cell {
                                        vertical-align: top;
                                        padding-top: 10px;
                                    }
                                    #imo-pdf-content .imo-table .checkbox-label {
                                        display: flex;
                                        align-items: center;
                                        gap: 3px;
                                        margin-bottom: 5px;
                                    }
                                    /* Responsive adjustments for smaller datasets - REMOVED to keep same styling */
                                    `}
                                </style>

                                {/* Date and Time when report was generated */}
                                <div style={{
                                    fontSize: '10pt',
                                    fontWeight: 'bold',
                                    marginBottom: '15px',
                                    textAlign: 'left'
                                }}>
                                    Report Generated: {(() => {
                                        const now = new Date();
                                        const day = String(now.getDate()).padStart(2, '0');
                                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                        const month = months[now.getMonth()];
                                        const year = now.getFullYear();
                                        const hours = String(now.getHours()).padStart(2, '0');
                                        const minutes = String(now.getMinutes()).padStart(2, '0');
                                        return `${day}/${month}/${year} ${hours}:${minutes}`;
                                    })()}
                                </div>

                                {/* Main Table for the entire form structure */}
                                <table className="imo-table">
                                        <thead>
                                            {/* Title Row */}
                                            <tr>
                                                <th colSpan={12} className="imo-form-title">CREW LIST</th>
                                            </tr>
                                            <tr>
                                                <th colSpan={12} className="imo-form-subtitle">(IMO FAL Form 5)</th>
                                            </tr>

                                            {/* Arrival/Departure Checkboxes and Page Number Row */}
                                            <tr>
                                                <td colSpan={12} className="top-header-cell">
                                                    <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '15px', marginBottom: '5px' }}>
                                                        <label className="checkbox-label">
                                                            <input type="checkbox" className="form-checkbox" style={{ verticalAlign: 'middle' }} checked={!!headerData.portOfArrival} readOnly />
                                                            <span>Arrival</span>
                                                        </label>
                                                        <label className="checkbox-label">
                                                            <input type="checkbox" className="form-checkbox" style={{ verticalAlign: 'middle' }} checked={!!headerData.portOfDeparture} readOnly />
                                                            <span>Departure</span>
                                                        </label>
                                                    </div>
                                                </td>
                                            </tr>
                                            
                                            {/* Section 1.1 - 1.4 Headers */}
                                            <tr>
                                                <th colSpan={3}>1.1 Name of ship</th>
                                                <th colSpan={3}>1.2 IMO number</th>
                                                <th colSpan={3}>1.3 Call sign</th>
                                                <th colSpan={3}>1.4 Voyage number</th>
                                            </tr>
                                            {/* Section 1.1 - 1.4 Data */}
                                            <tr>
                                                <td colSpan={3}>{headerData.vesselName || ''}</td>
                                                <td colSpan={3}>{headerData.imoNumber || ''}</td>
                                                <td colSpan={3}>{headerData.callSign || ''}</td>
                                                <td colSpan={3}>{headerData.voyageNumber || ''}</td>
                                            </tr>

                                            {/* Section 2 - 5 Headers */}
                                            <tr>
                                                <th colSpan={4}>2. Port of arrival/departure</th>
                                                <th colSpan={3}>3. Date of arrival/departure</th>
                                                <th colSpan={3}>4. Flag State of ship</th>
                                                <th colSpan={2}>5. Last port of call</th>
                                            </tr>
                                            {/* Section 2 - 5 Data */}
                                            <tr>
                                                <td colSpan={4}>{headerData.portOfArrival || ''}{' / '}{headerData.portOfDeparture || ''}</td>
                                                <td colSpan={3}>
                                                    {headerData.dateOfArrival
                                                        ? headerData.dateOfArrival.split('T')[0]
                                                        : ''} {' / '}
                                                        {headerData.dateOfDeparture
                                                        ? headerData.dateOfDeparture.split('T')[0]
                                                        : ''}
                                                </td>
                                                <td colSpan={3}>{headerData.flagState || ''}</td>
                                                <td colSpan={2}>{headerData.portOfDeparture || ''}</td>
                                            </tr>

                                            {/* Main Crew List Headers (6. No. to 17. Expiry date) */}
                                            <tr>
                                                <th style={{ width: '4%' }}>6. No.</th>
                                                <th style={{ width: '8%' }}>7. Family name</th>
                                                <th style={{ width: '8%' }}>8. Given names</th>
                                                <th style={{ width: '8%' }}>9. Rank or rating</th>
                                                <th style={{ width: '8%' }}>10. Nationality</th>
                                                <th style={{ width: '8%' }}>11. Date of birth</th>
                                                <th style={{ width: '8%' }}>12. Place of birth</th>
                                                <th style={{ width: '8%' }}>13. Gender</th>
                                                <th style={{ width: '10%' }}>14. Nature of identity document</th>
                                                <th style={{ width: '10%' }}>15. Number of identity document</th>
                                                <th style={{ width: '8%' }}>16. Issuing State of identity document</th>
                                                <th style={{ width: '8%' }}>17. Expiry date of identity document</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {currentCrew.length > 0 ? (
                                                currentCrew.map((crewItem, index) => {
                                                    const nameParts = crewItem.name ? crewItem.name.trim().split(' ') : ['', ''];
                                                    const familyName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : crewItem.name || '';
                                                    const givenNames = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : '';

                                                    return (
                                                        <tr key={crewItem.id || index}>
                                                            <td className="text-center-val">{index + 1}</td>
                                                            <td>{familyName}</td>
                                                            <td>{givenNames}</td>
                                                            <td>{rankMap[crewItem.rankId] || ''}</td>
                                                            <td>{crewItem.nationality || ''}</td>
                                                            <td>{crewItem.dateOfBirth || ''}</td>
                                                            <td>{crewItem.placeOfBirth || ''}</td>
                                                            <td>{crewItem.gender || ''}</td>
                                                              <td>{ ''}</td>
                                                            <td>{ ''}</td>
                                                            <td>{''}</td>
                                                            <td>
                                                                { ''}
                                                            </td>
                                                            {/* <td>{crewItem.identityDocType || ''}</td>
                                                            <td>{crewItem.identityDocNumber || ''}</td>
                                                            <td>{crewItem.identityIssuingState || ''}</td>
                                                            <td>
                                                                {crewItem.identityExpiryDate
                                                                    ? crewItem.identityExpiryDate.split('T')[0]
                                                                    : ''}
                                                            </td> */}
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan={12} className="text-center-val">No crew data to display for IMO form.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>

                                <div className="signature-box">
                                    <p>18. Date and signature by master, authorized agent or officer</p>
                                    {/* Placeholder for actual signature and date input if needed */}
                                </div>
                            </div>
                            {/* End of IMO FAL Form 5 Content */}
                                            
                                        </div>
                                    </div>
                                </div>
                                {isAddCrewModalOpen && (
                    <AddCrewModal
                        isOpen={isAddCrewModalOpen}
                        onClose={() => { setIsAddCrewModalOpen(false) }}
                        onCrewAdded={({ password, link, created }) => {
                            setCrew((prev) => (prev.some((c) => c.id === created.id) ? prev : [created, ...prev]));

                            setCrewLoginLink(link);
                            setNewCrewPassword(password);
                            setShowCrewCreds(true);
                            fetchCrew();             // refresh your list
                        }} />
                )}
                {isDeleteCrewModalOpen && (
                    <DeleteCrewModal
                        isOpen={isDeleteCrewModalOpen}
                        onClose={() => { setIsDeleteCrewModalOpen(false) }}
                        onCrewDeleted={fetchCrew}
                        crewData={selectedCrew || undefined}
                    />
                )}
                {isEditCrewModalOpen && selectedCrew && (
  <EditCrewModal
    isOpen={isEditCrewModalOpen}
    onClose={() => setIsEditCrewModalOpen(false)}
    crewId={selectedCrew.id}                 // <== PASS crewId here
    onUpdated={fetchCrew}                    // <== refresh list after update
  />
)}

                {isViewCrewDetailsModalOpen && (
                    <ViewCrewDetailsModal
                        isOpen={isViewCrewDetailsModalOpen}
                        onClose={() => { setIsViewCrewDetailsModalOpen(false) }}
                        crewId={selectedCrew?.id || undefined}
                    />
                )}
                {trailCrewId !== null && (
                    <TrailRecordsModal
                        crewId={trailCrewId}
                        crewName={trailCrewName}
                        onClose={() => setTrailCrewId(null)}
                    />
                )}

                {showCrewCreds && newCrewPassword && crewLoginLink && (
                    <div
                        className="modal fade show d-block"
                        tabIndex={-1}
                        style={{ background: 'rgba(0,0,0,0.5)' }}
                        onClick={() => setShowCrewCreds(false)}
                    >
                        <div
                            className="modal-dialog modal-dialog-centered"
                            onClick={e => e.stopPropagation()}
                            style={{ maxWidth: '40rem' }}
                        >
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Crew Credentials</h5>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={() => setShowCrewCreds(false)}
                                    />
                                </div>
                                <div className="modal-body">
                                    <p><strong>Password:</strong> {newCrewPassword}</p>
                                    {/* <p><strong>Login Link:</strong> <a href={crewLoginLink} target="_blank" rel="noopener noreferrer">{crewLoginLink}</a></p> */}
                                    <p className="text-danger">Please copy the credentials now. They will not be shown again.</p>
                                    <div className="d-flex gap-2">
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => {
                                                navigator.clipboard.writeText(newCrewPassword);
                                                toast.success("Password copied to clipboard");
                                            }}
                                        >
                                            <KTSVG path="/media/map/copy.svg" className="svg-icon-2 me-2" />
                                            Copy Password
                                        </button>
                                        {/* <button
                                            className="btn btn-primary"
                                            onClick={() => {
                                                navigator.clipboard.writeText(crewLoginLink);
                                                toast.success("Login link copied to clipboard");
                                            }}
                                        >
                                            <KTSVG path="/media/map/copy.svg" className="svg-icon-2 me-2" />
                                            Copy Login Link
                                        </button> */}
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowCrewCreds(false)}>
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* IMO Export Confirmation Modal */}
                {showIMOExportModal && (
                    <div
                        className="modal fade show d-block"
                        tabIndex={-1}
                        style={{ background: 'rgba(0,0,0,0.5)' }}
                        onClick={() => setShowIMOExportModal(false)}
                    >
                        <div
                            className="modal-dialog modal-dialog-centered modal-sm"
                            onClick={e => e.stopPropagation()}
                            style={{ maxWidth: '400px' }}
                        >
                            <div className="modal-content">
                                <div className="modal-header py-2">
                                    <h6 className="modal-title mb-0">Export IMO Format</h6>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={() => setShowIMOExportModal(false)}
                                    />
                                </div>
                                <div className="modal-body text-center py-3">
                                    <p className="mb-3" style={{ fontSize: '14px' }}>
                                        The records of {selectedVessel} {vesselList.find(v => v.fleet_name === selectedVessel)?.imoNumber} will be exported.
                                    </p>
                                    <p className="text-muted mb-0" style={{ fontSize: '13px' }}>
                                        Total records to be exported: <strong>{sortedAndFilteredCrew.length}</strong>
                                    </p>
                                </div>
                                <div className="modal-footer justify-content-center py-2">
                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-sm me-2"
                                        onClick={() => setShowIMOExportModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-primary btn-sm"
                                        onClick={() => {
                                            setShowIMOExportModal(false);
                                            handleExportIMO();
                                        }}
                                    >
                                        Download
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Vessel Filter Alert Modal */}
                {showVesselFilterAlert && (
                    <div
                        className="modal fade show d-block"
                        tabIndex={-1}
                        style={{ background: 'rgba(0,0,0,0.5)' }}
                        onClick={() => setShowVesselFilterAlert(false)}
                    >
                        <div
                            className="modal-dialog modal-dialog-centered modal-sm"
                            onClick={e => e.stopPropagation()}
                            style={{ maxWidth: '400px' }}
                        >
                            <div className="modal-content">
                                <div className="modal-header py-2">
                                    <h6 className="modal-title mb-0">Select Vessel</h6>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={() => setShowVesselFilterAlert(false)}
                                    />
                                </div>
                                <div className="modal-body text-center py-3">
                                    <p className="mb-3" style={{ fontSize: '14px' }}>
                                        Please select a specific vessel before exporting IMO format.
                                    </p>
                                    <p className="text-muted mb-0" style={{ fontSize: '13px' }}>
                                        Currently showing: <strong>{selectedVessel === 'all' ? 'All Vessels' : 'ON LEAVE'}</strong>
                                    </p>
                                </div>
                                <div className="modal-footer justify-content-center py-2">
                                    <button
                                        type="button"
                                        className="btn btn-primary btn-sm"
                                        onClick={() => setShowVesselFilterAlert(false)}
                                    >
                                        Okay
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
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
                    </div>
                </div>
            </div>
        </>
    );
};

export { CrewingList };
