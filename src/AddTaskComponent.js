import { NewTaskModel } from "./Classes.js";

let abortController = null;

export default {
	data() {
		return {
			isTaskValid: null,
			newTask: new NewTaskModel({},{
				validators: {
					title: [(val,model,addError)=>{
						// if(this.taskCollection.$one(task => task.title == val))
						// 	addError("Task with this title already exists");
					},
					async (val,model,addError)=>{
						try{
							if(abortController){
								abortController.abort();
							}
							abortController = null;
							const result = await this.taskCollection.$storageQuery.search({title: val},(controller)=>{
								abortController = controller;
							});
							abortController = null;
							if(result.length > 0)
								addError("Task with this title already exists in storage");
						}catch(e){
							addError("Error while checking for title uniqueness: " + e.message);
						}
					},]
				}
			}),
		}
	},
	inject: ['taskCollection'],
	methods: {
		addTask() {
			this.isTaskValid = false;
			this.newTask.$call('transform');
			this.$emit('add-task', {title: this.newTask.title});	// emit event to parent with a dummy model
			//#TODO: put hooks for property transformation
			this.newTask.title = '';
			this.$forceUpdate();
		},
		async onChange(){
			this.isTaskValid = false;
			this.newTask.$clearErrors();
			this.$forceUpdate();
			const timerId = setTimeout(()=>{
				this.$refs.spinner.classList.remove('d-none');
			},500);
			await this.newTask.$validate('title');
			if(!this.newTask.$hasErrors('title')){
				console.log('valid');
				this.isTaskValid = true;
			}
			clearTimeout(timerId);
			this.$refs.spinner.classList.add('d-none');
			this.$forceUpdate();
		},
		async onKeypressEnter(){
			if(!this.isTaskValid)
				return;
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
				<input type="text" class="form-control" @input="onChange" @keypress.enter="onKeypressEnter" ref="input" v-model="newTask.title" :class="{'is-valid': newTask.$isValidated('title') && !newTask.$hasErrors('title'), 'is-invalid': isTaskValid === false || newTask.$isValidated('title') && newTask.$hasErrors('title')}" placeholder="New task title">
				<button class="btn btn-primary" :class="{'btn-danger': !isTaskValid || !newTask.$isValidated('title') || newTask.$hasErrors('title')}" @click="addTask" :disabled="!isTaskValid || !newTask.$isValidated('title') || newTask.$hasErrors('title')">Add Task</button>
			</div>
			<div class="invalid-tooltip">{{ newTask.$error.title }}</div>
			<div class="spinner-border spinner-border-sm d-none position-absolute m-2" ref="spinner"></div>
		</div>
	`
}