
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

		Object.defineProperty(this,'$items',{
			configurable: false,
			enumerable: false,
			get: ()=>items,
		});

		Object.defineProperty(this,'$add',{
			configurable: false,
			enumerable: false,
			writable: false,
			value: (model)=>{
				if(!(model instanceof this.$modelClass) && !(model instanceof Object))
					throw new Error(`Invalid model type: ${model}`);
				if(model instanceof Object)
					model = new this.$modelClass(model);
				items.push(model);
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