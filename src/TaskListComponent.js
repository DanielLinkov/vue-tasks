import TaskItemRowComponent from './TaskItemRowComponent.js';

export default {
	components: {
		'task-item': TaskItemRowComponent,
	},
	data(){
		return {
			editedTaskId: null,
		}
	},
	provide(){
		return {
			editedTaskId: Vue.computed(() => this.editedTaskId),
		}
	},
	props:[ 'tasks' ],
	inject: ['toaster'],
	watch: {
		tasks(list,oldList){
			/* Remove event listeners from old list */
			oldList.forEach(task => {
				task.$off('delete',this._onTaskDelete);
				task.$off('sync',this._onTaskSyncDelete);
				task.$off('error:delete',this._onTaskDeleteError);
			});
		}
	},
	methods: {
		onUpdateEditing(val){
			if(val){
				this.editedTaskId = val;
			}	
		},
		onHandleMouseDown(e){
		},
		onHandleMouseMove(e){
		},
		onHandleMouseUp(e){
		},
		onDelete(task){
			task.$delete({destroy:false});
		},
		/* Add event listeners to new list */
		_onNewTaskList(){
			this.tasks.forEach(task => {
				task.$on('delete',this._onTaskDelete);
				task.$on('sync.delete',this._onTaskSyncDelete,this);
				task.$on('error:delete',this._onTaskDeleteError,this);
			});
		},
		_onTaskDeleteError(event){
			this.errorMessage = event.error;
			event.target.$view.$nativeView.$el.classList.remove('animate__task-delete');
		},
		_onTaskSyncDelete(event){
			this.toaster.info({message: `Task <strong>${event.target.title}</strong> deleted`,
				onUndoCallback: ()=>{
					event.target.$collection.$save();
					event.target.$view.$nativeView.$el.classList.remove('animate__task-delete');
				},
				onHiddenCallback: ()=>{
					event.target.$destroy();
					this.$emit('task-deleted');
				}
			});
		},
		_onTaskDelete(event){
			event.target.$view.$nativeView.$el.style.setProperty('--item-height',event.target.$view.$nativeView.$el.offsetHeight+'px');	// Set the height of the element to animate
			event.target.$view.$nativeView.$el.classList.add('animate__task-delete');
		}
	},
	mounted(){
		/* Add event listeners to new list */
		this._onNewTaskList();
	},
	updated(){
		/* Add event listeners to new list */
		this._onNewTaskList();
	},
	template: /* html */`
		<div class="list-group">
			<div class="task-item-placeholder bg-body-secondary">
				<task-item
					v-for="task in tasks"
					@delete="onDelete(task)"
					@update:editing="onUpdateEditing"
					@mousedown="onHandleMouseDown"
					@mousemove="onHandleMouseMove"
					@mouseup="onHandleMouseUp"
					:key="task.$ckey"
					:task="task"
				></task-item>
			</div>
		</div>
	`,
}