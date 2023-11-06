import { TaskModel } from "./Classes.js";

export default {
	data() {
		return {
			newTask: new TaskModel(),
		}
	},
	methods: {
		addTask() {
			this.$emit('add-task', {title: this.newTask.title});
			this.newTask.title = '';
			this.newTask.$clearErrors('title');
			this.$forceUpdate();
		},
		onInput(){
			this.newTask.title = this.newTask.$validate('title');
			this.$forceUpdate();
		}
	},
	mounted(){
		this.$refs.input.focus();
	},
	template: /*html*/`
		<div>
			<div class="input-group" :class="{ 'is-invalid': newTask.$isValidated('title') && newTask.$hasErrors('title')}">
				<input type="text" class="form-control" @input="onInput" @keypress.enter="()=>{newTask.$isValidated('title') && !newTask.$hasErrors('title') ? addTask() : null}" ref="input" v-model="newTask.title" placeholder="New task title">
				<button class="btn btn-secondary" @click="addTask" :disabled="!newTask.$isValidated('title') || newTask.$hasErrors('title')">Add Task</button>
			</div>
			<div class="invalid-feedback">{{ newTask.$error.title }}</div>
		</div>
	`
}