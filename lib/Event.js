import { isPlainObject } from "./Utils.js";

class Event{
	constructor(config){
		Object.defineProperty(this,'type',{
			configurable: false,
			enumerable: true,
			writable: false,
			value: config.type,
		});

		Object.defineProperty(this,'target',{
			configurable: false,
			enumerable: true,
			writable: false,
			value: config.target,
		});

		Object.defineProperty(this,'name',{
			configurable: false,
			enumerable: true,
			writable: false,
			value: this.constructor.name.replace(/^/,''),
		});
		Object.defineProperty(this,'selector',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: config.selector || null,
		});
	}
}

class SyncEvent extends Event{
	static SYNC_TYPE_READ = 'read';
	static SYNC_TYPE_WRITE = 'write';
	static SYNC_TYPE_DELETE = 'delete';
	constructor(config){
		config.type = 'sync';
		super(config);

		Object.defineProperty(this,'syncType',{
			configurable: false,
			enumerable: true,
			writable: false,
			value: config.syncType,
		});

		Object.defineProperty(this,'isRead',{
			configurable: false,
			enumerable: true,
			writable: false,
			value: config.syncType == SyncEvent.SYNC_TYPE_READ
		});

		Object.defineProperty(this,'isWrite',{
			configurable: false,
			enumerable: true,
			writable: false,
			value: config.syncType == SyncEvent.SYNC_TYPE_WRITE
		});

		Object.defineProperty(this,'isDelete',{
			configurable: false,
			enumerable: true,
			writable: false,
			value: config.syncType == SyncEvent.SYNC_TYPE_DELETE
		});

		Object.defineProperty(this,'isTargetUpdated',{
			configurable: false,
			enumerable: true,
			writable: false,
			value: !!config.targetUpdated,
		});
	}
}

class ModelEvent extends Event{
	constructor(config){
		super(config);

		Object.defineProperty(this,'collection',{
			configurable: false,
			enumerable: true,
			writable: false,
			value: config.collection,
		});
	}
}

class ValidationEvent extends Event{
	constructor(config){
		config.type = 'validate';
		super(config);

		Object.defineProperty(this,'property',{
			configurable: false,
			enumerable: true,
			writable: false,
			value: this.selector,
		});

		Object.defineProperty(this,'isValid',{
			configurable: false,
			enumerable: true,
			writable: false,
			value: !!config.isValid,
		});
	}
}

class CollectionEvent extends Event{
	constructor(config){
		super(config);

		Object.defineProperty(this,'model',{
			configurable: false,
			enumerable: true,
			writable: false,
			value: config.model || null,
		});

		Object.defineProperty(this,'index',{
			configurable: false,
			enumerable: true,
			writable: false,
			value: config.index,
		});
	}
}

class PropertyChangeEvent extends Event{
	constructor(config){
		config.type = 'change';
		super(config);
		Object.defineProperty(this,'property',{
			configurable: false,
			enumerable: true,
			writable: false,
			value: this.selector,
		});

		Object.defineProperty(this,'value',{
			configurable: false,
			enumerable: true,
			writable: false,
			value: config.value,
		});

		Object.defineProperty(this,'oldValue',{
			configurable: false,
			enumerable: true,
			writable: false,
			value: config.oldValue,
		});
	}
}

class ErrorEvent extends Event{
	constructor(config){
		config.type = 'error';
		super(config);

		Object.defineProperty(this,'error',{
			configurable: false,
			enumerable: true,
			writable: false,
			value: config.error,
		});

		Object.defineProperty(this,'errorType',{
			configurable: false,
			enumerable: true,
			writable: false,
			value: config.errorType,
		});

		Object.defineProperty(this,'errorMessage',{
			configurable: false,
			enumerable: true,
			writable: false,
			value: config.errorMessage,
		});
	}
}

class EventListenerRecord{
	//#TODO: beautify selector access config
	#timeout;
	#repeatCount;
	#modifiers;
	#callback;
	#context;
	#selector;
	#values = {};	//For multi-selector events
	#oldValues = {};	//For multi-selector events
	#isMarkedForRemoval = false;	//Scheduled for removal
	scheduledTimerId = null;	//Scheduled for async execution
	currentCount = 0;
	constructor(config){
		this.#selector = config.selector || null;
		this.#modifiers = config.modifiers || [];
		this.#callback = config.callback;
		this.#context = config.context || null;
		this.#timeout = +config.timeout || 0;
		this.#repeatCount = +config.repeatCount || -1;
	}
	get selector(){
		return this.#selector;
	}
	get modifiers(){
		return this.#modifiers;
	}
	get callback(){
		return this.#callback;
	}
	get context(){
		return this.#context;
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
	addSelector(selector,value,oldValue){
		this.#values[selector] = value;
		this.#oldValues[selector] = oldValue;
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
	constructor(config){
		let listeners = {};
		const eventTypeRegex = /^(?<type>[a-z]+)(:(?<selector>\$?[a-zA-Z0-9_]+))?(?<modifiers>(\.[a-z0-9]+)+)?$/;
		const timeoutRegex = /^[0-9]+$/;
		const repeatRegex = /^x[1-9][0-9]*$/;

		Object.defineProperty(this,'$listeners',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: listeners,
		});

		Object.defineProperty(this,'$clearListeners',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: ()=>{
				listeners = {};
			}});

		Object.defineProperty(this,'$on',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: (types,callback,context=null)=>{
				if(typeof callback != 'function')
					throw new Error(`Invalid callback argument (expected function): ${typeof callback}`);
				// if(context !== undefined && context !== null && typeof callback.prototype != 'object')
				// 	throw new Error(`A callback context cannot be provided for arrow functions`);
				for(let typeString of types.split(/\s+/)){
					const parts = typeString.match(eventTypeRegex);
					if(parts === null){
						throw new Error(`Invalid event type format "${typeString}"`);
					}
					if(!(parts.groups.type in config.eventTypes))
						throw new Error(`Invalid event type "${parts.groups.type}"`);
					if(parts.groups.selector !== undefined){
						if(!config.eventTypes[parts.groups.type].allowSelectors)
							throw new Error(`Selectors not allowed for event type "${parts.groups.type}"`);
						if(parts.groups.type == 'change' && !config.propertyNames.includes(parts.groups.selector))
							throw new Error(`Invalid event selector "${parts.groups.selector}". Allowed: ${config.propertyNames.join(', ')}`);
						if(parts.groups.type == 'error' && !['create','read','update','save','delete'].includes(parts.groups.selector))
							throw new Error(`Invalid event selector "${parts.groups.selector}". Allowed: create, read, update, delete`);
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
								case 'read':
								case 'write':
								case 'delete':
								case 'updated':
								case 'valid':
								case 'invalid':
									modifiers.push(modifier);
									break;
								default:
									throw new Error(`Invalid event modifier "${modifier}"`);
							}
						}
					}
					if(!(parts.groups.type in listeners))
						listeners[parts.groups.type] = [];
					const record = new EventListenerRecord({
						selector: parts.groups.selector,
						modifiers,
						callback,
						context:context || this,
						timeout,
						repeatCount
					});
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
					if(parts.groups.selector !== undefined){
						if(!config.eventTypes[parts.groups.type].allowSelectors)
							throw new Error(`Selectors not allowed for event type "${parts.groups.type}"`);
						if(!config.propertyNames.includes(parts.groups.selector))
							throw new Error(`Invalid event selector "${parts.groups.selector}". Allowed: ${config.propertyNames.join(', ')}`);
					}
					if(parts.groups.modifiers !== undefined)
						throw new Error(`Event modifiers not allowed on $off()`);
					if(!(parts.groups.type in listeners))
						continue;
					listeners[parts.groups.type] = listeners[parts.groups.type].filter(record=>{
						if(parts.groups.selector !== undefined && record.selector != parts.groups.selector)
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

		//#TODO: allow multiple trigger selectors
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
					if(record.selector !== null && event.selector !== null && record.selector != event.selector)
						continue;
					if(record.modifiers.length > 0){
						if(event instanceof SyncEvent){
							if(record.modifiers.includes('read') && event.syncType != SyncEvent.SYNC_TYPE_READ){
								continue;
							}
							if(record.modifiers.includes('write') && event.syncType != SyncEvent.SYNC_TYPE_WRITE){
								continue;
							}
							if(record.modifiers.includes('delete') && event.syncType != SyncEvent.SYNC_TYPE_DELETE){
								continue;
							}
							if(record.modifiers.includes('updated') && !event.isTargetUpdated){
								continue;
							}
						}
						if(event instanceof ValidationEvent){
							if(record.modifiers.includes('valid') && !event.isValid){
								continue;
							}
							if(record.modifiers.includes('invalid') && event.isValid){
								continue;
							}
						}
						if(record.modifiers.includes('sync')){
							if(event instanceof PropertyChangeEvent)
								record.addSelector(event.selector,event.value,event.oldValue);
							record.callback.call(record.context,event,record);
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
						record.addSelector(event.selector,event.value,event.oldValue);
					record.scheduledTimerId = setTimeout(() => {
						record.callback.call(record.context,event,record);
						if(record.isMarkedForRemoval || record.repeatCount > 0 && ++record.currentCount >= record.repeatCount)
							listeners[event.type].splice(listeners[event.type].indexOf(record),1);
						record.reset();
					}, record.timeout);
				}
			}
		});

		if(!isPlainObject(config.classEvents) && !Array.isArray(config.classEvents))
			throw new Error(`Invalid config classEvents type: ${config.classEvents}`);
		if(!isPlainObject(config.instanceEvents) && !Array.isArray(config.instanceEvents))
			throw new Error(`Invalid config instanceEvents type: ${config.instanceEvents}`);

		if(isPlainObject(config.classEvents)){
			for(let type in config.classEvents){
				this.$on(type,config.classEvents[type]);	
			}
		}
		if(Array.isArray(config.classEvents)){
			config.classEvents.forEach(row=>{
				this.$on(row[0],row[1],row[2]);
			});
		}

		if(isPlainObject(config.instanceEvents)){
			for(let type in config.instanceEvents){
				this.$on(type,config.instanceEvents[type]);	
			}
		}
		if(Array.isArray(config.instanceEvents)){
			config.instanceEvents.forEach(row=>{
				this.$on(row[0],row[1],row[2]);
			});
		}
	}
}

export { Event, SyncEvent,PropertyChangeEvent, ErrorEvent ,EventTarget, ModelEvent, CollectionEvent, ValidationEvent }