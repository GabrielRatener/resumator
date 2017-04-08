
import {showBox, range, urlBase, chatModel} from './lib'

$(document).ready((e) => {
	const alarm = new Audio('../../siren.wav');
	const model = new Vue({
		el: '#dashboard',
		data: {
			commandIndex: 0,
			commands: [""],
			log: [],
			chats: []
		},
		methods: {
			changeThread(index) {
				const {id, memberIds: [member]} = this.chats[index];
				const url = `${urlBase()}/chat/${id}?user=${member}`;

				chatModel.connect(url);
				chatModel.open = true;
			},
			history(back = true) {
				if (back) {
					if (this.commandIndex > 0)
						this.commandIndex--;
				} else {
					if (this.commandIndex < this.commands.length - 1)
						this.commandIndex++;
				}
			},
			update(...args) {
				const [property, userIndex, offset] = args;
				let value, id = (args.length > 1) ? this.chats[userIndex].id : undefined;
				switch (args.length) {
					case 1:
						value = this[property];
						break;
					case 2:
						value = this.chats[userIndex][property];
						break;
					case 3:
						value = this.chats[userIndex].profiles[offset][property];
						break;
				}

				adminSocket.emit(`update`, {
					property,
					value,
					id,
					user: offset
				});
			},
			run() {
				const code = this.commands[this.commandIndex];
				const top = this.commands.length - 1;
				if (code === '')
					return;

				this.commands.$set(top, code);
				this.commands.push('');
				this.commandIndex = top + 1;
				this.log.push({
					text: code,
					type: "input"
				});

				if (code[0] === ':') {
					const rest = code.trim().slice(1);
					const [command, ...args] = rest.split(/\s/g);
					const fn = commands.hasOwnProperty(command) ?
						commands[command] :
						() => {
							throw new Error(`Command "${command}" does not exist`);
						};

					try {
						const val = fn.apply(commands, args);
						this.log.push({
							type: `output`,
							text: `${val}`
						});
					} catch ({message}) {
						this.log.push({
							type: `error`,
							text: `Error: ${message}`
						});
					}
				} else {
					commands.mute();
					adminSocket.emit('run', code);
				}
			}
		}
	});

	const commands = {
		mute() {
			alarm.pause();
		},
		link(text, url, target = "blank") {
			model.text += `<a href="${url}" target="${target}">${text}</a>`;
		}
	};

	const toIndex = (id) => {
		if (indexCache.has(id)) {
			return indexCache.get(id);
		} else {
			for (let i = 0; i < model.chats.length; i++) {
				const chat = model.chats[i];
				if (chat.id === id) {
					indexCache.set(id, i);
					return i;
				}
			}

			return -1;
		}
	}

	const [_, adminID] =
		window.location.pathname.split('/');
	const url =
		`${window.location.protocol}//${window.location.hostname}:`
			+ `${window.location.port}/${adminID}`;
	const adminSocket = io(url);
	const updates = {
		map: new Map(),
		on(property, fn) {
			this.map.set(property, fn);
		},
		off(property) {
			this.map.delete(property);
		}
	};

	const indexCache = new Map();

	adminSocket.on('init', ({chats}) => {
		model.chats = chats;

		/*
		id,
		name,
		memo,
		connections,
		profiles : [2 x 
			{
				color,
				name
			}
		]
		*/
	});

	alarm.loop = true;

	adminSocket.on('add-chat', (chat) => {
		model.chats.push(chat);
	});

	adminSocket.on('delete-chat', (id) => {
		for (let i = toIndex(id); i < model.chats.length - 1; i++) {
			indexCache.delete(model.chats[i].id);
			model.chats.$set(i, model.chats[i + 1]);
		}

		indexCache.delete(model.chats.pop().id);
	});

	adminSocket.on('log', ({text, type}) => {
		model.log.push({
			text,
			type
		});
	});

	adminSocket.on('connection-change', ({id, index, connections}) => {
		const i = toIndex(id);
		model
			.chats[i]
			.profiles[index]
			.connections = connections;

		if (index === 0)
			return;

		if (connections > 0) {
			alarm.play();
		} else {
			alarm.pause();
		}
	});

	adminSocket.on('update', ({id, user, property, value}) => {
		const index = toIndex(id);
		let subject, old;
		if (user != null) {
			subject = model.chats[index].profiles[user]; 
		} else if (id) {
			subject = model.chats[index];
		} else {
			subject = model;
		}

		if (updates.map.has(property)) {
			const fn = updates.map.get(property);
			fn({
				id,
				user,
				property,
				values: {
					old: subject[property],
					new: value
				}
			});
		}

		subject[property] = value;
	});
});