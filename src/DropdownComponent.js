
export default {
	props: ['placeholder'],
	template: /*html*/ `
		<input class="form-select" :placeholder="placeholder" readonly/>
	`,
	mounted(){
		this.$el.addEventListener('click',this.onClick);
		this.$el.style.cursor = 'default';
	},
}