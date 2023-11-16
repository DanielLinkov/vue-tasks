import { isPlainObject } from "./Utils.js";
import { StorageBase } from "./Storage.js";
import { EventTarget,Event as _Event, CollectionEvent, SyncEvent } from "./Event.js";

class Collection extends EventTarget{
	constructor(config){
		super({
			eventTypes: {
				change: {
					allowSelectors: true,
				},
				reset: true,
				create: true,
				destroy: true,
				add: true,
				remove: true,
				delete:	true,
			},
			propertyNames : [...(config.eventPropertyNames || [])],
			classEvents : config.classEvents || {},
			instanceEvents : config.instanceEvents || {},
		});
		Object.defineProperty(this,'$className',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: config.className || 'Collection',
		});
		
		if(!config.hasOwnProperty('modelClass') || typeof config.modelClass !== 'function')
			throw new Error(`Missing/invalid modelClass: ${config.modelClass}`);

		Object.defineProperty(this,'$modelClass',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: config.modelClass,
		});

		Object.defineProperty(this,'$modelCollectionKeyName',{
			configurable: false,
			enumerable: true,
			writable: false,
			value: config.modelCollectionKeyName || null,
		});

		Object.defineProperty(this,'$modelCollectionKeyValue',{
			configurable: false,
			enumerable: true,
			writable: false,
			value: config.modelCollectionKeyValue || null,
		});

		const items = [];
		let lastCollectionModelKey = 1;

		Object.defineProperty(this,'$items',{
			configurable: false,
			enumerable: false,
			get: ()=>items,
		});

		Object.defineProperty(this,'$at',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: (index)=>{
				if(typeof index !== 'number')
					throw new Error(`Invalid index type: ${index}`);
				if(index < 0 || index >= items.length)
					return null;
				return items[index];
			}
		});

		Object.defineProperty(this,'$one',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: (filter)=>{
				if(typeof filter === 'function'){
					return items.find(filter) || null;
				}
				if(typeof filter === 'number'){
					return items.find(item => item.$ckey == filter) || null;
				}
				if(Object.getPrototypeOf(filter) === Object.prototype){
					return items.find(item => {
						for(let key of Object.keys(filter)){
							if(!item.$propTypes.hasOwnProperty(key))
								throw new Error(`Invalid property name: ${key}`);
							if(item.$propTypes[key] !== typeof filter[key])
								throw new Error(`Invalid property type: ${key}=>${typeof filter[key]}`);
							if(item[key] != filter[key])
								return false;
						}
						return true;
					}) || null;
				}
				throw new Error(`Invalid filter parameter type: ${filter}=>${typeof filter}`);
			}
		});

		Object.defineProperty(this,'$all',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: (filter)=>{
				if(typeof filter === 'function'){
					return items.filter(filter);
				}
				if(typeof filter === 'number'){
					return items.filter(item => item.$ckey == filter);
				}
				if(Object.getPrototypeOf(filter) === Object.prototype){
					return items.filter(item => {
						for(let key of Object.keys(filter)){
							if(!item.$propTypes.hasOwnProperty(key))
								throw new Error(`Invalid property name: ${key}`);
							if(item.$propTypes[key] !== typeof filter[key])
								throw new Error(`Invalid property type: ${key}=>${typeof filter[key]}`);
							if(item[key] != filter[key])
								return false;
						}
						return true;
					});
				}
				throw new Error(`Invalid filter parameter type: ${filter}=>${typeof filter}`);
			}
		});

		Object.defineProperty(this,'$indexWhere',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: (filter)=>{
				if(typeof filter === 'function'){
					return items.findIndex(filter);
				}
				if(typeof filter === 'number'){
					return items.findIndex(item => item.$ckey == filter);
				}
				if(filter instanceof this.$modelClass){
					return items.findIndex(item => item === filter);
				}
				if(Object.getPrototypeOf(filter) === Object.prototype){
					return items.findIndex(item => {
						for(let key of Object.keys(filter)){
							if(item.hasOwnProperty(key) && item[key] == filter[key])
								return true;
						}
						return false;
					});
				}
				throw new Error(`Invalid filter parameter type: ${filter}=>${typeof filter}`);
			}
		});


		Object.defineProperty(this,'$add',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: (model,atIndex=-1,options={})=>{
				if(!Number.isInteger(atIndex))
					throw new Error(`Index is not an integer: ${atIndex}`);
				if(!(model instanceof this.$modelClass)){
					if(Object.getPrototypeOf(model) !== Object.prototype)
						throw new Error(`Invalid model type: ${model}`);
					const $key = model.hasOwnProperty('$key') && Number.isInteger(model.$key) ? model.$key : null;
					model = new this.$modelClass(model,{
						updatePersistentState: !!options.updatePersistentState
					});
					if($key !== null){
						model.$setKey($key);
					}
				}
				model.$setCollectionKey(lastCollectionModelKey++);
				model.$setParentCollection(this);
				if(atIndex <= -1)
					atIndex = items.length + atIndex + 1;
				items.splice(atIndex,0,model);
				this.$$trigger(new CollectionEvent({
					type: 'add',
					target: this,
					model: model,
					index: atIndex,
				}));
				return model.$ckey;
			}
		});

		Object.defineProperty(this,'$removeAt',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: (index)=>{
				if(typeof index !== 'number')
					throw new Error(`Invalid index type: ${index}`);
				if(index < 0 || index >= items.length)
					return null;
				const model = items.splice(index,1)[0];
				model.$setParentCollection(null);
				this.$$trigger(new CollectionEvent({
					type: 'remove',
					target: this,
					model: model,
					index: index,
				}));
				return model;
			}
		});

		Object.defineProperty(this,'$removeOne',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: (filter)=>{
				const index = this.$indexWhere(filter);
				if(index == -1)
					return null;
				const model = items.splice(index,1)[0];
				model.$setParentCollection(null);
				this.$$trigger(new CollectionEvent({
					type: 'remove',
					target: this,
					model: model,
					index: index,
				}));
				return model;
			}
		});

		Object.defineProperty(this,'$removeWhere',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: (filter)=>{
				let ind,_items=[];
				if(typeof filter === 'function'){
					while((ind = items.findIndex(filter)) != -1){
						_items = [..._items,...items.splice(ind,1)];
					};
				}else if(typeof filter === 'number'){
					while((ind = items.findIndex(item => item.$ckey == filter)) != -1){
						_items = [..._items,...items.splice(ind,1)];
					};
				}else if(Object.getPrototypeOf(filter) === Object.prototype){
					while((ind = items.findIndex(item => {
							for(let key of Object.keys(filter)){
								if(item.hasOwnProperty(key) && item[key] == filter[key])
									return true;
							}
							return false;
						})) != -1
					){
						_items = [..._items,...items.splice(ind,1)];
					};
				}else
					throw new Error(`Invalid filter parameter type: ${filter}=>${typeof filter}`);
				_items.forEach(item => item.$setParentCollection(null));
				return _items;
			}
		});

		Object.defineProperty(this,'$reset',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: ()=>{
				items.splice(0,items.length);
				lastCollectionModelKey = 1;
				this.$$trigger(new _Event({
					target: this,
					type: 'reset',
				}));
			}
		});

		Object.defineProperty(this,'$unserialize',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: (data,options={})=>{
				options = Object.assign({
					reset: true,
				},options);
				let oldItems = [];
				if(options.reset)
					this.$reset();
				else{
					oldItems = items.splice(0,items.length);
				}
				if(data === null)
					return false;
				if(!Array.isArray(data))
					throw new Error(`Invalid data type: ${data}`);
				let isUpdated = false;
				for(let item of data){
					if(!isPlainObject(item))
						throw new Error(`Invalid item type: ${item}`);
					if(!item.hasOwnProperty('$key'))
						throw new Error(`Missing key property: ${item}`);
					if(!Number.isInteger(item.$key))
						throw new Error(`Invalid key type: ${item.$key}`);
					let model;
					if(!options.reset){
						model = oldItems.find(model => model.$key == item.$key);
					}
					if(model === undefined){
						this.$add(item,-1,{updatePersistentState: true});
						isUpdated = true;
					}else{
						items.push(model);
						const _isUpdated = model.$unserialize(item);
						if(options.invokeModelSyncEvent)
							model.$$trigger(new SyncEvent({
								target: model,
								targetUpdated: _isUpdated,
								syncType: SyncEvent.SYNC_TYPE_READ
							}));
						isUpdated ||= _isUpdated;
					}
				}
				return isUpdated;
			}
		});
	}	
}

class StorageQuery{
	constructor(config){
		Object.defineProperty(this,'$storage',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: config.storage,
		});

		Object.defineProperty(this,'$storageEntityName',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: config.storageEntityName,
		});
	}

	async search(filter,setAbortControllerCallback=null){
		const request = {
			entityName: this.$storageEntityName,
			filter,
		};
		return await this.$storage.search(request,setAbortControllerCallback);
	}

}

class PersistentCollection extends Collection{
	constructor(config){
		super(config);
		if(!config.hasOwnProperty('storage'))
			throw new Error(`Missing storage property`);

		if(!(config.storage instanceof StorageBase))
			throw new Error(`Invalid storage type`);

		Object.defineProperty(this,'$storage',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: config.storage,
		});

		if(!(config.hasOwnProperty('storageEntityName')))
			throw new Error(`Missing storageEntityName property`);

		Object.defineProperty(this,'$storageEntityName',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: config.storageEntityName,
		});

		Object.defineProperty(this,'$isNew',{
			configurable: false,
			enumerable: false,
			writable: true,
			value: true,
		});
	}
	async $store(){
		const request = {
			entityName: this.$storageEntityName,
			data: []
		};
		try{
			await this.$storage.create(request);
		}catch(err){
			throw {
				errorType: 'storage',
				error: err,
			}
		}
		return true;
	}
	async $fetch(options={}){
		options = Object.assign({
			reset: false,
			$storage: this.$storage,
			$storageEntityName: this.$storageEntityName,
		},options);

		if(!options.hasOwnProperty('$storage'))
			throw new Error(`Missing storage property`);

		if(!(options.$storage instanceof StorageBase))
			throw new Error(`Invalid storage type`);

		const request = {
			entityName: options.$storageEntityName,
			onProgress: options.onProgress || null,
			query: options.query || null,
		};

		if(this.$modelCollectionKeyName !== null && this.$modelCollectionKeyValue !== null){
			request.query = request.query || {};
			request.query[this.$modelCollectionKeyName] = this.$modelCollectionKeyValue;
		}

		let data = null;
		try{
			data = await options.$storage.read(request);
			if(data === null || !Array.isArray(data))
				return null;
		}catch(err){
			throw {
				errorType: 'storage',
				error: err,
			}
		}
		const primaryKeyName = options.$storage.getPrimaryKeyName();
		data.forEach(item => {
			if(!item.hasOwnProperty(primaryKeyName))
				throw new Error(`Missing key property (${primaryKeyName}): ${JSON.stringify(item)}`);
			item.$key = item[primaryKeyName];
		});

		try{
			let isUpdated = this.$unserialize(data,{
				reset: options.reset,
				invokeModelSyncEvent: true,
			});
			this.$isNew = false;
			this.$$trigger(new SyncEvent({
				target: this,
				targetUpdated: isUpdated,
				syncType: SyncEvent.SYNC_TYPE_READ
			}));
			return isUpdated;
		}catch(err){
			throw {
				errorType: 'format',
				error: err.message,
				errorStack: err.stack.split('\n'),
			};
		}
	}
	async $save(options={}){
		options = Object.assign({
			$storage: this.$storage,
			$storageEntityName: this.$storageEntityName,
			updateFromStorage: false,
			updatePersistentState: true,
			changesOnly: true,
			runValidation: true,
			runFullValidation: false,
		},options);
		if(!this.$storage.isPartialUpdateSupported())
			options.changesOnly = false;

		if(this.$modelCollectionKeyName !== null && this.$modelCollectionKeyValue !== null){
			options.additionalProperties = options.additionalProperties || {};
			options.additionalProperties[this.$modelCollectionKeyName] = this.$modelCollectionKeyValue;
		}


		for(let model of this.$items){
			await model.$save(options);
		}
		return true;
	}

	async $delete(options={}){
		options = Object.assign({
			$storage: this.$storage,
			$storageEntityName: this.$storageEntityName,
			destroy: true,
		},options);
		for(let model of this.$items){
			await model.$delete(options);
		}
	}

	get $storageQuery(){
		return new StorageQuery({
			storage: this.$storage,
			storageEntityName: this.$storageEntityName,
		});
	}
}

const CollectionFactory = {
	create(config=null){
		if(!config || !isPlainObject(config)) throw new Error(`Missing/invalid config object`);
		if(config.hasOwnProperty('events')){
			config.classEvents = config.events;
			delete config.events;
		}

		const CollectionClass = class extends Collection{
			constructor(_config={}){
				if(_config.hasOwnProperty('events')){
					_config.instanceEvents = _config.events;
					delete _config.events;
				}
				const __config = Object.assign({},config,_config);
				delete __config.eventPropertyNames;
				super(__config);
				Object.seal(this);
				this.$$trigger(new _Event({
					type: 'create',
					target: this
				}));
			}
		}
		return CollectionClass;
	},
	createPersistent(config=null){
		if(!config || !isPlainObject(config)) throw new Error(`Missing/invalid config object`);
		if(config.hasOwnProperty('events')){
			config.classEvents = config.events;
			delete config.events;
		}

		const PersistentCollectionClass = class extends PersistentCollection{
			constructor(_config={}){
				if(_config.hasOwnProperty('events')){
					_config.instanceEvents = _config.events;
					delete _config.events;
				}
				const __config = Object.assign({},config,_config);
				delete __config.eventPropertyNames;
				super(__config);
				Object.seal(this);
				this.$$trigger(new _Event({
					type: 'create',
					target: this
				}));
			}
		}
		return PersistentCollectionClass;
	}
}

export { CollectionFactory, Collection, PersistentCollection };