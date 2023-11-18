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

		if(options.title?.length > 0){
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

		if(options.message?.length > 0){
			const messageElement = document.createElement('div');
			messageElement.classList.add('toast-body');
			messageElement.innerHTML = options.message;
			if(options.closeBtn && options.title?.length == 0){
				const flexElement = document.createElement('div');
				flexElement.classList.add('d-flex');
				flexElement.appendChild(messageElement);
				flexElement.innerHTML += `
					<button type="button" class="btn-close" data-bs-dismiss="toast"></button>
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
	}
	success(options){
		if(!(typeof options == 'object' && options !== null && Object.getPrototypeOf(options) === Object.prototype))
			options = {message: String(options)};

		options = Object.assign({
			type: 'success',
			title: '<i class="bi bi-check text-success"></i> Success',
			message: '',
		},options);

		this.create(options);
	}
	error(options){
		if(!(typeof options == 'object' && options !== null && Object.getPrototypeOf(options) === Object.prototype))
			options = {message: String(options)};

		options = Object.assign({
			type: 'danger',
			title: '<i class="bi bi-exclamation-triangle-fill text-danger"></i> Error',
			message: '',
		},options);

		this.create(options);
	}
}

export default Toaster;