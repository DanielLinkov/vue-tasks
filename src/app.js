import AddTaskComponent from "./AddTaskComponent.js";
import TaskListComponent from "./TaskListComponent.js";
import CheckboxComponent from "./CheckboxComponent.js";
import { ConfigModel, TaskCollection, TaskModel, TaskCollectionModel, TaskListCollection } from "./Classes.js";
import { ViewAdapterVue } from "../lib/View.js";
import { nextTick } from "vue";

const configModel = new ConfigModel({},{
});

const taskListCollection = new TaskListCollection({},{
});

const view = new ViewAdapterVue();

let errorMessageTimerId	= null;

export default {
	components: {
		'add-task-box': AddTaskComponent,
		'task-list': TaskListComponent,
		'labeled-checkbox': CheckboxComponent,
	},
	provide() {
		return {
			currentTaskCollectionModelGetter: ()=>{
				return this.currentTaskCollectionModel;
			}
		}
	},
	data(){
		return {
			currentTaskListCollectionId: null,
			config: configModel.$propState,
			stateVersion: 0,
			errorMessage: null,
		}
	},
	watch: {
		'config.theme': (val)=>{
			document.body.setAttribute('data-bs-theme',val);
		},
		errorMessage(val){
			if(val){
				if(errorMessageTimerId)
					clearTimeout(errorMessageTimerId);
				errorMessageTimerId = setTimeout(()=>{
					this.errorMessage = null;
					errorMessageTimerId = null;
				},3000);
			}
		}
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
		onTaskListSelected(event){
			if(event.target.value == 'new'){
				bootbox.prompt('Enter new task list name',async (result)=>{
					this.$refs.taskListSelector.value = '';
					if(result === null){
						this.$refs.taskListSelector.value = this.currentTaskListCollectionId || '';
						return;
					}
					const taskList = new TaskCollectionModel({
						name: result
					});
					const ckey = taskListCollection.$add(taskList);
					try{
						await taskListCollection.$save();
						view.touch();
						await nextTick();
						this.$refs.taskListSelector.value = taskList.$key;
						this.currentTaskListCollectionId = +taskList.$key;
					}catch(e){
						taskListCollection.$removeWhere(ckey);
						this.errorMessage = e[0];
						this.$refs.taskListSelector.value = this.currentTaskListCollectionId || '';
					}
				});
				return;
			}
			this.currentTaskListCollectionId = +event.target.value;
			view.touch()
		},
		addTask(data) {
			this.currentTaskCollectionModel?.list.$add(data);
			this.currentTaskCollectionModel?.list.$save();
			view.touch().update();
		},
		clearCompleted() {
			this.currentTaskCollectionModel?.list.$all(task => task.done).forEach(task => task.$delete({destroy:false}));
		},
		onTaskListDelete(){
			const fnDelete = async ()=>{
				this.currentTaskCollectionModel?.$delete();
				taskListCollection.$removeWhere({ $key: this.currentTaskListCollectionId});
				this.currentTaskListCollectionId = null;
				this.$refs.taskListSelector.value = '';
				view.touch();
			}
			if(this.currentTaskCollectionModel?.list.$items.length > 0){
				bootbox.confirm({
					title: "<div class='text-warning'><i class='bi bi-exclamation-triangle'></i> Task list is not empty!</div>",
					message: "Are you sure you want to DELETE this task list and ALL TASKS inside it?",
					className: 'bg-warning',
					buttons: {
						confirm: {
							label: 'Yes',
							className: 'btn-warning'
						},
						cancel: {
							label: 'No',
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
				})
				.catch(async result=>{
					console.warn('fetch error:',result);
				});

		}
	},
	mounted(){
		taskListCollection.$fetch().then(()=>{
			this.$refs.taskListSelector.disabled = false;	// Enable the selector after collections are fetched
			view.touch();
		});
	},
	created(){
		//Bind all tasks' done property to view update and save
		taskListCollection.$on('add.sync',(event)=>{
			event.model.$on('change:list',(event)=>{
				event.value.$on('add.sync',(event)=>{
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
			this.errorMessage = event.error;
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
			this.$watch('config.showCompleted',fnChange);
		});
	}
}