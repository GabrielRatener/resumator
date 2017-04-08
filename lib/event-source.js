
export default class EventSource {
	constructor() {
		this._eventTable = new Map();
		this.eventTransmitters = new Set();
	}

	on(eventType, fn) {
		this._eventTable.set(eventType, fn)
	}

	off(eventType) {
		this._eventTable.delete(eventType);
	}

	_fire(eventType, arg) {
		for (let socket of this.eventTransmitters) {
			socket.emit(eventType, arg);
		}

		if (this._eventTable.has(eventType)) {
			const fn = this._eventTable.get(eventType);
			fn.apply(this, [arg]);
		}
	}
}