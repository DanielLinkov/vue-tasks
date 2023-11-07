import { isPlainObject } from "lodash";
import { StorageBase } from "./Storages.js";
import { uuidv4 } from "./Utils.js";

class Model{
	constructor(config,defaults){
		Object.defineProperty(this,'$className',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: config.className || 'Model',
		});

		if(config.uuid?.length)
			Object.defineProperty(this,'$uuid',{
				configurable: false,
				enumerable: false,
				writable: false,
				value: config.uuid || null,
			});

		if(!config.hasOwnProperty('props') || !isPlainObject(config.props) || Object.keys(config.props).length === 0)
			throw new Error(`Missing/invalid/empty props property`);

		let propNames = [];	//List of property names
		let propTypes = {};	//List of property types
		let propDefaults = {};	//List of property default values
		let propValidators = {};	//List of property validators
		let propErrors = {};	//List of property errors
		let propValidated = {};	//List of property validated flags
		let propState = {};	//Keeps track of property values
		let propPersistentState = {};	//Keeps track of property persistent values (as they are in storage)
		let propTickState = {};		//Keeps track of property tick values (as they were last time $tick() was called)
		let watchCallbacks = {};	//List of property watch callbacks
		let tickTimerId = null;		//Timer id for $tick()
		let tickTimerTimeout = 0;	//Timer interval for $tick()
		let collection = null;	//Collection instance (if this model is part of a collection)
		let collectionKey = null;	//Collection key (if this model is part of a collection)
		let view = null;	//View instance (if this model is bound to a view)
		let isFrozen = false;	//If true properties cannot be updated
		let methods = {};	//List of methods
		let computed	= {};	//List of property methods

		setInterval(()=>{
			// console.log('tick',this.$className,collectionKey);
		},1000);

		Object.defineProperty(this,'$ckey',{
			configurable: false,
			enumerable: true,
			get: ()=>collectionKey,
		});

		Object.defineProperty(this,'$setCollectionKey',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: (key) => {
				if(typeof key !== 'number')
					throw new Error(`Invalid key type: ${key}=>${typeof key}`);
				collectionKey = key;
				return this;
			}
		});

		Object.defineProperty(this,'$collection',{
			configurable: false,
			enumerable: false,
			get: () => collection 
		});
		
		Object.defineProperty(this,'$setCollection',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: (c) => {
				collection = c;
				return this;
			}
		});

		Object.defineProperty(this,'$attachToView',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: (v) => {
				view = v;
				return this;
			}
		});

		Object.defineProperty(this,'$view',{
			configurable: false,
			enumerable: false,
			get: ()=>view,
		});
		
		Object.defineProperty(this,'$touchView',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: () => {
				if(view === null)
					return;
				view.touch();
				return this;
			}
		});

		Object.defineProperty(this,'$updateView',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: () => {
				if(view === null)
					return;
				view.update();
				return this;
			}
		});

		//Properties
		const regexPropName = /^[a-zA-Z_][a-zA-Z0-9_]+$/;
		for(let propName of Object.keys(config.props)){
			if(regexPropName.test(propName) === false)
				throw new Error(`Invalid property name: '${propName}'`);

			propTypes[propName] = typeof config.props[propName];
			const val = defaults.hasOwnProperty(propName) ? defaults[propName] : config.props[propName];

			propDefaults[propName] = val;
			propState[propName] = val;
			propTickState[propName] = val;

			Object.defineProperty(this,propName,{
				configurable: false,
				enumerable: true,
				get: () => propState[propName],
				set: (val) => {
					if(typeof val !== propTypes[propName])
						throw new Error(`Invalid property type for (${propName})=>${propTypes[propName]}: (${val})=>${typeof val}`);
					if(isFrozen)
						return this;
					if(propState[propName] !== val){
						propState[propName] = val;
						this.$scheduleTick();
					}
					return this;
				},
			});
			propNames.push(propName);
		}

		Object.defineProperty(this,'$freeze',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: () => {
				isFrozen = true;
			}
		});

		Object.defineProperty(this,'$unfreeze',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: () => {
				isFrozen = false;
			}
		});

		Object.defineProperty(this,'$isFrozen',{
			configurable: false,
			enumerable: false,
			get: () => isFrozen,
		});

		Object.defineProperty(this,'$propDefaults',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: propDefaults,
		});

		Object.defineProperty(this,'$propNames',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: propNames,
		});

		Object.defineProperty(this,'$propTypes',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: propTypes,
		});

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

		//Methods
		if(config.hasOwnProperty('methods')){
			if(!isPlainObject(config.methods))
				throw new Error(`Invalid methods type`);
			for(let methodName of Object.keys(config.methods)){
				if(typeof config.methods[methodName] !== 'function')
					throw new Error(`Invalid method type for (${methodName})=>${typeof config.methods[methodName]}`);
				methods[methodName] = config.methods[methodName];
				if(config.methods[methodName].length === 0){
					Object.defineProperty(computed,methodName,{
						configurable: false,
						enumerable: true,
						get: () => {
							return methods[methodName].call(this);
						},
					});
				}
			}
		}
		Object.defineProperty(this,'$call',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: (method,...args) => {
				if(!methods.hasOwnProperty(method))
					throw new Error(`Method not found: ${method}`);
				return methods[method].apply(this,args);
			}
		});

		Object.defineProperty(this,'$computed',{
			configurable: false,
			enumerable: false,
			get: () => computed,
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
				if(!data || !isPlainObject(data))
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
				if(!data || !isPlainObject(data))
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

		/*
		 * Resets all properties to their default values
		 * @returns {Model}
		 * */
		Object.defineProperty(this,'$reset',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: () => {
				this.$update(propDefaults);
				return this;
			}
		});

		/*
		 * Reverts all properties to their persistent values
		 * @returns {Model}
		 * */
		Object.defineProperty(this,'$revert',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: () => {
				this.$update(propPersistentState);
				return this;
			}
		});

		Object.defineProperty(this,'$resetPersistentState',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: () => {
				propPersistentState = Object.assign({},propState);
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
					callback(propState[propName],propName,this,fnUnwatch);
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
					callback(val,propName,this,fnUnwatch);
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
			if(!isPlainObject(config.validators))
				throw new Error(`Invalid validators type`);

			for(let propName of Object.keys(config.validators)){
				if(!propNames.includes(propName))
					throw new Error(`Invalid property name: ${propName}`);
				if(typeof config.validators[propName] !== 'function' && !Array.isArray(config.validators[propName]))
					throw new Error(`Invalid validator type for (${propName})=>${typeof config.validators[propName]}`);
				let callbacks;
				if(Array.isArray(config.validators[propName]))
					callbacks = config.validators[propName];
				else
					callbacks = [config.validators[propName]];
				for(let callback of callbacks)
					this.$addValidator(propName,callback);
			}
		}

		Object.defineProperty(this,'$removeValidator',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: (propName,callback=null) => {
				if(!propNames.includes(propName))
					throw new Error(`Invalid property name: ${propName}`);
				if(callback !== null && typeof callback !== 'function')
					throw new Error(`Invalid callback parameter`);
				if(!propValidators.hasOwnProperty(propName))
					return;
				if(callback === null){
					delete propValidators[propName];
					return;
				}
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
				const _propTransforms = {};	//List of property transforms as returned by validators
				for(let propName of _propNames){
					propValidated[propName] = true;
					if(!propValidators.hasOwnProperty(propName))
						continue;
					let val = propState[propName];
					(propValidators[propName] || []).forEach((callback)=>{
						try{
							const ret = callback(val,this,(err)=>{
								this.$addError(propName,err);
							});
							if(ret !== undefined){
								val = ret;	//Chain transofmations
								_propTransforms[propName] = ret;
							}
						}catch(err){
							this.$addError(propName,err.message);
						}
					});
				}
				if(propName === null)
					return _propTransforms;
				return _propTransforms.hasOwnProperty(propName) ? _propTransforms[propName] : null;
			}
		});

		/*
		 * Checks if a model is validated
		 * @returns {Boolean}	//True if all properties with validators are run
		 * */
		Object.defineProperty(this,'$isValidated',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: (propName=null) => {
				if(propName !== null && !propNames.includes(propName))
					throw new Error(`Invalid property name: ${propName}`);
				if(propName !== null)
					return propValidated.hasOwnProperty(propName);
				return Object.keys(propValidated).length == Object.keys(propValidators).length;
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
					delete propValidated[propName];
				}else{
					propErrors = {};
					propValidated = {};
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
				return (propErrors[propName] || [])[0] || null;
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
					obj[propName] = (propErrors[propName] || [])[0] || null;	
				return obj;
			}
		});

		Object.defineProperty(this,'$destroy',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: () => {
				this.$cancelTick();
				this.$resetWatchers();
				this.$clearErrors();
				if(config.hasOwnProperty('onDestroyed') && typeof config.onDestroyed === 'function')
					config.onDestroyed(this);
			}
		});
	}
}

class PersistentModel extends Model{
	constructor(config,defaults){
		super(config,defaults);

		Object.defineProperty(this,'$storage',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: config.storage || null,
		});

		Object.defineProperty(this,'$storageEntityName',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: config.storageEntityName || null,
		});

		let $key = null;
		Object.defineProperty(this,'$isNew',{
			configurable: false,
			enumerable: false,
			get: () => this.$key === null,
		});

		Object.defineProperty(this,'$setKey',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: (key) => {
				if(key === null || key === undefined)
					throw new Error(`Invalid key: ${key}`);
				$key = key;
			}
		});
		Object.defineProperty(this,'$key',{
			configurable: false,
			enumerable: true,
			get: () => $key,
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
		options = Object.assign({
			$storage: this.$storage,
			$storageEntityName: this.$storageEntityName,
		},options);

		if(!options.hasOwnProperty('$storage'))
			throw new Error(`Missing storage property`);

		if(!(options.$storage instanceof StorageBase))
			throw new Error(`Invalid storage type`);

		const request = {
			key: this.$key,
			entityName: options.$storageEntityName,
			onProgress: options.onProgress || null,
		};
		let data = null;
		try{
			data = await options.$storage.read(request);
			if(data === null)
				return null;
		}catch(err){
			throw {
				errorType: 'storage',
				error: err
			};
		}

		try{
			const isUpdated = this.$unserialize(data);
			const primaryKeyName = options.$storage.getPrimaryKeyName(); 
			if(data.hasOwnProperty(primaryKeyName))
				this.$setKey(data[primaryKeyName]);
			else
				this.$setKey(-1);
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

		if(!options.hasOwnProperty('$storage'))
			throw new Error(`Missing storage property`);

		if(!(options.$storage instanceof StorageBase))
			throw new Error(`Invalid storage type`);

		if(!options.$storage.isPartialUpdateSupported())
			options.changesOnly = false;
		const data = this.$serialize({ changesOnly: options.changesOnly });
		if(Object.keys(data).length === 0){	//No changes
			return true;
		}

		if(options.runValidation){
			for(let propName of (options.runFullValidation ? this.$propNames : Object.keys(data))){
				this.$validate(propName);
			}
			if(this.$hasErrors())
				return false;
		}

		const request = {
			entityName: options.$storageEntityName,
			data: data,
		};
		let json = null;
		if(this.$isNew){	//Create
			try{
				json = await options.$storage.create(request);
				if(json.hasOwnProperty(options.$storage.getPrimaryKeyName()))
					this.$setKey(json[options.$storage.getPrimaryKeyName()]);
				else
					this.$setKey(-1);
			}catch(err){
				return Promise.reject({
					errorType: 'storage',
					error: err
				});
			}
		}else{	//Update
			try{
				request.key = this.$key !== null && this.$key != -1 ? this.$key : null;
				request.patch = !!options.changesOnly;
				json = await options.$storage.update(request);
			}catch(err){
				return Promise.reject({
					errorType: 'storage',
					error: err
				});
			}
		}
			
		try{
			if(options.updateFromStorage && json !== null){	//Update from storage
				if(options.updatePersistentState)
					this.$unserialize(json);
				else
					this.$update(json);
			}else{	//Don't update from returned data
				if(options.updatePersistentState)	//Reset persistent state to current state
					this.$resetPersistentState();
			}
		}catch(err){
			return Promise.reject({
				errorType: 'format',
				error: err,
			});
		}
		return true;
	}
	async $delete(options={}){
		options = Object.assign({
			$storage: this.$storage,
			$storageEntityName: this.$storageEntityName,
		},options);

		if(!options.hasOwnProperty('$storage'))
			throw new Error(`Missing storage property`);

		if(!(options.$storage instanceof StorageBase))
			throw new Error(`Invalid storage type`);

		const request = {
			key: this.$key,
			entityName: options.$storageEntityName,
		};
		return await options.$storage.delete(request);

	}
}

const ModelFactory = {
	create(config=null){
		if(!config || !isPlainObject(config)) throw new Error(`Missing/invalid config object`);

		const ModelClass = class extends Model{
			constructor(defaults={}){
				if(config.uuid)
					config.uuid = uuidv4();
				super(config,defaults);
				Object.seal(this);
				if(config.hasOwnProperty('onCreated') && typeof config.onCreated === 'function')
					config.onCreated(this);
			}
		}
		return ModelClass;
	},
	createPersistent(config=null){
		if(!config || !isPlainObject(config)) throw new Error(`Missing/invalid config object`);

		const PersistentModelClass = class extends PersistentModel{
			constructor(defaults={}){
				if(config.uuid)
					config.uuid = uuidv4();
				super(config,defaults);
				Object.seal(this);
				if(config.hasOwnProperty('onCreated') && typeof config.onCreated === 'function')
					config.onCreated(this);
			}
		}
		return PersistentModelClass;
	}
}

export { ModelFactory };