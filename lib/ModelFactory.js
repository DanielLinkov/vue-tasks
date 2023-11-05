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
		let propErrors = {};	//List of property errors
		let propState = {};	//Keeps track of property values
		let propPersistentState = {};	//Keeps track of property persistent values (as they are in storage)
		let propTickState = {};		//Keeps track of property tick values (as they were last time $tick() was called)
		let watchCallbacks = {};	//List of property watch callbacks
		let tickTimerId = null;		//Timer id for $tick()
		let tickTimerTimeout = 0;	//Timer interval for $tick()

		const regexPropName = /^[a-zA-Z_][a-zA-Z0-9_]+$/;
		for(let propName of Object.keys(config.props)){
			if(regexPropName.test(propName) === false)
				throw new Error(`Invalid property name: '${propName}'`);

			propTypes[propName] = typeof config.props[propName];
			propDefaults[propName] = config.props[propName];
			propState[propName] = config.props[propName];
			propTickState[propName] = config.props[propName];

			Object.defineProperty(this,propName,{
				configurable: false,
				enumerable: true,
				get: () => propState[propName],
				set: (val) => {
					if(typeof val !== propTypes[propName])
						throw new Error(`Invalid property type for (${propName})=>${propTypes[propName]}: (${val})=>${typeof val}`);
					if(propState[propName] !== val){
						propState[propName] = val;
						this.$scheduleTick();
					}
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

		Object.defineProperty(this,'$propTickState',{
			configurable: false,
			enumerable: false,
			get: () => Object.assign({},propTickState),
		});

		/*
		 * Returns the model properties as an object
		 * @param {Object} options
		 * @param {Boolean} options.changesOnly
		 * @returns {Object}
		 * */
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
		/*
		 * Updates the model properties and persistent state with the given data
		 * @param {Object} data
		 * @returns {Boolean}	//True if updated, false if not updated
		 * */
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
					this[propName] = data[propName];
					isUpdated = true;
				}
				return isUpdated;
			},
		});
		/*
		 * Updates the model properties with the given data
		 * @param {Object} data
		 * @returns {Model}
		 * */
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
					if(propState[propName] === data[propName])
						continue;
					this[propName] = data[propName];
				}
				return this;
			},
		});

		Object.defineProperty(this,'$reset',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: () => {
				for(let propName of this.$propNames){
					propState[propName] = propDefaults[propName];
				}
				return this;
			}
		});

		/*
		 * Adds a watcher for a specific property
		 * @param {String} propName
		 * @param {Function} callback
		 * @param {Boolean} immediate	- invoke callback immediately
		 * @returns {Function}	//Unwatch function
		 * */
		Object.defineProperty(this,'$watch',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: (propName,callback,options) => {
				if(!propNames.includes(propName))
					throw new Error(`Invalid property name: ${propName}`);
				if(typeof callback !== 'function')
					throw new Error(`Invalid callback parameter`);

				options = Object.assign({ immediate: false },options);

				if(!watchCallbacks.hasOwnProperty(propName))
					watchCallbacks[propName] = [];

				watchCallbacks[propName].push(callback);

				const fnUnwatch = ()=>{
					const index = (watchCallbacks[propName] || []).indexOf(callback);
					if(index !== -1)
						watchCallbacks[propName].splice(index,1);
				}
				if(options.immediate){
					callback(propState[propName],fnUnwatch);
				}
				return fnUnwatch;
			}
		});
		
		Object.defineProperty(this,'$unwatch',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: (propName,callback) => {
				if(!propNames.includes(propName))
					throw new Error(`Invalid property name: ${propName}`);
				if(typeof callback !== 'function')
					throw new Error(`Invalid callback parameter`);

				if(!watchCallbacks.hasOwnProperty(propName))
					return;
				const index = (watchCallbacks[propName] || []).indexOf(callback);
				if(index !== -1)
					watchCallbacks[propName].splice(index,1);
			}
		});

		/*
		 * Resets all watchers or a specific watcher
		 * @param {String} propName
		 * */
		Object.defineProperty(this,'$resetWatchers',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: (propName = null) => {
				if(propName !== null)
					delete watchCallbacks[propName];
				else
					watchCallbacks = {};
			}
		});

		Object.defineProperty(this,'$callWatchers',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: (propName) => {
				if(!watchCallbacks.hasOwnProperty(propName))
					return;
				const val = propState[propName];
				(watchCallbacks[propName] || []).forEach((callback)=>{
					const fnUnwatch = ()=>{
						const index = (watchCallbacks[propName] || []).indexOf(callback);
						if(index !== -1)
							watchCallbacks[propName].splice(index,1);
					}
					callback(val,fnUnwatch);
				});
			}
		});

		Object.defineProperty(this,'$tick',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: () => {
				if(tickTimerId !== null){
					clearTimeout(tickTimerId);
					tickTimerId = null;
				}
				for(let propName of this.$propNames){
					if(propTickState[propName] === propState[propName])
						continue;
					this.$callWatchers(propName);
					propTickState[propName] = propState[propName];
				}
			}
		});

		Object.defineProperty(this,'$setTickInterval',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: (timeout) => {
				if(typeof timeout !== 'number')
					throw new Error(`Invalid timeout parameter`);
				tickTimerTimeout = timeout;
			}
		});

		Object.defineProperty(this,'$scheduleTick',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: () => {
				if(tickTimerId !== null)
					return;
				tickTimerId = setTimeout(()=>{
					this.$tick();
				},tickTimerTimeout);
			}
		});

		Object.defineProperty(this,'$cancelTick',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: () => {
				if(tickTimerId === null)
					return;
				clearTimeout(tickTimerId);
				tickTimerId = null;
			}
		});
		
		Object.defineProperty(this,'$isTickScheduled',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: () => {
				return tickTimerId !== null;
			}
		});

		//Validation

		Object.defineProperty(this,'$addValidator',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: (propName,callback) => {
				if(!propNames.includes(propName))
					throw new Error(`Invalid property name: ${propName}`);
				if(typeof callback !== 'function')
					throw new Error(`Invalid callback parameter`);
				if(!propValidators.hasOwnProperty(propName))
					propValidators[propName] = [];
				propValidators[propName].push(callback);
			}
		});
		
		if(config.hasOwnProperty('validators')){
			if(typeof config.validators !== 'object')
				throw new Error(`Invalid validators type`);

			for(let propName of Object.keys(config.validators)){
				if(!propNames.includes(propName))
					throw new Error(`Invalid property name: ${propName}`);
				if(typeof config.validators[propName] !== 'function')
					throw new Error(`Invalid validator type for (${propName})=>${typeof config.validators[propName]}`);
				this.$addValidator(propName,config.validators[propName]);
			}
		}

		Object.defineProperty(this,'$removeValidator',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: (propName,callback) => {
				if(!propNames.includes(propName))
					throw new Error(`Invalid property name: ${propName}`);
				if(typeof callback !== 'function')
					throw new Error(`Invalid callback parameter`);
				if(!propValidators.hasOwnProperty(propName))
					return;
				const index = (propValidators[propName] || []).indexOf(callback);
				if(index !== -1)
					propValidators[propName].splice(index,1);
			}
		});
		
		Object.defineProperty(this,'$validate',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: (propName=null) => {
				if(propName !== null && !propNames.includes(propName))
					throw new Error(`Invalid property name: ${propName}`);
				this.$clearErrors(propName);
				const _propNames = propName ? [propName] : propNames;
				for(let propName of _propNames){
					if(!propValidators.hasOwnProperty(propName))
						continue;
					const val = propState[propName];
					(propValidators[propName] || []).forEach((callback)=>{
						try{
							callback(val,this,(err)=>{
								this.$addError(propName,err);
							});
						}catch(err){
							this.$addError(propName,err.message);
						}
					});
				}
			}
		});

		Object.defineProperty(this,'$clearErrors',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: (propName=null) => {
				if(propName !== null && !propNames.includes(propName))
					throw new Error(`Invalid property name: ${propName}`);
				if(propName !== null){
					delete propErrors[propName];
				}else{
					propErrors = {};
				}
			}
		});

		Object.defineProperty(this,'$addError',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: (propName,err) => {
				if(!propNames.includes(propName))
					throw new Error(`Invalid property name: ${propName}`);
				if(!propErrors.hasOwnProperty(propName))
					propErrors[propName] = [];
				propErrors[propName].push(err);
			}
		});

		Object.defineProperty(this,'$getErrors',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: (propName=null) => {
				if(propName !== null && !propNames.includes(propName))
					throw new Error(`Invalid property name: ${propName}`);
				if(propName !== null)
					return propErrors[propName] || [];
				return propErrors;
			}
		});

		Object.defineProperty(this,'$getFirstErrors',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: () => {
				const obj = {};
				for(let propName of this.$propNames)
					if(propErrors.hasOwnProperty(propName) && propErrors[propName].length > 0)
						obj[propName] = propErrors[propName][0];
				return obj;
			}
		});

		Object.defineProperty(this,'$hasErrors',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: (propName=null) => {
				if(propName !== null && !propNames.includes(propName))
					throw new Error(`Invalid property name: ${propName}`);
				if(propName !== null)
					return propErrors.hasOwnProperty(propName);
				return Object.keys(propErrors).length > 0;
			}
		});

		Object.defineProperty(this,'$getError',{
			configurable: false,
			enumerable: false,
			value: (propName) => {
				if(!propNames.includes(propName))
					throw new Error(`Invalid property name: ${propName}`);
				return (propErrors[propName] || []).shift() || null;
			},
		});
		
		Object.defineProperty(this,'$errors',{
			configurable: false,
			enumerable: false,
			get: () => {
				const obj = {};
				for(let propName of this.$propNames)
					obj[propName] = propErrors[propName] || [];	
				return obj;
			}
		});
		
		Object.defineProperty(this,'$error',{
			configurable: false,
			enumerable: false,
			get: () => {
				const obj = {};
				for(let propName of this.$propNames)
					obj[propName] = (propErrors[propName] || []).shift() || null;	
				return obj;
			}
		});
	}
}

class PersistentModel extends Model{
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

		Object.defineProperty(this,'$isNew',{
			configurable: false,
			enumerable: false,
			writable: true,
			value: true,
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
		options = Object.assign({ updatePersistentState: true, changesOnly: true, runValidation: true},options);
		if(!this.$storage.isPartialUpdateSupported())
			options.changesOnly = false;
		const data = this.$serialize({ changesOnly: options.changesOnly });
		if(Object.keys(data).length === 0){	//No changes
			return true;
		}

		if(options.runValidation){
			for(let propName of Object.keys(data)){
				this.$validate(propName);
			}
			if(this.$hasErrors())
				return false;
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
			else
				this.$update(json);
		}catch(err){
			return Promise.reject({
				errorType: 'format',
				error: err,
			});
		}
		this.$isNew = false;
		return true;
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