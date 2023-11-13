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

export default {
	components: {
		'add-task-box': AddTaskComponent,
		'task-list': TaskListComponent,
		'labeled-checkbox': CheckboxComponent,
	},
	data(){
		return {
			config: configModel.$propState,
			stateVersion: 0,
		}
	},
	watch: {
		'config.theme': (val)=>{
			document.body.setAttribute('data-bs-theme',val);
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
			taskCollection.$deleteWhere(task => task.done);
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
			event.model.$on('detach',()=>{
				event.model.$view.$nativeView.$el.addEventListener('animationend',()=>{
					view.touch();
				});
				event.model.$view.$nativeView.$el.style.setProperty('--item-height',event.model.$view.$nativeView.$el.offsetHeight+'px');	// Set the height of the element to animate
				event.model.$view.$nativeView.$el.classList.add('animate__task-delete');	// Add the animation class to start the animation
			});
		});
		taskCollection.$on('delete.sync',(event)=>{
			event.model.$off('change:done',fnChange);
		});
		view.setNativeView(this,'stateVersion');
		configModel.$on('sync.read',(event)=>{
			this.config = configModel.$propState;
		});
		configModel.$fetch()
		.finally(()=>{
			const fnChange = ()=>{
				configModel.$update(this.config);
				configModel.$save()
					.then(result=>{
					})
					.catch(result=>{
						configModel.$revert();
						this.config = configModel.$propState;
					});
			}
			this.$watch('config.theme',fnChange);
			this.$watch('config.showCompleted',fnChange);
		});
	}
}