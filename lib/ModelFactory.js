import { StorageBase } from "./Persistence.js";

class Model{
	constructor(config){

		Object.defineProperty(this,'$className',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: config.className || 'Model',
		});

		if(!config.hasOwnProperty('props') || typeof config.props !== 'object' || Object.keys(config.props).length === 0)
			throw new Error(`Missing/invalid/empty props property`);

		let propNames = [];	//List of property names
		let propTypes = {};	//List of property types
		let propDefaults = {};	//List of property default values
		let propValidators = {};	//List of property validators
		let propState = {};	//Keeps track of property values
		let propPersistentState = {};	//Keeps track of property persistent values (as they are in storage)

		for(let propName of Object.keys(config.props)){
			if(propName.startsWith('$'))
				throw new Error(`Property name cannot start with $`);

			propTypes[propName] = typeof config.props[propName];
			propDefaults[propName] = config.props[propName];
			propState[propName] = config.props[propName];

			Object.defineProperty(this,propName,{
				configurable: false,
				enumerable: true,
				get: () => propState[propName],
				set: (val) => {
					if(typeof val !== propTypes[propName])
						throw new Error(`Invalid property type for (${propName})=>${propTypes[propName]}: (${val})=>${typeof val}`);
					propState[propName] = val;
					return this;
				},
			});
			propNames.push(propName);
		}

		Object.defineProperty(this,'$propDefaults',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: propDefaults,
		});
		Object.freeze(this.$propDefaults);

		Object.defineProperty(this,'$propNames',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: propNames,
		});
		Object.freeze(this.$propNames);

		Object.defineProperty(this,'$propTypes',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: propTypes,
		});
		Object.freeze(this.$propTypes);

		Object.defineProperty(this,'$propState',{
			configurable: false,
			enumerable: false,
			get: ()=>Object.assign({},propState),
		});

		Object.defineProperty(this,'$propPersistentState',{
			configurable: false,
			enumerable: false,
			get: () => Object.assign({},propPersistentState),
		});

		Object.defineProperty(this,'$serialize',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: (options={}) => {
				options = Object.assign({ changesOnly: false },options);
				const data = {};
				for(let propName of this.$propNames){
					if(options.changesOnly && propState[propName] === propPersistentState[propName])
						continue;
					data[propName] = propState[propName];
				}
				return data;
			},
		});
		Object.defineProperty(this,'$unserialize',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: (data) => {
				if(!data || typeof data !== 'object')
					throw new Error(`Missing/invalid data object: ${data}`);

				let isUpdated = false;
				for(let propName of this.$propNames){
					if(!data.hasOwnProperty(propName)){
						propPersistentState[propName] = null;
						continue;
					}
					propPersistentState[propName] = data[propName];
					if(propState[propName] === data[propName])
						continue;
					propState[propName] = data[propName];
					isUpdated = true;
				}
				return isUpdated;
			},
		});
		Object.defineProperty(this,'$update',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: (data) => {
				if(!data || typeof data !== 'object')
					throw new Error(`Missing/invalid data object`);

				for(let propName of this.$propNames){
					if(!data.hasOwnProperty(propName))
						continue;
					propState[propName] = data[propName];
				}
				return this;
			},
		});
	}
}

class PersistentModel extends Model{
	$isNew = true;
	$key = null;
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

	}
	/*
	 * @param {Object} options
	 * @param {Function} options.onProgress
	 * @returns {Promise<Boolean | null>}	//True if updated, false if not updated, null if not found
	 * @throws {Object} { errorType: 'storage', error: Error }
	 * @throws {Object} { errorType: 'format', error: Error, errorStack: Array }
	 * */
	async $fetch(options={}){
		const request = {
			key: this.$key,
			entityName: this.$storageEntityName,
			onProgress: options.onProgress || null,
		};
		let data = null;
		try{
			data = await this.$storage.read(request);
			if(data === null)
				return null;
		}catch(err){
			throw {
				errorType: 'storage',
				error: err
			};
		}

		try{
			let isUpdated = this.$unserialize(data);
			if(data.hasOwnProperty('id'))
				this.$key = data.id;
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
		options = Object.assign({ updatePersistentState: true, changesOnly: true},options);
		if(!this.$storage.isPartialUpdateSupported())
			options.changesOnly = false;
		const data = this.$serialize({ changesOnly: options.changesOnly });
		if(Object.keys(data).length === 0){	//No changes
			return;
		}

		const request = {
			entityName: this.$storageEntityName,
			data: data,
		};
		let json = null;
		if(this.$isNew){	//Create
			try{
				json = await this.$storage.create(request);
			}catch(err){
				return Promise.reject({
					errorType: 'storage',
					error: err
				});
			}
		}else{	//Update
			try{
				request.key = this.$key;
				request.patch = !!options.changesOnly;
				json = await this.$storage.update(request);
			}catch(err){
				return Promise.reject({
					errorType: 'storage',
					error: err
				});
			}
		}
			
		try{
			if(options.updatePersistentState)
				this.$unserialize(json);
		}catch(err){
			return Promise.reject({
				errorType: 'format',
				error: err,
			});
		}
		this.$isNew = false;
	}
}

const ModelFactory = {
	create(config=null){
		if(!config || typeof config !== 'object') throw new Error(`Missing/invalid config object`);

		const ModelClass = class extends Model{
			constructor(_config={}){
				Object.assign(config,_config);
				super(config);
				Object.seal(this);
			}
		}
		return ModelClass;
	},
	createPersistent(config=null){
		if(!config || typeof config !== 'object') throw new Error(`Missing/invalid config object`);

		const PersistentModelClass = class extends PersistentModel{
			constructor(_config={}){
				Object.assign(config,_config);
				super(config);
				Object.seal(this);
			}
		}
		return PersistentModelClass;
	}
}

export { ModelFactory };