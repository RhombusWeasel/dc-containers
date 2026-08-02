# dc-containers

Containers, loot, and readable documents for the Deadlands Classic system. This module gives you two things: **treasure containers** that players can loot when they walk into a region, and a full **document system** — books, newspapers, wanted posters, letters, journals, ledgers, maps, and more — that players can find, carry, and read in an in-game reader.

Set up a treasure chest in a dungeon region, put a wanted poster on a saloon wall, or generate a fully procedural newspaper for your players to find on the barber's chair. Documents are real inventory items — they have weight, cost, and rarity, and you can attach boons to them so they trigger effects when read.

---

## What Can This Module Do?

Here are some things you can set up:

| Scenario | How |
|----------|-----|
| **A treasure chest** in a dungeon room that players loot when they enter | Add an `open_container` boon to a region behavior — players walk in, the container sheet opens, they take what's inside |
| **A locked chest** that requires a roll to open | Chain a `roll_gate` boon before the `open_container` boon — fail the roll and a `pause_game` boon fires instead |
| **A one-time loot drop** that disappears once a single player takes it | Set the container's persistence to **Once** — the region behavior disables after the first looter |
| **A shared stash** each player can loot once individually | Set persistence to **Once per Player** — each player gets their own shot at the contents |
| **A posse reward cache** that each posse member can loot once | Set persistence to **Once per Posse** — tracks per-posse looting |
| **An NPC's death loot** showing their actual gear | Attach the boon to an NPC and enable **Loot Mode** — when the NPC dies, their inventory is shown as loot |
| **A readable book** embedded from the Internet Archive | Create a **Book** document, paste an archive.org details URL — the full reader opens in-game |
| **A wanted poster** with a portrait, crime, and reward | Create a **Wanted Poster** document — use the editor to fill in the details, or click Generate to randomize one |
| **A procedurally generated newspaper** with articles, side columns, and ads | Create a **Newspaper** document, click **Generate Newspaper** — pick random, hybrid, or scaffold mode |
| **A handwritten letter** from an NPC to a player | Create a **Letter** document — use the letter editor for sender, recipient, salutation, body, and stationery style |
| **A trail journal** with dated entries that tell a story | Create a **Journal** document — add entries with dates, titles, and body text |
| **A merchant's ledger** with debits, credits, and running balances | Create a **Ledger** document — use the ledger editor to add rows |
| **An annotated map** with markers placed on an image | Create a **Map** document — use the map editor to click and place labelled markers on your map image |
| **A public notice or proclamation** pinned to a town bulletin board | Create an **Other** document — choose notice, proclamation, or plain style |
| **A web page** embedded in an iframe for reference | Create a **Web Page** document — paste a URL |
| **A cursed book** that deals wind damage when read | Create any document, add a boon with the `on_use` trigger — boons fire when the player reads it |
| **A bounty check** wanted poster that grants bounty when found | Attach a boon to a wanted poster document that triggers when read |

---

## Part 1: Containers & Loot

### Quick Start: Set Up a Treasure Chest

This takes about 2 minutes.

#### Step 1: Draw a Region

Draw a region on your scene where the treasure chest is located (Foundry → scene controls → Regions → Create Region).

#### Step 2: Add the Container Boon

1. Add a **dcBoonRegion** behavior to the region, set the event to **Token Enter**.
2. Add an **Open Container** boon to the behavior's boon list.
3. Configure the boon:
   - **Container Name** — what the sheet title says (e.g. "Old Wooden Chest")
   - **Persistence** — how many times it can be looted (see below)
   - **Contents** — click **Edit Contents…** to open the contents editor

#### Step 3: Add Items to the Container

Click **Edit Contents…** on the boon to open the container contents editor. You'll see the full gear catalog — ammo, armour, weapons, goods, and documents — organized by category. Use the +/− buttons to set the quantity of each item. The summary at the top shows how many items you've added.

#### Step 4: Players Loot

When a player walks their token into the region, the container sheet opens automatically. They see the container name, a list of items with quantities, and a **Take** button next to each one. Clicking Take sends a request to the GM, who authoritatively reduces the quantity on the boon and adds the item to the player's inventory. All open sheets update in real time — if another player takes the last of an item, it disappears for everyone.

### Container Persistence

The persistence setting controls how many times a container can be looted and by whom:

| Persistence | Behaviour |
|------------|-----------|
| **Once** | The container can only be looted once, by anyone. After the first player takes anything, the region behavior is disabled — no one else can open it. |
| **Once per Player** (default) | Each player gets their own chance to loot. When a player opens the container, they're marked as having looted it — they can't open it again. Other players still can. |
| **Once per Posse** | Each posse member can loot once. Looting is tracked per-posse — all members of a posse share the same looting state. |
| **None / Always** | The container can be opened and looted unlimited times. Items are still consumed from the shared pool — when they're gone, they're gone. |

### Loot Mode (NPC Death Drops)

If you attach an `open_container` boon to an NPC (in their `char.boons` array) and enable **Loot Mode**, the boon will show that NPC's actual gear when it fires — typically on NPC death via the `on_death` trigger. Instead of reading from the boon's configured `contents`, the container sheet reads from the NPC's live inventory. This is great for boss fights where players loot the fallen enemy's actual weapons, ammo, and cash.

### Locked Containers

You can gate access to a container by chaining boons. The typical pattern:

1. Add a **roll_gate** boon before the **open_container** boon in the same behavior.
2. Configure the roll gate with the required skill and target number (e.g. Lockpicking TN 5).
3. Set the roll gate's **fail boons** to include a **pause_game** boon (or any other consequence).

When a player enters the region, the roll gate fires first. If they succeed, the container opens. If they fail, the fail boons fire instead — the game pauses, or whatever consequence you've set up.

### How Looting Works Under the Hood

All loot operations are **GM-authoritative**. When a player clicks Take:

1. The player's client sends a `take_item` socket event to the GM with the container ID, item path, and player UUID.
2. The GM finds the container boon (on a region behavior or NPC), reduces the item quantity, and saves the boon.
3. The GM adds the item to the player's actor inventory.
4. The GM marks the player as having looted (for persistence tracking).
5. The GM broadcasts a `container_update` event to all clients with the new contents.
6. All open container sheets re-render with the updated quantities.

This means the GM client must be running for looting to work. If the GM reloads mid-session, open container sheets will re-sync from the GM's authoritative state.

---

## Part 2: The Document System

Documents are a gear type — they live in a character's inventory under `char.gear.documents`, just like weapons, ammo, and goods. Each document has a **category** that determines how it's rendered and edited. Players **use** a document to open it in the in-game reader; GMs create and edit documents from the **Documents** tab on the Marshal sheet.

### Document Categories

| Category | What It Is | How It Renders |
|----------|-----------|----------------|
| **Book** | A book embedded from the Internet Archive | Full IA book reader in an iframe — paste an archive.org details URL |
| **Web Page** | Any web page embedded in an iframe | Paste a URL — the page loads inside the reader |
| **Newspaper** | A full newspaper layout with articles, ads, and columns | Styled newspaper page with masthead, columns, side articles, and advertisements |
| **Wanted Poster** | A wanted poster with portrait, crime, reward | Styled poster with name, alias, crime, description, reward, and contact |
| **Letter** | A letter or telegram | Styled by stationery type — formal, handwritten, or telegram |
| **Journal** | A journal or diary with dated entries | Title, author, and dated entries with titles and body text |
| **Ledger** | An accounting ledger with debits and credits | Table with date, description, debit, credit, and balance columns |
| **Map** | An image map with labelled markers | Your map image with clickable markers placed at coordinates |
| **Other** | A general-purpose document (notice, proclamation, etc.) | Styled by type — plain, public notice, or proclamation |

### Creating Documents — The GM Documents Tab

Open the Marshal sheet and go to the **Documents** tab. Here you'll see all documents in the system gear catalog. You can add new ones, edit existing ones, and drag them onto NPC or character sheets to give them to actors.

When you create or edit a document, you pick a **Category** from the dropdown. The editor adapts to the category — a newspaper gets a full layout editor, a wanted poster gets portrait and crime fields, a letter gets sender/recipient/salutation fields, and so on. Each category has a dedicated **side editor** that opens beside the standard text content field.

### Document Templates

The Documents tab includes a **template gallery** — a row of draggable cards with pre-filled, evocative content for each category. Just drag a card onto the document list to create a new document from that template. Templates include:

- **Wanted Posters** — Dead or Alive, Murder Suspect, Cattle Rustler, Train Robber
- **Letters** — Formal Business, Telegram, Personal, Threat, Love Letter
- **Journals** — Trail Journal, Doctor's Notes, Lawman's Log, Missionary's Diary
- **Ledgers** — General Store, Cattle Ranch, Bank Account, Saloon Tab
- **Maps** — Trail Map, Territory Map, Mine Map, Town Plat
- **Other** — Wanted Notice, Town Proclamation, Obituary, Reward Poster
- **Books** — Blank book (add an archive.org URL)
- **Web Pages** — Deadlands Wiki, Pinnacle Entertainment Group
- **Newspaper** — The Tombstone Epitaph (blank, ready for the generator)

Each template is pre-filled with period-appropriate content that you can use as-is or customize.

### Boons on Documents

Documents are gear items, which means you can attach **boons** to them — just like any other item. A boon with the `on_use` trigger fires when a player reads the document (uses it from their inventory). This lets you create:

- An ancient tome that requires a **Cognition** roll to decipher (roll_gate boon)
- A cursed journal that deals **wind damage** when read
- A wanted poster with a **bounty check** that grants bounty to the reader
- A letter that triggers a **quest flag** when read

The reader opens and the boon fires at the same time — players see the document content and the boon effect happens simultaneously.

### Reading Documents — The Player Experience

When a player **uses** a document from their inventory (clicking the use button on their character sheet), the document reader opens. What they see depends on the category:

- **Books** — the Internet Archive reader loads the full book in an embedded iframe. Players can flip pages, search, and read the actual book.
- **Web Pages** — the URL loads in an embedded iframe.
- **Newspapers** — a styled newspaper page with masthead, columns, articles, and ads.
- **Wanted Posters** — a styled poster with the outlaw's details, portrait, and reward.
- **Letters** — a letter laid out on the chosen stationery style (formal, handwritten, or telegram).
- **Journals** — dated entries with titles and body text.
- **Ledgers** — a table of transactions with debits, credits, and balances.
- **Maps** — the map image with markers placed at their configured positions.
- **Other** — styled text (plain, notice, or proclamation).

The reader is a separate window — players can keep it open while interacting with the scene.

---

## Newspapers — The Procedural Generator

The newspaper is the most powerful document category. Instead of writing every article by hand, you can **generate** a full newspaper layout with procedurally created content — headlines, crime reports, weather columns, market reports, social columns, public notices, side articles, and advertisements.

### Generating a Newspaper

Open a newspaper document in the GM editor and click **Generate Newspaper** (the newspaper icon next to the Text Content field). You'll see a dialog with three modes:

| Mode | What It Does |
|------|-------------|
| **Fully Random** | Generates everything from scratch — main article, side articles, and ads — using the built-in content pools. Pick a seed for reproducible output. |
| **Hybrid** | You write the main article headline and body text; the generator fills in the side articles, ads, and layout around it. Great for when you have a specific plot article but want the rest filled in. |
| **Scaffold** | Creates a blank layout grid with empty slots — you fill everything in manually using the drag-and-drop editor. |

You can configure:
- **Newspaper Name** — the masthead (default: The Tombstone Epitaph)
- **Date** — shown under the masthead (random if omitted)
- **Columns** — 2 or 3 columns for the main article area
- **Side Articles** — how many flavour briefs to generate (default 4)
- **Advertisements** — how many ads (0, 1, or 2; default 2)
- **Main Story** — crime report or any topic (for the main article's story type)
- **Seed** — for deterministic, reproducible output (same seed = same newspaper)

### The Newspaper Editor

After generating (or starting from a scaffold), you can fine-tune the layout in the **Newspaper Editor** — a full drag-and-drop layout tool:

- **Fragment Palette** — drag story fragments, side articles, and ads onto the layout grid. Fragments are organized by story type (Crime, Weather, Market, Social, Notice) and role (Start, Middle, End).
- **Custom Fragments** — write your own template text using `{{tokens}}` (e.g. `{{culprit.name.full}}` or `{{city}}`). When you drop a custom fragment, tokens are filled from the shared story context.
- **Slot Detail Panel** — click any slot to edit its content, regenerate it, or clear it.
- **Story Context** — the first main-story drop establishes shared characters, locations, and crime details. All subsequent fragments draw from the same context for a coherent narrative.
- **Reset Story** — clears the shared context so the next drop starts fresh.

### Fragment Pools and Value Lists

Behind the generator is a large set of template pools — headline templates, article openers, witness quotes, officer statements, weather reports, market prices, social events, and more. As the GM, you can customize these:

- **Fragment Pool Editor** — add, edit, or remove template strings from any pool. Changes apply to all newspaper generation in this world. Write templates with `{{tokens}}` that get filled at generation time.
- **Value List Editor** — edit the word lists that feed the templates — states, cities, animals, buildings, crime types, weather conditions, professions, officer ranks, and dozens more. Add your own campaign-specific locations and terms.

This means you can tailor the newspaper generator to your campaign — add your players' town, your NPC names, your custom crimes, and the generator will weave them into procedurally generated articles.

### Article Blueprints

Articles are built from **blueprints** — data-driven paragraph composition templates. Each blueprint defines a headline pool, a context type (crime, weather, market, social, notice), and ordered paragraph slots with required or chance probabilities. This produces variable-length articles — a crime report might have 3 paragraphs, a weather brief might have 1. Main articles pick from all blueprints (weighted); side articles pick from `_brief` variants for shorter content.

Modules can register their own blueprints and content via the API (see below).

---

## Module API

For module developers and the [dc-agent-bridge](../dc-agent-bridge/README.md) tool pack.

### Container API

```js
const api = game.modules.get('dc-containers').api;

// Container engine
api.container.open_sheet(container_data, container_id, actor);  // Open the container sheet
api.container.build_display_items(contents);                    // Convert boon contents → display items
api.container.has_player_looted(container_id, player_uuid);     // Check looting state
api.container.handle_socket(data);                              // Socket event handler
```

### Document API

```js
const doc = game.modules.get('dc-containers').api.document;

// Open a document in the reader
await doc.open(item, actor);

// Create a new document from a template
const item = doc.create_template('newspaper', { label: 'My Paper' });

// Render document HTML (for embedding in sheets)
await doc.render_document_html(item);
await doc.render_newspaper_html(item);
await doc.render_wanted_poster_html(item);
await doc.render_letter_html(item);
await doc.render_journal_html(item);
await doc.render_ledger_html(item);
await doc.render_map_html(item);
await doc.render_other_html(item);

// Procedural newspaper generation
const paper = await doc.generate_newspaper({
  mode: 'random',           // 'random' | 'hybrid' | 'scaffold'
  paper_name: 'The Tombstone Epitaph',
  date: 'October 15, 1881',
  columns: 2,                // 2 or 3
  side_articles: 4,
  advertisements: 2,
  main_lead: 'crime',        // 'crime' or 'any'
  seed: 'my-session-1',      // deterministic output
});
const article = await doc.generate_article({ seed: 'xyz', blueprint_scope: 'brief' });

// Procedural wanted poster / letter generation
const poster_data = await doc.generate_wanted_poster();
const letter_data = await doc.generate_letter();

// Register custom newspaper content (articles, ads, sidebars, colophons)
doc.register_newspaper_content({
  type: 'advertisement',
  id: 'my-ad',
  weight: 10,
  label: 'My Custom Ad',
  source: 'my-module',
  render: (ctx) => ({ title: '...', lines: [...], note: '...' }),
});
doc.list_newspaper_content('advertisement');

// Register custom article blueprints
doc.register_article_blueprint('my_blueprint', {
  label: 'My Story Type',
  headline_pool: 'my_headlines',
  context_type: 'crime',
  weight: 10,
  paragraphs: [{ pool: 'my_starts', required: true }, { pool: 'my_middles', chance: 0.6 }],
});
doc.list_blueprints();

// Fragment pool and value list editors (GM-only popout dialogs)
doc.show_fragment_pool_editor();
doc.show_value_list_editor();

// Category-specific editors (open as popout dialogs)
doc.open_wanted_poster_editor();
doc.open_letter_editor();
doc.open_journal_editor();
doc.open_ledger_editor();
doc.open_map_editor();
doc.open_book_editor();
doc.open_web_page_editor();
doc.open_other_editor();

// Template gallery groups
doc.get_template_groups();
```

### Boon Registration

The module registers the `open_container` boon type with the system's boon manager:

```js
game.dc.boon_manager.register_boon_type('open_container', open_container_boon);
game.dc.register_boon_template('open_container', { /* template fields */ });
```

The boon fires when a player token enters a region with a `dcBoonRegion` behavior containing the boon, or when an NPC with the boon dies (via `on_death` trigger). It resolves the container config from the boon, checks persistence, and opens the container sheet.

### Gear Type Registration

The document system registers a `documents` gear type with the system:

```js
game.dc.register_gear_type('documents', {
  editor_schema, viewer_schema,
  viewer_partial: 'modules/dc-containers/templates/documents/viewer_documents.hbs',
  use_handler,   // opens the document reader when a player "uses" a document
  preview_handler,
});

game.dc.register_gear_partial('documents', {
  label: 'Documents',
  player_partial: 'modules/dc-containers/templates/documents/gear_documents.hbs',
  gm_partial: 'modules/dc-containers/templates/documents/gm_documents.hbs',
});

game.dc.register_gear_templates('documents', document_templates);
```

### System APIs Consumed

| API | Used For |
|-----|---------|
| `game.dc.boon_manager.register_boon_type()` | Boon type registration |
| `game.dc.register_boon_template()` | Boon editor UI template |
| `game.dc.register_field_type()` | `container_contents` custom field type for the boon editor |
| `game.dc.register_gear_type()` | Document gear type registration |
| `game.dc.register_gear_partial()` | Document gear tab partials (player + GM) |
| `game.dc.register_gm_tab()` | Documents tab on the Marshal sheet |
| `game.dc.register_gear_templates()` | Pre-built document templates |
| `game.dc.register_localization()` | Runtime localization keys |
| `game.dc.gear_catalog.iterate_catalog()` | Container contents editor — iterate all gear |
| `game.dc.gear_catalog.get_catalog_item()` | Resolve item details for container display |
| `game.dc.boon_persistence.*` | Container looting persistence tracking |
| `game.dc.utils.save_actor()` | Add looted items to player inventory |
| `game.dc.utils.data_from_path()` | Read/write boon contents by path |
| `game.dc.act.items.modify()` | Add items to actor inventory |
| `game.dc.msg.announce()` | Chat messages for loot notifications |
| `game.dc.generate_random_name()` | Procedural name generation for newspapers/posters |
| `game.dc.scroll_preservation.*` | Container sheet scroll position on rerender |
| `game.socket` (Foundry) | Module socket channel `module.dc-containers` for inter-client loot operations |

---

## Troubleshooting

**The container sheet doesn't open when I enter the region.**
- Check that the region has a `dcBoonRegion` behavior with the `open_container` boon
- Check that the behavior event is set to **Token Enter**
- Check that the GM client is running (all loot logic runs on the GM client)
- If using persistence, check that you haven't already looted this container

**Players can't take items from the container.**
- The GM client must be active — all take operations are processed GM-side via socket
- Check the console (F12) for errors
- If the boon's contents are empty, the sheet will show "The container is empty"

**The container says I've already looted it.**
- Persistence is set to **Once per Player** (or **Once**) — you've already opened this container
- To reset, the GM can clear the scene flags or change the boon's persistence setting

**The loot mode isn't showing the NPC's gear.**
- Loot Mode reads from the NPC's live gear at the time the boon fires — make sure the NPC has items in their inventory
- The boon must be attached to the NPC (in `char.boons`), not just on a region

**Documents don't appear on my character sheet.**
- Documents are a gear type — check that the character's sheet has the Documents gear tab (it's registered automatically by the module)
- Make sure the document exists in the system gear catalog (Documents tab on the Marshal sheet)

**The book reader / web page is blank.**
- Books require a valid Internet Archive details page URL (e.g. `https://archive.org/details/...`)
- Web pages require a valid URL — some sites block iframe embedding (X-Frame-Options)
- Check the console (F12) for iframe loading errors

**Newspaper generation produces the same content every time.**
- You're using the same seed — change the seed or leave it blank for random output
- If you've customized the fragment pools or value lists, those changes apply globally to all generation

**The newspaper editor won't let me edit fragment pools.**
- Fragment pool editing is GM-only — make sure you're logged in as the GM

---

## License

MIT