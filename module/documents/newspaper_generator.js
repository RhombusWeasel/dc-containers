/**
 * Procedural Newspaper Content Generator
 *
 * Generates full newspaper layouts with procedurally generated articles,
 * headlines, sidebars, advertisements, and colophons. Modernized from the
 * original `old_document_lib.js` template-substitution approach.
 *
 * Exported via game.dc.document:
 *   - generate_newspaper(options)  → structured data object (render via newspaper_sheet.hbs)
 *   - generate_article()          → article data object (single article)
 *   - register_newspaper_content(def)
 *   - list_newspaper_content(type)
 */

// ---------------------------------------------------------------------------
// Seeded RNG (mulberry32) — deterministic when a seed is provided
// ---------------------------------------------------------------------------

function create_rng(seed_str) {
  let a = 0;
  if (seed_str) {
    // Hash the seed string into a 32-bit integer
    for (let i = 0; i < seed_str.length; i++) {
      a = (a * 31 + seed_str.charCodeAt(i)) | 0;
    }
    a = a || 1;
  } else {
    a = (Math.random() * 0xFFFFFFFF) | 0 || 1;
  }
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Data tables — ported and expanded from old_document_lib.js
// ---------------------------------------------------------------------------

const DATA = {
  states: {
    Northern: ['Dakota', 'Idaho', 'Illinois', 'Iowa', 'Minnesota', 'Montana', 'Nebraska', 'Nevada', 'Oregon', 'Washington', 'Wisconsin', 'Wyoming'],
    Southern: ['Arizona', 'Arkansas', 'Louisiana', 'Mississippi', 'Missouri', 'New Mexico', 'Texas'],
    Disputed:  ['California', 'Colorado', 'Kansas', 'Oklahoma'],
  },
  cities: {
    Arizona:       ['Dead End', 'Despair', 'Mona', 'Phoenix', 'Potential', 'Prescott', 'Tombstone', 'Tucson'],
    Arkansas:      ['Little Rock', 'Hot Springs'],
    California:    ["Devil's Armpit", "Dragon's Breath", 'Los Angeles', 'San Francisco'],
    Colorado:      ['Cauldron', 'Denver', 'Leadville'],
    Dakota:        ['Bear Butte', 'Deadwood', 'Rapid City'],
    Idaho:         ['Boise', 'Silver City'],
    Illinois:      ['Chicago', 'Peoria', 'Springfield'],
    Iowa:          ['Cedar Rapids', 'Des Moines'],
    Kansas:        ['Coffeyville', 'Dodge City', 'Wichita'],
    Louisiana:     ['New Orleans', 'Purchase', 'Baton Rouge'],
    Minnesota:     ['Bismarck', 'Fargo'],
    Mississippi:   ['Biloxi', 'Natchez', 'Vicksburg'],
    Missouri:      ['Kansas City', 'St. Louis', 'Jefferson City'],
    Montana:       ['Billings', 'Butte City', 'Helena'],
    Nebraska:      ['Grand Island', 'Omaha'],
    Nevada:        ['Cedar City', 'Virginia City', 'Carson City'],
    'New Mexico':  ['Albuquerque', 'Roswell', 'Santa Fe'],
    Oklahoma:      ['Perry', 'Oklahoma City'],
    Oregon:        ['Portland', 'Salem', 'Eugene'],
    Texas:         ['Providence', 'Houston', 'Pinebox', 'El Paso', 'San Antonio'],
    Washington:    ['Seattle', 'Walla Walla', 'Olympia', 'Tacoma'],
    Wisconsin:     ['Duluth', 'Milwaukee', 'Madison'],
    Wyoming:       ['Cheyenne', 'Laramie', 'Medicine Wheel'],
  },

  // Article template sets — each is a pool the generator picks from
  headlines: [
    '{{crime.headline}} Epidemic in {{state}}!',
    '{{state}} {{crime.headline}} Factory?',
    '{{culprit.pronoun.polite_singular}} Bandit {{captured}}',
    '{{cunning}} {{officer.rank}} {{captures}} {{officer.pronoun.clause}} {{culprit.pronoun.singular}}',
    '{{crime.headline}} Spree in {{state}}!',
    '{{state}} {{number}} Get {{sentence.text}}',
    'The {{city}} {{crime.headline}} Crisis',
    'Justice in {{state}}: {{culprit.name.formal}} {{captured}}',
  ],
  starts: [
    // Original templates
    'A {{dastardly}} gang of {{number}} {{culprit.pronoun.group}}, led by {{culprit.name.full}} ({{age}}), were {{captured}} {{crime.article}} in {{city}}, {{state}} last week. {{plea_for_order}}',
    'Reports coming in from {{city}}, {{state}} confirm one {{culprit.name.full}} ({{age}}), and {{culprit.pronoun.clause}} {{number_sub_1}} accomplices were sentenced to {{sentence.text}} for {{crime.article}} last week. {{plea_for_order}}',
    'Local {{culprit.pronoun.singular}} {{culprit.name.full}} ({{age}}) was shot dead today whilst {{crime.article}}. {{plea_for_order}}',
    'It seems that the crime epidemic in {{city}}, {{state}} has reached new heights with another {{culprit.pronoun.singular}}, a {{culprit.name.full}} ({{age}}) being sentenced to {{sentence.text}} for {{crime.article}}! {{plea_for_order}}',
    'Local {{witness.profession}} {{culprit.name.full}} ({{age}}) went on an unexpected crime spree last month. {{culprit.name.formal}} was first seen {{crime.article}} after which witnesses report {{culprit.pronoun.subjective}} {{random.crime}} before finally being apprehended attempting to ransom back a {{random.building}} that {{culprit.pronoun.objective}} had occupied by force back to the state of {{state}}.',
    // New templates — expanded pool for flavour briefs
    'The quiet town of {{city}}, {{state}} was rocked by scandal this week when {{culprit.name.full}} ({{age}}), a respected {{witness.profession}}, was discovered to be running a {{subject.contraband}} smuggling ring out of the {{subject.building}} basement.',
    'Strange doings in {{city}}, {{state}}, where {{number}} head of cattle were found dead in a field outside town, each one drained entirely of blood. Sheriff\'s deputies are baffled and locals are whispering about {{spooky_possession}}.',
    'A {{dastardly}} gang calling themselves "The {{city}} {{random.animal}}s" has been terrorizing merchants along the {{state}} toll road, {{crime.article}} and leaving nothing but empty whiskey bottles in their wake.',
    '{{officer.rank}} {{officer.name.full}} arrived in {{city}} this week on the trail of {{culprit.name.formal}}, wanted in {{territory}} for {{crime.article}}. "We\'ve been on {{culprit.pronoun.clause}} trail for {{number}} weeks now," the {{officer.rank}} told our reporter.',
    'The {{subject.building}} on Main Street in {{city}}, {{state}} was badly damaged last night in what authorities are calling an act of {{dastardly}} vandalism. {{culprit.name.full}} ({{age}}) was taken into custody at the scene.',
    'A mysterious stranger known only as "{{culprit.name.first}}" rode into {{city}} last Tuesday and hasn\'t been seen since. {{culprit.pronoun.subjective}} was last headed toward the {{subject.building}}, carrying a suspiciously large sack and humming a strange tune.',
    'The {{city}} bank was robbed in broad daylight by a lone {{culprit.pronoun.singular}} wearing a {{random.colour}} bandana. {{officer.rank}} {{officer.name.last}} says this is the {{number}} bank robbery in {{state}} this month.',
    'Deputies in {{state}} are searching for {{culprit.name.full}} ({{age}}), who escaped custody while being transported to the territorial prison. {{culprit.name.formal}} was last seen heading toward {{city}} on a stolen {{subject.animal}}.',
    'A {{dastardly}} scheme involving forged deeds to {{subject.building}}s across {{state}} has been uncovered. The alleged ringleader, {{culprit.name.full}}, is said to have swindled {{number}} families out of their properties using forged documents.',
    'Fire broke out at the {{subject.building}} in {{city}} late Wednesday evening. Though flames were quickly contained, the blaze is being treated as suspicious. A {{culprit.pronoun.singular}} matching {{culprit.name.formal}}\'s description was seen fleeing the scene.',
    'An outbreak of {{crime.headline}} has the citizens of {{city}}, {{state}} at their wits\' end. "I\'ve lived here {{age}} years and never seen anything like it," said one resident who declined to give {{culprit.pronoun.clause}} name.',
    'The body of an unidentified {{culprit.pronoun.singular}} was found behind the {{subject.building}} in {{city}} yesterday morning. {{officer.rank}} {{officer.name.full}} says foul play is suspected and an inquest will be held.',
    '{{culprit.name.full}}, known to locals in {{city}} as "{{dastardly}} {{culprit.name.last}}", was finally run to ground by {{officer.rank}} {{officer.name.full}} after a {{number}}-day pursuit across {{state}}.',
    'A traveling salesman, {{culprit.name.full}} ({{age}}), was arrested in {{city}} after attempting to sell what turned out to be {{subject.contraband}} disguised as {{subject.product}}s. "The fake mustache was a dead giveaway," said arresting {{officer.rank}} {{officer.name.last}}.',
    'The good people of {{city}}, {{state}} are on edge after {{number}} graves were found disturbed in the cemetery. {{officer.rank}} {{officer.name.full}} declined to speculate on whether the perpetrator is human or something altogether more {{dastardly}}.',
  ],
  witness_reports: [
    'One eye witness, {{witness.name.full}} ({{age}}), a local contrarian, was quoted to say "The {{subject.animal}}\'s did it! I seen \'em doin\' it! Them and the {{random.animal}}\'s — this goes all the way to the top, man! Even the {{random.animal}}\'s are in on it!" However {{witness.name.formal}} is believed, at least by this reporter, to be insane. I think it might be high time to investigate just exactly why so many people I interview are certifiably insane.',
    'One witness who wishes to remain anonymous reported "Look, I know this sounds crazy but {{spooky_possession}}." Another, also not willing to put their name to an outright fabrication, said "{{spooky_possession}} — I know how crazy that sounds but it\'s what I saw!" I mean come on now, {{spooky_possession}}! Like we were all born yesterday. P.T. Barnum has a point — there is a sucker born every minute and I\'m afraid it\'s you this minute, dear reader, if you believe that nonsense!',
    'Local {{subject.product}} merchant {{witness.name.full}} ({{age}}) was willing to go on record stating: "You lookin\' to buy a {{subject.product}}? Come on down and see me at Crazy {{witness.name.first}}\'s {{subject.product}} Emporium! I got big {{subject.product}}\'s, I got small {{subject.product}}\'s, hell I\'ve even got {{random.colour}} {{subject.product}}\'s and I will not be beaten on price! What\'re you talkin\' about {{crime.headline}} son? Can\'t you see I\'m trying to work here!"',
  ],
  officer_statements: [
    'The arresting officer {{officer.name.full}} ({{age}}) gave a statement saying "{{crime.article}} is no joke in {{state}}. If you are a fugitive from the law like {{culprit.name.formal}} here, let me tell you right now — the {{officer.rank}}\'s of {{state}} are vigilant. We will find you."',
    '{{officer.name.full}} ({{age}}) gave a short response via telegram saying {{officer.pronoun.objective}} expects all {{number}} to receive the maximum penalty in {{state}}: {{sentence.text}}. The governor was unavailable for comment but one aide said "{{reporter_insult}}"',
    '{{officer.name.full}} ({{age}}) the arresting officer had this to say: "{{culprit.name.formal}} is related to a local {{subject.product}} magnate and I think this is just a case of {{culprit.pronoun.child}}\'s being {{culprit.pronoun.child}}\'s. I\'d also like to address the {{dastardly}} rumours going around about corruption in the {{city}} police department — these lies are unfounded and frankly it\'s counterfeit news."',
  ],
  pleas_for_order: [
    'Now I know the good people of {{city}} will agree that this just can\'t stand. We need to wake up to this {{crime.headline}} epidemic that\'s sweeping across our fine nation and we need to act fast.',
    'I don\'t know what this world is coming to these days. I mean if it\'s not {{crime.article}} then it\'s another heinous act. What the hell happened to common decency, people? We need to get back to family values!',
    'I think we all can come together tonight and add {{city}} to our collective prayers, and I for one will be donating to all the various charities that spring from this tragic event that has befallen our brothers and sisters in {{state}}.',
  ],

  // Word lists
  animals: ['Badger', 'Bat', 'Beaver', 'Bear', 'Bighorn', 'Bison', 'Buck', 'Bullfrog', 'Cat', 'Chicken', 'Chipmunk', 'Cobra', 'Crocodile', 'Donkey', 'Dog', 'Dolphin', 'Fox', 'Gopher', 'Hare', 'Jackalope', 'Lynx', 'Monkey', 'Narwhal', 'Otter', 'Porcupine', 'Possum', 'Quail', 'Rabbit', 'Snake', 'Turtle', 'Vole', 'Whale', 'Wolverine'],
  buildings: ['City Hall', 'Bridge', 'Bank', 'General Store', '{{subject.product}} Factory', 'Gunsmith', "Tailor's Shop", 'Saloon', 'Church', 'Telegraph Office'],
  captures: ['bags', 'gets', 'catches', 'nabs', 'traps', 'brings in', 'apprehends'],
  captured: ['caught', 'apprehended', 'captured', 'arrested', 'caught in the act', 'caught red-handed'],
  cunning: ['wily', 'crafty', 'cunning', 'shrewd'],
  colours: ['red', 'yellow', 'pink', 'green', 'purple', 'orange', 'blue'],
  contraband: ['guns', 'drugs', 'explosives', 'gold', 'ghost rock'],
  crime_list: [
    { headline: 'Rustling',      article: "rustling {{subject.animal}}'s" },
    { headline: 'Robbery',       article: 'stealing {{subject.contraband}}' },
    { headline: 'Train Robbery', article: 'robbing a train' },
    { headline: 'Hold-Up',       article: 'holding up a stage coach' },
    { headline: 'Cult',          article: 'founding a {{subject.animal}}-worshipping cult' },
    { headline: 'Vandalism',     article: 'vandalising a {{subject.building}}' },
    { headline: 'Arson',         article: 'burning down a {{subject.building}}' },
    { headline: 'Smuggling',     article: 'smuggling {{subject.contraband}}' },
    { headline: 'Fraud',         article: 'committing {{subject.fraud}} fraud' },
    { headline: 'Murder',        article: "murdering {{crime.count}} people and {{random.number}} {{random.animal}}'s" },
  ],
  dastardly: ['villainous', 'dastardly', 'despicable', 'contemptible'],
  fraud: ['mail', 'telegraph', 'financial'],
  products: ['Glass Eye', 'Wooden Leg', 'Piano', 'Gun', 'Harmonica', 'Banjo', 'Steamwagon', 'Corset', 'Wind-Up Toy'],
  reporter_insults: [
    'Scram, News Jockey',
    "You reporters don't know when to leave it alone. Some things you should just let lie if you know what's good for you.",
    'Eat manure, Muckraker',
    'Get out of here! This is private property',
    'Who let you in here! {{random.name.male}}, you are fired! You! Get out!',
  ],
  sentences: [
    '{{sentence.number}} years of military service or the noose',
    '{{sentence.number}} years with no chance of parole',
    '{{sentence.number}} years in the state penitentiary',
    '{{sentence.number}} years hard time',
    "a good ol' fashioned hangin'",
    'death by New Science',
  ],
  spooky_possessions: [
    'some kind of bug took over {{culprit.pronoun.clause}} mind',
    'demons possessed {{culprit.pronoun.subjective}}',
    'something sticky and glowing {{random.colour}} was dripping out {{culprit.pronoun.clause}} eyes the whole time',
    'a ghost walked right through {{culprit.pronoun.objective}} and stole {{culprit.pronoun.clause}} shadow',
  ],
  numbers: ['three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'],
  number_lookup: [3, 4, 5, 6, 7, 8, 9, 10],
  officer_ranks: ['Deputy', 'Sheriff', 'Marshal', 'Agent', 'Officer'],
  professions: ['butcher', 'baker', 'candle maker', 'plumber', 'doctor', 'passer-by', 'blacksmith', 'saloon keeper', 'undertaker', 'bartender'],

  // Paper name components for random generation
  paper_name_adjectives: ['Daily', 'Weekly', 'Morning', 'Evening', 'Frontier', 'Western', 'Territorial'],
  paper_name_nouns: ['Epitaph', 'Gazette', 'Herald', 'Dispatch', 'Tribune', 'Sentinel', 'Chronicle', 'Record', 'Register', 'Advocate'],

  // Colophon / editorial sign-offs
  colophons: [
    'Printed by {{editor_name}} at the {{paper_name}} Press. Next edition: {{next_date}}.',
    'The {{paper_name}} is published weekly. Subscriptions: $2 per annum. Editor: {{editor_name}}.',
    'All the news that\'s fit to print — and some that ain\'t. {{editor_name}}, Editor-in-Chief.',
    'The views expressed herein are those of the editor alone. Correspondence may be directed to {{editor_name}}, General Delivery, {{city}}.',
  ],

  // --- Flavour brief pools (for side article snippets with 'continued on page X') ---
  flavour_headlines: [
    '{{crime.headline}} in {{city}}!',
    'Mystery in {{state}}',
    'Trouble in {{city}}',
    '{{city}} in Uproar',
    'Strange Times in {{state}}',
    'What is Happening in {{city}}?',
    '{{state}} on Alert',
    'A Dark Day in {{city}}',
    'Exclusive: {{crime.headline}} Spree',
    'The {{city}} {{subject.animal}} Mystery',
    'Gunfight in {{city}}!',
    'The Ghost of {{city}}',
    '{{officer.rank}} {{officer.name.last}} Speaks Out',
    'Scandal Rocks {{state}}',
    'The {{city}} {{subject.building}} Affair',
    'Justice in {{state}}?',
    'Bandits Strike Again in {{city}}',
    'The Curious Case of {{culprit.name.formal}}',
    'Terror on the {{state}} Road',
    '{{city}} Cattle Deaths Deepen',
  ],
  flavour_starts: [
    'A {{dastardly}} gang of {{number}} {{culprit.pronoun.group}}, led by {{culprit.name.full}} ({{age}}), were {{captured}} {{crime.article}} in {{city}}, {{state}} last week.',
    'Reports coming in from {{city}}, {{state}} confirm one {{culprit.name.full}} ({{age}}), and {{culprit.pronoun.clause}} {{number_sub_1}} accomplices were sentenced to {{sentence.text}} for {{crime.article}}.',
    'Local {{culprit.pronoun.singular}} {{culprit.name.full}} ({{age}}) was shot dead today whilst {{crime.article}}.',
    'The quiet town of {{city}}, {{state}} was rocked by scandal this week when {{culprit.name.full}} ({{age}}) was discovered to be running a {{subject.contraband}} smuggling ring.',
    'Strange doings in {{city}}, {{state}}, where {{number}} head of cattle were found dead in a field, each drained entirely of blood.',
    'A {{dastardly}} gang calling themselves "The {{city}} {{random.animal}}s" has been terrorizing merchants along the {{state}} toll road.',
    '{{officer.rank}} {{officer.name.full}} arrived in {{city}} this week on the trail of {{culprit.name.formal}}, wanted in {{territory}} for {{crime.article}}.',
    'The {{subject.building}} on Main Street in {{city}}, {{state}} was badly damaged last night in what authorities are calling an act of {{dastardly}} vandalism.',
    'A mysterious stranger known only as "{{culprit.name.first}}" rode into {{city}} last Tuesday and hasn\'t been seen since.',
    'The {{city}} bank was robbed in broad daylight by a lone {{culprit.pronoun.singular}} wearing a {{random.colour}} bandana.',
    'Deputies in {{state}} are searching for {{culprit.name.full}} ({{age}}), who escaped custody while being transported to the territorial prison.',
    'Fire broke out at the {{subject.building}} in {{city}} late Wednesday evening. The blaze is being treated as suspicious.',
    'An outbreak of {{crime.headline}} has the citizens of {{city}}, {{state}} at their wits\' end.',
    'The body of an unidentified {{culprit.pronoun.singular}} was found behind the {{subject.building}} in {{city}} yesterday morning.',
    '{{culprit.name.full}}, known to locals as "{{dastardly}} {{culprit.name.last}}", was finally run to ground after a {{number}}-day pursuit across {{state}}.',
    'A traveling salesman, {{culprit.name.full}} ({{age}}), was arrested in {{city}} after attempting to sell {{subject.contraband}} disguised as {{subject.product}}s.',
    'The good people of {{city}}, {{state}} are on edge after {{number}} graves were found disturbed in the cemetery.',
    'A peculiar green fog has settled over {{city}}, {{state}}, and several residents report hearing strange whispers in the night.',
    'The stage from {{city}} to {{state}} was held up by armed men yesterday. Passengers were relieved of their valuables but none were seriously harmed.',
    'Old prospectors returning from the hills above {{city}} speak of strange lights in the sky and cattle vanishing without trace.',
  ],

  // --- Weather article pools ---
  weather_headlines: [
    'Storm Front Bears Down on {{state}}',
    'Unseasonable Weather in {{city}}',
    '{{city}} Braces for {{weather.condition}}',
    'Strange Skies Over {{state}}',
    'The Weather: {{city}}, {{state}}',
  ],
  weather_reports: [
    'Residents of {{city}}, {{state}} awoke to {{weather.condition}} this morning, with temperatures hovering around {{weather.temperature}}. {{weather.forecast}}',
    'The {{weather.condition}} that swept through {{city}} last night has left locals scratching their heads. Old-timers say they haven\'t seen the like since \'{{weather.year}}. {{weather.forecast}}',
    'A fierce {{weather.condition}} struck {{city}}, {{state}} yesterday, damaging {{weather.damage}} and frightening {{weather.livestock}}. {{weather.forecast}}',
  ],
  weather_forecasts: [
    'Expect more of the same through the week, with {{weather.condition}} returning by Thursday.',
    'The forecast calls for clearing skies and warmer temperatures by midweek.',
    'Old Jim at the general store says his corns are aching \u2014 a sure sign of more {{weather.condition}} to come.',
    'Look for {{weather.condition}} to persist through the weekend before a cold front moves in from the territories.',
  ],
  weather_conditions: ['a howling dust storm', 'a peculiar green fog', 'a torrential downpour', 'an eerie calm', 'a blistering heat wave', 'a freak snowstorm', 'a swarm of locusts so thick it blocked out the sun'],
  weather_temperatures: ['32\u00b0F', '45\u00b0F', '57\u00b0F', '68\u00b0F', '75\u00b0F', '88\u00b0F', '97\u00b0F', 'a bone-chilling 12\u00b0F', 'a sweltering 102\u00b0F'],
  weather_forecast_conditions: ['More of the same is expected through the week.', 'Skies should clear by midweek.', 'The storm shows no sign of letting up.', 'Locals are advised to stay indoors.'],
  weather_years: ['49', '52', '61', '63', '68', '73'],
  weather_damages: ['the church steeple', 'the general store\'s porch', 'three outhouses', 'the telegraph office', 'the schoolhouse roof'],
  weather_livestock: ['the chickens', 'the milk cows', 'old Jeb\'s mule', 'every horse in the livery stable'],

  // --- Market article pools ---
  market_headlines: [
    '{{subject.product}} Prices Surge in {{state}}',
    'Market Report from {{city}}',
    'Boom in {{subject.product}} Trade',
    '{{city}} Merchants Report Record Sales',
    'Prices Hold Steady in {{state}}',
  ],
  market_reports: [
    'Trade was brisk this week in {{city}}, {{state}}, with {{subject.product}} leading the market at {{price}} per unit. Local merchant {{merchant.name.full}} reports "I can\'t keep {{subject.product}}s on the shelf \u2014 they\'re going faster than hotcakes at a church social!"',
    'The {{city}} market saw mixed results this week. {{subject.product}} climbed to {{price}}, while {{random.product}} held steady. {{merchant.name.full}}, proprietor of the general store, said "It\'s the boom times, sure enough. I\'ve been selling {{subject.product}}s since before the war and I\'ve never seen the like."',
    'Reports from {{state}} indicate a sharp rise in {{subject.product}} prices, now fetching {{price}} in {{city}}. {{merchant.name.formal}} attributes the spike to "all them new settlers coming through, each one wanting a {{subject.product}} of their own."',
  ],
  market_prices: [
    'Prices for {{subject.product}} are expected to hold through the month, with {{random.product}} trending upward.',
    'The outlook for next week: {{subject.product}} steady, {{random.product}} rising, and {{random.product}} in short supply.',
    'Cattle remain firm at ${{price_number}} per head, with grain holding at ${{price_number}} a bushel.',
  ],
  market_price_values: ['$2.50', '$5.00', '$12.00', '$25.00', '$50.00', '$1.25', '$3.75', '$8.00', '$15.00', '$30.00'],
  price_numbers: ['2', '3', '4', '5', '8', '12', '15', '20'],
  paper_prices: ['2¢', '3¢', '5¢', '10¢'],

  // --- Social article pools ---
  social_headlines: [
    'Grand Ball at {{city}}',
    '{{city}} Society Column',
    'Wedding Bells in {{state}}',
    'Community Picnic Draws Crowd in {{city}}',
    'Social Pages: {{city}}, {{state}}',
  ],
  social_reports: [
    'The fine folk of {{city}}, {{state}} turned out in force this past Saturday for {{event}}. {{host.name.full}} hosted the affair at {{host.pronoun.clause}} {{subject.building}} on Main Street. "It was the social event of the season," declared one attendee. "Everyone who is anyone was there."',
    'Society news from {{city}}, {{state}}: {{event}} was the highlight of the week, organised by {{host.name.full}} at the {{subject.building}}. The evening featured music, dancing, and a fine spread of victuals. "We don\'t get many excuses to put on our Sunday best out here," said one rancher\'s wife.',
    'Word reaches us from {{city}} that {{event}} drew a record crowd. {{host.name.formal}}, who presided over the festivities, remarked "It does the heart good to see the community come together like this \u2014 we need more of it and less of the other."',
  ],
  social_events: ['the annual Territorial Day celebration', 'a charity bake sale', 'a square dance and box supper', 'a church social', 'a barn raising', 'a birthday celebration for the oldest resident', 'a Fourth of July picnic', 'a harvest festival'],

  // --- Notice article pools ---
  notice_headlines: [
    'Public Notice: {{city}}',
    'Sheriff\'s Notice \u2014 {{state}}',
    'Wanted: {{city}}, {{state}}',
    'Notice to Citizens of {{city}}',
    'Public Warning from {{state}}',
  ],
  notice_reports: [
    'NOTICE is hereby given that {{notice_type}}. All interested parties should apply to the {{subject.building}} in {{city}}, {{state}} before {{next_date}}. {{notice_sign_off}}',
    'By order of the Sheriff\'s Office in {{city}}, {{state}}: {{notice_type}}. Failure to comply may result in {{sentence.text}}. {{notice_sign_off}}',
    'PUBLIC NOTICE \u2014 {{notice_type}}. Enquiries may be directed to the {{subject.building}} in {{city}}, {{state}}. {{notice_sign_off}}',
  ],
  notice_types: [
    'a reward of {{reward}} is offered for information leading to the capture of the {{city}} stagecoach robber',
    'all livestock must be penned after sundown',
    'the water well on Main Street is closed until further notice due to contamination',
    'a town meeting will be held at the {{subject.building}} to discuss the recent {{crime.headline}} spree',
    'travel on the road east of town is discouraged after dark',
    'all unlicensed firearms must be registered at the Sheriff\'s office',
  ],
  rewards: ['$25', '$50', '$100', '$200', '$500', 'a gold piece', 'a new pair of boots'],
  notice_sign_offs: ['\u2014 Posted by order of the City Council', '\u2014 Sheriff\'s Office, {{city}}', '\u2014 By order of the Territorial Governor', '\u2014 The {{city}} Civic Improvement Society'],

  // --- Continued phrases (for side article flavour briefs) ---
  continued_phrases: [
    'Continued on page {{continued_page}}',
    'Full story on page {{continued_page}}',
    'See page {{continued_page}} for the full account',
    'Turn to page {{continued_page}} for further details',
    'The rest of this story may be found on page {{continued_page}}',
    'Read the full report on page {{continued_page}}',
    'Continued on page {{continued_page}}, column {{continued_column}}',
    'For the complete story, see page {{continued_page}}',
  ],
};

// ---------------------------------------------------------------------------
// Article blueprints — data-driven paragraph composition
// ---------------------------------------------------------------------------
//
// Each blueprint defines how an article is assembled:
//   headline_pool  — DATA key for the headline template pool
//   context_type   — what kind of context to build ('crime' | 'weather' | 'market' | 'social' | 'notice')
//   paragraphs     — ordered list of paragraph slots; each slot picks from a DATA
//                    pool. `required: true` always includes the slot; `chance: 0.X`
//                    includes it with that probability. At least one paragraph is
//                    always included (the first required slot).

const ARTICLE_BLUEPRINTS = {
  // --- Crime articles (original content, now with variable length) ---
  crime_full: {
    label: 'Crime Report (Full)',
    headline_pool: 'headlines',
    context_type: 'crime',
    weight: 40,
    paragraphs: [
      { pool: 'starts',            required: true },
      { pool: 'witness_reports',   chance: 0.65 },
      { pool: 'officer_statements', chance: 0.55 },
      { pool: 'pleas_for_order',    chance: 0.30 },
    ],
  },
  crime_brief: {
    label: 'Crime Brief',
    headline_pool: 'headlines',
    context_type: 'crime',
    weight: 25,
    paragraphs: [
      { pool: 'starts',            required: true },
      { pool: 'witness_reports',   chance: 0.30 },
    ],
  },

  // --- Weather ---
  weather_full: {
    label: 'Weather Report (Full)',
    headline_pool: 'weather_headlines',
    context_type: 'weather',
    weight: 15,
    paragraphs: [
      { pool: 'weather_reports',   required: true },
      { pool: 'weather_forecasts', chance: 0.75 },
    ],
  },
  weather_brief: {
    label: 'Weather Brief',
    headline_pool: 'weather_headlines',
    context_type: 'weather',
    weight: 8,
    paragraphs: [
      { pool: 'weather_reports',   required: true },
    ],
  },

  // --- Market ---
  market_full: {
    label: 'Market Report (Full)',
    headline_pool: 'market_headlines',
    context_type: 'market',
    weight: 15,
    paragraphs: [
      { pool: 'market_reports',    required: true },
      { pool: 'market_prices',     chance: 0.75 },
    ],
  },
  market_brief: {
    label: 'Market Brief',
    headline_pool: 'market_headlines',
    context_type: 'market',
    weight: 8,
    paragraphs: [
      { pool: 'market_reports',    required: true },
    ],
  },

  // --- Social ---
  social_full: {
    label: 'Society Column (Full)',
    headline_pool: 'social_headlines',
    context_type: 'social',
    weight: 10,
    paragraphs: [
      { pool: 'social_reports',    required: true },
    ],
  },
  social_brief: {
    label: 'Society Column (Brief)',
    headline_pool: 'social_headlines',
    context_type: 'social',
    weight: 5,
    paragraphs: [
      { pool: 'social_reports',    required: true },
    ],
  },

  // --- Notice ---
  notice_full: {
    label: 'Public Notice (Full)',
    headline_pool: 'notice_headlines',
    context_type: 'notice',
    weight: 10,
    paragraphs: [
      { pool: 'notice_reports',    required: true },
    ],
  },
  notice_brief: {
    label: 'Public Notice (Brief)',
    headline_pool: 'notice_headlines',
    context_type: 'notice',
    weight: 5,
    paragraphs: [
      { pool: 'notice_reports',    required: true },
    ],
  },

  // --- Flavour brief (side article snippets with 'continued on page X') ---
  // This is the blueprint used for side articles. It produces a short
  // headline + single paragraph tease, followed by a 'continued' phrase.
  // No editor name is included — the author would be credited on the
  // article's own page (which we don't generate).
  flavour_brief: {
    label: 'Flavour Brief',
    headline_pool: 'flavour_headlines',
    context_type: 'crime',
    weight: 100,
    paragraphs: [
      { pool: 'flavour_starts',    required: true },
    ],
    is_flavour: true,
  },
};

// Registry for module-registered blueprints
const _blueprint_registry = {};

/**
 * Register a custom article blueprint. Modules can use this to add new
 * article types with their own content pools.
 * @param {string} id           — unique blueprint id
 * @param {Object} blueprint     — blueprint definition (see ARTICLE_BLUEPRINTS)
 */
function register_article_blueprint(id, blueprint) {
  if (!id || !blueprint || !blueprint.headline_pool || !blueprint.context_type || !Array.isArray(blueprint.paragraphs)) {
    console.warn('Deadlands-Classic | register_article_blueprint: missing required fields', id, blueprint);
    return;
  }
  _blueprint_registry[id] = { ...blueprint, label: blueprint.label || id };
}

/**
 * Get a blueprint by id, checking both built-in and module-registered.
 * @param {string} id
 * @returns {Object|null}
 */
function get_blueprint(id) {
  return ARTICLE_BLUEPRINTS[id] || _blueprint_registry[id] || null;
}

/**
 * Get all available blueprints (built-in + registered), with metadata.
 * @returns {Array<{id, label, context_type, weight, paragraphs_count}>}
 */
function list_blueprints() {
  const result = [];
  for (const [id, bp] of Object.entries(ARTICLE_BLUEPRINTS)) {
    result.push({ id, label: bp.label, context_type: bp.context_type, weight: bp.weight ?? 10, paragraphs_count: bp.paragraphs.length });
  }
  for (const [id, bp] of Object.entries(_blueprint_registry)) {
    result.push({ id, label: bp.label, context_type: bp.context_type, weight: bp.weight ?? 10, paragraphs_count: bp.paragraphs.length });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Pronoun tables
// ---------------------------------------------------------------------------

const PRONOUNS = {
  male: {
    title: 'Mr',
    singular: 'man',
    group: 'men',
    subjective: 'he',
    objective: 'him',
    clause: 'his',
    child: 'boy',
    polite_singular: 'gentleman',
    polite_group: 'gentlemen',
  },
  female: {
    title: 'Mrs',
    singular: 'woman',
    group: 'women',
    subjective: 'she',
    objective: 'her',
    clause: 'her',
    child: 'girl',
    polite_singular: 'lady',
    polite_group: 'ladies',
  },
};

// ---------------------------------------------------------------------------
// Built-in fallback advertisements
// ---------------------------------------------------------------------------

// Each ad returns structured data: { title, lines, note }
// The newspaper_sheet.hbs template renders this into HTML.
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
];

// ---------------------------------------------------------------------------
// Module content registry
// ---------------------------------------------------------------------------

const _content_registry = {
  advertisement: [],
  article: [],
  sidebar: [],
  colophon: [],
};

/**
 * Register newspaper content from a module or system extension.
 * @param {Object} def
 * @param {string} def.type       — 'advertisement' | 'article' | 'sidebar' | 'colophon'
 * @param {string} def.id         — unique content id
 * @param {number} [def.weight]   — selection weight (default 10)
 * @param {string} [def.label]    — display label for manual selection
 * @param {string} [def.source]   — originating module id
 * @param {Function} def.render   — (ctx) => { title, lines, note } structured data
 */
function register_newspaper_content(def) {
  if (!def || !def.type || !def.id || !def.render) {
    console.warn('Deadlands-Classic | register_newspaper_content: missing required fields', def);
    return;
  }
  if (!_content_registry[def.type]) {
    console.warn(`Deadlands-Classic | register_newspaper_content: unknown type "${def.type}"`);
    return;
  }
  // Deduplicate by id — replace existing
  const list = _content_registry[def.type];
  const idx = list.findIndex(c => c.id === def.id);
  if (idx >= 0) list[idx] = def;
  else list.push(def);
}

/**
 * List all registered content of a given type.
 * @param {string} [type] — filter by type; omit to list all
 * @returns {Array<{id, label, type, weight, source}>}
 */
function list_newspaper_content(type) {
  if (type) return _content_registry[type].map(c => ({ id: c.id, label: c.label, type: c.type, weight: c.weight, source: c.source }));
  const all = [];
  for (const [t, list] of Object.entries(_content_registry)) {
    for (const c of list) all.push({ id: c.id, label: c.label, type: t, weight: c.weight, source: c.source });
  }
  return all;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Pick a random element from an array using the provided rng. */
function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

/** Pick a weighted random content entry from a pool. */
function pick_weighted(rng, pool) {
  if (pool.length === 0) return null;
  const total = pool.reduce((sum, c) => sum + (c.weight ?? 10), 0);
  let r = rng() * total;
  for (const c of pool) {
    r -= (c.weight ?? 10);
    if (r <= 0) return c;
  }
  return pool[pool.length - 1];
}

/** Capitalise the first letter of every word (for headlines). */
function capitalize(str) {
  return str.split(' ').map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ');
}

/** Generate a random date string (1877–1881 range). */
function random_date(rng) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const month = pick(rng, months);
  const day = Math.floor(rng() * 28) + 1;
  const year = 1877 + Math.floor(rng() * 5);
  return `${month} ${day}, ${year}`;
}

/** Generate a random "next edition" date (main_date + ~7 days). */
function random_next_date(rng, main_date_str) {
  if (!main_date_str) {
    // No main date provided — fall back to independent generation
    return random_date(rng);
  }
  // Parse the main date (e.g. "March 14, 1879") and add 6-8 days
  const match = main_date_str.match(/^(\w+) (\d+), (\d+)$/);
  if (!match) return random_date(rng);
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  let month_idx = months.indexOf(match[1]);
  if (month_idx < 0) return random_date(rng);
  const day = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  // Add 6-8 days
  const add_days = Math.floor(rng() * 3) + 6;
  let new_day = day + add_days;
  // Approximate days-per-month (good enough for a newspaper date)
  const days_in_month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (new_day > days_in_month[month_idx]) {
    new_day -= days_in_month[month_idx];
    month_idx++;
    if (month_idx > 11) {
      month_idx = 0;
    }
  }
  return `${months[month_idx]} ${new_day}, ${year}`;
}

/** Generate a random paper name. */
function random_paper_name(rng) {
  const adj = pick(rng, DATA.paper_name_adjectives);
  const noun = pick(rng, DATA.paper_name_nouns);
  return `The ${adj} ${noun}`;
}

// ---------------------------------------------------------------------------
// Character generation (uses archetype_builder.generate_random_name)
// ---------------------------------------------------------------------------

let _generate_random_name = null;

async function make_character(role, rng) {
  const gender = rng() > 0.49 ? 'male' : 'female';
  const full_name = _generate_random_name ? await _generate_random_name('american', gender) : 'Unknown Stranger';
  const parts = (full_name || 'Unknown Stranger').split(' ');
  const first = parts[0] || 'Unknown';
  const last = parts.length > 1 ? parts[parts.length - 1] : 'Doe';
  const pronouns = PRONOUNS[gender];

  const char = {
    gender,
    name: { full: full_name, first, last, formal: `${pronouns.title} ${last}` },
    pronouns,
    age: Math.floor(rng() * 68) + 12,
  };

  if (role === 'officer') {
    char.rank = pick(rng, DATA.officer_ranks);
    char.name.full = `${char.rank} ${first} ${last}`;
    char.name.formal = `${char.rank} ${last}`;
  } else if (role === 'witness') {
    char.profession = pick(rng, DATA.professions);
  } else if (role === 'culprit') {
    char.profession = pick(rng, DATA.professions);
  }

  return char;
}

// ---------------------------------------------------------------------------
// Template resolver
// ---------------------------------------------------------------------------

/**
 * Resolve {{namespace.token}} placeholders in a string.
 * Loops up to 100 iterations to handle nested templates.
 *
 * @param {string} str     — template string
 * @param {Object} ctx    — context object with resolved values
 * @param {Object} rng    — seeded RNG function
 * @returns {string}
 */
function apply_templates(str, ctx, rng) {
  let count = 0;
  while (str.includes('{{') && count < 100) {
    count++;
    str = str.replace(/\{\{([^}]+)\}\}/g, (match, token) => {
      token = token.trim();
      return resolve_token(token, ctx, rng) ?? match;
    });
  }
  return str;
}

/**
 * Resolve a single template token.
 * Supports dot-separated paths: culprit.name.full, random.animal, etc.
 */
function resolve_token(token, ctx, rng) {
  const parts = token.split('.');
  const root = parts[0];

  // --- Context character pronouns ---
  if (ctx.char && ctx.char[root]) {
    const char = ctx.char[root];
    const sub = parts[1];
    if (sub === 'name') {
      const name_key = parts[2]; // full, first, formal
      return char.name[name_key] ?? char.name.full;
    }
    if (sub === 'pronoun') {
      const pron_key = parts[2]; // subjective, objective, clause, etc.
      return char.pronouns[pron_key] ?? '';
    }
    if (sub === 'rank') return char.rank || '';
    if (sub === 'profession') return char.profession || '';
    if (sub === 'age') return String(char.age);
    // Direct property access (e.g. culprit.gender)
    return char[sub] ?? '';
  }

  // --- Location tokens ---
  if (root === 'territory') return ctx.territory || '';
  if (root === 'state') return ctx.state || '';
  if (root === 'city') return ctx.city || '';

  // --- Crime tokens ---
  if (root === 'crime') {
    const sub = parts[1];
    if (sub === 'article') return ctx.crime?.article ?? '';
    if (sub === 'headline') return ctx.crime?.headline ?? '';
    if (sub === 'count') return ctx.crime_count ?? '';
    return '';
  }

  // --- Sentence tokens ---
  if (root === 'sentence') {
    const sub = parts[1];
    if (sub === 'text') return ctx.sentence ?? '';
    if (sub === 'number') return ctx.sentence_number ?? '';
    return '';
  }

  // --- Number tokens ---
  if (root === 'number') {
    if (parts[1] === 'sub_1') return String(DATA.number_lookup[DATA.numbers.indexOf(ctx.number)] - 1);
    return ctx.number ?? '';
  }

  // --- Subject tokens (pre-picked context values) ---
  if (root === 'subject') {
    const sub = parts[1];
    if (sub === 'animal') return ctx.subject_animal ?? '';
    if (sub === 'building') return ctx.building ?? '';
    if (sub === 'contraband') return ctx.contraband ?? '';
    if (sub === 'fraud') return ctx.fraud ?? '';
    if (sub === 'product') return ctx.product ?? '';
    return '';
  }

  // --- Static word picks ---
  if (root === 'cunning') return pick(rng, DATA.cunning);
  if (root === 'captures') return pick(rng, DATA.captures);
  if (root === 'captured') return pick(rng, DATA.captured);
  if (root === 'dastardly') return pick(rng, DATA.dastardly);
  if (root === 'reporter_insult') return pick(rng, DATA.reporter_insults);
  if (root === 'plea_for_order') return pick(rng, DATA.pleas_for_order);
  if (root === 'spooky_possession') return pick(rng, DATA.spooky_possessions);
  if (root === 'age') return String(Math.floor(rng() * 68) + 12);

  // --- Random word picks ---
  if (root === 'random') {
    const sub = parts[1];
    if (sub === 'animal') return pick(rng, DATA.animals);
    if (sub === 'colour') return pick(rng, DATA.colours);
    if (sub === 'crime') {
      const c = pick(rng, DATA.crime_list);
      return resolve_nested(c.article, ctx, rng);
    }
    if (sub === 'building') {
      const b = pick(rng, DATA.buildings);
      return resolve_nested(b, ctx, rng);
    }
    if (sub === 'number') return pick(rng, DATA.numbers);
    if (sub === 'product') return pick(rng, DATA.products);
    if (sub === 'name') {
      const gender = parts[2] || (rng() > 0.5 ? 'male' : 'female');
      // Synchronous fallback — won't have the async name, use a simple pick
      return `a ${gender} stranger`;
    }
    return '';
  }

  // --- Weather tokens (pre-picked in context) ---
  if (root === 'weather') {
    const sub = parts[1];
    if (sub === 'condition') return ctx.weather?.condition ?? '';
    if (sub === 'temperature') return ctx.weather?.temperature ?? '';
    if (sub === 'forecast') return ctx.weather?.forecast ?? '';
    if (sub === 'year') return ctx.weather?.year ?? '';
    if (sub === 'damage') return ctx.weather?.damage ?? '';
    if (sub === 'livestock') return ctx.weather?.livestock ?? '';
    return '';
  }

  // --- Market tokens (pre-picked in context) ---
  if (root === 'price') return ctx.price ?? '';
  if (root === 'price_number') return ctx.price_number ?? '';
  if (root === 'reward') return ctx.reward ?? '';

  // --- Merchant / host character (for market/social articles) ---
  if (ctx.char && (root === 'merchant' || root === 'host') && ctx.char[root]) {
    const char = ctx.char[root];
    const sub = parts[1];
    if (sub === 'name') {
      const name_key = parts[2];
      return char.name[name_key] ?? char.name.full;
    }
    if (sub === 'pronoun') {
      return char.pronouns[parts[2]] ?? '';
    }
    if (sub === 'profession') return char.profession || '';
    if (sub === 'age') return String(char.age);
    return char[sub] ?? '';
  }

  // --- Social event token ---
  if (root === 'event') return ctx.event ?? '';

  // --- Notice tokens ---
  if (root === 'notice_type') return ctx.notice_type ?? '';
  if (root === 'notice_sign_off') return ctx.notice_sign_off ?? '';

  // --- Paper tokens ---
  if (root === 'paper_name') return ctx.paper_name || '';
  if (root === 'editor_name') return ctx.editor_name || '';
  if (root === 'next_date') return ctx.next_date || '';

  return undefined; // Leave unresolved tokens in place
}

/** Resolve nested template tokens inside a string (for crime.article etc.) */
function resolve_nested(str, ctx, rng) {
  // Quick single-pass for simple nested tokens
  return apply_templates(str, ctx, rng);
}

// ---------------------------------------------------------------------------
// Context generation
// ---------------------------------------------------------------------------

/**
 * Build the shared location context (territory, state, city) used by all
 * article types. Only crime contexts need crime/culprit/officer/witness.
 * Other types build only what their templates need.
 *
 * @param {Object} rng    — seeded RNG
 * @param {string} [context_type] — 'crime' (default) | 'weather' | 'market' | 'social' | 'notice'
 * @param {Object} [extra] — extra context values (paper_name, editor_name, next_date, etc.)
 * @returns {Promise<Object>} context object
 */
async function build_context(rng, context_type = 'crime', extra = {}) {
  const territories = Object.keys(DATA.states);
  const territory = pick(rng, territories);
  const state = pick(rng, DATA.states[territory]);
  const cities = DATA.cities[state] || ['Unknown'];
  const city = pick(rng, cities);

  // Pre-pick subject values (used across multiple article types)
  const subject_animal = pick(rng, DATA.animals);
  const building = pick(rng, DATA.buildings);
  const contraband = pick(rng, DATA.contraband);
  const fraud = pick(rng, DATA.fraud);
  const product = pick(rng, DATA.products);

  // Start with shared base context
  const ctx = {
    ...extra,
    territory,
    state,
    city,
    subject_animal,
    building,
    contraband,
    fraud,
    product,
    char: {},
  };

  if (context_type === 'weather') {
    ctx.weather = {
      condition: pick(rng, DATA.weather_conditions),
      temperature: pick(rng, DATA.weather_temperatures),
      forecast: pick(rng, DATA.weather_forecasts),
      year: pick(rng, DATA.weather_years),
      damage: pick(rng, DATA.weather_damages),
      livestock: pick(rng, DATA.weather_livestock),
    };
    return ctx;
  }

  if (context_type === 'market') {
    ctx.char.merchant = await make_character('merchant', rng);
    ctx.price = pick(rng, DATA.market_price_values);
    ctx.price_number = pick(rng, DATA.price_numbers);
    return ctx;
  }

  if (context_type === 'social') {
    ctx.char.host = await make_character('host', rng);
    ctx.event = pick(rng, DATA.social_events);
    return ctx;
  }

  if (context_type === 'notice') {
    ctx.crime = pick(rng, DATA.crime_list); // notice types may reference crime
    ctx.crime_count = pick(rng, DATA.numbers);
    ctx.number = pick(rng, DATA.numbers);
    const sentence = pick(rng, DATA.sentences);
    const sentence_number = pick(rng, DATA.numbers);
    ctx.sentence = apply_templates(sentence, { number: sentence_number, sentence_number, sentence }, rng);
    ctx.sentence_number = sentence_number;
    ctx.notice_type = apply_templates(pick(rng, DATA.notice_types), { ...ctx, reward: pick(rng, DATA.rewards) }, rng);
    ctx.reward = pick(rng, DATA.rewards);
    ctx.notice_sign_off = apply_templates(pick(rng, DATA.notice_sign_offs), { city: ctx.city }, rng);
    return ctx;
  }

  // --- Default: crime context (original behaviour) ---
  const crime = pick(rng, DATA.crime_list);
  const number = pick(rng, DATA.numbers);
  const sentence = pick(rng, DATA.sentences);
  const sentence_number = pick(rng, DATA.numbers);

  const culprit = await make_character('culprit', rng);
  const officer = await make_character('officer', rng);
  const witness = await make_character('witness', rng);

  const resolved_sentence = apply_templates(sentence, { number: sentence_number, sentence_number, sentence }, rng);

  ctx.crime = crime;
  ctx.crime_count = pick(rng, DATA.numbers);
  ctx.number = number;
  ctx.sentence = resolved_sentence;
  ctx.sentence_number = sentence_number;
  ctx.char = { culprit, officer, witness };
  return ctx;
}

// ---------------------------------------------------------------------------
// Article generation (returns structured data, not HTML)
// ---------------------------------------------------------------------------

/**
 * Pick a blueprint by weight from the full pool (built-in + registered).
 * If `scope` is 'main', picks from all blueprints. If 'brief', picks only
 * from blueprints whose id ends with '_brief'.
 * @param {Object} rng
 * @param {string} [scope] — 'main' (default) or 'brief'
 * @returns {Object} blueprint object (with _id added)
 */
function pick_blueprint(rng, scope = 'main', options = {}) {
  const all = { ...ARTICLE_BLUEPRINTS, ..._blueprint_registry };

  if (scope === 'brief') {
    const entries = Object.entries(all).filter(([id]) => id.endsWith('_brief'));
    if (entries.length === 0) {
      return ARTICLE_BLUEPRINTS.flavour_brief
        ? { id: 'flavour_brief', ...ARTICLE_BLUEPRINTS.flavour_brief }
        : null;
    }
    return pick_weighted(rng, entries.map(([id, bp]) => ({ id, ...bp })));
  }

  const main_lead = options.main_lead || 'crime';
  const entries = Object.entries(all).filter(([id, bp]) => {
    if (bp.is_flavour || id.endsWith('_brief')) return false;
    if (main_lead === 'any') return true;
    return bp.context_type === 'crime';
  });
  if (entries.length === 0) return null;
  return pick_weighted(rng, entries.map(([id, bp]) => ({ id, ...bp })));
}

/**
 * Generate a single procedural news article as a structured data object.
 *
 * If no blueprint_id is given, one is picked at random (weighted). For
 * side articles, pass blueprint_scope='brief' to restrict to short
 * blueprints. For the main article, pass 'main' (or omit) to allow any.
 *
 * @param {Object} [options]
 * @param {string} [options.seed]           — seed for deterministic output
 * @param {string} [options.blueprint_id]   — specific blueprint to use
 * @param {string} [options.blueprint_scope] — 'main' (default) or 'brief'
 * @param {Object} [options.extra_ctx]       — extra context values to merge
 * @returns {Promise<Object>} article data { headline, paragraphs, editor, city, state, type }
 */
async function generate_article(options = {}) {
  const rng = create_rng(options.seed);

  // Resolve blueprint
  let blueprint = options.blueprint_id ? get_blueprint(options.blueprint_id) : null;
  if (!blueprint) {
    blueprint = pick_blueprint(rng, options.blueprint_scope || 'main', options);
  }
  // Fallback to crime_full if nothing found
  if (!blueprint) blueprint = ARTICLE_BLUEPRINTS.crime_full;

  // Build context for this article type
  const ctx = await build_context(rng, blueprint.context_type, options.extra_ctx || {});

  // Headline
  const headline_pool = DATA[blueprint.headline_pool] || DATA.headlines;
  let headline = apply_templates(pick(rng, headline_pool), ctx, rng);
  headline = capitalize(headline);

  // Compose paragraphs from blueprint slot definitions
  const paragraphs = [];
  // Track which slots we've already used so backfill doesn't duplicate
  const used_slots = new Set();
  for (let i = 0; i < blueprint.paragraphs.length; i++) {
    const slot = blueprint.paragraphs[i];
    const include = slot.required || rng() < (slot.chance ?? 1);
    if (!include) continue;
    const pool = DATA[slot.pool];
    if (!pool || pool.length === 0) continue;
    const text = apply_templates(pick(rng, pool), ctx, rng);
    paragraphs.push(text);
    used_slots.add(i);
  }

  // Main articles should have at least 4 paragraphs to fill the column
  // space. If we fell short, backfill from remaining (non-required) slots
  // that were skipped. If we run out of skipped slots, keep drawing
  // additional paragraphs from the first (required) pool.
  const is_flavour = !!blueprint.is_flavour;
  const is_main = !is_flavour && (options.blueprint_scope || 'main') === 'main' && !options.blueprint_id?.endsWith('_brief');
  const min_paragraphs = is_main ? 4 : 1;
  if (paragraphs.length < min_paragraphs) {
    const skipped = blueprint.paragraphs
      .map((slot, i) => ({ slot, i }))
      .filter(({ i }) => !used_slots.has(i));
    for (const { slot, i } of skipped) {
      if (paragraphs.length >= min_paragraphs) break;
      const pool = DATA[slot.pool];
      if (!pool || pool.length === 0) continue;
      paragraphs.push(apply_templates(pick(rng, pool), ctx, rng));
      used_slots.add(i);
    }
    // Still short? Keep drawing from the first required pool
    if (paragraphs.length < min_paragraphs) {
      const first_pool = DATA[blueprint.paragraphs[0]?.pool];
      if (first_pool && first_pool.length > 0) {
        while (paragraphs.length < min_paragraphs) {
          paragraphs.push(apply_templates(pick(rng, first_pool), ctx, rng));
        }
      }
    }
  }

  // Safety: ensure at least one paragraph
  if (paragraphs.length === 0) {
    const first_slot = blueprint.paragraphs.find(s => s.required) || blueprint.paragraphs[0];
    if (first_slot) {
      const pool = DATA[first_slot.pool];
      if (pool && pool.length > 0) {
        paragraphs.push(apply_templates(pick(rng, pool), ctx, rng));
      }
    }
  }

  // Editor name — skipped for flavour briefs (author credited on article's own page)
  const editor_name = is_flavour ? '' : (_generate_random_name ? await _generate_random_name('american', 'male') : 'A. Editor');

  // Continued phrase — only for flavour briefs
  let continued = '';
  if (is_flavour) {
    const continued_page = Math.floor(rng() * 8) + 2; // pages 2-9
    const continued_column = String.fromCharCode(65 + Math.floor(rng() * 4)); // A-D
    const phrase_template = pick(rng, DATA.continued_phrases);
    continued = apply_templates(phrase_template, { continued_page, continued_column }, rng);
  }

  return {
    headline,
    paragraphs,
    editor: editor_name,
    city: ctx.city,
    state: ctx.state,
    type: blueprint.context_type,
    ...(continued ? { continued } : {}),
  };
}

// ---------------------------------------------------------------------------
// Advertisement selection (returns data, not HTML)
// ---------------------------------------------------------------------------

/**
 * Select an advertisement from registered content + built-in fallbacks.
 * @param {Object} rng     — seeded RNG
 * @param {Object} [filters] — optional { ids: [...], sources: [...], exclude_ids: Set<string> }
 * @returns {Object|null} ad data { id, title, lines, note }
 */
function select_advertisement(rng, filters) {
  let pool = [..._content_registry.advertisement, ...BUILTIN_ADS];

  if (filters?.ids) {
    pool = pool.filter(a => filters.ids.includes(a.id));
  }
  if (filters?.sources) {
    pool = pool.filter(a => filters.sources.includes(a.source));
  }
  if (filters?.exclude_ids && filters.exclude_ids.size > 0) {
    pool = pool.filter(a => !filters.exclude_ids.has(a.id));
  }

  const ad = pick_weighted(rng, pool);
  if (!ad) return null;

  const content = ad.render({ rng });
  return { id: ad.id, ...content };
}

// ---------------------------------------------------------------------------
// Newspaper generation (returns structured data, not HTML)
// ---------------------------------------------------------------------------

/**
 * Generate a complete newspaper as a structured data object.
 *
 * The returned object is stored on the document item as `newspaper_data`
 * and rendered via the `newspaper_sheet.hbs` Handlebars template when opened.
 *
 * @param {Object} [options]
 * @param {string} [options.mode]          — 'random' | 'hybrid' | 'scaffold' (default: 'random')
 * @param {string} [options.paper_name]    — newspaper name (default: 'The Tombstone Epitaph')
 * @param {string} [options.date]          — date string (random if omitted)
 * @param {number} [options.columns]        — main article columns: 2 or 3 (default 2)
 * @param {number} [options.side_articles]   — number of flavour briefs to generate (default 4, distributed across both side columns)
 * @param {number} [options.advertisements]  — number of ads: 0, 1, or 2 (default 2)
 * @param {string} [options.main_lead]         — 'crime' (default) or 'any' for main article blueprint pool
 * @param {string} [options.main_article_headline] — hybrid mode headline
 * @param {string} [options.price]            — cover price (default random from paper_prices)
 * @param {string} [options.seed]           — seed for deterministic output
 * @param {Object} [options.content_filters]  — restrict registered content ({ ids, sources })
 * @returns {Promise<Object>} newspaper data object
 */
async function generate_newspaper(options = {}) {
  const mode = options.mode || 'random';
  const rng = create_rng(options.seed);

  // Paper details
  const paper_name = options.paper_name || 'The Tombstone Epitaph';
  const date = options.date || random_date(rng);
  const next_date = random_next_date(rng, date);
  const columns = options.columns || 2;
  const side_count = options.side_articles ?? 4;
  const ad_count = options.advertisements ?? 2;
  const price = options.price || pick(rng, DATA.paper_prices);
  const volume = Math.floor(rng() * 9) + 1;
  const issue = Math.floor(rng() * 52) + 1;

  // Editor name
  const editor_name = _generate_random_name ? await _generate_random_name('american', 'male') : 'A. Editor';

  // --- Mode: scaffold (blank layout) ---
  if (mode === 'scaffold') {
    return {
      paper_name,
      date,
      price,
      volume: roman(volume),
      issue,
      columns,
      main_article: { headline: '', paragraphs: [], editor: editor_name },
      side_articles: Array.from({ length: side_count }, (_, i) => ({
        headline: '',
        paragraphs: [],
        editor: '',
        continued: '',
      })),
      advertisements: Array.from({ length: ad_count }, (_, i) => ({
        id: `placeholder-${i}`,
        column: i % 2 === 0 ? 'left' : 'right',
        title: '',
        lines: [],
        note: '',
      })),
      colophon: apply_templates(pick(rng, DATA.colophons), { paper_name, editor_name, next_date, city: '' }, rng),
    };
  }

  // --- Build main article ---
  let main_article;
  let main_city = '';
  let main_state = '';

  // Paper-level context passed to all articles (for colophon/paper tokens)
  const paper_ctx = { paper_name, editor_name, next_date };

  if (mode === 'hybrid' && (options.main_article_text || options.main_article_headline)) {
    const body = options.main_article_text || '';
    main_article = {
      headline: options.main_article_headline || '',
      paragraphs: body ? body.split(/\n\n+/).filter(p => p.trim()) : [],
      editor: editor_name,
    };
  } else {
    const article = await generate_article({
      seed: options.seed,
      blueprint_scope: 'main',
      main_lead: options.main_lead,
      extra_ctx: paper_ctx,
    });
    main_article = { ...article };
    main_city = article.city;
    main_state = article.state;
  }

  // --- Build side articles (shorter 'brief' blueprints) ---
  const side_articles = [];
  for (let i = 0; i < side_count; i++) {
    side_articles.push(await generate_article({
      seed: options.seed ? `${options.seed}-side-${i}` : undefined,
      blueprint_scope: 'brief',
      extra_ctx: paper_ctx,
    }));
  }

  // --- Select advertisements (no duplicates) ---
  const advertisements = [];
  const used_ad_ids = new Set();
  for (let i = 0; i < ad_count; i++) {
    const ad = select_advertisement(rng, { ...options.content_filters, exclude_ids: used_ad_ids });
    if (ad) {
      used_ad_ids.add(ad.id);
      advertisements.push({ ...ad, column: i % 2 === 0 ? 'left' : 'right' });
    }
  }

  // --- Build colophon ---
  const colophon = apply_templates(
    pick(rng, DATA.colophons),
    { paper_name, editor_name, next_date, city: main_city },
    rng,
  );

  return {
    paper_name,
    date,
    price,
    volume: roman(volume),
    issue,
    columns,
    main_article,
    side_articles,
    advertisements,
    colophon,
  };
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/** Convert a number to Roman numerals (for edition numbers). */
function roman(num) {
  const lookup = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  return lookup[num] || String(num);
}

// ---------------------------------------------------------------------------
// Init — wire the name generator from archetype_builder
// ---------------------------------------------------------------------------

/**
 * Initialise the newspaper generator with the async name generator.
 * Called during system init.
 * @param {Function} name_generator — async (origin, gender) => string
 */
function init(name_generator) {
  _generate_random_name = name_generator;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  generate_newspaper,
  generate_article,
  register_newspaper_content,
  list_newspaper_content,
  register_article_blueprint,
  list_blueprints,
  init,
};