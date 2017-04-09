
import uuid from 'node-uuid'
import {newName} from './names'
import {sockets} from './server'
import EventSource from './event-source'

const {random, floor} = Math;

const hex = '0123456789abcdef';

export const
	NONE		= 0,
	CHAT_ONLY	= 1,
	ALL			= 2;

function randomColor() {
	const arr = new Array(3);
	for (let i = 0; i < 3; i++) {
		arr[i] = hex[floor(16 * random())];
	}

	return arr.join('');
}

export class Chat extends EventSource {
	constructor(name, topic, id = uuid.v4(), size = 2) {
		super();

		this.name 		= name;
		this.id			= id;
		this.sockets	= sockets.of(`/chat/${id}`);
		this.size 		= size;
		this.topic 		= topic;
		this.reverser	= new Map();
		this.members 	= new Array(size);
		this.memberIds	= new Array(size);
		this.thread		= [];

		for (let i = 0; i < size; i++) {
			const id = uuid.v4();
			this.memberIds[i] = id;
			this.reverser.set(id, i);
			this.members[i] = {
				name: newName(),
				typing: false,
				color: randomColor(),
				connections: 0
			}
		}

		this.sockets.on('connection',
			socket => this._addSocket(socket));
	}

	sendTo(i, type, msg) {
		const {connected} = this.sockets;
		for (let path in connected) {
			if (connected.hasOwnProperty(path)) {
				const socket 		= connected[path];
				const [index, id] 	= this.getUser(socket);
				if (i === index || i === id)
					socket.emit(type, msg);
			}
		}
	}

	getUser(socket) {
		const {user} = (socket.handshake.query || {});
		const index = this.reverser.get(user);
		return index == null ? [null, null] : [index, user];
	}

	_addSocket(socket) {
		const [index, user]	= this.getUser(socket);
		if (!user)
			return;

		const {members, thread} = this;
		const {id, topic} 		= this;
		const member			= members[index];
		const stopTyping		= () => {
			if (typingTimeout) {
				global.clearTimeout(typingTimeout);
				typingTimeout = null;
			}
			
			members[index].typing = false;
			this.sockets.emit('update-typing', {
				index,
				typing: false
			});
		}

		let typingTimeout = null;

		if (index === null) {
			socket.disconnect();
		}

		member.connections += 1;

		this._fire('connection-change', {
			id,
			index,
			connections: member.connections
		});

		socket.emit('init', {
			index,
			topic,
			thread,
			members: members.map(member => {
				const obj = {};
				Object.assign(obj, member, {online: member.connections > 0});
				delete obj.connections;
				return obj;
			})
		});

		this.sockets.emit('update-online', {
			index,
			online: true
		});

		socket.on('message', (msg) => {
			if (members[index].typing) {
				stopTyping();
			}

			if (msg.trim() === '')
				return;

			const message = {
				body: msg,
				sender: index,
				time: Date.now()
			};
			thread.push(message);
			this.sockets.emit('message', message);
		});

		socket.on('update-name', (name) => {
			member.name = name;
			this.sockets.emit('update-name', {index, name});
		});

		socket.on('update-color', (color) => {
			member.color = color;
			this.sockets.emit('update-color', {index, color});
		})

		socket.on('disconnect', () => {
			member.connections -= 1;
			this._fire('connection-change', {
				id,
				index,
				connections: member.connections
			});
			this.sockets.emit('update-online', {
				index,
				online: false
			});
		});

		socket.on('update-typing', () => {
			if (typingTimeout) {
				global.clearTimeout(typingTimeout);
			}

			members[index].typing = true;
			this.sockets.emit('update-typing', {
				index,
				typing: true
			});

			typingTimeout = global.setTimeout(stopTyping, 5 * 1000);
		});
	}
}