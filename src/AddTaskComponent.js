import { NewTaskModel } from "./Classes.js";

export default {
	data() {
		return {
			newTask: new NewTaskModel({},{
				validators: {
					title: (val,model,addError)=>{
						if(this.taskCollection.$one(task => task.title == val))
							addError("Task with this title already exists");
					}
				}
			}),
		}
	},
	inject: ['taskCollection'],
	methods: {
		addTask() {
			this.$emit('add-task', {title: this.newTask.title});	// emit event to parent with a dummy model
			//#TODO: put hooks for property transformation
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
		<div class="position-relative">
			<div class="input-group" :class="{ 'is-invalid': newTask.$isValidated('title') && newTask.$hasErrors('title')}">
				<input type="text" class="form-control" @input="onChange" @keypress.enter="onKeypressEnter" ref="input" v-model="newTask.title" :class="{'is-valid': newTask.$isValidated('title') && !newTask.$hasErrors('title'), 'is-invalid': newTask.$isValidated('title') && newTask.$hasErrors('title')}" placeholder="New task title">
				<button class="btn btn-primary" :class="{'btn-danger': !newTask.$isValidated('title') || newTask.$hasErrors('title')}" @click="addTask" :disabled="!newTask.$isValidated('title') || newTask.$hasErrors('title')">Add Task</button>
			</div>
			<div class="invalid-tooltip">{{ newTask.$error.title }}</div>
		</div>
	`
}