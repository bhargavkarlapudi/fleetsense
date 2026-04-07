export type StaticFieldType =
  | 'text'
  | 'textarea'
  | 'date'
  | 'time'
  | 'number'
  | 'select'
  | 'checklist'

export interface StaticField {
  name: string
  label: string
  type: StaticFieldType
  required?: boolean
  options?: string[]
  items?: string[] // for checklist
  helperText?: string
}

export interface StaticFormConfig {
  code: string
  title: string
  description?: string
  fields: StaticField[]
}

export const STATIC_FORMS: StaticFormConfig[] = [
  // ---------------- BCM502 ----------------
  {
    code: 'BCM502',
    title: 'Ship Shore Safety Check List',
    description:
      'Joint ship/shore checklist before cargo operations (answer YES/NO/NA as applicable).',
    fields: [
      { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
      { name: 'date', label: 'Date', type: 'date', required: true },
      { name: 'port', label: 'Port', type: 'text', required: true },
      { name: 'terminalBerth', label: 'Terminal / Berth', type: 'text' },

      // Communication section (explicitly present in form)
      {
        name: 'communicationsMethod',
        label: 'Communications Method',
        type: 'text',
        helperText: 'e.g., hand-held radio',
      },
      { name: 'communicationsLanguage', label: 'Language', type: 'text' },
      { name: 'radioChannels', label: 'Radio Channels', type: 'text' },
      {
        name: 'shipContactPersons',
        label: 'Ship Contact Person(s)',
        type: 'text',
        helperText: 'e.g., Chief / Duty Officer',
      },
      {
        name: 'shoreContactPersons',
        label: 'Shore Contact Person(s)',
        type: 'text',
        helperText: 'e.g., Ship loader operator',
      },
      { name: 'liaisonLocation', label: 'Liaison Location', type: 'text' },

      // Extra numeric/text placeholders present in the form
      {
        name: 'copyLodgedWith',
        label: 'Copy Lodged With',
        type: 'text',
        helperText: 'e.g., Pilot / Surveyor, terminal & ship',
      },
      {
        name: 'terminalConveyorTonnage',
        label: 'Tonnage held by terminal conveyor system',
        type: 'text',
      },
      { name: 'loader1', label: 'Loader 1', type: 'text' },
      { name: 'loader2', label: 'Loader 2', type: 'text' },
      { name: 'loader3', label: 'Loader 3', type: 'text' },

      // Checklists
      {
        name: 'preOperationsChecks',
        label: 'Pre-Operations Checks',
        type: 'checklist',
        helperText: 'Answer YES/NO/NA for each item.',
        items: [
          // General Safety
          'Is the depth of water at the berth, and the air draught, adequate for the cargo operation?',
          'Are mooring arrangements adequate for all local effects of tide, current, weather, traffic and craft alongside?',
          "Is the ship securely moored and fendered?",
          'Is there safe access between the ship and the wharf? (Tended by ship/terminal as applicable)',
          "Are the ship's stability calculations within permissible limits?",
          'Have any bunkering operations been advised and agreed?',
          'Have any intended repairs to wharf or ship whilst alongside been advised and agreed?',

          // Safety Precautions
          'Have you conducted a safety briefing for all personnel involved in loading/unloading?',
          'Is the use of proper personal protective equipment (PPE) ensured by all personnel?',
          'Is fire main pressurised and all fire pumps operational including emergency fire pump? Has all firefighting equipment been made ready as required?',
          'Have all personnel been informed of smoking regulations and have shore authorities approved of location where smoking is permitted?',
          'Are gangway safety nets and life buoys in position and properly rigged with safe access from top of the gangway to the deck?',
          'Is all gas and oxygen detection equipment tested and available?',
          'Do both the ship and terminal understand and accept that the ship loader operator must be informed before access is made to any cargo compartment and that the covers of that compartment will be kept partially closed during the period of such access?',
          'Have all personnel been advised of the properties of any hazardous cargoes (toxic/corrosive/inflammable etc.) and is product data displayed?',
          'Is there an effective deck watch in attendance onboard and adequate supervision of operations on the ship and in the terminal?',

          // Emergency Response
          'Verify and execute emergency response protocols specific to cargo-related incidents, ensuring rigorous adherence to regulatory guidelines.',
          'Is the availability and readiness of spill response equipment verified?',
          'The emergency signal and shutdown procedure to be used by the ship and shore have been explained and understood.',
          'In emergency, is the ship able to leave the berth at any time under its own power?',
          'Are adequate crew on board, and adequate staff in the terminal, for emergency?',
          'Are all personnel involved in operations fully conversant with starting/stopping procedures, emergency stop, raising the alarm, and agreed cargo/ballast handling procedures?',

          // Weather Conditions
          'Are weather conditions being monitored and assessed, particularly during bulk cargo operations?',
          'Is the suspension or modification of operations considered in the presence of adverse weather conditions?',

          // Environmental Compliance
          'Confirm compliance with MARPOL regulations.',
          "Ensure the vessel's pollution prevention equipment is in good working condition.",
          'Verify that waste disposal procedures are being followed as per environmental standards.',

          // Security Measures
          'Are security measures for cargo handling areas implemented in accordance with ISPS Code requirements?',
          'Is the condition of security equipment, including CCTV cameras and access control systems, checked?',
          'Is access to sensitive areas controlled during loading/unloading operations?',
          'Has the ship’s side been checked for unauthorized craft?',
          'Are all external doors, ports, and windows in the accommodation, stores, and machinery spaces closed (engine room vents may be open as applicable)?',

          // Cargo Documentation
          'Are all relevant documents, such as the loading/unloading plan and stowage plan, available and approved?',
          'Has the ship been provided with copies of port and terminal regulations, including safety and pollution requirements and details of emergency services?',
          'Has the shipper provided the master with the properties of the cargo in accordance with SOLAS Chapter VI?',

          // Cargo Sampling and Testing
          'Is cargo sampling and testing conducted in accordance with industry and regulatory standards?',
          'Ensure that representative samples are taken and documented.',
          'Has a procedure for reporting and recording damage from cargo operations been agreed?',

          // Cargo Handling
          'Verify the use of proper equipment for cargo handling.',
          'In case of deviation from initial loading/discharge plan, has it been agreed with shore operators and a new plan prepared?',
          'Do both ship and terminal understand and accept that if ballast program becomes out of step with cargo operation, cargo operation may be suspended until ballast catches up?',

          // Cargo Handling Equipment
          'Have the condition and certification of shore-based cargo handling equipment (cranes/grabs/conveyors) been verified?',
          'Is the equipment suitable for the type of cargo being handled?',
          'Have cargo handling capacity and limits of travel for each loader/unloader been passed to ship/terminal?',

          // Cargo Holds and Hatches
          'Are the cleanliness and readiness of the cargo holds confirmed?',
          'Is atmosphere safe in holds/enclosed spaces where access may be required; fumigated cargo identified; monitoring agreed by ship and terminal?',
          'Have the holds to be worked been clearly identified in the loading/unloading plan showing sequence, grade, and tonnage each time?',
          'Have intended procedures for removing cargo residues lodged in the holds while unloading been explained to and accepted by ship?',

          // Trim and Stability
          'Has a cargo loading/unloading plan been calculated for all stages of loading/de-ballasting or unloading/ballasting?',
          'Has the need for trimming of cargo in the holds been discussed and method/extent agreed?',
          'Is the monitoring and maintenance of proper trim ensured during loading/unloading?',
          'Confirm that stability criteria are maintained throughout the operation.',

          // Draft Surveys
          'Is the accuracy of draft markings and calibration of draft sensors confirmed?',
          'Does the Master understand that manometers (water tube) are mandatory?',
          'Are draft surveys conducted both before and after loading/unloading to determine cargo quantities?',
          'Have procedures to adjust the final trim of the loading ship been decided and agreed?',
          'Do both ship and terminal understand and accept that ballast operations will be managed so air draft restriction will not be exceeded? If cargo loading stops, ballast discharge must be managed so vessel stays within air draft limits.',
          'Ship’s crew must contact the Ship Loader by hand-held radio before reading drafts.',

          // Weighing Procedures
          'Is the method of cargo weighing (shore scales/ship equipment) confirmed?',
          'Have calibration and accuracy of weighing equipment been verified?',

          // Stowage and Securing
          'If ship is fitted with collapsible lighting towers, is it agreed that these will be lowered before loading?',
        ],
      },
      {
        name: 'ongoingOperationalChecks',
        label: 'Ongoing Operational Checks',
        type: 'checklist',
        helperText: 'Answer YES/NO/NA for each item.',
        items: [
          // General Safety
          'Are mooring arrangements adequate for all local effects of tide, current, weather, traffic and craft alongside?',
          'Is the ship securely moored and fendered?',
          'Is there safe access between the ship and the wharf? (Tended by ship/terminal as applicable)',

          // Safety Precautions
          'Is the use of proper personal protective equipment (PPE) ensured by all personnel?',
          'Are gangway safety nets and life buoys in position and properly rigged with safe access from top of gangway to deck?',
          'Is there an effective deck watch in attendance onboard and adequate supervision of operations on the ship and in the terminal?',

          // Emergency Response
          'In emergency, is the ship able to leave the berth at any time under its own power?',
          'There are sufficient personnel on board and ashore to deal with an emergency.',

          // Communication Protocols
          'Use agreed-upon signals and procedures for cargo handling operations.',
          'Are liaison contact persons during operations positively identified (ship and shore)?',

          // Weather Conditions
          'Are weather conditions being monitored and assessed, particularly during bulk cargo operations?',
          'Is suspension or modification of operations considered in the presence of adverse weather conditions?',

          // Environmental Compliance
          'Confirm compliance with MARPOL regulations.',
          "Ensure the vessel's pollution prevention equipment is in good working condition.",
          'Verify waste disposal procedures are followed per environmental standards.',

          // Cargo Handling
          'Confirm adherence to cargo stowage and securing plans.',
          'Verify the use of proper equipment for cargo handling.',
          'Check cargo weight distribution and securing mechanisms.',
          'In case of deviation from initial loading/discharge plan, has it been agreed with shore operators and a new plan prepared?',

          // Trim and Stability
          'Is monitoring and maintenance of proper trim ensured during loading/unloading?',
          'Confirm that stability criteria are maintained throughout the operation.',
        ],
      },
      {
        name: 'postOperationChecks',
        label: 'Post-Operation Checks',
        type: 'checklist',
        helperText: 'Answer YES/NO/NA for each item.',
        items: [
          // General Safety
          'Is a post-operation debriefing conducted to discuss any issues or improvements?',
          'Has the terminal been advised of the time required for the ship to prepare for sea on completion of cargo work?',
          'Has a ship/shore check list been completed by the shore personnel and copied on board?',

          // Cargo Documentation
          'Is the accuracy of cargo documentation, including bills of lading and cargo manifests, confirmed?',
          'Are cargo declarations ensured to be in compliance with international regulations?',

          // Cargo Holds and Hatches
          'Has the watertight integrity of the hatch covers been verified?',
          'Are all hatch cover securing devices in good working order?',

          // Draft Surveys
          'Are draft surveys conducted both before and after loading/unloading to determine cargo quantities?',
          'Ship’s crew must contact the Ship Loader by hand-held radio before reading drafts.',
          'Is the ship’s departure subject to UKC and Air Draft policy?',

          // Stowage and Securing
          'Verify that all cargo handling equipment is stowed and secured properly.',
          'Has the cargo been stowed and secured in accordance with the approved plan?',
          'Does the cargo distribution in the holds comply with stability requirements?',
          'Is the proper use of dunnage and separation materials ensured?',
        ],
      },

      { name: 'remarks', label: 'General Remarks', type: 'textarea' },

      // Sign-off
      { name: 'masterName', label: 'Master Name', type: 'text' },
      { name: 'masterDate', label: 'Master Date', type: 'date' },
      { name: 'chiefOfficerName', label: 'Chief Officer Name', type: 'text' },
      { name: 'chiefOfficerDate', label: 'Chief Officer Date', type: 'date' },
      {
        name: 'shoreRepName',
        label: 'Shore Operations Representative Name',
        type: 'text',
      },
      { name: 'shoreRepDate', label: 'Shore Representative Date', type: 'date' },
    ],
  },

  // ---------------- BCM524g ----------------
  {
    code: 'BCM524g',
    title: 'Notice of Readiness',
    description: 'Declaration of readiness for cargo operations.',
    fields: [
      { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
      { name: 'voyageNo', label: 'Voyage No.', type: 'text', required: true },
      { name: 'dateOfArrival', label: 'Date of Arrival', type: 'date', required: true },
      { name: 'timeOfArrival', label: 'Time of Arrival', type: 'time', required: true },
      { name: 'portOfArrival', label: 'Port of Arrival', type: 'text', required: true },
      { name: 'chartererName', label: "Charterer's Name", type: 'text' },
      { name: 'agencyName', label: 'Agency Name', type: 'text' },
      { name: 'charterPartyDate', label: 'Charter Party Date', type: 'date' },
      { name: 'norTendered', label: 'NOR Tendered (Date & Time)', type: 'text' },
      { name: 'operationType', label: 'Load or Discharge', type: 'select', options: ['Load', 'Discharge'] },
      { name: 'cargoGrades', label: 'Cargo Grades', type: 'textarea' },
      { name: 'cargoQuantities', label: 'Cargo Quantities', type: 'textarea' },

      // Sign-off + acceptance
      { name: 'masterName', label: 'Master Name', type: 'text' },
      { name: 'masterDate', label: 'Master Date', type: 'date' },
      { name: 'receiverName', label: 'Shipper / Consignee / Agent Name', type: 'text' },
      { name: 'receiverDate', label: 'Shipper / Consignee / Agent Date', type: 'date' },
      { name: 'norAcceptedDateTime', label: 'NOR Accepted (Date & Time)', type: 'text' },
    ],
  },

  // ---------------- BMM506 ----------------
  {
    code: 'BMM506',
    title: 'Passage Plan Checklist',
    description: 'Pre-sailing assessment checklist (Yes/No).',
    fields: [
      { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
      { name: 'passagePlanNo', label: 'Passage Plan No.', type: 'text', required: true },
      { name: 'date', label: 'Date', type: 'date', required: true },
      { name: 'voyageNo', label: 'Voyage No.', type: 'text' },

      {
        name: 'preSailingAssessment',
        label: 'Pre-Sailing Assessment',
        type: 'checklist',
        helperText: 'Mark Yes/No for each item.',
        items: [
          'Officers aware of actions to be taken in case of bad weather/poor visibility/heavy swell/heavy traffic/excessive currents and tides or other emergency situations?',
          'Latest Notices to Mariners received (electronically) – Week No. recorded?',
          'Are Charts / List of Lights / Radio Signals for the intended voyage corrected?',
          'Are required Sailing Directions / Tide tables / Guide to port entry / Pilot books / Routing & traffic separation schemes / Weather charts studied and considered?',
          'Have Passage Plan Instructions been considered and relevant checklists checked and considered?',
          'Is vessel supplied with adequate bunkers, provisions, water etc. plus nominal safety margin for voyage duration?',
          'Is vessel equipped with all necessary charts, weather and tidal charts, sailing directions and other relevant publications required for this voyage?',
          'Are the above updated and corrected?',
          'Preliminary and Temporary Notices updated and marked on chart?',
          'Are all navigational instruments in good operational condition?',
          'Are necessary pre-sailing checks being carried out and relevant checklist completed?',
          'Are the below factors properly considered while route planning?',
          "Vessel’s draft, Under Keel Clearance, squat and applicable Load Line Zone considered.",
          'Tidal stream and currents considered.',
          'Restricted visibility and traffic congestion considered.',
          'Possibility of heavy sea considered.',
          'Potential machinery breakdown considered.',
          'Reefs, dangerous areas and radar conspicuous objects marked on charts.',
          'Marine environmental protection measures applicable are considered and actions avoided as far as practical.',
          'Are following clearly marked on charts and stated on attached sailing plan summary?',
          'Clearance from land, shoals and all other navigational hazards.',
          'Landmarks/channel buoys/narrows/wrecks.',
          'Parallel index plotting.',
          'Emergency anchorage position.',
          'NAVTEX warnings in force for departure area read and applied on chart.',
          'Navigational warning for the area received and marked on chart.',
          'Has the Chief Engineer been consulted on limitations on main propulsion, A/E and ongoing maintenance?',
          'Weather information (Fax/NAVTEX/EGC), weather reports & ice information available.',
          'Position recorded every hour at deep sea and more frequently while coasting/under pilotage (5 to 20 minutes depending on conditions).',
          'Heavy traffic area, Piracy area and JWC listed (entry/exit points) marked on chart.',
          'Wheel over position marked on chart for every alteration.',
          'If ocean routing services are engaged, preliminary info passed and voyage advice received.',
        ],
      },

      {
        name: 'ecdisParameters',
        label: 'ECDIS Parameters',
        type: 'checklist',
        helperText: 'Mark Yes/No for each item.',
        items: [
          'Safety Depth',
          'Safety Contour',
          'Shallow Contour',
          'Deep Contour',
          'Safety Frame / Watch Vector / Guard Zone setting – Ocean, Coast, Port',
          'Cross Track Limits (XTL/XTD) setting – Ocean',
          'Cross Track Limits (XTL/XTD) setting – Coast',
          'Cross Track Limits (XTL/XTD) setting – Port',
          'CATZOC ENC Accuracy',
          'ECDIS Handover Checklist in use',
          'Officers familiar with the ECDIS Failure Flowchart',
        ],
      },

      {
        name: 'vesselCompliance',
        label: 'Vessel Compliance',
        type: 'checklist',
        helperText: 'Mark Yes/No for each item.',
        items: [
          'Appropriate marking carried out on CHARTS/ECDIS.',
          'Vessel to transit MARPOL Annex I Special Areas (areas to transit recorded).',
          'Vessel to transit MARPOL Annex V Special Areas (areas to transit recorded).',
          'Vessel to transit SECA/ECA/EU directive area/HONG KONG/CHINA ECA (as applicable).',
          'Vessel has sufficient compliant LSFO/LSMGO for stay/transit in applicable SECA/ECA/EU directive/HK/China ECA.',
          'Vessel has sufficient distillate fuel (MGO/MDO) to comply with local regulations while calling California.',
          'Ballast Water Exchange area during voyage passage marked on CHARTS/ECDIS.',
          'Local regulations regarding sewage/grey water/hold washing/other discharge streams considered.',
          'If trading US East Coast: speed restrictions to protect endangered Right Whales maintained and marked on CHART/ECDIS.',
          'Is vessel calling FSMC affected areas during high-risk period (as applicable).',
          'Is vessel expected to transit PSSA area and same marked; routing measures/prohibition of discharges considered and staff informed.',
          'Is vessel transiting JWLA listed area; owners informed on entry/exit times.',
          'Is vessel breaching International Navigating Limits (INL); owners informed for underwriters approval.',
          'Is vessel transiting Panama Canal; changeover requirements complied.',
        ],
      },

      { name: 'remarks', label: 'Remarks (if any)', type: 'textarea' },

      // Sign-off
      { name: 'secondOfficerName', label: '2nd Officer Name', type: 'text' },
      { name: 'secondOfficerDate', label: '2nd Officer Date', type: 'date' },
      { name: 'masterName', label: 'Master Name', type: 'text' },
      { name: 'masterDate', label: 'Master Date', type: 'date' },
    ],
  },

  // ---------------- BMM509a ----------------
  {
    code: 'BMM509a',
    title: 'Arrival Checklist - Bridge',
    description: 'To be completed by Duty Officer prior to arrival.',
    fields: [
      { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
      { name: 'location', label: 'Location', type: 'text', required: true },

      { name: 'vesselDraftFwd', label: 'Vessel Draft - Forward', type: 'text' },
      { name: 'vesselDraftAft', label: 'Vessel Draft - Aft', type: 'text' },

      {
        name: 'priorArrivalOOWChecks',
        label: 'Prior-Arrival (Checked by OOW)',
        type: 'checklist',
        helperText: 'A tick/YES indicates check performed. N/A if not applicable.',
        items: [
          'Charts, Tide Tables, Sailing Directions ready',
          'Check Autopilot setting / Hand steering',
          'Course & Rudder Recorder running / calibrated',
          'Reporting to VTS',
          'Magnetic Compass (Heading recorded)',
          'ECDIS setting verified as per passage plan',
          'Gyro Repeaters & Bearing Diopters checked',
          'AIS updated',
          'X-Band / S-Band / forward & aft radars checked',
          'BNWAS status check',
          'BMMTEX and EGC',
          'Bridge clocks synchronised with E/R',
          'Speed log operational',
          'GMDSS tests/checks carried out',
          'Clear-view screens & bridge wipers tested',
          'GPS 1 and 2 checked & compared',
          'VDR operational (no error codes)',
          'Master Gyro No. 1 & 2 (Heading recorded)',
          "Navigation/NUC/Anchor/X’mas tree lights & alarms tested; day signals checked",
          'Echo-sounder: correct range scale in use; depth alarm set and tested on forward and aft sensors as fitted',
          'MF/HF watchkeeping receiver',
          'Appropriate flags/day signals hoisted',
          'Aldis lamp',
          'VHF radio telephones',
          'Whistle forward/aft tested and transferred to aft (after check)',
          'Walkie talkies',
          'Public address system / talk-back system',
          'Telephones - emergency telephones',
          'Steering gear and FU-NFU tested',
          'Power for windlass/winches on deck',
          'All rudder angle indicators (including bridge wings)',
          'Anchors lashing removed & ready for emergency',
          'Pilot card prepared',
          'Engine telegraphs (all M/E consoles)',
          'Bow/stern thruster ventilation confirmed as open',
          'Manoeuvring printer incl. time calibration',
          'Review of passage plan and amendments, if any done',
        ],
      },

      { name: 'dutyEngInformedStandbyTime', label: 'Duty Eng. Informed - Time for Standby Engine', type: 'time' },
      { name: 'timeAboveChecksCompleted', label: 'Time Above Checks Completed', type: 'time' },

      {
        name: 'priorArrivalOOWorCPT',
        label: 'Prior-Arrival (Checked by OOW or CPT)',
        type: 'checklist',
        helperText: 'A tick/YES indicates check performed. N/A if not applicable.',
        items: [
          'ETA Pilot confirmed',
          'Pilot ladder/combination arranged as required',
          'Pilot contacted',
          'Freeboard assessed ( < 9m = ladder, > 9m = combination )',
          'Agreed side of pilot boarding (PS/SB) confirmed',
          'Required overside PPE used by crew',
          'Established position for pilot embarkation',
          'Speed appropriate for safe rigging',
          'Time main engine tried out astern recorded',
          'Adequate lee provided from swell',
          'Chief Engineer reported M/E ready for manoeuvring',
          'Pilot ladder visually inspected, clean, correctly rigged and safe for use',
          'Time all prior arrival checks completed and logbook entry made',
          'Pilot ladder tested, well illuminated, ready with safety equipment',
        ],
      },

      // Helpful explicit fields from that section
      { name: 'etaPilot', label: 'ETA Pilot', type: 'text' },
      { name: 'freeboard', label: 'Freeboard', type: 'text' },
      { name: 'pilotBoardingSide', label: 'Agreed Side of Pilot Boarding', type: 'select', options: ['PS', 'SB'] },
      { name: 'pilotEmbarkationPosition', label: 'Established Position for Pilot Embarkation', type: 'text' },
      { name: 'timeMainEngineTriedAstern', label: 'Time Main Engine Tried Out Astern', type: 'time' },

      {
        name: 'arrivalUnderPilotage',
        label: 'Arrival - Under Pilotage (OOW or CPT)',
        type: 'checklist',
        helperText: 'A tick/YES indicates check performed. N/A if not applicable.',
        items: [
          'Pilot on board (last pilot if two or more)',
          'Master and Pilot exchange of information completed',
          'Passage plan for pilotage waters shared and agreed with Pilot',
          'Weather, tugs, moorings and other special circumstances discussed with Pilot',
          'Check time for calling crew for stations',
          'Pilot card with Pilot’s name & signature obtained',
        ],
      },

      {
        name: 'arrivalToBerth',
        label: 'Arrival to Berth (OOW or CPT)',
        type: 'checklist',
        helperText: 'A tick/YES indicates check performed. N/A if not applicable.',
        items: [
          'Shore cranes boomed up & clear of bow, stern & accommodation area',
          'Confirm anchors ready for "Emergency"',
          'Mooring lines ready as per berthing plan',
          'Notice to E/R for bow/stern thruster',
        ],
      },

      { name: 'remarks', label: 'Remarks (unusual sightings / incident details / other relevant details)', type: 'textarea' },
      { name: 'statutoryEquipmentMalfunction', label: 'Malfunction of any Statutory Equipment', type: 'textarea' },

      // Sign-off
      { name: 'oowName', label: 'Officer of the Watch (OOW) Name', type: 'text' },
      { name: 'oowRank', label: 'OOW Rank', type: 'text' },
      { name: 'oowTime', label: 'OOW Time', type: 'time' },
      { name: 'oowDate', label: 'OOW Date', type: 'date' },
      { name: 'masterName', label: 'Master Name', type: 'text' },
      { name: 'masterDate', label: 'Master Date', type: 'date' },
    ],
  },

  // ---------------- BMM509b ----------------
  {
    code: 'BMM509b',
    title: 'Departure Checklist - Deck',
    description: 'To be completed by Duty Officer prior to departure (YES/NO).',
    fields: [
      { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
      { name: 'location', label: 'Location', type: 'text', required: true },

      {
        name: 'departureChecks',
        label: 'Items Description',
        type: 'checklist',
        helperText: 'Mark YES/NO as applicable.',
        items: [
          'Heeling system on manual mode, ballast pumps stopped, and integrated systems switched from "Harbour" to "Sea Mode"',
          "ALL SCC (deck's office) controlled valves closed.",
          'All SDRs completed and signed by shore representatives/agents.',
          'Draft correction book updated with: deflected draft, draft correction, SW density, GM, BM, SF, TM.',
          'Cargo plan and cargo manifests received on board in required number of copies.',
          'Stability departure condition confirmed to the Master.',
          'Cargo gear secured for sea.',
          'All cranes secured for sea.',
          'Garbage bins (for port litter) emptied; contents segregated & transferred to designated garbage storage location.',
          'Garbage receipt received and GRB updated.',
          'LSA/FFA equipment on deck visually checked to verify quantity & condition.',
          'Return goods landed; documentation completed.',
          'Services scheduled in port completed; documentation completed.',
          'If vessel has forecast for heavy weather, preparations completed before leaving port.',
        ],
      },

      { name: 'remarks', label: 'Remarks (if any)', type: 'textarea' },

      // Sign-off
      { name: 'oowName', label: 'Officer of the Watch (OOW) Name', type: 'text' },
      { name: 'oowRank', label: 'OOW Rank', type: 'text' },
      { name: 'oowTime', label: 'OOW Time', type: 'time' },
      { name: 'oowDate', label: 'OOW Date', type: 'date' },
      { name: 'masterName', label: 'Master Name', type: 'text' },
      { name: 'masterDate', label: 'Master Date', type: 'date' },
    ],
  },
  // ---------------- BMM509d ----------------
{
  code: 'BMM509d',
  title: 'Departure Checklist - Bridge',
  description: "Duty Officer checklist prior to vessel's departure from port.",
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'location', label: 'Location', type: 'text', required: true },

    { name: 'vesselDraftFwd', label: 'Vessel Draft - FWD', type: 'text' },
    { name: 'vesselDraftAft', label: 'Vessel Draft - AFT', type: 'text' },

    {
      name: 'priorDepartureOOW',
      label: 'Prior-Departure (Checked by OOW)',
      type: 'checklist',
      helperText: 'Tick/YES indicates check performed. N/A if not applicable.',
      items: [
        'Charts (ECDIS), Tide Tables, Sailing Directions',
        'Course & Rudder Recorder running / calibrated',
        'Binoculars',
        'Magnetic Compass (Heading to be recorded)',
        'Weather Information',
        'Gyro Repeaters & Bearing Diopters',
        'NAVTEX and EGC',
        'X-Band / S-Band / FWD & AFT radars checked',
        'Speed log operational',
        'AIS Updated',
        'GPS 1 and 2 checked & compared',
        'GMDSS Tests/Checks carried out',
        'Master Gyro No. 1 & 2 (Heading to be recorded)',
        'MF/HF Watchkeeping Receiver',
        'Echo-sounder: correct range scale; depth alarm set & tested (FWD/AFT sensors as fitted)',
        "Navigation / NUC / Anchor / X’mas tree lights & alarms tested",
        'VHF Radio Telephones',
        'VDR operational (no error codes)',
        'Walkie Talkies',
        'Aldis Lamp',
        'Telephones - Emergency Telephones',
        'BNWAS status check',
        'Power for windlass/winches on deck',
        'Whistle FWD/AFT tested and transferred to aft (after check)',
        'Engine Telegraphs (all M/E consoles)',
        'All repeaters & indicators checked/illuminated (including bridge wings)',
        'Manoeuvring printer incl. time calibration',
        'Bow/Stern thruster ventilation confirmed as open',
        'Steering gear and FU-NFU tested, including power failure alarms (Complete C022c)',
        'Notice to E/R for Bow/Stern Thruster',
        'Pilot card prepared',
      ],
    },

    { name: 'dutyEngStandbyTime', label: 'Duty Eng. Informed - Time for Standby Engine', type: 'time' },

    // ECDIS Safety Settings
    { name: 'ecdisShallowContour', label: 'ECDIS Shallow Contour (m)', type: 'number' },
    { name: 'ecdisSafetyDepth', label: 'ECDIS Safety Depth (m)', type: 'number' },
    { name: 'ecdisSafetyContour', label: 'ECDIS Safety Contour (m)', type: 'number' },
    { name: 'ecdisDeepContour', label: 'ECDIS Deep Contour (m)', type: 'number' },

    { name: 'timeAboveChecksCompleted', label: 'Time Above Checks Completed', type: 'time' },

    {
      name: 'priorDepartureCAPT',
      label: 'Prior-Departure (Checked by CAPT)',
      type: 'checklist',
      items: [
        'Departure Checklist – Deck (BMM509b) completed',
        'All crew onboard',
        "Ship's and crew’s documents received",
        'Drug and stowaway search completed',
        'Port clearance / port papers received',
        'Monorail, crane(s), bunker davit(s) secured',
        'All cargo reported secured prior to departure',
        'Passage plan prepared/reviewed for entire voyage, including pilotage',
        'Pilot on board (last pilot if two or more)',
        'Shore cranes and installations clear of bow, stern & accommodation area',
        'Chief Engineer reported main engine tested, ready and on bridge control',
        "Pilot card with pilot's name & signature",
        'Stability/strength condition satisfactory',
        'Master–Pilot exchange of information',
        'Anchors ready for "Emergency"',
        'Time all prior departure checks completed, and logbook entry made',
      ],
    },

    {
      name: 'afterDepartureUnderPilotage',
      label: 'After Departure - Under Pilotage (OOW or CAPT)',
      type: 'checklist',
      items: [
        'Pilot ladder/combination rigged',
        'Required overside PPE used by crew',
        'Speed appropriate for safe rigging',
        'Adequate lee provided from swell',
        'Pilot ladder visually inspected, clean, correctly rigged and safe for use',
        'Pilot ladder tested, well illuminated, ready with safety equipment',
      ],
    },

    {
      name: 'preparationForSea',
      label: 'Preparation for Sea (OOW or CAPT)',
      type: 'checklist',
      items: [
        'Mooring lines secured',
        'Anchors secured',
        'Gangways secured',
        'Pilot ladders secured',
        'Commencement of sea passage',
        'Bow/stern thruster ventilation secured',
        'Watertight doors closed and secured',
        'LSA/FFA equipment on deck checked for readiness',
        'Weather routing advice requested as applicable (long ocean crossings / expected BF≥8 etc.)',
        'Vessel ready for sea',
      ],
    },

    { name: 'remarks', label: 'Remarks (unusual sightings / incidents / other relevant details)', type: 'textarea' },
    { name: 'statutoryEquipmentMalfunction', label: 'Malfunction of any Statutory Equipment', type: 'textarea' },

    // Sign-off
    { name: 'oowName', label: 'Officer of the Watch (OOW) Name', type: 'text' },
    { name: 'oowRank', label: 'OOW Rank', type: 'text' },
    { name: 'oowTime', label: 'OOW Time', type: 'time' },
    { name: 'oowDate', label: 'OOW Date', type: 'date' },
    { name: 'masterName', label: 'Master Name', type: 'text' },
    { name: 'masterDate', label: 'Master Date', type: 'date' },
  ],
},

// ---------------- BMM514a ----------------
{
  code: 'BMM514a',
  title: 'Bridge Equipment Daily Checks',
  description: 'Daily bridge equipment tests/checks (typically at noon).',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'checkDate', label: 'Check Date', type: 'date', required: true },
    {
      name: 'dailyChecks',
      label: 'Daily Checks',
      type: 'checklist',
      helperText: 'Tick/YES indicates check performed. N/A if not applicable.',
      items: [
        'Internal daily test of VHF/MF/HF DSC sets',
        'GMDSS batteries fully charged and operational',
        'Internal daily test of INMARSAT-C',
        'All recording printers & paper',
        'Internal daily test of GPS and AIS',
        'Internal daily test of echo sounder and speed log',
        'Communication between bridge to engine room and steering gear',
        'All repeaters and readouts synced and functional',
        'Bridge sound powered telephone and PA system operational test',
        'Bridge clocks and chronometers operation & synchronization',
        'General emergency alarm test',
        "Ship's whistle test (manual & auto where safe), bell and gong",
        'Steering motor & telemotor changeover; NFU mode steering test',
        'Gyro repeaters and master gyro synchronization',
        'Navigation/NUC/signal lights incl. backup operational check',
        'Aldis lamp checks (mains/battery) and spare bulbs (min 3) available',
        'S/VDR operation check and confirm no fault alarms',
        'Course recorder check (course/quadrant/recording time) and sign with date/time',
        'BNWAS operation check and confirm manual mode',
        'NAVTEX self test and correct NAVTEX area selection',
        'ECDIS operational without failure (if in use)',
        'Passage plan reviewed and updated as required',
        'Local/coastal warning broadcasts monitored and plotted as required',
        'Weather reports obtained and plotted as required',
        'Area reporting systems participation (e.g., AMVER/VTS)',
        'Autopilot effective tuning ensured',
        'Magnetic compass light in good working condition',
        'Bridge front windows sprinkler pipeline tested; nozzles free from deposits',
      ],
    },
    { name: 'defects', label: 'Defects / Deficiencies (if any)', type: 'textarea' },
    { name: 'oowName', label: 'OOW Name', type: 'text' },
    { name: 'oowRank', label: 'OOW Rank', type: 'text' },
    { name: 'oowTime', label: 'OOW Time', type: 'time' },
    { name: 'masterName', label: 'Master Name', type: 'text' },
    { name: 'masterDate', label: 'Master Date', type: 'date' },
  ],
},

// ---------------- BMM514b ----------------
{
  code: 'BMM514b',
  title: 'Bridge Equipment Weekly Checks',
  description: 'Weekly radio/bridge equipment checks.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'weekNo', label: 'Week No.', type: 'text', required: true },
    {
      name: 'weeklyChecks',
      label: 'Weekly Checks',
      type: 'checklist',
      helperText: 'Tick/YES indicates check performed. N/A if not applicable.',
      items: [
        // Radio
        'VHF DSC facilities tested at least once a week (test call internal/ship-to-ship)',
        'MF/HF DSC facilities tested at least once a week (test call on distress/safety frequency within range)',
        'Reserve source batteries checked weekly (ON-LOAD and OFF-LOAD voltages)',
        'NAVTEX weekly test (battery/keyboard/LCD/ROM/RAM) and error check',

        // Bridge
        'Magnetic compass working properly; readable; no air bubbles; deviation chart available & up to date',
        'Radar performance checks including heading line marker alignment',
        'Day shapes and signalling sounds satisfactory and available onboard',
        'Rudder angle, revolutions, and variable pitch indicators working properly',
        'Emergency engine stops checked and functional',
        'Window wipers and clear view screens working properly',
        'Steering gear checks incl. manual/auto/emergency changeover; rudder indicators',
        'Sextant + azimuth circle/mirror + shadow pins checked and functional',
        'Echo sounder tested on all ranges; record date/place/range on paper when used; digital indicators operational if fitted',
        'Fire alarm control panel checked and all components working',
        'Fixed gas detection control panel checked and all components working',
        'PA system and emergency telephones (Bridge–E/R and Bridge–Steering) satisfactory',
        "Ship's whistle capable of manual operation",
        'Aldis lamp (main & emergency) working; spare bulbs available',
        'Weather fax and paper checked/maintained',
        'ECDIS/ENC checks and updates done to ensure accuracy',
      ],
    },
    { name: 'defects', label: 'Defects / Deficiencies (if any)', type: 'textarea' },
    { name: 'oowName', label: 'OOW Name', type: 'text' },
    { name: 'oowRank', label: 'OOW Rank', type: 'text' },
    { name: 'oowTime', label: 'OOW Time', type: 'time' },
    { name: 'oowDate', label: 'OOW Date', type: 'date' },
    { name: 'masterName', label: 'Master Name', type: 'text' },
    { name: 'masterDate', label: 'Master Date', type: 'date' },
  ],
},

// ---------------- BMM514c ----------------
{
  code: 'BMM514c',
  title: 'Bridge Equipment Monthly Checks',
  description: 'Monthly radio/bridge equipment checks.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    {
      name: 'month',
      label: 'Month',
      type: 'select',
      options: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      required: true,
    },
    {
      name: 'monthlyChecks',
      label: 'Monthly Checks',
      type: 'checklist',
      helperText: 'Tick/YES indicates check performed. N/A if not applicable.',
      items: [
        // Radio
        'VHF DSC ship-to-shore monthly test call',
        'MF/HF DSC monthly test call (within range)',
        'EPIRB self-test (no satellite system)',
        'Confirm no emergency signal transmitted during EPIRB self-test',
        'EPIRB self-test: battery voltage, output power, frequency checked',
        'EPIRB physical condition checked; battery/HRU expiry; safety clip attachment',
        'SART self-test using ship X-band radar (prefer open sea)',
        'Two-way VHF on each survival craft tested (not Ch16); battery expiry & charge checked',
        'INMARSAT diagnostic test performed',
        'INMARSAT PV test performed (LES receive/transmit + distress alert test)',
        'Battery connections/compartment checked; electrolyte level/specific gravity planned/recorded',
        'Monthly visual check of all antennas (mounting security and cable damage)',
        'Aerials/insulators condition inspected; dirt/salt deposits removed',

        // Bridge
        'VDR approved and operational (recording/sensors/storage/alarms/playback/power/logbook)',
        'Navigation lights aligned and unobscured across arcs of visibility',
        'Navigation lights/alarms operational; paint condition of lamp shade box/alarm panel checked',
        'Navigational shapes readily available and in satisfactory condition',
        'Flags/signals readily available and in satisfactory condition',
        "Course recorder maintained; kept on during bad weather/port as applicable",
        'ECDIS updated; backups OK; dedicated USB; power/alarms/sensors/route planning checks',
        'Expired/not updated ENCs deleted from system',
        'SVDR/VDR functioning; data download instructions posted; officers aware of procedure',
      ],
    },

    // extra fields present in the form
    { name: 'totalPaperCharts', label: 'Total number of paper charts onboard', type: 'number' },
    { name: 'chartsMaintenanceSystem', label: "System of charts’ maintenance (Folio/Serial nos.)", type: 'text' },
    { name: 'listOfChartsChecked', label: 'List of charts checked', type: 'textarea' },

    { name: 'defects', label: 'Defects / Deficiencies (if any)', type: 'textarea' },
    { name: 'oowName', label: 'OOW Name', type: 'text' },
    { name: 'oowRank', label: 'OOW Rank', type: 'text' },
    { name: 'oowTime', label: 'OOW Time', type: 'time' },
    { name: 'oowDate', label: 'OOW Date', type: 'date' },
    { name: 'masterName', label: 'Master Name', type: 'text' },
    { name: 'masterDate', label: 'Master Date', type: 'date' },
  ],
},

// ---------------- BMM516 ----------------
{
  code: 'BMM516',
  title: 'Heavy Weather Checklist',
  description:
    'Section A: prior to heavy weather (and daily while in heavy weather). Section B: once every watch.',
  fields: [
    { name: 'vesselName', label: 'Vessel', type: 'text', required: true },
    { name: 'location', label: 'Location', type: 'text', required: true },

    {
      name: 'sectionA',
      label: 'SECTION A (Prior to Heavy Weather / Daily in Heavy Weather)',
      type: 'checklist',
      helperText: 'Tick/YES indicates check performed. N/A if not applicable.',
      items: [
        // Part A - Navigational Bridge
        'Master, crew and engine room informed of oncoming heavy weather',
        'Bridge prepared for rough weather; additional lashings applied as necessary',
        'Weather routing services utilized (if applicable)',
        'Course/speed adjusted or avoiding action taken (in consultation with Master)',
        'Autopilot weather setting adjusted (if using autopilot)',
        'Navarea warning broadcasts monitored',
        'Weather faxes/charts and office information obtained regularly',
        'Regular position & weather reports sent to office/interested parties',
        'Danger message for tropical storms sent (as per SOLAS V) if applicable',
        'Consider increasing distance from shore if sub-zero/ice accretion risk',

        // Part B - Deck
        'Anchors heaved right up; securings tightened',
        'Spurling pipe steel covers in position, cemented and covered',
        'Chain locker doors secured',
        'All watertight doors effectively closed',
        'Pilot ladders/hoists secured; additional lashings as appropriate',
        'Gangways secured; motors covered; additional lashings as appropriate',
        'All eductor/overboard discharge valves forward closed',
        'Closable vents/cargo hatches/holds/forecastle/poop/accommodation openings closed tight (incl. bunker vents/sounding pipes)',
        'On/under deck cargo/container lashings tightened; additional lashings as required',
        'WT doors/booby hatches/hold access hatches closed and tightened',
        'Moving objects secured; bilge level alarms monitored',
        'Mooring ropes/wires secured and covered',
        'Lifeboat lashings checked; lifeboat equipment lashings checked',
        'All LSA/FFA lashings rechecked/retightened; lifejacket boxes secured; extra lashings applied',
        'Provision/stores cranes secured',
        'Cargo handling cranes/derricks/equipment secured',
        'Forecastle/rope store weather-tight hatches closed',
        'Steering gear room/CO2 room/poop deck rope store hatches closed',
        'Forward store room checked; additional lashings applied',
        'Paint/chemical locker checked; items secured',
        'Deck store checked; additional lashings taken',
        'Consider heavy weather ballast / adjust ballast for propeller immersion',
        'Slack ballast tanks pressed-up/pumped out to eliminate sloshing damage',
        'Draft/trim/GM adjusted for better handling (consult Master)',

        // Part C - Accommodation
        'Chief cook notified; provision room/galley prepared',
        'Deck office prepared; lashings applied',
        'Dining saloon furniture/appliances secured',
        'Duty mess room furniture/appliances secured',
        'Officers smoking room furniture/appliances secured',
        'Crew day room furniture/appliances secured',
        'Conference room furniture/appliances secured',
        'Personal cabins: items/furniture secured; portable fans/heaters disconnected',
        'PC monitors/copy machines/printers lashed as appropriate',

        // Part D - Crew Safety
        'Crew instructed and familiar with heavy weather response',
        'Crew instructed on restrictions for work outside accommodation; course/speed adjusted for protection if unavoidable work',
        'Notices posted on doors about restrictions; crew familiar with inflatable lifejackets/PLB/flotation suits',

        // Part E - Engine Room
        'Main/Aux engines and machinery parameters within limits; LO sump level verified by manual sounding',
        'Engine room checked; additional lashings; loose/heavy items secured',
        'Underdeck passageway loose items checked and secured',
        'If rolling exceeds set limit, engine room to be manned',
        'BOB (Blending on board) not used during heavy weather operations',
        'If FO tanks full, adjust levels to avoid frequent high level alarms',
        'Increase draining frequency of service/settling tanks to prevent filter blockage',
        'Bilges checked and transferred to holding tank if required',
        'Steering gear room checked; additional lashings',
        'Engine control room prepared for rough weather',
      ],
    },

    { name: 'additionalShipSpecificItems', label: 'Additional Ship Specific Items', type: 'textarea' },

    // Section B (per watch)
    { name: 'sectionBDate', label: 'SECTION B - Date', type: 'date' },
    { name: 'sectionBTime', label: 'SECTION B - Time', type: 'time' },
    {
      name: 'sectionB',
      label: 'SECTION B (Once Every Watch)',
      type: 'checklist',
      items: [
        'Hourly log entries of meteorological conditions and vessel behaviour made',
        'Navarea warning broadcasts monitored',
        'Weather report / weather fax charts received',
        'Autopilot weather setting adjusted (if using autopilot)',
        'Regular position & weather reports sent to office/interested parties',
        'If vessel behaviour causes concern or in doubt, Master called immediately',
      ],
    },
    { name: 'oowSignatureName', label: 'Signature of OOW (Name)', type: 'text' },

    // Sign-off
    { name: 'oowName', label: 'OOW Name', type: 'text' },
    { name: 'oowRank', label: 'OOW Rank', type: 'text' },
    { name: 'oowTime', label: 'OOW Time', type: 'time' },
    { name: 'oowDate', label: 'OOW Date', type: 'date' },
    { name: 'masterName', label: 'Master Name', type: 'text' },
    { name: 'masterDate', label: 'Master Date', type: 'date' },
  ],
},

// ---------------- BMM517 ----------------
{
  code: 'BMM517',
  title: 'Restricted Visibility Checklist',
  description: 'Complete when approaching/entering restricted visibility and once every watch.',
  fields: [
    { name: 'vesselName', label: 'Vessel', type: 'text', required: true },
    { name: 'location', label: 'Location', type: 'text', required: true },
    { name: 'checkDate', label: 'Date', type: 'date' },
    { name: 'checkTime', label: 'Time', type: 'time' },

    {
      name: 'restrictedVisibilityChecks',
      label: 'Items Description',
      type: 'checklist',
      helperText: 'Tick/YES indicates check performed. N/A if not applicable.',
      items: [
        'Master and engine room informed',
        'Extra lookout(s) posted as required; helmsman on standby',
        'Speed reduced as per COLREGS Rule 19 (appropriate safe speed)',
        'Hand steering tested/engaged',
        'Radars/ARPA set to appropriate range',
        'Both VHF sets checked',
        'Fog signalling equipment checked (auto/manual)',
        'Navigational lights switched on',
        'Echo sounder on (if in shallow waters)',
        'Wipers and clear view screens used as required',
        'Sound reception system checked (if fitted)',
        'Increase frequency of position fixing near shallow waters/dangers',
        'Engine ready for immediate manoeuvre',
        'Anchoring checklist initiated if vessel may need to anchor; radar plotting commenced and maintained',
        'Remove anchor lashing and consider anchoring if within anchoring depth (consult Master)',
        'Consider radar blind/shadow sectors; suppress heading marker frequently; keep one radar on longer range / change range frequently',
        'Watertight doors shut',
        'All noisy work on deck stopped',
      ],
    },

    { name: 'remarks', label: 'Remarks (if any)', type: 'textarea' },

    // Sign-off
    { name: 'oowName', label: 'OOW Name', type: 'text' },
    { name: 'oowRank', label: 'OOW Rank', type: 'text' },
    { name: 'oowTime', label: 'OOW Time', type: 'time' },
    { name: 'oowDate', label: 'OOW Date', type: 'date' },
    { name: 'masterName', label: 'Master Name', type: 'text' },
    { name: 'masterDate', label: 'Master Date', type: 'date' },
  ],
},

// ---------------- CRM502a ----------------
{
  code: 'CRM502a',
  title: "Master’s Handover Report",
  description: 'To be completed at every change of Master.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'placeOfDisembarkation', label: 'Place of Disembarkation', type: 'text' },
    { name: 'timeOfHandover', label: 'Time of Handover', type: 'time' },
    { name: 'dateOfDisembarkation', label: 'Date of Disembarkation', type: 'date' },

    // Attachments / employment / passwords / media
    { name: 'documentsAttached', label: 'Are below documents attached with handover report?', type: 'select', options: ['YES', 'NO'] },
    { name: 'documentsAttachedDetails', label: 'Documents Attached - Details / Notes', type: 'textarea' },

    { name: 'vesselEmploymentNextIntentions', label: "Vessel’s present employment and next intentions", type: 'select', options: ['YES', 'NO'] },
    { name: 'vesselEmploymentDetails', label: 'Employment & Next Intentions - Details', type: 'textarea' },

    { name: 'passwordsKeyLocationsOk', label: 'Passwords / key location / combination numbers mentioned correctly?', type: 'select', options: ['YES', 'NO'] },
    { name: 'passwordsKeyLocationsDetails', label: 'Passwords / Key Locations / Combinations - Details', type: 'textarea' },

    { name: 'cdsDvdsReady', label: 'All CDs/DVDs (incl. Jot ERP back-up kit) kept ready with inventory?', type: 'select', options: ['YES', 'NO'] },
    { name: 'cdsDvdsIssues', label: 'CDs/DVDs - Issues / Notes', type: 'textarea' },

    // Fuel / freshwater summary (kept simple; you can expand later if needed)
    { name: 'fuelWaterStatusUpdated', label: 'Fuel Oil / Fresh Water Status Updated', type: 'select', options: ['YES', 'NO'] },
    { name: 'lastBunkersDatePlace', label: 'Date & Place for last bunkers supply', type: 'text' },
    { name: 'bunkersStemmedGradeAmount', label: 'Any bunkers stemmed (grade/amount)', type: 'text' },

    { name: 'robHFO', label: 'Fuel Oil ROB - HFO (MT)', type: 'number' },
    { name: 'robLSMGO', label: 'Fuel Oil ROB - LSMGO (MT)', type: 'number' },
    { name: 'robMGO', label: 'Fuel Oil ROB - MGO (MT)', type: 'number' },
    { name: 'robDO', label: 'Fuel Oil ROB - DO (MT)', type: 'number' },
    { name: 'robULSFO', label: 'Fuel Oil ROB - ULSFO (MT)', type: 'number' },

    { name: 'freshWaterROB', label: 'Fresh Water ROB (MT)', type: 'number' },
    { name: 'freshWaterGenerationPerDay', label: 'Fresh Water Generation / Day', type: 'number' },
    { name: 'freshWaterConsumptionPerDay', label: 'Fresh Water Consumption / Day', type: 'number' },

    // Communication
    { name: 'communicationStatusOk', label: 'Communication status in order', type: 'select', options: ['YES', 'NO'] },
    { name: 'communicationDetails', label: 'Communication Details (email system, backups, restrictions)', type: 'textarea' },
    { name: 'reportingRequirements', label: 'Routine / Emergency / Insurance Reporting Requirements', type: 'textarea' },
    { name: 'contactDetailsMainBackup', label: 'Contact details (main and backup)', type: 'textarea' },
    { name: 'communicationSpecialNotes', label: 'Any special note related to communication', type: 'textarea' },

    // Documentation / Certifications / Records (a-i)
    {
      name: 'documentationRecordsChecks',
      label: 'Documentation / Certifications / Records',
      type: 'checklist',
      helperText: 'Mark applicable items (use Remarks to note issues).',
      items: [
        'Certificate file up-to-date and entered in Jot ERP',
        'Jot ERP DMS updated with CDs received from office',
        'Bridge Management Manual and laminated posters EP-2 A–E onboard',
        'Circulars/info for Flag/Class/P&I/Owners updated in Jot ERP',
        'New alerts/circulars/forms/checklists saved until updated in Jot ERP',
        'Soft copy publications (Technical circular T-3) available in Jot ERP',
        'All log books as per Jot ERP–DMS available and in use',
        'All posters as per Jot ERP–DMS posted onboard',
        'Jot ERP backup taken regularly as per IT instruction',
      ],
    },
    { name: 'documentationConcerns', label: 'Documentation / Certification Concerns (if any)', type: 'textarea' },

    // Audits / Inspection
    { name: 'auditsInspectionUpdated', label: 'Audits / Inspection updated correctly in Jot ERP', type: 'select', options: ['YES', 'NO'] },
    { name: 'auditDeficiencyTasksCompleted', label: 'Tasks related to audit/inspection deficiencies completed in Jot ERP', type: 'select', options: ['YES', 'NO'] },
    { name: 'auditInspectionDetails', label: 'Audit/Inspection details (dates, due dates, major deficiencies)', type: 'textarea' },

    // Security
    {
      name: 'securityChecks',
      label: 'Security',
      type: 'checklist',
      helperText: 'Mark applicable items.',
      items: [
        'SSP kept in safe custody of Master; SSO appointment & reading acknowledgement completed',
        'Security file MS-1 & MS-2 updated and in Master’s custody',
        'SSAS testing procedure clearly recorded for reference',
        'All security equipment per SSP available and inspection record maintained',
      ],
    },
    { name: 'securityConcerns', label: 'Security concerns/procedure notes', type: 'textarea' },

    // Navigation / bridge equipment condition
    { name: 'navEquipWorking', label: 'All navigation equipment in good working order', type: 'select', options: ['YES', 'NO'] },
    { name: 'navEquipDeficiencies', label: 'Navigation equipment deficiencies (if any)', type: 'textarea' },

    { name: 'bridgeArticlesAvailable', label: 'All important equipment/articles available on bridge', type: 'select', options: ['YES', 'NO'] },
    { name: 'bridgeArticlesDetails', label: 'Bridge items missing/insufficient (if any)', type: 'textarea' },

    { name: 'radioGmdssOk', label: 'All radio/GMDSS equipment functioning correctly', type: 'select', options: ['YES', 'NO'] },
    { name: 'gmdssLogbookComplete', label: 'GMDSS log book completed with routine tests/checks', type: 'select', options: ['YES', 'NO'] },
    { name: 'radioGmdssDeficiencies', label: 'Radio/GMDSS deficiencies (if any)', type: 'textarea' },

    { name: 'chartsPublicationsOk', label: 'All required charts & publications available and updated', type: 'select', options: ['YES', 'NO'] },
    { name: 'chartCorrectionMediaOk', label: 'Electronic correction media working correctly', type: 'select', options: ['YES', 'NO'] },
    { name: 'chartsIssues', label: 'Charts/publications issues (if any)', type: 'textarea' },

    // Cargo/Ballast + inspections + mooring + cosmetic + LSA/FFA + drills + engine + environment
    { name: 'cargoBallastSystemOk', label: 'All cargo/ballast associated system in order', type: 'select', options: ['YES', 'NO'] },
    { name: 'cargoBallastSystemNotes', label: 'Cargo/ballast system notes', type: 'textarea' },

    { name: 'tanksInspectedPerSchedule', label: 'Cargo/ballast tanks/void spaces inspected per schedule and updated', type: 'select', options: ['YES', 'NO'] },
    { name: 'gasMeasuringEquipOk', label: 'Gas measuring equipment available and in good order', type: 'select', options: ['YES', 'NO'] },
    { name: 'tankInspectionNotes', label: 'Tank/void inspection notes', type: 'textarea' },

    { name: 'mooringEquipmentOk', label: 'All mooring associated equipment in order', type: 'select', options: ['YES', 'NO'] },
    { name: 'mooringFileUpdated', label: 'Mooring file updated; records maintained for lines/tails/shackles/certs', type: 'select', options: ['YES', 'NO'] },
    { name: 'winchBrakeTestDone', label: 'Winch condition good and brake rendering test done as required', type: 'select', options: ['YES', 'NO'] },
    { name: 'spareMooringWiresRopes', label: 'No. of spare mooring wires/ropes/tails etc.', type: 'text' },
    { name: 'mooringNotes', label: 'Mooring notes', type: 'textarea' },

    { name: 'deckHullCosmeticOk', label: 'Deck & hull cosmetic condition in order', type: 'select', options: ['YES', 'NO'] },
    { name: 'deckHullNotes', label: 'Deck/hull cosmetic notes', type: 'textarea' },

    { name: 'lsaFfaSopepOk', label: 'All LSA/FFA/SOPEP equipment adequate and in order', type: 'select', options: ['YES', 'NO'] },
    { name: 'sopepValid', label: 'SOPEP/SMPEP/VRP/CAVRP/PCSOPEP (as applicable) valid and onboard', type: 'select', options: ['YES', 'NO'] },
    { name: 'lsaFfaNotes', label: 'LSA/FFA/SOPEP notes', type: 'textarea' },

    { name: 'drillsTrainingOk', label: 'All drills/training carried out and recorded in EP-4', type: 'select', options: ['YES', 'NO'] },
    { name: 'epssCbtUsed', label: 'EPSS/CBT/Safety video sets onboard and used for training', type: 'select', options: ['YES', 'NO'] },
    { name: 'drillsTrainingNotes', label: 'Drills/training notes', type: 'textarea' },

    { name: 'engineSteeringOk', label: 'All main engine / steering gear associated equipment in order', type: 'select', options: ['YES', 'NO'] },
    { name: 'engineSteeringNotes', label: 'Engine/steering notes', type: 'textarea' },

    {
      name: 'environmentalCompliance',
      label: 'Environmental Compliance',
      type: 'checklist',
      helperText: 'Mark applicable items.',
      items: [
        "Vessel in compliance with company’s environmental procedure",
        'Shipboard personnel have appropriate environmental training',
        'MARPOL equipment status OK (OWS/OCM, ODMCS, Sewage plant, Incinerator, Garbage equipment, etc.)',
        'Oil record book / garbage record book updated and signed',
        'VGP records completed / NOI filed (if applicable)',
        'Minimum environmentally critical spares available onboard',
        'ETS followed and record updated in Jot ERP',
        'ROB of used/unused environmental seals matches Jot ERP ETS log',
      ],
    },
    { name: 'environmentalNotes', label: 'Environmental notes / concerns', type: 'textarea' },

    { name: 'remarks', label: 'Remarks (discrepancies / other notes)', type: 'textarea' },

    // Final certification sign-off
    { name: 'offSigningMasterName', label: 'Off-Signing Master - Name', type: 'text' },
    { name: 'offSigningMasterDate', label: 'Off-Signing Master - Date', type: 'date' },
    { name: 'onSigningMasterName', label: 'On-Signing Master - Name', type: 'text' },
    { name: 'onSigningMasterDate', label: 'On-Signing Master - Date', type: 'date' },
  ],
},

// ---------------- CRM502b ----------------
{
  code: 'CRM502b',
  title: "Chief Engineer’s Handover Report",
  description: 'Handover form for change of Chief Engineer.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'placeOfDisembarkation', label: 'Place of Disembarkation', type: 'text' },
    { name: 'timeOfHandover', label: 'Time of Handover', type: 'time' },
    { name: 'dateOfDisembarkation', label: 'Date of Disembarkation', type: 'date' },

    // Documents list (kept as a single checklist + remarks to avoid 30+ separate remark fields)
    {
      name: 'documentsChecklist',
      label: 'Documents / Records (confirm availability)',
      type: 'checklist',
      helperText: 'Tick items that are available/updated; use Remarks for details.',
      items: [
        'PMS records',
        'Engine room log book',
        'Fuel and lube oil records with ROB for all grades',
        'Records of surveys / quarterly listing / master list of surveyable items',
        'List of surveys due in the next three months',
        'Oil record book',
        'List of outstanding requisitions',
        'List of items landed for repair',
        "Maker’s service letters",
        'Inventory list of major spares',
        'Lube oil analysis reports',
        'FO analysis report',
        'Bunker receipts and BDN',
        'Defect list with action plan',
        'Dry dock specifications',
      ],
    },
    { name: 'documentsRemarks', label: 'Documents - Remarks', type: 'textarea' },

    { name: 'instructionBooksDrawings', label: 'Instruction Books / Drawings (attach list) - Notes', type: 'textarea' },
    { name: 'specialToolsMeasuring', label: 'Special Tools & Measuring Instruments (attach list) - Notes', type: 'textarea' },

    { name: 'machineryCondition', label: 'Machinery Condition (defective/poor items, reasons, measures taken)', type: 'textarea' },

    { name: 'presentCharterer', label: 'Present Charterer', type: 'text' },
    { name: 'chartererReportingInstructions', label: "Charterer’s Special Reporting Instructions", type: 'textarea' },
    { name: 'companySpecialInstructions', label: "Company's Special Instructions", type: 'textarea' },
    { name: 'bunkerStoresStatus', label: 'Status of Bunker / Stores Requirements', type: 'textarea' },
    { name: 'surveysNearFuture', label: 'Advise on Surveys in Near Future', type: 'textarea' },
    { name: 'specialAttentionItems', label: 'Machinery/Equipment needing special attention', type: 'textarea' },
    { name: 'otherComments', label: 'Other Comments', type: 'textarea' },

    { name: 'safetyWorkPlanningCommsRegulatory', label: 'Safety / Rest hours / Work planning / Communication / Regulatory / Audits / Accidents', type: 'textarea' },

    // Stock list summary (table is big; keep as text/textarea)
    { name: 'stockLists', label: 'Stock Lists (Fuel oil / Lubricants / Chemicals / Pressurised gases)', type: 'textarea' },

    // Fuel oil table (basic)
    { name: 'mdoQuantity', label: 'Marine Diesel Oil (MT)', type: 'number' },
    { name: 'mgoQuantity', label: 'Marine Gas Oil (MT)', type: 'number' },
    { name: 'freshWaterM3', label: 'Fresh Water (M3)', type: 'number' },

    // Major machinery summaries (as in form)
    { name: 'mainEngineSummary', label: 'Main Engine - Summary', type: 'textarea' },
    { name: 'auxEngineSummary', label: 'Auxiliary Engine - Summary', type: 'textarea' },
    { name: 'auxBoilerEgbSummary', label: 'Aux Boiler / EGB - Summary', type: 'textarea' },
    { name: 'compressorsSummary', label: 'Compressors - Summary', type: 'textarea' },
    { name: 'purifiersSummary', label: 'Purifiers - Summary', type: 'textarea' },
    { name: 'fwgSummary', label: 'FWG - Summary', type: 'textarea' },
    { name: 'pumpsSummary', label: 'Pumps - Summary', type: 'textarea' },
    { name: 'steeringGearSummary', label: 'Steering Gear - Summary', type: 'textarea' },
    { name: 'airconReferSummary', label: 'Air Con / Refer Plant - Summary', type: 'textarea' },
    { name: 'mgpsIccpSummary', label: 'MGPS / ICCP - Summary', type: 'textarea' },
    { name: 'marpolEquipSummary', label: 'MARPOL Equipment - Summary', type: 'textarea' },
    { name: 'safetyEquipSummary', label: 'Safety Equipment - Summary', type: 'textarea' },
    { name: 'deckMachinerySummary', label: 'Deck Machinery - Summary', type: 'textarea' },
    { name: 'systemsSummary', label: 'Systems (SW/Fuel/LO/Valves/Controllers) - Summary', type: 'textarea' },
    { name: 'sparesStatusSummary', label: 'Spares Status - Summary', type: 'textarea' },
    { name: 'manualReportFilingSummary', label: 'Manual/Report/Filing Status - Summary', type: 'textarea' },
    { name: 'pmsSystemSummary', label: 'PMS System - Summary', type: 'textarea' },
    { name: 'defectListPending', label: 'Defect List - Pending items & reason', type: 'textarea' },

    // Sign-off
    { name: 'offSigningChiefEngName', label: 'Off-Signing Chief Engineer - Name', type: 'text' },
    { name: 'offSigningChiefEngDate', label: 'Off-Signing Chief Engineer - Date', type: 'date' },
    { name: 'onSigningChiefEngName', label: 'On-Signing Chief Engineer - Name', type: 'text' },
    { name: 'onSigningChiefEngDate', label: 'On-Signing Chief Engineer - Date', type: 'date' },
  ],
},

// ---------------- CRM502d ----------------
{
  code: 'CRM502d',
  title: "Officer’s Handover Report",
  description: 'Handover notes for Officer/Engineer.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'placeOfDisembarkation', label: 'Place of Disembarkation', type: 'text' },
    { name: 'timeOfHandover', label: 'Time of Handover', type: 'time' },
    { name: 'dateOfDisembarkation', label: 'Date of Disembarkation', type: 'date' },

    { name: 'handoverNotes', label: 'Handover Notes', type: 'textarea', required: true },
    { name: 'additionalInformation', label: 'Additional Information', type: 'textarea' },

    { name: 'offSigningName', label: 'Off-Signing Officer/Engineer - Name', type: 'text' },
    { name: 'offSigningRank', label: 'Off-Signing Officer/Engineer - Rank', type: 'text' },
    { name: 'offSigningDate', label: 'Off-Signing Officer/Engineer - Date', type: 'date' },

    { name: 'onSigningName', label: 'On-Signing Officer/Engineer - Name', type: 'text' },
    { name: 'onSigningRank', label: 'On-Signing Officer/Engineer - Rank', type: 'text' },
    { name: 'onSigningDate', label: 'On-Signing Officer/Engineer - Date', type: 'date' },

    { name: 'masterChEngName', label: 'Master / Chief Engineer - Name', type: 'text' },
    { name: 'masterChEngDate', label: 'Master / Chief Engineer - Date', type: 'date' },
  ],
},
// ---------------- CRM502e ----------------
{
  code: 'CRM502e',
  title: "Second Engineer’s Handover Report",
  description:
    "To be sent to vessel’s Technical & Marine Superintendent (manning office in CC) prior to every change of Second Engineer.",
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'placeOfDisembarkation', label: 'Place of Disembarkation', type: 'text' },
    { name: 'timeOfHandover', label: 'Time of Handover', type: 'time' },
    { name: 'dateOfDisembarkation', label: 'Date of Disembarkation', type: 'date' },

    {
      name: 'engineRoomLogChecklist',
      label: 'ENGINE ROOM LOG (Availability)',
      type: 'checklist',
      items: ['Engine room log book', 'Environmental Management System (EMS) log'],
    },
    { name: 'engineRoomLogRemarks', label: 'ENGINE ROOM LOG - Remarks', type: 'textarea' },

    {
      name: 'maintenanceHistoryChecklist',
      label: 'MAINTENANCE HISTORY (Availability)',
      type: 'checklist',
      items: [
        "Maker’s instruction",
        'Service bulletins',
        'Maintenance report',
        'Maintenance and repair job report',
        'Defect list register',
      ],
    },
    { name: 'maintenanceHistoryRemarks', label: 'MAINTENANCE HISTORY - Remarks', type: 'textarea' },

    {
      name: 'recordChecklist',
      label: 'RECORD (Availability)',
      type: 'checklist',
      items: [
        'Stores inventory',
        'Spare parts inventory',
        'Safety equipment test record',
        'D/G and auxiliary machineries record',
      ],
    },
    { name: 'recordRemarks', label: 'RECORD - Remarks', type: 'textarea' },

    { name: 'manualsPublicationsList', label: 'List of Manuals & Publications (in Engine Room)', type: 'textarea' },

    {
      name: 'environmentalCompliance',
      label: 'ENVIRONMENTAL COMPLIANCE',
      type: 'checklist',
      items: [
        'Machinery space free of oil leaks; bilges clean with no accumulation',
        'Status of engine room bilges recorded (rate of accumulation/ingress if any)',
        'OWS fully operational; date last tested; present condition recorded',
        'OWS flanges sealed; overboard valve locked with two padlocks; seals record updated; key locations recorded',
        'Sewage plant fully operational; logs and calibration records available',
        'Air conditioning & refrigeration fully operational with no leaks',
        'Incinerator fully operational; usage/temperature/calibration records available',
        'PMS updated with no overdue jobs',
        'Chemicals stowed correctly; latest MSDS available',
        'Training on MARPOL equipment carried out and recorded',
        'Critical spares available onboard',
        'No oily water pumped overboard except through OWS',
        'Food waste/garbage disposed as per MARPOL Annex V',
        'All required lines sealed and tagged',
        'Uncontrolled hoses/portable pumps secured & locked; key with C/E; updated in ENV504b',
        'Engine room personnel trained on environmental policies/procedures and record keeping',
      ],
    },
    { name: 'environmentalComplianceRemarks', label: 'ENVIRONMENTAL COMPLIANCE - Remarks', type: 'textarea' },

    {
      name: 'detailedWriteUp',
      label: 'DETAILED WRITE-UP (must be enclosed)',
      type: 'checklist',
      items: [
        'General condition of machineries',
        'Deck machineries (mooring/windlass/hatch covers)',
        'Outstanding spare/store requisition',
        'Outstanding repair jobs & pending items per superintendent inspection report',
        'Deficiency list',
        'Operational difficulty (if any)',
        "Suggestions/inputs for next Master’s Review",
        'Items requiring urgent attention including requisitions raised',
      ],
    },
    { name: 'machineriesCondition', label: 'General condition of Machineries', type: 'textarea' },
    { name: 'deckMachineries', label: 'Deck Machineries (mooring/windlass/hatch covers)', type: 'textarea' },
    { name: 'outstandingRequisition', label: 'Outstanding spare/store requisition', type: 'textarea' },
    { name: 'outstandingRepairJobs', label: 'Outstanding repair jobs / pending items', type: 'textarea' },
    { name: 'deficiencyList', label: 'Deficiency list', type: 'textarea' },
    { name: 'operationalDifficulty', label: 'Operational difficulty (if any)', type: 'textarea' },
    { name: 'nextMasterReviewInputs', label: "Suggestions/inputs for next Master’s Review", type: 'textarea' },
    { name: 'urgentAttentionItems', label: 'Urgent attention items (incl. requisitions)', type: 'textarea' },

    // Sign-off
    { name: 'offSigningSecondEngineerName', label: 'Off-Signing Second Engineer - Name', type: 'text' },
    { name: 'offSigningSecondEngineerDate', label: 'Off-Signing Second Engineer - Date', type: 'date' },
    { name: 'offSigningSecondEngineerSignature', label: 'Off-Signing Second Engineer - Signature', type: 'text' },

    { name: 'onSigningSecondEngineerName', label: 'On-Signing Second Engineer - Name', type: 'text' },
    { name: 'onSigningSecondEngineerDate', label: 'On-Signing Second Engineer - Date', type: 'date' },
    { name: 'onSigningSecondEngineerSignature', label: 'On-Signing Second Engineer - Signature', type: 'text' },

    { name: 'chiefEngineerName', label: 'Chief Engineer - Name', type: 'text' },
    { name: 'chiefEngineerDate', label: 'Chief Engineer - Date', type: 'date' },
    { name: 'chiefEngineerSignature', label: 'Chief Engineer - Signature', type: 'text' },

    { name: 'masterName', label: 'Master - Name', type: 'text' },
    { name: 'masterDate', label: 'Master - Date', type: 'date' },
    { name: 'masterSignature', label: 'Master - Signature', type: 'text' },
  ],
},

// ---------------- CRM504a ----------------
{
  code: 'CRM504a',
  title: 'Appraisal – Master and Chief Engineer',
  description: 'Confidential performance appraisal on a 5-point scale (5 Outstanding → 1 Poor).',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'date', label: 'Date', type: 'date', required: true },

    // Confidential block
    { name: 'assessedName', label: 'Name', type: 'text', required: true },
    { name: 'rank', label: 'Rank', type: 'text', required: true },
    { name: 'companyId', label: 'Company ID', type: 'text' },
    { name: 'signOnDate', label: 'Sign On Date', type: 'date' },
    { name: 'signOffDate', label: 'Sign Off Date', type: 'date' },

    // Occasion
    {
      name: 'occasionForReport',
      label: 'Occasion for Report',
      type: 'select',
      options: ['Mid-term appraisal', 'End of term appraisal'],
    },
    { name: 'servingInPresentRankSince', label: 'Serving in present rank with company since', type: 'text' },
    { name: 'dateOfAssessment', label: 'Date of Assessment', type: 'date' },

    // Assessor
    {
      name: 'assessorRole',
      label: 'Assessor',
      type: 'select',
      options: ['Technical Superintendent', 'Fleet Manager'],
    },

    // Grades (1..5)
    {
      name: 'grades',
      label: 'Performance Grades (1–5)',
      type: 'checklist',
      helperText:
        'Use the fields below for scoring; this checklist is only a section marker (do not fill).',
      items: [],
    },

    // Keep each item as select for your current field types
    { name: 'gradeManagement', label: 'Management', type: 'select', options: ['1', '2', '3', '4', '5'] },
    { name: 'gradeCommercialManagement', label: 'Commercial Management', type: 'select', options: ['1', '2', '3', '4', '5'] },
    { name: 'gradeTechnicalManagement', label: 'Technical Management', type: 'select', options: ['1', '2', '3', '4', '5'] },
    { name: 'gradeSafetyQuality', label: 'Safety, Quality Management', type: 'select', options: ['1', '2', '3', '4', '5'] },
    { name: 'gradeNavigation', label: 'Navigation (N/A for Engr’s)', type: 'select', options: ['1', '2', '3', '4', '5'] },
    { name: 'gradeAdministrative', label: 'Administrative Management', type: 'select', options: ['1', '2', '3', '4', '5'] },
    { name: 'gradeCommunication', label: 'Communication Skills', type: 'select', options: ['1', '2', '3', '4', '5'] },
    { name: 'gradeEnglish', label: 'English Language', type: 'select', options: ['1', '2', '3', '4', '5'] },
    { name: 'gradeProjection', label: 'Projection', type: 'select', options: ['1', '2', '3', '4', '5'] },
    { name: 'gradeConduct', label: 'Conduct', type: 'select', options: ['1', '2', '3', '4', '5'] },
    { name: 'gradeJudgmentLeadership', label: 'Judgment and leadership', type: 'select', options: ['1', '2', '3', '4', '5'] },
    { name: 'gradeIntegrity', label: 'Integrity', type: 'select', options: ['1', '2', '3', '4', '5'] },
    { name: 'gradeStaffManagement', label: 'Staff Management', type: 'select', options: ['1', '2', '3', '4', '5'] },

    // Achievement
    { name: 'gradeAchievementPsc', label: 'Achievement: PSC', type: 'select', options: ['1', '2', '3', '4', '5'] },
    { name: 'gradeAchievementOwners', label: 'Achievement: Owners', type: 'select', options: ['1', '2', '3', '4', '5'] },
    { name: 'gradeAchievementLossPrevention', label: 'Achievement: Loss Prevention', type: 'select', options: ['1', '2', '3', '4', '5'] },
    { name: 'gradeAchievementAudits', label: 'Achievement: Audits', type: 'select', options: ['1', '2', '3', '4', '5'] },

    // Enthusiasm
    { name: 'gradeCustomerExpectations', label: 'Enthusiasm: Customer Expectations', type: 'select', options: ['1', '2', '3', '4', '5'] },
    { name: 'gradeHandsOnProactive', label: 'Enthusiasm: Hands On / Proactive Approach', type: 'select', options: ['1', '2', '3', '4', '5'] },

    { name: 'totalScore', label: 'Total Score', type: 'number' },
    { name: 'averageScore', label: 'Average score during service on board', type: 'number' },
    { name: 'previousScore', label: 'Previous score on board', type: 'number' },

    { name: 'summaryComments', label: 'Summary comments on performance', type: 'textarea' },
    { name: 'trainingNeeds', label: 'Training Needs', type: 'textarea' },

    {
      name: 'commercialManagementCriteriaFor',
      label: 'Commercial Management Criteria (Select One)',
      type: 'select',
      options: ['Master', 'Chief Engineer', 'Chief Officer', 'Second Engineer'],
    },

    // Sign-off
    { name: 'assessorName', label: 'Technical Superintendent / Fleet Manager - Name', type: 'text' },
    { name: 'assessorDate', label: 'Assessor - Date', type: 'date' },
    { name: 'assessorSignature', label: 'Assessor - Signature', type: 'text' },
  ],
},

// ---------------- CRM505a ----------------
{
  code: 'CRM505a',
  title: 'Training Record Form',
  description: 'Training/education record for onboard staff.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'department', label: 'Department', type: 'text' },

    {
      name: 'staffToBeTrained',
      label: 'Staff to be Educated/Trained (Name, Rank, Signature)',
      type: 'textarea',
      helperText: 'Enter one per line, e.g. "John Doe - 3/O - signed".',
    },

    { name: 'trainingField', label: 'In what field?', type: 'text' },
    { name: 'duration', label: 'Duration', type: 'text' },
    { name: 'briefDescription', label: 'Brief description of the training/education', type: 'textarea' },
    { name: 'supervisedBy', label: 'Training Activities supervised by', type: 'text' },
    { name: 'resultsComments', label: 'Results / Comments', type: 'textarea' },

    // Confirmation block
    { name: 'trainingSupervisorName', label: 'Training Supervisor - Name', type: 'text' },
    { name: 'trainingSupervisorDate', label: 'Training Supervisor - Date', type: 'date' },
    { name: 'trainingSupervisorSignature', label: 'Training Supervisor - Signature', type: 'text' },

    { name: 'masterName', label: 'Master - Name', type: 'text' },
    { name: 'masterDate', label: 'Master - Date', type: 'date' },
    { name: 'masterSignature', label: 'Master - Signature', type: 'text' },
  ],
},

// ---------------- CRM511 ----------------
{
  code: 'CRM511',
  title: 'Medical Locker Inventory',
  description:
    'Monthly medical locker inventory. The original sheet contains a big table; capture it as structured text for now.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'month', label: 'Month', type: 'text', helperText: 'e.g., Jan 2026' },

    {
      name: 'inventoryTable',
      label: 'Inventory Table (paste as CSV / text)',
      type: 'textarea',
      helperText:
        'Columns in sheet: Description | Vsls with 10 Persons | 20 Persons | 30 Persons | 40 Persons | Inventory | Expiry date | Location of Medicine',
    },

    { name: 'masterName', label: 'Master', type: 'text' },
    { name: 'secondOfficerName', label: '2nd Officer', type: 'text' },
    { name: 'date', label: 'Date', type: 'date' },
    { name: 'remarks', label: 'Remarks', type: 'textarea' },
  ],
},

// ---------------- ENV503a ----------------
{
  code: 'ENV503a',
  title: 'MARPOL Compliance Statement I',
  description: 'Company standing instructions regarding strict MARPOL compliance (for Master, C/E, 2/E).',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'date', label: 'Date', type: 'date', required: true },

    { name: 'masterName', label: 'Master - Name', type: 'text' },
    { name: 'masterRank', label: 'Master - Rank', type: 'text' },
    { name: 'masterSignature', label: 'Master - Signature', type: 'text' },
    { name: 'masterSignedDate', label: 'Master - Date', type: 'date' },

    { name: 'chiefEngineerName', label: 'Chief Engineer - Name', type: 'text' },
    { name: 'chiefEngineerRank', label: 'Chief Engineer - Rank', type: 'text' },
    { name: 'chiefEngineerSignature', label: 'Chief Engineer - Signature', type: 'text' },
    { name: 'chiefEngineerSignedDate', label: 'Chief Engineer - Date', type: 'date' },

    { name: 'secondEngineerName', label: 'Second Engineer - Name', type: 'text' },
    { name: 'secondEngineerRank', label: 'Second Engineer - Rank', type: 'text' },
    { name: 'secondEngineerSignature', label: 'Second Engineer - Signature', type: 'text' },
    { name: 'secondEngineerSignedDate', label: 'Second Engineer - Date', type: 'date' },
  ],
},

// ---------------- ENV503b ----------------
{
  code: 'ENV503b',
  title: 'MARPOL Compliance Statement II',
  description:
    'MARPOL compliance acknowledgement (for C/O, junior officers, engineers, ratings, trainees).',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'date', label: 'Date', type: 'date', required: true },

    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'rank', label: 'Rank', type: 'text', required: true },
    { name: 'signature', label: 'Signature', type: 'text' },
    { name: 'signedDate', label: 'Date', type: 'date' },

    {
      name: 'additionalSignatories',
      label: 'Additional signatories (optional)',
      type: 'textarea',
      helperText: 'If multiple people sign, list Name - Rank - Date per line.',
    },
  ],
},

// ---------------- ENV504e ----------------
{
  code: 'ENV504e',
  title: 'Monthly MARPOL Report',
  description: 'Monthly report of tank ROB, disposal, and equipment status.',
  fields: [
    { name: 'vesselName', label: 'Vessel name', type: 'text', required: true },
    { name: 'month', label: 'Month', type: 'text', required: true },

    // Tanks
    { name: 'bilgeHoldingCapacity', label: 'Bilge Holding Tank - Total Capacity (m3)', type: 'number' },
    { name: 'bilgeHoldingRob', label: 'Bilge Holding Tank - ROB (m3)', type: 'number' },
    { name: 'bilgeHoldingRemarks', label: 'Bilge Holding Tank - Remarks', type: 'text' },

    { name: 'separatedBilgeOilCapacity', label: 'Separated Bilge Oil Tank - Total Capacity (m3)', type: 'number' },
    { name: 'separatedBilgeOilRob', label: 'Separated Bilge Oil Tank - ROB (m3)', type: 'number' },
    { name: 'separatedBilgeOilRemarks', label: 'Separated Bilge Oil Tank - Remarks', type: 'text' },

    { name: 'foSludgeCapacity', label: 'F.O. Sludge Tank - Total Capacity (m3)', type: 'number' },
    { name: 'foSludgeRob', label: 'F.O. Sludge Tank - ROB (m3)', type: 'number' },
    { name: 'foSludgeRemarks', label: 'F.O. Sludge Tank - Remarks', type: 'text' },

    { name: 'loSludgeCapacity', label: 'L.O. Sludge Tank - Total Capacity (m3)', type: 'number' },
    { name: 'loSludgeRob', label: 'L.O. Sludge Tank - ROB (m3)', type: 'number' },
    { name: 'loSludgeRemarks', label: 'L.O. Sludge Tank - Remarks', type: 'text' },

    { name: 'incWasteOilCapacity', label: 'Incinerator Waste Oil Tank - Total Capacity (m3)', type: 'number' },
    { name: 'incWasteOilRob', label: 'Incinerator Waste Oil Tank - ROB (m3)', type: 'number' },
    { name: 'incWasteOilRemarks', label: 'Incinerator Waste Oil Tank - Remarks', type: 'text' },

    // Disposal
    { name: 'sludgeDisposalDatePort', label: 'Sludge Disposal - Date/Port of last disposal', type: 'text' },
    { name: 'sludgeDisposalQty', label: 'Sludge Disposal - Quantity (m3)', type: 'number' },
    { name: 'sludgeDisposalRemarks', label: 'Sludge Disposal - Remarks', type: 'text' },

    { name: 'bilgeWaterDisposalDatePort', label: 'Bilge Water Disposal - Date/Port of last disposal', type: 'text' },
    { name: 'bilgeWaterDisposalQty', label: 'Bilge Water Disposal - Quantity (m3)', type: 'number' },
    { name: 'bilgeWaterDisposalRemarks', label: 'Bilge Water Disposal - Remarks', type: 'text' },

    { name: 'slopDisposalDatePort', label: 'Slop Disposal - Date/Port of last disposal', type: 'text' },
    { name: 'slopDisposalQty', label: 'Slop Disposal - Quantity (m3)', type: 'number' },
    { name: 'slopDisposalRemarks', label: 'Slop Disposal - Remarks', type: 'text' },

    { name: 'garbageDisposalDatePort', label: 'Garbage Disposal - Date/Port of last disposal', type: 'text' },
    { name: 'garbageDisposalQty', label: 'Garbage Disposal - Quantity (m3)', type: 'number' },
    { name: 'garbageDisposalRemarks', label: 'Garbage Disposal - Remarks', type: 'text' },

    // Equipment status
    { name: 'owsOperational', label: 'Oily Water Separator - Operational (Yes/No)', type: 'select', options: ['Yes', 'No'] },
    { name: 'owsLastMaintenance', label: 'Oily Water Separator - Last maintenance date', type: 'date' },
    { name: 'owsRemarks', label: 'Oily Water Separator - Remarks', type: 'text' },

    { name: 'incineratorOperational', label: 'Incinerator - Operational (Yes/No)', type: 'select', options: ['Yes', 'No'] },
    { name: 'incineratorLastMaintenance', label: 'Incinerator - Last maintenance date', type: 'date' },
    { name: 'incineratorRemarks', label: 'Incinerator - Remarks', type: 'text' },

    { name: 'stpOperational', label: 'Sewage Treatment plant - Operational (Yes/No)', type: 'select', options: ['Yes', 'No'] },
    { name: 'stpLastMaintenance', label: 'Sewage Treatment plant - Last maintenance date', type: 'date' },
    { name: 'stpRemarks', label: 'Sewage Treatment plant - Remarks', type: 'text' },

    { name: 'odmcsOperational', label: 'ODMCS - Operational (Yes/No)', type: 'select', options: ['Yes', 'No'] },
    { name: 'odmcsLastMaintenance', label: 'ODMCS - Last maintenance date', type: 'date' },
    { name: 'odmcsRemarks', label: 'ODMCS - Remarks', type: 'text' },

    // Sign-off
    { name: 'masterName', label: 'Master - Name', type: 'text' },
    { name: 'masterDate', label: 'Master - Date', type: 'date' },
    { name: 'masterSignature', label: 'Master - Signature', type: 'text' },

    { name: 'chiefEngineerName', label: 'Chief Engineer - Name', type: 'text' },
    { name: 'chiefEngineerDate', label: 'Chief Engineer - Date', type: 'date' },
    { name: 'chiefEngineerSignature', label: 'Chief Engineer - Signature', type: 'text' },
  ],
},

// ---------------- ENV509a ----------------
{
  code: 'ENV509a',
  title: 'Ozone Depleting Substances Monthly Record',
  description:
    'Keep separate sheet per refrigeration system with 3kg+ refrigerant. Tables captured as text for now.',
  fields: [
    { name: 'shipsName', label: "Ship's Name", type: 'text', required: true },
    { name: 'imoNo', label: 'IMO No.', type: 'text' },
    { name: 'plantName', label: 'Plant Name', type: 'text', required: true },
    { name: 'referenceNo', label: 'Reference No.', type: 'text' },
    { name: 'locationOfPlant', label: 'Location of plant', type: 'text' },
    { name: 'companyOperatorName', label: "Company and operator’s name", type: 'text' },
    { name: 'coolingLoadsServed', label: 'Cooling loads served', type: 'text' },
    { name: 'refrigerantType', label: 'Refrigerant Type', type: 'text' },
    { name: 'refrigerantQuantityKg', label: 'Refrigerant Quantity (kg)', type: 'number' },
    { name: 'plantManufacturer', label: 'Plant manufacturer', type: 'text' },
    { name: 'yearOfInstallation', label: 'Year of installation', type: 'text' },

    { name: 'refrigerantAdditions', label: 'Refrigerant Additions (Date | Engineer/Company | Amount kg | Reason)', type: 'textarea' },
    { name: 'refrigerantRemovals', label: 'Refrigerant Removals (Date | Engineer/Company | Amount removed kg | Reason / What done)', type: 'textarea' },
    { name: 'maintenanceLeakTests', label: 'Maintenance & Leak Tests (Date | Engineer/Company | Details/Result | Follow-up required)', type: 'textarea' },
    { name: 'followUpActions', label: 'Follow-up Actions (Date | Engineer/Company | Related to test on | Actions Taken)', type: 'textarea' },
    { name: 'autoLeakDetectionTests', label: 'Testing of Automatic Leak Detection System (Date | Engineer/Company | Test Result | Comments)', type: 'textarea' },

    { name: 'chiefEngineerName', label: 'Chief Engineer - Name', type: 'text' },
    { name: 'chiefEngineerDate', label: 'Chief Engineer - Date', type: 'date' },
    { name: 'chiefEngineerSignature', label: 'Chief Engineer - Signature', type: 'text' },
  ],
},

// ---------------- ENV512b ----------------
{
  code: 'ENV512b',
  title: 'Declaration – Non Use of Material Containing Asbestos',
  description: 'Declaration that no new asbestos-containing materials were installed for listed products during the period.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'classNumber', label: 'Class Number', type: 'text' },
    { name: 'imoNumber', label: 'IMO Number', type: 'text' },

    { name: 'periodFrom', label: 'From (Last periodical survey)', type: 'date' },
    { name: 'periodTo', label: 'To', type: 'date' },

    { name: 'name', label: 'Name', type: 'text' },
    { name: 'rank', label: 'Rank', type: 'text' },
    { name: 'signature', label: 'Signature', type: 'text' },
    { name: 'shipStamp', label: 'Ship Stamp', type: 'text' },
    { name: 'place', label: 'Place', type: 'text' },
    { name: 'date', label: 'Date', type: 'date' },

    {
      name: 'productsList',
      label: 'Product(s) / Type Name',
      type: 'textarea',
      helperText: 'Enter one product/type per line (reference document no. if available).',
    },
  ],
},

// ---------------- ENV512c ----------------
{
  code: 'ENV512c',
  title: "Supplier’s Material Declaration (Asbestos)",
  description: 'Supplier declaration that asbestos is not contained in listed products.',
  fields: [
    { name: 'ref', label: 'Ref', type: 'text' },
    { name: 'manufacturedOnOrAfter', label: 'Manufactured on or after (dd/mm/yy)', type: 'text' },
    { name: 'deliveredOn', label: 'Delivered on (dd/mm/yy)', type: 'text' },

    { name: 'companyName', label: "Company’s Name", type: 'text', required: true },

    {
      name: 'productsList',
      label: 'Product(s) / Type Name',
      type: 'textarea',
      helperText: 'Enter one product/type per line.',
    },

    { name: 'placeOfIssue', label: 'Place of issue', type: 'text' },
    { name: 'dateOfIssue', label: 'Date of issue', type: 'date' },
    { name: 'nameRank', label: 'Name & Rank', type: 'text' },
    { name: 'sign', label: 'Sign', type: 'text' },
  ],
},
// ---------------- PMS001 ----------------
{
  code: 'PMS001',
  title: 'Auxiliary Engine Maintenance Record',
  description: 'Auxiliary Engine maintenance summary and key routines/overhauls.',
  fields: [
    { name: 'vesselName', label: 'Vessel name', type: 'text', required: true },
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'make', label: 'Make', type: 'text' },
    { name: 'type', label: 'Type', type: 'text' },

    { name: 'aeRunningHoursStandard', label: 'Auxiliary engines running hours / standard hrs', type: 'text' },

    { name: 'ae1Summary', label: 'Aux Engine No. 1 - Summary (running hours, last overhaul, routines etc.)', type: 'textarea', helperText: 'Enter as text or CSV-like lines: Item | Date | Hours since | Notes' },
    { name: 'ae2Summary', label: 'Aux Engine No. 2 - Summary (running hours, last overhaul, routines etc.)', type: 'textarea', helperText: 'Enter as text or CSV-like lines: Item | Date | Hours since | Notes' },
    { name: 'ae3Summary', label: 'Aux Engine No. 3 - Summary (running hours, last overhaul, routines etc.)', type: 'textarea', helperText: 'Enter as text or CSV-like lines: Item | Date | Hours since | Notes' },

    { name: 'alarmsTripsTrialDate', label: 'Alarms/ trips trial (once monthly) - Date', type: 'date' },
    {
      name: 'alarmsTripsTrialNumbers',
      label: 'Alarms/ trips trial - Numbers tried out (1..8)',
      type: 'checklist',
      items: ['1', '2', '3', '4', '5', '6', '7', '8'],
    },

    { name: 'mainBearingsRenewal', label: 'Main bearings renewal (AE1/AE2/AE3 - Date & hours since)', type: 'textarea' },
    { name: 'bigEndBearingsRenewal', label: 'Big end bearings renewal (AE1/AE2/AE3 - Date & hours since)', type: 'textarea' },
    { name: 'connectingRodRenewal', label: 'Connecting rod renewal (AE1/AE2/AE3 - Date & hours since)', type: 'textarea' },

    { name: 'secondEngineerName', label: 'Second Engineer - Name', type: 'text' },
    { name: 'secondEngineerDate', label: 'Second Engineer - Date', type: 'date' },
    { name: 'chiefEngineerName', label: 'Chief Engineer - Name', type: 'text' },
    { name: 'chiefEngineerDate', label: 'Chief Engineer - Date', type: 'date' },
  ],
},

// ---------------- PMS002 ----------------
{
  code: 'PMS002',
  title: 'Auxiliary Engine Performance Report',
  description: 'Auxiliary engine performance parameters, fuel data, and cylinder power balance.',
  fields: [
    { name: 'vesselName', label: 'Vessel name', type: 'text', required: true },
    { name: 'date', label: 'Date', type: 'date', required: true },

    { name: 'auxEngineModel', label: 'Auxiliary engine model', type: 'text' },
    { name: 'make', label: 'Make of A/E', type: 'text' },
    { name: 'typeTurbocharger', label: 'Type of Turbocharger', type: 'text' },
    { name: 'aeNumber', label: 'A/E Number', type: 'text' },

    { name: 'totalWorkingHours', label: 'Total working hours', type: 'number' },
    { name: 'rpm', label: 'RPM', type: 'number' },
    { name: 'enginePowerKw', label: 'Engine power (kW)', type: 'number' },

    { name: 'switchboardRatedLoadKw', label: 'Switchboard Rated load alternator (kW)', type: 'number' },
    { name: 'switchboardActualLoadKw', label: 'Switchboard Actual load (kW)', type: 'number' },
    { name: 'loadPercent', label: 'Load %', type: 'number' },
    { name: 'actualAmp', label: 'Actual amp (A)', type: 'number' },

    { name: 'hoursSinceLastOverhaul', label: 'Hours since last overhaul - Summary', type: 'textarea', helperText: 'Piston, FO injector, FO injector pump, suction valve, exhaust valve, T/C water washing, T/C bearing renewal etc.' },

    { name: 'filtersLastOverhaul', label: 'Filters (Date of last overhaul) - Summary', type: 'textarea', helperText: 'L.O Filter(L/R), T/C LO filter, F.O filter(engine-side) etc.' },

    { name: 'ambientConditions', label: 'Ambient conditions - Summary', type: 'textarea', helperText: 'Cooling water inlet temp, Engine room air inlet temp, Barometric pressure etc.' },

    { name: 'turboChargerData', label: 'Turbocharger / Charge Air - Summary', type: 'textarea' },
    { name: 'coolingWaterSystem', label: 'Cooling Water System - Summary', type: 'textarea' },
    { name: 'lubeOilSystem', label: 'Lube Oil System - Summary', type: 'textarea' },
    { name: 'fuelOilData', label: 'Fuel Oil Data - Summary', type: 'textarea', helperText: 'Grade cSt, density@15C, sulphur %, LCV, FO consumption/day, FO inlet bar/temp, SFOC etc.' },

    { name: 'powerBalanceCylinderData', label: 'Power balance (Cylinder Data) table', type: 'textarea', helperText: 'Enter rows: CylinderNo | Pmax(bar) | PumpIndex(mm) | ExhaustTemp(C) | CoolingFWOutlet(C)' },

    { name: 'fuelConsumptionCalculation', label: 'Fuel Consumption Calculation during A.E. Performance', type: 'textarea', helperText: 'Enter: Time duration, start litres, Lt/h, flowmeter etc.' },

    { name: 'secondEngineerName', label: 'Second Engineer - Name', type: 'text' },
    { name: 'secondEngineerDate', label: 'Second Engineer - Date', type: 'date' },
    { name: 'chiefEngineerName', label: 'Chief Engineer - Name', type: 'text' },
    { name: 'chiefEngineerDate', label: 'Chief Engineer - Date', type: 'date' },
  ],
},

// ---------------- PMS003 ----------------
{
  code: 'PMS003',
  title: 'Bearing Measurement Report',
  description: 'Parts A–D bearing measurement report (bridge gauge, clearances, crosshead, crankpin).',
  fields: [
    { name: 'vesselName', label: 'Vessel name', type: 'text', required: true },
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'port', label: 'Port', type: 'text' },
    { name: 'engineType', label: 'Engine type', type: 'text' },
    { name: 'engineNo', label: 'Main Engine / Aux eng no.', type: 'text' },

    { name: 'draftForward', label: 'Draft F', type: 'text' },
    { name: 'draftAft', label: 'Draft A', type: 'text' },
    { name: 'trim', label: 'Trim', type: 'text' },

    { name: 'dateLastReportPartA', label: 'Date last report - Part A', type: 'date' },
    { name: 'dateLastReportPartB', label: 'Date last report - Part B', type: 'date' },
    { name: 'dateLastReportPartC', label: 'Date last report - Part C', type: 'date' },
    { name: 'dateLastReportPartD', label: 'Date last report - Part D', type: 'date' },

    { name: 'partAData', label: "PART A - Bridge gauge readings (Original/New/Wear down)", type: 'textarea', helperText: 'Unit = 1/100 mm. Enter as table text for bearings 1..11.' },
    { name: 'partBData', label: "PART B - Main bearings clearances (Leads/Feeler gauge)", type: 'textarea', helperText: 'Enter Original/New (F/A) for bearings 1..11.' },
    { name: 'partCData', label: "PART C - Crosshead bearings + Guide/Shoe clearances", type: 'textarea', helperText: 'Enter Original/New (F/A) + Guide/Shoe (F+A, P+S) for units 1..9.' },
    { name: 'partDData', label: "PART D - Crankpin bearing clearances (F/A)", type: 'textarea', helperText: 'Enter Original/New (F/A) for units 1..9.' },

    { name: 'chiefEngineerName', label: 'Chief Engineer - Name', type: 'text' },
    { name: 'chiefEngineerDate', label: 'Chief Engineer - Date', type: 'date' },
  ],
},

// ---------------- PMS004 ----------------
{
  code: 'PMS004',
  title: 'Crank Web Deflection',
  description: 'Crank web deflection readings at positions A–E (per cylinder).',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'engineType', label: 'Type of Engine', type: 'text' },
    { name: 'port', label: 'Port', type: 'text' },
    { name: 'engineNo', label: 'Main Engine / Aux Engine No.', type: 'text' },
    { name: 'dateLastDeflectionTaken', label: 'Date Last Deflection Taken', type: 'date' },

    { name: 'draftForward', label: 'Draught Forward', type: 'text' },
    { name: 'draftAft', label: 'Draught Aft', type: 'text' },
    { name: 'trim', label: 'Trim', type: 'text' },

    { name: 'engineStrokeMm', label: 'Engine Stroke (mm)', type: 'number' },
    { name: 'crankcaseTempDegC', label: 'Crankcase temperature (Deg C)', type: 'number' },

    { name: 'deflectionTable', label: 'Crankpin positions A–E readings table', type: 'textarea', helperText: 'Enter as: CylinderNo | A | B | C | D | E | Max Deflection. Note + for opening, - for closing.' },

    { name: 'chiefEngineerName', label: 'Chief Engineer - Name', type: 'text' },
    { name: 'chiefEngineerSignature', label: 'Chief Engineer - Signature', type: 'text' },
  ],
},

// ---------------- PMS005 ----------------
{
  code: 'PMS005',
  title: 'Critical Equipment Testing',
  description: 'Try-out record for critical equipment with multiple test dates and remarks.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },

    { name: 'testDates', label: 'Test Dates (list)', type: 'textarea', helperText: 'Enter the column dates used (e.g., Date1, Date2, Date3...).' },

    { name: 'equipmentTestingTable', label: 'Equipment Testing Table', type: 'textarea', helperText: 'Enter rows: Equipment | Date1 | Date2 | Date3 | Date4 | Date5 | Remarks' },

    { name: 'chiefEngineerName', label: 'Chief Engineer - Name', type: 'text' },
    { name: 'masterName', label: 'Master - Name', type: 'text' },
  ],
},

// ---------------- PMS008 ----------------
{
  code: 'PMS008',
  title: 'Main Engine Exhaust Valve Overhaul Record',
  description: 'Monthly exhaust valve overhaul tracking (valve body/spindle/seat, measurements, spares).',
  fields: [
    { name: 'vesselName', label: 'Vessel', type: 'text', required: true },
    { name: 'month', label: 'Month', type: 'text', required: true },
    { name: 'mainEngineType', label: 'Main engine type', type: 'text' },

    { name: 'valveRecordsTable', label: 'Valve Records (Body 1..9)', type: 'textarea', helperText: 'Enter as table text: BodyNo | Present position | RH since new | RH since last overhaul | Date installed | Spindle No | Seat No | Bush measurements | Burn-away readings A-E | Grinding stem G1/G2/G3 | Remarks' },

    { name: 'overhaulDetails', label: 'Overhaul details (Dates + actions)', type: 'textarea' },
    { name: 'sparesUsed', label: 'Spares Used', type: 'textarea' },
    { name: 'remarks', label: 'Remarks', type: 'textarea' },

    { name: 'chiefEngineerName', label: 'Chief Engineer - Name', type: 'text' },
    { name: 'chiefEngineerDate', label: 'Chief Engineer - Date', type: 'date' },
  ],
},

// ---------------- PMS010 ----------------
{
  code: 'PMS010',
  title: 'Main Engine Maintenance Record',
  description: 'Main engine maintenance summary for Units 1..6 and key inspections/routines.',
  fields: [
    { name: 'vesselName', label: 'Vessel name', type: 'text', required: true },
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'mainEngine', label: 'Main Engine', type: 'text' },
    { name: 'type', label: 'Type', type: 'text' },

    { name: 'meRunningHoursThisMonth', label: 'ME running hours this month', type: 'number' },
    { name: 'meTotalRunningHours', label: 'ME total running hours', type: 'number' },

    { name: 'unitMaintenanceTable', label: 'Unit #1..#6 Maintenance Table', type: 'textarea', helperText: 'Enter as table text for each item: Last overhaul, Piston OHD, Exhaust valve OHD, Fuel injectors test, Start air valve OHD, Indicator valve, Safety valve, Fuel pump OHD etc. Include Date + Hours since.' },

    { name: 'crankCamInspection', label: 'Crank case / cam case inspection (Date + Hours since)', type: 'textarea' },
    { name: 'crankshaftDeflection', label: 'Crankshaft deflection (once in 3 months) (Date + Hours since)', type: 'textarea' },
    { name: 'scavengeCleaning', label: 'Scavenge cleaning/inspection (Date + Hours since)', type: 'textarea' },
    { name: 'alarmsTripsTryOut', label: 'Alarms/trips try out (monthly) (Date + Hours since)', type: 'textarea' },

    { name: 'airCooler', label: 'Air cooler (Last cleaned hours/date; Air side; SW side)', type: 'textarea' },
    { name: 'turbocharger', label: 'Turbocharger (inspection/cleaning; air filter; overhaul & cleaning; turbine side)', type: 'textarea' },
    { name: 'governorChainDrive', label: 'Governor / Chain Drive (last overhauled, inspected, oil renewed, tightened)', type: 'textarea' },

    { name: 'secondEngineerName', label: 'Second Engineer - Name', type: 'text' },
    { name: 'secondEngineerDate', label: 'Second Engineer - Date', type: 'date' },
    { name: 'chiefEngineerName', label: 'Chief Engineer - Name', type: 'text' },
    { name: 'chiefEngineerDate', label: 'Chief Engineer - Date', type: 'date' },
  ],
},

// ---------------- PMS014 ----------------
{
  code: 'PMS014',
  title: 'ME Cylinder Calibration Report',
  description: 'Cylinder liner calibration readings (Present/Previous/Initial) and wear tracking.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'mainEngineType', label: 'Main Engine Type', type: 'text' },
    { name: 'cylinderNoFromForward', label: 'Cylinder No. (From Forward)', type: 'number' },

    { name: 'linerType', label: 'Liner Type', type: 'select', options: ['Chrome Plated Liner', 'Cast-Iron Liner'] },

    { name: 'calibrationTable', label: 'Calibration Table (positions + readings)', type: 'textarea', helperText: 'Enter rows: Position No | mm from top | Present F/A | Present P/S | Previous F/A | Previous P/S | Initial F/A | Initial P/S' },

    { name: 'linerTemperatureDegC', label: 'Liner Temperature (Deg C)', type: 'number' },
    { name: 'linerManufacturerName', label: 'Liner Manufacturer Name', type: 'text' },
    { name: 'cylinderOilInUse', label: 'Cylinder Oil in use at time of calibration', type: 'text' },
    { name: 'linerStamp', label: 'Liner Stamp', type: 'text' },
    { name: 'portOfCalibration', label: 'Port of Calibration', type: 'text' },
    { name: 'dateLinerInstalled', label: 'Date Liner Installed', type: 'date' },

    { name: 'totalRunningHours', label: 'Total Running Hours', type: 'number' },
    { name: 'meRunningHoursOnInstallDate', label: 'ME Running Hours on date liner installed (On engine)', type: 'number' },
    { name: 'linerRunningHoursOnInstallDate', label: 'ME Running Hours on date liner installed (On liner)', type: 'number' },

    { name: 'presentCylinderOilConsumption', label: 'Present Cylinder Oil Consumption', type: 'textarea', helperText: 'Enter: Running hours | Grms/Bhp/Hr | Ltrs/Day' },

    { name: 'wearSummary', label: 'Wear Summary (Since New / Since Previous Calibration)', type: 'textarea', helperText: 'Enter max wear, wear rates etc.' },

    { name: 'linerConditionWall', label: 'Description of liner parts - Wall', type: 'textarea' },
    { name: 'linerConditionPorts', label: 'Description of liner parts - Ports', type: 'textarea' },
    { name: 'linerConditionOilQuills', label: 'Description of liner parts - Oil Quills', type: 'textarea' },
    { name: 'linerConditionOilGrooves', label: 'Description of liner parts - Oil Grooves', type: 'textarea' },

    { name: 'reasonForOpeningCylinder', label: 'Reason for opening up cylinder', type: 'textarea' },
    { name: 'remarks', label: 'Remarks', type: 'textarea' },
    { name: 'maxLinerWearAllowed', label: 'Max. Liner Wear Allowed', type: 'text' },
    { name: 'maxOvalityAllowed', label: 'Max. Ovality Allowed', type: 'text' },

    { name: 'chiefEngineerName', label: 'Chief Engineer - Name', type: 'text' },
    { name: 'chiefEngineerSignature', label: 'Chief Engineer - Signature', type: 'text' },
  ],
},

// ---------------- PMS015 ----------------
{
  code: 'PMS015',
  title: 'Megger Test Report',
  description: 'Megger insulation resistance readings table.',
  fields: [
    { name: 'vesselName', label: 'Vessel name', type: 'text', required: true },
    { name: 'date', label: 'Date', type: 'date', required: true },

    { name: 'meggerReadingsTable', label: 'Megger Readings Table', type: 'textarea', helperText: 'Enter rows: Unit measured | Last overhauled | Reading taken of/between | Meg Ohms' },

    { name: 'electricianName', label: 'Electrician - Name', type: 'text' },
    { name: 'electricianDate', label: 'Electrician - Date', type: 'date' },

    { name: 'chiefEngineerName', label: 'Chief Engineer - Name', type: 'text' },
    { name: 'chiefEngineerDate', label: 'Chief Engineer - Date', type: 'date' },
  ],
},

// ---------------- PMS016 ----------------
{
  code: 'PMS016',
  title: 'Monthly Engine Abstract',
  description: 'Monthly engine abstract (multi-sheet). Enter key cover info + paste sheet summaries/tables.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'month', label: 'Month', type: 'text', required: true },
    { name: 'year', label: 'Year', type: 'number', required: true },
    { name: 'propellerPitch', label: 'Propeller Pitch', type: 'text' },
    { name: 'chiefEngineerName', label: 'Chief Engineer', type: 'text' },
    { name: 'masterName', label: 'Master', type: 'text' },

    { name: 'laPage2VoyageNoonReport', label: 'LA Pg 2 - Voyage / Noon report table', type: 'textarea' },
    { name: 'laPage3', label: 'LA Pg 3 - Summary table', type: 'textarea' },
    { name: 'laPage4', label: 'LA Pg 4 - Summary table', type: 'textarea' },
    { name: 'laPage5', label: 'LA Pg 5 - Summary table', type: 'textarea' },
    { name: 'laPage6', label: 'LA Pg 6 - Summary table', type: 'textarea' },
    { name: 'laPage7', label: 'LA Pg 7 - Summary table', type: 'textarea' },
    { name: 'laPage8', label: 'LA Pg 8 - Summary table', type: 'textarea' },
    { name: 'laPage8A', label: 'LA Pg 8A - Summary table', type: 'textarea' },
    { name: 'pg9', label: 'PG 9 - Summary table', type: 'textarea' },

    { name: 'mainEngineSheet', label: 'Main Engine - Running hour record / maintenance table', type: 'textarea' },
    { name: 'ae1Sheet', label: 'AE(1) - Running hour record / maintenance table', type: 'textarea' },
    { name: 'ae2Sheet', label: 'AE(2) - Running hour record / maintenance table', type: 'textarea' },
    { name: 'ae3Sheet', label: 'AE(3) - Running hour record / maintenance table', type: 'textarea' },
    { name: 'ae4Sheet', label: 'AE(4) - Running hour record / maintenance table', type: 'textarea' },

    { name: 'airCompressorSheet', label: 'Air Compressor - Summary table', type: 'textarea' },
    { name: 'purifiersSheet', label: 'Purifiers - Summary table', type: 'textarea' },

    { name: 'remarks', label: 'Remarks', type: 'textarea' },
  ],
},
// ---------------- PMS017 ----------------
{
  code: 'PMS017',
  title: 'Monthly Main Engine Performance Report',
  description: 'Monthly performance report + indicator diagram results + turbocharger data.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'time', label: 'Time', type: 'time' },
    { name: 'reportFrom', label: 'Report From', type: 'text' },
    { name: 'reportTo', label: 'Report To', type: 'text' },

    { name: 'buildYear', label: 'Build Year', type: 'text' },
    { name: 'yardNumber', label: 'Yard Number', type: 'text' },
    { name: 'builder', label: 'Builder', type: 'text' },

    { name: 'engineType', label: 'Engine Type', type: 'text' },
    { name: 'boreM', label: 'Bore (M)', type: 'text' },
    { name: 'strokeM', label: 'Stroke (M)', type: 'text' },
    { name: 'ncrRpm', label: 'NCR RPM', type: 'text' },
    { name: 'mcrRpm', label: 'MCR RPM', type: 'text' },
    { name: 'mcrBhp', label: 'MCR BHP', type: 'text' },
    { name: 'ncrBhp', label: 'NCR BHP', type: 'text' },

    { name: 'engineRevolutionRpm', label: 'Engine Revolution (RPM)', type: 'text' },
    { name: 'shaftRevolutionRpm', label: 'Shaft Revolution (RPM)', type: 'text' },
    { name: 'engineControlPosition', label: 'Engine Control (Position)', type: 'text' },
    { name: 'loadIndicatorPosition', label: 'Load Indicator (Position)', type: 'text' },

    { name: 'shipSpeedKts', label: 'Ship Speed (Kts)', type: 'text' },
    { name: 'engineSpeedKts', label: 'Engine Speed (Kts)', type: 'text' },
    { name: 'slipPercent', label: 'Slip (%)', type: 'text' },
    { name: 'shaftGeneratorLoadKw', label: 'Shaft Generator Load (kW)', type: 'text' },

    { name: 'correspondentDisplTons', label: 'Correspondent Displ (Tons)', type: 'text' },
    { name: 'draftForwardM', label: 'Draft Forward (M)', type: 'text' },
    { name: 'draftAftM', label: 'Draft Aft (M)', type: 'text' },
    { name: 'draftMeanM', label: 'Draft Mean (M)', type: 'text' },

    { name: 'swellHeight', label: 'Swell Height', type: 'text' },
    { name: 'seaHeight', label: 'Sea Height', type: 'text' },
    { name: 'atmosphericPressure', label: 'Atmospheric Pressure', type: 'text' },
    { name: 'windForce', label: 'Wind Force', type: 'text' },
    { name: 'windDirection', label: 'Wind Direction', type: 'text' },
    {
      name: 'ballastOrLaden',
      label: 'Ballast / Laden',
      type: 'select',
      options: ['Ballast', 'Laden'],
    },

    {
      name: 'indicatorDiagramResultTable',
      label: 'Indicator Diagram Result (Cylinder table)',
      type: 'textarea',
      helperText:
        'Paste/enter table rows: Cylinder | P Com | P Max | MEP | BHP | Exh Temp | Jacket Outlet | Piston Outlet | Fuel Rack Index | Rack Adjustment | Total Running Hrs',
    },

    { name: 'turbochargerLastOverhaul', label: 'Turbocharger Last Overhaul (No.1..No.4)', type: 'textarea' },
    { name: 'airCoolerLastCleaned', label: 'Air Cooler Last Cleaned SW/Air (No.1..No.4)', type: 'textarea' },

    { name: 'washingFrequencyBlowerDays', label: 'Frequency of Washing T/C - Blower Side (Days)', type: 'text' },
    { name: 'washingFrequencyTurbineDays', label: 'Frequency of Washing T/C - Turbine Side (Days)', type: 'text' },

    { name: 'fuelOilConsumptionMtDay', label: 'Fuel Oil Consumption (MT/Day)', type: 'text' },
    { name: 'fuelOilConsumptionGmBhpHr', label: 'Fuel Oil Consumption (Gm/Bhp/Hr)', type: 'text' },
    { name: 'lubeOilConsumptionMtDay', label: 'Lube Oil Consumption (MT/Day)', type: 'text' },
    { name: 'cylinderOilConsumptionMtDay', label: 'Cylinder Oil Consumption (MT/Day)', type: 'text' },
    { name: 'cylinderOilConsumptionGmBhpHr', label: 'Cylinder Oil Consumption (Gm/Bhp/Hr)', type: 'text' },

    // Fuel Specifications
    { name: 'fuelViscosityAt50c', label: 'Fuel Spec: Viscosity @ 50°C', type: 'text' },
    { name: 'fuelDensityAt15c', label: 'Fuel Spec: Density @ 15°C (Kg/Cm3)', type: 'text' },
    { name: 'fuelWaterContentVol', label: 'Fuel Spec: Water Content (Vol %)', type: 'text' },
    { name: 'fuelSulphurContentMass', label: 'Fuel Spec: Sulphur Content (Mass %)', type: 'text' },
    { name: 'fuelFlashPoint', label: 'Fuel Spec: Flash Pt. (°C)', type: 'text' },
    { name: 'fuelConradsonValue', label: 'Fuel Spec: Conradson Value', type: 'text' },
    { name: 'fuelPourPoint', label: 'Fuel Spec: Pour Point (°C)', type: 'text' },
    { name: 'fuelHeatValue', label: 'Fuel Spec: Heat Value (MJ/Kg)', type: 'text' },

    {
      name: 'turbochargerDataTable',
      label: 'Turbocharger Data (No.1..No.4)',
      type: 'textarea',
      helperText:
        'Paste/enter rows: Parameter | Unit | 1 | 2 | 3 | 4 (e.g., T/C speed, air temp before/after cooler, SW inlet/outlet, CW temps, exhaust temps, pressure drops, scavenge air P/T, etc.)',
    },

    {
      name: 'fuelConsumptionCalculationTable',
      label: 'Fuel Consumption Calculation',
      type: 'textarea',
      helperText:
        'Paste/enter: Time Duration(H) | Start | Stop | m³ | m³/H | Mt/H | M.E Flowmeter Reading',
    },

    {
      name: 'pressureTemperatureTable',
      label: 'Pressures & Temperatures Table',
      type: 'textarea',
      helperText:
        'Paste the Pressure (Kg/Cm2), Temperature (°C), and Atmosphere (Mm Hg / Mm Bar) section as text.',
    },

    { name: 'remarks', label: 'Remarks', type: 'textarea' },

    { name: 'chiefEngineerName', label: 'Chief Engineer - Name', type: 'text' },
    { name: 'chiefEngineerSignature', label: 'Chief Engineer - Signature', type: 'text' },
  ],
},

// ---------------- PMS018 ----------------
{
  code: 'PMS018',
  title: 'Report on Overhaul of Auxiliary Engines',
  description: 'Aux engine overhaul report with liner wear, piston/head/pump checks, bearings & ring data.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'date', label: 'Date', type: 'date', required: true },

    { name: 'auxEngineNo', label: 'Aux Engine No.', type: 'text', required: true },
    { name: 'location', label: 'Location', type: 'text' },

    {
      name: 'linerType',
      label: 'Liner Type',
      type: 'select',
      options: ['Chrome plated liner', 'Cast-Iron liner'],
    },
    {
      name: 'unitsNumberedFrom',
      label: 'Units numbered from',
      type: 'select',
      options: ['Forward', 'Aft'],
    },

    { name: 'dateOverhaulCommenced', label: 'Date overhaul commenced', type: 'date' },
    { name: 'dateOverhaulCompleted', label: 'Date overhaul completed', type: 'date' },
    { name: 'dateOfLastOverhaul', label: 'Date of last overhaul', type: 'date' },

    { name: 'totalOperatingHoursSinceInstallation', label: 'Total operating hours since installation', type: 'text' },
    { name: 'operatingHoursSinceLastOverhaul', label: 'Operating hours since last overhaul', type: 'text' },

    {
      name: 'loCoolerTubeNestCleaned',
      label: 'L.O. cooler tube nest cleaned',
      type: 'select',
      options: ['Yes', 'No'],
    },
    { name: 'conditionLoCoolerEndCovers', label: 'Condition of L.O. cooler end covers', type: 'textarea' },
    { name: 'dateLoCoolerTubeNestLastCleaned', label: 'Date L.O cooler tube nest was last cleaned', type: 'date' },
    {
      name: 'loCoolerZincAnodesReplaced',
      label: 'L.O. cooler zinc anodes replaced',
      type: 'select',
      options: ['Yes', 'No'],
    },

    {
      name: 'turboChargerOverhauled',
      label: 'Turbo-Charger overhauled',
      type: 'select',
      options: ['Yes', 'No'],
    },
    { name: 'dateTurbochargerBearingRenewed', label: 'Date turbocharger bearing was renewed', type: 'date' },
    { name: 'dateTurbochargerLastOverhauled', label: 'Date turbocharger was last overhauled', type: 'date' },
    { name: 'dateTurbochargerRotorRenewed', label: 'Date turbocharger rotor was renewed', type: 'date' },
    { name: 'dateTurbochargerNozzleRingRenewed', label: 'Date turbocharger nozzle ring was renewed', type: 'date' },

    {
      name: 'linerWearTable',
      label: 'Liner Wear Table (Units/Posts/P-S/F-A)',
      type: 'textarea',
      helperText:
        'Paste/enter the liner measurement grid: Unit no | Date liner installed | Post no | New liner P/S, F/A | Last overhaul P/S, F/A | Present P/S, F/A | Wear since new (Max, Rate/1000h).',
    },

    {
      name: 'pistonCylinderHeadsFuelPumpsTable',
      label: 'Piston, Cylinder Heads & Fuel Pumps Table',
      type: 'textarea',
      helperText:
        'Paste/enter: Unit No | Piston date installed | Condition of piston grooves etc | Gudgeon-pin clr (New/Now F/A) | Crank-pin brg clr (New/Now F/A) | Compressor pressure before/after overhaul.',
    },

    {
      name: 'cylHeadFuelPumpValveGearTable',
      label: 'Cylinder Head / Fuel Pump / Valve Gear Table',
      type: 'textarea',
      helperText:
        'Paste/enter: Unit no | Inlet/Exhaust | Cylinder head valves date renewed | Head date re-conditioned | Fuel pump overhauled (Y/N) | Fuel pump date last overhauled | Parts renewed notes.',
    },

    {
      name: 'airCoolerCleaned',
      label: 'Air cooler (Air & S.W sides) Cleaned',
      type: 'select',
      options: ['Yes', 'No'],
    },
    {
      name: 'airCoolerZincAnodesRenewed',
      label: 'Air cooler zinc anodes renewed',
      type: 'select',
      options: ['Yes', 'No'],
    },
    { name: 'airCoolerDateLastCleaned', label: "Air cooler's date last cleaned", type: 'date' },

    {
      name: 'governorOverhauled',
      label: 'Governor overhauled',
      type: 'select',
      options: ['Yes', 'No'],
    },
    { name: 'conditionAirCoolerEndCovers', label: 'Condition of air cooler end covers', type: 'textarea' },
    { name: 'governorDateLastOverhauled', label: 'Governor date last overhauled', type: 'date' },
    { name: 'airCoolerDateLastReplaced', label: 'Air cooler date last replaced', type: 'date' },

    {
      name: 'pistonRingsTable',
      label: 'Piston Rings Table',
      type: 'textarea',
      helperText:
        'Paste/enter the ring grid (chrome/ordinary): Ring no 1..8 with Butt clr / New clr / Axial clr for each unit.',
    },

    { name: 'remarksCrankCamGearsPumps', label: 'Remarks on crankshaft, camshaft, driving gears & driven pumps etc.', type: 'textarea' },

    {
      name: 'mainBearingTable',
      label: 'Main Bearing Table (1..4)',
      type: 'textarea',
      helperText:
        'Paste/enter: Bearing no | Date installed | New/Now clearances | Bridge gauge reading | Bearing clearance F | Bearing clearance A.',
    },

    { name: 'chiefEngineerName', label: 'Chief Engineer - Name', type: 'text' },
    { name: 'chiefEngineerSignature', label: 'Chief Engineer - Signature', type: 'text' },
  ],
},

// ---------------- PMS020 ----------------
{
  code: 'PMS020',
  title: 'Scavenge Inspection Report',
  description: 'Scavenge inspection report (original is an Excel sheet).',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'port', label: 'Port / Location', type: 'text' },
    { name: 'engineType', label: 'Engine Type', type: 'text' },
    { name: 'unitOrCylinderRange', label: 'Unit / Cylinder No(s)', type: 'text' },
    {
      name: 'inspectionTable',
      label: 'Inspection Table / Findings',
      type: 'textarea',
      helperText:
        'This form is from XLS; paste the inspection rows here (e.g., Unit | Item checked | Condition | Action taken | Remarks).',
    },
    { name: 'remarks', label: 'Remarks', type: 'textarea' },
    { name: 'chiefEngineerName', label: 'Chief Engineer - Name', type: 'text' },
    { name: 'chiefEngineerDate', label: 'Chief Engineer - Date', type: 'date' },
    { name: 'chiefEngineerSignature', label: 'Chief Engineer - Signature', type: 'text' },
  ],
},

// ---------------- SEC501 ----------------
{
  code: 'SEC501',
  title: 'Ship Security Checklist',
  description: 'Security checklist prior to/while alongside port.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'port', label: 'Port', type: 'text', required: true },
    { name: 'date', label: 'Date', type: 'date', required: true },

    {
      name: 'securityChecks',
      label: 'Security Checks (Tick if Yes)',
      type: 'checklist',
      items: [
        'Gangway notice board posted (No unauthorized persons, photography prohibited on board, No smoking on deck etc.)',
        'Deck watchmen instructed to prevent unauthorized persons on board',
        'Duty Officer instructed to assist ABs in their search',
        'Shore watchmen (if employed) instructed as to vessel requirements',
        'All crew instructed to sound General alarm if a problem should arise',
        'Access to vessel restricted to only one point (if possible)',
        'Duty AB stationed at point of access (security checks per MARSEC level)',
        'In high-risk area, deck patrol organized',
        'External doors secured (leave one for access)',
        'Personnel advised to watch for unauthorized craft coming alongside',
        'All persons attempting to board checked and original ID verified',
        'Prevent persons from entering accommodation/engine spaces until identity confirmed',
        'Unexpected/suspicious packages stowed away from accommodation until identified',
        'CCTV switched on / working / recording',
        'Visitors log maintained and cards issued/returned prior departure',
      ],
    },

    { name: 'officerOfWatchName', label: 'Officer of the Watch - Name', type: 'text' },
    { name: 'officerOfWatchDate', label: 'Officer of the Watch - Date', type: 'date' },
    { name: 'officerOfWatchSignature', label: 'Officer of the Watch - Signature', type: 'text' },

    { name: 'masterName', label: 'Master - Name', type: 'text' },
    { name: 'masterDate', label: 'Master - Date', type: 'date' },
    { name: 'masterSignature', label: 'Master - Signature', type: 'text' },
  ],
},

// ---------------- SEC501a ----------------
{
  code: 'SEC501a',
  title: 'Declaration of Security',
  description: 'Declaration of security between vessel and port facility / other ship (STS).',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'dateOfIssue', label: 'Date of Issue', type: 'date', required: true },
    { name: 'validityFrom', label: 'Validity From', type: 'date' },
    { name: 'validityTo', label: 'Validity To', type: 'date' },
    { name: 'reason', label: 'Reason', type: 'textarea' },

    // Own vessel details
    { name: 'imoNumber', label: 'IMO Number', type: 'text' },
    { name: 'owners', label: 'Owners', type: 'text' },
    { name: 'portOfRegistry', label: 'Port of Registry', type: 'text' },
    { name: 'responsibleCompany', label: 'Responsible Company', type: 'text' },
    { name: 'securityLevel', label: 'Security Level', type: 'text' },
    { name: 'address', label: 'Address', type: 'textarea' },
    { name: 'contact24hr', label: '24 hr Contact No.', type: 'text' },
    { name: 'csoMobile', label: 'Mobile number CSO', type: 'text' },
    { name: 'csoEmail', label: 'Email', type: 'text' },

    // Other ship details (STS only)
    { name: 'otherShipName', label: 'Other Ship Name (STS only)', type: 'text' },
    { name: 'otherShipResponsibleCompany', label: 'Other Ship Responsible Company', type: 'text' },
    { name: 'otherShipImoNumber', label: 'Other Ship IMO Number', type: 'text' },
    { name: 'otherShipContact24hr', label: 'Other Ship 24 hr Contact No.', type: 'text' },
    { name: 'otherShipPortOfRegistry', label: 'Other Ship Port of Registry', type: 'text' },
    { name: 'otherShipSecurityLevel', label: 'Other Ship Security Level', type: 'text' },

    // Port details
    { name: 'portName', label: 'Name of Port', type: 'text' },
    { name: 'portSecurityLevel', label: 'Port Security Level', type: 'text' },

    {
      name: 'securityActivities',
      label: 'Agreed Activities (Tick if agreed/verified)',
      type: 'checklist',
      items: [
        'Communications established between vessel and waterfront facility (CSO/SSO/PFSO)',
        'Means of raising alarm agreed between ship and waterfront facility',
        'Vessel/waterfront facility report security non-conformities and notify authorities',
        'Port specific security information passed to vessel; notification procedures established',
        'Responsibility for checking identification and screening (passengers/crew/hand carried items/luggage)',
        'Responsibility for screening vessel stores/cargo/vehicles',
        'Responsibility for searching berth/pier surrounding vessel',
        'Responsibility for monitoring security of water surrounding ship',
        'Verification of increased threat level & implementation of additional protective measures',
        'Protocol to coordinate response to acts threatening vessel and/or waterfront facility',
      ],
    },

    { name: 'masterSsoName', label: 'Master / SSO - Name', type: 'text' },
    { name: 'masterSsoRank', label: 'Master / SSO - Rank', type: 'text' },
    { name: 'masterSsoSignature', label: 'Master / SSO - Signature', type: 'text' },

    { name: 'pfsoName', label: 'PFSO / Authorised Designee - Name', type: 'text' },
    { name: 'pfsoRank', label: 'PFSO / Authorised Designee - Rank', type: 'text' },
    { name: 'pfsoSignature', label: 'PFSO / Authorised Designee - Signature', type: 'text' },
  ],
},

// ---------------- SEM502 ----------------
{
  code: 'SEM502',
  title: 'Safety Equipment Weekly Checks',
  description: 'Weekly checks – stored as one entry per week (use Week No + checklist table).',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'month', label: 'Month', type: 'text', required: true },
    {
      name: 'weekNo',
      label: 'Week No.',
      type: 'select',
      options: ['1st', '2nd', '3rd', '4th'],
      required: true,
    },
    {
      name: 'checksTable',
      label: 'Weekly Checks (Paste/record)',
      type: 'textarea',
      helperText:
        'Record as lines: Item | Status (YES/NO/N/A) | Action/Remarks. (Form is a big matrix in the PDF).',
    },
    { name: 'defects', label: 'Defects / Deficiencies, if any', type: 'textarea' },
    { name: 'notes', label: 'Notes', type: 'textarea' },

    { name: 'safetyOfficerName', label: '3rd Officer / Safety Officer - Name', type: 'text' },
    { name: 'safetyOfficerDate', label: '3rd Officer / Safety Officer - Date', type: 'date' },
    { name: 'safetyOfficerSignature', label: '3rd Officer / Safety Officer - Signature', type: 'text' },

    { name: 'engineerName', label: '3rd/4th Engineer - Name', type: 'text' },
    { name: 'engineerDate', label: '3rd/4th Engineer - Date', type: 'date' },
    { name: 'engineerSignature', label: '3rd/4th Engineer - Signature', type: 'text' },

    { name: 'chiefEngineerName', label: 'Chief Engineer - Name', type: 'text' },
    { name: 'chiefEngineerDate', label: 'Chief Engineer - Date', type: 'date' },
    { name: 'chiefEngineerSignature', label: 'Chief Engineer - Signature', type: 'text' },

    { name: 'masterName', label: 'Master - Name', type: 'text' },
    { name: 'masterDate', label: 'Master - Date', type: 'date' },
    { name: 'masterSignature', label: 'Master - Signature', type: 'text' },
  ],
},

// ---------------- SEM503 ----------------
{
  code: 'SEM503',
  title: 'Safety Equipment Monthly Checks',
  description: 'Monthly checks – massive matrix; captured as free-form table text + signatures.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'year', label: 'Year', type: 'number', required: true },
    {
      name: 'month',
      label: 'Month',
      type: 'select',
      options: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      required: true,
    },
    { name: 'checksTable', label: 'Monthly Checks (Paste/record)', type: 'textarea' },
    { name: 'defects', label: 'Defects / Deficiencies, if any', type: 'textarea' },
    { name: 'notes', label: 'Notes', type: 'textarea' },

    { name: 'safetyOfficerName', label: '3rd Officer / Safety Officer - Name', type: 'text' },
    { name: 'safetyOfficerDate', label: '3rd Officer / Safety Officer - Date', type: 'date' },
    { name: 'safetyOfficerSignature', label: '3rd Officer / Safety Officer - Signature', type: 'text' },

    { name: 'engineerName', label: '3rd/4th Engineer - Name', type: 'text' },
    { name: 'engineerDate', label: '3rd/4th Engineer - Date', type: 'date' },
    { name: 'engineerSignature', label: '3rd/4th Engineer - Signature', type: 'text' },

    { name: 'chiefEngineerName', label: 'Chief Engineer - Name', type: 'text' },
    { name: 'chiefEngineerDate', label: 'Chief Engineer - Date', type: 'date' },
    { name: 'chiefEngineerSignature', label: 'Chief Engineer - Signature', type: 'text' },

    { name: 'masterName', label: 'Master - Name', type: 'text' },
    { name: 'masterDate', label: 'Master - Date', type: 'date' },
    { name: 'masterSignature', label: 'Master - Signature', type: 'text' },
  ],
},

// ---------------- SEM504 ----------------
{
  code: 'SEM504',
  title: 'Safety Equipment Three Monthly Checks',
  description: 'Quarterly/Three-monthly checks – captured as free-form table text + signatures.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'year', label: 'Year', type: 'number', required: true },
    {
      name: 'monthCycle',
      label: 'Cycle Month',
      type: 'select',
      options: ['Jan', 'Apr', 'Jul', 'Oct'],
      required: true,
    },
    { name: 'checksTable', label: 'Three Monthly Checks (Paste/record)', type: 'textarea' },
    { name: 'defects', label: 'Defects / Deficiencies, if any', type: 'textarea' },
    { name: 'notes', label: 'Notes', type: 'textarea' },

    { name: 'safetyOfficerName', label: '3rd Officer / Safety Officer - Name', type: 'text' },
    { name: 'safetyOfficerDate', label: '3rd Officer / Safety Officer - Date', type: 'date' },
    { name: 'safetyOfficerSignature', label: '3rd Officer / Safety Officer - Signature', type: 'text' },

    { name: 'engineerName', label: '3rd/4th Engineer - Name', type: 'text' },
    { name: 'engineerDate', label: '3rd/4th Engineer - Date', type: 'date' },
    { name: 'engineerSignature', label: '3rd/4th Engineer - Signature', type: 'text' },

    { name: 'chiefEngineerName', label: 'Chief Engineer - Name', type: 'text' },
    { name: 'chiefEngineerDate', label: 'Chief Engineer - Date', type: 'date' },
    { name: 'chiefEngineerSignature', label: 'Chief Engineer - Signature', type: 'text' },

    { name: 'masterName', label: 'Master - Name', type: 'text' },
    { name: 'masterDate', label: 'Master - Date', type: 'date' },
    { name: 'masterSignature', label: 'Master - Signature', type: 'text' },
  ],
},

// ---------------- SEM505 ----------------
{
  code: 'SEM505',
  title: 'Safety Equipment Six Monthly Checks',
  description: 'Six-monthly checks – captured as free-form table text + signatures.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'year', label: 'Year', type: 'number', required: true },
    {
      name: 'monthCycle',
      label: 'Cycle Month',
      type: 'select',
      options: ['Jan', 'Jul'],
      required: true,
    },
    { name: 'checksTable', label: 'Six Monthly Checks (Paste/record)', type: 'textarea' },
    { name: 'defects', label: 'Defects / Deficiencies, if any', type: 'textarea' },
    { name: 'notes', label: 'Notes', type: 'textarea' },

    { name: 'safetyOfficerName', label: '3rd Officer / Safety Officer - Name', type: 'text' },
    { name: 'safetyOfficerDate', label: '3rd Officer / Safety Officer - Date', type: 'date' },
    { name: 'safetyOfficerSignature', label: '3rd Officer / Safety Officer - Signature', type: 'text' },

    { name: 'engineerName', label: '3rd/4th Engineer - Name', type: 'text' },
    { name: 'engineerDate', label: '3rd/4th Engineer - Date', type: 'date' },
    { name: 'engineerSignature', label: '3rd/4th Engineer - Signature', type: 'text' },

    { name: 'chiefEngineerName', label: 'Chief Engineer - Name', type: 'text' },
    { name: 'chiefEngineerDate', label: 'Chief Engineer - Date', type: 'date' },
    { name: 'chiefEngineerSignature', label: 'Chief Engineer - Signature', type: 'text' },

    { name: 'masterName', label: 'Master - Name', type: 'text' },
    { name: 'masterDate', label: 'Master - Date', type: 'date' },
    { name: 'masterSignature', label: 'Master - Signature', type: 'text' },
  ],
},

// ---------------- SEM506 ----------------
{
  code: 'SEM506',
  title: 'Safety Equipment Annual Checks',
  description: 'Annual checks – captured as free-form table text + signatures.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'year', label: 'Year', type: 'number', required: true },

    { name: 'checksTable', label: 'Annual Checks (Paste/record)', type: 'textarea' },
    { name: 'defects', label: 'Defects / Deficiencies, if any', type: 'textarea' },
    { name: 'notes', label: 'Notes', type: 'textarea' },

    { name: 'safetyOfficerName', label: '3rd Officer / Safety Officer - Name', type: 'text' },
    { name: 'safetyOfficerDate', label: '3rd Officer / Safety Officer - Date', type: 'date' },
    { name: 'safetyOfficerSignature', label: '3rd Officer / Safety Officer - Signature', type: 'text' },

    { name: 'engineerName', label: '3rd/4th Engineer - Name', type: 'text' },
    { name: 'engineerDate', label: '3rd/4th Engineer - Date', type: 'date' },
    { name: 'engineerSignature', label: '3rd/4th Engineer - Signature', type: 'text' },

    { name: 'chiefEngineerName', label: 'Chief Engineer - Name', type: 'text' },
    { name: 'chiefEngineerDate', label: 'Chief Engineer - Date', type: 'date' },
    { name: 'chiefEngineerSignature', label: 'Chief Engineer - Signature', type: 'text' },

    { name: 'masterName', label: 'Master - Name', type: 'text' },
    { name: 'masterDate', label: 'Master - Date', type: 'date' },
    { name: 'masterSignature', label: 'Master - Signature', type: 'text' },
  ],
},
// ======================= Form Field Extraction =======================

// ---------------- SMM501a ----------------
{
  code: 'SMM501a',
  title: 'Minutes of Safety and Environment Protection Committee Meeting',
  description: 'Safety meeting minutes + attendees + stats + action items + sign-off.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'consecutiveNumberForYear', label: 'Consecutive Number for the Year', type: 'text' },
    { name: 'dated', label: 'Dated', type: 'date', required: true },

    { name: 'meetingOpenedAt', label: 'Meeting Opened At', type: 'time' },
    { name: 'meetingClosedAt', label: 'Meeting Closed At', type: 'time' },
    { name: 'dateOfPreviousMeeting', label: 'Date Of Previous Meeting', type: 'date' },

    { name: 'chairedByMaster', label: 'Meeting Chaired By (Master name)', type: 'text' },
    { name: 'agendaPostedOn', label: 'Agenda Posted on Ship Notice Board (Date)', type: 'date' },

    { name: 'attendees', label: 'Attendees (Name + Rank)', type: 'textarea' },

    {
      name: 'minutesOfPreviousMeetingRead',
      label: 'Minutes of Previous Meeting Read',
      type: 'select',
      options: ['Yes', 'No'],
    },

    {
      name: 'meetingAfterAccidentOrNearMiss',
      label: 'Meeting held after accident / potential high risk near miss / fleet accident?',
      type: 'select',
      options: ['Yes', 'No'],
    },
    { name: 'accidentNearMissDetails', label: 'If Yes, provide details', type: 'textarea' },

    { name: 'followUpOutstandingItems', label: 'Follow up of outstanding items from previous meeting', type: 'textarea' },
    { name: 'newTargetDateForCorrectiveAction', label: 'New target date for corrective action', type: 'date' },

    {
      name: 'previousMeetingOutstandingItemsTable',
      label: 'Outstanding items table (Sr No / Action / Identified date / Expected close out / Reason delay / Remarks)',
      type: 'textarea',
    },

    {
      name: 'safetyAlertsCircularsAuditFindingsDiscussed',
      label: "Safety alerts / bulletins / circulars / audit NCs / observations / deficiencies / inspection reports discussed",
      type: 'textarea',
    },

    { name: 'nearMissesReportedThisMonth', label: 'Number of near misses reported this month', type: 'number' },
    { name: 'accidentsSinceLastMeeting', label: 'Number of accidents since last meeting', type: 'number' },
    { name: 'rootCausesDiscussed', label: 'Root causes of incidents discussed', type: 'textarea' },
    { name: 'accumulatedLTIThisYear', label: 'Number of accumulated LTI this year', type: 'number' },
    { name: 'accumulatedTRCThisYear', label: 'Number of accumulated TRC this year', type: 'number' },
    { name: 'totalAccidentsThisYear', label: 'Total number of accidents this year', type: 'number' },
    { name: 'daysWithoutAccident', label: 'Number of days without an accident', type: 'number' },

    { name: 'lastPSCInspectionDate', label: 'Date of last PSC inspection', type: 'date' },
    { name: 'lastPSCDeficiencies', label: 'No. of PSC deficiencies', type: 'number' },

    { name: 'lastFlagStateInspectionDate', label: 'Date of last flag state inspection', type: 'date' },
    { name: 'lastFlagStateFindings', label: 'No. of flag state findings', type: 'number' },

    { name: 'lastInternalAuditDate', label: 'Date of last internal audit', type: 'date' },
    { name: 'lastInternalAuditNonConformities', label: 'No. of internal audit non-conformities', type: 'number' },

    { name: 'lastExternalAuditDate', label: 'Date of last external audit', type: 'date' },
    { name: 'lastExternalAuditNonConformities', label: 'No. of external audit non-conformities', type: 'number' },

    { name: 'lastSuperintendentVisitDate', label: "Date of last Superintendent’s visit", type: 'date' },
    { name: 'lastSuperintendentFindings', label: "No. of Superintendent’s findings", type: 'number' },

    {
      name: 'generalInformationDiscussed',
      label: 'Items for general information discussed (COSWP, environmental issues, new rules, SMS changes)',
      type: 'textarea',
    },

    {
      name: 'safetyOfficerVerificationChecksDeficiencies',
      label: "Safety Officer’s verification checks carried out (Form SMM001b) - list deficiencies",
      type: 'textarea',
    },

    {
      name: 'trainingConductedSinceLastMeeting',
      label: 'Training conducted since last meeting (videos/CBT/topics)',
      type: 'textarea',
    },

    { name: 'drillsCarriedOutTable', label: 'Drills carried out (Type / Date / Remarks)', type: 'textarea' },

    { name: 'familiarisationNewJoinersReport', label: 'Report on familiarisation of newly joined staff', type: 'textarea' },
    { name: 'bestManagementPractices', label: 'Best management practices followed on board', type: 'textarea' },

    { name: 'issuesRaisedTable', label: 'Issues raised (No / Action Point / Corrective Action / Target Date)', type: 'textarea' },

    { name: 'suggestions', label: 'Suggestions', type: 'textarea' },
    { name: 'nextMeetingPlannedFor', label: 'Next meeting planned for', type: 'date' },

    // Sign-off (names; signatures optional per note)
    { name: 'masterName', label: 'Master - Name', type: 'text' },
    { name: 'chiefOfficerName', label: 'Chief Officer - Name', type: 'text' },
    { name: 'chiefEngineerName', label: 'Chief Engineer - Name', type: 'text' },
    { name: 'secondEngineerName', label: 'Second Engineer - Name', type: 'text' },
    { name: 'electedCrewRep1Name', label: 'Elected crew representative - Name', type: 'text' },
    { name: 'electedCrewRep2Name', label: 'Elected crew representative - Name', type: 'text' },

    // Office use
    { name: 'officeComments', label: 'Office Use Only - Comments', type: 'textarea' },
    { name: 'reviewedBy', label: 'Reviewed by', type: 'text' },
    { name: 'officeReviewDate', label: 'Office Review Date', type: 'date' },
    { name: 'officeSignature', label: 'Office Signature (Name/Ref)', type: 'text' },
  ],
},
// :contentReference[oaicite:0]{index=0}


// ---------------- SMM503a ----------------
{
  code: 'SMM503a',
  title: "Master’s Review of Vessel’s Performance for SMS & EMS",
  description: 'Master review checklist (Yes/No) with section comments + office review sign-off.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'periodFrom', label: 'Period Covered - From', type: 'date', required: true },
    { name: 'periodTo', label: 'Period Covered - To', type: 'date', required: true },
    { name: 'dateOfReport', label: 'Date of Report', type: 'date', required: true },

    // Effectiveness of SMS/EMS implementation
    { name: 'smsEmsImplementationEffectiveness', label: 'Effectiveness of SMS/EMS implementation on board', type: 'select', options: ['Yes', 'No'] },
    { name: 'smsInstalledOnAllComputers', label: 'SMS installed on all company computers onboard?', type: 'select', options: ['Yes', 'No'] },
    { name: 'smsUpdatedRegularly', label: 'SMS updated regularly?', type: 'select', options: ['Yes', 'No'] },
    { name: 'manualsReviewedAsPerSchedule', label: 'Manuals reviewed as per schedule?', type: 'select', options: ['Yes', 'No'] },
    { name: 'crewHaveAccessToSMS', label: 'All crew have access to SMS?', type: 'select', options: ['Yes', 'No'] },
    { name: 'crewAwareRolesResponsibilities', label: 'Crew aware of roles/responsibilities?', type: 'select', options: ['Yes', 'No'] },
    { name: 'crewAwareCompanyPolicies', label: 'Crew aware of company policies?', type: 'select', options: ['Yes', 'No'] },
    { name: 'committeeMeetingsHeldAsPerSMM001', label: 'Safety & Environment Committee meetings held as per SMM001?', type: 'select', options: ['Yes', 'No'] },
    { name: 'crewParticipateInMeetings', label: 'Crew participates actively in meetings?', type: 'select', options: ['Yes', 'No'] },
    { name: 'nearMissReportingWorking', label: 'Near miss / non-conformity reporting system working?', type: 'select', options: ['Yes', 'No'] },
    { name: 'futureTrainingNeedsIdentified', label: 'Future training needs identified and included in appraisal forms?', type: 'select', options: ['Yes', 'No'] },
    { name: 'officersAwareEnvironmentalImpacts', label: 'Officers aware of environmental impacts?', type: 'select', options: ['Yes', 'No'] },
    { name: 'emsReviewedInPeriod', label: 'EMS reviewed in review period?', type: 'select', options: ['Yes', 'No'] },
    { name: 'oilPollutionPlansAndDocsUpToDate', label: 'Oil pollution prevention plans & emergency docs (SOPEP/SMPEP/VRP) up to date?', type: 'select', options: ['Yes', 'No'] },
    { name: 'ems01SentMonthly', label: 'Form EMS 01 completed and sent monthly?', type: 'select', options: ['Yes', 'No'] },
    { name: 'visitorsMadeAwareCompanyRequirements', label: 'Visitors made aware of company requirements?', type: 'select', options: ['Yes', 'No'] },
    { name: 'envObjectivesTargetsSetAndMonitored', label: 'Environmental objectives/targets set and monitored?', type: 'select', options: ['Yes', 'No'] },
    { name: 'mastersCommentImplementation', label: "Master’s comment (Implementation section)", type: 'textarea' },

    // Reports to office / feedback
    { name: 'reportsSentToOfficeAsPerProcedures', label: 'Reports sent to office as per procedures?', type: 'select', options: ['Yes', 'No'] },
    { name: 'feedbackReceivedFromOffice', label: 'Comments/feedback received from office after review?', type: 'select', options: ['Yes', 'No'] },
    { name: 'reasonsForDelayCommunicated', label: 'Reasons for delay in resolving issues made known to ship?', type: 'select', options: ['Yes', 'No'] },
    { name: 'pendingIssuesDocsMaintenanceOpsReq', label: 'Any pending issues related to SMS/EMS docs/maintenance/ops/requisitions?', type: 'select', options: ['Yes', 'No'] },
    { name: 'consideredPreviousMastersReview', label: "Considered previous Master’s review of SMS/EMS?", type: 'select', options: ['Yes', 'No'] },
    { name: 'outstandingIssuesFromPreviousReview', label: 'Outstanding issues from previous review (if any)', type: 'textarea' },
    { name: 'yearlyEmsEvaluationAvailable', label: 'Outcome of yearly EMS target/objectives evaluation available on board?', type: 'select', options: ['Yes', 'No'] },
    { name: 'delaysInResolvingEnvironmentalIssues', label: 'Were there delays resolving environmental issues and reasons known?', type: 'select', options: ['Yes', 'No'] },
    { name: 'mastersCommentReports', label: "Master’s comment (Reports/feedback section)", type: 'textarea' },

    // Incident reporting, investigation and follow up
    { name: 'accidentsSinceLastReview', label: 'Any accidents since last review?', type: 'select', options: ['Yes', 'No'] },
    { name: 'accidentsReportedAndDiscussed', label: 'If yes, reported to company and discussed on board?', type: 'select', options: ['Yes', 'No', 'N/A'] },
    { name: 'investigationDoneRootCause', label: 'Investigation done to identify root cause?', type: 'select', options: ['Yes', 'No', 'N/A'] },
    { name: 'correctivePreventiveActionsImplemented', label: 'Corrective & preventive actions implemented?', type: 'select', options: ['Yes', 'No', 'N/A'] },
    { name: 'officeIncidentReportsDiscussed', label: 'Office incident reports discussed and checks done to avoid similar conditions?', type: 'select', options: ['Yes', 'No'] },
    { name: 'officersTrainedIncidentInvestigation', label: 'Officers on board trained in incident investigation?', type: 'select', options: ['Yes', 'No'] },
    { name: 'incidentInvestigationTrainingNeedNotes', label: 'If no, training need notes (appraisal reference)', type: 'textarea' },
    { name: 'mastersCommentIncident', label: "Master’s comment (Incident section)", type: 'textarea' },

    // External and internal audit findings
    { name: 'internalAuditWithin12Months', label: 'Internal audit carried out within last 12 months?', type: 'select', options: ['Yes', 'No'] },
    { name: 'auditFindingsClosedOutInTime', label: 'Audit findings closed out within agreed time frame?', type: 'select', options: ['Yes', 'No'] },
    { name: 'outstandingAuditFindings', label: 'Outstanding findings (if any)', type: 'textarea' },
    { name: 'navigationalAuditAsPerNavManual', label: 'Navigational audit conducted as per Navigation Manual?', type: 'select', options: ['Yes', 'No'] },
    { name: 'caVerifiedEffectiveByMaster', label: 'Corrective action verified by Master and effective?', type: 'select', options: ['Yes', 'No'] },
    { name: 'evidenceMaintainedForAuditActions', label: 'Evidence of CA/PA maintained with audit reports?', type: 'select', options: ['Yes', 'No'] },
    { name: 'mastersCommentAudits', label: "Master’s comment (Audits section)", type: 'textarea' },

    // Effectiveness of shipboard training
    { name: 'trainingPlannedAndCarriedOut', label: 'Shipboard training identified and carried out in planned manner?', type: 'select', options: ['Yes', 'No'] },
    { name: 'trainingOutstandingFromPlan', label: 'Any training outstanding from plan?', type: 'select', options: ['Yes', 'No'] },
    { name: 'trainingOutstandingDetails', label: 'Outstanding training details', type: 'textarea' },
    { name: 'drillsRealTimeAndRecorded', label: 'Drills conducted in real time scenarios and records maintained?', type: 'select', options: ['Yes', 'No'] },
    { name: 'drillDebriefDocumented', label: 'Debrief held and documented after drills?', type: 'select', options: ['Yes', 'No'] },
    { name: 'crewParticipatesTrainingDrills', label: 'Crew participates actively in sessions and drills?', type: 'select', options: ['Yes', 'No'] },
    { name: 'safetyEquipmentTestedDuringDrills', label: 'Safety equipment tested during drills?', type: 'select', options: ['Yes', 'No'] },
    { name: 'crewFamiliarWithSafetyEquipment', label: 'Crew familiar with use of safety equipment?', type: 'select', options: ['Yes', 'No'] },
    { name: 'trainingProvidedOnEMSPlans', label: 'Training provided on EMS and plans (BWMP/SOPEP/SMPEP/VRP/VOC)?', type: 'select', options: ['Yes', 'No'] },
    { name: 'chiefOfficerTrainedEnvironmentalOfficer', label: 'Chief Officer trained for Environmental Officer role?', type: 'select', options: ['Yes', 'No'] },
    { name: 'trainingMaterialUsedProperly', label: 'Training material used properly (posters/CD/videos/CBT)?', type: 'select', options: ['Yes', 'No'] },
    { name: 'trainingRecordsMaintained', label: 'Records of training and drills maintained?', type: 'select', options: ['Yes', 'No'] },
    { name: 'mastersCommentTraining', label: "Master’s comment (Training section)", type: 'textarea' },

    // Surveys, inspections and certification status
    { name: 'statutoryTradeCertsValid', label: 'All statutory & trade certificates valid?', type: 'select', options: ['Yes', 'No'] },
    { name: 'anySurveysOverdue', label: 'Any surveys overdue?', type: 'select', options: ['Yes', 'No'] },
    { name: 'surveysWithinDueDates', label: 'Surveys/inspections carried out within due dates?', type: 'select', options: ['Yes', 'No'] },
    { name: 'crewCertificationsInOrder', label: 'Crew national/flag certification in order?', type: 'select', options: ['Yes', 'No'] },
    { name: 'superintendentVisitWithin6Months', label: 'Inspected by Superintendent within last 6 months?', type: 'select', options: ['Yes', 'No'] },
    { name: 'superintendentInstructionsImplemented', label: 'Superintendent instructions implemented?', type: 'select', options: ['Yes', 'No'] },
    { name: 'pscFlagThirdPartyInspectionsSinceReview', label: 'PSC/Flag/Third-party inspections since last review?', type: 'select', options: ['Yes', 'No'] },
    { name: 'allCaPaImplementedAfterInspections', label: 'All corrective/preventive actions implemented?', type: 'select', options: ['Yes', 'No'] },
    { name: 'masterInspectsAccommodationRegularly', label: 'Master inspections for accommodation/crew spaces condition?', type: 'select', options: ['Yes', 'No'] },
    { name: 'suptInspectionsIncludeEMS', label: 'Superintendent inspections include EMS issues?', type: 'select', options: ['Yes', 'No'] },
    { name: 'environmentCertificatesAndRecordsInOrder', label: 'Environment certificates/records in order (IOPP/IAPP/ISPP/ORB/BW/Garbage)?', type: 'select', options: ['Yes', 'No'] },

    // US calls
    { name: 'usCallsVgpCompliant', label: 'For U.S. calls: VGP best practices complied?', type: 'select', options: ['Yes', 'No', 'N/A'] },
    { name: 'vgpPeriodicInspectionsAndRecords', label: 'VGP periodic inspections carried out and records maintained?', type: 'select', options: ['Yes', 'No', 'N/A'] },
    { name: 'vgpViolationDetails', label: 'If any VGP violations, state details', type: 'textarea' },

    { name: 'mastersCommentSurveys', label: "Master’s comment (Surveys/Inspections section)", type: 'textarea' },

    // Maintenance
    { name: 'pmsInstalledAndUsed', label: 'PMS properly installed and used?', type: 'select', options: ['Yes', 'No'] },
    { name: 'pmsCoversAllEquipment', label: 'PMS covers all equipment and fittings?', type: 'select', options: ['Yes', 'No'] },
    { name: 'maintenancePerTOM', label: 'Work planning/maintenance/defect reporting as per TOM?', type: 'select', options: ['Yes', 'No'] },
    { name: 'criticalEquipmentIdentifiedMaintained', label: 'Critical equipment identified and maintained?', type: 'select', options: ['Yes', 'No'] },
    { name: 'dryDockAndMajorRepairsPlanned', label: 'Dry dockings and major repairs planned/prepared as per TOM?', type: 'select', options: ['Yes', 'No'] },
    { name: 'oilPollutionResponseEquipmentMaintained', label: 'Oil pollution response equipment properly maintained?', type: 'select', options: ['Yes', 'No'] },
    { name: 'pmDoneOnEnvImpactEquipment', label: 'Planned maintenance done on all environmental impact equipment?', type: 'select', options: ['Yes', 'No'] },
    { name: 'garbageBinsGoodSegregation', label: 'Garbage bins good, covered, segregation done as per GMP?', type: 'select', options: ['Yes', 'No'] },
    { name: 'owsCalibratedFunctional', label: 'Oily Water Separator calibrated and fully functional?', type: 'select', options: ['Yes', 'No'] },
    { name: 'mastersCommentMaintenance', label: "Master’s comment (Maintenance section)", type: 'textarea' },

    // Office comment/review sign-off
    { name: 'officeCommentsReview', label: 'Comments / Review by Office', type: 'textarea' },

    { name: 'masterName', label: "Master’s Name", type: 'text' },
    { name: 'masterDate', label: 'Master Date', type: 'date' },
    { name: 'masterSignature', label: 'Master Signature (Name/Ref)', type: 'text' },

    { name: 'designatedPersonName', label: 'Designated Person - Name', type: 'text' },
    { name: 'designatedPersonDate', label: 'Designated Person - Date', type: 'date' },
    { name: 'designatedPersonSignature', label: 'Designated Person - Signature (Name/Ref)', type: 'text' },
  ],
},
// :contentReference[oaicite:1]{index=1}


// ---------------- SMM503b ----------------
{
  code: 'SMM503b',
  title: "Master’s Review of the SMS",
  description: 'SMS manual review log (Doc/Section/Form) with suggestions and office comments.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'monthYear', label: 'Month / Year', type: 'text', required: true },
    { name: 'smsManualReviewed', label: 'SMS Manual Reviewed', type: 'text' },

    {
      name: 'reviewItemsTable',
      label: 'Review Items (Doc ID / Section / Form | Suggestion | Reason | Office Comments)',
      type: 'textarea',
    },

    { name: 'masterName', label: "Master’s Name", type: 'text' },
    { name: 'designatedPersonName', label: 'Designated Person - Name', type: 'text' },
  ],
},
// :contentReference[oaicite:2]{index=2}


// ---------------- SMM504a ----------------
{
  code: 'SMM504a',
  title: 'Accident / Incident / Near Miss Report',
  description: 'Occurrence report with analysis, causes, actions, authorization and office closure.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'location', label: 'Location', type: 'text' },
    { name: 'positionLocation', label: 'Position / Location', type: 'text' },

    { name: 'reportNumber', label: 'Report Number', type: 'text' },
    { name: 'reportIssuedByName', label: 'Report Issued By - Name', type: 'text' },
    { name: 'reportIssuedByRank', label: 'Report Issued By - Rank', type: 'text' },
    { name: 'dateIssued', label: 'Date Issued', type: 'date' },

    { name: 'dateOfOccurrence', label: 'Date Of Occurrence', type: 'date', required: true },
    { name: 'timeOfOccurrence', label: 'Time Of Occurrence', type: 'time' },

    { name: 'reportedBy', label: 'Reported By', type: 'text' },
    { name: 'dateReported', label: 'Date Reported', type: 'date' },
    { name: 'timeReported', label: 'Time Reported', type: 'time' },
    { name: 'reportedTo', label: 'Reported To', type: 'text' },

    {
      name: 'occurrenceType',
      label: 'Occurrence Type',
      type: 'select',
      options: ['Accident', 'Incident', 'Near Miss', 'High Severity Near Miss'],
      required: true,
    },

    { name: 'personalInjuryFormCompleted', label: 'Personal Injury Form Completed', type: 'select', options: ['Yes', 'No'] },
    { name: 'statementsAttached', label: 'Any Statements Attached', type: 'select', options: ['Yes', 'No'] },

    {
      name: 'locationOfOccurrence',
      label: 'Location Of Occurrence',
      type: 'select',
      options: [
        'Accommodation',
        'Bridge',
        'Ashore',
        'Engine Room / Machinery Spaces',
        'Deck',
        'Aloft/Overboard',
        'Enclosed Spaces',
        'Enclosed Spaces (Machinery)',
        'Office',
        'Store',
        'Traffic Road',
        'Other',
      ],
    },
    { name: 'locationOfOccurrenceOther', label: 'If Other, specify', type: 'text' },

    { name: 'descriptionOfOccurrence', label: 'Description Of the Occurrence', type: 'textarea', required: true },

    { name: 'substandardActs', label: 'Analysis - Substandard Acts (details)', type: 'textarea' },
    { name: 'substandardConditions', label: 'Analysis - Substandard Conditions (details)', type: 'textarea' },
    { name: 'otherFactors', label: 'Other Factors (Specify)', type: 'textarea' },

    { name: 'personsInjured', label: 'Persons Involved - Injured (names/ranks)', type: 'textarea' },
    { name: 'personsInvolved', label: 'Persons Involved - Involved (names/ranks)', type: 'textarea' },
    { name: 'witnesses', label: 'Witnesses (names/ranks)', type: 'textarea' },
    { name: 'typeOfInjury', label: 'Type Of Injury', type: 'text' },

    { name: 'immediateBasicCause', label: 'Immediate / Basic Cause', type: 'textarea' },
    { name: 'rootCause', label: 'Root Cause', type: 'textarea' },

    { name: 'correctiveActionsProposed', label: 'Corrective Actions Proposed', type: 'textarea' },
    { name: 'preventativeActionsProposed', label: 'Preventative Actions Proposed', type: 'textarea' },
    { name: 'objectiveEvidenceSupportingDocs', label: 'Objective Evidence and Supporting Documents', type: 'textarea' },

    // Authorization
    { name: 'masterName', label: 'Authorization - Master Name', type: 'text' },
    { name: 'masterDate', label: 'Authorization - Master Date', type: 'date' },
    { name: 'masterSignature', label: 'Authorization - Master Signature (Name/Ref)', type: 'text' },

    { name: 'chiefEngineerName', label: 'Authorization - Chief Engineer Name', type: 'text' },
    { name: 'chiefEngineerDate', label: 'Authorization - Chief Engineer Date', type: 'date' },
    { name: 'chiefEngineerSignature', label: 'Authorization - Chief Engineer Signature (Name/Ref)', type: 'text' },

    { name: 'distributedTo', label: 'Distributed by Master to (e.g., DPA, Crew) + Date', type: 'textarea' },

    // Office use
    { name: 'officeDateReviewed', label: 'Office Use - Date Reviewed', type: 'date' },
    { name: 'officeReviewedBy', label: 'Office Use - Reviewed By', type: 'text' },
    { name: 'furtherActionRequired', label: 'Office Use - Further Action Required?', type: 'select', options: ['Yes', 'No'] },
    { name: 'closed', label: 'Office Use - Closed?', type: 'select', options: ['Yes', 'No'] },
    { name: 'dpaName', label: 'Designated Person Ashore - Name', type: 'text' },
    { name: 'dpaConclusionsRecommendations', label: 'DPA Conclusions and Recommendations', type: 'textarea' },
  ],
},
// :contentReference[oaicite:3]{index=3}


// ---------------- SMM506a ----------------
{
  code: 'SMM506a',
  title: 'Onboard Familiarization - General',
  description: 'General familiarisation checklist + security section + ship-specific requirements + signatures.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'location', label: 'Location', type: 'text' },
    { name: 'time', label: 'Time', type: 'time' },
    { name: 'master', label: 'Master', type: 'text' },
    { name: 'chiefEngineer', label: 'Ch. Engineer', type: 'text' },
    { name: 'date', label: 'Date', type: 'date', required: true },

    { name: 'newJoinerName', label: 'Name of New Joiner being Familiarised', type: 'text', required: true },
    { name: 'newJoinerRank', label: 'Rank (New Joiner)', type: 'text' },
    { name: 'familiarisedByName', label: 'Name of person doing Familiarisation', type: 'text' },
    { name: 'familiarisedByRank', label: 'Rank (Familiariser)', type: 'text' },

    { name: 'generalChecklist', label: 'GENERAL checklist (Item | Yes/No)', type: 'textarea' },
    { name: 'securityChecklist', label: 'SECURITY checklist (Item | Yes/No)', type: 'textarea' },
    { name: 'additionalShipSpecificRequirements', label: 'Additional Ship Specific Requirements', type: 'textarea' },

    { name: 'newJoinerSignature', label: 'New Joiner - Signature (Name/Ref)', type: 'text' },
    { name: 'newJoinerSignDate', label: 'New Joiner - Date', type: 'date' },

    { name: 'familiariserSignature', label: 'Person Carried-Out Familiarisation - Signature (Name/Ref)', type: 'text' },
    { name: 'familiariserSignDate', label: 'Familiariser - Date', type: 'date' },

    { name: 'departmentHead', label: 'Department Head', type: 'text' },
  ],
},
// :contentReference[oaicite:4]{index=4}


// ---------------- SMM506b ----------------
{
  code: 'SMM506b',
  title: 'Onboard Familiarization - Deck Officers',
  description: 'Deck officer familiarisation (general + bridge + GMDSS) + ship-specific requirements + signatures.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'location', label: 'Location', type: 'text' },
    { name: 'time', label: 'Time', type: 'time' },
    { name: 'master', label: 'Master', type: 'text' },
    { name: 'chiefEngineer', label: 'Ch. Engineer', type: 'text' },
    { name: 'date', label: 'Date', type: 'date', required: true },

    { name: 'newJoinerName', label: 'Name of New Joiner being Familiarised', type: 'text', required: true },
    { name: 'newJoinerRank', label: 'Rank (New Joiner)', type: 'text' },
    { name: 'familiarisedByName', label: 'Name of person doing Familiarisation', type: 'text' },
    { name: 'familiarisedByRank', label: 'Rank (Familiariser)', type: 'text' },

    { name: 'generalDeckOfficerChecklist', label: 'General (within 14 days) checklist (Task | Yes/No | Date | Remarks)', type: 'textarea' },
    { name: 'additionalShipSpecificRequirements', label: 'Additional Ship Specific Requirements', type: 'textarea' },

    { name: 'bridgeChecklist', label: 'Bridge (before taking over watch) checklist (Task | Yes/No | Date | Remarks)', type: 'textarea' },
    { name: 'gmdssChecklist', label: 'GMDSS (before taking over watch) checklist (Task | Yes/No | Date | Remarks)', type: 'textarea' },

    { name: 'newJoinerSignature', label: 'New Joiner - Signature (Name/Ref)', type: 'text' },
    { name: 'newJoinerSignDate', label: 'New Joiner - Date', type: 'date' },

    { name: 'familiariserSignature', label: 'Person Carried-Out Familiarisation - Signature (Name/Ref)', type: 'text' },
    { name: 'familiariserSignDate', label: 'Familiariser - Date', type: 'date' },

    { name: 'departmentHead', label: 'Department Head', type: 'text' },
  ],
},
// :contentReference[oaicite:5]{index=5}


// ---------------- SMM506c ----------------
{
  code: 'SMM506c',
  title: 'Onboard Familiarization - Deck Ratings',
  description: 'Deck ratings familiarisation checklist + signatures.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'location', label: 'Location', type: 'text' },
    { name: 'time', label: 'Time', type: 'time' },
    { name: 'master', label: 'Master', type: 'text' },
    { name: 'chiefEngineer', label: 'Ch. Engineer', type: 'text' },
    { name: 'date', label: 'Date', type: 'date', required: true },

    { name: 'newJoinerName', label: 'Name of New Joiner being Familiarised', type: 'text', required: true },
    { name: 'newJoinerRank', label: 'Rank (New Joiner)', type: 'text' },
    { name: 'familiarisedByName', label: 'Name of person doing Familiarisation', type: 'text' },
    { name: 'familiarisedByRank', label: 'Rank (Familiariser)', type: 'text' },

    { name: 'deckRatingsChecklist', label: 'Checklist (Task | Yes/No | Date | Remarks)', type: 'textarea' },

    { name: 'newJoinerSignature', label: 'New Joiner - Signature (Name/Ref)', type: 'text' },
    { name: 'newJoinerSignDate', label: 'New Joiner - Date', type: 'date' },

    { name: 'familiariserSignature', label: 'Person Carried-Out Familiarisation - Signature (Name/Ref)', type: 'text' },
    { name: 'familiariserSignDate', label: 'Familiariser - Date', type: 'date' },

    { name: 'departmentHead', label: 'Department Head', type: 'text' },
  ],
},
// :contentReference[oaicite:6]{index=6}


// ---------------- SMM506d ----------------
{
  code: 'SMM506d',
  title: 'Onboard Familiarization - Engine',
  description: 'Engine familiarisation checklist + engine officer additional checklist + signatures.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'location', label: 'Location', type: 'text' },
    { name: 'time', label: 'Time', type: 'time' },
    { name: 'master', label: 'Master', type: 'text' },
    { name: 'chiefEngineer', label: 'Ch. Engineer', type: 'text' },
    { name: 'date', label: 'Date', type: 'date', required: true },

    { name: 'newJoinerName', label: 'Name of New Joiner being Familiarised', type: 'text', required: true },
    { name: 'newJoinerRank', label: 'Rank (New Joiner)', type: 'text' },
    { name: 'familiarisedByName', label: 'Name of person doing Familiarisation', type: 'text' },
    { name: 'familiarisedByRank', label: 'Rank (Familiariser)', type: 'text' },

    { name: 'engineGeneralChecklist', label: 'General checklist (Task | Yes/No | Date | Remarks)', type: 'textarea' },
    { name: 'engineOfficersAdditionalChecklist', label: 'Additional for Engine Officers checklist', type: 'textarea' },
    { name: 'additionalShipSpecificItems', label: 'Additional ship specific familiarisation items', type: 'textarea' },

    { name: 'newJoinerSignature', label: 'New Joiner - Signature (Name/Ref)', type: 'text' },
    { name: 'newJoinerSignDate', label: 'New Joiner - Date', type: 'date' },

    { name: 'familiariserSignature', label: 'Person Carried-Out Familiarisation - Signature (Name/Ref)', type: 'text' },
    { name: 'familiariserSignDate', label: 'Familiariser - Date', type: 'date' },

    { name: 'departmentHead', label: 'Department Head', type: 'text' },
  ],
},
// :contentReference[oaicite:7]{index=7}


// ---------------- SMM506e ----------------
{
  code: 'SMM506e',
  title: 'Onboard Familiarization - Galley',
  description: 'Galley familiarisation + galley inspection table + chief cook additional checklist + signatures.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'location', label: 'Location', type: 'text' },
    { name: 'time', label: 'Time', type: 'time' },
    { name: 'master', label: 'Master', type: 'text' },
    { name: 'chiefEngineer', label: 'Ch. Engineer', type: 'text' },
    { name: 'date', label: 'Date', type: 'date', required: true },

    { name: 'newJoinerName', label: 'Name of New Joiner being Familiarised', type: 'text', required: true },
    { name: 'newJoinerRank', label: 'Rank (New Joiner)', type: 'text' },
    { name: 'familiarisedByName', label: 'Name of person doing Familiarisation', type: 'text' },
    { name: 'familiarisedByRank', label: 'Rank (Familiariser)', type: 'text' },

    { name: 'galleyDepartmentChecklist', label: 'Galley Department checklist (Item | Yes/No | Date | Remarks)', type: 'textarea' },

    {
      name: 'galleyInspectionTable',
      label: 'Galley Inspection (Spaces/Equipment | Location | Cleanliness | Condition | Know location? | Good working order?)',
      type: 'textarea',
    },

    { name: 'equipmentNotWorkingRemarks', label: 'If any equipment not in good working order, spares/repair remarks', type: 'textarea' },
    { name: 'cleanlinessNotAcceptableRemarks', label: 'If cleanliness not acceptable, remarks', type: 'textarea' },

    { name: 'chiefCookChecklist', label: 'Additional for Chief Cook (Copies received/read/verified)', type: 'textarea' },

    { name: 'newJoinerSignature', label: 'New Joiner - Signature (Name/Ref)', type: 'text' },
    { name: 'newJoinerSignDate', label: 'New Joiner - Date', type: 'date' },

    { name: 'familiariserSignature', label: 'Person Carried-Out Familiarisation - Signature (Name/Ref)', type: 'text' },
    { name: 'familiariserSignDate', label: 'Familiariser - Date', type: 'date' },

    { name: 'departmentHead', label: 'Department Head', type: 'text' },
  ],
},
// :contentReference[oaicite:8]{index=8}


// ---------------- SMM507 ----------------
{
  code: 'SMM507',
  title: 'Internal Audit Checklist',
  description: 'Internal audit checklist with large sectioned questions + findings + sign-off.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'auditReportNo', label: 'Audit Report No', type: 'text', required: true },
    { name: 'dated', label: 'Dated', type: 'date', required: true },

    { name: 'auditCommenced', label: 'Audit Commenced', type: 'date' },
    { name: 'auditCompleted', label: 'Audit Completed', type: 'date' },
    { name: 'lastInternalAudit', label: 'Last Internal Audit', type: 'date' },

    { name: 'portFrom', label: 'Port (From)', type: 'text' },
    { name: 'portTo', label: 'Port (To)', type: 'text' },
    { name: 'auditorName', label: 'Auditor Name', type: 'text' },

    // Sections as captured findings (since the checklist is very large)
    { name: 'certificationAndDocumentation', label: 'Certification and Documentation (Y/N/NA + Findings)', type: 'textarea' },
    { name: 'crewManagement', label: 'Crew Management (Y/N/NA + Findings)', type: 'textarea' },
    { name: 'navigation', label: 'Navigation (Y/N/NA + Findings)', type: 'textarea' },
    { name: 'safetyManagement', label: 'Safety Management (Y/N/NA + Findings)', type: 'textarea' },
    { name: 'pollutionPrevention', label: 'Pollution Prevention (Y/N/NA + Findings)', type: 'textarea' },
    { name: 'cargoAndBallastSystem', label: 'Cargo and Ballast System (Y/N/NA + Findings)', type: 'textarea' },
    { name: 'mooring', label: 'Mooring (Y/N/NA + Findings)', type: 'textarea' },
    { name: 'communication', label: 'Communication (Y/N/NA + Findings)', type: 'textarea' },
    { name: 'engineAndSteering', label: 'Engine and Steering Compartment (Y/N/NA + Findings)', type: 'textarea' },
    { name: 'appearanceAndConditions', label: 'Appearance and Conditions (Y/N/NA + Findings)', type: 'textarea' },

    // Sign-off
    { name: 'masterName', label: 'Master - Name', type: 'text' },
    { name: 'masterDate', label: 'Master - Date', type: 'date' },
    { name: 'masterSignature', label: 'Master - Signature (Name/Ref)', type: 'text' },

    { name: 'auditorSignatureName', label: 'Auditor - Name', type: 'text' },
    { name: 'auditorDate', label: 'Auditor - Date', type: 'date' },
    { name: 'auditorSignature', label: 'Auditor - Signature (Name/Ref)', type: 'text' },
  ],
},
// :contentReference[oaicite:9]{index=9}
// ======================= Form Field Extraction =======================

// ---------------- SMM508 ----------------
{
  code: 'SMM508',
  title: 'Deficiency Corrective Action Report',
  description: 'Deficiency / NC report with cause analysis, corrective & preventive actions, and office closure.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'date', label: 'Date', type: 'date', required: true },

    {
      name: 'auditInspectionType',
      label: 'Audit/Inspection Type',
      type: 'select',
      options: [
        'External Audit',
        'Internal Audit',
        'PSC',
        'Flag State',
        'Vetting',
        'Inspection by Staff',
        'Other',
      ],
    },
    { name: 'auditInspectionOther', label: 'If Other, specify', type: 'text' },

    { name: 'reportNo', label: 'Report No.', type: 'text' },
    { name: 'location', label: 'Location', type: 'text' },
    { name: 'reportDate', label: 'Report Date', type: 'date' },
    { name: 'issuedBy', label: 'Issued By', type: 'text' },

    {
      name: 'deficiencyType',
      label: 'Type of Deficiency',
      type: 'select',
      options: ['Major NC', 'NC', 'Observation', 'Deficiency', 'Vessel Reported', 'Others'],
      required: true,
    },
    { name: 'deficiencyTypeOther', label: 'If Others, specify', type: 'text' },

    { name: 'descriptionOfDeficiency', label: 'Description of Deficiency', type: 'textarea', required: true },
    { name: 'analysisOfDeficiency', label: 'Analysis of Deficiency', type: 'textarea' },

    { name: 'immediateBasicCause', label: 'Immediate / Basic Cause', type: 'textarea' },
    { name: 'rootCause', label: 'Root Cause', type: 'textarea' },

    { name: 'correctiveActionsProposed', label: 'Corrective Actions Proposed', type: 'textarea' },
    { name: 'correctiveDueDate', label: 'Corrective Actions - Due Date', type: 'date' },
    { name: 'correctiveCompletedDate', label: 'Corrective Actions - Completed Date', type: 'date' },

    { name: 'preventativeActionsProposed', label: 'Preventative Actions Proposed', type: 'textarea' },
    { name: 'preventativeDueDate', label: 'Preventative Actions - Due Date', type: 'date' },
    { name: 'preventativeCompletedDate', label: 'Preventative Actions - Completed Date', type: 'date' },

    { name: 'objectiveEvidence', label: 'Objective Evidence and Supporting Documents', type: 'textarea' },

    // Authorization
    { name: 'masterName', label: 'Authorization - Master Name', type: 'text' },
    { name: 'masterDate', label: 'Authorization - Master Date', type: 'date' },
    { name: 'masterSignature', label: 'Authorization - Master Signature (Name/Ref)', type: 'text' },

    { name: 'chiefEngineerName', label: 'Authorization - Chief Engineer Name', type: 'text' },
    { name: 'chiefEngineerDate', label: 'Authorization - Chief Engineer Date', type: 'date' },
    { name: 'chiefEngineerSignature', label: 'Authorization - Chief Engineer Signature (Name/Ref)', type: 'text' },

    // Office Use
    { name: 'officeDateReviewed', label: 'Office Use - Date Revd.', type: 'date' },
    { name: 'officeReviewedBy', label: 'Office Use - Reviewed', type: 'text' },
    { name: 'furtherActionRequired', label: 'Office Use - Further Action Required?', type: 'select', options: ['Yes', 'No'] },
    { name: 'closed', label: 'Office Use - Closed?', type: 'select', options: ['Yes', 'No'] },
    { name: 'dpaName', label: 'Office Use - Designated Person Ashore (Name)', type: 'text' },
    { name: 'dpaConclusionsRecommendations', label: 'DPA Conclusions and Recommendations', type: 'textarea' },
  ],
},
// :contentReference[oaicite:0]{index=0}


// ---------------- SMM512 ----------------
{
  code: 'SMM512',
  title: 'Alcohol Breath Test Record',
  description: 'Alcohol breath test header details + results table + Master review.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'imoNumber', label: 'IMO Number', type: 'text' },
    { name: 'location', label: 'Location', type: 'text' },

    { name: 'reasonForTest', label: 'Reason for Test', type: 'text' },
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'time', label: 'Time', type: 'time' },

    { name: 'breathAnalyzer', label: 'Breath Analyzer', type: 'text' },
    { name: 'lastCalibrated', label: 'Last Calibrated', type: 'date' },
    { name: 'nextDue', label: 'Next Due', type: 'date' },

    {
      name: 'testResultsTable',
      label: 'Test Results (No | Rank | Name | %BAC | Crew Signature | Witness Name | Witness Rank | Witness Signature)',
      type: 'textarea',
      required: true,
    },

    { name: 'mastersReviewRecommendations', label: "Master’s Review & Recommendations", type: 'textarea' },
    { name: 'masterName', label: 'Master Name', type: 'text' },
    { name: 'masterSignature', label: 'Master Signature (Name/Ref)', type: 'text' },
    { name: 'masterSignDate', label: 'Master Sign Date', type: 'date' },
  ],
},
// :contentReference[oaicite:1]{index=1}


// ---------------- SMM514 ----------------
{
  code: 'SMM514',
  title: 'Risk Assessment Form',
  description: 'Onboard risk assessment with zone/operation/team + hazard risk matrix.',
  fields: [
    { name: 'company', label: 'Company', type: 'text' },
    { name: 'vesselName', label: 'Vessel (M/V ...)', type: 'text', required: true },
    { name: 'date', label: 'Date', type: 'date', required: true },

    {
      name: 'zone',
      label: 'Zone',
      type: 'select',
      options: ['Navigation', 'Deck', 'Cargo work', 'Machinery in E/R', 'Machinery outside E/R', 'Electrical', 'Others'],
    },
    { name: 'zoneOther', label: 'Zone - Others (specify)', type: 'text' },

    { name: 'operation', label: 'Operation', type: 'text', required: true },
    { name: 'subOperation', label: 'Sub-Operation', type: 'text' },
    { name: 'place', label: 'Place', type: 'text' },

    { name: 'teamLeader', label: 'Risk Assessment Team - Leader (Name/Rank)', type: 'text' },
    { name: 'participants', label: 'Risk Assessment Team - Participants (list)', type: 'textarea' },

    {
      name: 'riskMatrixTable',
      label:
        'Risk Matrix (Ref No | Hazard | Consequence desc | Nature S/E/P | Existing Control | Risk Eval L/C/R | Additional Controls | Re-eval L/C/R | Responsible | Approved by)',
      type: 'textarea',
      required: true,
    },

    { name: 'notes', label: 'Notes / Comments', type: 'textarea' },
  ],
},
// :contentReference[oaicite:2]{index=2}


// ---------------- SMM516 ----------------
{
  code: 'SMM516',
  title: 'Hot Work Permit',
  description: 'Hot work PTW with validity, personnel, pre-work checklist, gas testing, authorization and closure.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'location', label: 'Location', type: 'text' },
    { name: 'permitNo', label: 'Permit No.', type: 'text', required: true },
    {
      name: 'permitSeries',
      label: 'Permit Series',
      type: 'select',
      options: ['D-HW/xxx/YY', 'E-HW/xxx/YY'],
    },
    { name: 'date', label: 'Date', type: 'date', required: true },

    { name: 'validFromTime', label: 'Permit Valid From - Time', type: 'time' },
    { name: 'validFromDate', label: 'Permit Valid From - Date', type: 'date' },
    { name: 'validToTime', label: 'Permit Valid To - Time', type: 'time' },
    { name: 'validToDate', label: 'Permit Valid To - Date', type: 'date' },

    { name: 'locationOfWork', label: 'Location of Work', type: 'text', required: true },
    { name: 'equipmentToBeUsed', label: 'Equipment to be Used', type: 'text' },
    { name: 'descriptionOfWork', label: 'Description of the Work', type: 'textarea', required: true },

    { name: 'riskAssessmentNo', label: 'Risk Assessment - RA No.', type: 'text' },
    { name: 'riskAssessmentRev', label: 'Risk Assessment - Rev', type: 'text' },
    { name: 'riskAssessmentDate', label: 'Risk Assessment - Date', type: 'date' },

    { name: 'isolationPermitNo', label: 'Other Permits - Isolation Permit No', type: 'text' },
    { name: 'enclosedSpacePermitNo', label: 'Other Permits - Enclosed Space Permit No', type: 'text' },
    { name: 'coldWorkPermitNo', label: 'Other Permits - Cold Work Permit No', type: 'text' },
    { name: 'otherPermit', label: 'Other Permits - Any other permit (specify)', type: 'text' },

    { name: 'hotWorkPersonnelRank', label: 'Personnel carrying out Hot Work - Rank', type: 'text' },
    { name: 'hotWorkPersonnelName', label: 'Personnel carrying out Hot Work - Name', type: 'text' },

    { name: 'responsibleForHotWorkRank', label: 'Person responsible for Hot Work - Rank', type: 'text' },
    { name: 'responsibleForHotWorkName', label: 'Person responsible for Hot Work - Name', type: 'text' },

    { name: 'responsibleForSafetyRank', label: 'Person responsible for Safety - Rank', type: 'text' },
    { name: 'responsibleForSafetyName', label: 'Person responsible for Safety - Name', type: 'text' },

    { name: 'preWorkingChecklist', label: 'SECTION 1 - Pre-Working Checklist (Yes/No items)', type: 'textarea', required: true },
    { name: 'gasCheckIntervalMinutes', label: 'Interval for gas checking & recording (minutes)', type: 'number' },

    { name: 'officeApprovalRequired', label: 'Office approval required?', type: 'select', options: ['Yes', 'No'] },
    { name: 'officeApprovalReceivedDate', label: 'Office approval received - Date', type: 'date' },
    { name: 'officeApprovalReceivedTime', label: 'Office approval received - Time', type: 'time' },

    { name: 'enclosedSpacePermitIssued', label: 'Enclosed space entry permit issued?', type: 'select', options: ['Yes', 'No'] },
    { name: 'enclosedSpacePermitIssuedNo', label: 'Enclosed space permit no (if issued)', type: 'text' },
    { name: 'enclosedSpacePermitReasonNo', label: 'Reason if “No” (enclosed space permit)', type: 'text' },

    { name: 'workingAloftIncluded', label: 'Working aloft/side of ship permit included?', type: 'select', options: ['Yes', 'No'] },
    { name: 'workingAloftReasonNo', label: 'Reason if “No” (working aloft)', type: 'text' },

    { name: 'continuousGasTestingTable', label: 'SECTION 2 - Continuous Atmospheric Gas Testing (O2 level | Date/Time | Signature)', type: 'textarea' },
    { name: 'specialConditionsPrecautions', label: 'Special conditions / precautions', type: 'textarea' },

    // Authorisation
    { name: 'authorisedByMasterWorkInCharge', label: 'SECTION 3 - Authorisation (Master & Work In-charge - Name)', type: 'text' },
    { name: 'authorisedBySign', label: 'SECTION 3 - Authorisation - Signature (Name/Ref)', type: 'text' },
    { name: 'authorisedByDateTime', label: 'SECTION 3 - Authorisation - Date/Time', type: 'text' },

    // Closure
    { name: 'workCompletedDate', label: 'SECTION 4 - Work Completed - Date', type: 'date' },
    { name: 'workCompletedTime', label: 'SECTION 4 - Work Completed - Time', type: 'time' },
    { name: 'workCancelledDate', label: 'SECTION 4 - Work Cancelled/Stopped - Date', type: 'date' },
    { name: 'workCancelledTime', label: 'SECTION 4 - Work Cancelled/Stopped - Time', type: 'time' },
    { name: 'permitExpiredDate', label: 'SECTION 4 - Permit time expired - Date', type: 'date' },
    { name: 'permitExpiredTime', label: 'SECTION 4 - Permit time expired - Time', type: 'time' },

    { name: 'masterClosureSignature', label: 'Closure - Master Signature (Name/Ref)', type: 'text' },
    { name: 'workInChargeClosureSignature', label: 'Closure - Work in charge Signature (Name/Ref)', type: 'text' },
    { name: 'authorisedOfficerInCharge', label: 'Closure - Authorised officer in charge (Name/Signature)', type: 'text' },
    { name: 'closureTime', label: 'Closure - Time', type: 'time' },
    { name: 'closureDate', label: 'Closure - Date', type: 'date' },
  ],
},
// :contentReference[oaicite:3]{index=3}


// ---------------- SMM517 ----------------
{
  code: 'SMM517',
  title: 'Enclosed Space Entry Permit',
  description: 'Enclosed space entry PTW with atmospheric tests, BA checks, entry log and closure.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'location', label: 'Location', type: 'text' },
    { name: 'permitNo', label: 'Permit No.', type: 'text', required: true },
    {
      name: 'permitSeries',
      label: 'Permit Series',
      type: 'select',
      options: ['D-HW/xxx/YY', 'E-HW/xxx/YY'],
    },
    { name: 'date', label: 'Date', type: 'date', required: true },

    { name: 'validFromTime', label: 'Permit Valid From - Time', type: 'time' },
    { name: 'validFromDate', label: 'Permit Valid From - Date', type: 'date' },
    { name: 'validToTime', label: 'Permit Valid To - Time', type: 'time' },
    { name: 'validToDate', label: 'Permit Valid To - Date', type: 'date' },

    { name: 'enclosedSpaceName', label: 'Location / Name of Enclosed Space', type: 'text', required: true },
    { name: 'equipmentToBeUsed', label: 'Equipment to be Used', type: 'text' },
    { name: 'reasonForEntry', label: 'Reason for Entry', type: 'textarea', required: true },
    { name: 'previousContentCargo', label: 'Previous content/cargo', type: 'text' },

    { name: 'riskAssessmentNo', label: 'Risk Assessment - RA No.', type: 'text' },
    { name: 'riskAssessmentRev', label: 'Risk Assessment - Rev', type: 'text' },
    { name: 'riskAssessmentDate', label: 'Risk Assessment - Date', type: 'date' },

    { name: 'isolationPermitNo', label: 'Other Permits - Isolation Permit No', type: 'text' },
    { name: 'hotWorkPermitNo', label: 'Other Permits - Hot Work Permit No', type: 'text' },
    { name: 'coldWorkPermitNo', label: 'Other Permits - Cold Work Permit No', type: 'text' },
    { name: 'otherPermit', label: 'Other Permits - Any other permit (specify)', type: 'text' },

    { name: 'personEnteringRank', label: 'Personnel Entering - Rank', type: 'text' },
    { name: 'personEnteringName', label: 'Personnel Entering - Name', type: 'text' },

    { name: 'attendantRank', label: 'Person Attending Space - Rank', type: 'text' },
    { name: 'attendantName', label: 'Person Attending Space - Name', type: 'text' },

    { name: 'responsibleForSafetyRank', label: 'Person Responsible for Safety - Rank', type: 'text' },
    { name: 'responsibleForSafetyName', label: 'Person Responsible for Safety - Name', type: 'text' },

    { name: 'preEntryPreparationChecklist', label: 'SECTION 1 - Pre-Entry Preparation (Yes/No items)', type: 'textarea', required: true },
    { name: 'preEntryAtmosphereTestReadings', label: 'Pre-entry atmosphere test readings table', type: 'textarea' },

    { name: 'preEntryChecksByEntrant', label: 'SECTION 2 - Pre-Entry Checks (by person entering)', type: 'textarea' },
    { name: 'reportingIntervalMinutes', label: 'Reporting interval agreed (minutes)', type: 'number' },

    { name: 'breathingApparatusEquipmentChecks', label: 'SECTION 3 - Breathing apparatus and equipment checks', type: 'textarea' },

    { name: 'signedByMasterOrNominated', label: 'Signed - Master / nominated responsible person (Name)', type: 'text' },
    { name: 'signedByMasterDate', label: 'Signed - Master / nominated responsible person (Date)', type: 'date' },
    { name: 'signedByMasterTime', label: 'Signed - Master / nominated responsible person (Time)', type: 'time' },

    { name: 'signedByAttendant', label: 'Signed - Attendant (Name)', type: 'text' },
    { name: 'signedByAttendantDate', label: 'Signed - Attendant (Date)', type: 'date' },
    { name: 'signedByAttendantTime', label: 'Signed - Attendant (Time)', type: 'time' },

    { name: 'signedByPersonEntering', label: 'Signed - Person entering (Name)', type: 'text' },
    { name: 'signedByPersonEnteringDate', label: 'Signed - Person entering (Date)', type: 'date' },
    { name: 'signedByPersonEnteringTime', label: 'Signed - Person entering (Time)', type: 'time' },

    { name: 'specialInstructionsForAttendants', label: 'SECTION 4 - Special Instructions for Attendants', type: 'textarea' },
    { name: 'personnelEntryLog', label: 'SECTION 4 - Personnel Entry Log (Names | Rank | Times In/Out | Standby)', type: 'textarea' },

    { name: 'confinedSpaceChecklistAttached', label: 'Confined Space entry checklist filled & attached?', type: 'select', options: ['Yes', 'No'] },

    { name: 'masterResponsiblePersonNameSig', label: 'Master/Responsible person (Name/Time/Signature/Date)', type: 'text' },

    { name: 'repetitiveGasChecksRecord', label: 'Record of Repetitive Checks (Gas | Time values)', type: 'textarea' },

    // Closure
    { name: 'jobCompletedDate', label: 'SECTION 5 - Job completed - Date', type: 'date' },
    { name: 'jobCompletedTime', label: 'SECTION 5 - Job completed - Time', type: 'time' },
    { name: 'spaceSecuredDate', label: 'SECTION 5 - Space secured against entry - Date', type: 'date' },
    { name: 'spaceSecuredTime', label: 'SECTION 5 - Space secured against entry - Time', type: 'time' },
    { name: 'oowInformedDate', label: 'SECTION 5 - Officer of the watch informed - Date', type: 'date' },
    { name: 'oowInformedTime', label: 'SECTION 5 - Officer of the watch informed - Time', type: 'time' },

    { name: 'responsiblePersonSupervisingEntry', label: 'Closure - Responsible person supervising entry (Name)', type: 'text' },
    { name: 'responsiblePersonClosureDate', label: 'Closure - Responsible person supervising entry (Date)', type: 'date' },
    { name: 'responsiblePersonClosureTime', label: 'Closure - Responsible person supervising entry (Time)', type: 'time' },

    { name: 'masterClosureName', label: 'Closure - Master (Name)', type: 'text' },
    { name: 'masterClosureDate', label: 'Closure - Master (Date)', type: 'date' },
    { name: 'masterClosureTime', label: 'Closure - Master (Time)', type: 'time' },
  ],
},
// :contentReference[oaicite:4]{index=4}


// ---------------- SMM518 ----------------
{
  code: 'SMM518',
  title: 'Cold Work Permit',
  description: 'Cold work PTW for hazardous areas (non-ignition producing work), with checklist, authorisation and closure.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'location', label: 'Location', type: 'text' },
    { name: 'permitNo', label: 'Permit No.', type: 'text', required: true },
    {
      name: 'permitSeries',
      label: 'Permit Series',
      type: 'select',
      options: ['D-HW/xxx/YY', 'E-HW/xxx/YY'],
    },
    { name: 'date', label: 'Date', type: 'date', required: true },

    { name: 'validFromTime', label: 'Permit Valid From - Time', type: 'time' },
    { name: 'validFromDate', label: 'Permit Valid From - Date', type: 'date' },
    { name: 'validToTime', label: 'Permit Valid To - Time', type: 'time' },
    { name: 'validToDate', label: 'Permit Valid To - Date', type: 'date' },

    { name: 'workLocation', label: 'Location of Work (Designation of Space)', type: 'text', required: true },
    { name: 'equipmentToBeUsed', label: 'Equipment to be Used', type: 'text' },
    { name: 'descriptionOfWork', label: 'Description of the Work', type: 'textarea', required: true },

    { name: 'riskAssessmentNo', label: 'Risk Assessment - RA No.', type: 'text' },
    { name: 'riskAssessmentRev', label: 'Risk Assessment - Rev', type: 'text' },
    { name: 'riskAssessmentDate', label: 'Risk Assessment - Date', type: 'date' },

    { name: 'isolationPermitNo', label: 'Other Permits - Isolation Permit No', type: 'text' },
    { name: 'hotWorkPermitNo', label: 'Other Permits - Hot Work Permit No', type: 'text' },
    { name: 'enclosedSpacePermitNo', label: 'Other Permits - Enclosed Space Work Permit No', type: 'text' },
    { name: 'otherPermit', label: 'Other Permits - Any other permit (specify)', type: 'text' },

    { name: 'coldWorkPersonnelRank', label: 'Personnel carrying out Cold Work - Rank', type: 'text' },
    { name: 'coldWorkPersonnelName', label: 'Personnel carrying out Cold Work - Name', type: 'text' },

    { name: 'responsibleForColdWorkRank', label: 'Person Responsible for Cold Work - Rank', type: 'text' },
    { name: 'responsibleForColdWorkName', label: 'Person Responsible for Cold Work - Name', type: 'text' },

    { name: 'responsibleForSafetyRank', label: 'Person Responsible for Safety - Rank', type: 'text' },
    { name: 'responsibleForSafetyName', label: 'Person Responsible for Safety - Name', type: 'text' },

    { name: 'preWorkingChecklist', label: 'SECTION 1 - Pre-Working Checklist (Yes/No items)', type: 'textarea', required: true },
    { name: 'ppeSpecify', label: 'PPE used (specify)', type: 'text' },

    { name: 'enclosedSpaceEntryPermitIssued', label: 'Enclosed space entry permit issued?', type: 'select', options: ['Yes', 'No'] },
    { name: 'enclosedSpaceEntryPermitNo', label: 'Enclosed space entry permit no', type: 'text' },

    { name: 'riskAssessmentPreparedReviewed', label: 'Risk assessment prepared/reviewed?', type: 'select', options: ['Yes', 'No'] },
    { name: 'riskAssessmentJobNo', label: 'Job RA No', type: 'text' },

    { name: 'specialConditionsPrecautions', label: 'Special conditions / precautions', type: 'textarea' },

    // Authorisation
    { name: 'authorisedByMasterWorkInCharge', label: 'SECTION 2 - Authorisation (Master & Work In-charge - Name)', type: 'text' },
    { name: 'authorisedByDateTime', label: 'SECTION 2 - Authorisation - Date/Time', type: 'text' },
    { name: 'authorisedBySign', label: 'SECTION 2 - Authorisation - Signature (Name/Ref)', type: 'text' },

    // Closure
    { name: 'workCompletedDate', label: 'SECTION 3 - Work Completed - Date', type: 'date' },
    { name: 'workCompletedTime', label: 'SECTION 3 - Work Completed - Time', type: 'time' },
    { name: 'workCancelledDate', label: 'SECTION 3 - Work Cancelled/Stopped - Date', type: 'date' },
    { name: 'workCancelledTime', label: 'SECTION 3 - Work Cancelled/Stopped - Time', type: 'time' },
    { name: 'permitExpiredDate', label: 'SECTION 3 - Permit time expired - Date', type: 'date' },
    { name: 'permitExpiredTime', label: 'SECTION 3 - Permit time expired - Time', type: 'time' },

    { name: 'closureRemarks', label: 'Closure - Remarks', type: 'textarea' },
    { name: 'masterClosureSignature', label: 'Closure - Master Signature (Name/Ref)', type: 'text' },
    { name: 'workInChargeClosureSignature', label: 'Closure - Work in charge Signature (Name/Ref)', type: 'text' },
    { name: 'authorisedOfficerInCharge', label: 'Closure - Authorised officer in charge (Name/Signature)', type: 'text' },
    { name: 'closureTime', label: 'Closure - Time', type: 'time' },
    { name: 'closureDate', label: 'Closure - Date', type: 'date' },
  ],
},
// :contentReference[oaicite:5]{index=5}


// ---------------- SMM519 ----------------
{
  code: 'SMM519',
  title: 'Working Aloft Permit',
  description: 'Work at height (aloft) PTW with isolation/LOTO, checklist, authorisation and closure.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'location', label: 'Location', type: 'text' },
    { name: 'permitNo', label: 'Permit No.', type: 'text', required: true },
    {
      name: 'permitSeries',
      label: 'Permit Series',
      type: 'select',
      options: ['D-HW/xxx/YY', 'E-HW/xxx/YY'],
    },
    { name: 'date', label: 'Date', type: 'date', required: true },

    { name: 'validFromTime', label: 'Permit Valid From - Time', type: 'time' },
    { name: 'validFromDate', label: 'Permit Valid From - Date', type: 'date' },
    { name: 'validToTime', label: 'Permit Valid To - Time', type: 'time' },
    { name: 'validToDate', label: 'Permit Valid To - Date', type: 'date' },

    { name: 'workLocation', label: 'Location of Work (Designation of Space)', type: 'text', required: true },
    { name: 'descriptionOfWork', label: 'Description of the Work', type: 'textarea', required: true },
    { name: 'typeOfCargo', label: 'Type of Cargo', type: 'text' },

    { name: 'riskAssessmentNo', label: 'Risk Assessment - RA No.', type: 'text' },
    { name: 'riskAssessmentRev', label: 'Risk Assessment - Rev', type: 'text' },
    { name: 'riskAssessmentDate', label: 'Risk Assessment - Date', type: 'date' },

    { name: 'isolationPermitNo', label: 'Other Permits - Isolation Permit No', type: 'text' },
    { name: 'hotWorkPermitNo', label: 'Other Permits - Hot Work Permit No', type: 'text' },
    { name: 'coldWorkPermitNo', label: 'Other Permits - Cold Work Permit No', type: 'text' },
    { name: 'otherPermit', label: 'Other Permits - Any other permit (specify)', type: 'text' },

    { name: 'personnelRank', label: 'Personnel carrying out work - Rank', type: 'text' },
    { name: 'personnelName', label: 'Personnel carrying out work - Name', type: 'text' },

    { name: 'responsibleForWorkRank', label: 'Person Responsible for Work - Rank', type: 'text' },
    { name: 'responsibleForWorkName', label: 'Person Responsible for Work - Name', type: 'text' },

    { name: 'responsibleForSafetyRank', label: 'Person Responsible for Safety - Rank', type: 'text' },
    { name: 'responsibleForSafetyName', label: 'Person Responsible for Safety - Name', type: 'text' },

    { name: 'checklistIsolationData', label: 'SECTION 1 - Checklist / Isolation Data (LOTO items)', type: 'textarea', required: true },
    { name: 'preWorkingChecklist', label: 'SECTION 2 - Pre-Working Checklist (Yes/No items)', type: 'textarea', required: true },

    { name: 'ppeSpecify', label: 'PPE used (specify)', type: 'text' },
    { name: 'specialConditionsPrecautions', label: 'Special conditions / precautions', type: 'textarea' },

    // Authorisation
    { name: 'authorisedByMasterWorkInCharge', label: 'SECTION 3 - Authorisation (Master & Work In-charge - Name)', type: 'text' },
    { name: 'authorisedByDateTime', label: 'SECTION 3 - Authorisation - Date/Time', type: 'text' },
    { name: 'authorisedBySign', label: 'SECTION 3 - Authorisation - Signature (Name/Ref)', type: 'text' },

    // Closure
    { name: 'workCompletedDate', label: 'SECTION 4 - Work Completed - Date', type: 'date' },
    { name: 'workCompletedTime', label: 'SECTION 4 - Work Completed - Time', type: 'time' },
    { name: 'workCancelledDate', label: 'SECTION 4 - Work Cancelled/Stopped - Date', type: 'date' },
    { name: 'workCancelledTime', label: 'SECTION 4 - Work Cancelled/Stopped - Time', type: 'time' },
    { name: 'permitExpiredDate', label: 'SECTION 4 - Permit time expired - Date', type: 'date' },
    { name: 'permitExpiredTime', label: 'SECTION 4 - Permit time expired - Time', type: 'time' },

    { name: 'closureRemarks', label: 'Closure - Remarks', type: 'textarea' },
    { name: 'masterClosureSignature', label: 'Closure - Master Signature (Name/Ref)', type: 'text' },
    { name: 'workInChargeClosureSignature', label: 'Closure - Work in charge Signature (Name/Ref)', type: 'text' },
    { name: 'authorisedOfficerInCharge', label: 'Closure - Authorised officer in charge (Name/Signature)', type: 'text' },
    { name: 'closureTime', label: 'Closure - Time', type: 'time' },
    { name: 'closureDate', label: 'Closure - Date', type: 'date' },
  ],
},
// :contentReference[oaicite:6]{index=6}


// ---------------- SMM521 ----------------
{
  code: 'SMM521',
  title: 'Working on Deck in Heavy Weather - Work Permit',
  description: 'Permit for deck work in heavy weather with toolbox/communication checks and closure.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'location', label: 'Location', type: 'text' },
    { name: 'permitNo', label: 'Permit No.', type: 'text', required: true },
    {
      name: 'permitSeries',
      label: 'Permit Series',
      type: 'select',
      options: ['D-HW/xxx/YY', 'E-HW/xxx/YY'],
    },
    { name: 'date', label: 'Date', type: 'date', required: true },

    { name: 'validFromTime', label: 'Permit Valid From - Time', type: 'time' },
    { name: 'validFromDate', label: 'Permit Valid From - Date', type: 'date' },
    { name: 'validToTime', label: 'Permit Valid To - Time', type: 'time' },
    { name: 'validToDate', label: 'Permit Valid To - Date', type: 'date' },

    { name: 'deckWorkLocation', label: 'Location of Work (At Deck)', type: 'text', required: true },
    { name: 'reasonForGoingOnDeck', label: 'Reason for Going on Deck', type: 'textarea', required: true },

    { name: 'riskAssessmentNo', label: 'Risk Assessment - RA No.', type: 'text' },
    { name: 'riskAssessmentRev', label: 'Risk Assessment - Rev', type: 'text' },
    { name: 'riskAssessmentDate', label: 'Risk Assessment - Date', type: 'date' },

    { name: 'isolationPermitNo', label: 'Other Permits - Isolation Permit No', type: 'text' },
    { name: 'hotWorkPermitNo', label: 'Other Permits - Hot Work Permit No', type: 'text' },
    { name: 'coldWorkPermitNo', label: 'Other Permits - Cold Work Permit No', type: 'text' },
    { name: 'otherPermit', label: 'Other Permits - Any other permit (specify)', type: 'text' },

    { name: 'teamMembers', label: 'Personnel carrying out Work (Team leader + members) - Rank/Name', type: 'textarea', required: true },
    { name: 'responsibleForWorkRank', label: 'Person responsible for Work - Rank', type: 'text' },
    { name: 'responsibleForWorkName', label: 'Person responsible for Work - Name', type: 'text' },
    { name: 'responsibleForSafetyRank', label: 'Person responsible for Safety - Rank', type: 'text' },
    { name: 'responsibleForSafetyName', label: 'Person responsible for Safety - Name', type: 'text' },

    { name: 'checksPriorToGoingOnDeck', label: 'SECTION 1 - Checks prior to going on deck (Yes/No items)', type: 'textarea', required: true },

    // Statements & sign-off
    { name: 'masterName', label: 'Master - Name', type: 'text' },
    { name: 'oowName', label: 'Officer of the Watch - Name', type: 'text' },
    { name: 'teamLeaderName', label: 'Team leader - Name', type: 'text' },

    { name: 'briefingTime', label: 'Time of briefing of all personnel involved', type: 'time' },
    { name: 'expectedStartTime', label: 'Expected time of starting work', type: 'time' },
    { name: 'expectedDuration', label: 'Expected duration', type: 'text' },

    { name: 'masterSignature', label: 'Master Signature (Name/Ref)', type: 'text' },
    { name: 'signOffDate', label: 'Sign-off Date', type: 'date' },
    { name: 'signOffTime', label: 'Sign-off Time', type: 'time' },

    // Closure
    { name: 'workCompletedDate', label: 'SECTION 4 - Work Completed - Date', type: 'date' },
    { name: 'workCompletedTime', label: 'SECTION 4 - Work Completed - Time', type: 'time' },
    { name: 'workCancelledDate', label: 'SECTION 4 - Work Cancelled/Stopped - Date', type: 'date' },
    { name: 'workCancelledTime', label: 'SECTION 4 - Work Cancelled/Stopped - Time', type: 'time' },
    { name: 'permitExpiredDate', label: 'SECTION 4 - Permit time expired - Date', type: 'date' },
    { name: 'permitExpiredTime', label: 'SECTION 4 - Permit time expired - Time', type: 'time' },

    { name: 'closureRemarks', label: 'Closure - Remarks', type: 'textarea' },
    { name: 'responsibleOfficer', label: 'Closure - Responsible officer (Name/Signature)', type: 'text' },
    { name: 'permitClosedDate', label: 'PERMIT CLOSED - Date', type: 'date' },
    { name: 'permitClosedTime', label: 'PERMIT CLOSED - Time', type: 'time' },
    { name: 'masterClosureSignature', label: 'PERMIT CLOSED - Signature of Master (Name/Ref)', type: 'text' },
  ],
},
// :contentReference[oaicite:7]{index=7}


// ---------------- SMM522 ----------------
{
  code: 'SMM522',
  title: 'Diving Operation Permit',
  description: 'Diving PTW with contractor/supervisor details, diving checklist, authorisation and closure.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'location', label: 'Location', type: 'text' },
    { name: 'permitNo', label: 'Permit No.', type: 'text', required: true },
    {
      name: 'permitSeries',
      label: 'Permit Series',
      type: 'select',
      options: ['D-HW/xxx/YY', 'E-HW/xxx/YY'],
    },
    { name: 'date', label: 'Date', type: 'date', required: true },

    { name: 'validFromTime', label: 'Permit Valid From - Time', type: 'time' },
    { name: 'validFromDate', label: 'Permit Valid From - Date', type: 'date' },
    { name: 'validToTime', label: 'Permit Valid To - Time', type: 'time' },
    { name: 'validToDate', label: 'Permit Valid To - Date', type: 'date' },

    { name: 'workLocation', label: 'Location of Work (Designation of Space)', type: 'text', required: true },
    { name: 'descriptionOfWork', label: 'Description of the Work', type: 'textarea', required: true },

    { name: 'riskAssessmentNo', label: 'Risk Assessment - RA No.', type: 'text' },
    { name: 'riskAssessmentRev', label: 'Risk Assessment - Rev', type: 'text' },
    { name: 'riskAssessmentDate', label: 'Risk Assessment - Date', type: 'date' },

    { name: 'isolationPermitNo', label: 'Other Permits - Isolation Permit No', type: 'text' },
    { name: 'hotWorkPermitNo', label: 'Other Permits - Hot Work Permit No', type: 'text' },
    { name: 'coldWorkPermitNo', label: 'Other Permits - Cold Work Permit No', type: 'text' },
    { name: 'otherPermit', label: 'Other Permits - Any other permit (specify)', type: 'text' },

    { name: 'diverName', label: 'Diver Name', type: 'text' },
    { name: 'diverContactNo', label: 'Diver Contact No', type: 'text' },
    { name: 'diverEmail', label: 'Diver Email', type: 'text' },

    { name: 'divingSupervisorName', label: 'Diving Supervisor', type: 'text' },
    { name: 'divingSupervisorContactNo', label: 'Diving Supervisor Contact No', type: 'text' },
    { name: 'divingSupervisorEmail', label: 'Diving Supervisor Email', type: 'text' },

    { name: 'divingContractorCompany', label: 'Diving Contractor (Company)', type: 'text' },
    { name: 'contractorAddress', label: 'Contractor Address', type: 'textarea' },
    { name: 'contractorTelephone', label: 'Contractor Telephone', type: 'text' },
    { name: 'contractorEmail', label: 'Contractor Email', type: 'text' },

    { name: 'vhfChannel', label: 'Communications - VHF Channel', type: 'text' },
    { name: 'onsiteTelephone', label: 'Communications - On-site telephone/mobile number', type: 'text' },

    { name: 'divingSupervisorDeclaration', label: 'Declaration by Diving Supervisor (text / confirmation)', type: 'textarea' },
    { name: 'divingSupervisorDeclarationSign', label: 'Diving Supervisor - Signed (Name/Ref)', type: 'text' },
    { name: 'divingSupervisorDeclarationName', label: 'Diving Supervisor - Name', type: 'text' },
    { name: 'divingSupervisorDeclarationDateTime', label: 'Diving Supervisor - Date/Time', type: 'text' },

    { name: 'divingChecklist', label: 'SECTION 1 - Diving Checklist (Yes/No items)', type: 'textarea', required: true },
    { name: 'preWorkingChecklist', label: 'SECTION 2 - Pre-Working Checklist (Master/Officer in Charge)', type: 'textarea', required: true },
    { name: 'specialConditionsPrecautions', label: 'Special conditions / precautions', type: 'textarea' },

    // Authorisation
    { name: 'permissionGrantedBy', label: 'SECTION 3 - Permission for Diving Granted - Signed for/ Master', type: 'text' },
    { name: 'permissionGrantedByName', label: 'SECTION 3 - Name', type: 'text' },
    { name: 'permissionGrantedDateTime', label: 'SECTION 3 - Date/Time', type: 'text' },

    // Closure
    { name: 'workCompletedDate', label: 'SECTION 4 - Work Completed - Date', type: 'date' },
    { name: 'workCompletedTime', label: 'SECTION 4 - Work Completed - Time', type: 'time' },
    { name: 'workCancelledDate', label: 'SECTION 4 - Work Cancelled/Stopped - Date', type: 'date' },
    { name: 'workCancelledTime', label: 'SECTION 4 - Work Cancelled/Stopped - Time', type: 'time' },
    { name: 'permitExpiredDate', label: 'SECTION 4 - Permit time expired - Date', type: 'date' },
    { name: 'permitExpiredTime', label: 'SECTION 4 - Permit time expired - Time', type: 'time' },

    { name: 'closureRemarks', label: 'Closure - Remarks', type: 'textarea' },
    { name: 'masterClosureSignature', label: 'Closure - Master Signature (Name/Ref)', type: 'text' },
    { name: 'divingSupervisorClosureSignature', label: 'Closure - Diving Supervisor Signature (Name/Ref)', type: 'text' },
    { name: 'authorisedOfficerInCharge', label: 'Closure - Authorised officer in charge (Name/Signature)', type: 'text' },
    { name: 'closureTime', label: 'Closure - Time', type: 'time' },
    { name: 'closureDate', label: 'Closure - Date', type: 'date' },
  ],
},
// :contentReference[oaicite:8]{index=8}


// ---------------- SMM525 ----------------
{
  code: 'SMM525',
  title: 'Working on Pressure Systems Permit',
  description: 'PTW for pressure vessels/pipelines with isolation checks, CE/2E verification, master authorisation and closure.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'location', label: 'Location', type: 'text' },
    { name: 'permitNo', label: 'Permit No.', type: 'text', required: true },
    {
      name: 'permitSeries',
      label: 'Permit Series',
      type: 'select',
      options: ['D-HW/xxx/YY', 'E-HW/xxx/YY'],
    },
    { name: 'date', label: 'Date', type: 'date', required: true },

    { name: 'validFromTime', label: 'Permit Valid From - Time', type: 'time' },
    { name: 'validFromDate', label: 'Permit Valid From - Date', type: 'date' },
    { name: 'validToTime', label: 'Permit Valid To - Time', type: 'time' },
    { name: 'validToDate', label: 'Permit Valid To - Date', type: 'date' },

    { name: 'workLocation', label: 'Work Location', type: 'text', required: true },
    { name: 'typeOfCargo', label: 'Type of Cargo', type: 'text' },
    { name: 'reasonOfWork', label: 'Reason of Work', type: 'textarea', required: true },

    { name: 'testPressure', label: 'Pipeline/Hose test pressure', type: 'text' },
    { name: 'testMedium', label: 'Test Medium', type: 'text' },
    { name: 'testDuration', label: 'Test Duration', type: 'text' },

    { name: 'riskAssessmentNo', label: 'Risk Assessment - RA No.', type: 'text' },
    { name: 'riskAssessmentRev', label: 'Risk Assessment - Rev', type: 'text' },
    { name: 'riskAssessmentDate', label: 'Risk Assessment - Date', type: 'date' },

    { name: 'isolationPermitNo', label: 'Other Permits - Isolation Permit No', type: 'text' },
    { name: 'enclosedSpacePermitNo', label: 'Other Permits - Enclosed Space Permit No', type: 'text' },
    { name: 'coldWorkPermitNo', label: 'Other Permits - Cold Work Permit No', type: 'text' },
    { name: 'otherPermit', label: 'Other Permits - Any other permit (specify)', type: 'text' },

    { name: 'personnelRank', label: 'Personnel carrying out work - Rank', type: 'text' },
    { name: 'personnelName', label: 'Personnel carrying out work - Name', type: 'text' },

    { name: 'responsibleForWorkRank', label: 'Person Responsible for Work - Rank', type: 'text' },
    { name: 'responsibleForWorkName', label: 'Person Responsible for Work - Name', type: 'text' },

    { name: 'responsibleForSafetyRank', label: 'Person Responsible for Safety - Rank', type: 'text' },
    { name: 'responsibleForSafetyName', label: 'Person Responsible for Safety - Name', type: 'text' },

    // Section 1 (CE/2E)
    { name: 'section1Checklist', label: 'SECTION 1 - Pre-Working Checklist (CE/2E) (Yes/No items)', type: 'textarea', required: true },
    { name: 'ce2eNameSignature', label: 'CE/2E confirmation - Name/Signature', type: 'text' },
    { name: 'ce2eDate', label: 'CE/2E confirmation - Date', type: 'date' },
    { name: 'ce2eTime', label: 'CE/2E confirmation - Time', type: 'time' },

    // Section 2 (Worker/Team leader)
    { name: 'section2PreEntryChecks', label: 'SECTION 2 - Pre-Entry Checks (Yes/No items)', type: 'textarea', required: true },
    { name: 'workerTeamLeaderNameRankSignature', label: 'Person working/Team leader - Name/Rank/Signature', type: 'text' },
    { name: 'workerTeamLeaderDate', label: 'Person working/Team leader - Date', type: 'date' },
    { name: 'workerTeamLeaderTime', label: 'Person working/Team leader - Time', type: 'time' },

    { name: 'counterCheckCe2eNameSignature', label: 'Counter check by CE/2E - Name/Signature', type: 'text' },
    { name: 'counterCheckCe2eDate', label: 'Counter check by CE/2E - Date', type: 'date' },
    { name: 'counterCheckCe2eTime', label: 'Counter check by CE/2E - Time', type: 'time' },

    // Section 3 (Master Authorisation)
    { name: 'masterRemarksSpecialPrecautions', label: 'SECTION 3 - Remarks / Special Precautions', type: 'textarea' },
    { name: 'permitGrantedFrom', label: 'SECTION 3 - Permit Granted From', type: 'text' },
    { name: 'permitGrantedTo', label: 'SECTION 3 - Permit Granted To', type: 'text' },
    { name: 'masterNameSignature', label: 'SECTION 3 - Master Name/Signature', type: 'text' },
    { name: 'masterDate', label: 'SECTION 3 - Date', type: 'date' },
    { name: 'masterTime', label: 'SECTION 3 - Time', type: 'time' },

    // Section 4 (Closure)
    { name: 'workCompletedDate', label: 'SECTION 4 - Work Completed - Date', type: 'date' },
    { name: 'workCompletedTime', label: 'SECTION 4 - Work Completed - Time', type: 'time' },
    { name: 'workCancelledDate', label: 'SECTION 4 - Work Cancelled/Stopped - Date', type: 'date' },
    { name: 'workCancelledTime', label: 'SECTION 4 - Work Cancelled/Stopped - Time', type: 'time' },
    { name: 'permitExpiredDate', label: 'SECTION 4 - Permit time expired - Date', type: 'date' },
    { name: 'permitExpiredTime', label: 'SECTION 4 - Permit time expired - Time', type: 'time' },

    { name: 'closureRemarks', label: 'SECTION 4 - Remarks', type: 'textarea' },
    { name: 'masterClosureSignature', label: 'Closure - Master Signature (Name/Ref)', type: 'text' },
    { name: 'closureTime', label: 'Closure - Time', type: 'time' },
    { name: 'closureDate', label: 'Closure - Date', type: 'date' },

    { name: 'authorisedOfficerCe2e', label: 'Closure - Authorised officer in charge (CE/2E) Name/Signature', type: 'text' },
    { name: 'authorisedOfficerTime', label: 'Closure - Authorised officer Time', type: 'time' },
    { name: 'authorisedOfficerDate', label: 'Closure - Authorised officer Date', type: 'date' },
  ],
},
// :contentReference[oaicite:9]{index=9}
// ======================= Form Field Extraction =======================

// ---------------- SMM527 ----------------
{
  code: 'SMM527',
  title: 'Calibration Record',
  description: 'Calibration/inspection record for gas measuring & precision equipment with onboard + shore calibration due dates and signatures.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'date', label: 'Date', type: 'date', required: true },

    {
      name: 'calibrationTable',
      label:
        'Calibration Record (Tool/Equipment/Instrument | Type | Serial No | Monthly Inspection/Gas Response Check (Alarms Pass/Fail) | Required Calibrated Reading (Ref Gas/Instrument) | Uncalibrated Reading | Corrected Reading | Quarterly Onboard Calibration | Next Onboard Calibration Due | Last Shore Calibration/Sensor Replacement/Unit Exchange (max 24 months) | Next Due Shore Calibration/Sensor Replacement/Unit Exchange | Signature Name/Rank)',
      type: 'textarea',
      required: true,
    },

    { name: 'remarks', label: 'Remarks', type: 'textarea' },

    { name: 'masterName', label: 'Master - Name', type: 'text' },
    { name: 'masterDate', label: 'Master - Date', type: 'date' },
    { name: 'masterSignature', label: 'Master - Signature (Name/Ref)', type: 'text' },

    { name: 'chiefOfficerName', label: 'Chief Officer - Name', type: 'text' },
    { name: 'chiefOfficerDate', label: 'Chief Officer - Date', type: 'date' },
    { name: 'chiefOfficerSignature', label: 'Chief Officer - Signature (Name/Ref)', type: 'text' },

    { name: 'chiefEngineerName', label: 'Chief Engineer - Name', type: 'text' },
    { name: 'chiefEngineerDate', label: 'Chief Engineer - Date', type: 'date' },
    { name: 'chiefEngineerSignature', label: 'Chief Engineer - Signature (Name/Ref)', type: 'text' },
  ],
},
// :contentReference[oaicite:0]{index=0}


// ---------------- SMM551 ----------------
{
  code: 'SMM551',
  title: 'Elevator Work Permit',
  description: 'Elevator maintenance work permit with safety checks, authorisation, and closure/cancellation.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'location', label: 'Location', type: 'text', required: true },
    { name: 'permitNo', label: 'Permit No', type: 'text', required: true },
    { name: 'date', label: 'Date', type: 'date', required: true },

    { name: 'validFromTime', label: 'Permit Valid From - Time', type: 'time' },
    { name: 'validFromDate', label: 'Permit Valid From - Date', type: 'date' },
    { name: 'validToTime', label: 'Permit Valid To - Time', type: 'time' },
    { name: 'validToDate', label: 'Permit Valid To - Date', type: 'date' },

    { name: 'descriptionOfWork', label: 'Description of Work', type: 'textarea', required: true },
    { name: 'weatherCondition', label: 'Weather Condition', type: 'text' },

    { name: 'personnelCarryingOutRank', label: 'Personnel Carrying out Work - Rank', type: 'text' },
    { name: 'personnelCarryingOutName', label: 'Personnel Carrying out Work - Name', type: 'text' },

    { name: 'responsibleForWorkRank', label: 'Person Responsible for Work - Rank', type: 'text' },
    { name: 'responsibleForWorkName', label: 'Person Responsible for Work - Name', type: 'text' },

    { name: 'responsibleForSafetyRank', label: 'Person Responsible for Safety - Rank', type: 'text' },
    { name: 'responsibleForSafetyName', label: 'Person Responsible for Safety - Name', type: 'text' },

    {
      name: 'section1SafetyChecks',
      label: 'SECTION 1 - Safety Checks (Yes/No items + remarks)',
      type: 'textarea',
      required: true,
    },

    // Authorisation
    { name: 'chiefSecondEngineerName', label: 'SECTION 2 - Chief/Second Engineer - Name', type: 'text' },
    { name: 'chiefSecondEngineerRank', label: 'SECTION 2 - Chief/Second Engineer - Rank', type: 'text' },
    { name: 'chiefSecondEngineerSignature', label: 'SECTION 2 - Chief/Second Engineer - Signature (Name/Ref)', type: 'text' },
    { name: 'chiefSecondEngineerTime', label: 'SECTION 2 - Chief/Second Engineer - Time', type: 'time' },
    { name: 'chiefSecondEngineerDate', label: 'SECTION 2 - Chief/Second Engineer - Date', type: 'date' },

    { name: 'personnelAttendingWork', label: 'Personnel Attending Work (multiple) - Name/Rank/Signature/Time/Date', type: 'textarea' },

    // Closure/Cancellation
    { name: 'workCompletedDate', label: 'SECTION 3 - Work Completed - Date', type: 'date' },
    { name: 'workCompletedTime', label: 'SECTION 3 - Work Completed - Time', type: 'time' },
    { name: 'workCancelledDate', label: 'SECTION 3 - Work Cancelled/Stopped - Date', type: 'date' },
    { name: 'workCancelledTime', label: 'SECTION 3 - Work Cancelled/Stopped - Time', type: 'time' },
    { name: 'permitExpiredDate', label: 'SECTION 3 - Work Permit time Expired - Date', type: 'date' },
    { name: 'permitExpiredTime', label: 'SECTION 3 - Work Permit time Expired - Time', type: 'time' },

    { name: 'closureRemarks', label: 'Remarks', type: 'textarea' },

    { name: 'masterName', label: 'MASTER - Name', type: 'text' },
    { name: 'masterSignature', label: 'MASTER - Signature (Name/Ref)', type: 'text' },
    { name: 'masterTime', label: 'MASTER - Time', type: 'time' },
    { name: 'masterDate', label: 'MASTER - Date', type: 'date' },

    { name: 'authorisedOfficerInChargeNameSignature', label: 'Authorised officer in charge - Name & Signature', type: 'text' },
    { name: 'authorisedOfficerInChargeTime', label: 'Authorised officer in charge - Time', type: 'time' },
    { name: 'authorisedOfficerInChargeDate', label: 'Authorised officer in charge - Date', type: 'date' },
  ],
},
// :contentReference[oaicite:1]{index=1}


// ---------------- TMM505d ----------------
{
  code: 'TMM505d',
  title: 'Ship-Shore Safety Checklist',
  description: 'ISGOTT Ship/Terminal safety checklist with pre-arrival/mooring checks, conference checks, agreements, declaration and repetitive checks.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'voyageNo', label: 'Voyage No', type: 'text' },
    { name: 'portBerth', label: 'Port / Berth', type: 'text' },
    { name: 'terminalName', label: 'Terminal Name', type: 'text' },
    { name: 'cargoToBeTransferred', label: 'Cargo to be Transferred', type: 'text' },
    { name: 'dateTime', label: 'Date & Time', type: 'text', required: true },

    { name: 'part1aPreArrivalChecks', label: 'Part 1A - Tanker Checks Pre-Arrival (table)', type: 'textarea' },
    { name: 'part1bIGSPreArrivalChecks', label: 'Part 1B - Pre-Arrival Checks (If using Inert Gas System) (table)', type: 'textarea' },
    { name: 'part1cAfterMooringChecks', label: 'Part 1C - Checks After Mooring (table)', type: 'textarea' },

    { name: 'part2aPreTransferConference', label: 'Part 2A - Tanker & Terminal Pre-Transfer Conference (table)', type: 'textarea' },
    { name: 'part2bChemicalsPreTransfer', label: 'Part 2B - Bulk Liquid Chemicals Checks Pre-Transfer (table)', type: 'textarea' },
    { name: 'part2cGasPreTransfer', label: 'Part 2C - Liquefied Gas Checks Pre-Transfer (table)', type: 'textarea' },

    { name: 'part3AgreementsPreTransfer', label: 'Part 3 - Agreements Pre-Transfer (table)', type: 'textarea' },

    { name: 'part4aGeneralPreTransferChecks', label: 'Part 4A - General Tanker Checks Pre-Transfer (table)', type: 'textarea' },
    { name: 'part4bCrudeOilWashingChecks', label: 'Part 4B - Checks Pre-Transfer If Crude Oil Washing Planned (table)', type: 'textarea' },
    { name: 'part4cTankCleaningGasFreeingChecks', label: 'Part 4C - Checks Prior to Tank Cleaning/Gas Freeing (table)', type: 'textarea' },

    { name: 'declarationApplicableParts', label: 'Declaration - Applicable Parts ticked (list)', type: 'textarea' },

    { name: 'tankerSignName', label: 'Tanker - Name', type: 'text' },
    { name: 'tankerSignRank', label: 'Tanker - Rank/Position', type: 'text' },
    { name: 'tankerSignature', label: 'Tanker - Signature (Name/Ref)', type: 'text' },
    { name: 'tankerSignDate', label: 'Tanker - Date', type: 'date' },
    { name: 'tankerSignTime', label: 'Tanker - Time', type: 'time' },

    { name: 'terminalSignName', label: 'Terminal - Name', type: 'text' },
    { name: 'terminalSignPosition', label: 'Terminal - Position', type: 'text' },
    { name: 'terminalSignature', label: 'Terminal - Signature (Name/Ref)', type: 'text' },
    { name: 'terminalSignDate', label: 'Terminal - Date', type: 'date' },
    { name: 'terminalSignTime', label: 'Terminal - Time', type: 'time' },

    { name: 'repetitiveChecksIntervalHours', label: 'Repetitive Checks Interval (hours)', type: 'number' },
    { name: 'part5RepetitiveChecksTable', label: 'Part 5 - Repetitive Checks During/After Transfer (table: checks + times)', type: 'textarea' },
  ],
},
// :contentReference[oaicite:2]{index=2}


// ---------------- TMM505e ----------------
{
  code: 'TMM505e',
  title: 'Tank Vessel Cargo Oil Transfer Procedures',
  description: 'Oil transfer procedure sheet: product list, personnel duties, mooring watch, topping-off parameters, PIC designation and Master sign-off.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'port', label: 'Port', type: 'text', required: true },
    { name: 'date', label: 'Date', type: 'date', required: true },

    { name: 'productsTable', label: 'Products to be transferred (Generic Name | Other Information)', type: 'textarea', required: true },

    { name: 'dripTrayTankNo', label: 'Drip tray emptied into Cargo Tank No.', type: 'text' },

    { name: 'totalPersonnelRequired', label: 'Total personnel required on duty', type: 'number' },

    { name: 'dutiesTable', label: 'Duties & title of each person on duty (Name/Rank | Duty) including PIC/CCR/ER/Soundings', type: 'textarea' },
    { name: 'mooringsPersonnelTable', label: 'Personnel on duty to tend moorings (Name/Rank | Duty Procedures)', type: 'textarea' },

    { name: 'toppingOffParams', label: 'Topping off procedures (percent full thresholds, rate reductions, etc.)', type: 'textarea' },

    { name: 'terminalName', label: 'Terminal (for PIC designation)', type: 'text' },

    { name: 'personInChargeName', label: 'Person in charge of all Cargo Transfer Operations - Name', type: 'text' },
    { name: 'personInChargeRank', label: 'Person in charge - Rank', type: 'text' },

    { name: 'alternatePersonName', label: 'Alternate person in charge - Name', type: 'text' },
    { name: 'alternatePersonRank', label: 'Alternate person in charge - Rank', type: 'text' },
    { name: 'alternateLicenseGrade', label: 'Alternate person license grade', type: 'text' },

    { name: 'masterName', label: 'Master - Name', type: 'text' },
    { name: 'masterDate', label: 'Master - Date', type: 'date' },
    { name: 'masterSignatureStamp', label: 'Master - Signature/Stamp (Name/Ref)', type: 'text' },
  ],
},
// :contentReference[oaicite:3]{index=3}


// ---------------- TMM505i ----------------
{
  code: 'TMM505i',
  title: 'Cargo Operations SOF',
  description: 'Statement of Facts for cargo operations: header details + time log table + Master/Agent signatures.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'portTerminalBerth', label: 'Port / Terminal / Berth', type: 'text', required: true },
    { name: 'chartererOwnerOfCargo', label: 'Charterer / Owner of Cargo', type: 'text' },
    { name: 'cargoLoadedDischarged', label: 'Cargo Loaded / Discharged', type: 'text' },
    { name: 'agencyName', label: 'Agency Name', type: 'text' },
    { name: 'quantityLoadedDischarged', label: 'Quantity Loaded / Discharged', type: 'text' },
    { name: 'voyageNo', label: 'Voyage No', type: 'text' },

    {
      name: 'sofLogTable',
      label: 'SOF Log (Time From | Time To | Item)',
      type: 'textarea',
      required: true,
    },

    { name: 'masterName', label: 'Master - Name', type: 'text' },
    { name: 'masterSignature', label: 'Master - Signature (Name/Ref)', type: 'text' },

    { name: 'agentName', label: 'Agent - Name', type: 'text' },
    { name: 'agentSignature', label: 'Agent - Signature (Name/Ref)', type: 'text' },
  ],
},
// :contentReference[oaicite:4]{index=4}


// ---------------- TOM503 ----------------
{
  code: 'TOM503',
  title: 'Monthly Management Meeting Minutes',
  description: 'Monthly vessel management meeting minutes with attendees, follow-ups, work plans and committee sign-off.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'date', label: 'Date', type: 'date', required: true },

    { name: 'reportNo', label: 'Report No (Sr.no./Year)', type: 'text' },
    { name: 'previousMeeting', label: 'Previous Meeting (ref/details)', type: 'text' },

    { name: 'attendeesTable', label: 'Attendees (Name | Rank) - table', type: 'textarea', required: true },

    { name: 'minutesPreviousMeetingRead', label: 'A. Minutes of Previous Meeting read? (YES/NO)', type: 'select', options: ['YES', 'NO'] },

    {
      name: 'followUpOutstandingDeck',
      label: 'B. Follow up of Outstanding Items - Deck (incl. New target Date for CA) - table',
      type: 'textarea',
    },
    {
      name: 'followUpOutstandingEngine',
      label: 'B. Follow up of Outstanding Items - Engine (incl. New target Date for CA) - table',
      type: 'textarea',
    },

    { name: 'minutesOfMeeting', label: 'C. Minutes of Meeting', type: 'textarea', required: true },
    { name: 'workPlanDeck', label: 'D. Work plan for Deck', type: 'textarea' },
    { name: 'workPlanEngineRoom', label: 'E. Work plan for Engine Room', type: 'textarea' },
    { name: 'safetyAspectsComments', label: 'F. Safety aspects / other comments', type: 'textarea' },

    // Committee sign-off (names/signatures can be stored as text refs)
    { name: 'masterSign', label: 'Signed by - Master (Name/Signature ref)', type: 'text' },
    { name: 'chiefOfficerSign', label: 'Signed by - Chief Officer (Name/Signature ref)', type: 'text' },
    { name: 'chiefEngineerSign', label: 'Signed by - Chief Engineer (Name/Signature ref)', type: 'text' },
    { name: 'secondEngineerSign', label: 'Signed by - Second Engineer (Name/Signature ref)', type: 'text' },
    { name: 'electricalOfficerSign', label: 'Signed by - Electrical Officer (Name/Signature ref)', type: 'text' },

    // Office use
    { name: 'officeReviewedBy', label: 'For Office use - Reviewed', type: 'text' },
    { name: 'officeReviewedDate', label: 'For Office use - Date', type: 'date' },
  ],
},
// :contentReference[oaicite:5]{index=5}


// ---------------- TOM505 ----------------
{
  code: 'TOM505',
  title: 'Critical Spares List',
  description: 'Monthly critical spares register with ROB, consumed, and minimum ROB to maintain.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'month', label: 'Month', type: 'text', required: true },

    {
      name: 'criticalSparesTable',
      label: 'Critical Spares (No | Description of Item | Spare Description | Location | Minimum ROB to be maintained | Consumed | ROB)',
      type: 'textarea',
      required: true,
    },

    { name: 'masterName', label: 'Master - Name', type: 'text' },
    { name: 'masterDate', label: 'Master - Date', type: 'date' },
    { name: 'masterSignature', label: 'Master - Signature (Name/Ref)', type: 'text' },

    { name: 'chiefEngineerName', label: 'Chief Engineer - Name', type: 'text' },
    { name: 'chiefEngineerDate', label: 'Chief Engineer - Date', type: 'date' },
    { name: 'chiefEngineerSignature', label: 'Chief Engineer - Signature (Name/Ref)', type: 'text' },
  ],
},
// :contentReference[oaicite:6]{index=6}


// ---------------- TOM506 ----------------
{
  code: 'TOM506',
  title: 'Defect List',
  description: 'Defect register with action tracking, department/assignee, target and completion dates, and sign-off.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'dateInspected', label: 'Date Inspected', type: 'date', required: true },

    {
      name: 'defectListTable',
      label: 'Defect List (Sr No | Defect | Action | Department | Assigned To | Target Date | Completed On | Master/CE Sign)',
      type: 'textarea',
      required: true,
    },
  ],
},
// :contentReference[oaicite:7]{index=7}


// ---------------- TOM508a ----------------
{
  code: 'TOM508a',
  title: 'Departure Checklist - Engine',
  description: 'Engine department departure checklist (24h/2h/standby/starting/full away) + remarks and CE sign-off.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'location', label: 'Location', type: 'text', required: true },

    {
      name: 'departureChecklist',
      label: 'Departure Checklist (YES/NO/NA items across all sections)',
      type: 'textarea',
      required: true,
    },

    { name: 'remarks', label: 'Remarks (If any)', type: 'textarea' },

    { name: 'dutyEngineerName', label: 'Duty Engineer - Name', type: 'text' },
    { name: 'dutyEngineerRank', label: 'Duty Engineer - Rank', type: 'text' },
    { name: 'dutyEngineerTime', label: 'Duty Engineer - Time', type: 'time' },
    { name: 'dutyEngineerDate', label: 'Duty Engineer - Date', type: 'date' },
    { name: 'dutyEngineerSignature', label: 'Duty Engineer - Signature (Name/Ref)', type: 'text' },

    { name: 'chiefEngineerName', label: 'Chief Engineer - Name', type: 'text' },
    { name: 'chiefEngineerDate', label: 'Chief Engineer - Date', type: 'date' },
    { name: 'chiefEngineerSignature', label: 'Chief Engineer - Signature (Name/Ref)', type: 'text' },
  ],
},
// :contentReference[oaicite:8]{index=8}


// ---------------- TOM508b ----------------
{
  code: 'TOM508b',
  title: 'Arrival Checklist - Engine',
  description: 'Engine department arrival checklist (24h/4h/2h/1h/before manoeuvring/finished) + remarks and CE sign-off.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'location', label: 'Location', type: 'text', required: true },

    {
      name: 'arrivalChecklist',
      label: 'Arrival Checklist (YES/NO/NA items across all sections)',
      type: 'textarea',
      required: true,
    },

    { name: 'remarks', label: 'Remarks (If any)', type: 'textarea' },

    { name: 'dutyEngineerName', label: 'Duty Engineer - Name', type: 'text' },
    { name: 'dutyEngineerRank', label: 'Duty Engineer - Rank', type: 'text' },
    { name: 'dutyEngineerTime', label: 'Duty Engineer - Time', type: 'time' },
    { name: 'dutyEngineerDate', label: 'Duty Engineer - Date', type: 'date' },
    { name: 'dutyEngineerSignature', label: 'Duty Engineer - Signature (Name/Ref)', type: 'text' },

    { name: 'chiefEngineerName', label: 'Chief Engineer - Name', type: 'text' },
    { name: 'chiefEngineerDate', label: 'Chief Engineer - Date', type: 'date' },
    { name: 'chiefEngineerSignature', label: 'Chief Engineer - Signature (Name/Ref)', type: 'text' },
  ],
},
// :contentReference[oaicite:9]{index=9}
// ======================= Form Field Extraction =======================

// ---------------- TOM508c ----------------
{
  code: 'TOM508c',
  title: 'Steering Gear Checklist - Engine',
  description: 'Routine steering gear checks during operation + before departure + emergency steering drills, with duty engineer and chief engineer sign-off.',
  fields: [
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'port', label: 'Port', type: 'text', required: true },

    {
      name: 'routineChecksTable',
      label: 'Routine Checks During Operation (Y/N/NA + Remarks)',
      type: 'textarea',
      required: true,
    },
    {
      name: 'beforeDepartureChecksTable',
      label: 'Before Departure Checks (Y/N/NA + Remarks)',
      type: 'textarea',
      required: true,
    },
    {
      name: 'emergencySteeringDrillsTable',
      label: 'Emergency Steering Drills (at least once every 3 months) (Y/N/NA + Remarks)',
      type: 'textarea',
    },
    {
      name: 'additionalShipSpecificChecksTable',
      label: 'Additional Ship Specific Checks (Y/N/NA + Remarks)',
      type: 'textarea',
    },

    { name: 'engineerOnDutyName', label: 'Engineer on Duty - Name', type: 'text' },
    { name: 'engineerOnDutyDate', label: 'Engineer on Duty - Date', type: 'date' },
    { name: 'engineerOnDutySignature', label: 'Engineer on Duty - Signature', type: 'text' },

    { name: 'chiefEngineerName', label: 'Chief Engineer - Name', type: 'text' },
    { name: 'chiefEngineerDate', label: 'Chief Engineer - Date', type: 'date' },
    { name: 'chiefEngineerSignature', label: 'Chief Engineer - Signature', type: 'text' },
  ],
},
// :contentReference[oaicite:0]{index=0}


// ---------------- TOM509a ----------------
{
  code: 'TOM509a',
  title: 'Bunker - Debunker Checklist',
  description: 'Bunkering checklist: pre-arrival planning, after mooring checks, pre-transfer conference + agreement sheets, pre-bunkering technical checks, repetitive checks, post-bunkering checks, and declarations for ship & facility.',
  fields: [
    { name: 'dateTime', label: 'Date and Time', type: 'text', required: true },
    { name: 'portAndBerth', label: 'Port and Berth', type: 'text', required: true },
    { name: 'receivingShip', label: 'Receiving Ship', type: 'text', required: true },
    { name: 'bunkerFacility', label: 'Bunker Facility', type: 'text', required: true },

    { name: 'partAPlanningReceivingShip', label: 'Part A - Planning Stage (Receiving Ship) (Yes/No + Remarks)', type: 'textarea', required: true },
    { name: 'partBPlanningBunkerFacility', label: 'Part B - Planning Stage (Bunker Facility) (Yes/No + Remarks)', type: 'textarea', required: true },

    { name: 'partCAfterMooringReceivingShip', label: 'Part C - After Mooring (Receiving Ship) (Yes/No + Remarks)', type: 'textarea', required: true },
    { name: 'partDAfterMooringBunkerFacility', label: 'Part D - After Mooring (Bunker Facility) (Yes/No + Remarks)', type: 'textarea', required: true },

    { name: 'partEPreTransferConference', label: 'Part E - Pre-Transfer Conference (Ship/Fa​cility status + Remarks)', type: 'textarea', required: true },

    { name: 'agreementSheetPart1Bunkers', label: 'Agreement Sheet Part 1 - Bunkers To Be Transferred (Product/Grade, Tonnes, Volume, Temp, Max rate, Max pressure)', type: 'textarea' },
    { name: 'agreementSheetPart2Tanks', label: 'Agreement Sheet Part 2 - Bunker Tanks to Be Loaded (Tank no, product/grade, capacity, before, free capacity, to be loaded, final)', type: 'textarea' },
    { name: 'agreementSheetPart3OperationalControls', label: 'Agreement Sheet Part 3 - Operational Management Controls (start/stop process, check intervals, initials)', type: 'textarea' },

    { name: 'partFReceivingShipTechnical', label: 'Part F - Receiving Ship Technical Checks Before Bunkering (Yes/No + Remarks)', type: 'textarea', required: true },
    { name: 'partGBunkerFacilityTechnical', label: 'Part G - Bunker Facility Technical Checks Before Bunkering (Yes/No + Remarks)', type: 'textarea', required: true },

    { name: 'repetitiveChecksIntervalHoursShip', label: 'Repetitive Checks Interval (Receiving Ship) - Hours', type: 'number' },
    { name: 'partHRepetitiveChecksReceivingShip', label: 'Part H - Repetitive Checks During Bunkering (Receiving Ship) (time columns + initials)', type: 'textarea' },

    { name: 'repetitiveChecksIntervalHoursFacility', label: 'Repetitive Checks Interval (Bunker Facility) - Hours', type: 'number' },
    { name: 'partIRepetitiveChecksBunkerFacility', label: 'Part I - Repetitive Checks During Bunkering (Bunker Facility) (time columns + initials)', type: 'textarea' },

    { name: 'partJPostBunkeringReceivingShip', label: 'Part J - Post-Bunkering (Receiving Ship checks before disconnecting)', type: 'textarea' },
    { name: 'partKPostBunkeringBunkerFacility', label: 'Part K - Post-Bunkering (Bunker Facility checks before disconnecting)', type: 'textarea' },

    { name: 'declarationApplicableParts', label: 'Declaration - Applicable Parts marked (A to G)', type: 'textarea' },

    { name: 'shipSignName', label: 'Receiving Ship - Name', type: 'text' },
    { name: 'shipSignRank', label: 'Receiving Ship - Rank', type: 'text' },
    { name: 'shipSignature', label: 'Receiving Ship - Signature', type: 'text' },
    { name: 'shipSignDate', label: 'Receiving Ship - Date', type: 'date' },
    { name: 'shipSignTime', label: 'Receiving Ship - Time', type: 'time' },

    { name: 'facilitySignName', label: 'Bunker Facility - Name', type: 'text' },
    { name: 'facilitySignPosition', label: 'Bunker Facility - Position', type: 'text' },
    { name: 'facilitySignature', label: 'Bunker Facility - Signature', type: 'text' },
    { name: 'facilitySignDate', label: 'Bunker Facility - Date', type: 'date' },
    { name: 'facilitySignTime', label: 'Bunker Facility - Time', type: 'time' },

    { name: 'afterTransferShipName', label: 'After Transfer - Receiving Ship Name', type: 'text' },
    { name: 'afterTransferShipRank', label: 'After Transfer - Receiving Ship Rank', type: 'text' },
    { name: 'afterTransferShipSignature', label: 'After Transfer - Receiving Ship Signature', type: 'text' },
    { name: 'afterTransferShipDate', label: 'After Transfer - Receiving Ship Date', type: 'date' },
    { name: 'afterTransferShipTime', label: 'After Transfer - Receiving Ship Time', type: 'time' },

    { name: 'afterTransferFacilityName', label: 'After Transfer - Bunker Facility Name', type: 'text' },
    { name: 'afterTransferFacilityPosition', label: 'After Transfer - Bunker Facility Position', type: 'text' },
    { name: 'afterTransferFacilitySignature', label: 'After Transfer - Bunker Facility Signature', type: 'text' },
    { name: 'afterTransferFacilityDate', label: 'After Transfer - Bunker Facility Date', type: 'date' },
    { name: 'afterTransferFacilityTime', label: 'After Transfer - Bunker Facility Time', type: 'time' },
  ],
},
// :contentReference[oaicite:1]{index=1}


// ---------------- TOM509b ----------------
{
  code: 'TOM509b',
  title: 'Bunker- Debunker Plan',
  description: 'Bunker/debunker plan with fuel delivery rate, supplier/barge details, tank sequence planning, notes/special instructions, and EOW/CE sign-off.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'port', label: 'Port', type: 'text', required: true },
    { name: 'voyNo', label: 'Voy No', type: 'text' },
    { name: 'date', label: 'Date', type: 'date', required: true },

    { name: 'fuelDeliveryRateRecommended', label: 'Fuel Delivery Rate - Recommended', type: 'text' },
    { name: 'fuelDeliveryRateMaximum', label: 'Fuel Delivery Rate - Maximum', type: 'text' },

    { name: 'totalBunkerToBeTakenOrDischarged', label: 'Total Bunker to be taken / discharged', type: 'text', required: true },
    { name: 'supplierOrBarge', label: 'Supplier / Barge', type: 'text', required: true },
    { name: 'startTopping', label: 'Start / Topping', type: 'text' },

    {
      name: 'fillDischargeSequenceTable',
      label:
        'Fill / Discharge Sequence (Tank Name/ID | Product Name | Max capacity @ __% | Before ullage/vol | Planned final ullage/vol | % full at planned final)',
      type: 'textarea',
      required: true,
    },

    { name: 'overallInChargeChiefEngineer', label: 'Overall In-Charge (Chief Engineer)', type: 'text' },
    { name: 'engineRoomPersonnel', label: 'Engine Room Personnel (Names & Ranks)', type: 'textarea' },
    { name: 'bunkerStationPersonnel', label: 'Bunker Station (Names & Ranks)', type: 'textarea' },
    { name: 'bridgeDeckPersonnel', label: 'Bridge/Deck (Names & Ranks)', type: 'textarea' },

    { name: 'notesSpecialInstructions', label: 'Notes and Special Instructions (monitoring, valve alignments, etc.)', type: 'textarea' },

    { name: 'engineOfficerOfTheWatchName', label: 'Engine Officer of the Watch - Name', type: 'text' },
    { name: 'engineOfficerOfTheWatchRank', label: 'Engine Officer of the Watch - Rank', type: 'text' },
    { name: 'engineOfficerOfTheWatchTime', label: 'Engine Officer of the Watch - Time', type: 'time' },
    { name: 'engineOfficerOfTheWatchDate', label: 'Engine Officer of the Watch - Date', type: 'date' },
    { name: 'engineOfficerOfTheWatchSignature', label: 'Engine Officer of the Watch - Signature', type: 'text' },

    { name: 'chiefEngineerName', label: 'Chief Engineer - Name', type: 'text' },
    { name: 'chiefEngineerDate', label: 'Chief Engineer - Date', type: 'date' },
    { name: 'chiefEngineerSignature', label: 'Chief Engineer - Signature', type: 'text' },
  ],
},
// :contentReference[oaicite:2]{index=2}


// ---------------- TOM509d ----------------
{
  code: 'TOM509d',
  title: 'Bunker Sample Log',
  description: 'Log of bunker samples (grade, tank, seal, sample type, quantity, sampling party, disposal details) with CE initials.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'imoNo', label: 'IMO No', type: 'text' },

    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'port', label: 'Port', type: 'text', required: true },

    { name: 'bunkerSampleLogTable', label: 'Bunker Sample Log (Bunker Grade | Tank Name/No | Seal No | Sample Type | Sample Qty (L) | Sampling Done By | Date of Disposal | Method of Disposal | CE Initials)', type: 'textarea', required: true },
  ],
},
// :contentReference[oaicite:3]{index=3}


// ---------------- TOM509f ----------------
{
  code: 'TOM509f',
  title: 'LOP - Bunker Short Supply',
  description: 'Letter of Protest for short bunker supply with ordered/supplied quantities and signatures.',
  fields: [
    { name: 'ownVesselName', label: 'Own Vessel Name', type: 'text', required: true },
    { name: 'bunkerBargeName', label: 'Bunker Barge Name', type: 'text', required: true },
    { name: 'portOfBunkering', label: 'Port of Bunkering', type: 'text', required: true },
    { name: 'bunkerBargeImoOrCallSign', label: 'Bunker Barge IMO No or Call Sign', type: 'text' },
    { name: 'dateOfBunkering', label: 'Date of Bunkering', type: 'date', required: true },
    { name: 'bunkerSupplierName', label: 'Bunker Supplier Name', type: 'text' },
    { name: 'timeOfBunkering', label: 'Time of Bunkering', type: 'time' },
    { name: 'bunkerGrade', label: 'Bunker Grade', type: 'text', required: true },

    { name: 'qtyOrderedMt', label: 'Qty Ordered (MT)', type: 'number' },
    { name: 'qtySuppliedMt', label: 'Qty Supplied (MT)', type: 'number' },
    { name: 'shortSupplyMt', label: 'Short Supply (MT)', type: 'number' },

    { name: 'chiefEngineerName', label: 'Chief Engineer - Name', type: 'text' },
    { name: 'chiefEngineerSignature', label: 'Chief Engineer - Signature', type: 'text' },

    { name: 'bunkerRepOrAgentName', label: 'Bunker Representative/Agent - Name', type: 'text' },
    { name: 'bunkerRepOrAgentSignature', label: 'Bunker Representative/Agent - Signature', type: 'text' },
  ],
},
// :contentReference[oaicite:4]{index=4}


// ---------------- TOM509g ----------------
{
  code: 'TOM509g',
  title: 'LOP - Bunker MARPOL Annex VI',
  description: 'Letter of Protest for bunker supply non-compliance with MARPOL Annex VI sampling/BDN requirements, with grounds table and signatures.',
  fields: [
    { name: 'ownVesselName', label: 'Own Vessel Name', type: 'text', required: true },
    { name: 'bunkerBargeName', label: 'Bunker Barge Name', type: 'text', required: true },
    { name: 'portOfBunkering', label: 'Port of Bunkering', type: 'text', required: true },
    { name: 'bunkerBargeImoOrCallSign', label: 'Bunker Barge IMO No or Call Sign', type: 'text' },
    { name: 'dateOfBunkering', label: 'Date of Bunkering', type: 'date', required: true },
    { name: 'bunkerSupplierName', label: 'Bunker Supplier Name', type: 'text' },
    { name: 'timeOfBunkering', label: 'Time of Bunkering', type: 'time' },
    { name: 'bunkerGrade', label: 'Bunker Grade', type: 'text', required: true },

    { name: 'groundsDetailsTable', label: 'Grounds / Details (BDN non-compliance, retained sample non-compliance, label issues, refused witnessing, seal numbers, other)', type: 'textarea', required: true },

    { name: 'chiefEngineerName', label: 'Chief Engineer - Name', type: 'text' },
    { name: 'chiefEngineerSignature', label: 'Chief Engineer - Signature', type: 'text' },

    { name: 'bunkerRepOrAgentName', label: 'Bunker Representative/Agent - Name', type: 'text' },
    { name: 'bunkerRepOrAgentSignature', label: 'Bunker Representative/Agent - Signature', type: 'text' },
  ],
},
// :contentReference[oaicite:5]{index=5}


// ---------------- TOM511 ----------------
{
  code: 'TOM511',
  title: 'Internal Fuel Oil Transfer Checklist',
  description: 'Checklist to be completed by engineer in charge before, during, and after internal fuel oil transfer, with remarks and sign-off by Duty Engineer, CE and Master.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'location', label: 'Location', type: 'text', required: true },

    { name: 'fromTankName', label: 'From (Tank Name)', type: 'text', required: true },
    { name: 'toTankName', label: 'To (Tank Name)', type: 'text', required: true },
    { name: 'dateTimeStart', label: 'Date / Time of Start', type: 'text', required: true },
    { name: 'dateTimeCompletion', label: 'Date / Time of Completion', type: 'text' },

    { name: 'riskAssessmentNoPortLimitsOrConcurrentOrDarkness', label: 'RA No (if required for port limits / concurrent cargo ops / darkness)', type: 'text' },
    { name: 'riskAssessmentNoExceeds85Percent', label: 'RA No (if final sounding exceeds 85% capacity)', type: 'text' },

    { name: 'transferChecklistItems', label: 'Checklist Items (YES/NO/NA) - Before/On Commencement/During/After Completion', type: 'textarea', required: true },
    { name: 'remarks', label: 'Remarks (If any)', type: 'textarea' },

    { name: 'dutyEngineerName', label: 'Duty Engineer - Name', type: 'text' },
    { name: 'dutyEngineerRank', label: 'Duty Engineer - Rank', type: 'text' },
    { name: 'dutyEngineerTime', label: 'Duty Engineer - Time', type: 'time' },
    { name: 'dutyEngineerDate', label: 'Duty Engineer - Date', type: 'date' },
    { name: 'dutyEngineerSignature', label: 'Duty Engineer - Signature', type: 'text' },

    { name: 'chiefEngineerName', label: 'Chief Engineer - Name', type: 'text' },
    { name: 'chiefEngineerDate', label: 'Chief Engineer - Date', type: 'date' },
    { name: 'chiefEngineerSignature', label: 'Chief Engineer - Signature', type: 'text' },

    { name: 'masterName', label: 'Master - Name', type: 'text' },
    { name: 'masterDate', label: 'Master - Date', type: 'date' },
    { name: 'masterSignature', label: 'Master - Signature', type: 'text' },
  ],
},
// :contentReference[oaicite:6]{index=6}


// ---------------- TOM512a ----------------
{
  code: 'TOM512a',
  title: 'Emission Control Area (ECA) Checklist',
  description: 'Checklist for fuel changeover before entering ECA and changing back after exit, including timings, documentation, remarks, and CE/Master sign-off.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'date', label: 'Date', type: 'date', required: true },

    { name: 'fobasCalculator', label: 'FOBAS Calculator (name/reference used)', type: 'text' },
    { name: 'timeRequiredForChangeover', label: 'Time required for complete changeover (Time)', type: 'text' },

    { name: 'estimatedCommenceChangeoverDateTime', label: 'Estimated Date/Time to commence changeover (to Bridge)', type: 'text' },
    { name: 'eightHoursBeforeNewChangeoverDateTime', label: '8 Hours Before Entry - New time for changeover (if applicable) Date/Time', type: 'text' },
    { name: 'informBridgeBeforeCommencementDateTime', label: 'Inform Bridge before commencement - Date/Time', type: 'text' },
    { name: 'estimatedChangebackDateTime', label: 'Changing back after exiting ECA - Estimated Date/Time', type: 'text' },

    { name: 'ecaChecklistItems', label: 'Checklist Items (YES/NO/NA) for A) 24h prior, B) 8h before entry, C) changing back, D) documentation', type: 'textarea', required: true },
    { name: 'remarks', label: 'Remarks', type: 'textarea' },

    { name: 'chiefEngineerName', label: 'Chief Engineer - Name', type: 'text' },
    { name: 'chiefEngineerTime', label: 'Chief Engineer - Time', type: 'time' },
    { name: 'chiefEngineerDate', label: 'Chief Engineer - Date', type: 'date' },
    { name: 'chiefEngineerSignature', label: 'Chief Engineer - Signature', type: 'text' },

    { name: 'masterName', label: 'Master - Name', type: 'text' },
    { name: 'masterTime', label: 'Master - Time', type: 'time' },
    { name: 'masterDate', label: 'Master - Date', type: 'date' },
    { name: 'masterSignature', label: 'Master - Signature', type: 'text' },
  ],
},
// :contentReference[oaicite:7]{index=7}


// ---------------- TOM529a ----------------
{
  code: 'TOM529a',
  title: 'Dry Dock Departure Checklist',
  description: 'Dry dock departure checklist across multiple sections with timing (BDT/DDT/DST/BS), completed/verified by, comments, and Master/CE sign-off.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'dateOfArrival', label: 'Date of Arrival', type: 'date', required: true },
    { name: 'dateOfDeparture', label: 'Date of Departure', type: 'date', required: true },
    { name: 'yardNameDdNo', label: 'Yard Name / DD No.', type: 'text', required: true },

    {
      name: 'dryDockChecklistTable',
      label:
        'Checklist Table (Section | Item No | Item Description | Timing (BDT/DDT/DST/BS) | Completed By | Verified By | Comments)',
      type: 'textarea',
      required: true,
    },

    { name: 'masterName', label: 'Master - Name', type: 'text' },
    { name: 'masterTime', label: 'Master - Time', type: 'time' },
    { name: 'masterDate', label: 'Master - Date', type: 'date' },
    { name: 'masterSignature', label: 'Master - Signature', type: 'text' },

    { name: 'chiefEngineerName', label: 'Chief Engineer - Name', type: 'text' },
    { name: 'chiefEngineerTime', label: 'Chief Engineer - Time', type: 'time' },
    { name: 'chiefEngineerDate', label: 'Chief Engineer - Date', type: 'date' },
    { name: 'chiefEngineerSignature', label: 'Chief Engineer - Signature', type: 'text' },
  ],
},
// :contentReference[oaicite:8]{index=8}


// ---------------- TOM534b ----------------
{
  code: 'TOM534b',
  title: 'Vessel Take Over and Follow Up Check List of SMS Start Up',
  description: 'Comprehensive vessel takeover & SMS startup follow-up checklist (General + role-wise: Master, C/O, 2/O, 3/O, C/E, 2/E, 3/E, E/O) with targets, status and remarks.',
  fields: [
    { name: 'vesselName', label: 'Vessel Name', type: 'text', required: true },
    { name: 'date', label: 'Date', type: 'date', required: true },

    {
      name: 'generalChecklistTable',
      label: 'GENERAL - Items (Item | To be completed by | Target Date | Status | Remarks)',
      type: 'textarea',
      required: true,
    },

    {
      name: 'masterChecklistTable',
      label: 'MASTER - Items (Item | To be completed by | Target Date | Status (O/C/P) | Remarks)',
      type: 'textarea',
    },

    {
      name: 'chiefOfficerChecklistTable',
      label: 'CHIEF OFFICER - Items (Item | To be completed by | Target Date | Status (O/C/P) | Remarks)',
      type: 'textarea',
    },

    {
      name: 'secondOfficerChecklistTable',
      label: '2ND OFFICER - Items (Item | To be completed by | Target Date | Status (O/C/P) | Remarks)',
      type: 'textarea',
    },

    {
      name: 'thirdOfficerChecklistTable',
      label: '3RD OFFICER - Items (Item | To be completed by | Target Date | Status (O/C/P) | Remarks)',
      type: 'textarea',
    },

    {
      name: 'chiefEngineerChecklistTable',
      label: 'CHIEF ENGINEER - Items (Item | To be completed by | Target Date | Status (O/C/P) | Remarks)',
      type: 'textarea',
    },

    {
      name: 'secondEngineerChecklistTable',
      label: '2ND ENGINEER - Items (Item | To be completed by | Target Date | Status | Remarks)',
      type: 'textarea',
    },

    {
      name: 'thirdEngineerChecklistTable',
      label: '3RD ENGINEER - Items (Item | To be completed by | Target Date | Status | Remarks)',
      type: 'textarea',
    },

    {
      name: 'electricalOfficerChecklistTable',
      label: 'ELECTRICAL OFFICER - Items (Item | To be completed by | Target Date | Status (O/C/P) | Remarks)',
      type: 'textarea',
    },

    { name: 'masterName', label: 'Master - Name', type: 'text' },
    { name: 'masterDate', label: 'Master - Date', type: 'date' },
    { name: 'masterSignature', label: 'Master - Signature', type: 'text' },

    { name: 'chiefEngineerName', label: 'Chief Engineer - Name', type: 'text' },
    { name: 'chiefEngineerDate', label: 'Chief Engineer - Date', type: 'date' },
    { name: 'chiefEngineerSignature', label: 'Chief Engineer - Signature', type: 'text' },
  ],
}
// :contentReference[oaicite:9]{index=9}


]
