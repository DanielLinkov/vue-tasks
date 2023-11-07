import AddTaskComponent from "./AddTaskComponent.js";
import TaskListComponent from "./TaskListComponent.js";
import CheckboxComponent from "./CheckboxComponent.js";
import { ConfigModel, TaskCollection, TaskModel } from "./Classes.js";
import { ViewAdapterVue } from "../lib/View.js";

const configModel = new ConfigModel();
const taskCollection = new TaskCollection();

console.log(taskCollection);

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
		deleteTask(ckey) {
			taskCollection.$deleteOne(ckey);
			view.touch();
			this.$refs.taskList.$forceUpdate();
		},
		clearCompleted() {
			taskCollection.$deleteWhere(task => task.done);
			view.touch();
			this.$refs.taskList.$forceUpdate();
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
		view.setNativeView(this,'stateVersion');
		configModel.$fetch().then(result => {
			if(result === true)	//Config exists and was updated
				this.config = configModel.$propState;
		},result=>{
			console.error('fetch error:',result);
		})
		.finally(()=>{
			const fnChange = ()=>{
				configModel.$update(this.config);
				configModel.$save()
					.then(result=>{
						if(!result)
							console.warn(configModel.$errors);
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