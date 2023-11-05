
class Collection{
	constructor(config){
		this.items = [];
	}	
}

class CollectionFactory{
	static create(config){
		return new Collection(config);
	}
}

export { CollectionFactory };