import { TaskModel } from "./Classes.js";

export default {
	data() {
		return {
			newTask: new TaskModel(),
		}
	},
	methods: {
		addTask() {
			this.$emit('add-task', {title: this.newTask.title});	// emit event to parent with a dummy model
			this.newTask.title = '';
			this.newTask.$clearErrors('title');
			this.$forceUpdate();
		},
		onChange(){
			this.newTask.title = this.newTask.$validate('title');
			this.$forceUpdate();
		},
		onKeypressEnter(){
			this.onChange();
			if(!this.newTask.$hasErrors('title')){
				this.addTask();
			}
		}
	},
	mounted(){
		this.$refs.input.focus();
	},
	template: /*html*/`
		<div>
			<div class="input-group" :class="{ 'is-invalid': newTask.$isValidated('title') && newTask.$hasErrors('title')}">
				<input type="text" class="form-control" @change="onChange" @keypress.enter="onKeypressEnter" ref="input" v-model="newTask.title" :class="{'is-valid': newTask.$isValidated('title') && !newTask.$hasErrors('title'), 'is-invalid': newTask.$isValidated('title') && newTask.$hasErrors('title')}" placeholder="New task title">
				<button class="btn btn-primary" :class="{'btn-danger': !newTask.$isValidated('title') || newTask.$hasErrors('title')}" @click="addTask" :disabled="!newTask.$isValidated('title') || newTask.$hasErrors('title')">Add Task</button>
			</div>
			<div class="invalid-feedback">{{ newTask.$error.title }}</div>
		</div>
	`
}