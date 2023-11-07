import { StorageBase } from "./Storages.js";

class Collection{
	constructor(config){
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
			value: (model,atIndex=-1)=>{
				if(!Number.isInteger(atIndex))
					throw new Error(`Index is not an integer: ${atIndex}`);
				if(!(model instanceof this.$modelClass)){
					if(Object.getPrototypeOf(model) !== Object.prototype)
						throw new Error(`Invalid model type: ${model}`);
					const $key = model.hasOwnProperty('$key') && Number.isInteger(model.$key) ? model.$key : null;
					model = new this.$modelClass(model);
					if($key !== null){
						model.$setKey($key);
					}
				}
				model.$setCollectionKey(lastCollectionModelKey++);
				if(atIndex == -1){
					items.push(model);
					return model.$ckey;
				}else if(atIndex < -1)
					atIndex++;
				items.splice(atIndex,0,model);
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
				return items.splice(index,1)[0];
			}
		});

		Object.defineProperty(this,'$removeOne',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: (filter)=>{
				const ind = this.$indexWhere(filter);
				if(ind == -1)
					return null;
				return items.splice(ind,1)[0];
			}
		});

		Object.defineProperty(this,'$removeWhere',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: (filter)=>{
				let ind;
				if(typeof filter === 'function'){
					while((ind = items.findIndex(filter)) != -1){
						items.splice(ind,1);
					};
					return;
				}
				if(typeof filter === 'number'){
					while((ind = items.findIndex(item => item.$ckey == filter)) != -1){
						items.splice(ind,1);
					};
					return;
				}
				if(Object.getPrototypeOf(filter) === Object.prototype){
					while((ind = items.findIndex(item => {
							for(let key of Object.keys(filter)){
								if(item.hasOwnProperty(key) && item[key] == filter[key])
									return true;
							}
							return false;
						})) != -1
					){
						items.splice(ind,1);
					};
					return;
				}
				throw new Error(`Invalid filter parameter type: ${filter}=>${typeof filter}`);
			}
		});

		Object.defineProperty(this,'$reset',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: ()=>{
				items.splice(0,items.length);
				lastCollectionModelKey = 1;
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
					if(typeof item !== 'object')
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
						this.$add(item);
						isUpdated = true;
					}else{
						items.push(model);
						const _isUpdated = model.$unserialize(item);
						isUpdated ||= _isUpdated;
					}
				}
				return isUpdated;
			}
		});
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
		};

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
			});
			this.$isNew = false;
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
			updateFromStorage: true,
			updatePersistentState: true,
			changesOnly: true,
			runValidation: true,
			runFullValidation: false,
		},options);
		if(!this.$storage.isPartialUpdateSupported())
			options.changesOnly = false;

		let isSuccessful = true;
		let errors = [];
		for(let model of this.$items){
			try{
				isSuccessful &&= await model.$save(options);
			}catch(e){
				isSuccessful = false;
				errors.push(e);
			}
		}
		if(errors.length > 0)
			return Promise.reject(errors);
		return isSuccessful;
	}
}

const CollectionFactory = {
	create(config=null){
		if(!config || typeof config !== 'object') throw new Error(`Missing/invalid config object`);

		const CollectionClass = class extends Collection{
			constructor(){
				super(config);
				Object.seal(this);
				if(config.hasOwnProperty('onCreated') && typeof config.onCreated === 'function')
					config.onCreated(this);
			}
		}
		return CollectionClass;
	},
	createPersistent(config=null){
		if(!config || typeof config !== 'object') throw new Error(`Missing/invalid config object`);

		const PersistentCollectionClass = class extends PersistentCollection{
			constructor(){
				super(config);
				Object.seal(this);
				if(config.hasOwnProperty('onCreated') && typeof config.onCreated === 'function')
					config.onCreated(this);
			}
		}
		return PersistentCollectionClass;
	}
}

export { CollectionFactory };