(function () {
'use strict';

const hexSet = new Set('0123456789abcdefABCDEF');

Vue.filter('signify', (value, name) => {
	if (value === name) {
		return `me (${name}):`;
	} else {
		return value + ':';
	}
});

Vue.filter('online', (members, index) => {
	for (let i = 0; i < members.length; i++) {
		console.log(members[i]);
		if (i === index)
			continue;
		if (members[i].online)
			return 'online';
	}

	return 'offline';
});

Vue.filter('firstOnline', (members, index) => {
	for (let i = 0; i < members.length; i++) {
		console.log(members[i]);
		if (i === index)
			continue;
		if (members[i].online)
			return `${members[i].name} is available to chat`;
	}

	return 'Chat';
});

Vue.filter('initials', (value) => (value || '')
	.split(/\s+/g)
	.map(word => word[0])
	.join('')
	);

Vue.filter('html', (value, on = true) => {
	let string = "";
	let table = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': '&quot;',
		"'": '&#39;',
		"/": '&#x2F;'
	};

	if (on)
		return value;

	for (let c of value) {
		if (table.hasOwnProperty(c)) {
			string += table[c];
		} else {
			string += c;
		}
	}

	return string;
});

Vue.filter('time', (value) => {
	const date = new Date(+value);
	const hours = date.getHours();
	const median = (11 < hours && hours < 24) ? 'PM' : 'AM';
	const minutes = date.getMinutes();
	const officialHour = (hours === 0) ? 12 : hours;

	return `${(officialHour - 1) % 12 + 1}:${(minutes < 10 ? '0' : '') + minutes} ${median}`;
});

Vue.filter('url', (value) => `${urlBase()}/${value}`);

Vue.filter('getName', (index, members) =>
	index !== null && index > -1 ? members[index].name : '');

Vue.filter('cap', (value) => (value || '')
	.split(/\s/g)
	.map(string => string?string[0].toUpperCase() + string.substr(1) : '')
	.join(' ')
	);

Vue.filter('ntobr', (value) => {
	let string = "";
	for (let c of value) {
		if (c === '\n') {
			string += "<br/>";
		} else {
			string += c;
		}
	}

	return string;
});

Vue.filter('showUnread', (value) =>
	(value > 0) ? `(${value}) ` : '');

Vue.filter('bool', (value, truthy = 'yes', falsy = 'no') => 
	value? truthy : falsy);

Vue.filter('contains', (array, key, value, index = -1) => {
	for (let i = 0; i < array.length; i++) {
		const element = array[i];
		if (i === index) {
			continue;
		}

		if (element.hasOwnProperty(key) && element[key] === value) {
			return true;
		}
	}

	return false;
});

Vue.filter('typingNames', (array, index) => {
	const arr = [];
	for (let i = 0; i < array.length; i++) {
		const {typing, name} = array[i];
		if (typing && i !== index) {
			arr.push(name);
		}
	}

	switch (arr.length) {
		case 1:
			return `${arr[0]} is typing...`;
		case 2:
			return `${arr[0]} and ${arr[1]} are typing...`;
		default:
			const last = arr.pop();
			return `${arr.join(', ')}, and ${last} are typing...`;
	}
});

Vue.filter('length', (value) => value.length);

Vue.filter('rgb', (value) => `rgb(${value.join(',')})`);

Vue.filter('color', (value) => {
	const base = '#000';
	if (value.length === 3 || value.length === 6) {
		for (let char of value) {
			if (!hexSet.has(char)) {
				return base;
			}
		}
		return `#${value}`;
	} else {
		return base;
	}
});

Vue.filter('replPrefix', (value) => {
	switch(value) {
		case "normal"	: return '-';
		case "output"	: return '<-';
		case "input"	: return '>>';
		case "error"	: return 'x'
		default:
			return '*&^*'
	}
});

let chatModel;
let titleModel;
let visible = true;

function urlBase() {
	const {protocol, hostname, port} = window.location;
	const uri = `${protocol}//${hostname}:${port}`;
	return uri;
}



function showBox() {
	const messages = document.querySelector('.thread');
	messages.scrollTop = messages.scrollHeight;
}

window.addEventListener('visibilitychange', (e) => {
	visible = !document.hidden;
	if (visible) {
		titleModel.unread = 0;
	}
});

window.addEventListener('load', () => {
	const audio = new Audio('../../slap.wav');

	const updatableProperties = ['name', 'online', 'color'];

	let socket;

	let model = chatModel = new Vue({
		el: '#chat',
		data: {
			topic: "",
			thread: [],
			members: [],
			unread: 0,
			index: null,
			text: '',
			typing: -1,
			open: false
		},
		methods: {
			connect(url) {
				if (socket)
					socket.disconnect(2);
				socket = io.connect(url, {'forceNew': true});

				socket.on('init', (json) => {
					model.topic = json.topic;
					model.index = json.index;
					model.members = json.members;
					model.thread = [];
					json.thread.forEach(
						message => model.addMessage(message));
					window.setTimeout(showBox, 0);
				});

				socket.on('message', (json) => {
					if (!visible)
						titleModel.unread++;
					if (json.sender !== model.index)
						audio.play();
					model.addMessage(json);
					window.setTimeout(showBox, 0);
				});

				for (let property of updatableProperties) {
					socket.on(`update-${property}`, (msg) => {
						model.members[msg.index][property] = msg[property];
					});
				}

				socket.on(`update-topic`, ({topic}) => {
					model.topic = topic;
				});

				socket.on('update-typing', ({index, typing}) => {
					if (index === model.index) {
						return;
					}

					if (typing) {
						model.typing = index;
					} else {
						if (index === model.typing) {
							model.typing = -1;
						}
					}

					model.members[index].typing = typing;
				});


				socket.on('open', (val) => {
					model.open = val;
				});		
			},
			sendMessage(e) {
				const trimmed = this.text.trim();
				socket.emit('message', trimmed);					
				this.text = '';

				e.preventDefault();
				e.stopPropagation();
			},
			update(property) {
				socket.emit(`update-${property}`,
					this.members[this.index][property]);
			},
			addMessage(message) {
				if (this.thread.length > 0) {
					const top = this.thread.length - 1;
					const last = this.thread[top];

					// if more than a minute between thread
					if (message.time - last.time < 60000
						&& last.sender === message.sender) {

						this.thread.$set(top, {
							body: `${last.body}\n\n${message.body}`,
							time: message.time,
							sender: message.sender
						});

						return;
					}
				}
				
				this.thread.push(message);
			},
			showTyping() {
				if (this.text.trim() === '')
					return;
				else
					socket.emit('update-typing', true);
			},
			toggleChat() {
				this.open = !this.open;
			}
		}
	});
	
	titleModel = new Vue({
		el: "#title",
		data: {
			unread: 0
		}
	});
});

window.onload = function(e) {
	console.log(chatURL);
	chatModel.connect(chatURL);
};

}());
