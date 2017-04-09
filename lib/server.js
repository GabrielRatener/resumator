
import {Server} from 'http'
import {get} from 'https'
import {runInNewContext} from 'vm'
import {URL, parse} from 'url'
import express from 'express'
import io from 'socket.io'
import jade from 'pug'
import uuid from 'node-uuid'
import cheerio from 'cheerio'
import ls from 'livescript'
import {newName} from './names'
import {Chat} from './chat'
import {prompt} from './prompt'

const userPrefix	= 'usa-';
const idMap			= new Map();
const adminID		= `admin-${uuid.v4()}`;
const resumes		= {
	'web': {
		url: 'https://docs.google.com/document/d/1zBDg-xUPRyUXUk9sQ7mj_VQAtUKYs1pxo3151HephiQ/pub?embedded=true',
		cached: -1
	}
};

export const
	app 			= express(),
	server 			= new Server(app),
	sockets 		= io.listen(server),
	chats			= new Map(),
	host			= process.env.HOST || 'localhost',
	protocol		= process.env.PROTOCOL || 'http',
	port			= process.env.PORT || ((protocol === 'https') ? 443 : 80),
	adminSockets	= sockets.of(`/${adminID}`);

const updatable = new Set(['name', 'color']);

function constantsToJS(constants) {
	let code = "";
	for (let {name, value} of constants) {
		code += `const ${name} = ${JSON.stringify(value)};\n`;
	}

	return code;
};

app.set('view engine', 'pug');

app.get(`/${userPrefix}:id.constants.js`, (req, res) => {
	const id = `${userPrefix}${req.params.id}`;
	const chat = chats.get(id);
	const constants = [
		{
			name: 'chatURL',
			value: `/chat/${chat.id}?user=${chat.memberIds[1]}`
		}
	];

	res.send(constantsToJS(constants));
});

app.get(`/${userPrefix}:id`, (req, res) => {
	const id = `${userPrefix}${req.params.id}`;

	const chat			= chats.get(id);
	const index 		= 1;
	const {memo} 		= chat;

	res.render('index.jade', {
		memo,
		id,
		organization: 'CatBox',
		name: chat.members[index].name,
	});
});

app.get(`/${adminID}`, (req, res) => {
	const index = 0;

	res.render('admin.jade', {
		organization: 'CatBox'
	});
});

app.get(`/resume/:id`, (req, res) => {
	if (!chats.has(req.params.id)) {
		return;
	}

	const {url} = resumes['web'];
	get(url, (response) => {
		let body = '';
		response.setEncoding('utf8');
		response.on('data', (piece) => {
			body += piece;
		});
		response.on('end', () => {
			const $ = cheerio.load(body);
			const links = $('a');
			for (let i = 0; i < links.length; i++) {
				const link = $(links[i]);
				const {query} = parse(link.attr('href'), true);
				if ('q' in query) {
					link.attr('href', query.q);
					link.attr('target', 'blank');
				}
			}
			res.end($.html());
		});
	}).on('error', (e) => {
		console.log(`could not fetch: ${url}`);
		res.send(404)
	});
});

app.use(express.static('public'));

adminSockets.on('connection', (socket) => {
	const log = (text, type = "normal") => {
		socket.emit('log', {text, type});
	};

	const chatData = ({id, name, topic, members, memberIds}) => ({
		id,
		name,
		topic,
		memberIds,
		profiles: members.map(
			({name, color, connections}) => ({name, color, connections}))
	});

	const api = {
		all: uuid.v4(),
		chat: {
			create(name, resume = 'web') {
				if (idMap.has(name)) {
					throw new Error(`Chat with name "${name}" already exists`);
				} else {
					const id 	= `${userPrefix}${uuid.v4()}`;
					const chat	= new Chat(name, "Questions?", id);

					chat.eventTransmitters.add(adminSockets);
					chats.set(id, chat);
					idMap.set(name, id);
					adminSockets.emit('add-chat', chatData(chat));
					log(`Generating chat "${name}"...`);
					log(` chat id: ${id}`);
					log(` chat resume: ${resume}`);
					log(` url:`);
					log(`  ${protocol}://${host}/${id}`);
				}
			},
			delete(name) {
				const id = idMap.get(name);
				chats.delete(id);
				idMap.delete(name);
				adminSockets.emit('delete-chat', id);
				log(`deleted chat "${name}"`);
			},
			show(name) {
				if (name === api.all) {
					for (let [,{name}] of chats) {
						this.show(name);
					}
				} else {
					if (!idMap.has(name)) {
						throw new Error(`Chat "${name}" does not exist`);
					} else {
						const id = idMap.get(name);
						const chat = chats.get(id);
						log(`${name}:`);
						log(` id: ${chat.name}`);
						log(` memo: ${chat.memo}`);
						log(` url: ${protocol}://${host}/${id}`);
					}
				}
			},
			open(name, tf = true) {
				const chat = chats.get(idMap.get(name));
				chat.open = tf;

				chat.sendTo(1, 'open', tf);

				log(`chat "${name}" is ${tf ? "open" : "closed"}`);
			}	
		},
		resume: {
			update(version) {
				if (version === api.all) {
					for (let key in resumes) {
						if (!resumes.hasOwnProperty(key)) {
							continue;
						}

						this.update(key);
					}
				} else {
					// TOODOO
				}
			},
			add(short, url) {
				if (resumes.hasOwnProperty(short)) {
					throw new Error('Resume already exists');
				} else {
					resumes[short] = url;
				}
			},
			delete(short) {
				delete resumes[short];
			},
			show(version = api.all) {
				if (version === api.all) {
					for (let key in resumes) {
						if (!resumes.hasOwnProperty(key)) {
							continue;
						}

						this.show(key);
					}
				} else {
					if (!resumes.hasOwnProperty(version)) {
						throw new Error(`Resume "${version}" does not exist`);
					}

					log(`${version}:`);
					log(`  cached: ${resumes[version].updated}`);
					log(`  url: ${resumes[version].url}`)
				}
			}
		},
		// for testing
		echo() {
			log('received');
		}
	};

	socket.on('run', (code) => {
		try {
			const js = ls.compile(code, {
				bare: true,
				header: false,
				const: true
			});	
			const out = runInNewContext(js, api);
			log(`${out}`, "output");
		} catch(e) {
			const txt = (e.hash) ? e.message : e.toString();
			log(txt, "error");
		}
	});

	socket.on('update-chat-property', ({property, value, id, user}) => {
		const chat = chats.get(id);

		if (user != null) {
			chat.members[user][property] = value;
			chat.sockets.emit(`update-${property}`, {
				index: user,
				[property]: value
			});
		} else {
			chat[property] = value;
			chat.sockets.emit(`update-${property}`, {
				[property]: value
			});
		}
	});

	socket.on('send-to-chat', ({id, index, event, params}) => {
		const chat = chats.get(id);
		if (index == null) {
			chat.sockets.emit(event, params);
		} else {
			chat.sendTo(index, event, params);
		}
	});

	socket.emit('init', {
		chats: Array
			.from(chats.entries())
			.map(([_, chat]) => chatData(chat)),
		meta: {}
	});
});

export default function run() {
	server.listen(port);
	console.log(`Listening on port ${port}...`);
	console.log(` Admin URL: ${protocol}://${host}/${adminID}`);
}
