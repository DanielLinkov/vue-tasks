
let captureMouse = false;

export default {
	props: ['placeholder','options','value'],
	emits: ['change'],
	template: /*html*/ `
		<div class="position-relative">
			<input class="form-select" :placeholder="placeholder" readonly ref="select"/>
			<div class="top-100 start-0 w-100 dropdown-menu overflow-y-auto" style="z-index: 100; max-height:300px" ref="dropdown">
			</div>
		</div>
	`,
	watch: {
		options: function(val){
			this._buildOptionsList();
		},
		value(val){
			if(val === null)
				this.$refs.select.value = '';
			else
				this.$refs.select.value = this.options.find(option => option[0] == val)[1];
			this.$refs.select.setAttribute('data-value',val);
			this.$refs.dropdown.childNodes.forEach(optionElement => {
				if(optionElement.getAttribute('data-value') == val){
					optionElement.classList.add('active');
				}else{
					optionElement.classList.remove('active');
				}
			});
		}
	},
	methods: {
		_buildOptionsList(){
			this.$refs.dropdown.innerHTML = '';
			this.options.forEach(option => {
				const optionElement = document.createElement('div');
				optionElement.classList.add('dropdown-item');
				optionElement.innerHTML = option[1];
				optionElement.setAttribute('data-value',option[0]);
				if(option[0] == this.value){
					optionElement.classList.add('active');
				}
				optionElement.addEventListener('click',()=>{
					this.$refs.dropdown.classList.remove('show');
					if(typeof option[0] == 'function'){
						option[0]();
						return;
					}
					this.$emit('change',option[0]);
					this.$refs.select.value = option[1];
					this.$refs.select.setAttribute('data-value',option[0]);
				});
				this.$refs.dropdown.appendChild(optionElement);
			});
		},
	},
	mounted(){
		this.$refs.dropdown.addEventListener('mousedown',(e)=>{
			captureMouse = true;
		});
		this.$refs.select.addEventListener('click',()=>{
			captureMouse = false;
			if(this.$refs.dropdown.classList.contains('show')){
				this.$refs.dropdown.classList.remove('show');
				return;
			}else{
				this.$refs.dropdown.classList.add('show');
			}
		});
		this.$refs.select.addEventListener('blur',()=>{
			if(captureMouse){
				captureMouse = false;
				return;
			}
			this.$refs.dropdown.classList.remove('show');
		});
		this.$refs.select.style.cursor = 'default';
	},
	updated(){
	}
}