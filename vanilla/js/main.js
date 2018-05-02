window.onload = function () {
    // 使い道があまりなくなったので廃止
    // JSONにシリアライズするので面倒な割に活用余地がなくなった
    // class Task {
    //     constructor(content, isCompleted = false) {
    //         this.content = content;
    //         this.isCompleted = isCompleted;
    //     }
    //     complete() {
    //         this.isCompleted = true;
    //     }
    //     unComplete() {
    //         this.isCompleted = false;
    //     }
    //     update(content) {
    //         this.content = content;
    //     }
    // }

    function each(object, callback) {
        for (const key in object) {
            if (object.hasOwnProperty(key)) {
                const element = object[key];
                callback(element, key);
            }
        }
    }

    /**
    * Taskを管理するクラス
    * localStorageと依存関係
    * localStorageに一つのキーでタスク配列でぶっこむ。
    * NOTE: keyがidのオブジェクト。idは`task_${n}`
    * そうなるとdeleteした時にidが全部変更されて困るのでやっぱ保持する
    */
    const TaskManager = new class {

        constructor() {
			this.taskList = this._getFromStorage();
        }

		find(taskId) {
            const task = this.taskList[taskId];
            return (task !== undefined) ? task : null;
		}

        // TODO: keyの形式が直値チックなの修正する
        add(task) {
            const id = this._publishId();
            const key = 'task_' + id;
            task.id = key;
            
            this.taskList[key] = task;
            this._syncStorage();
        }

        delete(taskId) {
            delete this.taskList[taskId];
            this._syncStorage();
        }

        update(taskId, newTask) {
            this.taskList[taskId] = newTask;
            this._syncStorage();
        }

        clear() {
            this.taskList = {};
            this._syncStorage();
        }

        get list() { return this.taskList; }
        get length() { return Object.keys(this.taskList).length; }

        // FIXME: Storage用のクラスに切り分ける
        _getKey() { return 'todomvc'; } // クラス定数無理やり＼(^o^)／

        _getFromStorage() {
            const key = this._getKey();
            const val = localStorage.getItem(key);
            // NOTE: 状態が三つ存在する。null, [], [something, ...]
            return (val === null) ? {} : JSON.parse(val);
        }

        // オブジェクトとlocalStorageの内容を同期
        _syncStorage() {
            const key = this._getKey();
            const val = JSON.stringify(this.taskList);
            localStorage.setItem(key, val);
		}

		// IDを発行
		_publishId() {
			const key = 'todomvc/latest_id';
			const latestId = localStorage.getItem(key);
			const newId = (latestId === null) ? 0 : +latestId + 1;
			localStorage.setItem(key, newId);

			return newId;
		}
    };

    // =============== Controller =============== //

    // NOTE: モデルと合体させる？？
    const vTaskCard = new class {
        constructor() {
            this.template = document.getElementById('tpl-card');
        }

        generate(taskId, taskText, isCompleted) {
            let node = document.importNode(this.template.content, true);

            let domParent = node.querySelector('.card');
            domParent.setAttribute('data-task-id', taskId);
            domParent.setAttribute('data-completed', isCompleted+'');


            let domCheckbox = node.querySelector('.card-checkbox');
            domCheckbox.addEventListener('click', function () {
                const parent      = this.parentNode;
                const isCompleted = parent.getAttribute('data-completed');
                const setVal = (isCompleted === 'true') ? false : true;

                // Update task
                const taskId = parent.getAttribute('data-task-id');
                const task = TaskManager.find(taskId);
                task.isCompleted = setVal;
                TaskManager.update(taskId, task);

                // Update view
                parent.setAttribute('data-completed', setVal);

                updateNum();
            });

            let domCardText = node.querySelector('.card-text');
            domCardText.textContent = taskText;
            domCardText.addEventListener('dblclick', function () {
                const domCardTextEdit = this.parentNode.querySelector('.card-text-edit');

                domCardTextEdit.style = 'display: block';
                domCardTextEdit.querySelector('input').value = this.textContent;

                this.style = 'display: none;';
                this.parentNode.querySelector('.card-delete-area').style = 'display: none;';

                domCardTextEdit.querySelector('input').focus();
            });

            // FIXME: 両方にイベントを設定して削除するのでなんか変なエラー出るから直す
            let domCardTextEdit = node.querySelector('.card-text-edit input');
            domCardTextEdit.addEventListener('blur', function () {
                const domCardTextEdit = this.parentNode;
                const taskId = domCardTextEdit.parentNode.getAttribute('data-task-id');

                // TODO: 消すので共通化
                if (this.value === '') {
                    TaskManager.delete(taskId);
                    domCardTextEdit.parentNode.parentNode.removeChild(domCardTextEdit.parentNode);
                    updateNum();
                } else {
                    const domCardText = domCardTextEdit.parentNode.querySelector('.card-text');

                    let task = TaskManager.find(taskId);
                    task.content = this.value;
                    TaskManager.update(taskId, task);

                    domCardTextEdit.style = 'display: none;';

                    domCardText.textContent = this.value;
                    domCardText.style = 'display: block';
                    domCardText.parentNode.querySelector('.card-delete-area').style = 'display: block;';
                }
                return false;
            });
            // FIXME: 最悪なので直すこと
            domCardTextEdit.addEventListener('keydown', function (e) {
                if(e.keyCode !== 13) return;
                const domCardTextEdit = this.parentNode;
                const taskId = domCardTextEdit.parentNode.getAttribute('data-task-id');

                // TODO: 消すので共通化
                if (this.value === '') {
                    TaskManager.delete(taskId);
                    domCardTextEdit.parentNode.parentNode.removeChild(domCardTextEdit.parentNode);
                    updateNum();
                } else {
                    const domCardText = domCardTextEdit.parentNode.querySelector('.card-text');

                    let task = TaskManager.find(taskId);
                    task.content = this.value;
                    TaskManager.update(taskId, task);

                    domCardTextEdit.style = 'display: none;';

                    domCardText.textContent = this.value;
                    domCardText.style = 'display: block';
                    domCardText.parentNode.querySelector('.card-delete-area').style = 'display: block;';
                }
                return false;
            });


            let domDeleteArea = node.querySelector('.card-delete-area');
            domDeleteArea.addEventListener('click', function() {
                const taskId = this.parentNode.getAttribute('data-task-id');

                TaskManager.delete(taskId);
                this.parentNode.parentNode.removeChild(this.parentNode);
                document.querySelector('.card-left-num').textContent = TaskManager.length + ' item left';
            });

            return node;
        }

        add(taskId) {
            const task = TaskManager.find(taskId);
            
            const dom = this.generate(taskId, task.content, task.isCompleted);
            document.getElementById('card-box-list').appendChild(dom);

            updateNum();
        }
    };


    // =============== View =============== //
    const createTask = function (e) {
        if (e.keyCode !== 13) return false; // 13 is Key Code of Enter
        if (this.value === '') return false;
        const task = {
            content: this.value,
            isCompleted: false
        };

        TaskManager.add(task);
        vTaskCard.add(task.id);

        this.value = '';
    };
    document.querySelector('#card-box-generator input').addEventListener('keydown', createTask);

    each(TaskManager.list, function (task, taskId) {
        vTaskCard.add(taskId);
    });

    const switchAllTask = function () {
        let isAllCompleted = true;
        each(TaskManager.list, function (task) {
            if (!task.isCompleted) isAllCompleted = false;
        });
        const updateParameter = (isAllCompleted) ? false : true;


        each(TaskManager.list, function (task, taskId) {
            task.isCompleted = updateParameter;
            TaskManager.update(taskId, task);
        });

        const cardList = document.getElementById('card-box-list').children;
        for (let i = 0; i < cardList.length; i++) {
            const card = cardList[i];
            card.setAttribute('data-completed', updateParameter);
        }
        updateNum();
        switchDisplayList();
    };
    document.getElementById('switch-all-checkbox').addEventListener('click', switchAllTask);

    const filterClosure = function (type) {
        const checker = {
            'all': function () { return true; },
            'active': function (isCompleted) { return isCompleted === false; },
            'completed': function (isCompleted) { return isCompleted === true;}
        }[type];
        return function () {
            const cardList = document.getElementById('card-box-list').children;
            for (let i = 0; i < cardList.length; i++) {
                const card = cardList[i];

                const isCompleted = (card.getAttribute('data-completed') === 'true') ? true : false;
                (checker(isCompleted)) ? show(card) : hide(card);
            }
            document.querySelector('.card-display-switch').setAttribute('data-status', type);
            updateNum();
        };
    };

    function show(elem) { elem.style = 'display:block;'; };
    function hide(elem) { elem.style = 'display:none;'; };

    Array.prototype.slice.call(document.getElementsByClassName('btn-filter-list')).forEach(function (elem) {
        elem.addEventListener('click', filterClosure(elem.getAttribute('data-type')));
    });

    const deleteAllCompletedTask = function () {
        const completeTasks = [];
        each(TaskManager.list, function (task, taskId) {
            if (task.isCompleted) {
                completeTasks.push(taskId);
            }
        });

        completeTasks.forEach(function (taskId) {
            TaskManager.delete(taskId);
            const dom = document.querySelector('.card[data-task-id="'+taskId+'"]');
            dom.parentNode.removeChild(dom);
        });
        updateNum();
    };
    document.querySelector('.card-clear-completed').addEventListener('click', deleteAllCompletedTask);
    updateNum();

    function updateNum() {
        // const type = document.querySelector('.card-display-switch').getAttribute('data-status');
        let num = 0;
        each(TaskManager.list, function (task) {
            if (task.isCompleted === false) num++;
        });
        // if (type === 'all') {
        //     num = TaskManager.length;
        // }
        // else if (type === 'active') {
        // }
        // else if (type === 'completed') {
        //     each(TaskManager.list, function (task) {
        //         if (task.isCompleted === true) num++;
        //     });
        // }
        document.querySelector('.card-left-num').textContent = num + ' item left';
    }
    
    function switchDisplayList() {
        // const type = document.querySelector('.card-display-switch').getAttribute('data-status');
        // const list = document.getElementById('card-box-list').children();
        // if (type === 'all') {
        //     list.forEach(function (v, i) {
        //         console.log(v, i);
        //     });
        // }
        // else if (type === 'active') {

        // }
        // else if (type === 'completed') {
        //     each(TaskManager.list, function (task) {
        //         if (task.isCompleted === true) num++;
        //     });
        // }
    }
};