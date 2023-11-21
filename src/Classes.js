import { ModelFactory } from '../spinejs/ModelFactory.js';
import { CollectionFactory } from "../spinejs/CollectionFactory.js";
import { RestApiJsonClient,LocalStorage } from "../spinejs/Storage.js";

const storage = new RestApiJsonClient({
	baseUrl : 'http://localhost:3000',
});
const storage2 = new LocalStorage({
	prefix: 'todo_',
});

const ConfigModel = ModelFactory.createPersistent({
	className : 'ConfigModel',
	props: {
		theme: 'cosmo',
		palette: 'light',
		showCompleted: true,
	},
	storage: storage,
	storageEntityName: 'config',
	validators: {
		palette: (val,model,addError)=>{
			if(val != 'light' && val != 'dark')
				addError("Invalid theme");
		},
	},
	events: {
	},
});

const NewTaskModel = ModelFactory.create({
	className : 'NewTaskModel',
	props: {
		title: ''
	},
	validators: {
		title: (val,model,addError)=>{
			if(typeof val != 'string')
				addError("Invalid title property type");
			val = val.replace(/\s+/g,' ');
			val = val.trim();
			if(val.length == 0)
				addError("Title is empty");
		},
	},
	methods: {
		transform: function(){
			this.title = this.title.trim();
		}
	}
});

const TaskModel = ModelFactory.createPersistent({
	className : 'TaskModel',
	props: {
		title: '',
		done: false,
	},
	methods: {
		transform: function(){
			this.title = this.title.replace(/\s+/g,' ');
			this.title = this.title.toUpperCase();
			this.title = this.title.trim();
		},
		color(){
			return this.done ? 'green' : 'red';
		}
	},
	events: [
	],
	validators: {
		title: [(val,model,addError)=>{
			if(typeof val != 'string')
				addError("Invalid title property type");
			val = val.replace(/\s+/g,' ');
			val = val.trim();
			if(val.length == 0)
				addError("Title is empty");
			return val;
		},(val)=>{
			return val.toUpperCase();
		},(val)=>{
			return val
				.replace(/[oO]/g,'🐵')
				.replace(/[yY]/g,'🦒')
				.replace(/[tT]/g,'✝')
				.replace(/[mM]/g,'🐻')
				;
		}],
	}
});


const TaskCollection = CollectionFactory.createPersistent({
	className : 'TaskCollection',
	modelClass: TaskModel,
	storage: storage,
	storageEntityName: 'tasks',
	collectionModelKeyName: 'task_list_id',
	saveOptions: {
		timeout: 1000,
	},	
	events:	{
	}
});

const TaskCollectionModel = ModelFactory.createPersistent({
	className : 'TaskCollectionModel',
	props: {
		name: '',
		list: null,
	},
	persistent: { list: false },
	events: {
		'create': function(event){
			if(event.target.$key === null)
				return;	// this is a new model, not loaded from storage
			event.target.list = new TaskCollection({collectionModelKeyValue: event.target.$key});
			event.target.list.$fetch().then(()=>{ });
		},
		'sync.write': function(event){	//Upon sync write ($save), create a new TaskCollection
			event.target.list = new TaskCollection({collectionModelKeyValue: event.target.$key});
		},
		'sync.delete': function(event){
			event.target.list.$delete();
			event.target.list = null;
		}
	},
});

const TaskListCollection = CollectionFactory.createPersistent({
	className : 'TaskListCollection',
	modelClass: TaskCollectionModel,
	storage: storage,
	storageEntityName: 'task_lists',
});

export { ConfigModel, TaskModel, NewTaskModel, TaskCollection, TaskCollectionModel, TaskListCollection }