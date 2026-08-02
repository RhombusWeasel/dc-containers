/**
 * dc-containers — Container & Loot module for Deadlands Classic.
 *
 * Provides an `open_container` boon type that opens a player-facing container
 * UI. The boon config lives on the boon itself (attached to dcBoonRegion
 * behaviors or NPC char.boons). The module just renders the container and
 * (in later phases) handles item taking via socket.
 */

import { register_socket } from "./socket.js";
import { container } from "./lib/container.js";
import { register_boons } from "./boons/open_container.js";
import { register as register_container_contents_field } from "./field_types/container_contents.js";
import { register_documents } from "./documents/register.js";
import { register_fragment_pool_setting } from "./documents/newspaper_pool_overrides.js";
import { register_value_list_setting } from "./documents/newspaper_value_lists.js";

const MODULE_ID = "dc-containers";

// ─── Init: preload templates ──────────────────────────────────────────────

Hooks.once("init", async () => {
	register_fragment_pool_setting();
	register_value_list_setting();

	await foundry.applications.handlebars.loadTemplates([
		"modules/dc-containers/templates/container-sheet.hbs",
		"modules/dc-containers/templates/container_contents_editor.hbs",
		"modules/dc-containers/templates/documents/document_sheet.hbs",
		"modules/dc-containers/templates/documents/newspaper_sheet.hbs",
		"modules/dc-containers/templates/documents/newspaper_slot.hbs",
		"modules/dc-containers/templates/documents/newspaper_editor_sheet.hbs",
		"modules/dc-containers/templates/documents/wanted_poster_editor.hbs",
		"modules/dc-containers/templates/documents/wanted_poster_sheet.hbs",
		"modules/dc-containers/templates/documents/letter_editor.hbs",
		"modules/dc-containers/templates/documents/letter_sheet.hbs",
		"modules/dc-containers/templates/documents/journal_editor.hbs",
		"modules/dc-containers/templates/documents/journal_sheet.hbs",
		"modules/dc-containers/templates/documents/ledger_editor.hbs",
		"modules/dc-containers/templates/documents/ledger_sheet.hbs",
		"modules/dc-containers/templates/documents/map_editor.hbs",
		"modules/dc-containers/templates/documents/map_sheet.hbs",
		"modules/dc-containers/templates/documents/book_editor.hbs",
		"modules/dc-containers/templates/documents/web_page_editor.hbs",
		"modules/dc-containers/templates/documents/other_editor.hbs",
		"modules/dc-containers/templates/documents/other_sheet.hbs",
		"modules/dc-containers/templates/documents/gear_documents.hbs",
		"modules/dc-containers/templates/documents/viewer_documents.hbs",
		"modules/dc-containers/templates/documents/gm_documents.hbs",
	]);

	await foundry.applications.handlebars.loadTemplates({
		"newspaper-asset-panel": "modules/dc-containers/templates/documents/newspaper_asset_panel.hbs",
		"newspaper-detail-panel": "modules/dc-containers/templates/documents/newspaper_detail_panel.hbs",
		"newspaper-editor-slot": "modules/dc-containers/templates/documents/newspaper_editor_slot.hbs",
		"newspaper-fragment-pool-editor": "modules/dc-containers/templates/documents/newspaper_fragment_pool_editor.hbs",
		"newspaper-value-list-editor": "modules/dc-containers/templates/documents/newspaper_value_list_editor.hbs",
	});
});

// ─── dcReady: register everything ─────────────────────────────────────────

Hooks.once("dcReady", () => {
	// Register socket listener on module channel
	register_socket();

	// Register custom container_contents field type for boon editor
	register_container_contents_field();

	// Register open_container boon type + template
	register_boons();

	// Register document system (gear type, GM tab, partials, templates, use handler)
	register_documents();

	// Expose module API
	const module_api = game.modules.get(MODULE_ID);
	if (module_api) {
		module_api.api = {
			container,
		};
	}

	console.log("dc-containers | Module ready.");
});