
class Event{
	#target = null;
	#type = null;
	constructor(config){
		this.#target = config.target;
		this.#type = config.type;
	}
	get type(){
		return this.#type;
	}
	get target(){
		return this.#target;
	}
	get name(){
		return this.constructor.name;
	}
}

class PropertyChangeEvent extends Event{
	#property = null;
	#oldValue = null;
	#value = null;
	constructor(config){
		super(config);
		this.#property = config.property || null;
		this.#oldValue = config.oldValue;
		this.#value = config.value;
	}
	get property(){
		return this.#property;
	}
	get oldValue(){
		return this.#oldValue;
	}
	get value(){
		return this.#value;
	}
}

class ErrorEvent extends Event{
	#error = null;
	constructor(config){
		super(config);
		this.#error = config.error;
	}
	get error(){
		return this.#error;
	}
}

class EventListenerRecord{
	#timeout = 0;
	#repeatCount = -1;
	#modifiers = {};
	#callback = [];
	#property = null;
	#values = {};	//For multi-property events
	#oldValues = {};	//For multi-property events
	#isMarkedForRemoval = false;	//Scheduled for removal
	scheduledTimerId = null;	//Scheduled for async execution
	currentCount = 0;
	constructor(property,modifiers,callback,timeout,repeatCount){
		this.#property = property || null;
		this.#modifiers = modifiers || [];
		this.#callback = callback;
		this.#timeout = +timeout || 0;
		this.#repeatCount = +repeatCount || -1;
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
	get timeout(){
		return this.#timeout;
	}
	get repeatCount(){
		return this.#repeatCount;
	}
	get oldValues(){
		return this.#oldValues;
	}
	get values(){
		return this.#values;
	}
	addProperty(property,value,oldValue){
		this.#values[property] = value;
		this.#oldValues[property] = oldValue;
	}
	reset(){
		this.#values = {};
		this.#oldValues = {};
		this.scheduledTimerId = null;
	}
	remove(){
		this.#isMarkedForRemoval = true;
	}
	get isMarkedForRemoval(){
		return this.#isMarkedForRemoval;
	}
}

class EventTarget{
	constructor(config,events){
		const listeners = {};
		const eventTypeRegex = /^(?<type>[a-z]+)(:(?<property>\$?[a-zA-Z0-9_]+))?(?<modifiers>(\.[a-z0-9]+)+)?$/;
		const timeoutRegex = /^[0-9]+$/;
		const repeatRegex = /^x[1-9][0-9]*$/;

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
				if(typeof callback != 'function')
					throw new Error(`Invalid callback argument (expected function): ${typeof callback}`);
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
					let timeout = 0;
					let repeatCount = -1;
					if(parts.groups.modifiers !== undefined){
						for(let modifier of parts.groups.modifiers.split('.').filter(m=>m.length)){
							if(timeoutRegex.test(modifier)){
								timeout = modifier;
								continue;
							}
							if(repeatRegex.test(modifier)){
								repeatCount = modifier.substr(1);
								continue;
							}
							switch(modifier){
								case 'sync':
									modifiers.push(modifier);
									break;
								default:
									throw new Error(`Invalid event modifier "${modifier}"`);
							}
						}
					}
					if(!(parts.groups.type in listeners))
						listeners[parts.groups.type] = [];
					const record = new EventListenerRecord(parts.groups.property,modifiers,callback,timeout,repeatCount);
					listeners[parts.groups.type].push(record);
				}
			}
		});

		Object.defineProperty(this,'$off',{
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
					if(parts.groups.modifiers !== undefined)
						throw new Error(`Event modifiers not allowed on $off()`);
					if(!(parts.groups.type in listeners))
						continue;
					listeners[parts.groups.type] = listeners[parts.groups.type].filter(record=>{
						if(parts.groups.property !== undefined && record.property != parts.groups.property)
							return true;
						if(callback !== undefined && record.callback !== callback)
							return true;
						return false;
					});
					if(listeners[parts.groups.type].length == 0)
						delete listeners[parts.groups.type];
				}
			}
		});

		Object.defineProperty(this,'$$trigger',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: (event)=>{
				if(!(event instanceof Event))
					throw new Error(`Invalid event object`);
				if(!(event.type in listeners))
					return;
				for(let record of [...listeners[event.type]]){
					if(record.property !== null && (!(event instanceof PropertyChangeEvent) || record.property != event.property))
						continue;
					if(record.modifiers.length > 0){
						if(record.modifiers.includes('sync')){
							if(event instanceof PropertyChangeEvent)
								record.addProperty(event.property,event.value,event.oldValue);
							record.callback(event,record);
							if(record.isMarkedForRemoval || record.repeatCount > 0 && ++record.currentCount >= record.repeatCount){
								listeners[event.type].splice(listeners[event.type].indexOf(record),1);
								continue;
							}
							record.reset();
							continue;
						}
					}
					if(record.scheduledTimerId){
						clearTimeout(record.scheduledTimerId);
					}
					if(event instanceof PropertyChangeEvent)
						record.addProperty(event.property,event.value,event.oldValue);
					record.scheduledTimerId = setTimeout(() => {
						record.callback(event,record);		
						if(record.isMarkedForRemoval || record.repeatCount > 0 && ++record.currentCount >= record.repeatCount)
							listeners[event.type].splice(listeners[event.type].indexOf(record),1);
						record.reset();
					}, record.timeout);
				}
			}
		});
	}
}

export { Event,PropertyChangeEvent,EventTarget }