import { TaskModel } from "./Classes.js";

export default {
	data() {
		return {
			disabled: true
		}
	},
	methods: {
		onInput(e) {
			this.disabled = e.target.value.trim().length === 0;
		},
		addTask() {
			if(this.$refs.input.value.trim().length === 0) return;
			this.$emit('add-task', {title: this.$refs.input.value.trim()});
			this.disabled = true;
			this.$refs.input.value = '';
		}
	},
	template: /*html*/`
		<div class="input-group">
			<input type="text" class="form-control" @keypress.enter="addTask" ref="input" @input="onInput" placeholder="New task title">
			<button class="btn btn-secondary" @click="addTask" :disabled="disabled">Add Task</button>
		</div>
	`
}