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

import { BUILTIN_ADS, select_advertisement } from './newspaper_ads.js';
import {
  calculate_slots_per_column,
  pack_column_slots,
  fill_empty_slots,
  build_scaffold_layout,
  split_into_fragments,
  collect_main_paragraphs,
} from './newspaper_layout.js';
import {
  get_effective_pool,
  register_pool_sources,
} from './newspaper_pool_overrides.js';
import {
  register_value_list_sources,
  get_effective_value_list,
  get_effective_crime_list,
  get_effective_states,
  get_effective_cities,
  list_all_territories,
} from './newspaper_value_lists.js';

function pick_vl(rng, key) {
  const pool = get_effective_value_list(key);
  return pool.length ? pick(rng, pool) : '';
}

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
    'A {{dastardly}} gang of {{number}} {{culprit.pronoun.group}}, led by {{culprit.name.full}} ({{culprit.age}}), were {{captured}} {{crime.article}} in {{city}}, {{state}} last week. {{plea_for_order}}',
    'Reports coming in from {{city}}, {{state}} confirm one {{culprit.name.full}} ({{culprit.age}}), and {{culprit.pronoun.clause}} {{number.sub_1}} accomplices were sentenced to {{sentence.text}} for {{crime.article}} last week. {{plea_for_order}}',
    'Local {{culprit.pronoun.singular}} {{culprit.name.full}} ({{culprit.age}}) was shot dead today whilst {{crime.article}}. {{plea_for_order}}',
    'It seems that the crime epidemic in {{city}}, {{state}} has reached new heights with another {{culprit.pronoun.singular}}, a {{culprit.name.full}} ({{culprit.age}}) being sentenced to {{sentence.text}} for {{crime.article}}! {{plea_for_order}}',
    'Local {{witness.profession}} {{culprit.name.full}} ({{culprit.age}}) went on an unexpected crime spree last month. {{culprit.name.formal}} was first seen {{crime.article}} after which witnesses report {{culprit.pronoun.subjective}} {{random.crime}} before finally being apprehended attempting to ransom back a {{random.building}} that {{culprit.pronoun.subjective}} had occupied by force back to the state of {{state}}.',
    // New templates — expanded pool for flavour briefs
    'The quiet town of {{city}}, {{state}} was rocked by scandal this week when {{culprit.name.full}} ({{culprit.age}}), a respected {{witness.profession}}, was discovered to be running a {{subject.contraband}} smuggling ring out of the {{subject.building}} basement.',
    'Strange doings in {{city}}, {{state}}, where {{number}} head of cattle were found dead in a field outside town, each one drained entirely of blood. Sheriff\'s deputies are baffled and locals are whispering about {{spooky_possession}}.',
    'A {{dastardly}} gang calling themselves "The {{city}} {{random.animal}}s" has been terrorizing merchants along the {{state}} toll road, {{crime.article}} and leaving nothing but empty whiskey bottles in their wake.',
    '{{officer.rank}} {{officer.name.full}} arrived in {{city}} this week on the trail of {{culprit.name.formal}}, wanted in {{territory}} for {{crime.article}}. "We\'ve been on {{culprit.pronoun.clause}} trail for {{number}} weeks now," the {{officer.rank}} told our reporter.',
    'The {{subject.building}} on Main Street in {{city}}, {{state}} was badly damaged last night in what authorities are calling an act of {{dastardly}} vandalism. {{culprit.name.full}} ({{culprit.age}}) was taken into custody at the scene.',
    'A mysterious stranger known only as "{{culprit.name.first}}" rode into {{city}} last Tuesday and hasn\'t been seen since. {{culprit.pronoun.subjective}} was last headed toward the {{subject.building}}, carrying a suspiciously large sack and humming a strange tune.',
    'The {{city}} bank was robbed in broad daylight by a lone {{culprit.pronoun.singular}} wearing a {{random.colour}} bandana. {{officer.rank}} {{officer.name.last}} says this is the {{number}} bank robbery in {{state}} this month.',
    'Deputies in {{state}} are searching for {{culprit.name.full}} ({{culprit.age}}), who escaped custody while being transported to the territorial prison. {{culprit.name.formal}} was last seen heading toward {{city}} on a stolen {{subject.animal}}.',
    'A {{dastardly}} scheme involving forged deeds to {{subject.building}}s across {{state}} has been uncovered. The alleged ringleader, {{culprit.name.full}}, is said to have swindled {{number}} families out of their properties using forged documents.',
    'Fire broke out at the {{subject.building}} in {{city}} late Wednesday evening. Though flames were quickly contained, the blaze is being treated as suspicious. A {{culprit.pronoun.singular}} matching {{culprit.name.formal}}\'s description was seen fleeing the scene.',
    'An outbreak of {{crime.headline}} has the citizens of {{city}}, {{state}} at their wits\' end. "I\'ve lived here all my life and never seen anything like it," said one resident who declined to give their name.',
    'The body of an unidentified {{culprit.pronoun.singular}} was found behind the {{subject.building}} in {{city}} yesterday morning. {{officer.rank}} {{officer.name.full}} says foul play is suspected and an inquest will be held.',
    '{{culprit.name.full}}, known to locals in {{city}} as "{{dastardly}} {{culprit.name.last}}", was finally run to ground by {{officer.rank}} {{officer.name.full}} after a {{number}}-day pursuit across {{state}}.',
    'A traveling salesman, {{culprit.name.full}} ({{culprit.age}}), was arrested in {{city}} after attempting to sell what turned out to be {{subject.contraband}} disguised as {{subject.product}}s. "The fake mustache was a dead giveaway," said arresting {{officer.rank}} {{officer.name.last}}.',
    'The good people of {{city}}, {{state}} are on edge after {{number}} graves were found disturbed in the cemetery. {{officer.rank}} {{officer.name.full}} declined to speculate on whether the perpetrator is human or something altogether more {{dastardly}}.',
  ],
  witness_reports: [
    'One eye witness, {{witness.name.full}} ({{witness.age}}), a local contrarian, was quoted to say "The {{subject.animal}}\'s did it! I seen \'em doin\' it! Them and the {{random.animal}}\'s — this goes all the way to the top, man! Even the {{random.animal}}\'s are in on it!" However {{witness.name.formal}} is believed, at least by this reporter, to be insane. I think it might be high time to investigate just exactly why so many people I interview are certifiably insane.',
    'One witness who wishes to remain anonymous reported "Look, I know this sounds crazy but {{spooky_possession}}." Another, also not willing to put their name to an outright fabrication, said "{{spooky_possession}} — I know how crazy that sounds but it\'s what I saw!" I mean come on now, {{spooky_possession}}! Like we were all born yesterday. P.T. Barnum has a point — there is a sucker born every minute and I\'m afraid it\'s you this minute, dear reader, if you believe that nonsense!',
    'Local {{subject.product}} merchant {{witness.name.full}} ({{witness.age}}) was willing to go on record stating: "You lookin\' to buy a {{subject.product}}? Come on down and see me at Crazy {{witness.name.first}}\'s {{subject.product}} Emporium! I got big {{subject.product}}\'s, I got small {{subject.product}}\'s, hell I\'ve even got {{random.colour}} {{subject.product}}\'s and I will not be beaten on price! What\'re you talkin\' about {{crime.headline}} son? Can\'t you see I\'m trying to work here!"',
  ],
  officer_statements: [
    'The arresting officer {{officer.name.full}} ({{officer.age}}) gave a statement saying "{{crime.article}} is no joke in {{state}}. If you are a fugitive from the law like {{culprit.name.formal}} here, let me tell you right now — the {{officer.rank}}\'s of {{state}} are vigilant. We will find you."',
    '{{officer.name.full}} ({{officer.age}}) gave a short response via telegram saying {{officer.pronoun.subjective}} expects all {{number}} to receive the maximum penalty in {{state}}: {{sentence.text}}. The governor was unavailable for comment but one aide said "{{reporter_insult}}"',
    '{{officer.name.full}} ({{officer.age}}) the arresting officer had this to say: "{{culprit.name.formal}} is related to a local {{subject.product}} magnate and I think this is just a case of {{culprit.pronoun.child}}\'s being {{culprit.pronoun.child}}\'s. I\'d also like to address the {{dastardly}} rumours going around about corruption in the {{city}} police department — these lies are unfounded and frankly it\'s counterfeit news."',
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
    'demons possessed {{culprit.pronoun.objective}}',
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
    'Agency Probe in {{city}}',
    'Wasatch Train Incident',
    'Ghost Rock Theft in {{state}}',
    'Lost Angels Charity Under Scrutiny',
    'Smith & Robards Recall?',
    'Sioux Boundary Dispute',
    'Pinkerton Inquiry in {{city}}',
    'Union Blue Derailment',
    'Black River Freight Seized',
  ],
  flavour_starts: [
    'A {{dastardly}} gang of {{number}} {{culprit.pronoun.group}}, led by {{culprit.name.full}} ({{culprit.age}}), were {{captured}} {{crime.article}} in {{city}}, {{state}} last week.',
    'Reports coming in from {{city}}, {{state}} confirm one {{culprit.name.full}} ({{culprit.age}}), and {{culprit.pronoun.clause}} {{number.sub_1}} accomplices were sentenced to {{sentence.text}} for {{crime.article}}.',
    'Local {{culprit.pronoun.singular}} {{culprit.name.full}} ({{culprit.age}}) was shot dead today whilst {{crime.article}}.',
    'The quiet town of {{city}}, {{state}} was rocked by scandal this week when {{culprit.name.full}} ({{culprit.age}}) was discovered to be running a {{subject.contraband}} smuggling ring.',
    'Strange doings in {{city}}, {{state}}, where {{number}} head of cattle were found dead in a field, each drained entirely of blood.',
    'A {{dastardly}} gang calling themselves "The {{city}} {{random.animal}}s" has been terrorizing merchants along the {{state}} toll road.',
    '{{officer.rank}} {{officer.name.full}} arrived in {{city}} this week on the trail of {{culprit.name.formal}}, wanted in {{territory}} for {{crime.article}}.',
    'The {{subject.building}} on Main Street in {{city}}, {{state}} was badly damaged last night in what authorities are calling an act of {{dastardly}} vandalism.',
    'A mysterious stranger known only as "{{culprit.name.first}}" rode into {{city}} last Tuesday and hasn\'t been seen since.',
    'The {{city}} bank was robbed in broad daylight by a lone {{culprit.pronoun.singular}} wearing a {{random.colour}} bandana.',
    'Deputies in {{state}} are searching for {{culprit.name.full}} ({{culprit.age}}), who escaped custody while being transported to the territorial prison.',
    'Fire broke out at the {{subject.building}} in {{city}} late Wednesday evening. The blaze is being treated as suspicious.',
    'An outbreak of {{crime.headline}} has the citizens of {{city}}, {{state}} at their wits\' end.',
    'The body of an unidentified {{culprit.pronoun.singular}} was found behind the {{subject.building}} in {{city}} yesterday morning.',
    '{{culprit.name.full}}, known to locals as "{{dastardly}} {{culprit.name.last}}", was finally run to ground after a {{number}}-day pursuit across {{state}}.',
    'A traveling salesman, {{culprit.name.full}} ({{culprit.age}}), was arrested in {{city}} after attempting to sell {{subject.contraband}} disguised as {{subject.product}}s.',
    'The good people of {{city}}, {{state}} are on edge after {{number}} graves were found disturbed in the cemetery.',
    'A peculiar green fog has settled over {{city}}, {{state}}, and several residents report hearing strange whispers in the night.',
    'The stage from {{city}} to {{state}} was held up by armed men yesterday. Passengers were relieved of their valuables but none were seriously harmed.',
    'Old prospectors returning from the hills above {{city}} speak of strange lights in the sky and cattle vanishing without trace.',
    'Agents of the Federal Bureau arrived in {{city}} yesterday to investigate reports of unnatural creatures stalking the outskirts.',
    'A Wasatch Railroad express derailed outside {{city}}, {{state}} last night — witnesses describe green flames and clockwork debris scattered along the track.',
    'Thieves made off with a shipment of ghost rock bound for the refinery, leaving {{number}} guards dead and no trace of the wagon.',
    'Questions surround a charity drive organised by missionaries from Lost Angels, after ledgers showed funds never reached the poor of {{city}}.',
    'Smith & Robards has issued a recall on a popular pocket gadget after several exploded in the hands of customers in {{state}}.',
    'Sioux warriors were seen patrolling the boundary east of {{city}}, warning settlers that treaty lands have been crossed again.',
    'Pinkerton detectives questioned half the merchants on Main Street regarding a missing payroll from the Union Blue depot.',
    'Rail barons are feuding again — Black River freight agents seized a Union Blue car on disputed sidings near {{city}}.',
    'Texas Rangers rode through {{city}} at dawn, hunting a reckoners\' associate wanted for shootings in three territories.',
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

  // --- Main-article fragment pools (2–4 sentences each; start / middle / end) ---
  main_fragments_starts: [
    'A {{dastardly}} gang led by {{culprit.name.full}} ({{culprit.age}}) were {{captured}} {{crime.article}} in {{city}}, {{state}} last week. {{officer.rank}} {{officer.name.last}} says the investigation is ongoing and more arrests may follow.',
    'Reports from {{city}}, {{state}} confirm {{culprit.name.full}} ({{culprit.age}}) was sentenced to {{sentence.text}} for {{crime.article}}. The courtroom was packed with townsfolk eager to see justice done.',
    'Local {{culprit.pronoun.singular}} {{culprit.name.full}} ({{culprit.age}}) was shot dead whilst {{crime.article}} in {{city}}. {{officer.rank}} {{officer.name.full}} arrived on the scene within the hour and cordoned off the area.',
    'The crime wave in {{city}}, {{state}} worsened when {{culprit.name.full}} ({{culprit.age}}) received {{sentence.text}} for {{crime.article}}. Merchants on Main Street report trade has suffered as nervous customers stay home.',
    '{{officer.rank}} {{officer.name.full}} arrived in {{city}} on the trail of {{culprit.name.formal}}, wanted for {{crime.article}}. "We\'ve been on {{culprit.pronoun.clause}} trail for {{number}} weeks now," the {{officer.rank}} told our reporter.',
    'The {{subject.building}} on Main Street in {{city}} was damaged in an act of {{dastardly}} vandalism. {{culprit.name.full}} ({{culprit.age}}) was taken into custody at the scene after a brief struggle with deputies.',
    'The {{city}} bank was robbed in broad daylight by a {{culprit.pronoun.singular}} wearing a {{random.colour}} bandana. {{officer.rank}} {{officer.name.last}} says this is the {{number}} bank robbery in {{state}} this month alone.',
    'Deputies in {{state}} are searching for {{culprit.name.full}} ({{culprit.age}}), who escaped while being transported to prison. {{culprit.name.formal}} was last seen heading toward {{city}} on a stolen {{subject.animal}}.',
    'Fire broke out at the {{subject.building}} in {{city}} late Wednesday. A {{culprit.pronoun.singular}} matching {{culprit.name.formal}}\'s description fled the scene, though flames were quickly contained.',
    'The body of an unidentified {{culprit.pronoun.singular}} was found behind the {{subject.building}} in {{city}} yesterday morning. {{officer.rank}} {{officer.name.full}} says foul play is suspected and an inquest will be held.',
    '{{culprit.name.full}}, known locally as "{{dastardly}} {{culprit.name.last}}", was run to ground after a {{number}}-day pursuit across {{state}}. {{officer.rank}} {{officer.name.full}} personally led the posse that finally cornered the fugitive.',
    'A traveling salesman, {{culprit.name.full}} ({{culprit.age}}), was arrested in {{city}} for selling {{subject.contraband}} disguised as {{subject.product}}s. "The fake mustache was a dead giveaway," said arresting {{officer.rank}} {{officer.name.last}}.',
    'Strange doings in {{city}}, {{state}}, where {{number}} head of cattle were found dead, each drained of blood. Sheriff\'s deputies are baffled and locals are whispering about {{spooky_possession}}.',
    'A {{dastardly}} scheme involving forged deeds to {{subject.building}}s across {{state}} has been uncovered. The alleged ringleader, {{culprit.name.full}}, is said to have swindled {{number}} families out of their properties.',
    'An outbreak of {{crime.headline}} has the citizens of {{city}}, {{state}} at their wits\' end. "I\'ve lived here all my life and never seen anything like it," said one resident who declined to give their name.',
    'The quiet town of {{city}} was rocked when {{culprit.name.full}} ({{culprit.age}}) was discovered running a {{subject.contraband}} smuggling ring out of the {{subject.building}} basement. A respected {{witness.profession}} was among those taken into custody.',
    'A gang calling themselves "The {{city}} {{random.animal}}s" has been {{crime.article}} along the {{state}} toll road, leaving nothing but empty whiskey bottles in their wake. Merchants are demanding action from the territorial authorities.',
    'A mysterious stranger known as "{{culprit.name.first}}" rode into {{city}} Tuesday carrying a suspiciously large sack. {{culprit.pronoun.subjective}} was last headed toward the {{subject.building}}, humming a strange tune.',
    'The good people of {{city}} are on edge after {{number}} graves were found disturbed in the cemetery. {{officer.rank}} {{officer.name.full}} declined to speculate on whether the perpetrator is human or something altogether more {{dastardly}}.',
    'Old prospectors above {{city}} speak of strange lights and cattle vanishing without trace. Agents of the Federal Bureau arrived yesterday to investigate reports of unnatural creatures stalking the outskirts.',
  ],
  main_fragments_witness: [
    'Witness {{witness.name.full}} ({{witness.age}}) claimed "{{spooky_possession}}." This reporter finds the account doubtful, though {{witness.name.formal}} seemed entirely sincere at the time of our interview.',
    'One witness who declined to be named insisted "{{spooky_possession}}." Make of that what you will, dear reader — I for one remain unconvinced by such fanciful testimony.',
    'Local {{subject.product}} merchant {{witness.name.full}} refused to comment on the affair, citing business. "Can\'t you see I\'m trying to work here?" {{witness.pronoun.subjective}} told our correspondent before slamming the door.',
    'A passer-by reported hearing shots near the {{subject.building}} shortly before dawn. "It sounded like a whole war breaking out," said the witness, who asked to remain anonymous for fear of reprisal.',
    '{{witness.name.formal}}, a {{witness.profession}}, told our correspondent the town "has never seen the like." {{witness.pronoun.subjective}} has lived in {{city}} for {{witness.age}} years and claims nothing comparable has occurred in living memory.',
    'One eye witness, {{witness.name.full}} ({{witness.age}}), a local contrarian, was quoted to say "The {{subject.animal}}\'s did it! I seen \'em doin\' it!" However {{witness.name.formal}} is believed, at least by this reporter, to be insane.',
    'A witness who wishes to remain anonymous reported "Look, I know this sounds crazy but {{spooky_possession}}." Another, also unwilling to put their name to an outright fabrication, corroborated the account with equal fervour.',
    '{{witness.name.full}} ({{witness.age}}), proprietor of a {{subject.product}} stall on Main Street, witnessed the entire affair from {{witness.pronoun.clause}} shop window. "I didn\'t see nothing and I ain\'t saying nothing," {{witness.pronoun.subjective}} declared.',
    'Several bystanders near the {{subject.building}} gave conflicting accounts of the events. One insisted {{culprit.name.formal}} acted alone; another swore there were at least {{number}} accomplices waiting in the alley.',
    'Old {{witness.name.first}}, the town\'s most reliable gossip, claims to have seen everything from {{witness.pronoun.clause}} porch. Our correspondent notes that {{witness.name.formal}} also claimed to have seen a {{random.animal}} piloting a steamwagon last month.',
  ],
  main_fragments_officer: [
    '{{officer.rank}} {{officer.name.full}} stated "{{crime.article}} is no joke in {{state}}. We will find fugitives like {{culprit.name.formal}}." The {{officer.rank}} declined further comment but promised a full report within the week.',
    '{{officer.name.full}} ({{officer.age}}) expects all involved to receive {{sentence.text}} in {{state}}. The governor was unavailable for comment but one aide told our reporter to "{{reporter_insult}}."',
    '{{officer.name.full}} dismissed rumours of corruption in the {{city}} police department as "counterfeit news." {{officer.pronoun.subjective}} would not address allegations that {{culprit.name.formal}} is related to a local {{subject.product}} magnate.',
    'The arresting {{officer.rank}} said {{culprit.name.formal}} would face the full weight of territorial law. "If you are a fugitive from the law like {{culprit.name.formal}} here, let me tell you — the {{officer.rank}}\'s of {{state}} are vigilant."',
    '{{officer.rank}} {{officer.name.last}} confirmed an inquest will be held within the week. {{officer.pronoun.subjective}} expects the proceedings to draw considerable interest from neighbouring counties.',
    '{{officer.name.full}} ({{officer.age}}) gave a short response via telegram saying {{officer.pronoun.subjective}} expects all {{number}} accomplices to receive the maximum penalty: {{sentence.text}}. No further statement is anticipated.',
    'The arresting officer {{officer.name.full}} ({{officer.age}}) told our correspondent that {{culprit.name.formal}} offered no resistance once cornered. "I think this is just a case of {{culprit.pronoun.child}}\'s being {{culprit.pronoun.child}}\'s," {{officer.pronoun.subjective}} added.',
    '{{officer.rank}} {{officer.name.full}} arrived in {{city}} this week specifically to investigate the affair. "We\'ve had enough of this {{crime.headline}} nonsense in {{state}}," {{officer.pronoun.subjective}} declared at a town meeting.',
  ],
  main_fragments_plea: [
    'The good people of {{city}} must stand together against this {{crime.headline}} epidemic sweeping {{state}}. We need to wake up to the danger before it is too late for our fine community.',
    'What has become of common decency? We need to return to family values before {{city}} is lost entirely. If it\'s not {{crime.article}} then it\'s another heinous act — something must change.',
    'Let us add {{city}} to our collective prayers and support the charities aiding victims in {{state}}. I for one will be donating to all the various charities that spring from this tragic event.',
    'This editor urges every citizen of {{state}} to remain vigilant and report suspicious activity at once. Together we can restore peace to {{city}} and hold the guilty to account.',
  ],
  main_fragments_weather_start: [
    'Residents of {{city}}, {{state}} awoke to {{weather.condition}} this morning, with temperatures hovering near {{weather.temperature}}. Main Street was nearly deserted as sensible folk stayed indoors.',
    'The {{weather.condition}} that swept through {{city}} last night has left locals scratching their heads. Old-timers say they haven\'t seen the like since \'{{weather.year}}.',
    'A fierce {{weather.condition}} struck {{city}}, {{state}} yesterday, damaging {{weather.damage}} and frightening {{weather.livestock}}. The telegraph lines are down and news travels slowly.',
    'Strange skies over {{city}} have set tongues wagging throughout {{state}}. {{weather.condition}} rolled in without warning, catching ranchers and merchants alike off guard.',
  ],
  main_fragments_weather_middle: [
    'The storm damaged {{weather.damage}} before moving on toward the eastern territories. {{weather.livestock}} were spooked but none reported lost, according to the livery stable.',
    'Old Jim at the general store says his corns are aching — a sure sign of more {{weather.condition}} to come. Several families have already moved valuables to higher ground as a precaution.',
    'Merchants on Main Street spent the morning clearing debris and assessing damage. The {{subject.building}} sustained minor harm but remains open for business.',
    'Farmers report {{weather.livestock}} behaving strangely throughout the night. One rancher described the animals as "acting like they seen a ghost, or worse."',
  ],
  main_fragments_weather_end: [
    '{{weather.forecast}} Locals are advised to secure loose property and keep lamps trimmed in case conditions worsen overnight.',
    'Expect more of the same through the week, with {{weather.condition}} returning by Thursday. The forecast calls for clearing skies and warmer temperatures by midweek.',
    'Look for {{weather.condition}} to persist through the weekend before a cold front moves in from the territories. Until then, stay indoors if you value your hat.',
    'The outlook for {{city}}: {{weather.condition}} likely to continue, with temperatures remaining near {{weather.temperature}}. Old-timers advise keeping a weather eye on the horizon.',
  ],
  main_fragments_market_start: [
    'Trade was brisk this week in {{city}}, {{state}}, with {{subject.product}} leading the market at {{price}} per unit. The loading dock at the general store was busy from dawn until dusk.',
    'The {{city}} market saw mixed results this week. {{subject.product}} climbed to {{price}}, while {{random.product}} held steady despite rumours of a shortage.',
    'Reports from {{state}} indicate a sharp rise in {{subject.product}} prices, now fetching {{price}} in {{city}}. New settlers passing through have driven demand to unprecedented levels.',
    'Merchants in {{city}} report the busiest trading week in recent memory. {{subject.product}} and {{random.product}} both changed hands at prices not seen since before the war.',
  ],
  main_fragments_market_middle: [
    'Local merchant {{merchant.name.full}} reports "I can\'t keep {{subject.product}}s on the shelf — they\'re going faster than hotcakes at a church social!" {{merchant.pronoun.subjective}} attributes the boom to new settlers arriving daily.',
    '{{merchant.name.full}}, proprietor of the general store, said "It\'s the boom times, sure enough. I\'ve been selling {{subject.product}}s since before the war and I\'ve never seen the like."',
    '{{merchant.name.formal}} attributes the spike to "all them new settlers coming through, each one wanting a {{subject.product}} of their own." Competition among vendors on Main Street has grown fierce.',
    'Several merchants complained of supply delays from the eastern rail lines. {{merchant.name.full}} noted that {{random.product}} shipments have been particularly unreliable of late.',
  ],
  main_fragments_market_end: [
    'Prices for {{subject.product}} are expected to hold through the month, with {{random.product}} trending upward. The outlook for next week remains cautiously optimistic among {{city}} traders.',
    'The outlook for next week: {{subject.product}} steady, {{random.product}} rising, and {{random.product}} in short supply. Cattle remain firm at ${{price_number}} per head.',
    'Analysts expect the {{city}} market to remain active as long as settlers keep arriving in {{state}}. {{merchant.name.full}} plans to expand {{merchant.pronoun.clause}} inventory accordingly.',
    'Merchants advise buyers to act quickly if they require {{subject.product}} at current prices. Several traders predict a correction once the settler rush subsides.',
  ],
  main_fragments_social_start: [
    'The fine folk of {{city}}, {{state}} turned out in force this past Saturday for {{event}}. {{host.name.full}} hosted the affair at {{host.pronoun.clause}} {{subject.building}} on Main Street.',
    'Society news from {{city}}, {{state}}: {{event}} was the highlight of the week, organised by {{host.name.full}} at the {{subject.building}}. Invitations were much sought after.',
    'Word reaches us from {{city}} that {{event}} drew a record crowd. {{host.name.formal}} presided over the festivities with customary grace and a generous supply of refreshments.',
    'The social calendar in {{city}} reached its peak this week with {{event}}. Every family of standing in {{state}} was represented, or so the host claimed.',
  ],
  main_fragments_social_middle: [
    'The evening featured music, dancing, and a fine spread of victuals. "We don\'t get many excuses to put on our Sunday best out here," said one rancher\'s wife.',
    '"It was the social event of the season," declared one attendee. "Everyone who is anyone was there — and a few who weren\'t, if you catch my meaning."',
    'Attendees praised the music, dancing, and victuals on offer. Several guests remarked that {{host.name.full}} had outdone every previous affair in {{city}}.',
    'The {{subject.building}} was decorated with ribbons and lanterns for the occasion. Children ran between the tables while their elders discussed ranch prices and territorial politics.',
  ],
  main_fragments_social_end: [
    '{{host.name.full}} declared the affair "the social event of the season" in {{state}}. {{host.pronoun.subjective}} has already begun planning next year\'s celebration.',
    '{{host.name.formal}}, who presided over the festivities, remarked "It does the heart good to see the community come together like this — we need more of it and less of the other."',
    'Society columnists agree that {{event}} has set a new standard for gatherings in {{city}}. We look forward to reporting on whatever {{host.name.full}} arranges next.',
    'As the last guests departed into the {{state}} night, {{host.name.full}} was heard to say the evening exceeded every expectation. A fine time was had by all who attended.',
  ],
  main_fragments_notice_start: [
    'NOTICE is hereby given that {{notice_type}}. All interested parties should take heed of the following provisions.',
    'By order of the Sheriff\'s Office in {{city}}, {{state}}: {{notice_type}}. This notice is effective immediately upon posting.',
    'PUBLIC NOTICE — {{notice_type}}. The following information is provided for the benefit of all citizens of {{city}} and the surrounding territory.',
    'Citizens of {{city}} are advised that {{notice_type}}. The matter requires prompt attention from all affected parties.',
  ],
  main_fragments_notice_middle: [
    'All interested parties should apply to the {{subject.building}} in {{city}}, {{state}} before {{next_date}}. Failure to respond by the deadline may result in penalties.',
    'Enquiries may be directed to the {{subject.building}} in {{city}}, {{state}} during regular business hours. Written applications are preferred and should include full particulars.',
    'Failure to comply may result in {{sentence.text}}. The Sheriff\'s Office will enforce this notice without further warning after the deadline passes.',
    'Additional details may be obtained at the {{subject.building}} on Main Street. Clerks are available to assist with paperwork and answer questions regarding compliance.',
  ],
  main_fragments_notice_end: [
    '{{notice_sign_off}} All citizens of {{city}} are expected to comply without delay.',
    '{{notice_sign_off}} Posted this day in {{city}}, {{state}}, by authority of the territorial government.',
    '{{notice_sign_off}} Let it be known throughout {{state}} that violations will not be tolerated.',
    '{{notice_sign_off}} Distribute this notice to any neighbour who may not have seen it posted.',
  ],
};

const FRAGMENT_STRUCTURE_BY_TYPE = {
  crime: {
    start: 'main_fragments_starts',
    middle: ['main_fragments_witness', 'main_fragments_officer'],
    end: 'main_fragments_plea',
  },
  weather: {
    start: 'main_fragments_weather_start',
    middle: ['main_fragments_weather_middle'],
    end: 'main_fragments_weather_end',
  },
  market: {
    start: 'main_fragments_market_start',
    middle: ['main_fragments_market_middle'],
    end: 'main_fragments_market_end',
  },
  social: {
    start: 'main_fragments_social_start',
    middle: ['main_fragments_social_middle'],
    end: 'main_fragments_social_end',
  },
  notice: {
    start: 'main_fragments_notice_start',
    middle: ['main_fragments_notice_middle'],
    end: 'main_fragments_notice_end',
  },
};

function pick_main_fragment_pool(structure, index, total) {
  if (total <= 1) return structure.start;
  if (index === 0) return structure.start;
  if (index === total - 1) return structure.end;
  const middle = structure.middle;
  return middle[(index - 1) % middle.length];
}

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

// Pronoun keys: subjective (he/she), objective (him/her), clause (his/her possessive)
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
  const adj = pick_vl(rng, 'paper_name_adjectives');
  const noun = pick_vl(rng, 'paper_name_nouns');
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
    char.rank = pick_vl(rng, 'officer_ranks');
    char.name.full = `${char.rank} ${first} ${last}`;
    char.name.formal = `${char.rank} ${last}`;
  } else if (role === 'witness') {
    char.profession = pick_vl(rng, 'professions');
  } else if (role === 'culprit') {
    char.profession = pick_vl(rng, 'professions');
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
    const numbers = get_effective_value_list('numbers');
    if (parts[1] === 'sub_1') {
      const idx = numbers.indexOf(ctx.number);
      if (idx >= 0 && idx < DATA.number_lookup.length) {
        return String(DATA.number_lookup[idx] - 1);
      }
      return '';
    }
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
  if (root === 'cunning') return pick_vl(rng, 'cunning');
  if (root === 'captures') return pick_vl(rng, 'captures');
  if (root === 'captured') return pick_vl(rng, 'captured');
  if (root === 'dastardly') return pick_vl(rng, 'dastardly');
  if (root === 'reporter_insult') return pick_vl(rng, 'reporter_insults');
  if (root === 'plea_for_order') return pick_vl(rng, 'pleas_for_order');
  if (root === 'spooky_possession') return pick_vl(rng, 'spooky_possessions');
  if (root === 'age') return String(Math.floor(rng() * 68) + 12);

  // --- Random word picks ---
  if (root === 'random') {
    const sub = parts[1];
    if (sub === 'animal') return pick_vl(rng, 'animals');
    if (sub === 'colour') return pick_vl(rng, 'colours');
    if (sub === 'crime') {
      const c = pick(rng, get_effective_crime_list());
      return resolve_nested(c.article, ctx, rng);
    }
    if (sub === 'building') {
      const b = pick_vl(rng, 'buildings');
      return resolve_nested(b, ctx, rng);
    }
    if (sub === 'number') return pick_vl(rng, 'numbers');
    if (sub === 'product') return pick_vl(rng, 'products');
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

  // --- Continued phrase tokens (flavour brief side articles) ---
  if (root === 'continued_page') return ctx.continued_page != null ? String(ctx.continued_page) : '';
  if (root === 'continued_column') return ctx.continued_column ?? '';

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
  const territories = list_all_territories();
  const territory = pick(rng, territories);
  const states = get_effective_states(territory);
  const state = pick(rng, states.length ? states : ['Unknown']);
  const city = pick(rng, get_effective_cities(state));

  const subject_animal = pick_vl(rng, 'animals');
  const building = pick_vl(rng, 'buildings');
  const contraband = pick_vl(rng, 'contraband');
  const fraud = pick_vl(rng, 'fraud');
  const product = pick_vl(rng, 'products');

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
      condition: pick_vl(rng, 'weather_conditions'),
      temperature: pick_vl(rng, 'weather_temperatures'),
      forecast: pick_vl(rng, 'weather_forecasts'),
      year: pick_vl(rng, 'weather_years'),
      damage: pick_vl(rng, 'weather_damages'),
      livestock: pick_vl(rng, 'weather_livestock'),
    };
    return ctx;
  }

  if (context_type === 'market') {
    ctx.char.merchant = await make_character('merchant', rng);
    ctx.price = pick_vl(rng, 'market_price_values');
    ctx.price_number = pick_vl(rng, 'price_numbers');
    return ctx;
  }

  if (context_type === 'social') {
    ctx.char.host = await make_character('host', rng);
    ctx.event = pick_vl(rng, 'social_events');
    return ctx;
  }

  if (context_type === 'notice') {
    ctx.crime = pick(rng, get_effective_crime_list());
    ctx.crime_count = pick_vl(rng, 'numbers');
    ctx.number = pick_vl(rng, 'numbers');
    const sentence = pick_vl(rng, 'sentences');
    const sentence_number = pick_vl(rng, 'numbers');
    ctx.sentence = apply_templates(sentence, { number: sentence_number, sentence_number, sentence }, rng);
    ctx.sentence_number = sentence_number;
    ctx.notice_type = apply_templates(pick_vl(rng, 'notice_types'), { ...ctx, reward: pick_vl(rng, 'rewards') }, rng);
    ctx.reward = pick_vl(rng, 'rewards');
    ctx.notice_sign_off = apply_templates(pick_vl(rng, 'notice_sign_offs'), { city: ctx.city }, rng);
    return ctx;
  }

  const crime = pick(rng, get_effective_crime_list());
  const number = pick_vl(rng, 'numbers');
  const sentence = pick_vl(rng, 'sentences');
  const sentence_number = pick_vl(rng, 'numbers');

  const culprit = await make_character('culprit', rng);
  const officer = await make_character('officer', rng);
  const witness = await make_character('witness', rng);

  const resolved_sentence = apply_templates(sentence, { number: sentence_number, sentence_number, sentence }, rng);

  ctx.crime = crime;
  ctx.crime_count = pick_vl(rng, 'numbers');
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
 * If `scope` is 'main', picks from full-length lead blueprints. If 'brief',
 * picks only flavour side-column stubs (is_flavour) — single tease paragraph
 * with a 'continued on page X' line, no editor byline.
 * @param {Object} rng
 * @param {string} [scope] — 'main' (default) or 'brief'
 * @returns {Object} blueprint object (with _id added)
 */
function pick_blueprint(rng, scope = 'main', options = {}) {
  const all = { ...ARTICLE_BLUEPRINTS, ..._blueprint_registry };

  if (scope === 'brief') {
    const entries = Object.entries(all).filter(([, bp]) => bp.is_flavour);
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
 * side articles, pass blueprint_scope='brief' for flavour stubs (single
 * tease + continued line). For the main article, pass 'main' (or omit).
 * Specific brief types (e.g. crime_brief) require blueprint_id.
 *
 * @param {Object} [options]
 * @param {string} [options.seed]           — seed for deterministic output
 * @param {string} [options.blueprint_id]   — specific blueprint to use
 * @param {string} [options.blueprint_scope] — 'main' (default) or 'brief' (flavour stub)
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
  const headline_pool = get_effective_pool(blueprint.headline_pool) || get_effective_pool('headlines');
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
    const pool = get_effective_pool(slot.pool);
    if (!pool || pool.length === 0) continue;
    const text = apply_templates(pick(rng, pool), ctx, rng);
    paragraphs.push(text);
    used_slots.add(i);
  }

  const is_flavour = !!blueprint.is_flavour;
  const min_paragraphs = 1;
  if (paragraphs.length < min_paragraphs) {
    const skipped = blueprint.paragraphs
      .map((slot, i) => ({ slot, i }))
      .filter(({ i }) => !used_slots.has(i));
    for (const { slot, i } of skipped) {
      if (paragraphs.length >= min_paragraphs) break;
      const pool = get_effective_pool(slot.pool);
      if (!pool || pool.length === 0) continue;
      paragraphs.push(apply_templates(pick(rng, pool), ctx, rng));
      used_slots.add(i);
    }
    // Still short? Keep drawing from the first required pool
    if (paragraphs.length < min_paragraphs) {
      const first_pool = get_effective_pool(blueprint.paragraphs[0]?.pool);
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
      const pool = get_effective_pool(first_slot.pool);
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
    const phrase_template = pick(rng, get_effective_pool('continued_phrases'));
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
// Main article fragment generation (slot-grid layout)
// ---------------------------------------------------------------------------

/**
 * Generate short main-article fragments for slot-grid layout.
 * @param {number} count
 * @param {Object} [options]
 * @returns {Promise<Object>}
 */
async function generate_main_fragments(count, options = {}) {
  const rng = create_rng(options.seed);
  let blueprint = options.blueprint_id ? get_blueprint(options.blueprint_id) : null;
  if (!blueprint) {
    blueprint = pick_blueprint(rng, 'main', options);
  }
  if (!blueprint) blueprint = ARTICLE_BLUEPRINTS.crime_full;

  const ctx = await build_context(rng, blueprint.context_type, options.extra_ctx || {});

  const headline_pool = get_effective_pool(blueprint.headline_pool) || get_effective_pool('headlines');
  let headline = apply_templates(pick(rng, headline_pool), ctx, rng);
  headline = capitalize(headline);

  const structure = FRAGMENT_STRUCTURE_BY_TYPE[blueprint.context_type] || FRAGMENT_STRUCTURE_BY_TYPE.crime;
  const fragments = [];
  for (let i = 0; i < count; i++) {
    const pool_key = pick_main_fragment_pool(structure, i, count);
    const pool = get_effective_pool(pool_key);
    const text = pool?.length ? apply_templates(pick(rng, pool), ctx, rng) : '';
    fragments.push({ text, drop_cap: i === 0 });
  }

  const editor_name = _generate_random_name
    ? await _generate_random_name('american', 'male')
    : 'A. Editor';

  return {
    headline,
    fragments,
    editor: editor_name,
    city: ctx.city,
    state: ctx.state,
    type: blueprint.context_type,
  };
}

function pick_advertisement(rng, filters) {
  return select_advertisement(rng, filters, _content_registry.advertisement);
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

  const paper_name = options.paper_name || 'The Tombstone Epitaph';
  const date = options.date || random_date(rng);
  const next_date = random_next_date(rng, date);
  const columns = options.columns || 2;
  const side_count = options.side_articles ?? 4;
  const ad_count = options.advertisements ?? 2;
  const price = options.price || pick_vl(rng, 'paper_prices');
  const volume = Math.floor(rng() * 9) + 1;
  const issue = Math.floor(rng() * 52) + 1;
  const fragment_count = Math.max(1, side_count + ad_count);
  const slots_per_column = calculate_slots_per_column(side_count, ad_count, columns);

  const editor_name = _generate_random_name
    ? await _generate_random_name('american', 'male')
    : 'A. Editor';

  const paper_ctx = { paper_name, editor_name, next_date };

  if (mode === 'scaffold') {
    const layout = build_scaffold_layout(slots_per_column, columns);
    return {
      paper_name,
      date,
      price,
      volume: roman(volume),
      issue,
      columns,
      layout,
      main_article: { headline: '', paragraphs: [], editor: editor_name },
      side_articles: Array.from({ length: side_count }, () => ({
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

  let main_article;
  let main_city = '';
  let main_state = '';
  let main_fragments;

  if (mode === 'hybrid' && (options.main_article_text || options.main_article_headline)) {
    main_fragments = split_into_fragments(options.main_article_text || '', fragment_count);
    main_article = {
      headline: options.main_article_headline || '',
      paragraphs: main_fragments.map(f => f.text).filter(Boolean),
      editor: editor_name,
    };
  } else {
    const main = await generate_main_fragments(fragment_count, {
      seed: options.seed,
      main_lead: options.main_lead,
      extra_ctx: paper_ctx,
    });
    main_fragments = main.fragments;
    main_article = {
      headline: main.headline,
      paragraphs: main.fragments.map(f => f.text),
      editor: main.editor,
    };
    main_city = main.city;
    main_state = main.state;
  }

  const side_articles = [];
  for (let i = 0; i < side_count; i++) {
    side_articles.push(await generate_article({
      seed: options.seed ? `${options.seed}-side-${i}` : undefined,
      blueprint_scope: 'brief',
      extra_ctx: paper_ctx,
    }));
  }

  const advertisements = [];
  const used_ad_ids = new Set();
  for (let i = 0; i < ad_count; i++) {
    const ad = pick_advertisement(rng, { ...options.content_filters, exclude_ids: used_ad_ids });
    if (ad) {
      used_ad_ids.add(ad.id);
      advertisements.push({ ...ad, column: i % 2 === 0 ? 'left' : 'right' });
    }
  }

  let layout = pack_column_slots({
    slots_per_column,
    side_articles,
    featured_ads: advertisements,
    main_fragments,
    center_columns: columns,
  });

  layout = fill_empty_slots(layout, pick_advertisement, rng, used_ad_ids);
  main_article.paragraphs = collect_main_paragraphs(layout);

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
    layout,
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
// Editor palette API — fragment templates for drag-and-drop layout
// ---------------------------------------------------------------------------

const STORY_TYPE_HEADLINE_POOL = {
  crime: 'headlines',
  weather: 'weather_headlines',
  market: 'market_headlines',
  social: 'social_headlines',
  notice: 'notice_headlines',
};

const MAIN_POOL_ROLE_LABELS = {
  start: 'Start',
  middle: 'Middle',
  end: 'End',
};

function _main_palette_id(story_type, role, pool_key) {
  const suffix = pool_key.replace(/^main_fragments_/, '').replace(`${story_type}_`, '');
  return `main:${story_type}:${suffix}`;
}

/**
 * Grouped palette metadata for the newspaper editor asset panel.
 * @returns {Array<{ id: string, label: string, items: Array<Object> }>}
 */
function get_fragment_palette_groups() {
  const groups = [];

  for (const [story_type, structure] of Object.entries(FRAGMENT_STRUCTURE_BY_TYPE)) {
    const items = [];
    items.push({
      id: _main_palette_id(story_type, 'start', structure.start),
      label: MAIN_POOL_ROLE_LABELS.start,
      icon: 'fa-book-open',
      pool_key: structure.start,
      story_type,
      slot_type: 'main_fragment',
      zone: 'center',
    });
    structure.middle.forEach((pool_key, i) => {
      const pool_suffix = pool_key.replace(/^main_fragments_/, '').replace(`${story_type}_`, '');
      items.push({
        id: _main_palette_id(story_type, 'middle', pool_key),
        label: structure.middle.length > 1 ? pool_suffix.replace(/_/g, ' ') : MAIN_POOL_ROLE_LABELS.middle,
        icon: 'fa-align-left',
        pool_key,
        story_type,
        slot_type: 'main_fragment',
        zone: 'center',
        middle_index: i,
      });
    });
    items.push({
      id: _main_palette_id(story_type, 'end', structure.end),
      label: MAIN_POOL_ROLE_LABELS.end,
      icon: 'fa-flag-checkered',
      pool_key: structure.end,
      story_type,
      slot_type: 'main_fragment',
      zone: 'center',
    });
    groups.push({
      id: `main_${story_type}`,
      label: story_type.charAt(0).toUpperCase() + story_type.slice(1),
      items,
    });
  }

  groups.push({
    id: 'side',
    label: 'Side',
    items: [{
      id: 'side:brief',
      label: 'Brief',
      icon: 'fa-newspaper',
      slot_type: 'side_article',
    }],
  });

  const ad_items = [];
  const registered = _content_registry.advertisement || [];
  for (const ad of [...registered, ...BUILTIN_ADS]) {
    if (ad_items.some(a => a.id === `ad:${ad.id}`)) continue;
    ad_items.push({
      id: `ad:${ad.id}`,
      label: ad.label || ad.id.replace(/^dc\./, '').replace(/_/g, ' '),
      icon: 'fa-bullhorn',
      ad_id: ad.id,
      slot_type: 'ad',
    });
  }
  groups.push({ id: 'ads', label: 'Ads', items: ad_items });

  return groups;
}

/**
 * Return or build shared story context for coherent fragment generation.
 * @param {Function} rng
 * @param {string} story_type
 * @param {Object|null} existing_ctx
 * @param {Object} [extra_ctx]
 * @returns {Promise<Object>}
 */
async function ensure_story_context(rng, story_type, existing_ctx, extra_ctx = {}) {
  if (existing_ctx?.city) {
    if (story_type === 'crime' && existing_ctx.char) return existing_ctx;
    if (story_type !== 'crime') return existing_ctx;
  }
  const ctx = await build_context(rng, story_type, extra_ctx);
  ctx._story_type = story_type;
  return ctx;
}

/**
 * Generate a headline from story context.
 * @param {Object} rng
 * @param {Object} story_context
 * @param {string} [story_type]
 * @returns {string}
 */
function generate_main_headline(rng, story_context, story_type = 'crime') {
  const pool_key = STORY_TYPE_HEADLINE_POOL[story_type] || STORY_TYPE_HEADLINE_POOL.crime;
  const headline_pool = get_effective_pool(pool_key) || get_effective_pool('headlines');
  let headline = apply_templates(pick(rng, headline_pool), story_context, rng);
  return capitalize(headline);
}

/**
 * Resolve palette item metadata by id.
 * @param {string} palette_id
 * @returns {Object|null}
 */
function get_palette_item(palette_id) {
  for (const group of get_fragment_palette_groups()) {
    const item = group.items.find(i => i.id === palette_id);
    if (item) return item;
  }
  return null;
}

/**
 * Generate slot content from a palette template id.
 * @param {string} palette_id
 * @param {Object} story_context
 * @param {Object} [options]
 * @returns {Promise<Object>}
 */
async function generate_fragment_from_palette(palette_id, story_context, options = {}) {
  const rng = create_rng(options.seed);
  const custom = options.custom_fragments || [];

  if (palette_id.startsWith('custom:')) {
    const custom_id = palette_id.slice(7);
    const frag = custom.find(c => c.id === custom_id);
    const raw = frag?.text || '';
    const text = raw.includes('{{')
      ? apply_templates(raw, story_context || {}, rng)
      : raw;
    return {
      type: 'main_fragment',
      text,
      drop_cap: !!options.drop_cap,
      palette_id,
    };
  }

  const item = get_palette_item(palette_id);
  if (!item) return { type: 'empty' };

  if (item.slot_type === 'main_fragment') {
    const pool = get_effective_pool(item.pool_key);
    const text = pool?.length ? apply_templates(pick(rng, pool), story_context, rng) : '';
    return {
      type: 'main_fragment',
      text,
      drop_cap: !!options.drop_cap,
      palette_id,
      pool_key: item.pool_key,
      story_type: item.story_type,
    };
  }

  if (item.slot_type === 'side_article') {
    const stub = await generate_article({
      seed: options.seed,
      blueprint_scope: 'brief',
      extra_ctx: {
        paper_name: options.paper_name || story_context.paper_name,
        ...story_context,
      },
    });
    const continued_pool = get_effective_pool('continued_phrases');
    const continued = apply_templates(pick(rng, continued_pool), {
      continued_page: Math.floor(rng() * 8) + 2,
      continued_column: pick(rng, ['left', 'right', 'centre']),
    }, rng);
    return {
      type: 'side_article',
      headline: stub.headline,
      paragraphs: stub.paragraphs,
      editor: stub.editor || '',
      continued,
      palette_id,
    };
  }

  if (item.slot_type === 'ad') {
    const registered = _content_registry.advertisement || [];
    const all_ads = [...registered, ...BUILTIN_ADS];
    const def = all_ads.find(a => a.id === item.ad_id);
    if (!def) return { type: 'empty' };
    const content = def.render({ rng });
    return {
      type: 'ad',
      id: def.id,
      title: content.title || '',
      lines: content.lines || [],
      note: content.note || '',
      palette_id,
    };
  }

  return { type: 'empty' };
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

register_pool_sources({
  get_default_pool: (key) => DATA[key] || [],
  fragment_structure: FRAGMENT_STRUCTURE_BY_TYPE,
});

register_value_list_sources({
  get_default_data: () => DATA,
});

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
  get_fragment_palette_groups,
  ensure_story_context,
  generate_main_headline,
  generate_fragment_from_palette,
  get_palette_item,
  init,
  get_effective_pool,
};