import { NewTaskModel } from "./Classes.js";

let abortController = null;

export default {
	data() {
		return {
			isTaskValidated: false,
			isTaskValid: false,
			timerIdValidate: null,
			validationMessage: null,
			newTask: new NewTaskModel({},{
				validators: {
					title: [(val,model,addError)=>{
						const currentTaskCollectionModel = this.currentTaskCollectionModelGetter();
						val = val.trim();
						if(currentTaskCollectionModel?.list.$one(task => task.title == val))
							addError("Task with this title already exists");
						return val;
					},
					async (val,model,addError)=>{
						try{
							if(abortController){
								abortController.abort();
							}
							if(model.$hasErrors('title'))
								return;
							abortController = null;
							this.validationMessage = 'Checking for title uniqueness...';
							const currentTaskCollectionModel = this.currentTaskCollectionModelGetter();
							const result = await currentTaskCollectionModel?.list.$storageQuery.search({title: val},{
								setAbortControllerCallback: (controller)=>{
									abortController = controller;
								},
							});
							if(result.length > 0)
								addError("Task with this title already exists in storage");
						}catch(e){
							if(e.name == 'AbortError')
								throw e;
							addError("Error while checking for title uniqueness: " + e.message);
						}
						this.validationMessage = null;
					},]
				}
			}),
		}
	},
	inject: ['currentTaskCollectionModelGetter'],
	methods: {
		addTask() {
			this.isTaskValid = false;
			this.isTaskValidated = false;
			this.newTask.$call('transform');
			this.$emit('add-task', {title: this.newTask.title});	// emit event to parent with a dummy model
			this.newTask.title = '';
			this.$forceUpdate();
		},
		onChange(){
			this.newTask.$call('transform');	//Trim
			this.$forceUpdate();	// force input update
		},
		async onInput(){
			this.isTaskValid = false;
			this.isTaskValidated = false;
			clearTimeout(this.timerIdValidate);
			const timerIdSpin = setTimeout(()=>{
				this.$refs.spinner_box.classList.remove('d-none');
			},500);
			const ret =await this.newTask.$validate('title');
			clearTimeout(timerIdSpin);
			if(!ret)	// validation was aborted
				return;
			this.timerIdValidate = setTimeout(() => {
				this.isTaskValidated = true;
				if(!this.newTask.$hasErrors('title')){
					this.isTaskValid = true;
				}
			}, 10);
			this.$refs.spinner_box.classList.add('d-none');
			this.$forceUpdate();
		},
		async onKeypressEnter(){
			if(!this.isTaskValid || !this.isTaskValidated)
				return;
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
			<div class="input-group" :class="{ 'is-invalid': isTaskValidated && newTask.$hasErrors('title')}">
				<input type="text" class="form-control" @change="onChange" @input="onInput" @keypress.enter="onKeypressEnter" ref="input" v-model="newTask.title" :class="{'is-valid': isTaskValidated && !newTask.$hasErrors('title'), 'is-invalid': isTaskValid === false || isTaskValidated && newTask.$hasErrors('title')}" placeholder="Enter task title">
				<button class="btn" :class="{'btn-secondary': !isTaskValid || !isTaskValidated || newTask.$hasErrors('title'), 'btn-success': isTaskValid && isTaskValidated && !newTask.$hasErrors('title')}" @click="addTask" :disabled="!isTaskValid || !isTaskValidated || newTask.$hasErrors('title')">Add Task</button>
			</div>
			<div class="invalid-tooltip">{{ newTask.$error.title }}</div>
			<div ref="spinner_box" class="d-none">
				<div class="spinner-border spinner-border-sm position-absolute m-2 text-warning-emphasis" ref="spinner"></div>
				<div class="position-absolute m-1 ms-4 text-warning-emphasis" v-if="validationMessage">&nbsp;{{ validationMessage }}</div>
			</div>
		</div>
	`
}