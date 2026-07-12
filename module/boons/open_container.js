/**
 * open_container boon — fires when a player token enters a region with this
 * boon, or on NPC death. Opens the container sheet using data stored on the
 * boon itself.
 *
 * Boon handler signature: (boon, context) => void
 * context: { region, target, actor, behavior, behavior_uuid }
 */

import { container } from "../lib/container.js";

export default function open_container_boon(boon, context) {
	const { region, actor, target, behavior, behavior_uuid } = context;

	// Determine a unique container ID.
	// Region context: behavior UUID (preferred), region ID, or NPC UUID.
	// Dialog context: no region/behavior — use the NPC (target) UUID.
	const container_id = behavior_uuid
		|| behavior?.uuid
		|| region?.id
		|| target?.uuid
		|| actor?.uuid;

	// Persistence check — once_per_player
	if (boon.persistence === "once_per_player") {
		if (container.has_player_looted(container_id, actor?.uuid)) {
			game.dc.msg.announce('Container', 'You have already looted this container.');
			return;
		}
	}

	// Build container data from the boon
	const container_data = {
		container_name: boon.container_name || 'Container',
		items: boon.contents || {},
		loot_mode: false,
	};

	container.open_sheet(container_data, container_id, actor);
}

// ─── Registration ─────────────────────────────────────────────────────────

function register_boons() {
	game.dc.boon_manager.register_boon_type("open_container", open_container_boon);

	const triggers = game.dc.system.triggers;

	game.dc.register_boon_template("open_container", {
		label: "Open Container",
		description: "Opens a container UI. Shows configured items. Players choose what to take.",
		new_object: {
			label: "Container",
			type: "open_container",
			trigger: "always",
			container_name: "Container",
			loot_mode: false,
			contents: {},
			persistence: "once_per_player",
			is_permanent: true,
			target: "self",
			scaling: null,
		},
		data: {
			label:          { key: 'boon-label',          type: 'text',               value: 'label',          label: 'Label' },
			trigger:        { key: 'boon-trigger',        type: 'dropdown',           value: 'trigger',        options: triggers, translation_path: 'dc.triggers', label: 'Trigger' },
			container_name: { key: 'boon-container_name', type: 'text',              value: 'container_name', label: 'Container Name' },
			loot_mode:      { key: 'boon-loot_mode',      type: 'checkbox',          value: 'loot_mode',      label: 'Loot Mode (show NPC inventory)' },
			persistence:    { key: 'boon-persistence',   type: 'dropdown',          value: 'persistence',    options: { once: 'Once', once_per_player: 'Once per Player' }, label: 'Persistence' },
			contents:       { key: 'boon-contents',       type: 'container_contents', value: 'contents',      label: 'Contents' },
		},
	});
}

export { register_boons };