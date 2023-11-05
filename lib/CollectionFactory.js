
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