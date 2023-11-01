
class StorageBase{
	read(key){
		throw new Error("Not implemented");
	}
}

class LocalStorage extends StorageBase{
	prefix = '';
	format = 'json';
	constructor(config){
		super();
		this.prefix = config.hasOwnProperty('prefix') ? config.prefix : '';
		if(typeof this.prefix != 'string')
			throw new Error("Invalid prefix type");
		this.format = config.hasOwnProperty('format') ? config.format : 'json';
		if(!(['json','string'].includes(this.format)))
			throw new Error("Invalid storage format");
	}
	read(key){
		const item = localStorage.getItem(this.prefix + key);
		if(item === null)
			return Promise.resolve(null);
		switch(this.format){
			case 'json':
				try{
					const data = JSON.parse(item);
					return Promise.resolve(data);
				}catch(e){
					return Promise.reject(e);
				}
			case 'string':
				return Promise.resolve(item);
		}
	}
	create(path,data){
		switch(this.format){
			case 'json':
				try{
					const item = JSON.stringify(data);
					localStorage.setItem(this.prefix + path,item);
					return Promise.resolve(true);
				}catch(e){
					return Promise.reject(e);
				}
			case 'string':
				localStorage.setItem(this.prefix + key,data);
				return Promise.resolve(true);
		}
	}
	update(key, data){
		switch(this.format){
			case 'json':
				try{
					const _data = JSON.stringify(data);
					localStorage.setItem(this.prefix + key,_data);
					return Promise.resolve(true);
				}catch(e){
					return Promise.reject(e);
				}
			case 'string':
				localStorage.setItem(this.prefix + key,data);
				return Promise.resolve(true);
		}
	}
}


export { LocalStorage };
