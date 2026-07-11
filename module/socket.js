/**
 * Socket handler for dc-containers module.
 * Routes incoming socket packets on the `module.dc-containers` channel
 * to the container handler.
 */

import { container } from "./lib/container.js";

const SOCKET_CHANNEL = "module.dc-containers";

function register_socket() {
	if (!game.socket) return;
	game.socket.on(SOCKET_CHANNEL, (data) => {
		container.handle_socket(data);
	});
}

export { register_socket, SOCKET_CHANNEL };