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
				return this.currentTaskCollectionModel ? [...this.currentTaskCollectionModel?.list.$items] : [];
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
					if(result === null)
						return;
					const taskList = new TaskCollectionModel({
						name: result,
						list: new TaskCollection(),
					});
					const ckey = taskListCollection.$add(taskList);
					try{
						await taskListCollection.$save();
						view.touch();
						await nextTick();
						this.$refs.taskListSelector.value = taskList.$key;
						this.currentTaskListCollectionId = taskList.$key;
					}catch(e){
						taskListCollection.$removeWhere(ckey);
						this.errorMessage = e[0];
						this.$refs.taskListSelector.value = '';
					}
				});
				return;
			}
			this.currentTaskListCollectionId = event.target.value;
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
		/*
		const fnChange = (event)=>{
			view.touch();
			event.target.$collection.$save();
		}
		taskCollection.$on('add.sync',(event)=>{
			event.model.$on('change:done',fnChange);
			event.model.$on('sync.delete',()=>{
				event.model.$destroy();
				view.touch();
			});
			event.model.$on('error:delete',(event)=>{
				this.errorMessage = event.error;
				event.target.$view.$nativeView.$el.classList.remove('animate__task-delete');	// Remove the animation class to reset the animation
			});
			event.model.$on('delete',()=>{
				event.model.$view.$nativeView.$el.style.setProperty('--item-height',event.model.$view.$nativeView.$el.offsetHeight+'px');	// Set the height of the element to animate
				event.model.$view.$nativeView.$el.classList.add('animate__task-delete');	// Add the animation class to start the animation
			});
		});
		*/
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