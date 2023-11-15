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
			currentTaskCollection: this.currentTaskCollection
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
		currentTaskCollection(){
			this.stateVersion;
			return this.currentTaskListCollectionId !== null ? taskListCollection.$one(taskList => taskList.$key == this.currentTaskListCollectionId).list : null;
		},
		tasks(){
			this.stateVersion;
			if(this.config.showCompleted){
				return this.currentTaskCollection ? [...this.currentTaskCollection.$items] : [];
			}
			return this.currentTaskCollection ? this.currentTaskCollection.$all(task => !task.done) : [];
		},
		count_tasks_left(){
			this.stateVersion;
			return this.currentTaskCollection ? this.currentTaskCollection.$all(task => !task.done).length : 0;
		},
		count_tasks_completed(){
			this.stateVersion;
			return this.currentTaskCollection ? this.currentTaskCollection.$all(task => task.done).length : 0;
		}
	},
	methods: {
		onTaskListSelected(event){
			if(event.target.value == 'new'){
				bootbox.prompt('Enter new task list name',async (result)=>{
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
					}catch(e){
						taskListCollection.$removeWhere(ckey);
						this.errorMessage = e[0];
						this.$refs.taskListSelector.value = '';
					}
				});
				return;
			}
		},
		addTask(data) {
			this.currentTaskCollection.$add(data);
			this.currentTaskCollection.$save();
			view.touch().update();
		},
		clearCompleted() {
			this.currentTaskCollection.$all(task => task.done).forEach(task => task.$delete({destroy:false}));
		},
		onReload(){
			this.currentTaskCollection.$fetch({reset: false})
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
			this.$refs.taskListSelector.disabled = false;
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