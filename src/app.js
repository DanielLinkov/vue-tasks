import AddTaskComponent from "./AddTaskComponent.js";
import TaskListComponent from "./TaskListComponent.js";
import CheckboxComponent from "./CheckboxComponent.js";
import DropdownComponent from "./DropdownComponent.js";
import { ConfigModel, TaskCollection, TaskModel, TaskCollectionModel, TaskListCollection } from "./Classes.js";
import { ViewAdapterVue } from "../spinejs/View.js";
import Toaster from "./Toaster.js";

const configModel = new ConfigModel({},{
});

const taskListCollection = new TaskListCollection({},{
});

const view = new ViewAdapterVue();

let errorMessageTimerId	= null;

const toaster = new Toaster({position: ['bottom-0','start-0'],delay: 3000});

export default {
	components: {
		'add-task-box': AddTaskComponent,
		'task-list': TaskListComponent,
		'labeled-checkbox': CheckboxComponent,
		'dropdown': DropdownComponent,
	},
	provide() {
		return {
			currentTaskCollectionModelGetter: ()=>{
				return this.currentTaskCollectionModel;
			},
			toaster,
		}
	},
	data(){
		return {
			currentTaskListCollectionId: null,
			config: configModel.$propState,
			stateVersion: 0,
		}
	},
	watch: {
		'config.theme': (val)=>{
			const linkElement = document.getElementById('link-theme');
			linkElement.href = `./assets/${val}/bootstrap.min.css`;
		},
		'config.palette': (val)=>{
			document.body.setAttribute('data-bs-theme',val);
		},
	},
	computed:{
		taskListCollection(){
			this.stateVersion;
			return taskListCollection.$items;
		},
		currentTaskCollectionModel(){
			this.stateVersion;
			return this.currentTaskListCollectionId !== null ? taskListCollection.$one(taskList => taskList.$key == this.currentTaskListCollectionId) : null;
		},
		tasks(){
			this.stateVersion;
			if(this.config.showCompleted){
				return this.currentTaskCollectionModel ? [...(this.currentTaskCollectionModel?.list?.$items || [])] : [];
			}
			return this.currentTaskCollectionModel ? this.currentTaskCollectionModel?.list.$all(task => !task.done) : [];
		},
		task_lists(){
			this.stateVersion;
			const options = taskListCollection.$items.map(task=>[task.$key,task.name,`<strong><i class="bi bi-list-task"></i> ${task.name}</strong>`]);
			options.push([()=>{
				this.onTaskListSelected('new');
			},'<em>[New task list]</em>']);
			return options;
		},
		count_tasks_left(){
			this.stateVersion;
			return this.currentTaskCollectionModel?.list ? this.currentTaskCollectionModel.list.$all(task => !task.done).length : 0;
		},
		count_tasks_completed(){
			this.stateVersion;
			return this.currentTaskCollectionModel?.list ? this.currentTaskCollectionModel.list.$all(task => task.done).length : 0;
		}
	},
	methods: {
		onTaskDeleted(){
			view.touch();
		},
		async onTaskListSelected(value){
			this.$refs.addTaskComponent.newTask.title = '';
			this.$refs.addTaskComponent.isTaskValidated = false;
			if(value == 'new'){
				bootbox.prompt('Enter new task list name',async (result)=>{
					if(result === null || result.trim().length == 0){
						return;
					}
					const taskList = new TaskCollectionModel({
						name: result.trim()
					});
					const ckey = taskListCollection.$add(taskList);
					try{
						await taskListCollection.$save();
						view.touch();
						await Vue.nextTick();
						this.currentTaskListCollectionId = +taskList.$key;
						setTimeout(() => {
							this.$refs.addTaskComponent.$refs.input.focus();
						}, 0);
					}catch(e){
						taskListCollection.$removeWhere(ckey);
						toaster.danger(Array.isArray(e) ? e[0] : e);
					}
					toaster.success(`Task list <strong>${result}</strong> created`);
				});
				return;
			}
			this.currentTaskListCollectionId = +value;
			await Vue.nextTick();
			this.$refs.addTaskComponent.$refs.input.focus();
		},
		addTask(data) {
			this.currentTaskCollectionModel?.list.$add(data);
			this.currentTaskCollectionModel?.list.$save();
			view.touch().update();
			toaster.success(`Task <strong>${data.title}</strong> added`);
		},
		clearCompleted() {
			this.currentTaskCollectionModel?.list.$all(task => task.done).forEach(task => task.$delete({destroy:false}));
		},
		onTaskListDelete(){
			const fnDelete = async ()=>{
				const name = this.currentTaskCollectionModel?.name;
				/* Delete task list model and collection */
				this.currentTaskCollectionModel?.$delete();
				/* Remove task list from task list collection */
				taskListCollection.$removeWhere({ $key: this.currentTaskListCollectionId});
				this.currentTaskListCollectionId = null;
				view.touch();
				toaster.warning(`Task list <strong>${name}</strong> deleted`);
			}
			/* Check if task list is empty */
			if(this.currentTaskCollectionModel?.list.$items.length > 0){
				bootbox.confirm({
					title: /* html */`<div class='text-warning-emphasis'><i class='bi bi-exclamation-triangle'></i> Task list is not empty!</div>`,
					message: "Are you sure you want to DELETE this task list and ALL TASKS inside it?",
					className: 'bg-warning-emphasis',
					buttons: {
						confirm: {
							label: 'Yes',
							className: 'btn-warning'
						},
						cancel: {
							label: 'Cancel',
							className: 'btn-secondary'
						}
					},
					callback: (result)=>{
						if(result)
							fnDelete();
					}
				});
			}else{
				fnDelete();
			}
		},
		onReload(){
			this.currentTaskCollectionModel?.list.$fetch({reset: false})
				.then((res)=>{
					view.touch();
					toaster.info(`Task list <strong>${this.currentTaskCollectionModel?.name}</strong> reloaded`);
				})
				.catch(async result=>{
					toaster.danger(result.error.message,result.error.name);
				});

		}
	},
	mounted(){
		taskListCollection.$fetch().then(()=>{
			view.touch();
		});
	},
	created(){
		//Bind all tasks' done property to view update and save
		taskListCollection.$on('add.sync',(event)=>{
			event.model.$on('change:list',(event)=>{
				event.value.$on('add.sync',(event)=>{
					event.model.$on('error',(event)=>{
						toaster.danger(event.error.message,event.error.name);
						event.target.$revert();
						event.target.view?.touch();
					});
					event.model.$on('change:done',(event)=>{
						event.target.$collection?.$save({ownPropertiesOnly: true});
						view.touch();
					});
				});
			});
		});
		view.setNativeView(this,'stateVersion');

		//Config model
		configModel.$on('sync.read',(event)=>{
			this.config = configModel.$propState;
		});
		configModel.$on('error',(event)=>{
			toaster.danger(event.error.message,event.error.name);
			configModel.$revert();
			this.config = configModel.$propState;
		});
		configModel.$fetch()
		.finally(()=>{
			const fnChange = ()=>{
				configModel.$update(this.config);
				configModel.$save();
			}
			this.$watch('config.theme',fnChange);
			this.$watch('config.palette',fnChange);
			this.$watch('config.showCompleted',fnChange);
		});
	}
}