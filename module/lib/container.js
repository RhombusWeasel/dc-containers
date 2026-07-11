/**
 * Container engine — manages container data, sheet open/close, and socket
 * routing. In Phase 2 this is read-only (no take logic). Phase 3 adds
 * item taking via socket, Phase 4 adds NPC loot extraction.
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

function handle_socket(data) {
	// Phase 2: no socket events yet — just log
	// Phase 3 will handle: take_item, container_update, mark_looted
	if (data?.event === "container") {
		// Reserved for Phase 3
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