import AddTaskComponent from "./AddTaskComponent.js";
import TaskListComponent from "./TaskListComponent.js";
import CheckboxComponent from "./CheckboxComponent.js";
import { ConfigModel, TaskCollection, TaskModel } from "./Classes.js";
import { ViewAdapterVue } from "../lib/View.js";

const configModel = new ConfigModel({},{
});
const taskCollection = new TaskCollection({
	tag: 'default',
});

const view = new ViewAdapterVue();

let errorMessageTimerId	= null;

export default {
	components: {
		'add-task-box': AddTaskComponent,
		'task-list': TaskListComponent,
		'labeled-checkbox': CheckboxComponent,
	},
	provide: {
		taskCollection,
	},
	data(){
		return {
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
		tasks(){
			this.stateVersion;
			if(this.config.showCompleted){
				return [...taskCollection.$items];
			}
			return taskCollection.$all(task => !task.done);
		},
		count_tasks_left(){
			this.stateVersion;
			return taskCollection.$all(task => !task.done).length;
		},
		count_tasks_completed(){
			this.stateVersion;
			return taskCollection.$all(task => task.done).length;
		}
	},
	methods: {
		addTask(data) {
			taskCollection.$add(data);
			taskCollection.$save();
			view.touch().update();
		},
		clearCompleted() {
			taskCollection.$all(task => task.done).forEach(task => task.$delete({destroy:false}));
		},
		onReload(){
			taskCollection.$fetch({reset: false})
				.then((res)=>{
					view.touch();
				})
				.catch(async result=>{
					console.warn('fetch error:',result);
				});

		}
	},
	mounted(){
		taskCollection.$fetch()
			.then((res)=>{
				view.touch();
			})
			.catch(async result=>{
				console.warn('fetch error:',result);
			});
	},
	created(){
		const fnChange = (event)=>{
			view.touch();
			event.target.$collection.$save();
		}
		taskCollection.$on('add.sync',(event)=>{
			event.model.$on('change:done',fnChange);
			event.model.$on('sync.delete',()=>{
				event.model.$destroy();
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
		view.setNativeView(this,'stateVersion');
		configModel.$on('sync.read',(event)=>{
			this.config = configModel.$propState;
		});
		configModel.$on('error',(event)=>{
			this.errorMessage = event.error;
			configModel.$revert();
			console.log(configModel.$propState);
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