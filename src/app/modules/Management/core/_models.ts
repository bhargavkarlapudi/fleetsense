// src/core/_models.ts

/**  
 * API now returns an object of previous names → dates, not an array  
 */
export interface PreviousNameDateMap {
  [name: string]: string
}

/**  
 * API now returns an object of previous class societies → dates  
 */
export interface PreviousClassSocietyMap {
  [society: string]: string
}

// ----------------------
// Response from GET /vessels/general-information/{id}
// ----------------------
export interface VesselGeneralInfo {
  vesselId: number
  dateUpdated: string

  vesselName: string
  // vesselImo?: string            // NEW: “vesselImo” in response
  isIntertankoMember: boolean   // NEW

  intertankoMemberImo: string

  // contactDetails: string      // 🗒️ old — now split into three:
  contactTel: string            // NEW
  contactFax: string            // NEW
  contactEmail: string          // NEW

  /** used to be PreviousNameDate[]; now a map */
  previousNamesAndDates: PreviousNameDateMap

  dateDelivered: string
  builder: string
  flagPortOfRegistry: string
  callSignMmsi: string

  vesselTypeIoppc: string
  otherVesselType: string | null
  hullType: string

  registeredOwner: string
  registeredOwnerImo: string
  registeredOwnerAddress: string   // NEW
  registeredOwnerTel: string       // NEW
  registeredOwnerFax: string       // NEW
  registeredOwnerEmail: string     // NEW

  technicalOperator: string
  technicalOperatorImo: string | null // NEW
  technicalOperatorAddress: string   // NEW
  technicalOperatorTel: string       // NEW
  technicalOperatorFax: string       // NEW
  technicalOperatorEmail: string     // NEW

  commercialOperator: string       // NEW
  disponentOwner: string           // NEW
  piClub: string                   // NEW
  piPollutionCoverageExpiry: string// NEW

  hullMachineryInsurer: string     // NEW
  hullMachineryInsuredValue: number// NEW
  hullMachineryInsuredExpiry: string// NEW

  classificationSociety: string
  classificationSocietyIacsMember: boolean
  classNotation: string
  openConditionsOfClass: string
  memorandaOfClass: string

  /** used to be single string; now a map */
  previousClassSocietyAndDates: PreviousClassSocietyMap

  iceClassLevel: string
  lastDryDockDate: string
  nextDryDockDate: string
  nextAnnualSurveyDue: string
  lastSpecialSurveyDate: string
  nextSpecialSurveyDate: string
  capRating: string

  lengthOverall: number
  lengthBetweenPerpendiculars: number
  extremeBreadth: number
  mouldedDepth: number
  keelToMastheadHeight: number
  keelToMastheadCollapsed?: number | null

  bridgeFrontToManifoldCentre: number
  bowToManifoldCentre: number
  sternToManifoldCentre: number
  parallelBodyDistance: number

  netTonnage: number
  grossTonnage: number
  reducedGrossTonnage: number
  suezGrossTonnage: number
  suezNetTonnage: number
  panamaNetTonnage: number
  panamaTransitFit: boolean

  loadlineSummer: string
  loadlineWinter: string
  loadlineTropical: string
  freshWaterAllowance: number
  tpcAtSummerDraft: number
  multipleDeadweights: string
  deadweightConstant: number
  companyUkcGuideline: number
  airDraft: number

  // Loadline breakdown fields
  summerDeadweight: number
  winterDeadweight: number

  summerFreeboard: number | null
  summerDraft: number | null
  summerDisplacement: number | null

  winterFreeboard: number | null
  winterDraft: number | null
  winterDisplacement: number | null

  tropicalFreeboard: number | null
  tropicalDraft: number | null
  tropicalDeadweight: number | null
  tropicalDisplacement: number | null

  normalLoadedFreeboard: number | null
  normalLoadedDraft: number | null
  normalLoadedDeadweight: number | null
  normalLoadedDisplacement: number | null

  lightshipFreeboard: number | null
  lightshipDraft: number | null
  lightshipDeadweight: number | null
  lightshipDisplacement: number | null

  normalBallastFreeboard: number | null
  normalBallastDraft: number | null
  normalBallastDeadweight: number | null
  normalBallastDisplacement: number | null

  segregatedBallastFreeboard: number | null
  segregatedBallastDraft: number | null
  segregatedBallastDeadweight: number | null
  segregatedBallastDisplacement: number | null

  // NEW forward/aft/parallel distances
  lightshipForwardToMid?: number | null
  lightshipAftToMid?: number | null
  lightshipParallelBody?: number | null

  normalBallastForwardToMid?: number | null
  normalBallastAftToMid?: number | null
  normalBallastParallelBody?: number | null

  summerDwtForwardToMid?: number | null
  summerDwtAftToMid?: number | null
  summerDwtParallelBody?: number | null
}

// ----------------------
// Payload for POST/PUT general-information
// ----------------------
export interface VesselGeneralInfoRequest {
  // vesselId?: number                // NEW on request
  dateUpdated: string

  vesselName: string
  // vesselImo?: string               // NEW
  isIntertankoMember: boolean      // NEW
  intertankoMemberImo: string

  // contactDetails?: string       // 🗒️ old
  contactTel: string               // NEW
  contactFax: string               // NEW
  contactEmail: string             // NEW

  previousNamesAndDates?: PreviousNameDateMap

  dateDelivered: string
  builder: string
  flagPortOfRegistry: string
  callSignMmsi: string

  vesselTypeIoppc: string
  otherVesselType?: string | null
  hullType: string

  registeredOwner: string
  registeredOwnerImo: string
  registeredOwnerAddress: string   // NEW
  registeredOwnerTel: string       // NEW
  registeredOwnerFax: string       // NEW
  registeredOwnerEmail: string     // NEW

  technicalOperator: string
  technicalOperatorImo?: string | null  // NEW
  technicalOperatorAddress: string       // NEW
  technicalOperatorTel: string           // NEW
  technicalOperatorFax: string           // NEW
  technicalOperatorEmail: string         // NEW

  commercialOperator: string          // NEW
  disponentOwner: string              // NEW
  piClub: string                      // NEW
  piPollutionCoverageExpiry: string   // NEW

  hullMachineryInsurer: string        // NEW
  hullMachineryInsuredValue: number   // NEW
  hullMachineryInsuredExpiry: string  // NEW

  classificationSociety: string
  classificationSocietyIacsMember: boolean
  classNotation: string
  openConditionsOfClass: string
  memorandaOfClass: string

  previousClassSocietyAndDates?: PreviousClassSocietyMap

  iceClassLevel: string
  lastDryDockDate: string
  nextDryDockDate: string
  nextAnnualSurveyDue: string
  lastSpecialSurveyDate: string
  nextSpecialSurveyDate: string
  capRating: string

  lengthOverall: number
  lengthBetweenPerpendiculars: number
  extremeBreadth: number
  mouldedDepth: number
  keelToMastheadHeight: number
  keelToMastheadCollapsed?: number

  bridgeFrontToManifoldCentre: number
  bowToManifoldCentre: number
  sternToManifoldCentre: number
  parallelBodyDistance: number

  netTonnage: number
  grossTonnage: number
  reducedGrossTonnage: number
  suezGrossTonnage: number
  suezNetTonnage: number
  panamaNetTonnage: number
  panamaTransitFit: boolean

  loadlineSummer: string
  loadlineWinter: string
  loadlineTropical: string
  freshWaterAllowance: number
  tpcAtSummerDraft: number
  multipleDeadweights: string
  deadweightConstant: number
  companyUkcGuideline: number
  airDraft: number

  summerDeadweight: number
  winterDeadweight: number

  // breakdown fields (can be null)
  summerFreeboard?: number | null
  summerDraft?: number | null
  summerDisplacement?: number | null
  winterFreeboard?: number | null
  winterDraft?: number | null
  winterDisplacement?: number | null
  tropicalFreeboard?: number | null
  tropicalDraft?: number | null
  tropicalDeadweight?: number | null
  tropicalDisplacement?: number | null
  normalLoadedFreeboard?: number | null
  normalLoadedDraft?: number | null
  normalLoadedDeadweight?: number | null
  normalLoadedDisplacement?: number | null
  lightshipFreeboard?: number | null
  lightshipDraft?: number | null
  lightshipDeadweight?: number | null
  lightshipDisplacement?: number | null
  normalBallastFreeboard?: number | null
  normalBallastDraft?: number | null
  normalBallastDeadweight?: number | null
  normalBallastDisplacement?: number | null
  segregatedBallastFreeboard?: number | null
  segregatedBallastDraft?: number | null
  segregatedBallastDeadweight?: number | null
  segregatedBallastDisplacement?: number | null

  lightshipForwardToMid?: number
  lightshipAftToMid?: number
  lightshipParallelBody?: number

  normalBallastForwardToMid?: number
  normalBallastAftToMid?: number
  normalBallastParallelBody?: number

  summerDwtForwardToMid?: number
  summerDwtAftToMid?: number
  summerDwtParallelBody?: number
}


// export interface PreviousNameDate {
//   name: string
//   date: string
// }

// // Response from GET /vessels/general-information/{id}
// export interface VesselGeneralInfo {
//   vesselId: number;
//   dateUpdated: string;
//   vesselName: string;
//   intertankoMemberImo: string;
//   previousNamesAndDates: PreviousNameDate[] | null
//   dateDelivered: string;
//   builder: string;
//   flagPortOfRegistry: string;
//   callSignMmsi: string;
//   contactDetails: string;
//   vesselTypeIoppc: string;
//   otherVesselType: string;
//   hullType: string;

//   registeredOwner: string;
//   registeredOwnerImo: string;
//   technicalOperator: string;
//   commercialOperator: string;
//   disponentOwner: string;
//   piClub: string;
//   piPollutionCoverageExpiry: string;
//   hullMachineryInsurer: string;
//   hullMachineryInsuredValue: number;
//   hullMachineryInsuredExpiry: string;

//   classificationSociety: string;
//   classificationSocietyIacsMember: boolean;
//   classNotation: string;
//   openConditionsOfClass: string;
//   memorandaOfClass: string;
//   previousClassSocietyAndDate: string;
//   iceClassLevel: string;
//   lastDryDockDate: string;
//   nextDryDockDate: string;
//   nextAnnualSurveyDue: string;
//   lastSpecialSurveyDate: string;
//   nextSpecialSurveyDate: string;
//   capRating: string;

//   lengthOverall: number;
//   lengthBetweenPerpendiculars: number;
//   extremeBreadth: number;
//   mouldedDepth: number;
//   keelToMastheadHeight: number;
//     keelToMastheadCollapsed: number | null
//   bridgeFrontToManifoldCentre: number;
//   bowToManifoldCentre: number;
//   sternToManifoldCentre: number;
//   parallelBodyDistance: number;

//   netTonnage: number;
//   grossTonnage: number;
//   reducedGrossTonnage: number;
//   suezGrossTonnage: number;
//   suezNetTonnage: number;
//   panamaNetTonnage: number;
//   panamaTransitFit: boolean;

//   loadlineSummer: string;
//   loadlineWinter: string;
//   loadlineTropical: string;
//   freshWaterAllowance: number;
//   tpcAtSummerDraft: number;
//   multipleDeadweights: string;
//   deadweightConstant: number;
//   companyUkcGuideline: number;
//   airDraft: number;

//   summerDeadweight: number;
//   winterDeadweight: number;

//   // Loadline breakdown fields
//   summerFreeboard: number | null;
//   summerDraft: number | null;
//   summerDisplacement: number | null;

//   winterFreeboard: number | null;
//   winterDraft: number | null;
//   winterDisplacement: number | null;

//   tropicalFreeboard: number | null;
//   tropicalDraft: number | null;
//   tropicalDeadweight: number | null;
//   tropicalDisplacement: number | null;

//   normalLoadedFreeboard: number | null;
//   normalLoadedDraft: number | null;
//   normalLoadedDeadweight: number | null;
//   normalLoadedDisplacement: number | null;

//   lightshipFreeboard: number | null;
//   lightshipDraft: number | null;
//   lightshipDeadweight: number | null;
//   lightshipDisplacement: number | null;

//   normalBallastFreeboard: number | null;
//   normalBallastDraft: number | null;
//   normalBallastDeadweight: number | null;
//   normalBallastDisplacement: number | null;

//   segregatedBallastFreeboard: number | null;
//   segregatedBallastDraft: number | null;
//   segregatedBallastDeadweight: number | null;
//   segregatedBallastDisplacement: number | null;

//   /** NEW: forward/aft/parallel-body distances for each lightship, ballast & summer DWT */
//   lightshipForwardToMid: number | null
//   lightshipAftToMid: number | null
//   lightshipParallelBody: number | null

//   normalBallastForwardToMid: number | null
//   normalBallastAftToMid: number | null
//   normalBallastParallelBody: number | null

//   summerDwtForwardToMid: number | null
//   summerDwtAftToMid: number | null
//   summerDwtParallelBody: number | null
// }

// // Payload for POST /vessels/general-information/{id}/create and PUT /update
// export interface VesselGeneralInfoRequest {
//   dateUpdated: string;
//   vesselName: string;
//   intertankoMemberImo: string;
//   previousNamesAndDates?: PreviousNameDate[]

//   dateDelivered: string;
//   builder: string;
//   flagPortOfRegistry: string;
//   callSignMmsi: string;
//   contactDetails: string;
//   vesselTypeIoppc: string;
//   otherVesselType: string;
//   hullType: string;

//   registeredOwner: string;
//   registeredOwnerImo: string;
//   technicalOperator: string;
//   commercialOperator: string;
//   disponentOwner: string;
//   piClub: string;
//   piPollutionCoverageExpiry: string;
//   hullMachineryInsurer: string;
//   hullMachineryInsuredValue: number;
//   hullMachineryInsuredExpiry: string;

//   classificationSociety: string;
//   classificationSocietyIacsMember: boolean;
//   classNotation: string;
//   openConditionsOfClass: string;
//   memorandaOfClass: string;
//   previousClassSocietyAndDate: string;
//   iceClassLevel: string;
//   lastDryDockDate: string;
//   nextDryDockDate: string;
//   nextAnnualSurveyDue: string;
//   lastSpecialSurveyDate: string;
//   nextSpecialSurveyDate: string;
//   capRating: string;

//   lengthOverall: number;
//   lengthBetweenPerpendiculars: number;
//   extremeBreadth: number;
//   mouldedDepth: number;
//   keelToMastheadHeight: number;
//   bridgeFrontToManifoldCentre: number;
//   bowToManifoldCentre: number;
//   sternToManifoldCentre: number;
//   parallelBodyDistance: number;

//   netTonnage: number;
//   grossTonnage: number;
//   reducedGrossTonnage: number;
//   suezGrossTonnage: number;
//   suezNetTonnage: number;
//   panamaNetTonnage: number;
//   panamaTransitFit: boolean;

//   loadlineSummer: string;
//   loadlineWinter: string;
//   loadlineTropical: string;
//   freshWaterAllowance: number;
//   tpcAtSummerDraft: number;
//   multipleDeadweights: string;
//   deadweightConstant: number;
//   companyUkcGuideline: number;
//   airDraft: number;

//   summerDeadweight: number;
//   winterDeadweight: number;

//   // loadline breakdown fields (all can be sent as null)
//   summerFreeboard: number | null;
//   summerDraft: number | null;
//   summerDisplacement: number | null;
//   winterFreeboard: number | null;
//   winterDraft: number | null;
//   winterDisplacement: number | null;
//   tropicalFreeboard: number | null;
//   tropicalDraft: number | null;
//   tropicalDeadweight: number | null;
//   tropicalDisplacement: number | null;
//   normalLoadedFreeboard: number | null;
//   normalLoadedDraft: number | null;
//   normalLoadedDeadweight: number | null;
//   normalLoadedDisplacement: number | null;
//   lightshipFreeboard: number | null;
//   lightshipDraft: number | null;
//   lightshipDeadweight: number | null;
//   lightshipDisplacement: number | null;
//   normalBallastFreeboard: number | null;
//   normalBallastDraft: number | null;
//   normalBallastDeadweight: number | null;
//   normalBallastDisplacement: number | null;
//   segregatedBallastFreeboard: number | null;
//   segregatedBallastDraft: number | null;
//   segregatedBallastDeadweight: number | null;
//   segregatedBallastDisplacement: number | null;

//   keelToMastheadCollapsed?: number

//   lightshipForwardToMid?: number
//   lightshipAftToMid?: number
//   lightshipParallelBody?: number

//   normalBallastForwardToMid?: number
//   normalBallastAftToMid?: number
//   normalBallastParallelBody?: number

//   summerDwtForwardToMid?: number
//   summerDwtAftToMid?: number
//   summerDwtParallelBody?: number

// }


export interface Vessel {
  name: any
  id: number;
  fleet_name: string;
  imoNumber: string;
  mmsi?: string;
  call_sign?: string;
  flag?: string;
  classes?: string;
  area?: string;
  dwt?: string;
  vesselType: string;
  companyAdmin: Company;
  companyGroupAdmin?: CompanyAdmin;
  active: boolean;
}

export interface Company {
  id: number;
  uid: {
    username: string;
    password: string;
    role: {
      id: number;
      roleType: string;
    };
    enabled: boolean;
  };
  cga: {
    id: number;
    name: string;
  };
  name: string;
  contactNo?: string;
  altContactNo?: string;
  email?: string;
  addressLine1: string;
  addressLine2: string;
  landmark: string;
  country: string;
  state: string;
  city: string;
  companyDetails: string;
  active: boolean;
  username?: string;
  password?: string;
};

export interface CompanyAdmin {
  id: number;
  uid: {
    username: string;
    password: string;
    role: {
      id: number;
      roleType: string;
    };
    enabled: boolean;
  };
  cgaid: {
    id: number;
  };
  name: string;
  contactNo: string;
  altContactNo: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  landmark: string;
  country: string;
  state: string;
  city: string;
  companyDetails: string;
  active: boolean;
};


export interface ForUSACalls {
  vesselId: number;
  submittedSpillResponsePlan: string;
  qualifiedIndividualFullStyle: string;
  oilSpillResponseOrgFullStyle: string;
  salvageAndMarineFirefightingServicesFullStyle: string;
}

export interface ForUSACallsRequest {
  submittedSpillResponsePlan: string;
  qualifiedIndividualFullStyle: string;
  oilSpillResponseOrgFullStyle: string;
  salvageAndMarineFirefightingServicesFullStyle: string;
}

export interface SafetyHelicopter {
  vesselId: number;
  winchingAreaDetails: string;
  helicopterCircleDiameter: string;
}

export interface SafetyHelicopterRequest {
  winchingAreaDetails: string;
  helicopterCircleDiameter: string;
}

export interface TankCoating {
  vesselId: number;
  cargoCoated: boolean;
  cargoCoatingType: string;
  cargoCoatingExtent: string;
  cargoAnodes: boolean;
  ballastCoated: boolean;
  ballastCoatingType: string;
  ballastCoatingExtent: string;
  ballastAnodes: boolean;
  slopCoated: boolean;
  slopCoatingType: string;
  slopCoatingExtent: string;
  slopAnodes: boolean;
  anodesFitted: boolean;
}

export interface TankCoatingRequest {
  cargoCoated: boolean;
  cargoCoatingType: string;
  cargoCoatingExtent: string;
  cargoAnodes: boolean;
  ballastCoated: boolean;
  ballastCoatingType: string;
  ballastCoatingExtent: string;
  ballastAnodes: boolean;
  slopCoated: boolean;
  slopCoatingType: string;
  slopCoatingExtent: string;
  slopAnodes: boolean;
  anodesFitted: boolean;
}

export interface Ballast {
  vesselId: number

  pumpCount: number
  pumpType: string
  pumpCapacity: string
  pumpHead: string

  eductorCount: number
  eductorType: string
  eductorCapacity: string
  eductorHead: string

  ballastHandlingData: string | null

  d1Performance: boolean | null
  d2Performance: boolean | null

  bwtsFitted: boolean | null
  bwtsType: string | null
  bwtsManufacturer: string | null
  imoTypeApproval: boolean | null
  uscgApproval: boolean | null
}

export interface BallastRequest {
  pumpCount: number
  pumpType: string
  pumpCapacity: string
  pumpHead: string

  eductorCount: number
  eductorType: string
  eductorCapacity: string
  eductorHead: string

  ballastHandlingData: string

  d1Performance: boolean
  d2Performance: boolean

  bwtsFitted: boolean
  bwtsType: string
  bwtsManufacturer: string
  imoTypeApproval: boolean
  uscgApproval: boolean
}


export interface CargoSystem {
  vesselId: number

  centerlineBulkheadFitted: boolean
  centerlineBulkheadType: string

  cargoTankCentre98Capacity: string
  cargoTankCentreTotalCount: number
  cargoTankWing98Capacity: string
  cargoTankWingTotalCount: number
  deckTank98Capacity: string
  deckTankTotalCount: number

  segregationCapacities: string

  slopsTank98Capacity: string
  slopsTank95Capacity: string
  slopsTankTotalCount: number

  gradesSegregationCount: number
  cargoContainmentType: string

  fillingRestrictions: boolean
  fillingRestrictionDetails: string

  maxLoadingWithVecs: string
  maxLoadingWithoutVecs: string
  loadedPerManifold: string
  loadedSimultaneously: string

  cargoControlRoomFitted: boolean
  ullageReadableFromCcr: boolean

  gaugingCertified: boolean
  gaugingNotCalibratedDetails: string
  gaugingSystemType: string
  overflowControlFitted: boolean
  overflowAutomaticClosing: boolean

  multipointGaugingFitted: boolean
  multipointGaugingType: string
  portableGaugingUnitsCount: number

  cargoPumpSimultaneousCount: number

  cargoPumpCount: number
  cargoPumpType: string
  cargoPumpCapacity: string
  cargoPumpHead: string

  cargoEductorCount: number
  cargoEductorType: string
  cargoEductorCapacity: string
  cargoEductorHead: string

  strippingPumpCount: number
  strippingPumpType: string
  strippingPumpCapacity: string
  strippingPumpHead: string

  emergencyPortablePumpProvided: boolean

  cleaningEquipmentFixedInCargoTanks: boolean
  portableCleaningProvided: boolean
  tankWashingPumpCapacity: string
  washingWaterHeaterFitted: boolean
  maxWashingWaterTemperature: string
  washingMachinesCount: number

  remoteTempMonitoringFitted: boolean
  remoteTempMonitoringOperational: boolean
  remotePressureMonitoringFitted: boolean
  remotePressureMonitoringOperational: boolean
  cargoTankDrierFitted: boolean
  cargoTankDrierOperational: boolean
  cargoTankDrierCapacity: string

  cargoCoolingSystemFitted: boolean
  cargoCoolingSystemDetails: string
  steamAvailableOnDeck: boolean

  manifoldHeightNormalBallast: string
  manifoldHeightSdwtCondition: string
  reducerDetails: string
  sternManifoldFitted: boolean
  sternManifoldSize: string

  cargoHeatingType: string
  cargoHeatingCoiled: boolean
  cargoHeatingMaterial: string
  slopHeatingType: string
  slopHeatingCoiled: boolean
  slopHeatingMaterial: string
  thermalOilHeatingFitted: boolean
  thermalOilSystemTanks: string
  maxCargoTemperature: string
  minCargoTemperature: string

  manifoldValveType: string
  manifoldMaterialRating: string
  distanceBetweenCargoManifoldCenters: string
  distanceShipRailToManifold: string
  distanceManifoldToShipSide: string
  topOfRailToCenterOfManifold: string
  distanceMainDeckToCenterOfManifold: string
  distanceSpillTankGratingToCenterOfManifold: string

  vrsFitted: boolean
  vrsOcimfCompliant: boolean
  vrsSegregationCount: number
  vecCertificationFitted: boolean
  vecCertificationIssuingAuthority: string
  vecsManifoldCount: number
  vecsManifoldSpecs: string
  vecsReducerCount: number
  vecsReducerSpecs: string

  ventingSystemType: string
}

export interface CargoSystemRequest {
  centerlineBulkheadFitted: boolean
  centerlineBulkheadType: string

  cargoTankCentre98Capacity: string
  cargoTankCentreTotalCount: number
  cargoTankWing98Capacity: string
  cargoTankWingTotalCount: number
  deckTank98Capacity: string
  deckTankTotalCount: number

  segregationCapacities: string

  slopsTank98Capacity: string
  slopsTank95Capacity: string
  slopsTankTotalCount: number

  gradesSegregationCount: number
  cargoContainmentType: string

  fillingRestrictions: boolean
  fillingRestrictionDetails: string

  maxLoadingWithVecs: string
  maxLoadingWithoutVecs: string
  loadedPerManifold: string
  loadedSimultaneously: string

  cargoControlRoomFitted: boolean
  ullageReadableFromCcr: boolean

  gaugingCertified: boolean
  gaugingNotCalibratedDetails: string
  gaugingSystemType: string
  overflowControlFitted: boolean
  overflowAutomaticClosing: boolean

  multipointGaugingFitted: boolean
  multipointGaugingType: string
  portableGaugingUnitsCount: number

  cargoPumpSimultaneousCount: number

  cargoPumpCount: number
  cargoPumpType: string
  cargoPumpCapacity: string
  cargoPumpHead: string

  cargoEductorCount: number
  cargoEductorType: string
  cargoEductorCapacity: string
  cargoEductorHead: string

  strippingPumpCount: number
  strippingPumpType: string
  strippingPumpCapacity: string
  strippingPumpHead: string

  emergencyPortablePumpProvided: boolean

  cleaningEquipmentFixedInCargoTanks: boolean
  portableCleaningProvided: boolean
  tankWashingPumpCapacity: string
  washingWaterHeaterFitted: boolean
  maxWashingWaterTemperature: string
  washingMachinesCount: number

  remoteTempMonitoringFitted: boolean
  remoteTempMonitoringOperational: boolean
  remotePressureMonitoringFitted: boolean
  remotePressureMonitoringOperational: boolean
  cargoTankDrierFitted: boolean
  cargoTankDrierOperational: boolean
  cargoTankDrierCapacity: string

  cargoCoolingSystemFitted: boolean
  cargoCoolingSystemDetails: string
  steamAvailableOnDeck: boolean

  manifoldHeightNormalBallast: string
  manifoldHeightSdwtCondition: string
  reducerDetails: string
  sternManifoldFitted: boolean
  sternManifoldSize: string

  cargoHeatingType: string
  cargoHeatingCoiled: boolean
  cargoHeatingMaterial: string
  slopHeatingType: string
  slopHeatingCoiled: boolean
  slopHeatingMaterial: string
  thermalOilHeatingFitted: boolean
  thermalOilSystemTanks: string
  maxCargoTemperature: string
  minCargoTemperature: string

  manifoldValveType: string
  manifoldMaterialRating: string
  distanceBetweenCargoManifoldCenters: string
  distanceShipRailToManifold: string
  distanceManifoldToShipSide: string
  topOfRailToCenterOfManifold: string
  distanceMainDeckToCenterOfManifold: string
  distanceSpillTankGratingToCenterOfManifold: string

  vrsFitted: boolean
  vrsOcimfCompliant: boolean
  vrsSegregationCount: number
  vecCertificationFitted: boolean
  vecCertificationIssuingAuthority: string
  vecsManifoldCount: number
  vecsManifoldSpecs: string
  vecsReducerCount: number
  vecsReducerSpecs: string

  ventingSystemType: string
}

export interface VacuumSystem {
  vesselId: number

  // Mooring wires, four locations
  wiresForecastleCount: number | null
  wiresForecastleDiameter: string | null
  wiresForecastleMaterial: string | null
  wiresForecastleLength: string | null
  wiresForecastleBreakingStrength: string | null

  wiresMainDeckFwdCount: number | null
  wiresMainDeckFwdDiameter: string | null
  wiresMainDeckFwdMaterial: string | null
  wiresMainDeckFwdLength: string | null
  wiresMainDeckFwdBreakingStrength: string | null

  wiresMainDeckAftCount: number | null
  wiresMainDeckAftDiameter: string | null
  wiresMainDeckAftMaterial: string | null
  wiresMainDeckAftLength: string | null
  wiresMainDeckAftBreakingStrength: string | null

  wiresPoopDeckCount: number | null
  wiresPoopDeckDiameter: string | null
  wiresPoopDeckMaterial: string | null
  wiresPoopDeckLength: string | null
  wiresPoopDeckBreakingStrength: string | null

  // Poop-deck winches
  winchesPoopDeckCount: number | null
  winchesPoopDeckDiameter: string | null
  winchesPoopDeckMaterial: string | null
  winchesPoopDeckLength: string | null
  winchesPoopDeckBrakingStrength: string | null

  // Bollards & bitts (still a free-text blob)
  bollardsBittsDetails: string | null

  // Fairleads & chocks
  fairleadsChocksDetails: string | null

  // Shackles
  shacklesPortCount: number | null
  shacklesStarboardCount: number | null

  // Emergency towing
  emergencyTowingForwardType: string | null
  emergencyTowingForwardSwl: string | null
  emergencyTowingAftType: string | null
  emergencyTowingAftSwl: string | null

  sternChockFairleadSize: string | null
  escortTugChockFairleadSwl: string | null
  poopDeckBollardSwl: string | null

  craneDetails: string | null
  accommodationLadderDirection: string | null
  portableGangwayFitted: boolean
  portableGangwayLength: string | null

  spmOcimfCompliant: boolean | null
  spmChainStoppersCount: number | null
  spmChainStoppersDetails: string | null
  spmFairleadDistance: string | null
  spmBowFairleadToBracketDistance: string | null
  spmOcimfChockSizeOk: boolean | null
  spmOcimfChockSizeDetails: string | null
}

export interface VacuumSystemRequest {
  wiresForecastleCount: number | null
  wiresForecastleDiameter: string | null
  wiresForecastleMaterial: string | null
  wiresForecastleLength: string | null
  wiresForecastleBreakingStrength: string | null

  wiresMainDeckFwdCount: number | null
  wiresMainDeckFwdDiameter: string | null
  wiresMainDeckFwdMaterial: string | null
  wiresMainDeckFwdLength: string | null
  wiresMainDeckFwdBreakingStrength: string | null

  wiresMainDeckAftCount: number | null
  wiresMainDeckAftDiameter: string | null
  wiresMainDeckAftMaterial: string | null
  wiresMainDeckAftLength: string | null
  wiresMainDeckAftBreakingStrength: string | null

  wiresPoopDeckCount: number | null
  wiresPoopDeckDiameter: string | null
  wiresPoopDeckMaterial: string | null
  wiresPoopDeckLength: string | null
  wiresPoopDeckBreakingStrength: string | null

  winchesPoopDeckCount: number | null
  winchesPoopDeckDiameter: string | null
  winchesPoopDeckMaterial: string | null
  winchesPoopDeckLength: string | null
  winchesPoopDeckBrakingStrength: string | null

  bollardsBittsDetails: string | null
  fairleadsChocksDetails: string | null
  shacklesPortCount: number | null
  shacklesStarboardCount: number | null

  emergencyTowingForwardType: string | null
  emergencyTowingForwardSwl: string | null
  emergencyTowingAftType: string | null
  emergencyTowingAftSwl: string | null

  sternChockFairleadSize: string | null
  escortTugChockFairleadSwl: string | null
  poopDeckBollardSwl: string | null

  craneDetails: string | null
  accommodationLadderDirection: string | null
  portableGangwayFitted: boolean
  portableGangwayLength: string | null

  spmOcimfCompliant: boolean | null
  spmChainStoppersCount: number | null
  spmChainStoppersDetails: string | null
  spmFairleadDistance: string | null
  spmBowFairleadToBracketDistance: string | null
  spmOcimfChockSizeOk: boolean | null
  spmOcimfChockSizeDetails: string | null
}

export interface PropulsionSystem {
  vesselId: number;
  ballastSpeedMax: string;
  ballastSpeedEconomical: string;
  ladenSpeedMax: string;
  ladenSpeedEconomical: string;

  mainPropulsionFuel: string;
  generatingPlantFuel: string;

  bunkerFuelOilCapacity: string;
  bunkerDieselOilCapacity: string;
  bunkerOtherSpecify: string;

  propellerPitchType: string;

  mainEngineCount: number;
  mainEngineCapacity: string;
  mainEngineMakeType: string;

  auxEngineCount: number;
  auxEngineCapacity: string;
  auxEngineMakeType: string;

  powerPackCount: number;
  powerPackCapacity: string;

  boilerCount: number;
  boilerCapacity: string;
  boilerMakeType: string;

  bowThrusterBhp: string;
  sternThrusterBhp: string;

  hasEediRating: boolean;
  eediRating: string;
  eediNoReason: string;
  eediVerifiedBy: string;

  hasEexiRating: boolean;
  eexiRating: string;
  eexiNoReason: string;
  eexiVerifiedBy: string;

  hasCiiRating: boolean;
  ciiRating: string;
  ciiNoReason: string;
  ciiVerifiedBy: string;

  hasEivRating: boolean;
  eivRating: string;
  eivNoReason: string;
  eivVerifiedBy: string;

  noxControlTier: string;
  noxEquipmentList: string;

  egcsFitted: boolean;
  scrubberType: string;
}

export interface PropulsionSystemRequest {
  ballastSpeedMax: string;
  ballastSpeedEconomical: string;
  ladenSpeedMax: string;
  ladenSpeedEconomical: string;

  mainPropulsionFuel: string;
  generatingPlantFuel: string;

  bunkerFuelOilCapacity: string;
  bunkerDieselOilCapacity: string;
  bunkerOtherSpecify: string;

  propellerPitchType: string;

  mainEngineCount: number;
  mainEngineCapacity: string;
  mainEngineMakeType: string;

  auxEngineCount: number;
  auxEngineCapacity: string;
  auxEngineMakeType: string;

  powerPackCount: number;
  powerPackCapacity: string;

  boilerCount: number;
  boilerCapacity: string;
  boilerMakeType: string;

  bowThrusterBhp: string;
  sternThrusterBhp: string;

  hasEediRating: boolean;
  eediRating: string;
  eediNoReason: string;
  eediVerifiedBy: string;

  hasEexiRating: boolean;
  eexiRating: string;
  eexiNoReason: string;
  eexiVerifiedBy: string;

  hasCiiRating: boolean;
  ciiRating: string;
  ciiNoReason: string;
  ciiVerifiedBy: string;

  hasEivRating: boolean;
  eivRating: string;
  eivNoReason: string;
  eivVerifiedBy: string;

  noxControlTier: string;
  noxEquipmentList: string;

  egcsFitted: boolean;
  scrubberType: string;
}

/** Landing page API: GET /vessels/landing/{id} */

export interface VesselLandingCompanyGroupAdmin {
  id: number
  uid: number
  name: string
  username: string | null
  contactNo: string | null
  altContactNo: string | null
  email: string | null
  addressLine1: string | null
  addressLine2: string | null
  landmark: string | null
  country: string | null
  state: string | null
  city: string | null
  companyGroupAdminDetails: string | null
  password: string | null
  active: boolean
}

export interface VesselLandingVesselDto {
  id: number
  fleet_name: string | null
  vesselType: string | null
  imoNumber: string | null
  mmsi: number | string | null
  call_sign: string | null
  flag: string | null
  classes: string | null
  area: string | null
  dwt: string | null
  dynamicUrl?: string | null
  companyAdminId?: number | null
  companyGroupAdminId?: number | null
  voyages?: any
  active: boolean
  companyAdmin?: any
  companyGroupAdmin?: VesselLandingCompanyGroupAdmin | null
}

export interface VesselLandingVoyageLite {
  id: number
  voyageNumber: string | null
  departurePort: string | null
  arrivalPort: string | null
  startDate: string | null
  endDate: string | null
  companyGroupAdminId: number | null
  companyAdminId: number | null
  vessel: Partial<VesselLandingVesselDto> | null
  voyageRoute: string | null
  active: boolean
  legID: string | null
  status: string | null
  securityLevel: string | null
  iceVoyage: string | null
  eca: string | null
  etd: string | null
  cosp: string | null
  eosp: string | null
  arrivalFew: string | null
  eta: string | null
  estimatedDistance: string | null
  displacement: string | null
  draftFore: string | null
  draftMid: string | null
  draftAft: string | null
  totalCargoOnboard: string | null
  loadingCondition: string | null
  chartererName: string | null
  chartererNo: string | null
  cpSpeed: string | null
  cpConsumptionTotal: string | null
}

export interface VesselLandingResponse {
  vesseldto: VesselLandingVesselDto
  lastPort: string | null
  atd: string | null
  nextPort: string | null
  eta: string | null
  speed: string | null
  distanceObserved: string | null
  course: string | null
  cargoWeight: string | null
  latitude: string | null
  longitude: string | null
  status: string | null
  lastUpdated: string | null
  latLongSource: string | null
  masterName: string | null
  masterContactNumber: string | null
  masterEmail: string | null
  chiefEngineerName: string | null
  chiefEngineerContactNumber: string | null
  chiefEngineerEmail: string | null
  latestVoyage: VesselLandingVoyageLite | null
}


// --- OPERATORS (a.k.a. Users) ----------------------------------------------
export interface Operator {
  id: number
  name: string
  companyGroupAdminId: number | null
  companyAdminId: number | null
  username: string
  userId: number | null
  email: string | null
  contact_no: string | null
  date_of_birth: string | null // e.g. "1960-07-04T00:00:00"
  password: string | null      // may be hashed/null/plain from API
  active: boolean
}

export interface CreateOperatorRequest {
  username: string
  password: string
  name: string
  email: string
  contact_no: string
  date_of_birth: string // ISO with time, e.g. "YYYY-MM-DDT00:00:00"
  companyAdminId: number | null
  companyGroupAdminId: number | null
}


export interface UpdateOperatorRequest {
  username: string
  password: string
  name: string
  email?: string | null
  contact_no?: string | null
  date_of_birth?: string | null
  companyAdminId: number | null
  companyGroupAdminId: number | null
}

// --- VENDORS -----------------------------------------------------------------
export interface VendorCategory {
  id: number
  name: string
}

export interface Vendor {
  id: number
  code: string
  name: string
  cgaid: number
  caId: number | null
  email: string
  password: string | null
  contactNo: string
  altContactNo: string
  tag: string
  categoryIds: number[]
  attachments: any[]
  totalOrders: number
  avgDeliveryDays: number
  issueCount: number
}

export interface CreateVendorRequest {
  code: string
  name: string
  email: string
  password: string
  contactNo: string
  altContactNo: string
  tag: string
  categoryIds: number[]
  totalOrders: number
  avgDeliveryDays: number
  issueCount: number
  cgaid: number
  caId: number | null
}

export interface UpdateVendorRequest {
  code: string
  name: string
  email: string
  contactNo: string
  altContactNo: string
  tag: string
  categoryIds: number[]
  totalOrders: number
  avgDeliveryDays: number
  issueCount: number
  cgaid: number
  caId: number | null
}
