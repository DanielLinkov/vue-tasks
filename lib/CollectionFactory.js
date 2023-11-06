
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
						for(let key in Object.keys(filter)){
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
				throw new Error(`Invalid filter object type: ${filter}=>${typeof filter}`);
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
						for(let key in Object.keys(filter)){
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
				throw new Error(`Invalid filter object type: ${filter}=>${typeof filter}`);
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
						for(let key in Object.keys(filter)){
							if(item.hasOwnProperty(key) && item[key] == filter[key])
								return true;
						}
						return false;
					});
				}
				throw new Error(`Invalid filter object type: ${filter}=>${typeof filter}`);
			}
		});

		Object.defineProperty(this,'$add',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: (model)=>{
				if(!(model instanceof this.$modelClass) && !(model instanceof Object))
					throw new Error(`Invalid model type: ${model}`);
				if(!(model instanceof this.$modelClass)){
					model = new this.$modelClass(model);
				}
				model.$setCollectionKey(lastCollectionModelKey++);
				items.push(model);
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
	}	
}

const CollectionFactory = {
	create(config=null){
		if(!config || typeof config !== 'object') throw new Error(`Missing/invalid config object`);

		const CollectionClass = class extends Collection{
			constructor(_config={}){
				Object.assign(config,_config);
				super(config);
				Object.seal(this);
			}
		}
		return CollectionClass;
	},
}

export { CollectionFactory };