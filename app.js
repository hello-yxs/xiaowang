// 全局状态管理
const appState = {
    currentSection: 'welcome', // welcome, practice, result
    currentQuestionIndex: 0,
    currentQuestionBank: null,
    questionBanks: [],
    userAnswers: [],
    incorrectQuestions: [],
    isReviewMode: false,
    userProgress: {
        correctCount: 0,
        totalAnswered: 0,
        get accuracy() {
            return this.totalAnswered > 0 ? Math.round((this.correctCount / this.totalAnswered) * 100) : 0;
        }
    },
    titles: [
        { name: '啊？这对吗', minAccuracy: 60 },
        { name: '新来的？', minAccuracy: 70 },
        { name: '行吧，算你是海狮了', minAccuracy: 80 },
        { name: '老海狮了', minAccuracy: 90 },
        { name: '我单方面宣布你就是局长', minAccuracy: 96 },
        { name: '隐藏称号：算你厉害！', minAccuracy: 100 }
    ]
};

// DOM 元素引用
const elements = {
    welcomeSection: document.getElementById('welcomeSection'),
    practiceSection: document.getElementById('practiceSection'),
    resultSection: document.getElementById('resultSection'),
    uploadBtn: document.getElementById('uploadBtn'),
    fileInput: document.getElementById('fileInput'),
    startPracticeBtn: document.getElementById('startPracticeBtn'),
    errorBookBtn: document.getElementById('errorBookBtn'),
    bookList: document.getElementById('bookList'),
    questionNumber: document.getElementById('questionNumber'),
    questionText: document.getElementById('questionText'),
    optionsContainer: document.getElementById('optionsContainer'),
    prevQuestionBtn: document.getElementById('prevQuestionBtn'),
    checkAnswerBtn: document.getElementById('checkAnswerBtn'),
    nextQuestionBtn: document.getElementById('nextQuestionBtn'),
    showAnswerBtn: document.getElementById('showAnswerBtn'),
    backToHomeBtn: document.getElementById('backToHomeBtn'),
    reviewErrorsBtn: document.getElementById('reviewErrorsBtn'),
    restartPracticeBtn: document.getElementById('restartPracticeBtn'),
    backToHomeFromResultBtn: document.getElementById('backToHomeFromResultBtn'),
    totalScore: document.getElementById('totalScore'),
    totalQuestions: document.getElementById('totalQuestions'),
    accuracy: document.getElementById('accuracy'),
    correctCount: document.getElementById('correctCount'),
    incorrectCount: document.getElementById('incorrectCount'),
    currentTitle: document.getElementById('currentTitle'),
    nextTitle: document.getElementById('nextTitle')
};

// 创建消息容器
function createMessageContainer() {
    const container = document.createElement('div');
    container.id = 'messageContainer';
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.zIndex = '1000';
    container.style.maxWidth = '300px';
    document.body.appendChild(container);
    return container;
}

const messageContainer = createMessageContainer();

// 显示消息函数
function showMessage(text, type = 'info') {
    const message = document.createElement('div');
    message.className = 'message';
    
    if (type === 'success') {
        message.className += ' success';
    } else if (type === 'error') {
        message.className += ' error';
    }
    
    message.textContent = text;
    messageContainer.appendChild(message);
    
    // 自动移除消息
    setTimeout(() => {
        message.style.opacity = '0';
        message.style.transition = 'opacity 0.5s ease';
        setTimeout(() => {
            if (messageContainer.contains(message)) {
                messageContainer.removeChild(message);
            }
        }, 500);
    }, 3000);
}

// 初始化应用
function initApp() {
    // 从本地存储加载数据
    loadDataFromLocalStorage();
    updateUserTitleDisplay();
    renderBookList();
    setupEventListeners();
}

// 设置事件监听器
function setupEventListeners() {
    elements.uploadBtn.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', handleFileUpload);
    elements.startPracticeBtn.addEventListener('click', startPractice);
    elements.errorBookBtn.addEventListener('click', startErrorReview);
    elements.prevQuestionBtn.addEventListener('click', goToPrevQuestion);
    elements.nextQuestionBtn.addEventListener('click', goToNextQuestion);
    elements.checkAnswerBtn.addEventListener('click', checkAnswer);
    elements.showAnswerBtn.addEventListener('click', showAnswer);
    elements.backToHomeBtn.addEventListener('click', goToHome);
    elements.reviewErrorsBtn.addEventListener('click', reviewErrors);
    elements.restartPracticeBtn.addEventListener('click', restartPractice);
    elements.backToHomeFromResultBtn.addEventListener('click', goToHome);
}

// 处理文件上传
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file || file.type !== 'text/plain') {
        alert('请上传TXT格式的文件');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const content = e.target.result;
            const questions = parseQuestionBank(content, file.name);
            if (questions.length > 0) {
                const questionBank = {
                    id: Date.now(),
                    name: file.name,
                    questions: questions,
                    lastUsed: new Date().toISOString()
                };
                
                appState.questionBanks.push(questionBank);
                appState.currentQuestionBank = questionBank;
                
                saveDataToLocalStorage();
                renderBookList();
                showMessage(`成功上传题库：${file.name}，共${questions.length}道题目`, 'success');
            } else {
                showMessage('无法解析题库，请检查格式是否正确', 'error');
            }
        } catch (error) {
            console.error('解析题库出错:', error);
            showMessage('解析题库时出错，请检查文件格式', 'error');
        }
    };
    reader.readAsText(file, 'utf-8');
    elements.fileInput.value = '';
}

// 解析题库文件
function parseQuestionBank(content, fileName) {
    const questions = [];
    const lines = content.split('\n');
    let currentQuestion = null;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // 检查是否是新问题的开始（数字. 开头）
        if (/^\d+\./.test(line)) {
            // 保存上一个问题（如果有）
            if (currentQuestion) {
                questions.push(currentQuestion);
            }
            
            // 创建新问题
            currentQuestion = {
                id: questions.length + 1,
                text: line.replace(/^\d+\./, '').trim(),
                options: [],
                answer: ''
            };
        } 
        // 检查是否是选项行（A. B. C. D. 开头）
        else if (/^[A-D]\./.test(line) && currentQuestion) {
            const optionMatch = line.match(/^([A-D])\.(.*)/);
            if (optionMatch) {
                currentQuestion.options.push({
                    id: optionMatch[1],
                    text: optionMatch[2].trim()
                });
            }
        }
        // 检查是否是答案行
        else if (line.startsWith('答案：') && currentQuestion) {
            const answerMatch = line.match(/答案：([A-D,]+)/);
            if (answerMatch) {
                currentQuestion.answer = answerMatch[1].replace(/,/g, '').trim();
            }
        }
    }
    
    // 保存最后一个问题
    if (currentQuestion && currentQuestion.answer) {
        questions.push(currentQuestion);
    }
    
    return questions;
}

// 渲染题库列表
function renderBookList() {
    if (appState.questionBanks.length === 0) {
        elements.bookList.innerHTML = '<p class="no-books">暂无上传的题库</p>';
        elements.startPracticeBtn.disabled = true;
        return;
    }
    
    elements.startPracticeBtn.disabled = false;
    elements.bookList.innerHTML = '';
    
    appState.questionBanks.forEach(bank => {
        const bookItem = document.createElement('div');
        bookItem.className = 'book-item';
        bookItem.innerHTML = `
            <span class="book-name">${bank.name}</span>
            <div class="book-actions">
                <span class="question-count">${bank.questions.length}题</span>
                <button class="btn-secondary select-book" data-id="${bank.id}">选择</button>
                <button class="btn-secondary delete-book" data-id="${bank.id}">删除</button>
            </div>
        `;
        elements.bookList.appendChild(bookItem);
    });
    
    // 添加选择和删除事件监听
    document.querySelectorAll('.select-book').forEach(btn => {
        btn.addEventListener('click', () => {
            const bookId = parseInt(btn.dataset.id);
            const selectedBank = appState.questionBanks.find(bank => bank.id === bookId);
            if (selectedBank) {
                appState.currentQuestionBank = selectedBank;
                showMessage(`已选择题库：${selectedBank.name}`, 'success');
            }
        });
    });
    
    document.querySelectorAll('.delete-book').forEach(btn => {
        btn.addEventListener('click', () => {
            if (confirm('确定要删除这个题库吗？')) {
                const bookId = parseInt(btn.dataset.id);
                const bankName = appState.questionBanks.find(b => b.id === bookId)?.name || '';
                appState.questionBanks = appState.questionBanks.filter(bank => bank.id !== bookId);
                if (appState.currentQuestionBank && appState.currentQuestionBank.id === bookId) {
                    appState.currentQuestionBank = appState.questionBanks[0] || null;
                }
                saveDataToLocalStorage();
                renderBookList();
                showMessage(`已删除题库：${bankName}`, 'success');
            }
        });
    });
}

// 开始练习
function startPractice() {
    if (!appState.currentQuestionBank) {
        showMessage('请先上传并选择一个题库', 'error');
        return;
    }
    
    appState.isReviewMode = false;
    appState.currentQuestionIndex = 0;
    appState.userAnswers = [];
    
    switchToSection('practice');
    renderCurrentQuestion();
}

// 开始错题复习
function startErrorReview() {
    if (appState.incorrectQuestions.length === 0) {
        showMessage('暂无错题记录', 'error');
        return;
    }
    
    appState.isReviewMode = true;
    appState.currentQuestionIndex = 0;
    appState.userAnswers = [];
    
    switchToSection('practice');
    renderCurrentQuestion();
}

// 切换到指定区域
function switchToSection(section) {
    appState.currentSection = section;
    
    // 隐藏所有区域
    elements.welcomeSection.classList.remove('active');
    elements.practiceSection.classList.remove('active');
    elements.resultSection.classList.remove('active');
    
    // 显示目标区域
    if (section === 'welcome') {
        elements.welcomeSection.classList.add('active');
    } else if (section === 'practice') {
        elements.practiceSection.classList.add('active');
    } else if (section === 'result') {
        elements.resultSection.classList.add('active');
        renderResult();
    }
}

// 获取当前问题列表
function getCurrentQuestionList() {
    return appState.isReviewMode ? appState.incorrectQuestions : appState.currentQuestionBank.questions;
}

// 渲染当前问题
function renderCurrentQuestion() {
    const questions = getCurrentQuestionList();
    if (!questions || questions.length === 0 || appState.currentQuestionIndex >= questions.length) {
        switchToSection('result');
        return;
    }
    
    const question = questions[appState.currentQuestionIndex];
    const userAnswer = appState.userAnswers[appState.currentQuestionIndex];
    const isMultipleChoice = question.answer.length > 1;
    
    elements.questionNumber.textContent = `问题 ${appState.currentQuestionIndex + 1}/${questions.length}${isMultipleChoice ? ' (多选题)' : ' (单选题)'}`;
    elements.questionText.textContent = question.text;
    elements.optionsContainer.innerHTML = '';
    
    // 渲染选项
    question.options.forEach(option => {
        const optionElement = document.createElement('div');
        optionElement.className = 'option-item';
        optionElement.dataset.id = option.id;
        
        // 根据题型创建不同的选项结构
        if (isMultipleChoice) {
            // 多选题使用复选框
            optionElement.innerHTML = `
                <label class="checkbox-option">
                    <input type="checkbox" class="option-checkbox" value="${option.id}">
                    <span class="option-content">${option.id}. ${option.text}</span>
                </label>
            `;
        } else {
            // 单选题使用单选按钮
            optionElement.innerHTML = `
                <label class="radio-option">
                    <input type="radio" name="question_${appState.currentQuestionIndex}" class="option-radio" value="${option.id}">
                    <span class="option-content">${option.id}. ${option.text}</span>
                </label>
            `;
        }
        
        // 检查是否有用户答案
        if (userAnswer) {
            const inputElement = optionElement.querySelector('input');
            const contentElement = optionElement.querySelector('.option-content');
            
            if (userAnswer.includes(option.id)) {
                inputElement.checked = true;
                contentElement.classList.add('selected');
            }
            
            // 如果已经检查过答案，显示正确/错误
            if (userAnswer.checked) {
                if (question.answer.includes(option.id)) {
                    contentElement.classList.add('correct');
                } else if (userAnswer.includes(option.id)) {
                    contentElement.classList.add('incorrect');
                }
            }
        }
        
        elements.optionsContainer.appendChild(optionElement);
    });
    
    // 添加事件监听器（如果还没有检查答案）
    if (!userAnswer || !userAnswer.checked) {
        // 单选题自动验证
        if (!isMultipleChoice) {
            const radioButtons = document.querySelectorAll('.option-radio');
            radioButtons.forEach(radio => {
                radio.addEventListener('change', () => {
                    // 延迟一点执行，确保DOM更新完成
                    setTimeout(() => {
                        checkAnswer();
                    }, 100);
                });
            });
        }
        
        // 多选题手动选择
        const checkboxes = document.querySelectorAll('.option-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const contentElement = this.closest('.option-item').querySelector('.option-content');
                if (this.checked) {
                    contentElement.classList.add('selected');
                } else {
                    contentElement.classList.remove('selected');
                }
            });
        });
    } else {
        // 如果已经检查过答案，禁用所有输入
        const inputs = document.querySelectorAll('input.option-radio, input.option-checkbox');
        inputs.forEach(input => {
            input.disabled = true;
        });
    }
    
    // 更新按钮状态
    elements.prevQuestionBtn.disabled = appState.currentQuestionIndex === 0;
    elements.nextQuestionBtn.disabled = appState.currentQuestionIndex === questions.length - 1;
    
    // 如果已经有答案且已检查，禁用检查和显示答案按钮
    const hasCheckedAnswer = userAnswer && userAnswer.checked;
    elements.checkAnswerBtn.disabled = hasCheckedAnswer || !isMultipleChoice; // 单选题禁用检查按钮，多选题保留
    elements.showAnswerBtn.disabled = hasCheckedAnswer;
}

// 检查答案
function checkAnswer() {
    const questions = getCurrentQuestionList();
    const question = questions[appState.currentQuestionIndex];
    const isMultipleChoice = question.answer.length > 1;
    
    // 获取用户选择的选项
    let selectedOptions = [];
    
    if (isMultipleChoice) {
        // 多选题获取选中的复选框
        selectedOptions = Array.from(document.querySelectorAll('.option-checkbox:checked'))
            .map(checkbox => checkbox.value);
    } else {
        // 单选题获取选中的单选按钮
        const selectedRadio = document.querySelector('.option-radio:checked');
        if (selectedRadio) {
            selectedOptions = [selectedRadio.value];
        }
    }
    
    // 检查是否有用户答案
    if (selectedOptions.length === 0) {
        if (isMultipleChoice) { // 只在多选题时提示，因为单选题自动验证时必定有选择
            showMessage('请至少选择一个选项', 'error');
        }
        return;
    }
    
    // 排序用户答案和正确答案以便比较
    const userAnswerStr = selectedOptions.sort().join('');
    const correctAnswerStr = question.answer.split('').sort().join('');
    const isCorrect = userAnswerStr === correctAnswerStr;
    
    // 保存用户答案
    appState.userAnswers[appState.currentQuestionIndex] = {
        ...selectedOptions,
        checked: true,
        isCorrect: isCorrect
    };
    
    // 更新用户进度
    appState.userProgress.totalAnswered++;
    if (isCorrect) {
        appState.userProgress.correctCount++;
        if (!isMultipleChoice) {
            showMessage('回答正确！', 'success');
        }
    } else {
        if (!appState.isReviewMode) {
            // 如果是错误答案且不是复习模式，添加到错题集
            if (!appState.incorrectQuestions.find(q => q.id === question.id && q.text === question.text)) {
                appState.incorrectQuestions.push(question);
            }
        }
        if (!isMultipleChoice) {
            showMessage(`回答错误！正确答案是：${question.answer}`, 'error');
        }
    }
    
    // 更新UI显示正确/错误选项
    document.querySelectorAll('.option-item').forEach(item => {
        const contentElement = item.querySelector('.option-content');
        const optionId = item.dataset.id;
        
        if (question.answer.includes(optionId)) {
            contentElement.classList.add('correct');
        } else if (selectedOptions.includes(optionId)) {
            contentElement.classList.add('incorrect');
        }
        
        // 禁用输入
        const inputElement = item.querySelector('input');
        if (inputElement) {
            inputElement.disabled = true;
        }
    });
    
    // 禁用按钮
    elements.checkAnswerBtn.disabled = true;
    elements.showAnswerBtn.disabled = true;
    
    // 保存数据
    saveDataToLocalStorage();
    updateUserTitleDisplay();
    
    // 如果是最后一题，显示结果
    if (appState.currentQuestionIndex === questions.length - 1) {
        setTimeout(() => {
            switchToSection('result');
        }, 1000);
    }
}

// 显示答案
function showAnswer() {
    const questions = getCurrentQuestionList();
    const question = questions[appState.currentQuestionIndex];
    
    // 显示正确答案
    document.querySelectorAll('.option-item').forEach(item => {
        const contentElement = item.querySelector('.option-content');
        const optionId = item.dataset.id;
        
        if (question.answer.includes(optionId)) {
            contentElement.classList.add('correct');
        }
        
        // 禁用输入
        const inputElement = item.querySelector('input');
        if (inputElement) {
            inputElement.disabled = true;
        }
    });
    
    // 禁用按钮
    elements.checkAnswerBtn.disabled = true;
    elements.showAnswerBtn.disabled = true;
}

// 前往上一题
function goToPrevQuestion() {
    if (appState.currentQuestionIndex > 0) {
        appState.currentQuestionIndex--;
        renderCurrentQuestion();
    }
}

// 前往下一题
function goToNextQuestion() {
    const questions = getCurrentQuestionList();
    if (appState.currentQuestionIndex < questions.length - 1) {
        appState.currentQuestionIndex++;
        renderCurrentQuestion();
    }
}

// 返回首页
function goToHome() {
    switchToSection('welcome');
}

// 渲染结果页面
function renderResult() {
    const questions = getCurrentQuestionList();
    const correctCount = appState.userAnswers.filter(a => a && a.isCorrect).length;
    const totalQuestions = questions.length;
    const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    
    elements.totalScore.textContent = correctCount;
    elements.totalQuestions.textContent = totalQuestions;
    elements.accuracy.textContent = `${accuracy}%`;
    elements.correctCount.textContent = correctCount;
    elements.incorrectCount.textContent = totalQuestions - correctCount;
    
    // 更新全局用户进度
    if (!appState.isReviewMode) {
        appState.userProgress.totalAnswered += totalQuestions;
        appState.userProgress.correctCount += correctCount;
        saveDataToLocalStorage();
        updateUserTitleDisplay();
    }
}

// 复习错题
function reviewErrors() {
    const incorrectAnswers = appState.userAnswers
        .map((answer, index) => ({ answer, index }))
        .filter(item => item.answer && !item.answer.isCorrect);
    
    if (incorrectAnswers.length === 0) {
        showMessage('恭喜！这次没有错题', 'success');
        return;
    }
    
    // 提取错题
    const questions = getCurrentQuestionList();
    const errorQuestions = incorrectAnswers.map(item => questions[item.index]);
    
    // 保存到错题集（去重）
    errorQuestions.forEach(question => {
        if (!appState.incorrectQuestions.find(q => q.id === question.id && q.text === question.text)) {
            appState.incorrectQuestions.push(question);
        }
    });
    
    saveDataToLocalStorage();
    startErrorReview();
}

// 重新练习
function restartPractice() {
    startPractice();
}

// 更新用户称号显示
function updateUserTitleDisplay() {
    // 确保元素和状态都已初始化
    if (!appState || !elements.currentTitle || !elements.nextTitle || !appState.titles || !Array.isArray(appState.titles) || appState.titles.length === 0) {
        return;
    }
    
    const accuracy = appState.userProgress.accuracy;
    
    // 找到当前称号和下一称号
    let currentTitle = '继续努力！'; // 默认称号
    let nextTitle = `${appState.titles[0].name} (${appState.titles[0].minAccuracy}%)`;
    
    // 检查是否达到最低称号要求（60%）
    if (accuracy >= 60) {
        // 找到当前称号和下一级称号
        let currentTitleIndex = -1;
        for (let i = appState.titles.length - 1; i >= 0; i--) {
            if (accuracy >= appState.titles[i].minAccuracy) {
                currentTitleIndex = i;
                break;
            }
        }
        
        // 设置当前称号和下一称号
        if (currentTitleIndex >= 0) {
            currentTitle = `${appState.titles[currentTitleIndex].name} (${appState.titles[currentTitleIndex].minAccuracy}%)`;
            
            if (currentTitleIndex < appState.titles.length - 1) {
                nextTitle = `${appState.titles[currentTitleIndex + 1].name} (${appState.titles[currentTitleIndex + 1].minAccuracy}%)`;
            } else {
                nextTitle = '已是最高称号！';
            }
        }
    }
    
    // 更新UI显示
    elements.currentTitle.textContent = currentTitle;
    elements.nextTitle.textContent = nextTitle;
    
    // 更新进度指示器
    const progressIndicator = document.querySelector('.progress-indicator');
    if (progressIndicator) {
        if (nextTitle === '已是最高称号！') {
            progressIndicator.textContent = '✓';
        } else {
            progressIndicator.textContent = '→';
        }
    }
}

// 保存数据到本地存储
function saveDataToLocalStorage() {
    try {
        localStorage.setItem('quiz_app_questionBanks', JSON.stringify(appState.questionBanks));
        localStorage.setItem('quiz_app_incorrectQuestions', JSON.stringify(appState.incorrectQuestions));
        localStorage.setItem('quiz_app_userProgress', JSON.stringify(appState.userProgress));
        localStorage.setItem('quiz_app_currentQuestionBankId', appState.currentQuestionBank?.id.toString() || '');
    } catch (error) {
        console.error('保存数据到本地存储失败:', error);
    }
}

// 从本地存储加载数据
function loadDataFromLocalStorage() {
    try {
        const questionBanks = localStorage.getItem('quiz_app_questionBanks');
        const incorrectQuestions = localStorage.getItem('quiz_app_incorrectQuestions');
        const userProgress = localStorage.getItem('quiz_app_userProgress');
        const currentQuestionBankId = localStorage.getItem('quiz_app_currentQuestionBankId');
        
        if (questionBanks) appState.questionBanks = JSON.parse(questionBanks);
        if (incorrectQuestions) appState.incorrectQuestions = JSON.parse(incorrectQuestions);
        if (userProgress) appState.userProgress = JSON.parse(userProgress);
        
        // 恢复当前选中的题库
        if (currentQuestionBankId) {
            const bankId = parseInt(currentQuestionBankId);
            appState.currentQuestionBank = appState.questionBanks.find(bank => bank.id === bankId) || null;
        }
    } catch (error) {
        console.error('从本地存储加载数据失败:', error);
    }
}

// 添加简单的示例题库（方便演示）
function addSampleQuestionBank() {
    if (appState.questionBanks.length === 0) {
        const sampleQuestions = [
            {
                id: 1,
                text: '涉密办公自动化设备可以接入（ ）。',
                options: [
                    { id: 'A', text: '涉密计算机及其信息系统' },
                    { id: 'B', text: '单位内部非涉密计算机及其信息系统' },
                    { id: 'C', text: '国际互联网' },
                    { id: 'D', text: '公共信息网络' }
                ],
                answer: 'A'
            },
            {
                id: 2,
                text: '下面符合保密工作规定的是（ ）。',
                options: [
                    { id: 'A', text: '将涉密文件扫描后做文件压缩处理发电子邮件，待对方接收之后立即删除。' },
                    { id: 'B', text: '通过微信传输带有领导批示的非涉密工作文件。' },
                    { id: 'C', text: '将工作文件草稿（密级待定）发微信群征求意见。' },
                    { id: 'D', text: '在公开讲话材料中避免引用涉密文件中的重要数据。' }
                ],
                answer: 'AD'
            }
        ];
        
        const sampleBank = {
            id: Date.now(),
            name: '示例题库.txt',
            questions: sampleQuestions,
            lastUsed: new Date().toISOString()
        };
        
        appState.questionBanks.push(sampleBank);
        appState.currentQuestionBank = sampleBank;
        saveDataToLocalStorage();
    }
}

// 应用初始化
window.addEventListener('DOMContentLoaded', () => {
    initApp();
    addSampleQuestionBank();
    renderBookList();
});