import { isPlainObject } from "./Utils.js";

class MMEvent{
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
			value: this.constructor.name.replace(/^MM/,''),
		});
	}
}

class MMSyncEvent extends MMEvent{
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
			value: config.syncType == MMSyncEvent.SYNC_TYPE_READ
		});

		Object.defineProperty(this,'isWrite',{
			configurable: false,
			enumerable: true,
			writable: false,
			value: config.syncType == MMSyncEvent.SYNC_TYPE_WRITE
		});

		Object.defineProperty(this,'isDelete',{
			configurable: false,
			enumerable: true,
			writable: false,
			value: config.syncType == MMSyncEvent.SYNC_TYPE_DELETE
		});

		Object.defineProperty(this,'isTargetUpdated',{
			configurable: false,
			enumerable: true,
			writable: false,
			value: !!config.targetUpdated,
		});
	}
}

class MMPropertyChangeEvent extends MMEvent{
	constructor(config){
		config.type = 'propertyChange';
		super(config);
		Object.defineProperty(this,'property',{
			configurable: false,
			enumerable: true,
			writable: false,
			value: config.property || null,
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

class MMErrorEvent extends MMEvent{
	constructor(config){
		config.type = 'error';
		super(config);
	}
}

class EventListenerRecord{
	//#TODO: beautify property access config
	#timeout;
	#repeatCount;
	#modifiers;
	#callback;
	#context;
	#property;
	#values = {};	//For multi-property events
	#oldValues = {};	//For multi-property events
	#isMarkedForRemoval = false;	//Scheduled for removal
	scheduledTimerId = null;	//Scheduled for async execution
	currentCount = 0;
	constructor(config){
		this.#property = config.property || null;
		this.#modifiers = config.modifiers || [];
		this.#callback = config.callback;
		this.#context = config.context || null;
		this.#timeout = +config.timeout || 0;
		this.#repeatCount = +config.repeatCount || -1;
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

class MMEventTarget{
	constructor(config){
		let listeners = {};
		const eventTypeRegex = /^(?<type>[a-z]+)(:(?<property>\$?[a-zA-Z0-9_]+))?(?<modifiers>(\.[a-z0-9]+)+)?$/;
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
				if(context !== undefined && context !== null && typeof callback.prototype != 'object')
					throw new Error(`A callback context cannot be provided for arrow functions`);
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
								case 'read':
								case 'write':
								case 'delete':
								case 'updated':
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
						property: parts.groups.property,
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
				if(!(event instanceof MMEvent))
					throw new Error(`Invalid event object`);
				if(!(event.type in listeners))
					return;
				for(let record of [...listeners[event.type]]){
					if(record.property !== null && (!(event instanceof MMPropertyChangeEvent) || record.property != event.property))
						continue;
					if(record.modifiers.length > 0){
						if(record.modifiers.includes('sync')){
							if(event instanceof MMPropertyChangeEvent)
								record.addProperty(event.property,event.value,event.oldValue);
							record.callback.call(record.context,event,record);
							if(record.isMarkedForRemoval || record.repeatCount > 0 && ++record.currentCount >= record.repeatCount){
								listeners[event.type].splice(listeners[event.type].indexOf(record),1);
								continue;
							}
							record.reset();
							continue;
						}
						if(event instanceof MMSyncEvent){
							if(record.modifiers.includes('read') && event.syncType != MMSyncEvent.SYNC_TYPE_READ){
								continue;
							}
							if(record.modifiers.includes('write') && event.syncType != MMSyncEvent.SYNC_TYPE_WRITE){
								continue;
							}
							if(record.modifiers.includes('delete') && event.syncType != MMSyncEvent.SYNC_TYPE_DELETE){
								continue;
							}
							if(record.modifiers.includes('updated') && !event.isTargetUpdated){
								continue;
							}
						}
					}
					if(record.scheduledTimerId){
						clearTimeout(record.scheduledTimerId);
					}
					if(event instanceof MMPropertyChangeEvent)
						record.addProperty(event.property,event.value,event.oldValue);
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

export { MMEvent, MMSyncEvent,MMPropertyChangeEvent, MMErrorEvent ,MMEventTarget }