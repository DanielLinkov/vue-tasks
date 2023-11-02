class Persistent{
	storage = null;
	storageEntryId = null;
	async fetch(options){
		if(!this.storage)
			throw new Error(`Missing storage property`);
		try{
			const res = await this.storage.read(this.storageEntryId);
			if(res === null)
				return false;
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
		if(this._id){
			res = await this.storage.update(this.storageEntryId,this.serialize());
		}else{
			res = await this.storage.create(this.storageEntryId,this.serialize());
		}
	}
}

class PersistentModelBase extends Persistent{
	_props = {};
	_propTemplates = {};
	_id = null;
	get(propName){
		if(propName == 'id')
			return this._id;
		return this._props[propName];
	}
	set(propName, val){
		if(!this._propTemplates.hasOwnProperty(propName))
			throw new Error(`Property "${propName}" is not defined`);
		const type = this._propTemplates[propName];
		switch(typeof type){
			case 'function':
				if(typeof val != type.name.toLowerCase())
					throw new Error(`Invalid type for property "${propName}"`);
				break;
			case 'string':
				if(typeof val != type)
					throw new Error(`Invalid type for property "${propName}"`);
				break;
			default:
				throw new Error(`Invalid property type: ${type}`);
		}
		this._props[propName] = val;
	}
	registerProp(propName, type){
		this._propTemplates[propName] = type;
	}
	serialize(){
		const data = {};
		for(let propName in this._props){
			data[propName] = this._props[propName];
		}
		return data;
	}
	unserialize(data){
		for(let propName in data){
			this[propName] = data[propName];
		}
	}
}

const PersitentModel = {
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
					// s[propName] = propObj ? propObj.default : obj.props[propName];
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
export { PersitentModel };