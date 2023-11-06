import { TaskModel } from "./Classes.js";

export default {
	data() {
		return {
			newTask: new TaskModel(),
		}
	},
	methods: {
		addTask() {
			this.$emit('add-task', {title: this.$refs.input.value.trim()});
		},
		onInput(){
			this.newTask.title = this.newTask.$validate('title');
			this.$forceUpdate();
		}
	},
	mounted(){
		this.newTask.$watch('title', (val)=>{
			console.log('watch',this.newTask.$error.title);
		});
	},
	template: /*html*/`
		<div class="input-group">
			<input type="text" class="form-control" @input="onInput" @keypress.enter="addTask" ref="input" v-model="newTask.title" placeholder="New task title">
			<button class="btn btn-secondary" @click="addTask" :disabled="!newTask.$isValidated('title') || newTask.$hasErrors('title')">Add Task</button>
		</div>
	```
}