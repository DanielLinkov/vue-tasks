
class StorageBase{
	read(){
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
	isPartialUpdateSupported(){
		return false;
	}
}

class LocalStorage extends StorageBase{
	prefix = '';
	constructor(config){
		super();
		this.prefix = config.hasOwnProperty('prefix') ? config.prefix : '';
		if(typeof this.prefix != 'string')
			throw new Error("Invalid prefix type");
	}
	read(request){
		const item = localStorage.getItem(this.prefix + request.entityName);
		if(item === null)
			return Promise.resolve(null);
		try{
			request.onProgress && request.onProgress(item.length,item.length);
			const data = JSON.parse(item);
			return Promise.resolve(data);
		}catch(e){
			return Promise.reject(e);
		}
	}
	create(request){
		try{
			const _data = JSON.stringify(request.data);
			localStorage.setItem(this.prefix + request.entityName,_data);
			return Promise.resolve(request.data);
		}catch(e){
			return Promise.reject(e);
		}
	}
	update(request){
		try{
			const _data = JSON.stringify(request.data);
			localStorage.setItem(this.prefix + request.entityName,_data);
			return Promise.resolve(request.data);
		}catch(e){
			return Promise.reject(e);
		}
	}
	delete(request){
		localStorage.removeItem(this.prefix + request.entityName);
		return Promise.resolve(true);
	}
}

class RestApiJsonClient extends StorageBase{
	_baseUrl = '';
	constructor(config){
		super();
		this._baseUrl = config.baseUrl || 'http://localhost';
	}
	isPartialUpdateSupported(){
		return true;
	}
	async read(request){
		let url = [this._baseUrl,request.entityName].join('/');
		if(request.key !== null)
			url += `/${request.key}`;

		const response = await fetch(url);
		if(!response.ok)
			throw new Error(response.statusText);
		if(!response.headers.get('Content-Type').startsWith('application/json'))
			throw new Error(`Invalid content type: ${response.headers.get('Content-Type')}`);
		return await response.json();	
	}
	async create(request){
		let url = [this._baseUrl,request.entityName].join('/');
		const response = await fetch(url,{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(data),
		});
		if(!response.ok)
			throw new Error(response.statusText);
		if(!response.headers.get('Content-Type').startsWith('application/json'))
			throw new Error(`Invalid content type: ${response.headers.get('Content-Type')}`);

		return await response.json();
	}
	async update(request){
		let url = [this._baseUrl,request.entityName].join('/');
		if(request.key !== null)
			url += `/${request.key}`;
		const response = await fetch(url,{
			method: request.patch ? 'PATCH' : 'PUT',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(request.data),
		});
		if(!response.ok)
			throw new Error(response.statusText);
		if(!response.headers.get('Content-Type').startsWith('application/json'))
			throw new Error(`Invalid content type: ${response.headers.get('Content-Type')}`);
		return await response.json();
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
