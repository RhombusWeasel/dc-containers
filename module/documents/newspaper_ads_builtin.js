/**
 * Built-in newspaper advertisement templates.
 */

const BUILTIN_ADS = [
  {
    id: 'dc.patent_medicine',
    weight: 10,
    render: () => ({
      title: "DR. SCUTTLE'S PATENT TONIC",
      lines: [
        'Cures Rheumatism, Gout, Neuralgia, and General Malaise!',
        'Contains 12% Opium by Volume — Safe for All Ages!',
      ],
      note: 'Available at your local Apothecary — 25¢ per Bottle',
    }),
  },
  {
    id: 'dc.railroad',
    weight: 10,
    render: () => ({
      title: 'TRANS-CONTINENTAL RAILROAD',
      lines: [
        'Now Offering Direct Service to All Major Cities!',
        'Coach: $12 • Sleeper: $25 • Private Car: $100',
      ],
      note: '"The Fastest Way West!"',
    }),
  },
  {
    id: 'dc.undertaker',
    weight: 5,
    render: () => ({
      title: 'MCMURTRY & SONS — UNDERTAKERS',
      lines: [
        'Dignified Service at Reasonable Rates',
        'Quality Pine Boxes Always in Stock',
      ],
      note: 'Corner of Boot Hill & Main — Open Day and Night',
    }),
  },
  {
    id: 'dc.stagecoach',
    weight: 8,
    render: () => ({
      title: 'BUTTERFIELD OVERLAND MAIL',
      lines: [
        'Stage Departures Three Times Weekly!',
        'Armed Escort Available — Baggage Insured',
      ],
      note: 'Reserve Your Seat at the General Store',
    }),
  },
  {
    id: 'dc.saloon',
    weight: 9,
    render: () => ({
      title: 'THE GOLDEN SPUR SALOON',
      lines: [
        'Fine Whiskey, Cold Beer, and Hot Meals Daily',
        'Poker Every Friday — Ladies Welcome in the Parlour',
      ],
      note: 'Main Street — Ask for Hank Behind the Bar',
    }),
  },
  {
    id: 'dc.livery',
    weight: 8,
    render: () => ({
      title: 'SILVER STAR LIVERY STABLE',
      lines: [
        'Horses, Mules, and Wagons for Hire or Sale',
        'Fresh Oats and Clean Stalls Guaranteed',
      ],
      note: 'Next to the Telegraph Office — Rates by the Day',
    }),
  },
  {
    id: 'dc.blacksmith',
    weight: 7,
    render: () => ({
      title: 'IRON HORSE FORGE & BLACKSMITH',
      lines: [
        'Shoeing, Repairs, and Custom Ironwork',
        'Ghost Rock Fittings a Specialty',
      ],
      note: 'Ring the Anvil Twice for After-Hours Service',
    }),
  },
  {
    id: 'dc.mining_claim',
    weight: 6,
    render: () => ({
      title: 'SILVER CREEK MINING CO.',
      lines: [
        'Claims Available on Proven Veins!',
        'Equipment, Dynamite, and Expert Assayers on Site',
      ],
      note: 'Office at the Assay House — No Refunds on Bad Luck',
    }),
  },
  {
    id: 'dc.spiritualist',
    weight: 5,
    render: () => ({
      title: 'MADAME ZORA — SPIRITUAL ADVISOR',
      lines: [
        'Palm Reading, Tarot, and Messages from Beyond',
        'Séances by Appointment — Discretion Assured',
      ],
      note: 'Upstairs at the Starlight Hotel — Evenings Only',
    }),
  },
  {
    id: 'dc.snake_oil',
    weight: 8,
    render: () => ({
      title: 'PROFESSOR WHITMAN\'S ELIXIR OF LIFE',
      lines: [
        'Restores Vitality, Sharpens the Mind, Cures Baldness!',
        'As Seen in Every Respectable Territory!',
      ],
      note: 'Two Bottles for a Dollar — Cash Only',
    }),
  },
  {
    id: 'dc.wanted_poster',
    weight: 4,
    render: () => ({
      title: 'WANTED — DEAD OR ALIVE',
      lines: [
        'Reward Offered for Information Leading to Capture',
        'Armed and Dangerous — Do Not Approach Alone',
      ],
      note: 'See the Sheriff\'s Office for Particulars',
    }),
  },
  {
    id: 'dc.boarding_house',
    weight: 7,
    render: () => ({
      title: 'MRS. O\'MALLEY\'S BOARDING HOUSE',
      lines: [
        'Clean Beds, Hot Supper, and a Christian Atmosphere',
        'Weekly Rates for Working Men and Prospectors',
      ],
      note: 'Two Blocks from the Depot — No Dogs',
    }),
  },
  {
    id: 'dc.general_store',
    weight: 9,
    render: () => ({
      title: 'HIGGINS & SONS GENERAL MERCANTILE',
      lines: [
        'Dry Goods, Provisions, Ammunition, and Sundries',
        'We Buy Gold Dust and Trade on Fair Terms',
      ],
      note: 'Open Dawn to Dusk — Credit to Established Customers',
    }),
  },
  {
    id: 'dc.dentist',
    weight: 4,
    render: () => ({
      title: 'DR. PULLMAN — DENTIST & SURGEON',
      lines: [
        'Extractions Without Unnecessary Suffering',
        'Ether Available for Nervous Patients',
      ],
      note: 'Above the Apothecary — Walk-Ins Welcome',
    }),
  },
  {
    id: 'dc.tailor',
    weight: 5,
    render: () => ({
      title: 'STITCH & BUTTON TAILORS',
      lines: [
        'Suits, Dresses, and Uniforms Made to Measure',
        'Repairs While You Wait at the Counter',
      ],
      note: 'Fine Fabrics Imported from Back East',
    }),
  },
  {
    id: 'dc.gunsmith',
    weight: 7,
    render: () => ({
      title: 'COLT\'S AUTHORIZED REPAIR — J. WATSON',
      lines: [
        'Pistols, Rifles, and Shotguns Cleaned & Sighted',
        'Ammunition in Stock — Custom Engraving Available',
      ],
      note: 'Behind the Saloon — Knock Loudly',
    }),
  },
  {
    id: 'dc.hotel',
    weight: 8,
    render: () => ({
      title: 'THE GRAND IMPERIAL HOTEL',
      lines: [
        'Luxury Rooms, Baths, and a Dining Room Fit for a Senator',
        'Sample Room for Commercial Travelers',
      ],
      note: 'Corner of First & Main — Bellhops at All Hours',
    }),
  },
  {
    id: 'dc.telegraph',
    weight: 6,
    render: () => ({
      title: 'WESTERN UNION TELEGRAPH OFFICE',
      lines: [
        'Send Word Home — Rates by the Word',
        'Money Orders and Package Receipt a Specialty',
      ],
      note: 'Next to the Railroad Depot',
    }),
  },
  {
    id: 'dc.church',
    weight: 4,
    render: () => ({
      title: 'FIRST METHODIST CHURCH OF THE TERRITORY',
      lines: [
        'Sunday Service at Ten — All Souls Welcome',
        'Bible Study and Choir Practice on Wednesdays',
      ],
      note: 'Rev. Matthews, Pastor — Donations Gratefully Received',
    }),
  },
  {
    id: 'dc.photographer',
    weight: 5,
    render: () => ({
      title: 'AMBROTYPE STUDIO — FINE PORTRAITS',
      lines: [
        'Memorial Portraits, Cartes de Visite, and Tin Types',
        'Groups and Horses Photographed by Appointment',
      ],
      note: 'Sit Still — Exposure Takes One Full Minute',
    }),
  },
  {
    id: 'dc.laundry',
    weight: 5,
    render: () => ({
      title: 'CHINESE LAUNDRY — WING & CO.',
      lines: [
        'Shirts Washed and Pressed — Collars Stiff as Board',
        'Reasonable Prices — Pick Up Saturday Afternoons',
      ],
      note: 'Alley Behind the Hotel',
    }),
  },
  {
    id: 'dc.circus',
    weight: 3,
    render: () => ({
      title: 'BARNUM\'S WILD WEST EXTRAVAGANZA',
      lines: [
        'One Night Only — Acrobats, Sharpshooters, and a Real Bear!',
        'Advance Tickets at the General Store',
      ],
      note: 'Big Top Erects on the Fair Grounds — Rain or Shine',
    }),
  },
  {
    id: 'dc.law_office',
    weight: 4,
    render: () => ({
      title: 'ATTORNEY AT LAW — THADDEUS GRIMES',
      lines: [
        'Land Disputes, Wills, and Criminal Defence',
        'Consultations Confidential — Fees Negotiable',
      ],
      note: 'Second Floor, County Courthouse',
    }),
  },
  {
    id: 'dc.saddlery',
    weight: 6,
    render: () => ({
      title: 'MASTER SADDLER — E. CARSON',
      lines: [
        'Hand-Stitched Saddles, Bridles, and Holsters',
        'Repairs While You Browse the Mercantile',
      ],
      note: 'Leather Goods Guaranteed Against Normal Wear',
    }),
  },

  // --- Faction-themed ads (Deadlands) ---

  {
    id: 'dc.smith_robards_catalog',
    weight: 7,
    render: () => ({
      title: 'SMITH & ROBARDS — MAIL ORDER CATALOGUE',
      lines: [
        'Patent Gadgets, Clockwork Conveniences, and Frontier Essentials',
        'New for \'74: Pocket Telegraph, Self-Stoking Stove, and the No. 7 Lightning Rod',
      ],
      note: 'Order by Post — S&R Approved Dealers in Every Territory',
    }),
  },
  {
    id: 'dc.smith_robards_repairs',
    weight: 6,
    render: () => ({
      title: 'S&R AUTHORIZED REPAIR AGENT',
      lines: [
        'We Service Smith & Robards Devices of Every Description',
        'Genuine Parts — No Tin-Plate Imitations Accepted',
      ],
      note: 'Bring Your Warranty Card — Estimates by Telegraph',
    }),
  },
  {
    id: 'dc.wasatch_railroad',
    weight: 7,
    render: () => ({
      title: 'WASATCH RAILROAD — LUXURY EXPRESS',
      lines: [
        'Ghost-Rock Locomotives — Unmatched Speed and Comfort',
        'Denver to Lost Angels with Dining Car and Observation Deck',
      ],
      note: 'Hellstromme Industries — Science Moves the West Forward',
    }),
  },
  {
    id: 'dc.hellstromme_industries',
    weight: 6,
    render: () => ({
      title: 'HELLSTROMME INDUSTRIES',
      lines: [
        'Clockwork Servants, Arc Lamps, and Industrial Machinery',
        'Patent Pending on All Inventions — Inquire Within',
      ],
      note: 'Wasatch Foundry, Utah Territory — Agents Wanted',
    }),
  },
  {
    id: 'dc.union_blue_railroad',
    weight: 7,
    render: () => ({
      title: 'UNION BLUE RAILROAD',
      lines: [
        'Connecting the Nation — Freight, Passengers, and War Bonds',
        'Through Service East to Chicago — Reliable Schedules',
      ],
      note: 'Invest in Union Blue Stock — Ask Your Station Agent',
    }),
  },
  {
    id: 'dc.black_river_railroad',
    weight: 6,
    render: () => ({
      title: 'BLACK RIVER RAILROAD',
      lines: [
        'Cut-Rate Fares on All Lines — No Questions Asked',
        'Private Freight Contracts — Discretion Guaranteed',
      ],
      note: 'Competing Routes Daily — See the Depot Clerk',
    }),
  },
  {
    id: 'dc.agency_recruitment',
    weight: 6,
    render: () => ({
      title: 'THE AGENCY — NOW RECRUITING',
      lines: [
        'Brave Men and Women Needed for Unusual Assignments',
        'Experience with the Unnatural Preferred but Not Required',
      ],
      note: 'Apply at the Federal Marshal\'s Office — Discretion Essential',
    }),
  },
  {
    id: 'dc.agency_bounty',
    weight: 5,
    render: () => ({
      title: 'AGENCY BULLETIN — MONSTER BOUNTY',
      lines: [
        'Reward for Verified Slayings of Abominations and Night Creatures',
        'Bring Proof — Scalps, Fangs, or Signed Witness Statements',
      ],
      note: 'Payment in Gold or Agency Scrip — No Refunds on False Claims',
    }),
  },
  {
    id: 'dc.agency_strange_occurrences',
    weight: 5,
    render: () => ({
      title: 'REPORT STRANGE OCCURRENCES',
      lines: [
        'The Agency Seeks Information on Unexplained Phenomena',
        'Cattle Mutilations, Green Fog, and Missing Persons Investigated',
      ],
      note: 'Telegraph "AGENCY" to the Nearest Marshal\'s Office',
    }),
  },
  {
    id: 'dc.texas_rangers',
    weight: 6,
    render: () => ({
      title: 'TEXAS RANGERS — ENLIST TODAY',
      lines: [
        'Serve the Republic — Track Outlaws Across the Territories',
        'Rifle, Horse, and Badge Provided to Qualified Applicants',
      ],
      note: 'Ranger Company B Recruiting at Fort Griffin',
    }),
  },
  {
    id: 'dc.texas_rangers_wanted',
    weight: 5,
    render: () => ({
      title: 'RANGER NOTICE — WANTED FOR QUESTIONING',
      lines: [
        'Known Associates of the Sundown Gang Sought Alive',
        'Rangers Authorized to Use Necessary Force',
      ],
      note: 'Contact Captain Reyes — Reward Posted at Ranger Station',
    }),
  },
  {
    id: 'dc.lost_angels_charity',
    weight: 5,
    render: () => ({
      title: 'CHURCH OF LOST ANGELS — CHARITY APPEAL',
      lines: [
        'Feed the Hungry, Clothe the Poor, Save the Lost Soul',
        'Your Generosity Builds the Kingdom on Earth',
      ],
      note: 'Collection Plate at Every Service — All Denominations Welcome',
    }),
  },
  {
    id: 'dc.lost_angels_salvation',
    weight: 4,
    render: () => ({
      title: 'SALVATION AWAITS — LOST ANGELS MISSION',
      lines: [
        'Free Soup Kitchen Every Sabbath — No Sermon Required to Eat',
        'Repentance Brings Peace the World Cannot Give',
      ],
      note: 'Rev. Grimme\'s Mission — Main Street, Lost Angels',
    }),
  },
  {
    id: 'dc.sioux_trading_post',
    weight: 6,
    render: () => ({
      title: 'SIOUX NATION TRADING POST',
      lines: [
        'Fair Trade in Furs, Blankets, and Powder by Treaty Law',
        'Licensed Traders Only — Respect Tribal Boundaries',
      ],
      note: 'Agency Superintendent\'s Office — Permits Required',
    }),
  },
  {
    id: 'dc.sioux_boundary',
    weight: 5,
    render: () => ({
      title: 'TERRITORIAL BOUNDARY NOTICE',
      lines: [
        'Sioux Nation Lands — Trespass at Your Peril',
        'All Settlers Must Obtain Passes from the Agency',
      ],
      note: 'Posted by Order of the Indian Affairs Commission',
    }),
  },
  {
    id: 'dc.ghost_rock_mining',
    weight: 7,
    render: () => ({
      title: 'GHOST ROCK MINING SYNDICATE',
      lines: [
        'Shares Available in Proven Claims — Returns Exceed Silver!',
        'Assayers, Dynamite, and Drilling Equipment on Site',
      ],
      note: 'Office at the Maze Shipping Wharf — Cash or Gold Dust',
    }),
  },
  {
    id: 'dc.ghost_rock_lamps',
    weight: 6,
    render: () => ({
      title: 'GHOST ROCK LAMP OIL — PATENTED FORMULA',
      lines: [
        'Burns Brighter and Longer Than Whale Oil',
        'Warning: Keep Away from Open Wounds and Holy Ground',
      ],
      note: 'Sold by the Gallon at Higgins & Sons and Licensed Agents',
    }),
  },
  {
    id: 'dc.ghost_rock_refinery',
    weight: 5,
    render: () => ({
      title: 'DESERT REFINERY COMPANY',
      lines: [
        'We Buy Raw Ghost Rock — Top Dollar Paid at the Scales',
        'Safety Bonuses for Miners Who Deliver Intact Samples',
      ],
      note: 'Carson City Office — No Questions on Provenance',
    }),
  },
  {
    id: 'dc.great_maze_expedition',
    weight: 6,
    render: () => ({
      title: 'GREAT MAZE EXPEDITION OUTFITTERS',
      lines: [
        'Ship Charter, Provisions, and Maze-Proof Compasses',
        'Experienced Guides — Insurance Available at Extra Cost',
      ],
      note: 'Departures from Shan Fan and Lost Angels Weekly',
    }),
  },
  {
    id: 'dc.great_maze_shipping',
    weight: 5,
    render: () => ({
      title: 'MAZE SHIPPING & FREIGHT',
      lines: [
        'Ghost Rock Cargo Handled with Care — Bonded Warehouses',
        'Rates by the Ton — Pirates and Revenuers Not Our Problem',
      ],
      note: 'Wharf Office Open at High Tide — Cash in Advance',
    }),
  },
  {
    id: 'dc.pinkerton_detective',
    weight: 6,
    render: () => ({
      title: 'PINKERTON NATIONAL DETECTIVE AGENCY',
      lines: [
        'We Never Sleep — Corporate Security and Asset Recovery',
        'Strike Breakers, Bodyguards, and Confidential Inquiries',
      ],
      note: 'Denver Field Office — Retainer Required',
    }),
  },
  {
    id: 'dc.pinkerton_missing',
    weight: 5,
    render: () => ({
      title: 'MISSING PERSON INQUIRIES — PINKERTON',
      lines: [
        'Tracing Relatives, Debtors, and Absconding Partners',
        'Discreet Reports Delivered by Telegraph or Courier',
      ],
      note: 'Flat Fee Quoted — No Recovery, Reduced Rate',
    }),
  },
  {
    id: 'dc.csa_surplus',
    weight: 5,
    render: () => ({
      title: 'CONFEDERATE SURPLUS & ARMORY',
      lines: [
        'Richmond Rifles, Cavalry Sabres, and Grey Greatcoats',
        'Prices Slashed Since Appomattox — Cash Only',
      ],
      note: 'Warehouse Behind the Rail Yard — Ask for Sergeant Cobb',
    }),
  },
  {
    id: 'dc.union_surplus',
    weight: 5,
    render: () => ({
      title: 'UNION ARMY SURPLUS DEPOT',
      lines: [
        'Springfield Rifles, Blue Wool, and Canned Hardtack',
        'Veterans\' Discount with Discharge Papers',
      ],
      note: 'Government Auction Every First Monday — Bid Early',
    }),
  },
  {
    id: 'dc.blessed_healer',
    weight: 5,
    render: () => ({
      title: 'SISTER MARGARET — FAITH HEALER',
      lines: [
        'The Blessed Lay On Hands — Wounds and Fevers Treated',
        'Donations Support the Orphanage and Mission School',
      ],
      note: 'Tent Revival Nightly — All Faiths May Seek Aid',
    }),
  },
  {
    id: 'dc.guardian_angels',
    weight: 4,
    render: () => ({
      title: 'GUARDIAN ANGELS SOCIETY',
      lines: [
        'Protection for Travelers Against the Unnatural',
        'Blessed Medals and Prayer Cards — $2 Donation',
      ],
      note: 'Chapter Meetings Thursdays — Church Basement',
    }),
  },
  {
    id: 'dc.rail_baron_investment',
    weight: 5,
    render: () => ({
      title: 'TRANS-CONTINENTAL LAND & RAIL INVESTMENT',
      lines: [
        'Buy Plots Along the Right-of-Way Before Prices Rise!',
        'Guaranteed Returns — Ask About Our Denver Prospectus',
      ],
      note: 'Office Hours 9–4 — Bring Cash and References',
    }),
  },
  {
    id: 'dc.tombstone_epitaph_sub',
    weight: 6,
    render: () => ({
      title: 'SUBSCRIBE TO THE TOMBSTONE EPITAPH',
      lines: [
        'All the News That\'s Fit to Print — Weekly Delivery',
        'Crime Reports, Market Prices, and Society Columns',
      ],
      note: '$5 per Year — Postmaster Holds Mailing Lists',
    }),
  },
  {
    id: 'dc.denver_pacific',
    weight: 5,
    render: () => ({
      title: 'DENVER PACIFIC RAILROAD',
      lines: [
        'Connecting the Mining Districts to the Union Blue Main Line',
        'Ore Cars and Passenger Coaches — Daily Departures',
      ],
      note: 'Ticket Office at Union Station — Freight by Contract',
    }),
  },
  {
    id: 'dc.reckoners_notice',
    weight: 4,
    render: () => ({
      title: 'MARSHAL\'S WARNING — RECKONER ACTIVITY',
      lines: [
        'Citizens Advised to Travel in Groups After Sundown',
        'Strange Gunplay and Impossible Marksmanship Reported',
      ],
      note: 'Report Suspicious Shootists to the Sheriff Immediately',
    }),
  },
  {
    id: 'dc.harrowed_support',
    weight: 4,
    render: () => ({
      title: 'HARRIED SOULS SUPPORT GROUP',
      lines: [
        'Confidential Meetings for Those Who Have Seen Too Much',
        'No Preaching — Just Coffee and Shared Silence',
      ],
      note: 'Basement of the Methodist Church — Ask for Hank',
    }),
  },
  {
    id: 'dc.shan_fan_tong',
    weight: 5,
    render: () => ({
      title: 'SHAN FAN IMPORT & EXPORT',
      lines: [
        'Silks, Tea, and Provisions from the Pacific Trade',
        'Honest Weights — Established Credit with Tong Elders',
      ],
      note: 'Chinatown District — Interpreter Available',
    }),
  },
  {
    id: 'dc.railroad_war_bonds',
    weight: 5,
    render: () => ({
      title: 'UNION WAR BONDS — STILL REDEEMABLE',
      lines: [
        'Convert Your Paper to Track Shares or Cash',
        'Union Blue Railroad Accepts Bonds at Par Value',
      ],
      note: 'See Any Station Agent — Identification Required',
    }),
  },
  {
    id: 'dc.maze_survival_gear',
    weight: 6,
    render: () => ({
      title: 'MAZE SURVIVAL SUPPLY CO.',
      lines: [
        'Rebreathers, Rope, and Blessed Salt by the Pound',
        'If We Don\'t Stock It, You Probably Don\'t Need It',
      ],
      note: 'Next to the Wharf — No Returns on Opened Goods',
    }),
  },
  {
    id: 'dc.smith_robards_weapons',
    weight: 6,
    render: () => ({
      title: 'SMITH & ROBARDS — PERSONAL ARMAMENTS',
      lines: [
        'Eagle Eye Scopes, Thunderer Caps, and Custom Revolver Work',
        'Catalogue Supplement M — Order Before the Season Rush',
      ],
      note: 'Licensed Dealers Only — Proof of Citizenship Required',
    }),
  },
];

export { BUILTIN_ADS };
