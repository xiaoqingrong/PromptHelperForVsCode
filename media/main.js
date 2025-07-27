//@ts-check

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
    /**
     * 备用的复制文本到剪贴板方法
     * @param {string} text 要复制的文本
     */
    function fallbackCopyTextToClipboard(text) {
        try {
            // 创建临时文本区域
            const textArea = document.createElement('textarea');
            textArea.value = text;
            
            // 避免滚动到底部
            textArea.style.top = '0';
            textArea.style.left = '0';
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            // 执行复制命令
            const successful = document.execCommand('copy');
            
            // 清理
            document.body.removeChild(textArea);
            
            if (successful) {
                vscode.postMessage({ 
                    type: 'notification', 
                    message: '标题已复制到剪贴板' 
                });
            } else {
                console.error('备用复制方法失败');
            }
        } catch (err) {
            console.error('备用复制方法出错:', err);
        }
    }
    // @ts-ignore
    const vscode = acquireVsCodeApi();

		console.log(vscode.Uri,"vscode.Uri");
		

    const oldState = vscode.getState() || { colors: [] };

    // /** @type {Array<{ value: string }>} */
    let colors = oldState.colors;

		let prompts = []

    // updateColorList(colors);
		fetchAIPrompt().then(() => {
			// 初始化折叠功能
			initCollapsible();
		});

    // const addButton = document.querySelector('.add-color-button');
    // if (addButton) {
    //     addButton.addEventListener('click', async () => {
            
		// 				// addColor(item.content);
    //     });
    // }
		async function fetchAIPrompt() {
			try {
					const response = await fetch('https://vscodeapi.frontlearn.work:8086/prompts?page=1&size=100', {
							// mode: 'no-cors' // Add no-cors mode to handle CORS restrictions
					});
					console.log(response,"response");
					
					if (response.type === 'opaque') {
							// With no-cors, response is opaque and can't be read
							console.log('Received opaque response due to CORS restrictions');
					} else if (response.ok) {
							const _prompts = await response.json();
							console.log('Fetch successful', _prompts);
							for (let index = 0; index < _prompts.length; index++) {
								const item = _prompts[index];

        				prompts.push(item);
								
							}
							updateColorList(prompts);
					}
			} catch (error) {
					console.error('Fetch error:', error);
			}
			return Promise.resolve(); // 确保返回一个Promise
		}

    // Handle messages sent from the extension to the webview
    window.addEventListener('message', event => {
        const message = event.data; // The json data that the extension sent
				console.log(event,'eventeventevent');
				
        switch (message.type) {
            case 'addColor':
                {
                    addColor();
                    break;
                }
            case 'clearColors':
                {
                    colors = [];
                    updateColorList(colors);
                    break;
                }

        }
    });

    /**
     * @param {Array<any>} prompts
     */
    function updateColorList(prompts) {
				const Vue2Wrap = document.querySelector('#Vue2Wrap');
				const Vue3Wrap = document.querySelector('#Vue3Wrap');
				const gitWrap = document.querySelector('#gitWrap');
				
        for (const promptItem of prompts) {
					if (promptItem.tags == 1) {
						addPromptVue2(Vue2Wrap, promptItem);
					} else if(promptItem.tags == 2) {
						addPromptVue2(Vue3Wrap, promptItem);
					} else if(promptItem.tags == 3) {
						addPromptVue2(gitWrap, promptItem);
					}
        }

        // Update the saved state
        vscode.setState({ colors: colors });
    }
		/**
		 * 初始化折叠功能
		 */
		function initCollapsible() {
			// 获取所有标题元素
			const titles = document.querySelectorAll('.title');
			
			// 为每个标题添加点击事件
			titles.forEach(title => {
				// 添加折叠指示器类
				title.classList.add('collapsible');
				
				// 默认设置为折叠状态
				title.classList.add('collapsed');
				
				// 获取相邻的prompt-list元素并设置初始状态为折叠
				if (title instanceof HTMLElement) {
					const parent = title.parentElement;
					if (parent) {
						const promptList = parent.querySelector('.prompt-list');
						if (promptList instanceof HTMLElement) {
							promptList.style.height = '0';
						}
					}
				}
				
				// 添加点击事件处理
				title.addEventListener('click', () => {
					if (title instanceof HTMLElement) {
						toggleCollapsible(title);
					}
				});
			});
		}
		
		/**
		 * 切换折叠状态
		 * @param {HTMLElement} title 标题元素
		 */
		function toggleCollapsible(title) {
			// 切换展开/折叠状态
			const wasExpanded = title.classList.contains('expanded');
			title.classList.toggle('expanded');
			title.classList.toggle('collapsed');
			
			// 获取相邻的prompt-list元素
			const parent = title.parentElement;
			if (parent) {
				const promptList = parent.querySelector('.prompt-list');
				if (promptList instanceof HTMLElement) {
					// 切换显示/隐藏，使用动画效果
					if (!wasExpanded) {
						// 从折叠到展开
						// 先计算内容的实际高度
						promptList.style.height = 'auto';
						promptList.style.position = 'absolute';
						promptList.style.visibility = 'hidden';
						promptList.style.display = 'block';
						const height = promptList.scrollHeight;
						promptList.style.position = '';
						promptList.style.visibility = '';
						promptList.style.display = '';
						
						// 设置初始高度为0，然后过渡到实际高度
						promptList.style.height = '0';
						// 强制重排以应用初始高度
						promptList.offsetHeight;
						promptList.style.height = height + 'px';
						
						// 动画完成后设置为auto
						setTimeout(() => {
							promptList.style.height = 'auto';
						}, 300);
					} else {
						// 从展开到折叠
						// 先设置明确的高度，再过渡到0
						const height = promptList.scrollHeight;
						promptList.style.height = height + 'px';
						// 强制重排以应用初始高度
						promptList.offsetHeight;
						promptList.style.height = '0';
					}
				}
			}
		}

		/**
		 * Vue2插入
		 * @param {*} contanerDom 
		 * @param {*} promptItem 
		 */
		function addPromptVue2(contanerDom, promptItem) {
			const Vue2WrapList = contanerDom.querySelector('.prompt-list');

			const promptItemDom = document.createElement('div');
			promptItemDom.className = 'prompt-item';

			const promp_icon = document.createElement('img');
			promp_icon.className = 'prompt-icon';
			// 使用vscode.Uri.joinPath和asWebviewUri来获取正确的图片路径
			const iconPath = document.getElementById('icon-path');
			if (iconPath && iconPath.dataset && iconPath.dataset.path) {
				promp_icon.src = iconPath.dataset.path;
			} else {
				promp_icon.src = '';
			}

			const promp_right = document.createElement('div');
			promp_right.className = 'prompt-right';

			const promp_content = document.createElement('div');
			promp_content.className = 'prompt-content';
			promp_content.innerText = promptItem.content;

			const promp_title = document.createElement('div');
			promp_title.className = 'prompt-title';
			if (promp_title) {
				const promp_title_text = document.createElement('span');
				promp_title_text.className = 'prompt-title-text';
				promp_title_text.innerText = promptItem.title;

				const promp_title_cpy = document.createElement('img');
				promp_title_cpy.className = 'prompt-title-cpy';

				// 使用vscode.Uri.joinPath和asWebviewUri来获取正确的图片路径
				const copyIconPath = document.getElementById('copy-icon-path');
				if (copyIconPath && copyIconPath.dataset && copyIconPath.dataset.path) {
					promp_title_cpy.src = copyIconPath.dataset.path;
				} else {
					promp_title_cpy.src = '';
				}
				
				// 添加点击事件，复制标题文本到剪贴板
				promp_title_cpy.addEventListener('click', (e) => {
					e.stopPropagation(); // 阻止事件冒泡
					const textToCopy = promp_content.innerText;
					
					// 尝试使用Clipboard API复制文本
					if (navigator.clipboard && navigator.clipboard.writeText) {
						navigator.clipboard.writeText(textToCopy).then(() => {
							// 复制成功的反馈
							vscode.postMessage({ 
								type: 'notification', 
								message: 'copy success' 
							});
						}).catch(err => {
							console.error('复制失败:', err);
							fallbackCopyTextToClipboard(textToCopy);
						});
					} else {
						// 备用复制方法
						fallbackCopyTextToClipboard(textToCopy);
					}
				});
				
				// 添加鼠标悬停样式，提示可点击
				promp_title_cpy.style.cursor = 'pointer';

				promp_title.appendChild(promp_title_text);
				promp_title.appendChild(promp_title_cpy);
			}
			promp_right.appendChild(promp_title);
			
			promp_right.appendChild(promp_content);
			promptItemDom.appendChild(promp_icon);
			promptItemDom.appendChild(promp_right);
			if(Vue2WrapList) {
				Vue2WrapList.appendChild(promptItemDom);
			}

			// 推荐理由
			const promp_description = document.createElement('div');
			promp_description.className = 'promp_description';
			if (promptItem.description) {
				const promp_description_tip = document.createElement('span');
				promp_description_tip.className = 'promp_description_tip';
				promp_description_tip.innerText = '推荐理由: ';
				promp_description.appendChild(promp_description_tip);

				const promp_description_text = document.createElement('span');
				promp_description_text.className = 'promp_description_text';
				promp_description_text.innerText = promptItem.description;
				promp_description.appendChild(promp_description_text);

				promp_right.appendChild(promp_description);
			}
		}

    /** 
     * @param {string} color 
     */
    function onColorClicked(color) {
        vscode.postMessage({ type: 'colorSelected', value: color });
    }

    /**
     * @returns string
     */
    function getNewCalicoColor() {
        const colors = ['020202', 'f1eeee', 'a85b20', 'daab70', 'efcb99'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    function addColor(content) {
        colors.push({ value: content });
        updateColorList(colors);
    }
}());


