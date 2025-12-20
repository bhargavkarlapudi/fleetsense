import React, {useEffect, useState} from 'react'
import {toast} from 'react-toastify'
import {KTSVG} from '../../../../_metronic/helpers'
import {
  Vessel,
  VesselGeneralInfo,
  VesselGeneralInfoRequest,
  ForUSACalls,
  ForUSACallsRequest,
  SafetyHelicopter,
  SafetyHelicopterRequest,
  TankCoating,
  TankCoatingRequest,
  Ballast,
  BallastRequest,
  CargoSystem,
  CargoSystemRequest,
  VacuumSystem,
  VacuumSystemRequest,
  PropulsionSystem,
  PropulsionSystemRequest,
  PreviousNameDateMap,
  PreviousClassSocietyMap,
} from '../core/_models'
import {
  getGeneralInfoOfVessel,
  createGeneralInfoOfVessel,
  updateGeneralInfoOfVessel,
  getForUSACalls,
  createForUSACalls,
  updateForUSACalls,
  getSafetyHelicopter,
  createSafetyHelicopter,
  updateSafetyHelicopter,
  getTankCoating,
  createTankCoating,
  updateTankCoating,
  getBallast,
  createBallast,
  updateBallast,
  getCargoSystem,
  createCargoSystem,
  updateCargoSystem,
  getVacuumSystem,
  createVacuumSystem,
  updateVacuumSystem,
  getPropulsionSystem,
  createPropulsionSystem,
  updatePropulsionSystem,
} from '../core/_requests'

/**
 * Returns true if every field (except ignored keys) is null/undefined/empty-string/false/empty-array/empty-object
 */
function isSectionEmpty<T extends Record<string, any>>(data: T, ignore: (keyof T)[] = []) {
  return Object.entries(data)
    .filter(([k]) => !ignore.includes(k as keyof T))
    .every(
      ([, v]) =>
        v === '' ||
        v === false ||
        v == null ||
        (Array.isArray(v) && v.length === 0) ||
        (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0)
    )
}

interface Props {
  isOpen: boolean
  isEdit: boolean
  onClose: () => void
  onVesselAdded: () => void
  vesselData: Vessel
}

const AddAdditionalInfoModal: React.FC<Props> = ({
  isOpen,
  isEdit,
  onClose,
  onVesselAdded,
  vesselData,
}) => {
  // track which sections already exist on the server
  const [hasGeneral, setHasGeneral] = useState(false)
  const [hasUSA, setHasUSA] = useState(false)
  const [hasSafety, setHasSafety] = useState(false)
  const [hasCoating, setHasCoating] = useState(false)
  const [hasBallast, setHasBallast] = useState(false)
  const [hasCargo, setHasCargo] = useState(false)
  const [hasVacuum, setHasVacuum] = useState(false)
  const [hasPropulsion, setHasPropulsion] = useState(false)

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[0-9+\-\s()]{6,20}$/

function isValidEmail(email: string) {
  return EMAIL_RE.test(email.trim())
}
function isValidPhone(phone: string) {
  return PHONE_RE.test(phone.trim())
}
  // Validation error states
  const [contactTelError, setContactTelError] = useState<string | null>(null)
  const [contactFaxError, setContactFaxError] = useState<string | null>(null)
  const [contactEmailError, setContactEmailError] = useState<string | null>(null)
  const [registeredOwnerTelError, setRegisteredOwnerTelError] = useState<string | null>(null)
  const [registeredOwnerFaxError, setRegisteredOwnerFaxError] = useState<string | null>(null)
  const [registeredOwnerEmailError, setRegisteredOwnerEmailError] = useState<string | null>(null)
  const [technicalOperatorTelError, setTechnicalOperatorTelError] = useState<string | null>(null)
  const [technicalOperatorFaxError, setTechnicalOperatorFaxError] = useState<string | null>(null)
  const [technicalOperatorEmailError, setTechnicalOperatorEmailError] = useState<string | null>(null)


  // which tab is active
  const [activeTab, setActiveTab] = useState<
    'step1' | 'step2' | 'step3' | 'step4' | 'step5' | 'step6' | 'step7' | 'step8'
  >('step1')
  const [error, setError] = useState<string | null>(null)

  // --- Step 1 fields (General Information) ---
  const [isIntertankoMember, setIsIntertankoMember] = useState(false)
  // const [vesselImo, setVesselImo] = useState('')
  const [intertankoMemberImo, setIntertankoMemberImo] = useState('')
  const [previousNamesAndDates, setPreviousNamesAndDates] = useState<PreviousNameDateMap>({})
  const [newPrevName, setNewPrevName] = useState('')
  const [newPrevDate, setNewPrevDate] = useState('')
  const [dateDelivered, setDateDelivered] = useState('')
  const [builder, setBuilder] = useState('')
    const [flagPortOfRegistry, setFlagPortOfRegistry] = useState('')
  const [callSignMmsi, setCallSignMmsi] = useState('')
  const [contactTel, setContactTel] = useState('')
  const [contactFax, setContactFax] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [vesselTypeIoppc, setVesselTypeIoppc] = useState('')
  const [otherVesselType, setOtherVesselType] = useState<string | null>('')
  const [hullType, setHullType] = useState('')
  const [registeredOwner, setRegisteredOwner] = useState('')
  const [registeredOwnerImo, setRegisteredOwnerImo] = useState('')
  const [registeredOwnerAddress, setRegisteredOwnerAddress] = useState('')
  const [registeredOwnerTel, setRegisteredOwnerTel] = useState('')
  const [registeredOwnerFax, setRegisteredOwnerFax] = useState('')
  const [registeredOwnerEmail, setRegisteredOwnerEmail] = useState('')
  const [technicalOperator, setTechnicalOperator] = useState('')
  const [technicalOperatorImo, setTechnicalOperatorImo] = useState<string | null>('')
  const [technicalOperatorAddress, setTechnicalOperatorAddress] = useState('')
  const [technicalOperatorTel, setTechnicalOperatorTel] = useState('')
  const [technicalOperatorFax, setTechnicalOperatorFax] = useState('')
  const [technicalOperatorEmail, setTechnicalOperatorEmail] = useState('')
  const [commercialOperator, setCommercialOperator] = useState('')
  const [disponentOwner, setDisponentOwner] = useState('')
  const [piClub, setPiClub] = useState('')
  const [piPollutionCoverageExpiry, setPiPollutionCoverageExpiry] = useState('')
  const [hullMachineryInsurer, setHullMachineryInsurer] = useState('')
  const [hullMachineryInsuredValue, setHullMachineryInsuredValue] = useState<number>(0)
  const [hullMachineryInsuredExpiry, setHullMachineryInsuredExpiry] = useState('')
  const [classificationSociety, setClassificationSociety] = useState('')
  const [classificationSocietyIacsMember, setClassificationSocietyIacsMember] = useState(false)
  const [classNotation, setClassNotation] = useState('')
  const [openConditionsOfClass, setOpenConditionsOfClass] = useState('')
  const [hasOpenClassConditions, setHasOpenClassConditions] = useState(false)
  const [memorandaOfClass, setMemorandaOfClass] = useState('')
  const [previousClassSocietyAndDates, setPreviousClassSocietyAndDates] = useState<
    PreviousClassSocietyMap
  >({})
  const [newClassSociety, setNewClassSociety] = useState('')
  const [newClassSocietyDate, setNewClassSocietyDate] = useState('')
  const [iceClassLevel, setIceClassLevel] = useState('')
  const [hasIceClass, setHasIceClass] = useState(false)
  const [lastDryDockDate, setLastDryDockDate] = useState('')
  const [nextDryDockDate, setNextDryDockDate] = useState('')
  const [nextAnnualSurveyDue, setNextAnnualSurveyDue] = useState('')
  const [lastSpecialSurveyDate, setLastSpecialSurveyDate] = useState('')
  const [nextSpecialSurveyDate, setNextSpecialSurveyDate] = useState('')
  const [capRating, setCapRating] = useState('')
  // Dimensions & Tonnages
  const [lengthOverall, setLengthOverall] = useState<number>(0)
  const [lengthBetweenPerpendiculars, setLengthBetweenPerpendiculars] = useState<number>(0)
  const [extremeBreadth, setExtremeBreadth] = useState<number>(0)
  const [mouldedDepth, setMouldedDepth] = useState<number>(0)
  const [keelToMastheadHeight, setKeelToMastheadHeight] = useState<number>(0)
  const [keelToMastheadCollapsed, setKeelToMastheadCollapsed] = useState<number | null>(null)
  const [bridgeFrontToManifoldCentre, setBridgeFrontToManifoldCentre] = useState<number>(0)
  const [bowToManifoldCentre, setBowToManifoldCentre] = useState<number>(0)
  const [sternToManifoldCentre, setSternToManifoldCentre] = useState<number>(0)
  const [parallelBodyDistance, setParallelBodyDistance] = useState<number>(0)
  const [netTonnage, setNetTonnage] = useState<number>(0)
  const [grossTonnage, setGrossTonnage] = useState<number>(0)
  const [reducedGrossTonnage, setReducedGrossTonnage] = useState<number>(0)
  const [suezGrossTonnage, setSuezGrossTonnage] = useState<number>(0)
  const [suezNetTonnage, setSuezNetTonnage] = useState<number>(0)
  const [panamaNetTonnage, setPanamaNetTonnage] = useState<number>(0)
  const [panamaTransitFit, setPanamaTransitFit] = useState(false)
  const [loadlineSummer, setLoadlineSummer] = useState('')
  const [loadlineWinter, setLoadlineWinter] = useState('')
  const [loadlineTropical, setLoadlineTropical] = useState('')
  const [freshWaterAllowance, setFreshWaterAllowance] = useState<number>(0)
  const [tpcAtSummerDraft, setTpcAtSummerDraft] = useState<number>(0)
  const [multipleDeadweights, setMultipleDeadweights] = useState('')
  const [deadweightConstant, setDeadweightConstant] = useState<number>(0)
  const [companyUkcGuideline, setCompanyUkcGuideline] = useState<number>(0)
  const [airDraft, setAirDraft] = useState<number>(0)
  const [summerDeadweight, setSummerDeadweight] = useState<number>(0)
  const [winterDeadweight, setWinterDeadweight] = useState<number>(0)
  const [summerFreeboard, setSummerFreeboard] = useState<number | null>(null)
  const [summerDraft, setSummerDraft] = useState<number | null>(null)
  const [summerDisplacement, setSummerDisplacement] = useState<number | null>(null)
  const [winterFreeboard, setWinterFreeboard] = useState<number | null>(null)
  const [winterDraft, setWinterDraft] = useState<number | null>(null)
  const [winterDisplacement, setWinterDisplacement] = useState<number | null>(null)
  const [tropicalFreeboard, setTropicalFreeboard] = useState<number | null>(null)
  const [tropicalDraft, setTropicalDraft] = useState<number | null>(null)
  const [tropicalDeadweight, setTropicalDeadweight] = useState<number | null>(null)
  const [tropicalDisplacement, setTropicalDisplacement] = useState<number | null>(null)
  const [normalLoadedFreeboard, setNormalLoadedFreeboard] = useState<number | null>(null)
  const [normalLoadedDraft, setNormalLoadedDraft] = useState<number | null>(null)
  const [normalLoadedDeadweight, setNormalLoadedDeadweight] = useState<number | null>(null)
  const [normalLoadedDisplacement, setNormalLoadedDisplacement] = useState<number | null>(null)
  const [lightshipFreeboard, setLightshipFreeboard] = useState<number | null>(null)
  const [lightshipDraft, setLightshipDraft] = useState<number | null>(null)
  const [lightshipDeadweight, setLightshipDeadweight] = useState<number | null>(null)
  const [lightshipDisplacement, setLightshipDisplacement] = useState<number | null>(null)
  const [normalBallastFreeboard, setNormalBallastFreeboard] = useState<number | null>(null)
  const [normalBallastDraft, setNormalBallastDraft] = useState<number | null>(null)
  const [normalBallastDeadweight, setNormalBallastDeadweight] = useState<number | null>(null)
  const [normalBallastDisplacement, setNormalBallastDisplacement] = useState<number | null>(null)
  const [segregatedBallastFreeboard, setSegregatedBallastFreeboard] = useState<number | null>(null)
  const [segregatedBallastDraft, setSegregatedBallastDraft] = useState<number | null>(null)
  const [segregatedBallastDeadweight, setSegregatedBallastDeadweight] = useState<number | null>(
    null
  )
  const [segregatedBallastDisplacement, setSegregatedBallastDisplacement] = useState<number | null>(
    null
  )
  const [lightshipForwardToMid, setLightshipForwardToMid] = useState<number | null>(null)
  const [lightshipAftToMid, setLightshipAftToMid] = useState<number | null>(null)
  const [lightshipParallelBody, setLightshipParallelBody] = useState<number | null>(null)
  const [normalBallastForwardToMid, setNormalBallastForwardToMid] = useState<number | null>(null)
  const [normalBallastAftToMid, setNormalBallastAftToMid] = useState<number | null>(null)
  const [normalBallastParallelBody, setNormalBallastParallelBody] = useState<number | null>(null)
  const [summerDwtForwardToMid, setSummerDwtForwardToMid] = useState<number | null>(null)
  const [summerDwtAftToMid, setSummerDwtAftToMid] = useState<number | null>(null)
  const [summerDwtParallelBody, setSummerDwtParallelBody] = useState<number | null>(null)
  // — STEP 2 FOR USA CALLS —
  const [submittedSpillResponsePlan, setSubmittedSpillResponsePlan] = useState(false)
  const [spillResponsePlanDetails, setSpillResponsePlanDetails] = useState('')
  const [qualifiedIndividualFullStyle, setQualifiedIndividualFullStyle] = useState('')
  const [oilSpillResponseOrgFullStyle, setOilSpillResponseOrgFullStyle] = useState('')
  const [
    salvageAndMarineFirefightingServicesFullStyle,
    setSalvageAndMarineFirefightingServicesFullStyle,
  ] = useState('')

  // — STEP 3 STATE —
  const [isOperatedUnderQMS, setIsOperatedUnderQMS] = useState(false)
  const [qmsType, setQmsType] = useState('')
  const [heliGuidelines, setHeliGuidelines] = useState(false)
  const [winchingOrLanding, setWinchingOrLanding] = useState('')
  const [winchingAreaDetails, setWinchingAreaDetails] = useState('')
  const [helicopterCircleDiameter, setHelicopterCircleDiameter] = useState('')

  // step4 state:
  const [cargoCoated, setCargoCoated] = useState(false)
  const [cargoType, setCargoType] = useState('')
  const [cargoExtent, setCargoExtent] = useState('')
  const [cargoAnodes, setCargoAnodes] = useState(false)

  const [ballastCoated, setBallastCoated] = useState(false)
  const [ballastType, setBallastType] = useState('')
  const [ballastExtent, setBallastExtent] = useState('')
  const [ballastAnodes, setBallastAnodes] = useState(false)

  const [slopCoated, setSlopCoated] = useState(false)
  const [slopType, setSlopType] = useState('')
  const [slopExtent, setSlopExtent] = useState('')
  const [slopAnodes, setSlopAnodes] = useState(false)

  const [anodesFitted, setAnodesFitted] = useState(false)

  //step 5 state:
  // Pumps
  const [pumpCount, setPumpCount] = useState<number>(0)
  const [pumpType, setPumpType] = useState<string>('')
  const [pumpCapacity, setPumpCapacity] = useState<string>('')
  const [pumpHead, setPumpHead] = useState<string>('')

  // Eductors
  const [eductorCount, setEductorCount] = useState<number>(0)
  const [eductorType, setEductorType] = useState<string>('')
  const [eductorCapacity, setEductorCapacity] = useState<string>('')
  const [eductorHead, setEductorHead] = useState<string>('')

  // BWMS
  const [d1Performance, setD1Performance] = useState<boolean>(false)
  const [d2Performance, setD2Performance] = useState<boolean>(false)
  const [bwtsFitted, setBwtsFitted] = useState<boolean>(false)
  const [bwtsType, setBwtsType] = useState<string>('')
  const [bwtsManufacturer, setBwtsManufacturer] = useState<string>('')
  const [imoTypeApproval, setImoTypeApproval] = useState<boolean>(false)
  const [uscgApproval, setUscgApproval] = useState<boolean>(false)

  // — Step 6 state —
  const [centerlineBulkheadFitted, setCenterlineBulkheadFitted] = useState(false)
  const [centerlineBulkheadType, setCenterlineBulkheadType] = useState('')

  const [cargoTankCentre98Capacity, setCargoTankCentre98Capacity] = useState('')
  const [cargoTankCentreTotalCount, setCargoTankCentreTotalCount] = useState(0)
  const [cargoTankWing98Capacity, setCargoTankWing98Capacity] = useState('')
  const [cargoTankWingTotalCount, setCargoTankWingTotalCount] = useState(0)
  const [deckTank98Capacity, setDeckTank98Capacity] = useState('')
  const [deckTankTotalCount, setDeckTankTotalCount] = useState(0)

  const [segregationCapacities, setSegregationCapacities] = useState('')

  const [slopsTank98Capacity, setSlopsTank98Capacity] = useState('')
  const [slopsTank95Capacity, setSlopsTank95Capacity] = useState('')
  const [slopsTankTotalCount, setSlopsTankTotalCount] = useState(0)

  const [gradesSegregationCount, setGradesSegregationCount] = useState(0)
  const [cargoContainmentType, setCargoContainmentType] = useState('')

  const [fillingRestrictions, setFillingRestrictions] = useState(false)
  const [fillingRestrictionDetails, setFillingRestrictionDetails] = useState('')

  const [maxLoadingWithVecs, setMaxLoadingWithVecs] = useState('')
  const [maxLoadingWithoutVecs, setMaxLoadingWithoutVecs] = useState('')
  const [loadedPerManifoldWith, setLoadedPerManifoldWith] = useState('')
  const [loadedSimultaneouslyWith, setLoadedSimultaneouslyWith] = useState('')
  const [loadedPerManifoldWithout, setLoadedPerManifoldWithout] = useState('')
  const [loadedSimultaneouslyWithout, setLoadedSimultaneouslyWithout] = useState('')

  const [cargoControlRoomFitted, setCargoControlRoomFitted] = useState(false)
  const [ullageReadableFromCcr, setUllageReadableFromCcr] = useState(false)

  const [gaugingCertified, setGaugingCertified] = useState(false)
  const [gaugingNotCalibratedDetails, setGaugingNotCalibratedDetails] = useState('')
  const [gaugingSystemType, setGaugingSystemType] = useState('')

  const [overflowControlFitted, setOverflowControlFitted] = useState(false)
  const [overflowAutomaticClosing, setOverflowAutomaticClosing] = useState(false)

  const [multipointGaugingFitted, setMultipointGaugingFitted] = useState(false)
  const [multipointGaugingType, setMultipointGaugingType] = useState('')
  const [portableGaugingUnitsCount, setPortableGaugingUnitsCount] = useState(0)

  const [vrsFitted, setVrsFitted] = useState(false)
  const [vrsOcimfCompliant, setVrsOcimfCompliant] = useState(false)
  const [vrsSegregationCount, setVrsSegregationCount] = useState(0)
  const [vecCertificationFitted, setVecCertificationFitted] = useState(false)
  const [vecCertificationIssuingAuthority, setVecCertificationIssuingAuthority] = useState('')
  const [vecsManifoldCount, setVecsManifoldCount] = useState(0)
  const [vecsManifoldSpecs, setVecsManifoldSpecs] = useState('')
  const [vecsReducerCount, setVecsReducerCount] = useState(0)
  const [vecsReducerSpecs, setVecsReducerSpecs] = useState('')

  const [ventingSystemType, setVentingSystemType] = useState('')

  const [manifoldCountPerSide, setManifoldCountPerSide] = useState(0)
  const [manifoldSize, setManifoldSize] = useState('')
  const [fixedCommonLine, setFixedCommonLine] = useState(false)
  const [commonLineCountPerSide, setCommonLineCountPerSide] = useState(0)
  const [commonLineSize, setCommonLineSize] = useState('')

  const [manifoldValveType, setManifoldValveType] = useState('')
  const [manifoldMaterialRating, setManifoldMaterialRating] = useState('')
  const [distanceBetweenCargoManifoldCenters, setDistanceBetweenCargoManifoldCenters] = useState('')
  const [distanceShipRailToManifold, setDistanceShipRailToManifold] = useState('')
  const [distanceManifoldToShipSide, setDistanceManifoldToShipSide] = useState('')
  const [topOfRailToCenterOfManifold, setTopOfRailToCenterOfManifold] = useState('')
  const [distanceMainDeckToCenterOfManifold, setDistanceMainDeckToCenterOfManifold] = useState('')
  const [
    distanceSpillTankGratingToCenterOfManifold,
    setDistanceSpillTankGratingToCenterOfManifold,
  ] = useState('')

  const [manifoldHeightNormalBallast, setManifoldHeightNormalBallast] = useState('')
  const [manifoldHeightSdwtCondition, setManifoldHeightSdwtCondition] = useState('')
  const [reducerDetails, setReducerDetails] = useState('')

  const [sternManifoldFitted, setSternManifoldFitted] = useState(false)
  const [sternManifoldSize, setSternManifoldSize] = useState('')

  const [cargoHeatingType, setCargoHeatingType] = useState('')
  const [cargoHeatingCoiled, setCargoHeatingCoiled] = useState(false)
  const [cargoHeatingMaterial, setCargoHeatingMaterial] = useState('')
  const [slopHeatingType, setSlopHeatingType] = useState('')
  const [slopHeatingCoiled, setSlopHeatingCoiled] = useState(false)
  const [slopHeatingMaterial, setSlopHeatingMaterial] = useState('')
  const [thermalOilHeatingFitted, setThermalOilHeatingFitted] = useState(false)
  const [thermalOilSystemTanks, setThermalOilSystemTanks] = useState('')

  const [maxCargoTemperature, setMaxCargoTemperature] = useState('')
  const [minCargoTemperature, setMinCargoTemperature] = useState('')

  // cargo pumps
  const [cargoPumpSimultaneousCount, setCargoPumpSimultaneousCount] = useState(0)
  const [cargoPumpCount, setCargoPumpCount] = useState(0)
  const [cargoPumpType, setCargoPumpType] = useState('')
  const [cargoPumpCapacity, setCargoPumpCapacity] = useState('')
  const [cargoPumpHead, setCargoPumpHead] = useState('')
  const [cargoEductorCount, setCargoEductorCount] = useState(0)
  const [cargoEductorType, setCargoEductorType] = useState('')
  const [cargoEductorCapacity, setCargoEductorCapacity] = useState('')
  const [cargoEductorHead, setCargoEductorHead] = useState('')
  const [strippingPumpCount, setStrippingPumpCount] = useState(0)
  const [strippingPumpType, setStrippingPumpType] = useState('')
  const [strippingPumpCapacity, setStrippingPumpCapacity] = useState('')
  const [strippingPumpHead, setStrippingPumpHead] = useState('')
  const [emergencyPortablePumpProvided, setEmergencyPortablePumpProvided] = useState(false)

  // cleaning
  const [cleaningEquipmentFixedInCargoTanks, setCleaningEquipmentFixedInCargoTanks] =
    useState(false)
  const [portableCleaningProvided, setPortableCleaningProvided] = useState(false)
  const [tankWashingPumpCapacity, setTankWashingPumpCapacity] = useState('')
  const [washingWaterHeaterFitted, setWashingWaterHeaterFitted] = useState(false)
  const [maxWashingWaterTemperature, setMaxWashingWaterTemperature] = useState('')
  const [washingMachinesCount, setWashingMachinesCount] = useState(0)

  // remote / pressure / drier / cooling / steam
  const [remoteTempMonitoringFitted, setRemoteTempMonitoringFitted] = useState(false)
  const [remoteTempMonitoringOperational, setRemoteTempMonitoringOperational] = useState(false)
  const [remotePressureMonitoringFitted, setRemotePressureMonitoringFitted] = useState(false)
  const [remotePressureMonitoringOperational, setRemotePressureMonitoringOperational] =
    useState(false)
  const [cargoTankDrierFitted, setCargoTankDrierFitted] = useState(false)
  const [cargoTankDrierOperational, setCargoTankDrierOperational] = useState(false)
  const [cargoTankDrierCapacity, setCargoTankDrierCapacity] = useState('')
  const [cargoCoolingSystemFitted, setCargoCoolingSystemFitted] = useState(false)
  const [cargoCoolingSystemDetails, setCargoCoolingSystemDetails] = useState('')
  const [steamAvailableOnDeck, setSteamAvailableOnDeck] = useState(false)

  // ─── STEP 7: VACUUM SYSTEM STATE ────────────────────────────────────────────────
  // Mooring wires: Forecastle
  const [wiresForecastleCount, setWiresForecastleCount] = useState<number | ''>('')
  const [wiresForecastleDiameter, setWiresForecastleDiameter] = useState('')
  const [wiresForecastleMaterial, setWiresForecastleMaterial] = useState('')
  const [wiresForecastleLength, setWiresForecastleLength] = useState('')
  const [wiresForecastleBreakingStrength, setWiresForecastleBreakingStrength] = useState('')

  // Mooring wires: Main deck fwd
  const [wiresMainDeckFwdCount, setWiresMainDeckFwdCount] = useState<number | ''>('')
  const [wiresMainDeckFwdDiameter, setWiresMainDeckFwdDiameter] = useState('')
  const [wiresMainDeckFwdMaterial, setWiresMainDeckFwdMaterial] = useState('')
  const [wiresMainDeckFwdLength, setWiresMainDeckFwdLength] = useState('')
  const [wiresMainDeckFwdBreakingStrength, setWiresMainDeckFwdBreakingStrength] = useState('')

  // Mooring wires: Main deck aft
  const [wiresMainDeckAftCount, setWiresMainDeckAftCount] = useState<number | ''>('')
  const [wiresMainDeckAftDiameter, setWiresMainDeckAftDiameter] = useState('')
  const [wiresMainDeckAftMaterial, setWiresMainDeckAftMaterial] = useState('')
  const [wiresMainDeckAftLength, setWiresMainDeckAftLength] = useState('')
  const [wiresMainDeckAftBreakingStrength, setWiresMainDeckAftBreakingStrength] = useState('')

  // Mooring wires: Poop deck
  const [wiresPoopDeckCount, setWiresPoopDeckCount] = useState<number | ''>('')
  const [wiresPoopDeckDiameter, setWiresPoopDeckDiameter] = useState('')
  const [wiresPoopDeckMaterial, setWiresPoopDeckMaterial] = useState('')
  const [wiresPoopDeckLength, setWiresPoopDeckLength] = useState('')
  const [wiresPoopDeckBreakingStrength, setWiresPoopDeckBreakingStrength] = useState('')

  // Winches (on Poop deck)
  const [winchesPoopDeckCount, setWinchesPoopDeckCount] = useState<number | ''>('')
  const [winchesPoopDeckDiameter, setWinchesPoopDeckDiameter] = useState('')
  const [winchesPoopDeckMaterial, setWinchesPoopDeckMaterial] = useState('')
  const [winchesPoopDeckLength, setWinchesPoopDeckLength] = useState('')
  const [winchesPoopDeckBrakingStrength, setWinchesPoopDeckBrakingStrength] = useState('')

  // Bollards & bitts
  const [bollardsBittsDetails, setBollardsBittsDetails] = useState('')

  // Fairleads & chocks
  const [fairleadsChocksDetails, setFairleadsChocksDetails] = useState('')

  // Shackles
  const [shacklesPortCount, setShacklesPortCount] = useState<number | ''>('')
  const [shacklesStarboardCount, setShacklesStarboardCount] = useState<number | ''>('')

  // Emergency Towing
  const [emergencyTowingForwardType, setEmergencyTowingForwardType] = useState('')
  const [emergencyTowingForwardSwl, setEmergencyTowingForwardSwl] = useState('')
  const [emergencyTowingAftType, setEmergencyTowingAftType] = useState('')
  const [emergencyTowingAftSwl, setEmergencyTowingAftSwl] = useState('')

  // Stern/chock/fairlead, escort tug & poop deck bollard
  const [sternChockFairleadSize, setSternChockFairleadSize] = useState('')
  const [escortTugChockFairleadSwl, setEscortTugChockFairleadSwl] = useState('')
  const [poopDeckBollardSwl, setPoopDeckBollardSwl] = useState('')

  // Crane / ladder / gangway
  const [craneDetails, setCraneDetails] = useState('')
  const [accommodationLadderDirection, setAccommodationLadderDirection] = useState('')
  const [portableGangwayFitted, setPortableGangwayFitted] = useState(false)
  const [portableGangwayLength, setPortableGangwayLength] = useState('')

  // SPM equipment
  const [spmOcimfCompliant, setSpmOcimfCompliant] = useState(false)
  const [spmChainStoppersCount, setSpmChainStoppersCount] = useState<number | ''>('')
  const [spmChainStoppersDetails, setSpmChainStoppersDetails] = useState('')
  const [spmFairleadDistance, setSpmFairleadDistance] = useState('')
  const [spmBowFairleadToBracketDistance, setSpmBowFairleadToBracketDistance] = useState('')
  const [spmOcimfChockSizeOk, setSpmOcimfChockSizeOk] = useState(false)
  const [spmOcimfChockSizeDetails, setSpmOcimfChockSizeDetails] = useState('')

  // ─── STEP 8: PROPULSION SYSTEM STATE ───────────────────────────────────────────────
  //
  const [ballastSpeedMax, setBallastSpeedMax] = useState('')
  const [ballastSpeedEconomical, setBallastSpeedEconomical] = useState('')
  const [ladenSpeedMax, setLadenSpeedMax] = useState('')
  const [ladenSpeedEconomical, setLadenSpeedEconomical] = useState('')

  const [mainPropulsionFuel, setMainPropulsionFuel] = useState('')
  const [generatingPlantFuel, setGeneratingPlantFuel] = useState('')

  const [bunkerFuelOilCapacity, setBunkerFuelOilCapacity] = useState('')
  const [bunkerDieselOilCapacity, setBunkerDieselOilCapacity] = useState('')
  const [bunkerOtherSpecify, setBunkerOtherSpecify] = useState('')

  const [propellerPitchType, setPropellerPitchType] = useState('')

  const [mainEngineCount, setMainEngineCount] = useState(0)
  const [mainEngineCapacity, setMainEngineCapacity] = useState('')
  const [mainEngineMakeType, setMainEngineMakeType] = useState('')

  const [auxEngineCount, setAuxEngineCount] = useState(0)
  const [auxEngineCapacity, setAuxEngineCapacity] = useState('')
  const [auxEngineMakeType, setAuxEngineMakeType] = useState('')

  const [powerPackCount, setPowerPackCount] = useState(0)
  const [powerPackCapacity, setPowerPackCapacity] = useState('')

  const [boilerCount, setBoilerCount] = useState(0)
  const [boilerCapacity, setBoilerCapacity] = useState('')
  const [boilerMakeType, setBoilerMakeType] = useState('')

  const [bowThrusterBhp, setBowThrusterBhp] = useState('')
  const [sternThrusterBhp, setSternThrusterBhp] = useState('')

  const [hasEediRating, setHasEediRating] = useState(false)
  const [eediRating, setEediRating] = useState('')
  const [eediNoReason, setEediNoReason] = useState('')
  const [eediVerifiedBy, setEediVerifiedBy] = useState('')

  const [hasEexiRating, setHasEexiRating] = useState(false)
  const [eexiRating, setEexiRating] = useState('')
  const [eexiNoReason, setEexiNoReason] = useState('')
  const [eexiVerifiedBy, setEexiVerifiedBy] = useState('')

  const [hasCiiRating, setHasCiiRating] = useState(false)
  const [ciiRating, setCiiRating] = useState('')
  const [ciiNoReason, setCiiNoReason] = useState('')
  const [ciiVerifiedBy, setCiiVerifiedBy] = useState('')

  const [hasEivRating, setHasEivRating] = useState(false)
  const [eivRating, setEivRating] = useState('')
  const [eivNoReason, setEivNoReason] = useState('')
  const [eivVerifiedBy, setEivVerifiedBy] = useState('')

  const [noxControlTier, setNoxControlTier] = useState('')
  const [noxEquipmentList, setNoxEquipmentList] = useState('')

  const [egcsFitted, setEgcsFitted] = useState(false)
  const [scrubberType, setScrubberType] = useState('')


//   const addPrevEntry = () => {
//   if (!newPrevName || !newPrevDate) return
//   setPreviousNames([
//     ...previousNames,
//     { name: newPrevName.trim(), date: newPrevDate },
//   ])
//   setNewPrevName('')
//   setNewPrevDate('')
// }
// const removePrevEntry = (idx: number) => {
//   setPreviousNames(previousNames.filter((_, i) => i !== idx))
// }

  type NumOrNull = number | null
  type NumSetter = React.Dispatch<React.SetStateAction<NumOrNull>>


  const lightshipFields: [NumOrNull, NumSetter][] = [
    [lightshipForwardToMid, setLightshipForwardToMid],
    [lightshipAftToMid, setLightshipAftToMid],
    [lightshipParallelBody, setLightshipParallelBody],
  ]

  const normalBallastFields: [NumOrNull, NumSetter][] = [
    [normalBallastForwardToMid, setNormalBallastForwardToMid],
    [normalBallastAftToMid, setNormalBallastAftToMid],
    [normalBallastParallelBody, setNormalBallastParallelBody],
  ]

  const summerDwtFields: [NumOrNull, NumSetter][] = [
    [summerDwtForwardToMid, setSummerDwtForwardToMid],
    [summerDwtAftToMid, setSummerDwtAftToMid],
    [summerDwtParallelBody, setSummerDwtParallelBody],
  ]

    // Handlers for Previous Names
  const addPrevNameEntry = () => {
    if (!newPrevName || !newPrevDate) return
    setPreviousNamesAndDates({
      ...previousNamesAndDates,
      [newPrevName.trim()]: newPrevDate,
    })
    setNewPrevName('')
    setNewPrevDate('')
  }

  const removePrevNameEntry = (name: string) => {
    const updated = { ...previousNamesAndDates }
    delete updated[name]
    setPreviousNamesAndDates(updated)
  }

  // Handlers for Previous Class Societies
  const addClassSocietyEntry = () => {
    if (!newClassSociety || !newClassSocietyDate) return
    setPreviousClassSocietyAndDates({
      ...previousClassSocietyAndDates,
      [newClassSociety.trim()]: newClassSocietyDate,
    })
    setNewClassSociety('')
    setNewClassSocietyDate('')
  }

  const removeClassSocietyEntry = (society: string) => {
    const updated = { ...previousClassSocietyAndDates }
    delete updated[society]
    setPreviousClassSocietyAndDates(updated)
  }


  // At the top of your component (or in scope where you render the tabs):
  const TABS = [
    {key: 'step1', label: '1. GENERAL INFORMATION'},
    {key: 'step2', label: '2. FOR USA CALLS'},
    {key: 'step3', label: '3. SAFETY / HELICOPTER'},
    {key: 'step4', label: '4. COATING / ANODES'},
    {key: 'step5', label: '5. BALLAST'},
    {key: 'step6', label: '6. CARGO - Oil'},
    {key: 'step7', label: '7. VACUUM'},
    {key: 'step8', label: '8. PROPULSION'},
  ]

  const speedFields: {
    label: string
    value: string
    setter: React.Dispatch<React.SetStateAction<string>>
    unit: string
  }[] = [
    {label: 'Ballast speed (max)', value: ballastSpeedMax, setter: setBallastSpeedMax, unit: 'kn'},
    {
      label: 'Ballast speed (economical)',
      value: ballastSpeedEconomical,
      setter: setBallastSpeedEconomical,
      unit: 'kn',
    },
    {label: 'Laden speed (max)', value: ladenSpeedMax, setter: setLadenSpeedMax, unit: 'kn'},
    {
      label: 'Laden speed (economical)',
      value: ladenSpeedEconomical,
      setter: setLadenSpeedEconomical,
      unit: 'kn',
    },
  ]

  interface LabeledField {
    label: string
    value: string
    setter: React.Dispatch<React.SetStateAction<string>>
    unit: string
  }
  const bunkerFields: LabeledField[] = [
    {
      label: 'Fuel oil capacity',
      value: bunkerFuelOilCapacity,
      setter: setBunkerFuelOilCapacity,
      unit: 'm³',
    },
    {
      label: 'Diesel oil capacity',
      value: bunkerDieselOilCapacity,
      setter: setBunkerDieselOilCapacity,
      unit: 'm³',
    },
  ]

  interface ThrusterField {
    label: string
    value: string
    setter: React.Dispatch<React.SetStateAction<string>>
    unit: string
  }
  const thrusterFields: ThrusterField[] = [
    {label: 'Bow thruster power', value: bowThrusterBhp, setter: setBowThrusterBhp, unit: 'kW'},
    {
      label: 'Stern thruster power',
      value: sternThrusterBhp,
      setter: setSternThrusterBhp,
      unit: 'kW',
    },
  ]

  interface RatingField {
    label: string
    has: boolean
    setHas: React.Dispatch<React.SetStateAction<boolean>>
    rating: string
    setRating: React.Dispatch<React.SetStateAction<string>>
    noReason: string
    setNoReason: React.Dispatch<React.SetStateAction<string>>
    verifiedBy: string
    setVerifiedBy: React.Dispatch<React.SetStateAction<string>>
  }
  const ratingFields: RatingField[] = [
    {
      label: 'EEDI',
      has: hasEediRating,
      setHas: setHasEediRating,
      rating: eediRating,
      setRating: setEediRating,
      noReason: eediNoReason,
      setNoReason: setEediNoReason,
      verifiedBy: eediVerifiedBy,
      setVerifiedBy: setEediVerifiedBy,
    },
    {
      label: 'EEXI',
      has: hasEexiRating,
      setHas: setHasEexiRating,
      rating: eexiRating,
      setRating: setEexiRating,
      noReason: eexiNoReason,
      setNoReason: setEexiNoReason,
      verifiedBy: eexiVerifiedBy,
      setVerifiedBy: setEexiVerifiedBy,
    },
    {
      label: 'CII',
      has: hasCiiRating,
      setHas: setHasCiiRating,
      rating: ciiRating,
      setRating: setCiiRating,
      noReason: ciiNoReason,
      setNoReason: setCiiNoReason,
      verifiedBy: ciiVerifiedBy,
      setVerifiedBy: setCiiVerifiedBy,
    },
    {
      label: 'EIV',
      has: hasEivRating,
      setHas: setHasEivRating,
      rating: eivRating,
      setRating: setEivRating,
      noReason: eivNoReason,
      setNoReason: setEivNoReason,
      verifiedBy: eivVerifiedBy,
      setVerifiedBy: setEivVerifiedBy,
    },
  ]

  const clearFields = () => {
    // clear general info fields
setIsIntertankoMember(false)
    // setVesselImo('')
    setIntertankoMemberImo('')
    setPreviousNamesAndDates({})
    setNewPrevName('')
    setNewPrevDate('')
    setDateDelivered('')
    setBuilder('')
    setFlagPortOfRegistry('')
  setCallSignMmsi('')
    setContactTel('')
    setContactFax('')
    setContactEmail('')
    setVesselTypeIoppc('')
    setOtherVesselType('')
    setHullType('')
    setRegisteredOwner('')
    setRegisteredOwnerImo('')
    setRegisteredOwnerAddress('')
    setRegisteredOwnerTel('')
    setRegisteredOwnerFax('')
    setRegisteredOwnerEmail('')
    setTechnicalOperator('')
    setTechnicalOperatorImo('')
    setTechnicalOperatorAddress('')
    setTechnicalOperatorTel('')
    setTechnicalOperatorFax('')
    setTechnicalOperatorEmail('')
    setCommercialOperator('')
    setDisponentOwner('')
    setPiClub('')
    setPiPollutionCoverageExpiry('')
    setHullMachineryInsurer('')
    setHullMachineryInsuredValue(0)
    setHullMachineryInsuredExpiry('')
    setClassificationSociety('')
    setClassificationSocietyIacsMember(false)
    setClassNotation('')
    setOpenConditionsOfClass('')
    setHasOpenClassConditions(false)
    setMemorandaOfClass('')
    setPreviousClassSocietyAndDates({})
    setNewClassSociety('')
    setNewClassSocietyDate('')
    setIceClassLevel('')
    setHasIceClass(false)
    setLastDryDockDate('')
    setNextDryDockDate('')
    setNextAnnualSurveyDue('')
    setLastSpecialSurveyDate('')
    setNextSpecialSurveyDate('')
    setCapRating('')
    setLengthOverall(0)
    setLengthBetweenPerpendiculars(0)
    setExtremeBreadth(0)
    setMouldedDepth(0)
    setKeelToMastheadHeight(0)
    setKeelToMastheadCollapsed(null)
    setBridgeFrontToManifoldCentre(0)
    setBowToManifoldCentre(0)
    setSternToManifoldCentre(0)
    setParallelBodyDistance(0)
    setNetTonnage(0)
    setGrossTonnage(0)
    setReducedGrossTonnage(0)
    setSuezGrossTonnage(0)
    setSuezNetTonnage(0)
    setPanamaNetTonnage(0)
    setPanamaTransitFit(false)
    setLoadlineSummer('')
    setLoadlineWinter('')
    setLoadlineTropical('')
    setFreshWaterAllowance(0)
    setTpcAtSummerDraft(0)
    setMultipleDeadweights('')
    setDeadweightConstant(0)
    setCompanyUkcGuideline(0)
    setAirDraft(0)
    setSummerDeadweight(0)
    setWinterDeadweight(0)
    setSummerFreeboard(null)
    setSummerDraft(null)
    setSummerDisplacement(null)
    setWinterFreeboard(null)
    setWinterDraft(null)
    setWinterDisplacement(null)
    setTropicalFreeboard(null)
    setTropicalDraft(null)
    setTropicalDeadweight(null)
    setTropicalDisplacement(null)
    setNormalLoadedFreeboard(null)
    setNormalLoadedDraft(null)
    setNormalLoadedDeadweight(null)
    setNormalLoadedDisplacement(null)
    setLightshipFreeboard(null)
    setLightshipDraft(null)
    setLightshipDeadweight(null)
    setLightshipDisplacement(null)
    setNormalBallastFreeboard(null)
    setNormalBallastDraft(null)
    setNormalBallastDeadweight(null)
    setNormalBallastDisplacement(null)
    setSegregatedBallastFreeboard(null)
    setSegregatedBallastDraft(null)
    setSegregatedBallastDeadweight(null)
    setSegregatedBallastDisplacement(null)
    setLightshipForwardToMid(null)
    setLightshipAftToMid(null)
    setLightshipParallelBody(null)
    setNormalBallastForwardToMid(null)
    setNormalBallastAftToMid(null)
    setNormalBallastParallelBody(null)
    setSummerDwtForwardToMid(null)
    setSummerDwtAftToMid(null)
    setSummerDwtParallelBody(null)
    setHasGeneral(false)
    setHasUSA(false)
    setHasSafety(false)
    setHasCoating(false)
    setHasBallast(false)
    setHasCargo(false)
    setHasVacuum(false)
    setHasPropulsion(false)
    setError(null)
    setContactTelError(null)
    setContactFaxError(null)
    setContactEmailError(null)
    setRegisteredOwnerTelError(null)
    setRegisteredOwnerFaxError(null)
    setRegisteredOwnerEmailError(null)
    setTechnicalOperatorTelError(null)
    setTechnicalOperatorFaxError(null)
    setTechnicalOperatorEmailError(null)

    // — clear “For USA Calls” fields —
    setSubmittedSpillResponsePlan(false)
    setSpillResponsePlanDetails('')
    setQualifiedIndividualFullStyle('')
    setOilSpillResponseOrgFullStyle('')
    setSalvageAndMarineFirefightingServicesFullStyle('')

    // clear step 3
    setWinchingAreaDetails('')
    setHelicopterCircleDiameter('')

    // — clear step 4: Coating/Anodes —
    setCargoCoated(false)
    setCargoType('')
    setCargoExtent('')
    setCargoAnodes(false)

    setBallastCoated(false)
    setBallastType('')
    setBallastExtent('')
    setBallastAnodes(false)

    setSlopCoated(false)
    setSlopType('')
    setSlopExtent('')
    setSlopAnodes(false)

    setAnodesFitted(false)

    // clear step 5: ballast:
    setPumpCount(0)
    setPumpType('')
    setPumpCapacity('')
    setPumpHead('')
    setEductorCount(0)
    setEductorType('')
    setEductorCapacity('')
    setEductorHead('')
    setD1Performance(false)
    setD2Performance(false)
    setBwtsFitted(false)
    setBwtsType('')
    setBwtsManufacturer('')
    setImoTypeApproval(false)
    setUscgApproval(false)

    // — clear step 6: CARGO – Oil —
    setCenterlineBulkheadFitted(false)
    setCenterlineBulkheadType('')

    setCargoTankCentre98Capacity('')
    setCargoTankCentreTotalCount(0)
    setCargoTankWing98Capacity('')
    setCargoTankWingTotalCount(0)
    setDeckTank98Capacity('')
    setDeckTankTotalCount(0)

    setSegregationCapacities('')

    setSlopsTank98Capacity('')
    setSlopsTank95Capacity('')
    setSlopsTankTotalCount(0)

    setGradesSegregationCount(0)
    setCargoContainmentType('')

    setFillingRestrictions(false)
    setFillingRestrictionDetails('')

    setMaxLoadingWithVecs('')
    setMaxLoadingWithoutVecs('')
    setLoadedPerManifoldWith('')
    setLoadedSimultaneouslyWith('')
    setLoadedPerManifoldWithout('')
    setLoadedSimultaneouslyWithout('')

    setCargoControlRoomFitted(false)
    setUllageReadableFromCcr(false)

    setGaugingCertified(false)
    setGaugingNotCalibratedDetails('')
    setGaugingSystemType('')

    setOverflowControlFitted(false)
    setOverflowAutomaticClosing(false)

    setMultipointGaugingFitted(false)
    setMultipointGaugingType('')
    setPortableGaugingUnitsCount(0)

    setVrsFitted(false)
    setVrsOcimfCompliant(false)
    setVrsSegregationCount(0)
    setVecCertificationFitted(false)
    setVecCertificationIssuingAuthority('')
    setVecsManifoldCount(0)
    setVecsManifoldSpecs('')
    setVecsReducerCount(0)
    setVecsReducerSpecs('')

    setVentingSystemType('')

    setManifoldCountPerSide(0)
    setManifoldSize('')
    setFixedCommonLine(false)
    setCommonLineCountPerSide(0)
    setCommonLineSize('')

    setManifoldValveType('')
    setManifoldMaterialRating('')
    setDistanceBetweenCargoManifoldCenters('')
    setDistanceShipRailToManifold('')
    setDistanceManifoldToShipSide('')
    setTopOfRailToCenterOfManifold('')
    setDistanceMainDeckToCenterOfManifold('')
    setDistanceSpillTankGratingToCenterOfManifold('')

    setManifoldHeightNormalBallast('')
    setManifoldHeightSdwtCondition('')
    setReducerDetails('')

    setSternManifoldFitted(false)
    setSternManifoldSize('')

    setCargoHeatingType('')
    setCargoHeatingCoiled(false)
    setCargoHeatingMaterial('')
    setSlopHeatingType('')
    setSlopHeatingCoiled(false)
    setSlopHeatingMaterial('')
    setThermalOilHeatingFitted(false)
    setThermalOilSystemTanks('')

    setMaxCargoTemperature('')
    setMinCargoTemperature('')

    setCargoPumpSimultaneousCount(0)
    setCargoPumpCount(0)
    setCargoPumpType('')
    setCargoPumpCapacity('')
    setCargoPumpHead('')
    setCargoEductorCount(0)
    setCargoEductorType('')
    setCargoEductorCapacity('')
    setCargoEductorHead('')
    setStrippingPumpCount(0)
    setStrippingPumpType('')
    setStrippingPumpCapacity('')
    setStrippingPumpHead('')
    setEmergencyPortablePumpProvided(false)

    setCleaningEquipmentFixedInCargoTanks(false)
    setPortableCleaningProvided(false)
    setTankWashingPumpCapacity('')
    setWashingWaterHeaterFitted(false)
    setMaxWashingWaterTemperature('')
    setWashingMachinesCount(0)

    setRemoteTempMonitoringFitted(false)
    setRemoteTempMonitoringOperational(false)
    setRemotePressureMonitoringFitted(false)
    setRemotePressureMonitoringOperational(false)
    setCargoTankDrierFitted(false)
    setCargoTankDrierOperational(false)
    setCargoTankDrierCapacity('')
    setCargoCoolingSystemFitted(false)
    setCargoCoolingSystemDetails('')
    setSteamAvailableOnDeck(false)

    // Step 7
    setWiresForecastleCount('')
    setWiresForecastleDiameter('')
    setWiresForecastleMaterial('')
    setWiresForecastleLength('')
    setWiresForecastleBreakingStrength('')
    setWiresMainDeckFwdCount('')
    setWiresMainDeckFwdDiameter('')
    setWiresMainDeckFwdMaterial('')
    setWiresMainDeckFwdLength('')
    setWiresMainDeckFwdBreakingStrength('')
    setWiresMainDeckAftCount('')
    setWiresMainDeckAftDiameter('')
    setWiresMainDeckAftMaterial('')
    setWiresMainDeckAftLength('')
    setWiresMainDeckAftBreakingStrength('')
    setWiresPoopDeckCount('')
    setWiresPoopDeckDiameter('')
    setWiresPoopDeckMaterial('')
    setWiresPoopDeckLength('')
    setWiresPoopDeckBreakingStrength('')
    setWinchesPoopDeckCount('')
    setWinchesPoopDeckDiameter('')
    setWinchesPoopDeckMaterial('')
    setWinchesPoopDeckLength('')
    setWinchesPoopDeckBrakingStrength('')
    setBollardsBittsDetails('')
    setFairleadsChocksDetails('')
    setShacklesPortCount('')
    setShacklesStarboardCount('')
    setEmergencyTowingForwardType('')
    setEmergencyTowingForwardSwl('')
    setEmergencyTowingAftType('')
    setEmergencyTowingAftSwl('')
    setSternChockFairleadSize('')
    setEscortTugChockFairleadSwl('')
    setPoopDeckBollardSwl('')
    setCraneDetails('')
    setAccommodationLadderDirection('')
    setPortableGangwayFitted(false)
    setPortableGangwayLength('')
    setSpmOcimfCompliant(false)
    setSpmChainStoppersCount('')
    setSpmChainStoppersDetails('')
    setSpmFairleadDistance('')
    setSpmBowFairleadToBracketDistance('')
    setSpmOcimfChockSizeOk(false)
    setSpmOcimfChockSizeDetails('')

    // clear step 8
    setBallastSpeedMax('')
    setBallastSpeedEconomical('')
    setLadenSpeedMax('')
    setLadenSpeedEconomical('')
    setMainPropulsionFuel('')
    setGeneratingPlantFuel('')
    setBunkerFuelOilCapacity('')
    setBunkerDieselOilCapacity('')
    setBunkerOtherSpecify('')
    setPropellerPitchType('')
    setMainEngineCount(0)
    setMainEngineCapacity('')
    setMainEngineMakeType('')
    setAuxEngineCount(0)
    setAuxEngineCapacity('')
    setAuxEngineMakeType('')
    setPowerPackCount(0)
    setPowerPackCapacity('')
    setBoilerCount(0)
    setBoilerCapacity('')
    setBoilerMakeType('')
    setBowThrusterBhp('')
    setSternThrusterBhp('')
    setHasEediRating(false)
    setEediRating('')
    setEediNoReason('')
    setEediVerifiedBy('')
    setHasEexiRating(false)
    setEexiRating('')
    setEexiNoReason('')
    setEexiVerifiedBy('')
    setHasCiiRating(false)
    setCiiRating('')
    setCiiNoReason('')
    setCiiVerifiedBy('')
    setHasEivRating(false)
    setEivRating('')
    setEivNoReason('')
    setEivVerifiedBy('')
    setNoxControlTier('')
    setNoxEquipmentList('')
    setEgcsFitted(false)
    setScrubberType('')

    // reset all step‑existence flags

    // … any remaining resets …
    setHasGeneral(false)
    setHasUSA(false)
    setHasSafety(false)
    setHasCoating(false)
    setHasBallast(false)
    setHasCargo(false)
    setHasVacuum(false)
    setHasPropulsion(false)

    setError(null)
  }

  useEffect(() => {
    if (!isOpen) return
    clearFields()
    if (!isEdit) return

    setError(null)

    if (isEdit) {
      // 1) load general info
      getGeneralInfoOfVessel(vesselData.id)
        .then((data: VesselGeneralInfo) => {
          if (isSectionEmpty(data, ['vesselId'])) {
            setHasGeneral(false)
            return
          }

          // populate Step 1 fields from API
          setIsIntertankoMember(data.isIntertankoMember)
          // setVesselImo(data.vesselImo || '')
          setIntertankoMemberImo(data.intertankoMemberImo)
          setPreviousNamesAndDates(data.previousNamesAndDates || {})
          setDateDelivered(data.dateDelivered)
          setBuilder(data.builder)
          setFlagPortOfRegistry(data.flagPortOfRegistry || '')
          setCallSignMmsi(data.callSignMmsi || '')
          setContactTel(data.contactTel)
          setContactFax(data.contactFax)
          setContactEmail(data.contactEmail)
          setVesselTypeIoppc(data.vesselTypeIoppc)
          setOtherVesselType(data.otherVesselType)
          setHullType(data.hullType)
          setRegisteredOwner(data.registeredOwner)
          setRegisteredOwnerImo(data.registeredOwnerImo)
          setRegisteredOwnerAddress(data.registeredOwnerAddress)
          setRegisteredOwnerTel(data.registeredOwnerTel)
          setRegisteredOwnerFax(data.registeredOwnerFax)
          setRegisteredOwnerEmail(data.registeredOwnerEmail)
          setTechnicalOperator(data.technicalOperator)
          setTechnicalOperatorImo(data.technicalOperatorImo)
          setTechnicalOperatorAddress(data.technicalOperatorAddress)
          setTechnicalOperatorTel(data.technicalOperatorTel)
          setTechnicalOperatorFax(data.technicalOperatorFax)
          setTechnicalOperatorEmail(data.technicalOperatorEmail)
          setCommercialOperator(data.commercialOperator)
          setDisponentOwner(data.disponentOwner)
          setPiClub(data.piClub)
          setPiPollutionCoverageExpiry(data.piPollutionCoverageExpiry)
          setHullMachineryInsurer(data.hullMachineryInsurer)
          setHullMachineryInsuredValue(data.hullMachineryInsuredValue)
          setHullMachineryInsuredExpiry(data.hullMachineryInsuredExpiry)
          setClassificationSociety(data.classificationSociety)
          setClassificationSocietyIacsMember(data.classificationSocietyIacsMember)
          setClassNotation(data.classNotation)
          setHasOpenClassConditions(!!data.openConditionsOfClass)
          setOpenConditionsOfClass(data.openConditionsOfClass)
          setMemorandaOfClass(data.memorandaOfClass)
          setPreviousClassSocietyAndDates(data.previousClassSocietyAndDates || {})
          setHasIceClass(!!data.iceClassLevel)
          setIceClassLevel(data.iceClassLevel)
          setLastDryDockDate(data.lastDryDockDate)
          setNextDryDockDate(data.nextDryDockDate)
          setNextAnnualSurveyDue(data.nextAnnualSurveyDue)
          setLastSpecialSurveyDate(data.lastSpecialSurveyDate)
          setNextSpecialSurveyDate(data.nextSpecialSurveyDate)
          setCapRating(data.capRating)
          setLengthOverall(data.lengthOverall)
          setLengthBetweenPerpendiculars(data.lengthBetweenPerpendiculars)
          setExtremeBreadth(data.extremeBreadth)
          setMouldedDepth(data.mouldedDepth)
          setKeelToMastheadHeight(data.keelToMastheadHeight)
          setKeelToMastheadCollapsed(data.keelToMastheadCollapsed ?? null)
          setBridgeFrontToManifoldCentre(data.bridgeFrontToManifoldCentre)
          setBowToManifoldCentre(data.bowToManifoldCentre)
          setSternToManifoldCentre(data.sternToManifoldCentre)
          setParallelBodyDistance(data.parallelBodyDistance)
          setNetTonnage(data.netTonnage)
          setGrossTonnage(data.grossTonnage)
          setReducedGrossTonnage(data.reducedGrossTonnage)
          setSuezGrossTonnage(data.suezGrossTonnage)
          setSuezNetTonnage(data.suezNetTonnage)
          setPanamaNetTonnage(data.panamaNetTonnage)
          setPanamaTransitFit(data.panamaTransitFit)
          setLoadlineSummer(data.loadlineSummer)
          setLoadlineWinter(data.loadlineWinter)
          setLoadlineTropical(data.loadlineTropical)
          setFreshWaterAllowance(data.freshWaterAllowance)
          setTpcAtSummerDraft(data.tpcAtSummerDraft)
          setMultipleDeadweights(data.multipleDeadweights)
          setDeadweightConstant(data.deadweightConstant)
          setCompanyUkcGuideline(data.companyUkcGuideline)
          setAirDraft(data.airDraft)
          setSummerDeadweight(data.summerDeadweight)
          setWinterDeadweight(data.winterDeadweight)
          setSummerFreeboard(data.summerFreeboard)
          setSummerDraft(data.summerDraft)
          setSummerDisplacement(data.summerDisplacement)
          setWinterFreeboard(data.winterFreeboard)
          setWinterDraft(data.winterDraft)
          setWinterDisplacement(data.winterDisplacement)
          setTropicalFreeboard(data.tropicalFreeboard)
          setTropicalDraft(data.tropicalDraft)
          setTropicalDeadweight(data.tropicalDeadweight)
          setTropicalDisplacement(data.tropicalDisplacement)
          setNormalLoadedFreeboard(data.normalLoadedFreeboard)
          setNormalLoadedDraft(data.normalLoadedDraft)
          setNormalLoadedDeadweight(data.normalLoadedDeadweight)
          setNormalLoadedDisplacement(data.normalLoadedDisplacement)
          setLightshipFreeboard(data.lightshipFreeboard)
          setLightshipDraft(data.lightshipDraft)
          setLightshipDeadweight(data.lightshipDeadweight)
          setLightshipDisplacement(data.lightshipDisplacement)
          setNormalBallastFreeboard(data.normalBallastFreeboard)
          setNormalBallastDraft(data.normalBallastDraft)
          setNormalBallastDeadweight(data.normalBallastDeadweight)
          setNormalBallastDisplacement(data.normalBallastDisplacement)
          setSegregatedBallastFreeboard(data.segregatedBallastFreeboard)
          setSegregatedBallastDraft(data.segregatedBallastDraft)
          setSegregatedBallastDeadweight(data.segregatedBallastDeadweight)
          setSegregatedBallastDisplacement(data.segregatedBallastDisplacement)
          setLightshipForwardToMid(data.lightshipForwardToMid ?? null)
        setLightshipAftToMid(data.lightshipAftToMid ?? null)
        setLightshipParallelBody(data.lightshipParallelBody ?? null)
        setNormalBallastForwardToMid(data.normalBallastForwardToMid ?? null)
        setNormalBallastAftToMid(data.normalBallastAftToMid ?? null)
        setNormalBallastParallelBody(data.normalBallastParallelBody ?? null)
        setSummerDwtForwardToMid(data.summerDwtForwardToMid ?? null)
        setSummerDwtAftToMid(data.summerDwtAftToMid ?? null)
        setSummerDwtParallelBody(data.summerDwtParallelBody ?? null)

          //setting general
          setHasGeneral(true)
        })
        .catch((err) => {
          if (err.response?.status === 404) setHasGeneral(false)
          // else toast.error('Failed to load existing general info')
        })

      // 2) load “For USA Calls”
      getForUSACalls(vesselData.id)
        .then((data: ForUSACalls) => {
          if (isSectionEmpty(data, ['vesselId'])) {
            setHasUSA(false)
            return
          }
          setSubmittedSpillResponsePlan(!!data.submittedSpillResponsePlan)
          setSpillResponsePlanDetails(data.submittedSpillResponsePlan)
          setQualifiedIndividualFullStyle(data.qualifiedIndividualFullStyle)
          setOilSpillResponseOrgFullStyle(data.oilSpillResponseOrgFullStyle)
          setSalvageAndMarineFirefightingServicesFullStyle(
            data.salvageAndMarineFirefightingServicesFullStyle
          )
          //setting for usa calls
          setHasUSA(true)
        })
        .catch((err) => {
          if (err.response?.status === 404) setHasUSA(false)
          // else toast.error('Failed to load For USA Calls data')
        })

      // load step 3
      getSafetyHelicopter(vesselData.id)
        .then((data: SafetyHelicopter) => {
          if (isSectionEmpty(data, ['vesselId'])) {
            setHasSafety(false)
            return
          }
          setWinchingAreaDetails(data.winchingAreaDetails)
          setHelicopterCircleDiameter(data.helicopterCircleDiameter)

          //setting safety
          setHasSafety(true)
        })
        .catch((err) => {
          if (err.response?.status === 404) setHasSafety(false)
          // else toast.error('Failed to load Safety/Helicopter')
        })

      //load step 4 coating
      getTankCoating(vesselData.id)
        .then((data: TankCoating) => {
          if (isSectionEmpty(data, ['vesselId'])) {
            setHasCoating(false)
            return
          }
          setCargoCoated(data.cargoCoated)
          setCargoType(data.cargoCoatingType)
          setCargoExtent(data.cargoCoatingExtent)
          setCargoAnodes(data.cargoAnodes)
          setBallastCoated(data.ballastCoated)
          setBallastType(data.ballastCoatingType)
          setBallastExtent(data.ballastCoatingExtent)
          setBallastAnodes(data.ballastAnodes)
          setSlopCoated(data.slopCoated)
          setSlopType(data.slopCoatingType)
          setSlopExtent(data.slopCoatingExtent)
          setSlopAnodes(data.slopAnodes)
          setAnodesFitted(data.anodesFitted)
          setHasCoating(true)
        })
        .catch((err) => {
          if (err.response?.status === 404) setHasCoating(false)
          // else toast.error('Failed to load Coating/Anodes')
        })

      // Step 5: load ballast
      getBallast(vesselData.id)
        .then((data: Ballast) => {
          if (isSectionEmpty(data, ['vesselId'])) {
            setHasBallast(false)
            return
          }
          setPumpCount(data.pumpCount)
          setPumpType(data.pumpType)
          setPumpCapacity(data.pumpCapacity)
          setPumpHead(data.pumpHead)
          setEductorCount(data.eductorCount)
          setEductorType(data.eductorType)
          setEductorCapacity(data.eductorCapacity)
          setEductorHead(data.eductorHead)
          setD1Performance(!!data.d1Performance)
          setD2Performance(!!data.d2Performance)
          setBwtsFitted(!!data.bwtsFitted)
          setBwtsType(data.bwtsType || '')
          setBwtsManufacturer(data.bwtsManufacturer || '')
          setImoTypeApproval(!!data.imoTypeApproval)
          setUscgApproval(!!data.uscgApproval)
          setHasBallast(true)
        })
        .catch((err) => {
          if (err.message === 'Not found') setHasBallast(false)
          // else toast.error('Failed to load Ballast data')
        })

      getCargoSystem(vesselData.id)
        .then((d: CargoSystem) => {
          if (isSectionEmpty(d, ['vesselId'])) {
            setHasCargo(false)
            return
          }
          setCenterlineBulkheadFitted(d.centerlineBulkheadFitted)
          setCenterlineBulkheadType(d.centerlineBulkheadType)
          setCargoTankCentre98Capacity(d.cargoTankCentre98Capacity)
          setCargoTankCentreTotalCount(d.cargoTankCentreTotalCount)
          setCargoTankWing98Capacity(d.cargoTankWing98Capacity)
          setCargoTankWingTotalCount(d.cargoTankWingTotalCount)
          setDeckTank98Capacity(d.deckTank98Capacity)
          setDeckTankTotalCount(d.deckTankTotalCount)
          setSegregationCapacities(d.segregationCapacities)
          setSlopsTank98Capacity(d.slopsTank98Capacity)
          setSlopsTank95Capacity(d.slopsTank95Capacity)
          setSlopsTankTotalCount(d.slopsTankTotalCount)
          setGradesSegregationCount(d.gradesSegregationCount)
          setCargoContainmentType(d.cargoContainmentType)
          setFillingRestrictions(d.fillingRestrictions)
          setFillingRestrictionDetails(d.fillingRestrictionDetails)
          setMaxLoadingWithVecs(d.maxLoadingWithVecs)
          setMaxLoadingWithoutVecs(d.maxLoadingWithoutVecs)
          setLoadedPerManifoldWith(d.loadedPerManifold)
          setLoadedSimultaneouslyWith(d.loadedSimultaneously)
          setCargoControlRoomFitted(d.cargoControlRoomFitted)
          setUllageReadableFromCcr(d.ullageReadableFromCcr)
          setGaugingCertified(d.gaugingCertified)
          setGaugingNotCalibratedDetails(d.gaugingNotCalibratedDetails)
          setGaugingSystemType(d.gaugingSystemType)
          setOverflowControlFitted(d.overflowControlFitted)
          setOverflowAutomaticClosing(d.overflowAutomaticClosing)
          setMultipointGaugingFitted(d.multipointGaugingFitted)
          setMultipointGaugingType(d.multipointGaugingType)
          setPortableGaugingUnitsCount(d.portableGaugingUnitsCount)
          setVrsFitted(d.vrsFitted)
          setVrsOcimfCompliant(d.vrsOcimfCompliant)
          setVrsSegregationCount(d.vrsSegregationCount)
          setVecCertificationFitted(d.vecCertificationFitted)
          setVecCertificationIssuingAuthority(d.vecCertificationIssuingAuthority)
          setVecsManifoldCount(d.vecsManifoldCount)
          setVecsManifoldSpecs(d.vecsManifoldSpecs)
          setVecsReducerCount(d.vecsReducerCount)
          setVecsReducerSpecs(d.vecsReducerSpecs)
          setVentingSystemType(d.ventingSystemType)
          setManifoldCountPerSide(
            d.distanceBetweenCargoManifoldCenters
              ? (d.distanceBetweenCargoManifoldCenters.split(' ')[0] as any)
              : 0
          )
          // … and the rest …
          setCargoPumpSimultaneousCount(d.cargoPumpSimultaneousCount)
          setCargoPumpCount(d.cargoPumpCount)
          setCargoPumpType(d.cargoPumpType)
          setCargoPumpCapacity(d.cargoPumpCapacity)
          setCargoPumpHead(d.cargoPumpHead)
          setCargoEductorCount(d.cargoEductorCount)
          setCargoEductorType(d.cargoEductorType)
          setCargoEductorCapacity(d.cargoEductorCapacity)
          setCargoEductorHead(d.cargoEductorHead)
          setStrippingPumpCount(d.strippingPumpCount)
          setStrippingPumpType(d.strippingPumpType)
          setStrippingPumpCapacity(d.strippingPumpCapacity)
          setStrippingPumpHead(d.strippingPumpHead)
          setEmergencyPortablePumpProvided(d.emergencyPortablePumpProvided)
          setCleaningEquipmentFixedInCargoTanks(d.cleaningEquipmentFixedInCargoTanks)
          setPortableCleaningProvided(d.portableCleaningProvided)
          setTankWashingPumpCapacity(d.tankWashingPumpCapacity)
          setWashingWaterHeaterFitted(d.washingWaterHeaterFitted)
          setMaxWashingWaterTemperature(d.maxWashingWaterTemperature)
          setWashingMachinesCount(d.washingMachinesCount)
          setRemoteTempMonitoringFitted(d.remoteTempMonitoringFitted)
          setRemoteTempMonitoringOperational(d.remoteTempMonitoringOperational)
          setRemotePressureMonitoringFitted(d.remotePressureMonitoringFitted)
          setRemotePressureMonitoringOperational(d.remotePressureMonitoringOperational)
          setCargoTankDrierFitted(d.cargoTankDrierFitted)
          setCargoTankDrierOperational(d.cargoTankDrierOperational)
          setCargoTankDrierCapacity(d.cargoTankDrierCapacity)
          setCargoCoolingSystemFitted(d.cargoCoolingSystemFitted)
          setCargoCoolingSystemDetails(d.cargoCoolingSystemDetails)
          setSteamAvailableOnDeck(d.steamAvailableOnDeck)
          setHasCargo(true)
        })
        .catch((err) => {
          if (err.message === 'Not found' || err.response?.status === 404) {
            setHasCargo(false)
          } else {
            // toast.error('Failed to load Cargo data')
          }
        })

      // Step 7: Vacuum System
      getVacuumSystem(vesselData.id)
        .then((data: VacuumSystem) => {
          // if it's completely empty, skip
          if (isSectionEmpty(data, ['vesselId'])) {
            setHasVacuum(false)
            return
          }

          // populate
          setWiresForecastleCount(data.wiresForecastleCount ?? '')
          setWiresForecastleDiameter(data.wiresForecastleDiameter ?? '')
          setWiresForecastleMaterial(data.wiresForecastleMaterial ?? '')
          setWiresForecastleLength(data.wiresForecastleLength ?? '')
          setWiresForecastleBreakingStrength(data.wiresForecastleBreakingStrength ?? '')

          setWiresMainDeckFwdCount(data.wiresMainDeckFwdCount ?? '')
          setWiresMainDeckFwdDiameter(data.wiresMainDeckFwdDiameter ?? '')
          setWiresMainDeckFwdMaterial(data.wiresMainDeckFwdMaterial ?? '')
          setWiresMainDeckFwdLength(data.wiresMainDeckFwdLength ?? '')
          setWiresMainDeckFwdBreakingStrength(data.wiresMainDeckFwdBreakingStrength ?? '')

          setWiresMainDeckAftCount(data.wiresMainDeckAftCount ?? '')
          setWiresMainDeckAftDiameter(data.wiresMainDeckAftDiameter ?? '')
          setWiresMainDeckAftMaterial(data.wiresMainDeckAftMaterial ?? '')
          setWiresMainDeckAftLength(data.wiresMainDeckAftLength ?? '')
          setWiresMainDeckAftBreakingStrength(data.wiresMainDeckAftBreakingStrength ?? '')

          setWiresPoopDeckCount(data.wiresPoopDeckCount ?? '')
          setWiresPoopDeckDiameter(data.wiresPoopDeckDiameter ?? '')
          setWiresPoopDeckMaterial(data.wiresPoopDeckMaterial ?? '')
          setWiresPoopDeckLength(data.wiresPoopDeckLength ?? '')
          setWiresPoopDeckBreakingStrength(data.wiresPoopDeckBreakingStrength ?? '')

          setWinchesPoopDeckCount(data.winchesPoopDeckCount ?? '')
          setWinchesPoopDeckDiameter(data.winchesPoopDeckDiameter ?? '')
          setWinchesPoopDeckMaterial(data.winchesPoopDeckMaterial ?? '')
          setWinchesPoopDeckLength(data.winchesPoopDeckLength ?? '')
          setWinchesPoopDeckBrakingStrength(data.winchesPoopDeckBrakingStrength ?? '')

          setBollardsBittsDetails(data.bollardsBittsDetails ?? '')
          setFairleadsChocksDetails(data.fairleadsChocksDetails ?? '')

          setShacklesPortCount(data.shacklesPortCount ?? '')
          setShacklesStarboardCount(data.shacklesStarboardCount ?? '')

          setEmergencyTowingForwardType(data.emergencyTowingForwardType ?? '')
          setEmergencyTowingForwardSwl(data.emergencyTowingForwardSwl ?? '')
          setEmergencyTowingAftType(data.emergencyTowingAftType ?? '')
          setEmergencyTowingAftSwl(data.emergencyTowingAftSwl ?? '')

          setSternChockFairleadSize(data.sternChockFairleadSize ?? '')
          setEscortTugChockFairleadSwl(data.escortTugChockFairleadSwl ?? '')
          setPoopDeckBollardSwl(data.poopDeckBollardSwl ?? '')

          setCraneDetails(data.craneDetails ?? '')
          setAccommodationLadderDirection(data.accommodationLadderDirection ?? '')
          setPortableGangwayFitted(!!data.portableGangwayFitted)
          setPortableGangwayLength(data.portableGangwayLength ?? '')

          setSpmOcimfCompliant(!!data.spmOcimfCompliant)
          setSpmChainStoppersCount(data.spmChainStoppersCount ?? '')
          setSpmChainStoppersDetails(data.spmChainStoppersDetails ?? '')
          setSpmFairleadDistance(data.spmFairleadDistance ?? '')
          setSpmBowFairleadToBracketDistance(data.spmBowFairleadToBracketDistance ?? '')
          setSpmOcimfChockSizeOk(!!data.spmOcimfChockSizeOk)
          setSpmOcimfChockSizeDetails(data.spmOcimfChockSizeDetails ?? '')

          setHasVacuum(true)
        })
        .catch((err) => {
          if (err.response?.status === 404) {
            setHasVacuum(false)
          } else {
            // toast.error('Failed to load Vacuum System')
          }
        })

      // load Step 8: Propulsion
      getPropulsionSystem(vesselData.id)
        .then((d: PropulsionSystem) => {
          if (isSectionEmpty(d, ['vesselId'])) {
            setHasPropulsion(false)
            return
          }
          setBallastSpeedMax(d.ballastSpeedMax)
          setBallastSpeedEconomical(d.ballastSpeedEconomical)
          setLadenSpeedMax(d.ladenSpeedMax)
          setLadenSpeedEconomical(d.ladenSpeedEconomical)
          setMainPropulsionFuel(d.mainPropulsionFuel)
          setGeneratingPlantFuel(d.generatingPlantFuel)
          setBunkerFuelOilCapacity(d.bunkerFuelOilCapacity)
          setBunkerDieselOilCapacity(d.bunkerDieselOilCapacity)
          setBunkerOtherSpecify(d.bunkerOtherSpecify)
          setPropellerPitchType(d.propellerPitchType)
          setMainEngineCount(d.mainEngineCount)
          setMainEngineCapacity(d.mainEngineCapacity)
          setMainEngineMakeType(d.mainEngineMakeType)
          setAuxEngineCount(d.auxEngineCount)
          setAuxEngineCapacity(d.auxEngineCapacity)
          setAuxEngineMakeType(d.auxEngineMakeType)
          setPowerPackCount(d.powerPackCount)
          setPowerPackCapacity(d.powerPackCapacity)
          setBoilerCount(d.boilerCount)
          setBoilerCapacity(d.boilerCapacity)
          setBoilerMakeType(d.boilerMakeType)
          setBowThrusterBhp(d.bowThrusterBhp)
          setSternThrusterBhp(d.sternThrusterBhp)
          setHasEediRating(d.hasEediRating)
          setEediRating(d.eediRating)
          setEediNoReason(d.eediNoReason)
          setEediVerifiedBy(d.eediVerifiedBy)
          setHasEexiRating(d.hasEexiRating)
          setEexiRating(d.eexiRating)
          setEexiNoReason(d.eexiNoReason)
          setEexiVerifiedBy(d.eexiVerifiedBy)
          setHasCiiRating(d.hasCiiRating)
          setCiiRating(d.ciiRating)
          setCiiNoReason(d.ciiNoReason)
          setCiiVerifiedBy(d.ciiVerifiedBy)
          setHasEivRating(d.hasEivRating)
          setEivRating(d.eivRating)
          setEivNoReason(d.eivNoReason)
          setEivVerifiedBy(d.eivVerifiedBy)
          setNoxControlTier(d.noxControlTier)
          setNoxEquipmentList(d.noxEquipmentList)
          setEgcsFitted(d.egcsFitted)
          setScrubberType(d.scrubberType)
          setHasPropulsion(true)
        })
        .catch((err) => {
          if (err.response?.status === 404) setHasPropulsion(false)
          // else toast.error('Failed to load Propulsion System')
        })
    }
  }, [isOpen, isEdit, vesselData.id])

  // — save just step 1 —
  const handleSaveGeneral = async () => {
    setError(null)

    // re-run validation in case they click "Save" without blurring
  if (contactTel && !isValidPhone(contactTel)) {
    setContactTelError("Invalid phone format")
    return
  }
  if (contactFax && !isValidPhone(contactFax)) {
    setContactFaxError("Invalid fax format")
    return
  }
  if (contactEmail && !isValidEmail(contactEmail)) {
    setContactEmailError("Invalid email address")
    return
  }

  if (registeredOwnerTel && !isValidPhone(registeredOwnerTel)) {
      setRegisteredOwnerTelError('Invalid phone format')
      return
    }
    if (registeredOwnerFax && !isValidPhone(registeredOwnerFax)) {
      setRegisteredOwnerFaxError('Invalid fax format')
      return
    }
    if (registeredOwnerEmail && !isValidEmail(registeredOwnerEmail)) {
      setRegisteredOwnerEmailError('Invalid email address')
      return
    }
    if (technicalOperatorTel && !isValidPhone(technicalOperatorTel)) {
      setTechnicalOperatorTelError('Invalid phone format')
      return
    }
    if (technicalOperatorFax && !isValidPhone(technicalOperatorFax)) {
      setTechnicalOperatorFaxError('Invalid fax format')
      return
    }
    if (technicalOperatorEmail && !isValidEmail(technicalOperatorEmail)) {
      setTechnicalOperatorEmailError('Invalid email address')
      return
    }

    // // construct previousNamesAndDates string
    // const previousNamesAndDates = previousVesselName
    //   ? `${previousVesselName}${previousNameDate ? ` (${previousNameDate})` : ''}`
    //   : ''

    const generalPayload: VesselGeneralInfoRequest = {
      // … build from your step 1 fields …
      // vesselId: vesselData.id,
      dateUpdated: new Date().toISOString(),
      vesselName: vesselData.fleet_name,
      // vesselImo: vesselImo || undefined,
      isIntertankoMember,
      intertankoMemberImo: isIntertankoMember ? intertankoMemberImo : '',
      previousNamesAndDates: Object.keys(previousNamesAndDates).length
      ? previousNamesAndDates
      : {},

      dateDelivered,
      builder,
            flagPortOfRegistry,
      callSignMmsi,
      contactTel,
      contactFax,
      contactEmail,
      vesselTypeIoppc: vesselData.vesselType,
      otherVesselType: otherVesselType || undefined,
      hullType,
      registeredOwner,
      registeredOwnerImo,
      registeredOwnerAddress,
      registeredOwnerTel,
      registeredOwnerFax,
      registeredOwnerEmail,
      technicalOperator,
      technicalOperatorImo: technicalOperatorImo || undefined,
      technicalOperatorAddress,
      technicalOperatorTel,
      technicalOperatorFax,
      technicalOperatorEmail,
      commercialOperator,
      disponentOwner,
      piClub,
      piPollutionCoverageExpiry,
      hullMachineryInsurer,
      hullMachineryInsuredValue,
      hullMachineryInsuredExpiry,
      classificationSociety,
      classificationSocietyIacsMember,
      classNotation,
      openConditionsOfClass: hasOpenClassConditions ? openConditionsOfClass : '',
      memorandaOfClass,
      previousClassSocietyAndDates: Object.keys(previousClassSocietyAndDates).length
        ? previousClassSocietyAndDates
        : undefined,
      iceClassLevel: hasIceClass ? iceClassLevel : '',
      lastDryDockDate,
      nextDryDockDate,
      nextAnnualSurveyDue,
      lastSpecialSurveyDate,
      nextSpecialSurveyDate,
      capRating,
      lengthOverall,
      lengthBetweenPerpendiculars,
      extremeBreadth,
      mouldedDepth,
      keelToMastheadHeight,
      keelToMastheadCollapsed: keelToMastheadCollapsed ?? undefined,
      bridgeFrontToManifoldCentre,
      bowToManifoldCentre,
      sternToManifoldCentre,
      parallelBodyDistance,
      netTonnage,
      grossTonnage,
      reducedGrossTonnage,
      suezGrossTonnage,
      suezNetTonnage,
      panamaNetTonnage: panamaTransitFit ? panamaNetTonnage : 0,
      panamaTransitFit,
      loadlineSummer,
      loadlineWinter,
      loadlineTropical,
      freshWaterAllowance,
      tpcAtSummerDraft,
      multipleDeadweights,
      deadweightConstant,
      companyUkcGuideline,
      airDraft,
      summerDeadweight,
      winterDeadweight,
      summerFreeboard: summerFreeboard ?? undefined,
      summerDraft: summerDraft ?? undefined,
      summerDisplacement: summerDisplacement ?? undefined,
      winterFreeboard: winterFreeboard ?? undefined,
      winterDraft: winterDraft ?? undefined,
      winterDisplacement: winterDisplacement ?? undefined,
      tropicalFreeboard: tropicalFreeboard ?? undefined,
      tropicalDraft: tropicalDraft ?? undefined,
      tropicalDeadweight: tropicalDeadweight ?? undefined,
      tropicalDisplacement: tropicalDisplacement ?? undefined,
      normalLoadedFreeboard: normalLoadedFreeboard ?? undefined,
      normalLoadedDraft: normalLoadedDraft ?? undefined,
      normalLoadedDeadweight: normalLoadedDeadweight ?? undefined,
      normalLoadedDisplacement: normalLoadedDisplacement ?? undefined,
      lightshipFreeboard: lightshipFreeboard ?? undefined,
      lightshipDraft: lightshipDraft ?? undefined,
      lightshipDeadweight: lightshipDeadweight ?? undefined,
      lightshipDisplacement: lightshipDisplacement ?? undefined,
      normalBallastFreeboard: normalBallastFreeboard ?? undefined,
      normalBallastDraft: normalBallastDraft ?? undefined,
      normalBallastDeadweight: normalBallastDeadweight ?? undefined,
      normalBallastDisplacement: normalBallastDisplacement ?? undefined,
      segregatedBallastFreeboard: segregatedBallastFreeboard ?? undefined,
      segregatedBallastDraft: segregatedBallastDraft ?? undefined,
      segregatedBallastDeadweight: segregatedBallastDeadweight ?? undefined,
      segregatedBallastDisplacement: segregatedBallastDisplacement ?? undefined,
      lightshipForwardToMid: lightshipForwardToMid ?? undefined,
      lightshipAftToMid: lightshipAftToMid ?? undefined,
      lightshipParallelBody: lightshipParallelBody ?? undefined,
      normalBallastForwardToMid: normalBallastForwardToMid ?? undefined,
      normalBallastAftToMid: normalBallastAftToMid ?? undefined,
      normalBallastParallelBody: normalBallastParallelBody ?? undefined,
      summerDwtForwardToMid: summerDwtForwardToMid ?? undefined,
      summerDwtAftToMid: summerDwtAftToMid ?? undefined,
      summerDwtParallelBody: summerDwtParallelBody ?? undefined,
      // …
    }
    // --- clear out any fields that depend on a boolean toggle ---
// if (hasGeneral) {
//   await updateGeneralInfoOfVessel(vesselData.id, generalPayload)
// } else {
//   await createGeneralInfoOfVessel(vesselData.id, generalPayload)
// }

    if (!hasOpenClassConditions) {
      generalPayload.openConditionsOfClass = ''
    }

    if (!hasIceClass) {
      generalPayload.iceClassLevel = ''
    }

    if (!panamaTransitFit) {
      // panamaNetTonnage is a number | null; API will see 0 (or you could switch to null)
      generalPayload.panamaNetTonnage = 0
    }

    try {
      if (hasGeneral) {
        await updateGeneralInfoOfVessel(vesselData.id, generalPayload)
        toast.success('General Info updated')
      } else {
        await createGeneralInfoOfVessel(vesselData.id, generalPayload)
        toast.success('General Info created')
        setHasGeneral(true)
      }
      onVesselAdded()
    } catch (e: any) {
      setError(e.message)
      toast.error('Failed to save General Info')
    }
  }

  // — save just step 2 —
  const handleSaveUSA = async () => {
    setError(null)
    // clear out toggled‑off fields …
    if (!submittedSpillResponsePlan) {
      // nothing
    }
    const payload: ForUSACallsRequest = {
      submittedSpillResponsePlan: submittedSpillResponsePlan ? spillResponsePlanDetails : '',
      qualifiedIndividualFullStyle: spillResponsePlanDetails, // etc
      oilSpillResponseOrgFullStyle: '',
      salvageAndMarineFirefightingServicesFullStyle: '',
    }
    try {
      if (hasUSA) {
        await updateForUSACalls(vesselData.id, payload)
        toast.success('For USA Calls updated')
      } else {
        await createForUSACalls(vesselData.id, payload)
        toast.success('For USA Calls created')
        setHasUSA(true)
      }
      onVesselAdded()
    } catch (e: any) {
      setError(e.message)
      toast.error('Failed to save For USA Calls')
    }
  }

  // — save just step 3 —
  const handleSaveSafety = async () => {
    setError(null)
    const payload: SafetyHelicopterRequest = {
      winchingAreaDetails,
      helicopterCircleDiameter,
    }
    try {
      if (hasSafety) {
        await updateSafetyHelicopter(vesselData.id, payload)
        toast.success('Safety/Helicopter updated')
      } else {
        await createSafetyHelicopter(vesselData.id, payload)
        toast.success('Safety/Helicopter created')
        setHasSafety(true)
      }
      onVesselAdded()
    } catch (e: any) {
      setError(e.message)
      toast.error('Failed to save Safety/Helicopter')
    }
  }

  // -- save just step 4--
  const handleSaveCoating = async () => {
    const payload: TankCoatingRequest = {
      cargoCoated,
      cargoCoatingType: cargoType,
      cargoCoatingExtent: cargoExtent,
      cargoAnodes,
      ballastCoated,
      ballastCoatingType: ballastType,
      ballastCoatingExtent: ballastExtent,
      ballastAnodes,
      slopCoated,
      slopCoatingType: slopType,
      slopCoatingExtent: slopExtent,
      slopAnodes,
      anodesFitted,
    }
    try {
      if (hasCoating) {
        await updateTankCoating(vesselData.id, payload)
        toast.success('Coating/Anodes updated')
      } else {
        await createTankCoating(vesselData.id, payload)
        toast.success('Coating/Anodes created')
        setHasCoating(true)
      }
      onVesselAdded()
    } catch (e: any) {
      toast.error('Failed to save Coating/Anodes')
    }
  }

  // — save just step 5 —
  const handleSaveBallast = async () => {
    setError(null)
    const payload: BallastRequest = {
      pumpCount,
      pumpType,
      pumpCapacity,
      pumpHead,
      eductorCount,
      eductorType,
      eductorCapacity,
      eductorHead,
      ballastHandlingData: '', // (ignored on backend)
      d1Performance,
      d2Performance,
      bwtsFitted,
      bwtsType,
      bwtsManufacturer,
      imoTypeApproval,
      uscgApproval,
    }

    try {
      if (hasBallast) {
        await updateBallast(vesselData.id, payload)
        toast.success('Ballast updated')
      } else {
        await createBallast(vesselData.id, payload)
        toast.success('Ballast created')
        setHasBallast(true)
      }
      onVesselAdded()
    } catch (e: any) {
      setError(e.message)
      toast.error('Failed to save Ballast')
    }
  }

  // — Save step 6 —
  const handleSaveCargo = async () => {
    setError(null)
    const payload: CargoSystemRequest = {
      centerlineBulkheadFitted,
      centerlineBulkheadType,

      cargoTankCentre98Capacity,
      cargoTankCentreTotalCount,
      cargoTankWing98Capacity,
      cargoTankWingTotalCount,
      deckTank98Capacity,
      deckTankTotalCount,

      segregationCapacities,

      slopsTank98Capacity,
      slopsTank95Capacity,
      slopsTankTotalCount,

      gradesSegregationCount,
      cargoContainmentType,

      fillingRestrictions,
      fillingRestrictionDetails,

      maxLoadingWithVecs,
      maxLoadingWithoutVecs,
      loadedPerManifold: loadedPerManifoldWith,
      loadedSimultaneously: loadedSimultaneouslyWith,

      cargoControlRoomFitted,
      ullageReadableFromCcr,

      gaugingCertified,
      gaugingNotCalibratedDetails,
      gaugingSystemType,
      overflowControlFitted,
      overflowAutomaticClosing,

      multipointGaugingFitted,
      multipointGaugingType,
      portableGaugingUnitsCount,

      vrsFitted,
      vrsOcimfCompliant,
      vrsSegregationCount,
      vecCertificationFitted,
      vecCertificationIssuingAuthority,
      vecsManifoldCount,
      vecsManifoldSpecs,
      vecsReducerCount,
      vecsReducerSpecs,

      ventingSystemType,

      //   manifoldCountPerSide,
      //   manifoldSize,
      //   fixedCommonLine,
      //   commonLineCountPerSide,
      //   commonLineSize,

      manifoldValveType,
      manifoldMaterialRating,
      distanceBetweenCargoManifoldCenters,
      distanceShipRailToManifold,
      distanceManifoldToShipSide,
      topOfRailToCenterOfManifold,
      distanceMainDeckToCenterOfManifold,
      distanceSpillTankGratingToCenterOfManifold,

      manifoldHeightNormalBallast,
      manifoldHeightSdwtCondition,
      reducerDetails,

      sternManifoldFitted,
      sternManifoldSize,

      cargoHeatingType,
      cargoHeatingCoiled,
      cargoHeatingMaterial,
      slopHeatingType,
      slopHeatingCoiled,
      slopHeatingMaterial,
      thermalOilHeatingFitted,
      thermalOilSystemTanks,

      maxCargoTemperature,
      minCargoTemperature,

      cargoPumpSimultaneousCount,
      cargoPumpCount,
      cargoPumpType,
      cargoPumpCapacity,
      cargoPumpHead,
      cargoEductorCount,
      cargoEductorType,
      cargoEductorCapacity,
      cargoEductorHead,
      strippingPumpCount,
      strippingPumpType,
      strippingPumpCapacity,
      strippingPumpHead,
      emergencyPortablePumpProvided,

      cleaningEquipmentFixedInCargoTanks,
      portableCleaningProvided,
      tankWashingPumpCapacity,
      washingWaterHeaterFitted,
      maxWashingWaterTemperature,
      washingMachinesCount,

      remoteTempMonitoringFitted,
      remoteTempMonitoringOperational,
      remotePressureMonitoringFitted,
      remotePressureMonitoringOperational,
      cargoTankDrierFitted,
      cargoTankDrierOperational,
      cargoTankDrierCapacity,
      cargoCoolingSystemFitted,
      cargoCoolingSystemDetails,
      steamAvailableOnDeck,
    }

    try {
      if (hasCargo) {
        await updateCargoSystem(vesselData.id, payload)
        toast.success('Cargo data updated')
      } else {
        await createCargoSystem(vesselData.id, payload)
        toast.success('Cargo data created')
        setHasCargo(true)
      }
      onVesselAdded()
    } catch (e: any) {
      toast.error('Failed to save Cargo data')
    }
  }

  // save Step 7:
  const handleSaveVacuum = async () => {
    setError(null)
    const payload: VacuumSystemRequest = {
      wiresForecastleCount: Number(wiresForecastleCount),
      wiresForecastleDiameter,
      wiresForecastleMaterial,
      wiresForecastleLength,
      wiresForecastleBreakingStrength,

      wiresMainDeckFwdCount: Number(wiresMainDeckFwdCount),
      wiresMainDeckFwdDiameter,
      wiresMainDeckFwdMaterial,
      wiresMainDeckFwdLength,
      wiresMainDeckFwdBreakingStrength,

      wiresMainDeckAftCount: Number(wiresMainDeckAftCount),
      wiresMainDeckAftDiameter,
      wiresMainDeckAftMaterial,
      wiresMainDeckAftLength,
      wiresMainDeckAftBreakingStrength,

      wiresPoopDeckCount: Number(wiresPoopDeckCount),
      wiresPoopDeckDiameter,
      wiresPoopDeckMaterial,
      wiresPoopDeckLength,
      wiresPoopDeckBreakingStrength,

      winchesPoopDeckCount: Number(winchesPoopDeckCount),
      winchesPoopDeckDiameter,
      winchesPoopDeckMaterial,
      winchesPoopDeckLength,
      winchesPoopDeckBrakingStrength,

      bollardsBittsDetails,
      fairleadsChocksDetails,

      shacklesPortCount: Number(shacklesPortCount),
      shacklesStarboardCount: Number(shacklesStarboardCount),

      emergencyTowingForwardType,
      emergencyTowingForwardSwl,
      emergencyTowingAftType,
      emergencyTowingAftSwl,

      sternChockFairleadSize,
      escortTugChockFairleadSwl,
      poopDeckBollardSwl,

      craneDetails,
      accommodationLadderDirection,
      portableGangwayFitted,
      portableGangwayLength,

      spmOcimfCompliant,
      spmChainStoppersCount: Number(spmChainStoppersCount),
      spmChainStoppersDetails,
      spmFairleadDistance,
      spmBowFairleadToBracketDistance,
      spmOcimfChockSizeOk,
      spmOcimfChockSizeDetails,
    }

    try {
      if (hasVacuum) {
        await updateVacuumSystem(vesselData.id, payload)
        toast.success('Vacuum System updated')
      } else {
        await createVacuumSystem(vesselData.id, payload)
        toast.success('Vacuum System created')
        setHasVacuum(true)
      }
      onVesselAdded()
    } catch (e: any) {
      setError(e.message)
      toast.error('Failed to save Vacuum System')
    }
  }

  // ─── handle save Step 8 ─────────────────────────────────────────────────────────
  const handleSavePropulsion = async () => {
    setError(null)
    const payload: PropulsionSystemRequest = {
      ballastSpeedMax,
      ballastSpeedEconomical,
      ladenSpeedMax,
      ladenSpeedEconomical,
      mainPropulsionFuel,
      generatingPlantFuel,
      bunkerFuelOilCapacity,
      bunkerDieselOilCapacity,
      bunkerOtherSpecify,
      propellerPitchType,
      mainEngineCount,
      mainEngineCapacity,
      mainEngineMakeType,
      auxEngineCount,
      auxEngineCapacity,
      auxEngineMakeType,
      powerPackCount,
      powerPackCapacity,
      boilerCount,
      boilerCapacity,
      boilerMakeType,
      bowThrusterBhp,
      sternThrusterBhp,
      hasEediRating,
      eediRating: hasEediRating ? eediRating : '',
      eediNoReason: hasEediRating ? '' : eediNoReason,
      eediVerifiedBy: hasEediRating ? eediVerifiedBy : '',
      hasEexiRating,
      eexiRating: hasEexiRating ? eexiRating : '',
      eexiNoReason: hasEexiRating ? '' : eexiNoReason,
      eexiVerifiedBy: hasEexiRating ? eexiVerifiedBy : '',
      hasCiiRating,
      ciiRating: hasCiiRating ? ciiRating : '',
      ciiNoReason: hasCiiRating ? '' : ciiNoReason,
      ciiVerifiedBy: hasCiiRating ? ciiVerifiedBy : '',
      hasEivRating,
      eivRating: hasEivRating ? eivRating : '',
      eivNoReason: hasEivRating ? '' : eivNoReason,
      eivVerifiedBy: hasEivRating ? eivVerifiedBy : '',
      noxControlTier,
      noxEquipmentList,
      egcsFitted,
      scrubberType: egcsFitted ? scrubberType : '',
    }

    try {
      if (hasPropulsion) {
        await updatePropulsionSystem(vesselData.id, payload)
        toast.success('Propulsion System updated')
      } else {
        await createPropulsionSystem(vesselData.id, payload)
        toast.success('Propulsion System created')
        setHasPropulsion(true)
      }
      onVesselAdded()
    } catch (e: any) {
      setError(e.message)
      toast.error('Failed to save Propulsion System')
    }
  }

  const wireRows = [
  {
    location: 'Forecastle',
    count: wiresForecastleCount,
    setCount: setWiresForecastleCount,
    diameter: wiresForecastleDiameter,
    setDiameter: setWiresForecastleDiameter,
    material: wiresForecastleMaterial,
    setMaterial: setWiresForecastleMaterial,
    length: wiresForecastleLength,
    setLength: setWiresForecastleLength,
    strength: wiresForecastleBreakingStrength,
    setStrength: setWiresForecastleBreakingStrength,
  },
  {
    location: 'Main deck fwd',
    count: wiresMainDeckFwdCount,
    setCount: setWiresMainDeckFwdCount,
    diameter: wiresMainDeckFwdDiameter,
    setDiameter: setWiresMainDeckFwdDiameter,
    material: wiresMainDeckFwdMaterial,
    setMaterial: setWiresMainDeckFwdMaterial,
    length: wiresMainDeckFwdLength,
    setLength: setWiresMainDeckFwdLength,
    strength: wiresMainDeckFwdBreakingStrength,
    setStrength: setWiresMainDeckFwdBreakingStrength,
  },
  {
    location: 'Main deck aft',
    count: wiresMainDeckAftCount,
    setCount: setWiresMainDeckAftCount,
    diameter: wiresMainDeckAftDiameter,
    setDiameter: setWiresMainDeckAftDiameter,
    material: wiresMainDeckAftMaterial,
    setMaterial: setWiresMainDeckAftMaterial,
    length: wiresMainDeckAftLength,
    setLength: setWiresMainDeckAftLength,
    strength: wiresMainDeckAftBreakingStrength,
    setStrength: setWiresMainDeckAftBreakingStrength,
  },
  {
    location: 'Poop deck',
    count: wiresPoopDeckCount,
    setCount: setWiresPoopDeckCount,
    diameter: wiresPoopDeckDiameter,
    setDiameter: setWiresPoopDeckDiameter,
    material: wiresPoopDeckMaterial,
    setMaterial: setWiresPoopDeckMaterial,
    length: wiresPoopDeckLength,
    setLength: setWiresPoopDeckLength,
    strength: wiresPoopDeckBreakingStrength,
    setStrength: setWiresPoopDeckBreakingStrength,
  },
]

  if (!isOpen) return null

  return (
    <div className='modal-overlay'>
      <div className='modal-dialog modal-dialog-centered modal-xl' role='document'>
        <div
          className='modal-content'
          onClick={(e) => e.stopPropagation()}
          style={{maxWidth: '100rem'}}
        >
          <div className='custom-modal-header d-flex justify-content-between align-items-center'>
            <h5 className='m-0'>{isEdit ? 'Edit' : 'Add'} Additional Vessel Info</h5>
            <button className='close-btn' onClick={onClose}>
              <KTSVG path='/media/map/x.svg' className='svg-icon-2x' />
            </button>
          </div>

          <div className='custom-modal-body'>
            {error && <div className='alert alert-danger'>{error}</div>}

            <ul
              className='nav nav-tabs d-flex flex-nowrap overflow-auto'
              id='vesselStepsTabs'
              role='tablist'
            >
              {TABS.map((tab) => (
                <li
                  key={tab.key}
                  className='nav-item flex-fill text-center border me-1 rounded-top'
                  style={{flex: '0 1 auto', minWidth: '85px'}}
                  role='presentation'
                >
                  <button
                    className={`nav-link w-100 h-100  ${activeTab === tab.key ? 'active' : ''}`}
                    style={{fontSize: '0.75rem'}}
                    onClick={() => setActiveTab(tab.key as any)}
                    type='button'
                    role='tab'
                  >
                    {tab.label}
                  </button>
                </li>
              ))}
              {/* Add other steps here the same way */}
            </ul>

            <div className='tab-content border border-top-0 p-4'>
              {activeTab === 'step1' && (
                <div className='tab-pane fade show active' role='tabpanel'>
                  {/* Step 1: General Information */}
                  <div className='row'>
                    {/* Vessel IMO */}
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>Vessel IMO</label>
                      <input
                        type='text'
                        className='form-control'
                        value={vesselData.imoNumber}
                        // onChange={(e) => setVesselImo(e.target.value)}
                        disabled
                        placeholder='Enter vessel IMO'
                      />
                    </div>
{/* INTERTANKO Membership */}
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>
                        Is the vessel owner/manager a member of INTERTANKO?
                      </label>
                      <div className='form-check'>
                        <input
                          type='checkbox'
                          className='form-check-input'
                          id='intertankoMember'
                          checked={isIntertankoMember}
                          onChange={(e) => setIsIntertankoMember(e.target.checked)}
                        />
                        <label className='form-check-label' htmlFor='intertankoMember'>
                          Yes, member of INTERTANKO
                        </label>
                      </div>
                     
                    </div>
                     {isIntertankoMember && (
                        <div className='col-md-4 mb-3'>
                          <label className='modal_label'>IMO Number of Member Organization</label>
                          <input
                            type='text'
                            className='form-control'
                            value={intertankoMemberImo}
                            onChange={(e) => setIntertankoMemberImo(e.target.value)}
                            placeholder='Enter IMO number'
                          />
                        </div>
                      )}

                    {/* Previous Names and Dates */}
{/* <div className='col-12 mb-3'>
  <label className='modal_label'>Previous Name(s) & Date(s) of Change</label>

  {Object.entries(previousNamesAndDates).map(([oldName, oldDate], i) => (
    <div key={i} className='d-flex mb-2 align-items-center'>
      <input
        type='text'
        className='form-control me-2'
        value={oldName}
        onChange={e => {
          const newName = e.target.value
          setPreviousNamesAndDates(prev => {
            const { [oldName]: date, ...rest } = prev
            return { ...rest, [newName]: date! }
          })
        }}
      />

      <input
        type='date'
        className='form-control me-2'
        value={oldDate}
        onChange={e => {
          const newDate = e.target.value
          setPreviousNamesAndDates(prev => ({
            ...prev,
            [oldName]: newDate,
          }))
        }}
      />

      <button
        type='button'
        className='btn btn-sm btn-link text-danger'
        onClick={() => removePrevNameEntry(oldName)}
      >
        <KTSVG path='/media/icons/trash.svg' className='svg-icon-2' />
      </button>
    </div>
  ))}

  <div className='d-flex mb-2'>
    <input
      type='text'
      className='form-control me-2'
      placeholder='Name'
      value={newPrevName}
      onChange={e => setNewPrevName(e.target.value)}
    />
    <input
      type='date'
      className='form-control me-2'
      value={newPrevDate}
      onChange={e => setNewPrevDate(e.target.value)}
    />
    <button
      type='button'
      className='btn btn-outline-primary'
      onClick={addPrevNameEntry}
    >
      Add
    </button>
  </div>
</div> */}


                    {/* Date Delivered / Builder */}
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>Date Delivered</label>
                      <input
                        type='date'
                        className='form-control'
                        value={dateDelivered}
                        onChange={(e) => setDateDelivered(e.target.value)}
                      />
                    </div>
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>Builder (where built)</label>
                      <input
                        type='text'
                        className='form-control'
                        value={builder}
                        onChange={(e) => setBuilder(e.target.value)}
                      />
                    </div>
                    <div className='col-md-4 mb-3'>
    <label className='modal_label'>Flag / Port of Registry</label>
    <input
      type='text'
      className='form-control'
      value={flagPortOfRegistry}
      onChange={(e) => setFlagPortOfRegistry(e.target.value)}
      placeholder='Enter flag/port of registry'
    />
  </div>
  <div className='col-md-4 mb-3'>
    <label className='modal_label'>Call Sign / MMSI</label>
    <input
      type='text'
      className='form-control'
      value={callSignMmsi}
      onChange={(e) => setCallSignMmsi(e.target.value)}
      placeholder='Enter call sign or MMSI'
    />
  </div>

                    {/* Vessel Contact Details */}
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>Tel</label>
                      <input
                        type='text'
                        className='form-control'
                        value={contactTel}
                        onChange={(e) => {
                          setContactTel(e.target.value)
                          setContactTelError(null)
                        }}
                        onBlur={() => {
                          if (contactTel && !isValidPhone(contactTel)) {
                            setContactTelError('Invalid phone format')
                          }
                        }}
                      />
                      {contactTelError && <div className='text-danger small'>{contactTelError}</div>}
                    </div>
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>Fax</label>
                      <input
                        type='text'
                        className='form-control'
                        value={contactFax}
                        onChange={(e) => {
                          setContactFax(e.target.value)
                          setContactFaxError(null)
                        }}
                        onBlur={() => {
                          if (contactFax && !isValidPhone(contactFax)) {
                            setContactFaxError('Invalid fax format')
                          }
                        }}
                      />
                      {contactFaxError && <div className='text-danger small'>{contactFaxError}</div>}
                    </div>
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>Email</label>
                      <input
                        type='email'
                        className='form-control'
                        value={contactEmail}
                        onChange={(e) => {
                          setContactEmail(e.target.value)
                          setContactEmailError(null)
                        }}
                        onBlur={() => {
                          if (contactEmail && !isValidEmail(contactEmail)) {
                            setContactEmailError('Invalid email address')
                          }
                        }}
                      />
                      {contactEmailError && (
                        <div className='text-danger small'>{contactEmailError}</div>
                      )}
                    </div>

                    {/* Vessel Type */}
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>Vessel Type (IOPPC)</label>
                      <input
                        type='text'
                        className='form-control'
                        value={vesselTypeIoppc}
                        onChange={(e) => setVesselTypeIoppc(e.target.value)}
                      />
                    </div>
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>Other Vessel Type (if applicable)</label>
                      <input
                        type='text'
                        className='form-control'
                        value={otherVesselType || ''}
                        onChange={(e) => setOtherVesselType(e.target.value || null)}
                      />
                    </div>

                    {/* Hull Type */}
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>Type of Hull</label>
                      <input
                        type='text'
                        className='form-control'
                        value={hullType}
                        onChange={(e) => setHullType(e.target.value)}
                      />
                    </div>

                    <h6 className='py-1'>Ownership and Operation</h6>

                    {/* Registered Owner */}
                    <div className='col-md-6 mb-3'>
                      <label className='modal_label'>Registered Owner</label>
                      <textarea
                        className='form-control'
                        value={registeredOwner}
                        onChange={(e) => setRegisteredOwner(e.target.value)}
                        rows={3}
                      ></textarea>
                    </div>
                    <div className='col-md-6 mb-3'>
                      <label className='modal_label'>Registered Owner IMO</label>
                      <input
                        type='text'
                        className='form-control'
                        value={registeredOwnerImo}
                        onChange={(e) => setRegisteredOwnerImo(e.target.value)}
                      />
                    </div>
                    <div className='col-md-6 mb-3'>
                      <label className='modal_label'>Registered Owner Address</label>
                      <textarea
                        className='form-control'
                        value={registeredOwnerAddress}
                        onChange={(e) => setRegisteredOwnerAddress(e.target.value)}
                        rows={3}
                      ></textarea>
                    </div>
                    <div className='col-md-6 mb-3'>
                      <label className='modal_label'>Registered Owner Tel</label>
                      <input
                        type='text'
                        className='form-control'
                        value={registeredOwnerTel}
                        onChange={(e) => {
                          setRegisteredOwnerTel(e.target.value)
                          setRegisteredOwnerTelError(null)
                        }}
                        onBlur={() => {
                          if (registeredOwnerTel && !isValidPhone(registeredOwnerTel)) {
                            setRegisteredOwnerTelError('Invalid phone format')
                          }
                        }}
                      />
                      {registeredOwnerTelError && (
                        <div className='text-danger small'>{registeredOwnerTelError}</div>
                      )}
                    </div>
                    <div className='col-md-6 mb-3'>
                      <label className='modal_label'>Registered Owner Fax</label>
                      <input
                        type='text'
                        className='form-control'
                        value={registeredOwnerFax}
                        onChange={(e) => {
                          setRegisteredOwnerFax(e.target.value)
                          setRegisteredOwnerFaxError(null)
                        }}
                        onBlur={() => {
                          if (registeredOwnerFax && !isValidPhone(registeredOwnerFax)) {
                            setRegisteredOwnerFaxError('Invalid fax format')
                          }
                        }}
                      />
                      {registeredOwnerFaxError && (
                        <div className='text-danger small'>{registeredOwnerFaxError}</div>
                      )}
                    </div>
                    <div className='col-md-6 mb-3'>
                      <label className='modal_label'>Registered Owner Email</label>
                      <input
                        type='email'
                        className='form-control'
                        value={registeredOwnerEmail}
                        onChange={(e) => {
                          setRegisteredOwnerEmail(e.target.value)
                          setRegisteredOwnerEmailError(null)
                        }}
                        onBlur={() => {
                          if (registeredOwnerEmail && !isValidEmail(registeredOwnerEmail)) {
                            setRegisteredOwnerEmailError('Invalid email address')
                          }
                        }}
                      />
                      {registeredOwnerEmailError && (
                        <div className='text-danger small'>{registeredOwnerEmailError}</div>
                      )}
                    </div>

                    {/* Technical Operator */}
                    <div className='col-md-6 mb-3'>
                      <label className='modal_label'>Technical Operator</label>
                      <textarea
                        className='form-control'
                        value={technicalOperator}
                        onChange={(e) => setTechnicalOperator(e.target.value)}
                        rows={3}
                      ></textarea>
                    </div>
                    <div className='col-md-6 mb-3'>
                      <label className='modal_label'>Technical Operator IMO</label>
                      <input
                        type='text'
                        className='form-control'
                        value={technicalOperatorImo || ''}
                        onChange={(e) => setTechnicalOperatorImo(e.target.value || null)}
                      />
                    </div>
                    <div className='col-md-6 mb-3'>
                      <label className='modal_label'>Technical Operator Address</label>
                      <textarea
                        className='form-control'
                        value={technicalOperatorAddress}
                        onChange={(e) => setTechnicalOperatorAddress(e.target.value)}
                        rows={3}
                      ></textarea>
                    </div>
                    <div className='col-md-6 mb-3'>
                      <label className='modal_label'>Technical Operator Tel</label>
                      <input
                        type='text'
                        className='form-control'
                        value={technicalOperatorTel}
                        onChange={(e) => {
                          setTechnicalOperatorTel(e.target.value)
                          setTechnicalOperatorTelError(null)
                        }}
                        onBlur={() => {
                          if (technicalOperatorTel && !isValidPhone(technicalOperatorTel)) {
                            setTechnicalOperatorTelError('Invalid phone format')
                          }
                        }}
                      />
                      {technicalOperatorTelError && (
                        <div className='text-danger small'>{technicalOperatorTelError}</div>
                      )}
                    </div>
                    <div className='col-md-6 mb-3'>
                      <label className='modal_label'>Technical Operator Fax</label>
                      <input
                        type='text'
                        className='form-control'
                        value={technicalOperatorFax}
                        onChange={(e) => {
                          setTechnicalOperatorFax(e.target.value)
                          setTechnicalOperatorFaxError(null)
                        }}
                        onBlur={() => {
                          if (technicalOperatorFax && !isValidPhone(technicalOperatorFax)) {
                            setTechnicalOperatorFaxError('Invalid fax format')
                          }
                        }}
                      />
                      {technicalOperatorFaxError && (
                        <div className='text-danger small'>{technicalOperatorFaxError}</div>
                      )}
                    </div>
                    <div className='col-md-6 mb-3'>
                      <label className='modal_label'>Technical Operator Email</label>
                      <input
                        type='email'
                        className='form-control'
                        value={technicalOperatorEmail}
                        onChange={(e) => {
                          setTechnicalOperatorEmail(e.target.value)
                          setTechnicalOperatorEmailError(null)
                        }}
                        onBlur={() => {
                          if (technicalOperatorEmail && !isValidEmail(technicalOperatorEmail)) {
                            setTechnicalOperatorEmailError('Invalid email address')
                          }
                        }}
                      />
                      {technicalOperatorEmailError && (
                        <div className='text-danger small'>{technicalOperatorEmailError}</div>
                      )}
                    </div>

                    {/* Other Operators */}
                    <div className='col-md-6 mb-3'>
                      <label className='modal_label'>Commercial Operator</label>
                      <textarea
                        className='form-control'
                        value={commercialOperator}
                        onChange={(e) => setCommercialOperator(e.target.value)}
                        rows={3}
                      ></textarea>
                    </div>
                    <div className='col-md-6 mb-3'>
                      <label className='modal_label'>Disponent Owner</label>
                      <textarea
                        className='form-control'
                        value={disponentOwner}
                        onChange={(e) => setDisponentOwner(e.target.value)}
                        rows={3}
                      ></textarea>
                    </div>

                    {/* P&I Club */}
                    <div className='col-md-6 mb-3'>
                      <label className='modal_label'>P&I Club</label>
                      <input
                        type='text'
                        className='form-control'
                        value={piClub}
                        onChange={(e) => setPiClub(e.target.value)}
                      />
                    </div>
                    <div className='col-md-6 mb-3'>
                      <label className='modal_label'>P&I Pollution Coverage Expiry</label>
                      <input
                        type='date'
                        className='form-control'
                        value={piPollutionCoverageExpiry}
                        onChange={(e) => setPiPollutionCoverageExpiry(e.target.value)}
                      />
                    </div>

                    {/* Hull & Machinery Insurance */}
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>Hull & Machinery Insurer</label>
                      <input
                        type='text'
                        className='form-control'
                        value={hullMachineryInsurer}
                        onChange={(e) => setHullMachineryInsurer(e.target.value)}
                      />
                    </div>
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>Hull & Machinery Insured Value</label>
                      <div className='input-group'>
                        <input
                          type='number'
                          className='form-control'
                          value={hullMachineryInsuredValue}
                          onChange={(e) => setHullMachineryInsuredValue(Number(e.target.value))}
                        />
                        <span className='input-group-text'>USD</span>
                      </div>
                    </div>
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>Hull & Machinery Insured Expiry</label>
                      <input
                        type='date'
                        className='form-control'
                        value={hullMachineryInsuredExpiry}
                        onChange={(e) => setHullMachineryInsuredExpiry(e.target.value)}
                      />
                    </div>

                    <h6 className='py-1'>Classification</h6>

                    {/* Classification Society */}
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>Classification Society</label>
                      <input
                        type='text'
                        className='form-control'
                        value={classificationSociety}
                        onChange={(e) => setClassificationSociety(e.target.value)}
                      />
                    </div>

                    {/* IACS Member */}
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>
                        Is Classification Society an IACS member?
                      </label>
                      <div className='form-check'>
                        <input
                          type='checkbox'
                          className='form-check-input'
                          id='iacsMember'
                          checked={classificationSocietyIacsMember}
                          onChange={(e) => setClassificationSocietyIacsMember(e.target.checked)}
                        />
                        <label className='form-check-label' htmlFor='iacsMember'>
                          Yes, member of IACS
                        </label>
                      </div>
                    </div>

                    {/* Class Notation */}
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>Class Notation</label>
                      <input
                        type='text'
                        className='form-control'
                        value={classNotation}
                        onChange={(e) => setClassNotation(e.target.value)}
                      />
                    </div>

                    {/* Open Conditions of Class */}
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>
                        Does the vessel have any open conditions of Class?
                      </label>
                      <div className='form-check'>
                        <input
                          type='checkbox'
                          className='form-check-input'
                          id='openClassConditions'
                          checked={hasOpenClassConditions}
                          onChange={(e) => setHasOpenClassConditions(e.target.checked)}
                        />
                        <label className='form-check-label' htmlFor='openClassConditions'>
                          Yes, open conditions exist
                        </label>
                      </div>
                      {hasOpenClassConditions && (
                        <div className='mt-3'>
                          <label className='modal_label'>List of Open Conditions</label>
                          <textarea
                            className='form-control'
                            rows={3}
                            value={openConditionsOfClass}
                            onChange={(e) => setOpenConditionsOfClass(e.target.value)}
                            placeholder='E.g., Port anchor fluke missing'
                          ></textarea>
                        </div>
                      )}
                    </div>

                    {/* Memoranda of Class */}
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>Memoranda of Class</label>
                      <textarea
                        className='form-control'
                        value={memorandaOfClass}
                        onChange={(e) => setMemorandaOfClass(e.target.value)}
                        rows={3}
                      ></textarea>
                    </div>

                    {/* Previous Class Societies */}
                    <div className='col-12 mb-3'>
                      <label className='modal_label'>
                        Previous Classification Society & Date(s) of Change
                      </label>
                      <div className='d-flex mb-2'>
                        <input
                          type='text'
                          className='form-control me-2'
                          placeholder='Classification Society'
                          value={newClassSociety}
                          onChange={(e) => setNewClassSociety(e.target.value)}
                        />
                        <input
                          type='date'
                          className='form-control me-2'
                          value={newClassSocietyDate}
                          onChange={(e) => setNewClassSocietyDate(e.target.value)}
                        />
                        <button
                          type='button'
                          className='btn btn-outline-primary'
                          onClick={addClassSocietyEntry}
                        >
                          Add
                        </button>
                      </div>
                      <ul className='list-group'>
                        {Object.entries(previousClassSocietyAndDates).map(([society, date]) => (
                          <li
                            key={society}
                            className='list-group-item d-flex justify-content-between align-items-center'
                          >
                            <span>
                              {society} ({date})
                            </span>
                            <button
                              type='button'
                              className='btn btn-sm btn-link text-danger'
                              onClick={() => removeClassSocietyEntry(society)}
                            >
                              <KTSVG path='/media/icons/trash.svg' className='svg-icon-2' />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Ice Class */}
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>
                        Does the vessel have ice class? If yes, state what level:
                      </label>
                      <div className='form-check'>
                        <input
                          type='checkbox'
                          className='form-check-input'
                          id='hasIceClass'
                          checked={hasIceClass}
                          onChange={(e) => setHasIceClass(e.target.checked)}
                        />
                        <label className='form-check-label' htmlFor='hasIceClass'>
                          Yes, vessel has ice class
                        </label>
                      </div>
                      {hasIceClass && (
                        <div className='mt-3'>
                          <label className='modal_label'>Ice Class Level</label>
                          <textarea
                            className='form-control'
                            rows={2}
                            value={iceClassLevel}
                            onChange={(e) => setIceClassLevel(e.target.value)}
                            placeholder='Enter ice class level'
                          ></textarea>
                        </div>
                      )}
                    </div>

                    {/* Dry Dock and Surveys */}
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>Last Dry Dock Date</label>
                      <input
                        type='date'
                        className='form-control'
                        value={lastDryDockDate}
                        onChange={(e) => setLastDryDockDate(e.target.value)}
                      />
                    </div>
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>Next Dry Dock Date</label>
                      <input
                        type='date'
                        className='form-control'
                        value={nextDryDockDate}
                        onChange={(e) => setNextDryDockDate(e.target.value)}
                      />
                    </div>
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>Next Annual Survey Due</label>
                      <input
                        type='date'
                        className='form-control'
                        value={nextAnnualSurveyDue}
                        onChange={(e) => setNextAnnualSurveyDue(e.target.value)}
                      />
                    </div>
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>Last Special Survey Date</label>
                      <input
                        type='date'
                        className='form-control'
                        value={lastSpecialSurveyDate}
                        onChange={(e) => setLastSpecialSurveyDate(e.target.value)}
                      />
                    </div>
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>Next Special Survey Date</label>
                      <input
                        type='date'
                        className='form-control'
                        value={nextSpecialSurveyDate}
                        onChange={(e) => setNextSpecialSurveyDate(e.target.value)}
                      />
                    </div>
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>CAP Rating</label>
                      <input
                        type='text'
                        className='form-control'
                        value={capRating}
                        onChange={(e) => setCapRating(e.target.value)}
                      />
                    </div>

                    <h6 className='py-1'>Dimensions</h6>

                   {/* Dimensions Fields */}
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>Length Overall (LOA)</label>
                      <div className='input-group'>
                        <input
                          type='number'
                          className='form-control'
                          value={lengthOverall}
                          onChange={(e) => setLengthOverall(Number(e.target.value))}
                        />
                        <span className='input-group-text'>m</span>
                      </div>
                    </div>
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>Length Between Perpendiculars (LBP)</label>
                      <div className='input-group'>
                        <input
                          type='number'
                          className='form-control'
                          value={lengthBetweenPerpendiculars}
                          onChange={(e) => setLengthBetweenPerpendiculars(Number(e.target.value))}
                        />
                        <span className='input-group-text'>m</span>
                      </div>
                    </div>
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>Extreme Breadth (Beam)</label>
                      <div className='input-group'>
                        <input
                          type='number'
                          className='form-control'
                          value={extremeBreadth}
                          onChange={(e) => setExtremeBreadth(Number(e.target.value))}
                        />
                        <span className='input-group-text'>m</span>
                      </div>
                    </div>
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>Moulded Depth</label>
                      <div className='input-group'>
                        <input
                          type='number'
                          className='form-control'
                          value={mouldedDepth}
                          onChange={(e) => setMouldedDepth(Number(e.target.value))}
                        />
                        <span className='input-group-text'>m</span>
                      </div>
                    </div>
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>Keel to Masthead (KTM)</label>
                      <div className='input-group'>
                        <input
                          type='number'
                          className='form-control'
                          value={keelToMastheadHeight}
                          onChange={(e) => setKeelToMastheadHeight(Number(e.target.value))}
                        />
                        <span className='input-group-text'>m</span>
                      </div>
                    </div>
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>
                        Keel to Masthead (KTM) in Collapsed Condition
                      </label>
                      <div className='input-group'>
                        <input
                          type='number'
                          className='form-control'
                          value={keelToMastheadCollapsed ?? ''}
                          onChange={(e) =>
                            setKeelToMastheadCollapsed(
                              e.target.value ? Number(e.target.value) : null
                            )
                          }
                        />
                        <span className='input-group-text'>m</span>
                      </div>
                    </div>
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>
                        Distance Bridge Front to Center of Manifold
                      </label>
                      <div className='input-group'>
                        <input
                          type='number'
                          className='form-control'
                          value={bridgeFrontToManifoldCentre}
                          onChange={(e) => setBridgeFrontToManifoldCentre(Number(e.target.value))}
                        />
                        <span className='input-group-text'>m</span>
                      </div>
                    </div>
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>Bow to Center Manifold (BCM)</label>
                      <div className='input-group'>
                        <input
                          type='number'
                          className='form-control'
                          value={bowToManifoldCentre}
                          onChange={(e) => setBowToManifoldCentre(Number(e.target.value))}
                        />
                        <span className='input-group-text'>m</span>
                      </div>
                    </div>
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>Stern to Center Manifold (SCM)</label>
                      <div className='input-group'>
                        <input
                          type='number'
                          className='form-control'
                          value={sternToManifoldCentre}
                          onChange={(e) => setSternToManifoldCentre(Number(e.target.value))}
                        />
                        <span className='input-group-text'>m</span>
                      </div>
                    </div>
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>Parallel Body Distance</label>
                      <div className='input-group'>
                        <input
                          type='number'
                          className='form-control'
                          value={parallelBodyDistance}
                          onChange={(e) => setParallelBodyDistance(Number(e.target.value))}
                        />
                        <span className='input-group-text'>m</span>
                      </div>
                    </div>
                    <div className='col-md-3'>
                      <label className='modal_label fw-bold'>Lightship</label>
                      {lightshipFields.map(([val, setter], i) => (
                        <div key={i} className='input-group mb-2'>
                          <input
                            type='number'
                            className='form-control'
                            value={val ?? ''}
                            onChange={(e) => setter(e.target.value ? Number(e.target.value) : null)}
                          />
                          <span className='input-group-text'>m</span>
                        </div>
                      ))}
                    </div>
                    <div className='col-md-3'>
                      <label className='modal_label fw-bold'>Normal Ballast</label>
                      {normalBallastFields.map(([val, setter], i) => (
                        <div key={i} className='input-group mb-2'>
                          <input
                            type='number'
                            className='form-control'
                            value={val ?? ''}
                            onChange={(e) => setter(e.target.value ? Number(e.target.value) : null)}
                          />
                          <span className='input-group-text'>m</span>
                        </div>
                      ))}
                    </div>
                    <div className='col-md-3'>
                      <label className='modal_label fw-bold'>Summer Dwt</label>
                      {summerDwtFields.map(([val, setter], i) => (
                        <div key={i} className='input-group mb-2'>
                          <input
                            type='number'
                            className='form-control'
                            value={val ?? ''}
                            onChange={(e) => setter(e.target.value ? Number(e.target.value) : null)}
                          />
                          <span className='input-group-text'>m</span>
                        </div>
                      ))}
                    </div>



                    <h6 className='py-1'>Tonnages</h6>

                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>Net Tonnage</label>
                      <input
                        type='number'
                        className='form-control'
                        value={netTonnage}
                        onChange={(e) => setNetTonnage(Number(e.target.value))}
                      />
                    </div>
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>Gross Tonnage</label>
                      <input
                        type='number'
                        className='form-control'
                        value={grossTonnage}
                        onChange={(e) => setGrossTonnage(Number(e.target.value))}
                      />
                    </div>
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>Reduced Gross Tonnage (if applicable)</label>
                      <input
                        type='number'
                        className='form-control'
                        value={reducedGrossTonnage}
                        onChange={(e) => setReducedGrossTonnage(Number(e.target.value))}
                      />
                    </div>
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>Suez Canal Tonnage - Gross (SCGT)</label>
                      <input
                        type='number'
                        className='form-control'
                        value={suezGrossTonnage}
                        onChange={(e) => setSuezGrossTonnage(Number(e.target.value))}
                      />
                    </div>
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>Net (SCNT)</label>
                      <input
                        type='number'
                        className='form-control'
                        value={suezNetTonnage}
                        onChange={(e) => setSuezNetTonnage(Number(e.target.value))}
                      />
                    </div>
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>
                        Is vessel fitted for transit of Panama Canal?
                      </label>
                      <div className='form-check'>
                        <input
                          type='checkbox'
                          className='form-check-input'
                          id='isFittedForPanama'
                          checked={panamaTransitFit}
                          onChange={(e) => setPanamaTransitFit(e.target.checked)}
                        />
                        <label className='form-check-label' htmlFor='isFittedForPanama'>
                          Yes, vessel is fitted for Panama Canal transit
                        </label>
                      </div>
                      {panamaTransitFit && (
                        <div className='mt-3'>
                          <label className='modal_label'>Panama Canal Net Tonnage (PCNT)</label>
                          <div className='input-group'>
                            <input
                              type='number'
                              className='form-control'
                              value={panamaNetTonnage}
                              onChange={(e) => setPanamaNetTonnage(Number(e.target.value))}
                              placeholder='Enter PCNT'
                            />
                            <span className='input-group-text'>tons</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <h6 className='py-1'>Loadline Information</h6>

                    <div className='col-12 row'>
                      <div
                        className='col mb-3 d-flex flex-column justify-content-between'
                        style={{ flex: '0 0 20%' }}
                      >
                        <label className='modal_label'>Loadline</label>
                        <label className='modal_label'>Summer</label>
                        <label className='modal_label'>Winter</label>
                        <label className='modal_label'>Tropical</label>
                        <label className='modal_label'>Normal loaded condition</label>
                        <label className='modal_label'>Lightship</label>
                        <label className='modal_label'>Normal Ballast Condition</label>
                        <label className='modal_label'>Segregated Ballast Condition</label>
                      </div>

                      {/* Lightship */}
                      <div className='col mb-3' style={{ flex: '0 0 20%' }}>
                        <label className='modal_label fw-bold'>Freeboard</label>
                        <div className='input-group mb-2'>
                          <input
                            type='number'
                            className='form-control'
                            value={summerFreeboard ?? ''}
                            onChange={(e) =>
                              setSummerFreeboard(e.target.value ? Number(e.target.value) : null)
                            }
                          />
                          <span className='input-group-text'>m</span>
                        </div>
                        <div className='input-group mb-2'>
                          <input
                            type='number'
                            className='form-control'
                            value={winterFreeboard ?? ''}
                            onChange={(e) =>
                              setWinterFreeboard(e.target.value ? Number(e.target.value) : null)
                            }
                          />
                          <span className='input-group-text'>m</span>
                        </div>
                        <div className='input-group mb-2'>
                          <input
                            type='number'
                            className='form-control'
                            value={tropicalFreeboard ?? ''}
                            onChange={(e) =>
                              setTropicalFreeboard(e.target.value ? Number(e.target.value) : null)
                            }
                          />
                          <span className='input-group-text'>m</span>
                        </div>
                        <div className='input-group mb-2'>
                          <input
                            type='number'
                            className='form-control'
                            value={normalLoadedFreeboard ?? ''}
                            onChange={(e) =>
                              setNormalLoadedFreeboard(
                                e.target.value ? Number(e.target.value) : null
                              )
                            }
                          />
                          <span className='input-group-text'>m</span>
                        </div>
                        <div className='input-group mb-2'>
                          <input
                            type='number'
                            className='form-control'
                            value={lightshipFreeboard ?? ''}
                            onChange={(e) =>
                              setLightshipFreeboard(e.target.value ? Number(e.target.value) : null)
                            }
                          />
                          <span className='input-group-text'>m</span>
                        </div>
                        <div className='input-group mb-2'>
                      <input
                        type='number'
                        className='form-control'
                        value={normalBallastFreeboard ?? ''}
                        onChange={(e) =>
                          setNormalBallastFreeboard(e.target.value ? Number(e.target.value) : null)
                        }
                      />
                      <span className='input-group-text'>m</span>
                    </div>
                    <div className='input-group mb-2'>
                      <input
                        type='number'
                        className='form-control'
                        value={segregatedBallastFreeboard ?? ''}
                        onChange={(e) =>
                          setSegregatedBallastFreeboard(
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                      />
                      <span className='input-group-text'>m</span>
                    </div>
                  </div>

                      <div className='col mb-3' style={{ flex: '0 0 20%' }}>
                    <label className='modal_label fw-bold'>Draft</label>
                    <div className='input-group mb-2'>
                      <input
                        type='number'
                        className='form-control'
                        value={summerDraft ?? ''}
                        onChange={(e) =>
                          setSummerDraft(e.target.value ? Number(e.target.value) : null)
                        }
                      />
                      <span className='input-group-text'>m</span>
                    </div>
                    <div className='input-group mb-2'>
                      <input
                        type='number'
                        className='form-control'
                        value={winterDraft ?? ''}
                        onChange={(e) =>
                          setWinterDraft(e.target.value ? Number(e.target.value) : null)
                        }
                      />
                      <span className='input-group-text'>m</span>
                    </div>
                    <div className='input-group mb-2'>
                      <input
                        type='number'
                        className='form-control'
                        value={tropicalDraft ?? ''}
                        onChange={(e) =>
                          setTropicalDraft(e.target.value ? Number(e.target.value) : null)
                        }
                      />
                      <span className='input-group-text'>m</span>
                    </div>
                    <div className='input-group mb-2'>
                      <input
                        type='number'
                        className='form-control'
                        value={normalLoadedDraft ?? ''}
                        onChange={(e) =>
                          setNormalLoadedDraft(e.target.value ? Number(e.target.value) : null)
                        }
                      />
                      <span className='input-group-text'>m</span>
                    </div>
                    <div className='input-group mb-2'>
                      <input
                        type='number'
                        className='form-control'
                        value={lightshipDraft ?? ''}
                        onChange={(e) =>
                          setLightshipDraft(e.target.value ? Number(e.target.value) : null)
                        }
                      />
                      <span className='input-group-text'>m</span>
                    </div>
                    <div className='input-group mb-2'>
                      <input
                        type='number'
                        className='form-control'
                        value={normalBallastDraft ?? ''}
                        onChange={(e) =>
                          setNormalBallastDraft(e.target.value ? Number(e.target.value) : null)
                        }
                      />
                      <span className='input-group-text'>m</span>
                    </div>
                    <div className='input-group mb-2'>
                      <input
                        type='number'
                        className='form-control'
                        value={segregatedBallastDraft ?? ''}
                        onChange={(e) =>
                          setSegregatedBallastDraft(e.target.value ? Number(e.target.value) : null)
                        }
                      />
                      <span className='input-group-text'>m</span>
                    </div>
                  </div>

                      {/* Summer Dwt */}
                      <div className='col mb-3' style={{ flex: '0 0 20%' }}>
                    <label className='modal_label fw-bold'>Deadweight</label>
                    <div className='input-group mb-2'>
                      <input
                        type='number'
                        className='form-control'
                        value={summerDeadweight}
                        onChange={(e) => setSummerDeadweight(Number(e.target.value))}
                      />
                      <span className='input-group-text'>tons</span>
                    </div>
                    <div className='input-group mb-2'>
                      <input
                        type='number'
                        className='form-control'
                        value={winterDeadweight}
                        onChange={(e) => setWinterDeadweight(Number(e.target.value))}
                      />
                      <span className='input-group-text'>tons</span>
                    </div>
                    <div className='input-group mb-2'>
                      <input
                        type='number'
                        className='form-control'
                        value={tropicalDeadweight ?? ''}
                        onChange={(e) =>
                          setTropicalDeadweight(e.target.value ? Number(e.target.value) : null)
                        }
                      />
                      <span className='input-group-text'>tons</span>
                    </div>
                    <div className='input-group mb-2'>
                      <input
                        type='number'
                        className='form-control'
                        value={normalLoadedDeadweight ?? ''}
                        onChange={(e) =>
                          setNormalLoadedDeadweight(e.target.value ? Number(e.target.value) : null)
                        }
                      />
                      <span className='input-group-text'>tons</span>
                    </div>
                    <div className='input-group mb-2'>
                      <input
                        type='number'
                        className='form-control'
                        value={lightshipDeadweight ?? ''}
                        onChange={(e) =>
                          setLightshipDeadweight(e.target.value ? Number(e.target.value) : null)
                        }
                      />
                      <span className='input-group-text'>tons</span>
                    </div>
                    <div className='input-group mb-2'>
                      <input
                        type='number'
                        className='form-control'
                        value={normalBallastDeadweight ?? ''}
                        onChange={(e) =>
                          setNormalBallastDeadweight(e.target.value ? Number(e.target.value) : null)
                        }
                      />
                      <span className='input-group-text'>tons</span>
                    </div>
                    <div className='input-group mb-2'>
                      <input
                        type='number'
                        className='form-control'
                        value={segregatedBallastDeadweight ?? ''}
                        onChange={(e) =>
                          setSegregatedBallastDeadweight(
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                      />
                      <span className='input-group-text'>tons</span>
                    </div>
                  </div>
                      <div className='col mb-3' style={{ flex: '0 0 20%' }}>
                    <label className='modal_label fw-bold'>Displacement</label>
                    <div className='input-group mb-2'>
                      <input
                        type='number'
                        className='form-control'
                        value={summerDisplacement ?? ''}
                        onChange={(e) =>
                          setSummerDisplacement(e.target.value ? Number(e.target.value) : null)
                        }
                      />
                      <span className='input-group-text'>tons</span>
                    </div>
                        <div className='input-group mb-2'>
                      <input
                        type='number'
                        className='form-control'
                        value={winterDisplacement ?? ''}
                        onChange={(e) =>
                          setWinterDisplacement(e.target.value ? Number(e.target.value) : null)
                        }
                      />
                      <span className='input-group-text'>tons</span>
                    </div>
                    <div className='input-group mb-2'>
                      <input
                        type='number'
                        className='form-control'
                        value={tropicalDisplacement ?? ''}
                        onChange={(e) =>
                          setTropicalDisplacement(e.target.value ? Number(e.target.value) : null)
                        }
                      />
                      <span className='input-group-text'>tons</span>
                    </div>
                        <div className='input-group mb-2'>
                      <input
                        type='number'
                        className='form-control'
                        value={normalLoadedDisplacement ?? ''}
                        onChange={(e) =>
                          setNormalLoadedDisplacement(
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                      />
                      <span className='input-group-text'>tons</span>
                    </div>
                    <div className='input-group mb-2'>
                      <input
                        type='number'
                        className='form-control'
                        value={lightshipDisplacement ?? ''}
                        onChange={(e) =>
                          setLightshipDisplacement(e.target.value ? Number(e.target.value) : null)
                        }
                      />
                      <span className='input-group-text'>tons</span>
                    </div>
                        <div className='input-group mb-2'>
                      <input
                        type='number'
                        className='form-control'
                        value={normalBallastDisplacement ?? ''}
                        onChange={(e) =>
                          setNormalBallastDisplacement(
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                      />
                      <span className='input-group-text'>tons</span>
                    </div>
                    <div className='input-group mb-2'>
                      <input
                        type='number'
                        className='form-control'
                        value={segregatedBallastDisplacement ?? ''}
                        onChange={(e) =>
                          setSegregatedBallastDisplacement(
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                      />
                      <span className='input-group-text'>tons</span>
                    </div>
                  </div>
                </div>

                     <div className='col-md-4 mb-3'>
                  <label className='modal_label'>Summer Loadline</label>
                  <input
                    type='text'
                    className='form-control'
                    value={loadlineSummer}
                    onChange={(e) => setLoadlineSummer(e.target.value)}
                  />
                </div>
                <div className='col-md-4 mb-3'>
                  <label className='modal_label'>Winter Loadline</label>
                  <input
                    type='text'
                    className='form-control'
                    value={loadlineWinter}
                    onChange={(e) => setLoadlineWinter(e.target.value)}
                  />
                </div>
                <div className='col-md-4 mb-3'>
                  <label className='modal_label'>Tropical Loadline</label>
                  <input
                    type='text'
                    className='form-control'
                    value={loadlineTropical}
                    onChange={(e) => setLoadlineTropical(e.target.value)}
                  />
                </div>
                <div className='col-md-4 mb-3'>
                  <label className='modal_label'>Fresh Water Allowance</label>
                  <div className='input-group'>
                    <input
                      type='number'
                      className='form-control'
                      value={freshWaterAllowance}
                      onChange={(e) => setFreshWaterAllowance(Number(e.target.value))}
                    />
                    <span className='input-group-text'>mm</span>
                  </div>
                </div>
                <div className='col-md-4 mb-3'>
                  <label className='modal_label'>TPC Immersion at Summer Draft</label>
                  <div className='input-group'>
                    <input
                      type='number'
                      className='form-control'
                      value={tpcAtSummerDraft}
                      onChange={(e) => setTpcAtSummerDraft(Number(e.target.value))}
                    />
                    <span className='input-group-text'>tons/cm</span>
                  </div>
                </div>
                <div className='col-md-4 mb-3'>
                  <label className='modal_label'>Multiple Deadweights</label>
                  <input
                    type='text'
                    className='form-control'
                    value={multipleDeadweights}
                    onChange={(e) => setMultipleDeadweights(e.target.value)}
                  />
                </div>
                <div className='col-md-4 mb-3'>
                  <label className='modal_label'>Deadweight Constant</label>
                  <div className='input-group'>
                    <input
                      type='number'
                      className='form-control'
                      value={deadweightConstant}
                      onChange={(e) => setDeadweightConstant(Number(e.target.value))}
                    />
                    <span className='input-group-text'>tons</span>
                  </div>
                </div>
                <div className='col-md-4 mb-3'>
                  <label className='modal_label'>Company UKC Guideline</label>
                  <div className='input-group'>
                    <input
                      type='number'
                      className='form-control'
                      value={companyUkcGuideline}
                      onChange={(e) => setCompanyUkcGuideline(Number(e.target.value))}
                    />
                    <span className='input-group-text'>m</span>
                  </div>
                </div>
                <div className='col-md-4 mb-3'>
                  <label className='modal_label'>Air Draft</label>
                  <div className='input-group'>
                    <input
                      type='number'
                      className='form-control'
                      value={airDraft}
                      onChange={(e) => setAirDraft(Number(e.target.value))}
                    />
                    <span className='input-group-text'>m</span>
                  </div>
                </div>
                  </div>
                </div>
              )}
              {activeTab === 'step2' && (
                <div className='tab-pane fade show active' role='tabpanel'>
                  {/* Step 2: FOR USA CALLS */}
                  <div className='row'>
                    {/* 2.1 Spill Response Plan */}
                    <div className='col-6 mb-3 '>
                      <label className='modal_label'>
                        Has the vessel Operator submitted a Vessel Spill Response Plan to the US
                        Coast Guard which has been approved by official USCG letter?
                      </label>
                      <div className='form-check'>
                        <input
                          type='checkbox'
                          className='form-check-input'
                          id='spillPlan'
                          checked={submittedSpillResponsePlan}
                          onChange={(e) => setSubmittedSpillResponsePlan(e.target.checked)}
                        />
                        <label className='form-check-label' htmlFor='spillPlan'>
                          Yes, Vessel Spill Response Plan submitted & approved
                        </label>
                      </div>
                      {submittedSpillResponsePlan && (
                        <textarea
                          className='form-control mt-2'
                          rows={2}
                          value={spillResponsePlanDetails}
                          onChange={(e) => setSpillResponsePlanDetails(e.target.value)}
                          placeholder='e.g. Yes - approved by USCG on 2025-02-15'
                        />
                      )}
                    </div>

                    {/* 2.2 QI */}
                    <div className='col-6 mb-3'>
                      <label className='modal_label'>Qualified individual (QI) - Full style</label>
                      <input
                        type='text'
                        className='form-control'
                        value={qualifiedIndividualFullStyle}
                        onChange={(e) => setQualifiedIndividualFullStyle(e.target.value)}
                      />
                    </div>
                    {/* 2.3 OSRO */}
                    <div className='col-6 mb-3'>
                      <label className='modal_label'>
                        Oil Spill Response Organization (OSRO) - Full style
                      </label>
                      <input
                        type='text'
                        className='form-control'
                        value={oilSpillResponseOrgFullStyle}
                        onChange={(e) => setOilSpillResponseOrgFullStyle(e.target.value)}
                      />
                    </div>
                    {/* 2.4 SMFF */}
                    <div className=' col-6 mb-3'>
                      <label className='modal_label'>
                        Salvage and Marine Firefighting Services (SMFF) - Full Style
                      </label>
                      <input
                        type='text'
                        className='form-control'
                        value={salvageAndMarineFirefightingServicesFullStyle}
                        onChange={(e) =>
                          setSalvageAndMarineFirefightingServicesFullStyle(e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'step3' && (
                <div className='tab-pane fade show active' role='tabpanel'>
                  {/* Step 3: SAFETY/HELICOPTER */}
                  <div className='col-md-4 mb-3'>
                    <label className='modal_label'>
                      Is the vessel operated under a Quality Management System?
                    </label>

                    <div className='form-check'>
                      {/* Checkbox for Quality Management System */}
                      <input
                        type='checkbox'
                        className='form-check-input'
                        id='qmsOperated'
                        checked={isOperatedUnderQMS}
                        onChange={(event) => setIsOperatedUnderQMS(event.target.checked)}
                      />
                      <label className='form-check-label' htmlFor='qmsOperated'>
                        Yes, operated under a QMS
                      </label>
                    </div>

                    {/* Conditional input for type of system */}
                    {isOperatedUnderQMS && (
                      <div className='mt-3'>
                        <label className='modal_label'>
                          What type of system? (ISO9001 or IMO Resolution A.741(18) as amended)
                        </label>
                        <input
                          type='text'
                          className='form-control'
                          value={qmsType}
                          onChange={(e) => setQmsType(e.target.value)}
                          placeholder='e.g., ISO9001 or IMO Resolution A.741(18)'
                        />
                      </div>
                    )}
                  </div>

                  <div className='mb-3 form-check'>
                    <input
                      type='checkbox'
                      className='form-check-input'
                      id='heliGuidelines'
                      checked={heliGuidelines}
                      onChange={(e) => setHeliGuidelines(e.target.checked)}
                    />
                    <label className='form-check-label' htmlFor='heliGuidelines'>
                      Comply with ICS Helicopter Guidelines
                    </label>
                  </div>

                  <div className='mb-3'>
                    <label className='modal_label'>Winching or Landing</label>
                    <select
                      className='form-control'
                      value={winchingOrLanding}
                      onChange={(e) => setWinchingOrLanding(e.target.value)}
                    >
                      <option value='Winching'>Winching</option>
                      <option value='Landing'>Landing</option>
                    </select>
                  </div>

                  {/* Circle Diameter */}
                  <div className='mb-3'>
                    <label className='modal_label'>Helicopter Circle Diameter (m)</label>
                    <input
                      type='text'
                      className='form-control'
                      value={helicopterCircleDiameter}
                      onChange={(e) => setHelicopterCircleDiameter(e.target.value)}
                      placeholder='e.g. 30'
                    />
                  </div>
                </div>
              )}
              {activeTab === 'step4' && (
                <div className='tab-pane fade show active' role='tabpanel'>
                  {/* Section title */}
                  {/* <h6 className='py-1'>COATING / ANODES</h6>
                  <br /> */}
                  {/* Header row */}
                  <div className='row mb-2'>
                    <div className='col-md-3  fw-bold'>Tank Coating</div>
                    <div className='col-md-3 text-center fw-bold'>Cargo Tanks</div>
                    <div className='col-md-3 text-center fw-bold'>Ballast Tanks</div>
                    <div className='col-md-3 text-center fw-bold'>Slop Tanks</div>
                  </div>
                  <hr></hr>
                  {/* Coated? row */}
                  <div className='row align-items-center mb-2'>
                    <div className='col-md-3 modal_label'>Coated?</div>
                    <div className='col-md-3 text-center'>
                      <input
                        type='checkbox'
                        className='form-check-input'
                        checked={cargoCoated}
                        onChange={(e) => setCargoCoated(e.target.checked)}
                      />
                    </div>
                    <div className='col-md-3 text-center'>
                      <input
                        type='checkbox'
                        className='form-check-input'
                        checked={ballastCoated}
                        onChange={(e) => setBallastCoated(e.target.checked)}
                      />
                    </div>
                    <div className='col-md-3 text-center'>
                      <input
                        type='checkbox'
                        className='form-check-input'
                        checked={slopCoated}
                        onChange={(e) => setSlopCoated(e.target.checked)}
                      />
                    </div>
                  </div>

                  {/* Type row */}
                  <div className='row align-items-center mb-2'>
                    <div className='col-md-3 modal_label'>Type</div>
                    <div className='col-md-3'>
                      <input
                        type='text'
                        className='form-control'
                        placeholder='e.g. Epoxy'
                        value={cargoType}
                        onChange={(e) => setCargoType(e.target.value)}
                      />
                    </div>
                    <div className='col-md-3'>
                      <input
                        type='text'
                        className='form-control'
                        placeholder='e.g. Epoxy'
                        value={ballastType}
                        onChange={(e) => setBallastType(e.target.value)}
                      />
                    </div>
                    <div className='col-md-3'>
                      <input
                        type='text'
                        className='form-control'
                        placeholder='e.g. Vinyl ester'
                        value={slopType}
                        onChange={(e) => setSlopType(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Extent row */}
                  <div className='row align-items-center mb-2'>
                    <div className='col-md-3 modal_label'>To What Extent</div>
                    <div className='col-md-3'>
                      <input
                        type='text'
                        className='form-control'
                        placeholder='e.g. Whole tank'
                        value={cargoExtent}
                        onChange={(e) => setCargoExtent(e.target.value)}
                      />
                    </div>
                    <div className='col-md-3'>
                      <input
                        type='text'
                        className='form-control'
                        placeholder='—'
                        value={ballastExtent}
                        onChange={(e) => setBallastExtent(e.target.value)}
                      />
                    </div>
                    <div className='col-md-3'>
                      <input
                        type='text'
                        className='form-control'
                        placeholder='e.g. 50% coverage'
                        value={slopExtent}
                        onChange={(e) => setSlopExtent(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Anodes? row */}
                  <div className='row align-items-center'>
                    <div className='col-md-3 modal_label'>Anodes?</div>
                    <div className='col-md-3 text-center'>
                      <input
                        type='checkbox'
                        className='form-check-input'
                        checked={cargoAnodes}
                        onChange={(e) => setCargoAnodes(e.target.checked)}
                      />
                    </div>
                    <div className='col-md-3 text-center'>
                      <input
                        type='checkbox'
                        className='form-check-input'
                        checked={ballastAnodes}
                        onChange={(e) => setBallastAnodes(e.target.checked)}
                      />
                    </div>
                    <div className='col-md-3 text-center'>
                      <input
                        type='checkbox'
                        className='form-check-input'
                        checked={slopAnodes}
                        onChange={(e) => setSlopAnodes(e.target.checked)}
                      />
                    </div>
                  </div>

                  {/* Overall “Anodes Fitted” */}
                  <div className='form-check mt-4'>
                    <input
                      type='checkbox'
                      className='form-check-input'
                      id='anodesFitted'
                      checked={anodesFitted}
                      onChange={(e) => setAnodesFitted(e.target.checked)}
                    />
                    <label className='form-check-label' htmlFor='anodesFitted'>
                      Anodes Fitted
                    </label>
                  </div>
                </div>
              )}
              {activeTab === 'step5' && (
                <div className='tab-pane fade show active' role='tabpanel'>
                  {/* <h6 className='py-1'>5. BALLAST HANDLING</h6> */}

                  {/* Header */}
                  <div className='row mb-2'>
                    <div className='col-md-3 fw-bold'>Item</div>
                    <div className='col-md-2 text-center fw-bold'>No.</div>
                    <div className='col-md-3 text-center fw-bold'>Type</div>
                    <div className='col-md-2 text-center fw-bold'>Capacity</div>
                    <div className='col-md-2 text-center fw-bold'>Head</div>
                  </div>
                  <hr />

                  {/* Ballast Pumps */}
                  <div className='row align-items-center mb-2'>
                    <div className='col-md-3 modal_label'>Ballast Pumps</div>
                    <div className='col-md-2'>
                      <input
                        type='number'
                        className='form-control'
                        value={pumpCount}
                        onChange={(e) => setPumpCount(+e.target.value)}
                      />
                    </div>
                    <div className='col-md-3'>
                      <input
                        type='text'
                        className='form-control'
                        value={pumpType}
                        onChange={(e) => setPumpType(e.target.value)}
                      />
                    </div>
                    <div className='col-md-2'>
                      <div className='input-group'>
                        <input
                          type='text'
                          className='form-control'
                          value={pumpCapacity}
                          onChange={(e) => setPumpCapacity(e.target.value)}
                        />
                        <span className='input-group-text'>m³/hr</span>
                      </div>
                    </div>
                    <div className='col-md-2'>
                      <div className='input-group'>
                        <input
                          type='text'
                          className='form-control'
                          value={pumpHead}
                          onChange={(e) => setPumpHead(e.target.value)}
                        />
                        <span className='input-group-text'>m</span>
                      </div>
                    </div>
                  </div>

                  {/* Ballast Eductors */}
                  <div className='row align-items-center mb-2'>
                    <div className='col-md-3 modal_label'>Ballast Eductors</div>
                    <div className='col-md-2'>
                      <input
                        type='number'
                        className='form-control'
                        value={eductorCount}
                        onChange={(e) => setEductorCount(+e.target.value)}
                      />
                    </div>
                    <div className='col-md-3'>
                      <input
                        type='text'
                        className='form-control'
                        value={eductorType}
                        onChange={(e) => setEductorType(e.target.value)}
                      />
                    </div>
                    <div className='col-md-2'>
                      <div className='input-group'>
                        <input
                          type='text'
                          className='form-control'
                          value={eductorCapacity}
                          onChange={(e) => setEductorCapacity(e.target.value)}
                        />
                        <span className='input-group-text'>m³/hr</span>
                      </div>
                    </div>
                    <div className='col-md-2'>
                      <div className='input-group'>
                        <input
                          type='text'
                          className='form-control'
                          value={eductorHead}
                          onChange={(e) => setEductorHead(e.target.value)}
                        />
                        <span className='input-group-text'>m</span>
                      </div>
                    </div>
                  </div>

                  {/* BWMS Section */}
                  <h6 className='py-1 mt-4'>BALLAST WATER MANAGEMENT SYSTEMS</h6>

                  {/* D1 / D2 */}
                  <div className='row align-items-center mb-2'>
                    <div className='col-md-6 modal_label'>
                      Does the vessel comply with D1 or D2 performance standards?
                    </div>
                    <div className='col-md-6'>
                      <div className='form-check form-check-inline'>
                        <input
                          type='radio'
                          id='perfD1'
                          name='performance'
                          className='form-check-input'
                          checked={d1Performance}
                          onChange={() => {
                            setD1Performance(true)
                            setD2Performance(false)
                          }}
                        />
                        <label htmlFor='perfD1' className='form-check-label'>
                          D1
                        </label>
                      </div>
                      <div className='form-check form-check-inline'>
                        <input
                          type='radio'
                          id='perfD2'
                          name='performance'
                          className='form-check-input'
                          checked={d2Performance}
                          onChange={() => {
                            setD2Performance(true)
                            setD1Performance(false)
                          }}
                        />
                        <label htmlFor='perfD2' className='form-check-label'>
                          D2
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* BWTS Fitted */}
                  <div className='row align-items-center mb-2'>
                    <div className='col-md-6 modal_label'>
                      Does the vessel have a Ballast Water Treatment System (BWTS) fitted?
                    </div>
                    <div className='col-md-6'>
                      <input
                        type='checkbox'
                        id='bwtsFitted'
                        className='form-check-input'
                        checked={bwtsFitted}
                        onChange={(e) => setBwtsFitted(e.target.checked)}
                      />
                    </div>
                  </div>

                  {bwtsFitted && (
                    <>
                      {/* BWTS Type */}
                      <div className='row align-items-center mb-2'>
                        <div className='col-md-6 modal_label'>
                          What type of BWTS fitted? If “other”, please specify:
                        </div>
                        <div className='col-md-6'>
                          <input
                            type='text'
                            className='form-control'
                            value={bwtsType}
                            onChange={(e) => setBwtsType(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Manufacturer */}
                      <div className='row align-items-center mb-2'>
                        <div className='col-md-6 modal_label'>Name of manufacturer of BWTS:</div>
                        <div className='col-md-6'>
                          <input
                            type='text'
                            className='form-control'
                            value={bwtsManufacturer}
                            onChange={(e) => setBwtsManufacturer(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* IMO Type Approval */}
                      <div className='row align-items-center mb-2'>
                        <div className='col-md-6 modal_label'>
                          Does the BWTS have IMO type approval?
                        </div>
                        <div className='col-md-6'>
                          <input
                            type='checkbox'
                            id='imoTypeApproval'
                            className='form-check-input'
                            checked={imoTypeApproval}
                            onChange={(e) => setImoTypeApproval(e.target.checked)}
                          />
                        </div>
                      </div>

                      {/* USCG Approval */}
                      <div className='row align-items-center mb-2'>
                        <div className='col-md-6 modal_label'>
                          Is the BWTS of a USCG approved type?
                        </div>
                        <div className='col-md-6'>
                          <input
                            type='checkbox'
                            id='uscgApproval'
                            className='form-check-input'
                            checked={uscgApproval}
                            onChange={(e) => setUscgApproval(e.target.checked)}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'step6' && (
                <div className='tab-pane fade show active' role='tabpanel'>
                  {/* Section title */}
                  <h6 className='mb-3'>Double Hull Vessels</h6>

                  {/* 8.1 centerline bulkhead */}
                  <div className='row align-items-center mb-3'>
                    <div className='col-md-6 modal_label'>
                      Is vessel fitted with centerline bulkhead in all cargo tanks?
                    </div>
                    <div className='col-md-6'>
                      <div className='form-check form-check-inline'>
                        <input
                          type='radio'
                          id='bulkheadNo'
                          name='bulkhead'
                          className='form-check-input'
                          checked={!centerlineBulkheadFitted}
                          onChange={() => {
                            setCenterlineBulkheadFitted(false)
                            setCenterlineBulkheadType('')
                          }}
                        />
                        <label htmlFor='bulkheadNo' className='form-check-label'>
                          No
                        </label>
                      </div>
                      <div className='form-check form-check-inline'>
                        <input
                          type='radio'
                          id='bulkheadSolid'
                          name='bulkhead'
                          className='form-check-input'
                          checked={centerlineBulkheadFitted && centerlineBulkheadType === 'Solid'}
                          onChange={() => {
                            setCenterlineBulkheadFitted(true)
                            setCenterlineBulkheadType('Solid')
                          }}
                        />
                        <label htmlFor='bulkheadSolid' className='form-check-label'>
                          Yes, Solid
                        </label>
                      </div>
                      <div className='form-check form-check-inline'>
                        <input
                          type='radio'
                          id='bulkheadPerforated'
                          name='bulkhead'
                          className='form-check-input'
                          checked={
                            centerlineBulkheadFitted && centerlineBulkheadType === 'Perforated'
                          }
                          onChange={() => {
                            setCenterlineBulkheadFitted(true)
                            setCenterlineBulkheadType('Perforated')
                          }}
                        />
                        <label htmlFor='bulkheadPerforated' className='form-check-label'>
                          Yes, Perforated
                        </label>
                      </div>
                    </div>
                  </div>
                  <h6 className='py-1 mt-4'>Tank Capacities</h6>
                  {/* Tank capacities table */}
                  <div className='table-responsive mb-4'>
                    <table className='table table-bordered text-center'>
                      <thead className='table-light'>
                        <tr>
                          <th>Tank</th>
                          <th>Capacity (98%)</th>
                          <th>Total Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Centre</td>
                          <td>
                            <div className='input-group'>
                              <input
                                type='text'
                                className='form-control'
                                value={cargoTankCentre98Capacity}
                                onChange={(e) => setCargoTankCentre98Capacity(e.target.value)}
                              />
                              <span className='input-group-text'>m³</span>
                            </div>
                          </td>
                          <td>
                            <input
                              type='number'
                              className='form-control'
                              value={cargoTankCentreTotalCount}
                              onChange={(e) => setCargoTankCentreTotalCount(+e.target.value)}
                            />
                          </td>
                        </tr>
                        <tr>
                          <td>Wing</td>
                          <td>
                            <div className='input-group'>
                              <input
                                type='text'
                                className='form-control'
                                value={cargoTankWing98Capacity}
                                onChange={(e) => setCargoTankWing98Capacity(e.target.value)}
                              />
                              <span className='input-group-text'>m³</span>
                            </div>
                          </td>
                          <td>
                            <input
                              type='number'
                              className='form-control'
                              value={cargoTankWingTotalCount}
                              onChange={(e) => setCargoTankWingTotalCount(+e.target.value)}
                            />
                          </td>
                        </tr>
                        <tr>
                          <td>Deck</td>
                          <td>
                            <div className='input-group'>
                              <input
                                type='text'
                                className='form-control'
                                value={deckTank98Capacity}
                                onChange={(e) => setDeckTank98Capacity(e.target.value)}
                              />
                              <span className='input-group-text'>m³</span>
                            </div>
                          </td>
                          <td>
                            <input
                              type='number'
                              className='form-control'
                              value={deckTankTotalCount}
                              onChange={(e) => setDeckTankTotalCount(+e.target.value)}
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* segregation */}
                  <div className='mb-3'>
                    <label className='modal_label'>
                      Capacity (98%) of each natural segregation with double valve (specify tanks)
                    </label>
                    <textarea
                      className='form-control'
                      rows={2}
                      value={segregationCapacities}
                      onChange={(e) => setSegregationCapacities(e.target.value)}
                      placeholder='e.g. 1) 1P,1S,4P,4S: 25513 m³; 2) 2P,2S,5P,5S: 28440 m³'
                    />
                  </div>

                  {/* IMO class */}
                  <div className='mb-3'>
                    <label className='modal_label'>
                      IMO class (Oil/Chemical Ship Type 1, 2 or 3)
                    </label>
                    <input
                      type='text'
                      className='form-control'
                      value={cargoContainmentType}
                      onChange={(e) => setCargoContainmentType(e.target.value)}
                    />
                  </div>

                  {/* slops */}
                  <div className='row mb-4'>
                    <div className='col-md-4'>
                      <label className='modal_label'>Slops tank capacity (98%)</label>
                      <div className='input-group'>
                        <input
                          type='text'
                          className='form-control'
                          value={slopsTank98Capacity}
                          onChange={(e) => setSlopsTank98Capacity(e.target.value)}
                        />
                        <span className='input-group-text'>m³</span>
                      </div>
                    </div>
                    <div className='col-md-4'>
                      <label className='modal_label'>Slops tank capacity (95%)</label>
                      <div className='input-group'>
                        <input
                          type='text'
                          className='form-control'
                          value={slopsTank95Capacity}
                          onChange={(e) => setSlopsTank95Capacity(e.target.value)}
                        />
                        <span className='input-group-text'>m³</span>
                      </div>
                    </div>
                    <div className='col-md-4'>
                      <label className='modal_label'>Total slop tanks</label>
                      <input
                        type='number'
                        className='form-control'
                        value={slopsTankTotalCount}
                        onChange={(e) => setSlopsTankTotalCount(+e.target.value)}
                      />
                    </div>
                  </div>

                  {/* grades/products */}
                  <div className='row mb-4'>
                    <div className='col-md-6'>
                      <label className='modal_label'>
                        How many grades/products can vessel load/discharge with double valve
                        segregation
                      </label>
                      <input
                        type='number'
                        className='form-control'
                        value={gradesSegregationCount}
                        onChange={(e) => setGradesSegregationCount(+e.target.value)}
                      />
                    </div>
                  </div>

                  {/* filling restrictions */}
                  <div className='mb-3 form-check'>
                    <input
                      type='checkbox'
                      className='form-check-input'
                      id='fillingRestrictions'
                      checked={fillingRestrictions}
                      onChange={(e) => setFillingRestrictions(e.target.checked)}
                    />
                    <label className='form-check-label' htmlFor='fillingRestrictions'>
                      Any cargo tank filling restrictions?
                    </label>
                  </div>
                  {fillingRestrictions && (
                    <div className='mb-4'>
                      <textarea
                        className='form-control'
                        rows={2}
                        value={fillingRestrictionDetails}
                        onChange={(e) => setFillingRestrictionDetails(e.target.value)}
                        placeholder='e.g. 98%, max DSG 1.025, loading manual limits…'
                      />
                    </div>
                  )}

                  {/* max loading table */}
                  <div className='table-responsive mb-4'>
                    <table className='table table-bordered text-center'>
                      <thead className='table-light'>
                        <tr>
                          <th>Max loading rate for homogenous cargo</th>
                          <th>Per manifold (m³/hr)</th>
                          <th>Simultaneously (m³/hr)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>With VECS</td>
                          <td>
                            <input
                              type='text'
                              className='form-control'
                              value={loadedPerManifoldWith}
                              onChange={(e) => setLoadedPerManifoldWith(e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type='text'
                              className='form-control'
                              value={loadedSimultaneouslyWith}
                              onChange={(e) => setLoadedSimultaneouslyWith(e.target.value)}
                            />
                          </td>
                        </tr>
                        <tr>
                          <td>Without VECS</td>
                          <td>
                            <input
                              type='text'
                              className='form-control'
                              value={loadedPerManifoldWithout}
                              onChange={(e) => setLoadedPerManifoldWithout(e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type='text'
                              className='form-control'
                              value={loadedSimultaneouslyWithout}
                              onChange={(e) => setLoadedSimultaneouslyWithout(e.target.value)}
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* CCR */}
                  <div className='row mb-4'>
                    <div className='col-md-6 form-check'>
                      <input
                        type='checkbox'
                        className='form-check-input'
                        id='cargoControlRoom'
                        checked={cargoControlRoomFitted}
                        onChange={(e) => setCargoControlRoomFitted(e.target.checked)}
                      />
                      <label className='form-check-label' htmlFor='cargoControlRoom'>
                        Ship fitted with Cargo Control Room (CCR)?
                      </label>
                    </div>
                    <div className='col-md-6 form-check'>
                      <input
                        type='checkbox'
                        className='form-check-input'
                        id='ullageReadable'
                        checked={ullageReadableFromCcr}
                        onChange={(e) => setUllageReadableFromCcr(e.target.checked)}
                      />
                      <label className='form-check-label' htmlFor='ullageReadable'>
                        Tank ullage/innage readable from CCR?
                      </label>
                    </div>
                  </div>

                  {/* gauging & overflow */}
                  <div className='row mb-3'>
                    <div className='col-md-4 form-check'>
                      <input
                        type='checkbox'
                        className='form-check-input'
                        id='gaugingCertified'
                        checked={gaugingCertified}
                        onChange={(e) => setGaugingCertified(e.target.checked)}
                      />
                      <label className='form-check-label' htmlFor='gaugingCertified'>
                        Gauging system certified & calibrated?
                      </label>
                    </div>
                    {!gaugingCertified && (
                      <div className='col-md-8'>
                        <input
                          type='text'
                          className='form-control'
                          value={gaugingNotCalibratedDetails}
                          onChange={(e) => setGaugingNotCalibratedDetails(e.target.value)}
                          placeholder='Which ones not calibrated?'
                        />
                      </div>
                    )}
                  </div>
                  <div className='row mb-4'>
                    <div className='col-md-6'>
                      <label className='modal_label'>Gauging system type (IBC 13.1)</label>
                      <select
                        className='form-control'
                        value={gaugingSystemType}
                        onChange={(e) => setGaugingSystemType(e.target.value)}
                      >
                        <option value=''>Select…</option>
                        <option value='Open'>Open</option>
                        <option value='Restricted'>Restricted</option>
                        <option value='Closed'>Closed</option>
                      </select>
                    </div>
                    <div className='col-md-6 form-check'>
                      <input
                        type='checkbox'
                        className='form-check-input'
                        id='overflowControl'
                        checked={overflowControlFitted}
                        onChange={(e) => setOverflowControlFitted(e.target.checked)}
                      />
                      <label className='form-check-label' htmlFor='overflowControl'>
                        Tank overflow control system fitted?
                      </label>
                      {overflowControlFitted && (
                        <div className='form-check ms-4 mt-2'>
                          <input
                            type='checkbox'
                            className='form-check-input'
                            id='overflowAuto'
                            checked={overflowAutomaticClosing}
                            onChange={(e) => setOverflowAutomaticClosing(e.target.checked)}
                          />
                          <label className='form-check-label' htmlFor='overflowAuto'>
                            Includes automatic closing of valves
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* multipoint gauging */}
                  <div className='mb-3 form-check'>
                    <input
                      type='checkbox'
                      className='form-check-input'
                      id='multipointGauging'
                      checked={multipointGaugingFitted}
                      onChange={(e) => setMultipointGaugingFitted(e.target.checked)}
                    />
                    <label className='form-check-label' htmlFor='multipointGauging'>
                      Cargo tanks fitted with multipoint gauging?
                    </label>
                  </div>
                  {multipointGaugingFitted && (
                    <div className='row mb-4'>
                      <div className='col-md-6'>
                        <label className='modal_label'>Type & locations</label>
                        <input
                          type='text'
                          className='form-control'
                          value={multipointGaugingType}
                          onChange={(e) => setMultipointGaugingType(e.target.value)}
                        />
                      </div>
                      <div className='col-md-6'>
                        <label className='modal_label'>Portable gauging units on board</label>
                        <input
                          type='number'
                          className='form-control'
                          value={portableGaugingUnitsCount}
                          onChange={(e) => setPortableGaugingUnitsCount(+e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {/* VRS/VECS */}
                  <div className='mb-3 form-check'>
                    <input
                      type='checkbox'
                      className='form-check-input'
                      id='vrsFitted'
                      checked={vrsFitted}
                      onChange={(e) => setVrsFitted(e.target.checked)}
                    />
                    <label className='form-check-label' htmlFor='vrsFitted'>
                      Vapour return system (VRS) fitted?
                    </label>
                  </div>
                  {vrsFitted && (
                    <>
                      <div className='row mb-3'>
                        <div className='col-md-4 form-check'>
                          <input
                            type='checkbox'
                            className='form-check-input'
                            id='vrsOcimf'
                            checked={vrsOcimfCompliant}
                            onChange={(e) => setVrsOcimfCompliant(e.target.checked)}
                          />
                          <label className='form-check-label' htmlFor='vrsOcimf'>
                            OCIMF‑compliant
                          </label>
                        </div>
                        <div className='col-md-4'>
                          <label className='modal_label'>Simultaneous segregation count</label>
                          <input
                            type='number'
                            className='form-control'
                            value={vrsSegregationCount}
                            onChange={(e) => setVrsSegregationCount(+e.target.value)}
                          />
                        </div>
                      </div>
                      <div className='row mb-4'>
                        <div className='col-md-6 form-check'>
                          <input
                            type='checkbox'
                            className='form-check-input'
                            id='vecCert'
                            checked={vecCertificationFitted}
                            onChange={(e) => setVecCertificationFitted(e.target.checked)}
                          />
                          <label className='form-check-label' htmlFor='vecCert'>
                            VEC Certification fitted?
                          </label>
                        </div>
                        {vecCertificationFitted && (
                          <div className='col-md-6'>
                            <label className='modal_label'>Issuing authority</label>
                            <input
                              type='text'
                              className='form-control'
                              value={vecCertificationIssuingAuthority}
                              onChange={(e) => setVecCertificationIssuingAuthority(e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                      <div className='row mb-4'>
                        <div className='col-md-6'>
                          <label className='modal_label'>VECS manifolds per side</label>
                          <input
                            type='number'
                            className='form-control'
                            value={vecsManifoldCount}
                            onChange={(e) => setVecsManifoldCount(+e.target.value)}
                          />
                        </div>
                        <div className='col-md-6'>
                          <label className='modal_label'>Specs</label>
                          <input
                            type='text'
                            className='form-control'
                            value={vecsManifoldSpecs}
                            onChange={(e) => setVecsManifoldSpecs(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className='row mb-4'>
                        <div className='col-md-6'>
                          <label className='modal_label'>VECS reducers count</label>
                          <input
                            type='number'
                            className='form-control'
                            value={vecsReducerCount}
                            onChange={(e) => setVecsReducerCount(+e.target.value)}
                          />
                        </div>
                        <div className='col-md-6'>
                          <label className='modal_label'>Specs</label>
                          <input
                            type='text'
                            className='form-control'
                            value={vecsReducerSpecs}
                            onChange={(e) => setVecsReducerSpecs(e.target.value)}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Venting */}
                  <div className='mb-4'>
                    <label className='modal_label'>Venting system fitted</label>
                    <input
                      type='text'
                      className='form-control'
                      value={ventingSystemType}
                      onChange={(e) => setVentingSystemType(e.target.value)}
                    />
                  </div>

                  {/* Manifolds & reducers */}
                  <div className='row mb-4'>
                    <div className='col-md-4'>
                      <label className='modal_label'>Manifold connections per side</label>
                      <input
                        type='number'
                        className='form-control'
                        value={manifoldCountPerSide}
                        onChange={(e) => setManifoldCountPerSide(+e.target.value)}
                      />
                    </div>
                    <div className='col-md-4'>
                      <label className='modal_label'>Size</label>
                      <div className='input-group'>
                        <input
                          type='text'
                          className='form-control'
                          value={manifoldSize}
                          onChange={(e) => setManifoldSize(e.target.value)}
                        />
                        <span className='input-group-text'>mm</span>
                      </div>
                    </div>
                    <div className='col-md-4 form-check'>
                      <input
                        type='checkbox'
                        className='form-check-input'
                        id='fixedCommonLine'
                        checked={fixedCommonLine}
                        onChange={(e) => setFixedCommonLine(e.target.checked)}
                      />
                      <label className='form-check-label' htmlFor='fixedCommonLine'>
                        Fitted with fixed common line?
                      </label>
                    </div>
                  </div>
                  {fixedCommonLine && (
                    <div className='row mb-4'>
                      <div className='col-md-6'>
                        <label className='modal_label'>Common line connections per side</label>
                        <input
                          type='number'
                          className='form-control'
                          value={commonLineCountPerSide}
                          onChange={(e) => setCommonLineCountPerSide(+e.target.value)}
                        />
                      </div>
                      <div className='col-md-6'>
                        <label className='modal_label'>Size</label>
                        <div className='input-group'>
                          <input
                            type='text'
                            className='form-control'
                            value={commonLineSize}
                            onChange={(e) => setCommonLineSize(e.target.value)}
                          />
                          <span className='input-group-text'>mm</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* distances & valves */}
                  <div className='row mb-4'>
                    <div className='col-md-6'>
                      <label className='modal_label'>Valve type at manifold</label>
                      <input
                        type='text'
                        className='form-control'
                        value={manifoldValveType}
                        onChange={(e) => setManifoldValveType(e.target.value)}
                      />
                    </div>
                    <div className='col-md-6'>
                      <label className='modal_label'>Material/rating</label>
                      <input
                        type='text'
                        className='form-control'
                        value={manifoldMaterialRating}
                        onChange={(e) => setManifoldMaterialRating(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className='row mb-4'>
                    {[
                      {
                        label: 'Between cargo manifold centres',
                        state: distanceBetweenCargoManifoldCenters,
                        setter: setDistanceBetweenCargoManifoldCenters,
                      },
                      {
                        label: 'Ship rail to manifold',
                        state: distanceShipRailToManifold,
                        setter: setDistanceShipRailToManifold,
                      },
                      {
                        label: 'Manifold to ship side',
                        state: distanceManifoldToShipSide,
                        setter: setDistanceManifoldToShipSide,
                      },
                      {
                        label: 'Top of rail to centre of manifold',
                        state: topOfRailToCenterOfManifold,
                        setter: setTopOfRailToCenterOfManifold,
                      },
                      {
                        label: 'Main deck to centre of manifold',
                        state: distanceMainDeckToCenterOfManifold,
                        setter: setDistanceMainDeckToCenterOfManifold,
                      },
                      {
                        label: 'Spill tank grating to centre of manifold',
                        state: distanceSpillTankGratingToCenterOfManifold,
                        setter: setDistanceSpillTankGratingToCenterOfManifold,
                      },
                    ].map((fld, idx) => (
                      <div className='col-md-4 mb-3' key={idx}>
                        <label className='modal_label'>{fld.label}</label>
                        <div className='input-group'>
                          <input
                            type='text'
                            className='form-control'
                            value={fld.state}
                            onChange={(e) => fld.setter(e.target.value)}
                          />
                          <span className='input-group-text'>mm</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* manifold heights & reducers */}
                  <div className='row mb-4'>
                    <div className='col-md-6'>
                      <label className='modal_label'>
                        Manifold height above WL (normal ballast)
                      </label>
                      <div className='input-group'>
                        <input
                          type='text'
                          className='form-control'
                          value={manifoldHeightNormalBallast}
                          onChange={(e) => setManifoldHeightNormalBallast(e.target.value)}
                        />
                        <span className='input-group-text'>m</span>
                      </div>
                    </div>
                    <div className='col-md-6'>
                      <label className='modal_label'>
                        Manifold height above WL (SDWT condition)
                      </label>
                      <div className='input-group'>
                        <input
                          type='text'
                          className='form-control'
                          value={manifoldHeightSdwtCondition}
                          onChange={(e) => setManifoldHeightSdwtCondition(e.target.value)}
                        />
                        <span className='input-group-text'>m</span>
                      </div>
                    </div>
                  </div>
                  <div className='mb-4'>
                    <label className='modal_label'>Reducers (number/size/type)</label>
                    <textarea
                      className='form-control'
                      rows={2}
                      value={reducerDetails}
                      onChange={(e) => setReducerDetails(e.target.value)}
                      placeholder='e.g. 4 × 406/203mm…'
                    />
                  </div>

                  {/* stern manifold */}
                  <div className='mb-4 form-check'>
                    <input
                      type='checkbox'
                      className='form-check-input'
                      id='sternManifold'
                      checked={sternManifoldFitted}
                      onChange={(e) => setSternManifoldFitted(e.target.checked)}
                    />
                    <label className='form-check-label' htmlFor='sternManifold'>
                      Stern manifold fitted?
                    </label>
                  </div>
                  {sternManifoldFitted && (
                    <div className='mb-4'>
                      <label className='modal_label'>Size</label>
                      <div className='input-group'>
                        <input
                          type='text'
                          className='form-control'
                          value={sternManifoldSize}
                          onChange={(e) => setSternManifoldSize(e.target.value)}
                        />
                        <span className='input-group-text'>mm</span>
                      </div>
                    </div>
                  )}

                  {/* heating coils table */}
                  <div className='table-responsive mb-4'>
                    <table className='table table-bordered text-center'>
                      <thead className='table-light'>
                        <tr>
                          <th>Cargo / slop tanks fitted with a cargo heating</th>
                          <th>Type</th>
                          <th>Coiled?</th>
                          <th>Material</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Cargo tanks</td>
                          <td>
                            <input
                              type='text'
                              className='form-control'
                              value={cargoHeatingType}
                              onChange={(e) => setCargoHeatingType(e.target.value)}
                            />
                          </td>
                          <td className='text-center'>
                            <input
                              type='checkbox'
                              className='form-check-input'
                              checked={cargoHeatingCoiled}
                              onChange={(e) => setCargoHeatingCoiled(e.target.checked)}
                            />
                          </td>
                          <td>
                            <input
                              type='text'
                              className='form-control'
                              value={cargoHeatingMaterial}
                              onChange={(e) => setCargoHeatingMaterial(e.target.value)}
                            />
                          </td>
                        </tr>
                        <tr>
                          <td>Slop tanks</td>
                          <td>
                            <input
                              type='text'
                              className='form-control'
                              value={slopHeatingType}
                              onChange={(e) => setSlopHeatingType(e.target.value)}
                            />
                          </td>
                          <td className='text-center'>
                            <input
                              type='checkbox'
                              className='form-check-input'
                              checked={slopHeatingCoiled}
                              onChange={(e) => setSlopHeatingCoiled(e.target.checked)}
                            />
                          </td>
                          <td>
                            <input
                              type='text'
                              className='form-control'
                              value={slopHeatingMaterial}
                              onChange={(e) => setSlopHeatingMaterial(e.target.value)}
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* thermal oil */}
                  <div className='mb-3 form-check'>
                    <input
                      type='checkbox'
                      className='form-check-input'
                      id='thermalOil'
                      checked={thermalOilHeatingFitted}
                      onChange={(e) => setThermalOilHeatingFitted(e.target.checked)}
                    />
                    <label className='form-check-label' htmlFor='thermalOil'>
                      Thermal oil heating system fitted?
                    </label>
                  </div>
                  {thermalOilHeatingFitted && (
                    <div className='mb-4'>
                      <label className='modal_label'>Identify tanks</label>
                      <input
                        type='text'
                        className='form-control'
                        value={thermalOilSystemTanks}
                        onChange={(e) => setThermalOilSystemTanks(e.target.value)}
                      />
                    </div>
                  )}

                  {/* temperature limits */}
                  <div className='row mb-4'>
                    <div className='col-md-6'>
                      <label className='modal_label'>Max cargo temp</label>
                      <div className='input-group'>
                        <input
                          type='text'
                          className='form-control'
                          value={maxCargoTemperature}
                          onChange={(e) => setMaxCargoTemperature(e.target.value)}
                        />
                        <span className='input-group-text'>°C / °F</span>
                      </div>
                    </div>
                    <div className='col-md-6'>
                      <label className='modal_label'>Min cargo temp</label>
                      <div className='input-group'>
                        <input
                          type='text'
                          className='form-control'
                          value={minCargoTemperature}
                          onChange={(e) => setMinCargoTemperature(e.target.value)}
                        />
                        <span className='input-group-text'>°C / °F</span>
                      </div>
                    </div>
                  </div>

                  {/* cargo pumping systems */}
                  <div className='table-responsive mb-4'>
                    <table className='table table-bordered text-center'>
                      <thead className='table-light'>
                        <tr>
                          <th>Item</th>
                          <th>No.</th>
                          <th>Type</th>
                          <th>Capacity</th>
                          <th>Head</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Cargo Pumps</td>
                          <td>
                            <input
                              type='number'
                              className='form-control'
                              value={cargoPumpCount}
                              onChange={(e) => setCargoPumpCount(+e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type='text'
                              className='form-control'
                              value={cargoPumpType}
                              onChange={(e) => setCargoPumpType(e.target.value)}
                            />
                          </td>
                          <td>
                            <div className='input-group'>
                              <input
                                type='text'
                                className='form-control'
                                value={cargoPumpCapacity}
                                onChange={(e) => setCargoPumpCapacity(e.target.value)}
                              />
                              <span className='input-group-text'>m³/hr</span>
                            </div>
                          </td>
                          <td>
                            <div className='input-group'>
                              <input
                                type='text'
                                className='form-control'
                                value={cargoPumpHead}
                                onChange={(e) => setCargoPumpHead(e.target.value)}
                              />
                              <span className='input-group-text'>m</span>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td>Cargo Eductors</td>
                          <td>
                            <input
                              type='number'
                              className='form-control'
                              value={cargoEductorCount}
                              onChange={(e) => setCargoEductorCount(+e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type='text'
                              className='form-control'
                              value={cargoEductorType}
                              onChange={(e) => setCargoEductorType(e.target.value)}
                            />
                          </td>
                          <td>
                            <div className='input-group'>
                              <input
                                type='text'
                                className='form-control'
                                value={cargoEductorCapacity}
                                onChange={(e) => setCargoEductorCapacity(e.target.value)}
                              />
                              <span className='input-group-text'>m³/hr</span>
                            </div>
                          </td>
                          <td>
                            <div className='input-group'>
                              <input
                                type='text'
                                className='form-control'
                                value={cargoEductorHead}
                                onChange={(e) => setCargoEductorHead(e.target.value)}
                              />
                              <span className='input-group-text'>m</span>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td>Stripping Pump</td>
                          <td>
                            <input
                              type='number'
                              className='form-control'
                              value={strippingPumpCount}
                              onChange={(e) => setStrippingPumpCount(+e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type='text'
                              className='form-control'
                              value={strippingPumpType}
                              onChange={(e) => setStrippingPumpType(e.target.value)}
                            />
                          </td>
                          <td>
                            <div className='input-group'>
                              <input
                                type='text'
                                className='form-control'
                                value={strippingPumpCapacity}
                                onChange={(e) => setStrippingPumpCapacity(e.target.value)}
                              />
                              <span className='input-group-text'>m³/hr</span>
                            </div>
                          </td>
                          <td>
                            <div className='input-group'>
                              <input
                                type='text'
                                className='form-control'
                                value={strippingPumpHead}
                                onChange={(e) => setStrippingPumpHead(e.target.value)}
                              />
                              <span className='input-group-text'>m</span>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className='mb-4 form-check'>
                    <input
                      type='checkbox'
                      className='form-check-input'
                      id='emergencyPortablePump'
                      checked={emergencyPortablePumpProvided}
                      onChange={(e) => setEmergencyPortablePumpProvided(e.target.checked)}
                    />
                    <label className='form-check-label' htmlFor='emergencyPortablePump'>
                      At least one emergency portable cargo pump provided?
                    </label>
                  </div>

                  {/* tank cleaning */}
                  <div className='mb-3 form-check'>
                    <input
                      type='checkbox'
                      className='form-check-input'
                      id='fixedCleaning'
                      checked={cleaningEquipmentFixedInCargoTanks}
                      onChange={(e) => setCleaningEquipmentFixedInCargoTanks(e.target.checked)}
                    />
                    <label className='form-check-label' htmlFor='fixedCleaning'>
                      Tank cleaning equipment fixed in cargo tanks?
                    </label>
                  </div>
                  <div className='mb-3 form-check'>
                    <input
                      type='checkbox'
                      className='form-check-input'
                      id='portableCleaning'
                      checked={portableCleaningProvided}
                      onChange={(e) => setPortableCleaningProvided(e.target.checked)}
                    />
                    <label className='form-check-label' htmlFor='portableCleaning'>
                      Portable tank cleaning equipment provided?
                    </label>
                  </div>
                  <div className='row mb-4'>
                    <div className='col-md-6'>
                      <label className='modal_label'>Tank washing pump capacity</label>
                      <div className='input-group'>
                        <input
                          type='text'
                          className='form-control'
                          value={tankWashingPumpCapacity}
                          onChange={(e) => setTankWashingPumpCapacity(e.target.value)}
                        />
                        <span className='input-group-text'>m³/hr</span>
                      </div>
                    </div>
                    <div className='col-md-6 form-check'>
                      <input
                        type='checkbox'
                        className='form-check-input'
                        id='washingHeater'
                        checked={washingWaterHeaterFitted}
                        onChange={(e) => setWashingWaterHeaterFitted(e.target.checked)}
                      />
                      <label className='form-check-label' htmlFor='washingHeater'>
                        Washing water heater fitted?
                      </label>
                      {washingWaterHeaterFitted && (
                        <div className='mt-2'>
                          <div className='input-group'>
                            <input
                              type='text'
                              className='form-control'
                              value={maxWashingWaterTemperature}
                              onChange={(e) => setMaxWashingWaterTemperature(e.target.value)}
                            />
                            <span className='input-group-text'>°C</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className='mb-4'>
                    <label className='modal_label'>
                      Max number of washing machines operable at designed pressure
                    </label>
                    <input
                      type='number'
                      className='form-control'
                      value={washingMachinesCount}
                      onChange={(e) => setWashingMachinesCount(+e.target.value)}
                    />
                  </div>

                  {/* remote / pressure / drier / cooling / steam */}
                  <div className='row mb-3'>
                    <div className='col-md-6 form-check'>
                      <input
                        type='checkbox'
                        className='form-check-input'
                        id='remoteTemp'
                        checked={remoteTempMonitoringFitted}
                        onChange={(e) => setRemoteTempMonitoringFitted(e.target.checked)}
                      />
                      <label className='form-check-label' htmlFor='remoteTemp'>
                        Remote cargo tank temperature monitoring fitted?
                      </label>
                      {remoteTempMonitoringFitted && (
                        <div className='form-check ms-4 mt-2'>
                          <input
                            type='checkbox'
                            className='form-check-input'
                            checked={remoteTempMonitoringOperational}
                            onChange={(e) => setRemoteTempMonitoringOperational(e.target.checked)}
                          />
                          <label className='form-check-label'>Operational</label>
                        </div>
                      )}
                    </div>
                    <div className='col-md-6 form-check'>
                      <input
                        type='checkbox'
                        className='form-check-input'
                        id='remotePressure'
                        checked={remotePressureMonitoringFitted}
                        onChange={(e) => setRemotePressureMonitoringFitted(e.target.checked)}
                      />
                      <label className='form-check-label' htmlFor='remotePressure'>
                        Remote cargo tank pressure monitoring fitted?
                      </label>
                      {remotePressureMonitoringFitted && (
                        <div className='form-check ms-4 mt-2'>
                          <input
                            type='checkbox'
                            className='form-check-input'
                            checked={remotePressureMonitoringOperational}
                            onChange={(e) =>
                              setRemotePressureMonitoringOperational(e.target.checked)
                            }
                          />
                          <label className='form-check-label'>Operational</label>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className='row mb-4'>
                    <div className='col-md-6 form-check'>
                      <input
                        type='checkbox'
                        className='form-check-input'
                        id='cargoDrier'
                        checked={cargoTankDrierFitted}
                        onChange={(e) => setCargoTankDrierFitted(e.target.checked)}
                      />
                      <label className='form-check-label' htmlFor='cargoDrier'>
                        Cargo tank drier fitted?
                      </label>
                      {cargoTankDrierFitted && (
                        <div className='mt-2'>
                          <div className='form-check'>
                            <input
                              type='checkbox'
                              className='form-check-input'
                              checked={cargoTankDrierOperational}
                              onChange={(e) => setCargoTankDrierOperational(e.target.checked)}
                            />
                            <label className='form-check-label'>Operational</label>
                          </div>
                          <div className='input-group mt-2'>
                            <input
                              type='text'
                              className='form-control'
                              value={cargoTankDrierCapacity}
                              onChange={(e) => setCargoTankDrierCapacity(e.target.value)}
                            />
                            <span className='input-group-text'>m³/hr</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className='col-md-6 form-check'>
                      <input
                        type='checkbox'
                        className='form-check-input'
                        id='cargoCooling'
                        checked={cargoCoolingSystemFitted}
                        onChange={(e) => setCargoCoolingSystemFitted(e.target.checked)}
                      />
                      <label className='form-check-label' htmlFor='cargoCooling'>
                        Cargo cooling system fitted?
                      </label>
                      {cargoCoolingSystemFitted && (
                        <div className='mt-2'>
                          <input
                            type='text'
                            className='form-control'
                            value={cargoCoolingSystemDetails}
                            onChange={(e) => setCargoCoolingSystemDetails(e.target.value)}
                            placeholder='Details / tanks applicable'
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className='mb-4 form-check'>
                    <input
                      type='checkbox'
                      className='form-check-input'
                      id='steamOnDeck'
                      checked={steamAvailableOnDeck}
                      onChange={(e) => setSteamAvailableOnDeck(e.target.checked)}
                    />
                    <label className='form-check-label' htmlFor='steamOnDeck'>
                      Steam available on deck?
                    </label>
                  </div>
                </div>
              )}
              {activeTab === 'step7' && (
                <div className='tab-pane fade show active' role='tabpanel'>
                  <h6 className='mb-3'>1. Mooring Wires</h6>
                  <table className='table table-bordered'>
                    <thead>
                      <tr>
                        <th>Location</th>
                        <th>No.</th>
                        <th>Diameter (mm)</th>
                        <th>Material</th>
                        <th>Length (m)</th>
                        <th>Breaking Strength (t)</th>
                      </tr>
                    </thead>
                    <tbody>
    {wireRows.map(r => (
      <tr key={r.location}>
        <td>{r.location}</td>
        <td>
          <input
            type='number'
            className='form-control'
            value={r.count}
            onChange={e => r.setCount(e.target.value === '' ? '' : +e.target.value)}
          />
        </td>
        <td>
          <input
            type='text'
            className='form-control'
            value={r.diameter}
            onChange={e => r.setDiameter(e.target.value)}
          />
        </td>
        <td>
          <input
            type='text'
            className='form-control'
            value={r.material}
            onChange={e => r.setMaterial(e.target.value)}
          />
        </td>
        <td>
          <input
            type='text'
            className='form-control'
            value={r.length}
            onChange={e => r.setLength(e.target.value)}
          />
        </td>
        <td>
          <input
            type='text'
            className='form-control'
            value={r.strength}
            onChange={e => r.setStrength(e.target.value)}
          />
        </td>
      </tr>
    ))}
  </tbody>
                  </table>

                  <h6 className='mt-4 mb-3'>2. Poop-Deck Winches</h6>
                  <table className='table table-bordered'>
                    <thead>
                      <tr>
                        <th>No.</th>
                        <th>Diameter (mm)</th>
                        <th>Material</th>
                        <th>Length (m)</th>
                        <th>Brkg Strength (t)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <input
                            type='number'
                            className='form-control'
                            value={winchesPoopDeckCount}
                            onChange={(e) => setWinchesPoopDeckCount(+e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type='text'
                            className='form-control'
                            value={winchesPoopDeckDiameter}
                            onChange={(e) => setWinchesPoopDeckDiameter(e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type='text'
                            className='form-control'
                            value={winchesPoopDeckMaterial}
                            onChange={(e) => setWinchesPoopDeckMaterial(e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type='text'
                            className='form-control'
                            value={winchesPoopDeckLength}
                            onChange={(e) => setWinchesPoopDeckLength(e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type='text'
                            className='form-control'
                            value={winchesPoopDeckBrakingStrength}
                            onChange={(e) => setWinchesPoopDeckBrakingStrength(e.target.value)}
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <h6 className='mt-4 mb-3'>3. Bollards & Bitts</h6>
                  <textarea
                    className='form-control mb-4'
                    rows={2}
                    placeholder='e.g. Bollards (64T)=24 …'
                    value={bollardsBittsDetails}
                    onChange={(e) => setBollardsBittsDetails(e.target.value)}
                  />

                  <h6 className='mt-4 mb-3'>4. Fairleads & Chocks</h6>
                  <textarea
                    className='form-control mb-4'
                    rows={2}
                    placeholder='e.g. Roller fairleads…'
                    value={fairleadsChocksDetails}
                    onChange={(e) => setFairleadsChocksDetails(e.target.value)}
                  />

                  <h6 className='mt-4 mb-3'>5. Shackles</h6>
                  <div className='row mb-4'>
                    <div className='col-md-6'>
                      <label>Port shackles (No.)</label>
                      <input
                        type='number'
                        className='form-control'
                        value={shacklesPortCount}
                        onChange={(e) => setShacklesPortCount(+e.target.value)}
                      />
                    </div>
                    <div className='col-md-6'>
                      <label>Starboard shackles (No.)</label>
                      <input
                        type='number'
                        className='form-control'
                        value={shacklesStarboardCount}
                        onChange={(e) => setShacklesStarboardCount(+e.target.value)}
                      />
                    </div>
                  </div>

                  <h6 className='mt-4 mb-3'>6. Emergency Towing</h6>
                  <div className='row mb-3'>
                    <div className='col-md-6'>
                      <label>Forward: Type</label>
                      <input
                        type='text'
                        className='form-control'
                        value={emergencyTowingForwardType}
                        onChange={(e) => setEmergencyTowingForwardType(e.target.value)}
                      />
                    </div>
                    <div className='col-md-6'>
                      <label>Forward: SWL (t)</label>
                      <input
                        type='text'
                        className='form-control'
                        value={emergencyTowingForwardSwl}
                        onChange={(e) => setEmergencyTowingForwardSwl(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className='row mb-4'>
                    <div className='col-md-6'>
                      <label>Aft: Type</label>
                      <input
                        type='text'
                        className='form-control'
                        value={emergencyTowingAftType}
                        onChange={(e) => setEmergencyTowingAftType(e.target.value)}
                      />
                    </div>
                    <div className='col-md-6'>
                      <label>Aft: SWL (t)</label>
                      <input
                        type='text'
                        className='form-control'
                        value={emergencyTowingAftSwl}
                        onChange={(e) => setEmergencyTowingAftSwl(e.target.value)}
                      />
                    </div>
                  </div>

                  <h6 className='mt-4 mb-3'>7. Stern Chock & Escort Tug</h6>
                  <div className='row mb-2'>
                    <div className='col-md-6'>
                      <label>Closed chock/fairlead size (stern)</label>
                      <input
                        type='text'
                        className='form-control'
                        value={sternChockFairleadSize}
                        onChange={(e) => setSternChockFairleadSize(e.target.value)}
                      />
                    </div>
                    <div className='col-md-6'>
                      <label>Escort Tug chock/fairlead SWL (t)</label>
                      <input
                        type='text'
                        className='form-control'
                        value={escortTugChockFairleadSwl}
                        onChange={(e) => setEscortTugChockFairleadSwl(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className='mb-4'>
                    <label>Poop deck bollard SWL (t)</label>
                    <input
                      type='text'
                      className='form-control'
                      value={poopDeckBollardSwl}
                      onChange={(e) => setPoopDeckBollardSwl(e.target.value)}
                    />
                  </div>

                  <h6 className='mt-4 mb-3'>8. Lifting Equipment / Gangway</h6>
                  <textarea
                    className='form-control mb-3'
                    rows={2}
                    placeholder='Crane description…'
                    value={craneDetails}
                    onChange={(e) => setCraneDetails(e.target.value)}
                  />
                  <div className='row mb-3'>
                    <div className='col-md-6'>
                      <label>Accommodation ladder direction</label>
                      <select
                        className='form-control'
                        value={accommodationLadderDirection}
                        onChange={(e) => setAccommodationLadderDirection(e.target.value)}
                      >
                        <option value='Aft'>Aft</option>
                        <option value='Port side'>Port side</option>
                        <option value='Starboard'>Starboard</option>
                      </select>
                    </div>
                    <div className='col-md-6 form-check'>
                      <input
                        type='checkbox'
                        id='portableGangway'
                        className='form-check-input'
                        checked={portableGangwayFitted}
                        onChange={(e) => setPortableGangwayFitted(e.target.checked)}
                      />
                      <label htmlFor='portableGangway' className='form-check-label'>
                        Portable gangway fitted?
                      </label>
                      {portableGangwayFitted && (
                        <input
                          type='text'
                          className='form-control mt-2'
                          placeholder='Length (m)'
                          value={portableGangwayLength}
                          onChange={(e) => setPortableGangwayLength(e.target.value)}
                        />
                      )}
                    </div>
                  </div>

                  <h6 className='mt-4 mb-3'>9. Single-Point Mooring (SPM)</h6>
                  <div className='form-check mb-2'>
                    <input
                      type='checkbox'
                      id='spmOk'
                      className='form-check-input'
                      checked={spmOcimfCompliant}
                      onChange={(e) => setSpmOcimfCompliant(e.target.checked)}
                    />
                    <label htmlFor='spmOk' className='form-check-label'>
                      Meets OCIMF SPM recommendations?
                    </label>
                  </div>
                  {spmOcimfCompliant && (
                    <>
                      <div className='row align-items-center mb-2'>
                        <div className='col-md-6'>
                          <label>Number of chain stoppers</label>
                          <input
                            type='number'
                            className='form-control'
                            value={spmChainStoppersCount}
                            onChange={(e) => setSpmChainStoppersCount(+e.target.value)}
                          />
                        </div>
                        <div className='col-md-6'>
                          <label>Chain stoppers details</label>
                          <input
                            type='text'
                            className='form-control'
                            value={spmChainStoppersDetails}
                            onChange={(e) => setSpmChainStoppersDetails(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className='row align-items-center mb-2'>
                        <div className='col-md-6'>
                          <label>Distance bow fairlead to bracket (m)</label>
                          <input
                            type='text'
                            className='form-control'
                            value={spmBowFairleadToBracketDistance}
                            onChange={(e) => setSpmBowFairleadToBracketDistance(e.target.value)}
                          />
                        </div>
                        <div className='col-md-6'>
                          <label>Distance between bow fairleads (m)</label>
                          <input
                            type='text'
                            className='form-control'
                            value={spmFairleadDistance}
                            onChange={(e) => setSpmFairleadDistance(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className='form-check mb-3'>
                        <input
                          type='checkbox'
                          id='spmChockOk'
                          className='form-check-input'
                          checked={spmOcimfChockSizeOk}
                          onChange={(e) => setSpmOcimfChockSizeOk(e.target.checked)}
                        />
                        <label htmlFor='spmChockOk' className='form-check-label'>
                          OCIMF-size bow chock/fairlead?
                        </label>
                      </div>
                      {!spmOcimfChockSizeOk && (
                        <input
                          type='text'
                          className='form-control mb-3'
                          placeholder='Actual size (mm)'
                          value={spmOcimfChockSizeDetails}
                          onChange={(e) => setSpmOcimfChockSizeDetails(e.target.value)}
                        />
                      )}
                    </>
                  )}
                </div>
              )}

              {activeTab === 'step8' && (
                <div className='tab-pane fade show active' role='tabpanel'>
                  <h6 className='mb-3'>Service Speeds</h6>
                  <div className='row'>
                    {speedFields.map(({label, value, setter, unit}) => (
                      <div key={label} className='col-md-6 mb-3'>
                        <label className='modal_label'>{label}</label>
                        <div className='input-group'>
                          <input
                            type='text'
                            className='form-control'
                            value={value}
                            onChange={(e) => setter(e.target.value)}
                          />
                          <span className='input-group-text'>{unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <h6 className='mt-4 mb-3'>Fuel Types</h6>
                  <div className='row'>
                    <div className='col-md-6 mb-3'>
                      <label className='modal_label'>Main propulsion fuel</label>
                      <input
                        type='text'
                        className='form-control'
                        value={mainPropulsionFuel}
                        onChange={(e) => setMainPropulsionFuel(e.target.value)}
                      />
                    </div>
                    <div className='col-md-6 mb-3'>
                      <label className='modal_label'>Generating plant fuel</label>
                      <input
                        type='text'
                        className='form-control'
                        value={generatingPlantFuel}
                        onChange={(e) => setGeneratingPlantFuel(e.target.value)}
                      />
                    </div>
                  </div>

                  <h6 className='mt-4 mb-3'>Bunker Capacities</h6>
                  <div className='row'>
                    {bunkerFields.map(({label, value, setter, unit}) => (
                      <div className='col-md-6 mb-3' key={label}>
                        <label className='modal_label'>{label}</label>
                        <div className='input-group'>
                          <input
                            type='text'
                            className='form-control'
                            value={value}
                            onChange={(e) => setter(e.target.value)}
                          />
                          <span className='input-group-text'>{unit}</span>
                        </div>
                      </div>
                    ))}
                    <div className='col-md-6 mb-3'>
                      <label className='modal_label'>Other fuel (specify)</label>
                      <input
                        type='text'
                        className='form-control'
                        value={bunkerOtherSpecify}
                        onChange={(e) => setBunkerOtherSpecify(e.target.value)}
                      />
                    </div>
                  </div>

                  <h6 className='mt-4 mb-3'>Propeller</h6>
                  <div className='mb-3'>
                    <label className='modal_label'>Pitch type</label>
                    <input
                      type='text'
                      className='form-control'
                      value={propellerPitchType}
                      onChange={(e) => setPropellerPitchType(e.target.value)}
                    />
                  </div>

                  <h6 className='mt-4 mb-3'>Main Engines</h6>
                  <div className='row'>
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>Number of engines</label>
                      <input
                        type='number'
                        className='form-control'
                        value={mainEngineCount}
                        onChange={(e) => setMainEngineCount(+e.target.value)}
                      />
                    </div>
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>Capacity</label>
                      <div className='input-group'>
                        <input
                          type='text'
                          className='form-control'
                          value={mainEngineCapacity}
                          onChange={(e) => setMainEngineCapacity(e.target.value)}
                        />
                        <span className='input-group-text'>kW</span>
                      </div>
                    </div>
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>Make / Type</label>
                      <input
                        type='text'
                        className='form-control'
                        value={mainEngineMakeType}
                        onChange={(e) => setMainEngineMakeType(e.target.value)}
                      />
                    </div>
                  </div>

                  <h6 className='mt-4 mb-3'>Auxiliary Engines</h6>
                  <div className='row'>
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>Number of units</label>
                      <input
                        type='number'
                        className='form-control'
                        value={auxEngineCount}
                        onChange={(e) => setAuxEngineCount(+e.target.value)}
                      />
                    </div>
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>Capacity</label>
                      <div className='input-group'>
                        <input
                          type='text'
                          className='form-control'
                          value={auxEngineCapacity}
                          onChange={(e) => setAuxEngineCapacity(e.target.value)}
                        />
                        <span className='input-group-text'>kW</span>
                      </div>
                    </div>
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>Make / Type</label>
                      <input
                        type='text'
                        className='form-control'
                        value={auxEngineMakeType}
                        onChange={(e) => setAuxEngineMakeType(e.target.value)}
                      />
                    </div>
                  </div>

                  <h6 className='mt-4 mb-3'>Power Pack</h6>
                  <div className='row'>
                    <div className='col-md-6 mb-3'>
                      <label className='modal_label'>Number of units</label>
                      <input
                        type='number'
                        className='form-control'
                        value={powerPackCount}
                        onChange={(e) => setPowerPackCount(+e.target.value)}
                      />
                    </div>
                    <div className='col-md-6 mb-3'>
                      <label className='modal_label'>Capacity</label>
                      <div className='input-group'>
                        <input
                          type='text'
                          className='form-control'
                          value={powerPackCapacity}
                          onChange={(e) => setPowerPackCapacity(e.target.value)}
                        />
                        <span className='input-group-text'>kW</span>
                      </div>
                    </div>
                  </div>

                  <h6 className='mt-4 mb-3'>Boilers</h6>
                  <div className='row'>
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>Number of boilers</label>
                      <input
                        type='number'
                        className='form-control'
                        value={boilerCount}
                        onChange={(e) => setBoilerCount(+e.target.value)}
                      />
                    </div>
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>Capacity</label>
                      <div className='input-group'>
                        <input
                          type='text'
                          className='form-control'
                          value={boilerCapacity}
                          onChange={(e) => setBoilerCapacity(e.target.value)}
                        />
                        <span className='input-group-text'>kg/h</span>
                      </div>
                    </div>
                    <div className='col-md-4 mb-3'>
                      <label className='modal_label'>Make / Type</label>
                      <input
                        type='text'
                        className='form-control'
                        value={boilerMakeType}
                        onChange={(e) => setBoilerMakeType(e.target.value)}
                      />
                    </div>
                  </div>

                  <h6 className='mt-4 mb-3'>Thrusters</h6>
                  <div className='row'>
                    {thrusterFields.map(({label, value, setter, unit}) => (
                      <div className='col-md-6 mb-3' key={label}>
                        <label className='modal_label'>{label}</label>
                        <div className='input-group'>
                          <input
                            type='text'
                            className='form-control'
                            value={value}
                            onChange={(e) => setter(e.target.value)}
                          />
                          <span className='input-group-text'>{unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <h6 className='mt-4 mb-3'>Efficiency Indices</h6>
                  {ratingFields.map(
                    ({
                      label,
                      has,
                      setHas,
                      rating,
                      setRating,
                      noReason,
                      setNoReason,
                      verifiedBy,
                      setVerifiedBy,
                    }) => (
                      <div key={label} className='mb-4'>
                        <div className='form-check mb-2'>
                          <input
                            type='checkbox'
                            className='form-check-input'
                            id={`has${label}`}
                            checked={has}
                            onChange={(e) => setHas(e.target.checked)}
                          />
                          <label className='form-check-label' htmlFor={`has${label}`}>
                            {label} rating available?
                          </label>
                        </div>
                        {has ? (
                          <div className='row'>
                            <div className='col-md-4 mb-2'>
                              <label className='modal_label'>{label} Rating</label>
                              <input
                                type='text'
                                className='form-control'
                                value={rating}
                                onChange={(e) => setRating(e.target.value)}
                              />
                            </div>
                            <div className='col-md-4 mb-2'>
                              <label className='modal_label'>Verified by</label>
                              <input
                                type='text'
                                className='form-control'
                                value={verifiedBy}
                                onChange={(e) => setVerifiedBy(e.target.value)}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className='mb-2'>
                            <label className='modal_label'>{label} Not Available (reason)</label>
                            <input
                              type='text'
                              className='form-control'
                              value={noReason}
                              onChange={(e) => setNoReason(e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    )
                  )}

                  <h6 className='mt-4 mb-3'>NOₓ Control</h6>
                  <div className='row'>
                    <div className='col-md-6 mb-3'>
                      <label className='modal_label'>Control tier</label>
                      <input
                        type='text'
                        className='form-control'
                        value={noxControlTier}
                        onChange={(e) => setNoxControlTier(e.target.value)}
                      />
                    </div>
                    <div className='col-md-6 mb-3'>
                      <label className='modal_label'>Equipment list</label>
                      <input
                        type='text'
                        className='form-control'
                        value={noxEquipmentList}
                        onChange={(e) => setNoxEquipmentList(e.target.value)}
                      />
                    </div>
                  </div>

                  <h6 className='mt-4 mb-3'>Exhaust Gas Cleaning (EGCS)</h6>
                  <div className='form-check mb-2'>
                    <input
                      type='checkbox'
                      className='form-check-input'
                      id='egcsFitted'
                      checked={egcsFitted}
                      onChange={(e) => setEgcsFitted(e.target.checked)}
                    />
                    <label className='form-check-label' htmlFor='egcsFitted'>
                      EGCS fitted?
                    </label>
                  </div>
                  {egcsFitted && (
                    <div className='mb-3'>
                      <label className='modal_label'>Scrubber type</label>
                      <input
                        type='text'
                        className='form-control'
                        value={scrubberType}
                        onChange={(e) => setScrubberType(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer Buttons */}
          <div className='modal-footer d-flex justify-content-end gap-2 p-4'>
            <button className='btn btn-secondary' onClick={onClose}>
              Cancel
            </button>
            {activeTab === 'step1' && (
              <button className='btn btn-primary' onClick={handleSaveGeneral}
              disabled={
              !!(contactTelError ||
              contactFaxError ||
              contactEmailError ||
              registeredOwnerTelError ||
              registeredOwnerFaxError ||
              registeredOwnerEmailError ||
              technicalOperatorTelError ||
              technicalOperatorFaxError ||
              technicalOperatorEmailError)
            }
                >
                {hasGeneral ? 'Update' : 'Save'} General Info
              </button>
            )}
            {activeTab === 'step2' && (
              <button className='btn btn-primary' onClick={handleSaveUSA}>
                {hasUSA ? 'Update' : 'Save'} For USA Calls
              </button>
            )}
            {activeTab === 'step3' && (
              <button className='btn btn-primary' onClick={handleSaveSafety}>
                {hasSafety ? 'Update' : 'Save'} Safety/Helicopter
              </button>
            )}
            {activeTab === 'step4' && (
              <button className='btn btn-primary' onClick={handleSaveCoating}>
                {hasCoating ? 'Update' : 'Save'} Coating/Anodes
              </button>
            )}
            {activeTab === 'step5' && (
              <button className='btn btn-primary' onClick={handleSaveBallast}>
                {hasBallast ? 'Update' : 'Save'} Ballast
              </button>
            )}
            {activeTab === 'step6' && (
              <button className='btn btn-primary' onClick={handleSaveCargo}>
                {hasCargo ? 'Update' : 'Save'} Cargo
              </button>
            )}
            {activeTab === 'step7' && (
              <button className='btn btn-primary' onClick={handleSaveVacuum}>
                {hasVacuum  ? 'Update' : 'Save'} Vacuum System
              </button>
            )}
            {activeTab === 'step8' && (
              <button className='btn btn-primary' onClick={handleSavePropulsion}>
                {hasPropulsion ? 'Update' : 'Save'} Propulsion
              </button>
            )}
            {/* save and update buttons for other steps */}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddAdditionalInfoModal
