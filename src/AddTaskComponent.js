import { NewTaskModel } from "./Classes.js";

let abortController = null;

export default {
	data() {
		return {
			isTaskValidated: false,
			isTaskValid: false,
			timerIdValidate: null,
			newTask: new NewTaskModel({},{
				validators: {
					title: [(val,model,addError)=>{
						if(this.taskCollection.$one(task => task.title == val))
							addError("Task with this title already exists");
					},
					async (val,model,addError)=>{
						try{
							if(abortController){
								abortController.abort();
							}
							if(model.$hasErrors('title'))
								return;
							abortController = null;
							const result = await this.taskCollection.$storageQuery.search({title: val},(controller)=>{
								abortController = controller;
							});
							if(result.length > 0)
								addError("Task with this title already exists in storage");
						}catch(e){
							if(e.name == 'AbortError')
								throw e;
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
			this.isTaskValidated = false;
			this.newTask.$call('transform');
			this.$emit('add-task', {title: this.newTask.title});	// emit event to parent with a dummy model
			this.newTask.title = '';
			this.$forceUpdate();
		},
		async onChange(){
			this.isTaskValid = false;
			this.isTaskValidated = false;
			clearTimeout(this.timerIdValidate);
			const timerIdSpin = setTimeout(()=>{
				this.$refs.spinner.classList.remove('d-none');
			},500);
			const ret =await this.newTask.$validate('title');
			if(!ret)	// validation was aborted
				return;
			this.timerIdValidate = setTimeout(() => {
				this.isTaskValidated = true;
				if(!this.newTask.$hasErrors('title')){
					this.isTaskValid = true;
				}
			}, 10);
			clearTimeout(timerIdSpin);
			this.$refs.spinner.classList.add('d-none');
			this.$forceUpdate();
		},
		async onKeypressEnter(){
			if(!this.isTaskValid || !this.isTaskValidated)
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
			<div class="input-group" :class="{ 'is-invalid': isTaskValidated && newTask.$hasErrors('title')}">
				<input type="text" class="form-control" @input="onChange" @keypress.enter="onKeypressEnter" ref="input" v-model="newTask.title" :class="{'is-valid': isTaskValidated && !newTask.$hasErrors('title'), 'is-invalid': isTaskValid === false || isTaskValidated && newTask.$hasErrors('title')}" placeholder="New task title">
				<button class="btn btn-primary" :class="{'btn-danger': !isTaskValid || !isTaskValidated || newTask.$hasErrors('title')}" @click="addTask" :disabled="!isTaskValid || !isTaskValidated || newTask.$hasErrors('title')">Add Task</button>
			</div>
			<div class="invalid-tooltip">{{ newTask.$error.title }}</div>
			<div class="spinner-border spinner-border-sm d-none position-absolute m-2" ref="spinner"></div>
		</div>
	`
}