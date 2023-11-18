/*
 * Toast service
 */

class Toaster{
	#config = null;
	#containerElement = null;
	constructor(config={}){
		config = Object.assign({
			position: ['bottom-0','end-0'],
		},config);

		this.#containerElement = document.createElement('div');
		this.#containerElement.classList.add('toast-container','p-3','position-fixed');
		this.#containerElement.classList.add(...config.position);

		document.body.appendChild(this.#containerElement);

		delete config.position;
		this.#config = Object.assign({
			autohide: true,
			closeBtn: true,
			delay: 5000,
		},config);
	}
	create(options){
		if(!(typeof options == 'object' && options !== null && Object.getPrototypeOf(options) === Object.prototype))
			throw new Error("Invalid options type");

		options = Object.assign({
			type: 'info',
			title: '',
			message: '',
		},this.#config,options);

		const toastElement = document.createElement('div');
		toastElement.classList.add('toast',`text-bg-${options.type}`);

		if(options.title !== null){
			const titleElement = document.createElement('div');
			titleElement.classList.add('toast-header');
			titleElement.innerHTML = `
				<strong class="me-auto">${options.title}</strong>
			`;
			if(options.closeBtn){
				titleElement.innerHTML += `
					<button type="button" class="btn-close" data-bs-dismiss="toast"></button>
				`;
			}
			toastElement.appendChild(titleElement);
		}

		if(options.message !== null){
			const messageElement = document.createElement('div');
			messageElement.classList.add('toast-body');
			messageElement.innerHTML = options.message;
			if(options.closeBtn && options.title === null){
				const flexElement = document.createElement('div');
				flexElement.classList.add('d-flex');
				flexElement.appendChild(messageElement);
				flexElement.innerHTML += `
					<button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast"></button>
				`;
				toastElement.appendChild(flexElement);
			}else
				toastElement.appendChild(messageElement);
		}
		this.#containerElement.appendChild(toastElement);
		const toast = new bootstrap.Toast(toastElement,{
			autohide: options.autohide,
			delay: options.delay,
		});
		toastElement.addEventListener('hidden.bs.toast',()=>{
			toastElement.remove();
		});
		toast.show();
		toastElement.style.setProperty('--toast-height',toastElement.offsetHeight + 'px');
		// toastElement.classList.remove('position-absolute');
	}
	success(options,title=null){
		if(!(typeof options == 'object' && options !== null && Object.getPrototypeOf(options) === Object.prototype))
			options = {message: String(options)};

		options.title = (title || options.title) ? (options.icon ?? '<i class="bi bi-check text-success"></i>')+` ${title || options.title}` : null;
		options = Object.assign({
			message: '',
		},options);

		options.type = 'success';
		this.create(options);
	}
	info(options,title=null){
		if(!(typeof options == 'object' && options !== null && Object.getPrototypeOf(options) === Object.prototype))
			options = {message: String(options)};

		options.title = (title || options.title) ? (options.icon ?? '<i class="bi bi-info-circle text-info"></i>')+` ${title || options.title}` : null;
		options = Object.assign({
			message: '',
		},options);

		options.type = 'info';
		this.create(options);
	}
	warning(options,title=null){
		if(!(typeof options == 'object' && options !== null && Object.getPrototypeOf(options) === Object.prototype))
			options = {message: String(options)};

		options.title = (title || options.title) ? (options.icon ?? '<i class="bi bi-exclamation-triangle-fill text-warning"></i>')+` ${title || options.title}` : null;
		options = Object.assign({
			message: '',
		},options);

		options.type = 'warning';
		this.create(options);
	}
	danger(options,title=null){
		if(!(typeof options == 'object' && options !== null && Object.getPrototypeOf(options) === Object.prototype))
			options = {message: String(options)};

		options.title = (title || options.title) ? (options.icon ?? '<i class="bi bi-exclamation-triangle-fill text-danger"></i>')+` ${title || options.title}` : null;
		options = Object.assign({
			message: '',
		},options);

		options.type = 'danger';
		this.create(options);
	}
}

export default Toaster;