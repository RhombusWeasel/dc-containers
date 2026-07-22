/**
 * Container engine — manages container data, sheet open/close, and socket
 * routing for item taking and persistence tracking.
 *
 * In the boon-based architecture, container config (container_name, contents,
 * loot_mode, persistence) lives on the boon attached to a dcBoonRegion
 * behavior or NPC char.boons. Per-player loot tracking lives in scene flags.
 */

const MODULE_ID = "dc-containers";

// ─── Module state ─────────────────────────────────────────────────────────

let _open_sheet = null;

function set_open_sheet(sheet) {
	_open_sheet = sheet;
}

function get_open_sheet() {
	return _open_sheet;
}

// ─── Persistence tracking (scene flags) ───────────────────────────────────

/**
 * Check if a player has already looted this container (once_per_player mode).
 * @param {string} container_id — behavior UUID or region ID
 * @param {string} player_uuid — actor UUID
 * @returns {boolean}
 */
function has_player_looted(container_id, player_uuid) {
	if (!player_uuid) return false;
	const scene = canvas.scene;
	if (!scene) return false;
	const looted = scene.getFlag(MODULE_ID, "looted") || {};
	const players = looted[container_id] || [];
	return players.includes(player_uuid);
}

/**
 * Mark a player as having looted this container.
 * @param {string} container_id
 * @param {string} player_uuid
 */
async function mark_player_looted(container_id, player_uuid) {
	if (!player_uuid) return;
	const scene = canvas.scene;
	if (!scene) return;
	const looted = foundry.utils.deepClone(scene.getFlag(MODULE_ID, "looted") || {});
	if (!looted[container_id]) looted[container_id] = [];
	if (!looted[container_id].includes(player_uuid)) {
		looted[container_id].push(player_uuid);
		await scene.setFlag(MODULE_ID, "looted", looted);
	}
}

// ─── Open container sheet ─────────────────────────────────────────────────

async function open_sheet(container_data, container_id, actor) {
	// If sheet already open for this container, just re-render
	if (_open_sheet?.container_id === container_id) {
		_open_sheet.render(true);
		return true;
	}

	const { ContainerSheet } = await import("../sheets/container_sheet.js");
	ContainerSheet.show(container_data, container_id, actor);
	return true;
}

// ─── Build display items from boon contents ──────────────────────────────

/**
 * Convert boon contents ({ "path": { qty: N } }) into display objects
 * with label, icon, cost, qty.
 * @param {object} contents — boon contents data
 * @returns {Array} — [{ path, label, cost, qty }]
 */
function build_display_items(contents) {
	const items = [];
	if (!contents || typeof contents !== "object") return items;

	for (const entry of game.dc.gear_catalog.iterate_catalog()) {
		const stored = game.dc.utils.data_from_path(contents, entry.path);
		const qty = stored?.qty ?? 0;
		if (qty > 0) {
			items.push({
				path: entry.path,
				label: entry.item?.label || entry.key,
				cost: entry.item?.cost ?? 0,
				qty: qty,
			});
		}
	}
	return items;
}

// ─── Socket handling ──────────────────────────────────────────────────────

/**
 * GM-side: process a take_item request from a player.
 * Reduces the quantity on the boon contents, adds the item to the player's
 * actor, and broadcasts the updated container data to all clients.
 * @param {object} data — { event, container_id, path, player_uuid, player_name }
 */
async function _handle_take_item(data) {
	if (!game.user.isGM) return;

	const { container_id, path, player_uuid, player_name } = data;
	if (!container_id || !path) return;

	// Find the boon — it's on a region behavior or NPC actor
	const boon = await _find_container_boon(container_id);
	if (!boon) {
		console.warn("dc-containers | Could not find container boon for", container_id);
		return;
	}

	const contents = boon.contents || {};
	const stored = game.dc.utils.data_from_path(contents, path);
	const qty = stored?.qty ?? 0;
	if (qty < 1) return;

	// Reduce quantity on the boon
	const new_qty = qty - 1;
	const new_contents = foundry.utils.deepClone(contents);
	const stored_entry = game.dc.utils.data_from_path(new_contents, path);
	if (stored_entry) {
		stored_entry.qty = new_qty < 1 ? 0 : new_qty;
	}

	// Save updated contents back to the boon
	await _update_boon_contents(container_id, new_contents);

	// Add the item to the player's actor
	const actor = game.actors.get(player_uuid) || await fromUuid(player_uuid).catch(() => null);
	if (actor) {
		await game.dc.utils.save_actor(actor, (system) => {
			game.dc.act.items.modify({ system }, path, 1);
		});
	}

	// Broadcast updated container data to all clients so open sheets re-render
	const refreshed_boon = await _find_container_boon(container_id);
	const updated_items = refreshed_boon ? (refreshed_boon.contents || {}) : new_contents;

	// Mark the player as having looted (for once_per_player persistence)
	if (player_uuid && game.dc.boon_persistence) {
		const actor = game.actors.get(player_uuid) || await fromUuid(player_uuid).catch(() => null);
		const boon = await _find_container_boon(container_id);
		const persistence = boon?.persistence || 'once_per_player';
		await game.dc.boon_persistence.mark_triggered(container_id, persistence, actor);
	} else if (player_uuid) {
		await mark_player_looted(container_id, player_uuid);
	}

	game.socket.emit("module.dc-containers", {
		event: "container_update",
		container_id,
		items: updated_items,
		player_uuid,
		path,
	});
}

/**
 * Client-side: re-render the open container sheet with updated contents.
 * @param {object} data — { event, container_id, items, player_uuid, path }
 */
function _handle_container_update(data) {
	const { container_id, items, player_uuid, path } = data;

	// Notify the taking player
	if (player_uuid && player_uuid === game.user.character?.uuid) {
		const catalog_item = game.dc.gear_catalog.get_catalog_item(path);
		const label = catalog_item?.label || path;
		game.dc.msg.announce('Container', `You took: ${label}`);
	}

	// Update the open sheet if it matches
	if (_open_sheet?.container_id === container_id) {
		_open_sheet._container_data.items = items;
		_open_sheet.render(true);
	}
}

/**
 * Find a container boon by container_id.
 * The container_id can be a behavior UUID, region ID, or actor UUID.
 * @param {string} container_id
 * @returns {Promise<object|null>}
 */
async function _find_container_boon(container_id) {
	// Try as UUID first (behavior or actor)
	const doc = await fromUuid(container_id).catch(() => null);
	if (doc) {
		// Region behavior — boons are in system.boons
		if (doc.system?.boons) {
			const boon = doc.system.boons.find(b => b.type === 'open_container');
			if (boon) return boon;
		}
		// Actor (NPC) — boons are in system.char.boons
		if (doc.system?.char?.boons) {
			const boon = doc.system.char.boons.find(b => b.type === 'open_container');
			if (boon) return boon;
		}
	}

	// Try as region ID — search behaviors on that region
	if (canvas.scene) {
		const region = canvas.scene.regions.get(container_id);
		if (region) {
			for (const behavior of region.behaviors) {
				if (behavior.system?.boons) {
					const boon = behavior.system.boons.find(b => b.type === 'open_container');
					if (boon) return boon;
				}
			}
		}
	}

	return null;
}

/**
 * Update the contents on a container boon.
 * @param {string} container_id
 * @param {object} new_contents
 */
async function _update_boon_contents(container_id, new_contents) {
	const doc = await fromUuid(container_id).catch(() => null);
	if (doc) {
		// Region behavior — boons are in system.boons
		if (doc.system?.boons) {
			const boons = doc.system.boons;
			const idx = boons.findIndex(b => b.type === 'open_container');
			if (idx >= 0) {
				boons[idx].contents = new_contents;
				await doc.update({ 'system.boons': boons });
			}
			return;
		}
		// Actor (NPC) — boons are in system.char.boons
		if (doc.system?.char?.boons) {
			const boons = doc.system.char.boons;
			const idx = boons.findIndex(b => b.type === 'open_container');
			if (idx >= 0) {
				boons[idx].contents = new_contents;
				await doc.update({ 'system.char.boons': boons });
			}
			return;
		}
	}

	// Try as region ID
	if (canvas.scene) {
		const region = canvas.scene.regions.get(container_id);
		if (region) {
			for (const behavior of region.behaviors) {
				if (behavior.system?.boons) {
					const boons = behavior.system.boons;
					const idx = boons.findIndex(b => b.type === 'open_container');
					if (idx >= 0) {
						boons[idx].contents = new_contents;
						await behavior.update({ 'system.boons': boons });
						return;
					}
				}
			}
		}
	}
}

/**
 * GM-side: handle mark_looted event.
 * Delegates to system-level game.dc.boon_persistence API.
 * @param {object} data — { event, container_id, disable_behavior_uuid?, player_uuid, persistence }
 */
async function _handle_mark_looted(data) {
	if (!game.user.isGM) return;

	const { container_id, disable_behavior_uuid, player_uuid, persistence } = data;

	// Resolve the actor from player_uuid
	const actor = player_uuid ? (game.actors.get(player_uuid) || await fromUuid(player_uuid).catch(() => null)) : null;

	// Use system-level persistence API
	if (game.dc.boon_persistence) {
		await game.dc.boon_persistence.mark_triggered(container_id, persistence || 'once_per_player', actor, disable_behavior_uuid);
	} else {
		// Fallback: disable behavior for 'once', mark player for once_per_player
		if (disable_behavior_uuid) {
			const behavior = await fromUuid(disable_behavior_uuid).catch(() => null);
			if (behavior) {
				await behavior.update({ disabled: true });
			}
		}
		if (container_id && player_uuid) {
			await mark_player_looted(container_id, player_uuid);
		}
	}
}

function handle_socket(data) {
	if (!data?.event) return;

	if (data.event === "take_item") {
		_handle_take_item(data);
	}
	else if (data.event === "container_update") {
		_handle_container_update(data);
	}
	else if (data.event === "mark_looted") {
		_handle_mark_looted(data);
	}
}

// ─── Module API ───────────────────────────────────────────────────────────

const container = {
	open_sheet,
	build_display_items,
	has_player_looted,
	mark_player_looted,
	handle_socket,
	set_open_sheet,
	get_open_sheet,
};

export { container, set_open_sheet, get_open_sheet, MODULE_ID };