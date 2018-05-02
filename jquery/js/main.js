$(() => {
	const TaskManager = new class {
		constructor() {
			this.taskList = this._getFromStorage();
			this.events = [];
		}
		
		// FIXME: Viewの話なのでここに入れるべきでない
		change(callback) {
			this.events.push(callback);
		}

		fire(id, task) {
			this.events.forEach((f) => {
				f(id, task);
			});
		}

		get length() { return Object.keys(this.taskList).length; }
		
		each(callback) {
			for (const key in this.taskList) {
				if (this.taskList.hasOwnProperty(key)) {
					const task = this.taskList[key];
					callback(task, key);
				}
			}
		}

		find(id) {
			const task = this.taskList[id];
			return (task === undefined) ? null : task;
		}

		add(task) {
			const id = 'task_' + this._publishId();
			task.id = id;
			this.taskList[id] = task;
			this.syncStorage();
			this.fire(id, task);
		}
		
		update(id, newTask) {
			this.taskList[id] = newTask;
			this.syncStorage();
			this.fire(id, newTask);
		}
		
		delete(id) {
			delete this.taskList[id];
			this.fire(id);
			this.syncStorage();
		}

		clear() {
			this.taskList = {};
			this.syncStorage();
			localStorage.clear();
		}

		getActiveCount() {
			let num = 0;
			this.each((task) => {
				if(!task.isCompleted) num++;
			});
			return num;
		}
		
		syncStorage() {
			const key = this._getKey();
			localStorage.setItem(key, JSON.stringify(this.taskList));
		}

		_getKey() { return 'todomvc'; }
		
		_getFromStorage() {
			const key = this._getKey();
			const val = localStorage.getItem(key);
			return (val === null) ? {} : JSON.parse(val);
		}

		_publishId() {
			const key = 'todomvc/latest_id';
			const latestId = localStorage.getItem(key);
			const newId = (latestId === null) ? 0 : +latestId + 1;
			localStorage.setItem(key, newId);
			return newId;
		}
	};

	class vTaskCard {
		constructor(task) {
			this.dom = $($('#tpl-card').html());
			const text = $('#tpl-card').html();
			this.bind(task);
		}

		// FIXME: addされる側なのでAddではない(boxのクラス作ってしまう...?)
		add(task) {
			$('#card-box-list').append(this.dom);
		}

		bind(task) {
			this.dom.find('.card-text').text(task.content);
			this.dom.attr({
				'data-task-id': task.id,
				'data-completed': task.isCompleted
			});

		}
	}

	// ----- View -----
	const _render = () => {
		TaskManager.each((task) => {
			const taskCard = new vTaskCard(task);
			taskCard.add();
		});
	};
	const addTaskCard = (text) => {
		if (text === '') return;
		const task = {
			content: text,
			isCompleted: false
		};
		TaskManager.add(task);
		const taskCard = new vTaskCard(task);
		taskCard.add();
	};


	const changeEditable = (e) => {
		const $cardText = $(e.target);
		const $cardTextEdit = $cardText.siblings('.card-text-edit');
		const $input = $cardTextEdit.children('input');

		$input.val($cardText.text());

		$cardText.hide();
		$cardTextEdit.show();
		
		$input.focus();
	};

	// TODO: vTaskのメンバ関数にする
	const deleteTaskCard = (id) => {
		// const $card = $(e.target).parent();
		// const id = $card.attr('data-task-id');

		const $card = $('.card[data-task-id="'+id+'"]');
		TaskManager.delete(id);
		$card.remove();
	};


	const updateTaskCard = (e) => {
		const $cardTextEdit = $(e.target).parent();
		const $cardText = $cardTextEdit.siblings('.card-text');		
		const id = $cardText.parent().attr('data-task-id');

		const taskText = e.target.value;

		if (taskText === '') {
			// TODO: vTaskCardのメンバ関数にする
			// removeTaskCard();
			// TaskManager.delete(id);
			// $cardText.parent().remove();
			deleteTaskCard(id);
		} else {
			let task = TaskManager.find(id);
			
			task.content = taskText;
			TaskManager.update(id, task);
	
			$cardText.text(taskText).show();
			$cardTextEdit.hide();
		}
	};

	const toggleTaskStatus = (e) => {
		const $checkbox = $(e.target);
		const $card = $checkbox.parent();
		const id = $card.attr('data-task-id');
		const param = !($card.attr('data-completed') === 'true');
		
		const task = TaskManager.find(id);
		task.isCompleted = param;
		TaskManager.update(id, task);
		
		$card.attr('data-completed', param);
	};

	const toggleAllTaskStatus = () => {
		let isAllComplete = true;
		TaskManager.each((task) => {
			if (!task.isCompleted) {
				isAllComplete = false;
			}
		});
		const setVal = !isAllComplete;
		$('#card-box-list').children().each((i, card) => {
			const $card = $(card);
			const id = $card.attr('data-task-id');
			let task = TaskManager.find(id);
			if (task.isCompleted === setVal) return true;
			task.isCompleted = setVal;
			TaskManager.update(id, task);

			$card.attr('data-completed', setVal);
		});

	};

	const deleteAllCompletedTask = () => {
		TaskManager.each((task, id) => {
			if (task.isCompleted) deleteTaskCard(id);
		});
	};

	const filterTaskCardList = (e) => {
		const $button = $(e.target);
		const type = $button.attr('data-type');

		if (type === 'all') {
			$('#card-box-list .card').show();
		} else if (type === 'active') {
			$('#card-box-list .card').hide();
			$('#card-box-list .card[data-completed="false"]').show();
		} else if (type === 'completed') {
			$('#card-box-list .card').hide();
			$('#card-box-list .card[data-completed="true"]').show();
		}
		$('.card-display-switch').attr('data-type', type);
		$('.btn-filter-list').attr('data-selected', false);
		$button.attr('data-selected', true);
	};



	$(document).on('keydown', '#card-box-generator input', (e) => {
		if (e.keyCode === 13) {
			const $input = $('#card-box-generator input');
			const val = $input.val(); // NOTE: なぜかthisで取れない
			if (val !== '') {
				addTaskCard(val);
				$input.val('');
			}
		}
	});

	$(document).on('dblclick', '.card-text', changeEditable);
	$(document).on('blur', '.card-text-edit', updateTaskCard);
	$(document).on('keydown', '.card-text-edit', (e) => {
		if (e.keyCode === 13) { updateTaskCard(e); }
	});
	$(document).on('click', '.card-delete-area', (e) => {
		const id = $(e.target).parent().attr('data-task-id');
		deleteTaskCard(id);
	});

	$(document).on('click', '.card-checkbox', toggleTaskStatus);

	$(document).on('click', '#clear-all-completed', deleteAllCompletedTask);
	$(document).on('click', '#switch-all-checkbox', toggleAllTaskStatus);

	$(document).on('click', '.btn-filter-list', filterTaskCardList);

	TaskManager.change((id) => {
		$('.card-left-num').text(TaskManager.getActiveCount() + ' item left');
		const filterType = $('.card-display-switch').attr('data-type');
		const $card = $('.card[data-task-id="'+id+'"]');
		const task = TaskManager.find(id);
		if (task === null) return;
		if (filterType == 'active') {
			if(task.isCompleted) $card.hide();
		} else if (filterType == 'completed') {
			if(!task.isCompleted) $card.hide();
		}
	});

	const footerControl = () => {
		if (TaskManager.length > 0) {
			$('#card-box-footer').show();
		} else {
			$('#card-box-footer').hide();
		}
		if (TaskManager.length - TaskManager.getActiveCount() > 0) {
			$('.card-clear-completed').show();
		} else {
			$('.card-clear-completed').hide();
		}
		if ($('.card[:visible]').length > 0) {
			$('#switch-all-checkbox').attr('data-enabled', true);
		} else {
			$('#switch-all-checkbox').attr('data-enabled', false);
		}
	};
	TaskManager.change(footerControl);
	
	$('.card-left-num').text(TaskManager.getActiveCount() + ' item left');
	footerControl();

	_render();

});