import TaskItemRowComponent from './TaskItemRowComponent.js';

export default {
	components: {
		'task-item': TaskItemRowComponent,
	},
	props:[ 'tasks' ],
	template: /* html */`
		<ul class="list-group">
			<task-item v-for="task in tasks" :key="task.id" :task="task"></task-item>
		</ul>
	`,
}