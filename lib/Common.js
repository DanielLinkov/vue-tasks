
class Event{
	#name = null;
	#target = null;
	constructor(name,config){
		this.#target = config.target;
		this.name = config.name;
	}
	get target(){
		return this.#target;
	}
	get name(){
		return this.#name;
	}
}

class ErrorEvent extends Event{
	constructor(target){
		super('error',{target});
	}
}

class EventListenerRecord{
	#modifiers = {};
	#callback = [];
	#property = null;
	constructor(property,modifiers,callback){
		this.#property = property;
		this.#modifiers = modifiers;
		this.#callback = callback;
	}
	get property(){
		return this.#property;
	}
	get modifiers(){
		return this.#modifiers;
	}
	get callback(){
		return this.#callback;
	}
}

class EventTarget{
	constructor(config,events){
		const listeners = {};
		const eventTypeRegex = /^(?<type>[a-z]+)(:(?<property>\$?[a-zA-Z0-9_]+))?(?<modifiers>(\.[a-z0-9]+)+)?$/;

		Object.defineProperty(this,'$listeners',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: listeners,
		});

		Object.defineProperty(this,'$on',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: (types,callback)=>{
				for(let typeString of types.split(/\s+/)){
					const parts = typeString.match(eventTypeRegex);
					if(parts === null){
						throw new Error(`Invalid event type format "${typeString}"`);
					}
					if(!(parts.groups.type in config.eventTypes))
						throw new Error(`Invalid event type "${parts.groups.type}"`);
					if(parts.groups.property !== undefined){
						if(!config.eventTypes[parts.groups.type].allowProperty)
							throw new Error(`Properties not allowed for event type "${parts.groups.type}"`);
						if(!config.propertyNames.includes(parts.groups.property))
							throw new Error(`Invalid event property "${parts.groups.property}". Allowed: ${config.propertyNames.join(', ')}`);
					}
					let modifiers = [];
					if(parts.groups.modifiers !== undefined){
						if(!Array.isArray(config.eventTypes[parts.groups.type].modifiers))
							throw new Error(`Event type ${parts.groups.type} doesn't accept modifiers`);
						modifiers = parts.groups.modifiers.split('.').filter(m=>m.length);
						for(let modifier of modifiers){
							if(!(config.eventTypes[parts.groups.type].modifiers.includes(modifier)))
								throw new Error(`Invalid event modifier "${modifier}" for event type "${parts.groups.type}". Allowed: ${config.eventTypes[parts.groups.type].modifiers.join(', ')}`);
						}
					}
					if(!(parts.groups.type in listeners))
						listeners[parts.groups.type] = [];
					const record = new EventListenerRecord(parts.groups.property,modifiers,callback);
					listeners[parts.groups.type].push(record);
				}
			}
		});
	}
}

export { EventTarget }