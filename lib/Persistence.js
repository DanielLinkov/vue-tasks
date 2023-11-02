
class StorageBase{
	read(key){
		throw new Error("Not implemented");
	}
	create(){
		throw new Error("Not implemented");
	}
	update(){
		throw new Error("Not implemented");
	}
	delete(){
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
	delete(key){
		localStorage.removeItem(this.prefix + key);
		return Promise.resolve(true);
	}
}

class RestApiJsonClient extends StorageBase{
	_baseUrl = '';
	constructor(config){
		super();
		this._baseUrl = config.baseUrl || 'http://localhost';
	}
	read(key){
		return fetch(`${this._baseUrl}${key}`)
			.then(res => {
				if(!res.ok)
					return null;
				return res.json();
			})
			.catch(err => {
				console.error(err);
				return null;
			});
	}
	create(path,data){
		return fetch(`${this._baseUrl}${path}`,{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(data),
		})
			.then(res => {
				if(!res.ok)
					return false;
				return true;
			})
			.catch(err => {
				console.error(err);
				return false;
			});
	}
	update(key, path, data){
		let url = `${this._baseUrl}${path}`;
		if(key !== null)
			url += `/${key}`;
		return fetch(url,{
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(data),
		})
			.then(res => {
				if(!res.ok)
					return false;
				return true;
			})
			.catch(err => {
				console.error(err);
				return false;
			});
	}
	delete(key, path){
		if(key === null) return Promise.resolve(false);	//Cannot delete json object without key
		let url = `${this._baseUrl}${path}/${key}`;
		return fetch(url,{
			method: 'DELETE',
		})
			.then(res => {
				if(!res.ok)
					return false;
				return true;
			})
			.catch(err => {
				console.error(err);
				return false;
			});
	}
}


export { StorageBase, LocalStorage, RestApiJsonClient };
