import { StorageBase } from '../lib/Persistence.js';

/*
class PropertySet{
	constructor(propTemplates){
		const _props = {};
		for(let propName in propTemplates){
			/*
			const entry = propTemplates[propName];
			let type;
			if(Object.prototype === Object.getPrototypeOf(entry)){
				if(entry.hasOwnProperty('type'))
					type = entry.type;
				else if(entry.hasOwnProperty('default'))
					type = typeof entry.default;
				else
					throw new Error(`Missing both type and default value for property "${propName}": ${entry}`);
			}else{
			if(typeof entry == 'function'){	//Constructor
				if(entry.name.toLowerCase() == 'string'){
					type = 'string';
				}else if(entry.name.toLowerCase() == 'number'){
					type = 'number';
				}else if(entry.name.toLowerCase() == 'boolean'){
					type = 'boolean';
				}else if(entry.name.toLowerCase() == 'object'){
					type = 'object';
				}else if(entry.name.toLowerCase() == 'array'){
					type = 'array';
				}else{
					throw new Error(`Invalid type for property "${propName}"`);
				}
			}else if(['string','number','boolean'].includes(typeof entry)){
				type = typeof entry;
			}else if(typeof entry == 'object' && Object.prototype === Object.getPrototypeOf(entry)){
				type = 'object';
			}else if(typeof entry == 'object' && Array.prototype === Object.getPrototypeOf(entry)){
				type = 'array';
			}
			if(type === null)
				throw new Error(`Invalid template for property "${propName}": ${entry}`);

			Object.defineProperty(this,propName,{
				configurable: false,
				enumerable: true,
				get: () => _props[propName],
				set: (val) =>{ _props[propName] = val },
			});
			this[propName] = propTemplates[propName];
		}
		// Object.seal(this);
	}
}
*/

class PropertySet{
	constructor(props){
		for(let propName in props){
			const rxBS = new rxjs.BehaviorSubject(props[propName]);
			const rxS = new rxjs.Subject(props[propName]);
			let notifySubscribersS = true;
			let notifySubscribersBS = true;
			this[propName] = {
				get: () => rxBS.getValue(),
				set: (val,_notifySubscribers=true) => {
					notifySubscribersBS = notifySubscribersS = _notifySubscribers;
					rxS.next(val);
					rxBS.next(val);
				},
				subscribe: config => {
					if(config.immediate)
						rxBS.subscribe({
							next: val=>{
								if(!notifySubscribersBS){
									notifySubscribersBS = true;
									return;
								}
								config.next(val);
							},
						});
					else
						rxS.subscribe({
							next: val=>{
								if(!notifySubscribersS){
									notifySubscribersS = true;
									return;
								}
								config.next(val);
							},
						});
				},
			} 
		}
	}
}

class PersistentModelBase{
	props = null;
	key = null;
	storage = null;
	storageEntryKey = null;
	isNew = true;
	async fetch(options){
		if(!this.storage)
			throw new Error(`Missing storage property`);
		try{
			const res = await this.storage.read(this.storageEntryKey);
			if(res === null)
				return false;
			this.isNew = false;
			this.unserialize(res);
		}catch(e){
			console.error(e);
			return false;
		}

		return true;
	}	
	async save(options){
		if(!this.storage)
			throw new Error(`Missing storage property`);
		let res;
		if(this.isNew){
			res = await this.storage.create(this.storageEntryKey,this.serialize());
			this.isNew = false;
		}else{
			res = await this.storage.update(this.key,this.storageEntryKey,this.serialize());
		}
	}
	async delete(){
		if(!this.storage)
			throw new Error(`Missing storage property`);
		if(!this.isNew && this.key && this.storageEntryKey){
			return await this.storage.delete(this.key,this.storageEntryKey);
		}
		return false;
	}
	get(propName){
		if(propName == 'key')
			return this.key;
		return this.props[propName];
	}
	set(propName, val){
		if(!this.props.hasOwnProperty(propName))
			throw new Error(`Property "${propName}" is not defined`);
		this.props[propName] = val;
	}
	serialize(){
		const data = {};
		for(let propName in this.props){
			data[propName] = this.props[propName].get();
		}
		return data;
	}
	unserialize(data){
		for(let propName in data){
			this.props[propName].set(data[propName]);
		}
	}
}

const PersistentModel = {
	extend(config){
		const ModelClass = class extends PersistentModelBase{
			constructor(){
				super();

				//Props
				this.props = new PropertySet(config.props);

				//Storage
				if(!(config.storage instanceof StorageBase))
					throw new Error(`Invalid storage type`);
				this.storage = config.storage;
				
				if(!config.hasOwnProperty('storageEntryKey'))
					throw new Error(`Missing storageEntryKey property`);
				this.storageEntryKey = config.storageEntryKey;
			}
		}
		return ModelClass;
	}
}

/*
const PersistentModel = {
	extend(obj){
		const ModelClass = class extends PersistentModelBase{
			constructor(){
				super();
				//Props
				for(let propName in obj.props){
					if(!['string','number','boolean','object'].includes(typeof obj.props[propName]))
						throw new Error(`Invalid type for property "${propName}"`);
					const propObj = typeof obj.props[propName] == 'object' && Object.prototype === Object.getPrototypeOf(obj.props[propName]) ? obj.props[propName] : null;
					if(propObj && propObj.hasOwnProperty('type') && propObj.hasOwnProperty('default') &&
						(
							((propObj.type === 'string' || propObj.type === String) && typeof propObj.default !== 'string')
							||
							((propObj.type === 'number' || propObj.type === Number) && typeof propObj.default !== 'number')
							||
							((propObj.type === 'boolean' || propObj.type === Boolean) && typeof propObj.default !== 'boolean')
							// ||
							// ((propObj.type === 'object' || propObj.type === Object) && typeof propObj.default !== 'object')
						)
					)
						throw new Error(`${propName} default value is not of type ${propObj.type}`);

					const propType = propObj ? propObj.type : typeof obj.props[propName];
					Object.defineProperty(this,propName,{
						 configurable: false,
						 enumerable: true,	
						 get: super.get.bind(this,propName),
						 set: super.set.bind(this,propName)
					});
					this.registerProp(propName,propType);
					this[propName] = propObj ? propObj.default : obj.props[propName];
				}
				//Storage
				if(!obj.hasOwnProperty('storage'))
					throw new Error(`Missing storage property`);
				this.storage = obj.storage;
				if(obj.hasOwnProperty('storageEntryId')){
					if(typeof obj.storageEntryId != 'string' && typeof obj.storageEntryId != 'function')
						throw new Error(`Invalid type for storageEntryId property`);
					this.storageEntryId = obj.storageEntryId;
				}
			}
		}
		return ModelClass;
	}
}
*/
export { PersistentModel };