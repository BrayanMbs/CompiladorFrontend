      const endpoint = 'http://localhost:3000/compiler/compile';
      const runEndpoint = 'http://localhost:3000/compiler/run-java';
      const healthEndpoint = 'http://localhost:3000/';
      const historyKey = 'nebula-history-v2';
      const draftKey = 'nebula-draft-v2';

      const examples = [
        {
          name: 'Basico',
          code: `Algoritmo Demo
Definir x Como Entero
x <- 10
Escribir x
FinAlgoritmo`,
        },
        {
          name: 'Si Sino',
          code: `Algoritmo Condicional
Definir edad Como Entero
edad <- 19
Si edad >= 18 Entonces
Escribir "Mayor"
Sino
Escribir "Menor"
FinSi
FinAlgoritmo`,
        },
        {
          name: 'Complejo',
          code: `Algoritmo DemoComplejo
Definir x Como Entero
Definir limite Como Entero
Definir mensaje Como Cadena
x <- 1
limite <- 3
mensaje <- "Inicio"
Mientras x < limite Hacer
Escribir x
x <- x + 1
FinMientras
Escribir mensaje
FinAlgoritmo`,
        },
        {
          name: 'Con Error',
          code: `Algoritmo ErrorDemo
Definir x Como Entero
Definir x Como Entero
FinAlgoritmo`,
        },
      ];

      const codeInput = document.getElementById('code-input');
      const editorPanel = document.querySelector('.editor-panel');
      const codeLines = document.getElementById('code-lines');
      const javaLines = document.getElementById('java-lines');
      const javaOutput = document.getElementById('java-output');
      const terminalPanel = document.getElementById('terminal-panel');
      const terminalOutput = document.getElementById('terminal-output');
      const terminalStatus = document.getElementById('terminal-status');
      const tokensOutput = document.getElementById('tokens-output');
      const astOutput = document.getElementById('ast-output');
      const errorOutput = document.getElementById('error-output');
      const compileButton = document.getElementById('compile-button');
      const healthButton = document.getElementById('health-button');
      const copyJavaButton = document.getElementById('copy-java-button');
      const saveHistoryButton = document.getElementById('save-history-button');
      const clearEditorButton = document.getElementById('clear-editor-button');
      const clearHistoryButton = document.getElementById('clear-history-button');
      const examplesToggle = document.getElementById('examples-toggle');
      const exampleButtons = document.getElementById('example-buttons');
      const rulesButton = document.getElementById('rules-button');
      const rulesModal = document.getElementById('rules-modal');
      const rulesCloseButton = document.getElementById('rules-close-button');
      const rulesTabs = document.querySelectorAll('.rules-tab');
      const suggestionsList = document.getElementById('suggestions-list');
      const historyList = document.getElementById('history-list');
      const backendStatus = document.getElementById('backend-status');
      const draftState = document.getElementById('draft-state');
      let lastResult = null;

      function formatJson(value) {
        return JSON.stringify(value, null, 2);
      }

      function getLineNumbersText(content) {
        const lineCount = Math.max(content.split('\n').length, 1);
        return Array.from({ length: lineCount }, (_, index) => index + 1).join('\n');
      }

      function syncLineNumbers(content, linesElement) {
        if (!linesElement) {
          return;
        }

        linesElement.textContent = getLineNumbersText(content);
      }

      function syncScroll(sourceElement, linesElement) {
        if (!sourceElement || !linesElement) {
          return;
        }

        linesElement.scrollTop = sourceElement.scrollTop;
      }

      function updateEditorActiveLine() {
        if (!codeInput || !editorPanel) {
          return;
        }

        const caretIndex = codeInput.selectionStart || 0;
        const activeLine = codeInput.value.slice(0, caretIndex).split('\n').length;
        const lineHeight = parseFloat(getComputedStyle(codeInput).lineHeight) || 24;
        const paddingTop = parseFloat(getComputedStyle(codeInput).paddingTop) || 18;
        const offset = paddingTop + ((activeLine - 1) * lineHeight) - codeInput.scrollTop;

        editorPanel.style.setProperty('--active-line-offset', `${offset}px`);
        editorPanel.style.setProperty('--active-line-height', `${lineHeight}px`);
      }

      function setExample(code) {
        codeInput.value = code;
        handleEditorChange();
        if (examplesToggle && exampleButtons) {
          examplesToggle.setAttribute('aria-expanded', 'false');
          exampleButtons.classList.add('is-collapsed');
        }
      }

      function loadHistory() {
        try {
          return JSON.parse(localStorage.getItem(historyKey) || '[]');
        } catch {
          return [];
        }
      }

      function saveHistory(items) {
        localStorage.setItem(historyKey, JSON.stringify(items.slice(0, 12)));
        renderHistory();
      }

      function formatTime(date = new Date()) {
        return new Intl.DateTimeFormat('es-GT', {
          dateStyle: 'short',
          timeStyle: 'short',
        }).format(date);
      }

      function renderHistory() {
        const items = loadHistory();

        if (!items.length) {
          historyList.innerHTML = '<li class=\"history-item\"><div class=\"history-preview\">No has guardado pruebas todavia.</div></li>';
          return;
        }

        historyList.innerHTML = '';
        items.forEach((item, index) => {
          const li = document.createElement('li');
          li.className = 'history-item';
          li.innerHTML = `
            <div class=\"history-title\">${item.name}</div>
            <div class=\"history-preview\">${item.preview}</div>
            <div class=\"history-time\">${item.time}</div>
            <div class=\"history-actions\">
              <button class=\"secondary small\" data-action=\"load\" data-index=\"${index}\">Cargar</button>
              <button class=\"secondary small\" data-action=\"delete\" data-index=\"${index}\">Borrar</button>
            </div>
          `;
          historyList.appendChild(li);
        });
      }

      function renderExamples() {
        examples.forEach((example) => {
          const button = document.createElement('button');
          button.className = 'secondary small';
          button.textContent = example.name;
          button.addEventListener('click', () => setExample(example.code));
          exampleButtons.appendChild(button);
        });
      }

      function toggleExamples() {
        if (!examplesToggle || !exampleButtons) {
          return;
        }

        const expanded = examplesToggle.getAttribute('aria-expanded') === 'true';
        examplesToggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        exampleButtons.classList.toggle('is-collapsed', expanded);
      }

      function openRulesModal() {
        if (!rulesModal) {
          return;
        }

        rulesModal.classList.add('visible');
        rulesModal.setAttribute('aria-hidden', 'false');
      }

      function closeRulesModal() {
        if (!rulesModal) {
          return;
        }

        rulesModal.classList.remove('visible');
        rulesModal.setAttribute('aria-hidden', 'true');
      }

      function activateRulesTab(tabName) {
        rulesTabs.forEach((tab) => {
          tab.classList.toggle('active', tab.dataset.rulesTab === tabName);
        });

        document.querySelectorAll('.rules-panel').forEach((panel) => {
          panel.classList.toggle('active', panel.dataset.rulesPanel === tabName);
        });
      }

      function updateSuggestions() {
        const code = codeInput.value;
        const lines = code.split('\\n').map((line) => line.trim()).filter(Boolean);
        const suggestions = [];

        if (!lines.length) {
          suggestions.push({
            type: 'warn',
            title: 'Empieza el programa',
            text: 'Puedes iniciar con: Algoritmo MiPrograma',
          });
        }

        if (code && !/^Algoritmo\s+[A-Za-z][A-Za-z0-9]*/m.test(code)) {
          suggestions.push({
            type: 'error',
            title: 'Falta el encabezado',
            text: 'La primera estructura debe verse como: Algoritmo NombreDelPrograma',
          });
        } else if (/^Algoritmo\s+[A-Za-z][A-Za-z0-9]*/m.test(code)) {
          suggestions.push({
            type: 'ok',
            title: 'Encabezado detectado',
            text: 'Tu programa ya tiene inicio valido.',
          });
        }

        if (code.includes('Definir') &&
          !/Definir\s+[A-Za-z][A-Za-z0-9]*\s+Como\s+(Entero|Real|Cadena|Logico)/.test(code)) {
          suggestions.push({
            type: 'warn',
            title: 'Revisa una declaracion',
            text: 'Usa este formato: Definir variable Como Entero',
          });
        }

        if (code.includes('Si ') && !code.includes('FinSi')) {
          suggestions.push({
            type: 'warn',
            title: 'Te falta cerrar un Si',
            text: 'Si abres un bloque Si ... Entonces, debes cerrarlo con FinSi.',
          });
        }

        if (code.includes('Mientras ') && code.includes('Hacer') && !code.includes('FinMientras')) {
          suggestions.push({
            type: 'warn',
            title: 'Te falta FinMientras',
            text: 'Los ciclos Mientras ... Hacer deben terminar con FinMientras.',
          });
        }

        if (code.includes('Para ') && !code.includes('FinPara')) {
          suggestions.push({
            type: 'warn',
            title: 'Te falta FinPara',
            text: 'Cada bloque Para debe cerrarse con FinPara.',
          });
        }

        if (code && !/FinAlgoritmo\s*$/.test(code.trim())) {
          suggestions.push({
            type: 'warn',
            title: 'Falta FinAlgoritmo',
            text: 'Todo programa debe terminar con FinAlgoritmo.',
          });
        } else if (/FinAlgoritmo\s*$/.test(code.trim())) {
          suggestions.push({
            type: 'ok',
            title: 'Cierre principal detectado',
            text: 'El programa parece cerrar correctamente el bloque principal.',
          });
        }

        const topSuggestion = suggestions.find((item) => item.type !== 'ok');

        if (!topSuggestion) {
          suggestionsList.className = 'inline-suggestion';
          suggestionsList.innerHTML = '';
          return;
        }

        suggestionsList.className = `inline-suggestion visible ${topSuggestion.type}`;
        suggestionsList.innerHTML = `
          <div class="suggestion-badge">${topSuggestion.type === 'error' ? 'Atencion' : 'Consejo'}</div>
          <div class="suggestion-copy">
            <strong>${topSuggestion.title}</strong>
            <span>${topSuggestion.text}</span>
          </div>
        `;
      }

      function handleEditorChange() {
        const value = codeInput.value;
        localStorage.setItem(draftKey, value);
        draftState.textContent = 'guardado automatico';
        syncLineNumbers(value, codeLines);
        updateEditorActiveLine();
        updateSuggestions();
      }

      function setIdleOutputs() {
        tokensOutput.textContent = 'Compila para ver los tokens.';
        tokensOutput.className = 'codebox mini-box empty';
        astOutput.textContent = 'Compila para ver el AST.';
        astOutput.className = 'codebox mini-box empty';
        errorOutput.textContent = 'Todavia no hay errores ni resultados.';
        errorOutput.className = 'codebox mini-box empty';
        javaOutput.textContent = 'Compila para ver el Java generado.';
        javaOutput.className = 'codebox output-codebox empty';
        syncLineNumbers(javaOutput.textContent, javaLines);
        syncScroll(javaOutput, javaLines);
        resetTerminal();
      }

      function resetTerminal() {
        if (!terminalPanel || !terminalOutput || !terminalStatus) {
          return;
        }

        terminalPanel.hidden = true;
        terminalStatus.textContent = 'Lista para ejecutar el Java generado.';
        terminalOutput.textContent = 'Pulsa "Probar backend" para compilar y ejecutar el Java aqui.';
        terminalOutput.className = 'terminal-box empty';
      }

      function showResult(result) {
        lastResult = result;

        if (result.ok) {
          tokensOutput.textContent = formatJson(result.tokens || []);
          tokensOutput.className = 'codebox mini-box';
          astOutput.textContent = formatJson(result.ast || {});
          astOutput.className = 'codebox mini-box';
          javaOutput.textContent = result.java || '';
          javaOutput.className = 'codebox output-codebox';
          errorOutput.textContent = 'Sin errores. El backend acepto el programa.';
          errorOutput.className = 'codebox mini-box';
          syncLineNumbers(javaOutput.textContent, javaLines);
          syncScroll(javaOutput, javaLines);
          resetTerminal();
          autoSaveHistory();
        } else {
          tokensOutput.textContent = 'No disponible por error.';
          tokensOutput.className = 'codebox mini-box empty';
          astOutput.textContent = 'No disponible por error.';
          astOutput.className = 'codebox mini-box empty';
          javaOutput.textContent = 'No se genero Java.';
          javaOutput.className = 'codebox output-codebox empty';
          errorOutput.textContent = result.error || 'Error desconocido.';
          errorOutput.className = 'codebox mini-box';
          syncLineNumbers(javaOutput.textContent, javaLines);
          syncScroll(javaOutput, javaLines);
          resetTerminal();
        }
      }

      async function checkBackend() {
        backendStatus.textContent = 'comprobando...';
        try {
          const response = await fetch(healthEndpoint);
          const text = await response.text();
          backendStatus.textContent = response.ok ? `activo: ${text}` : 'respondio con error';
        } catch {
          backendStatus.textContent = 'sin conexion';
        }
      }

      async function compileCode() {
        const code = codeInput.value.trim();
        if (!code) {
          showResult({
            ok: false,
            error: 'Debes escribir pseudocodigo antes de compilar.',
          });
          return;
        }

        compileButton.disabled = true;
        compileButton.textContent = 'Compilando...';

        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code }),
          });

          const result = await response.json();
          showResult(result);
        } catch {
          showResult({
            ok: false,
            error: 'No se pudo conectar con el backend. Asegurate de tener NestJS corriendo en localhost:3000.',
          });
        } finally {
          compileButton.disabled = false;
          compileButton.textContent = 'Compilar';
        }
      }

      async function runGeneratedJava() {
        if (terminalPanel) {
          terminalPanel.hidden = false;
        }

        const java = (lastResult?.java || javaOutput.textContent || '').trim();

        if (!java || java === 'Compila para ver el Java generado.' || java === 'No se genero Java.') {
          if (terminalStatus && terminalOutput) {
            terminalStatus.textContent = 'Sin codigo Java listo para ejecutar.';
            terminalOutput.textContent = 'Primero pulsa "Compilar" para generar el archivo Java.';
            terminalOutput.className = 'terminal-box empty';
          }
          return;
        }

        healthButton.disabled = true;
        healthButton.textContent = 'Ejecutando...';

        if (terminalStatus && terminalOutput) {
          terminalStatus.textContent = 'Compilando y ejecutando en el backend...';
          terminalOutput.textContent = 'Preparando archivo Java temporal...\nInvocando javac...\n';
          terminalOutput.className = 'terminal-box';
        }

        try {
          const response = await fetch(runEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ java }),
          });

          const result = await response.json();

          if (result.ok) {
            terminalStatus.textContent = result.status || 'Ejecucion completada.';
            terminalOutput.textContent = result.output?.trim()
              ? result.output
              : 'El programa se ejecuto sin imprimir salida.';
            terminalOutput.className = 'terminal-box success';
          } else {
            terminalStatus.textContent = result.status || 'No se pudo ejecutar el programa.';
            terminalOutput.textContent = result.error || 'El backend no pudo compilar o ejecutar el Java.';
            terminalOutput.className = 'terminal-box error';
          }
        } catch {
          terminalStatus.textContent = 'No se pudo contactar el backend.';
          terminalOutput.textContent = 'Asegurate de tener el backend corriendo en localhost:3000 y de haber agregado el endpoint de ejecucion.';
          terminalOutput.className = 'terminal-box error';
        } finally {
          healthButton.disabled = false;
          healthButton.textContent = 'Probar backend';
        }
      }

      function autoSaveHistory() {
        if (!lastResult?.ok) {
          return;
        }

        const code = codeInput.value.trim();
        if (!code) {
          return;
        }

        const items = loadHistory();
        const match = code.match(/^Algoritmo\s+([A-Za-z][A-Za-z0-9]*)/m);
        const name = match?.[1] || `Prueba ${items.length + 1}`;
        const preview = code.split('\\n').slice(0, 3).join(' | ').slice(0, 120);

        if (items[0]?.code === code) {
          return;
        }

        items.unshift({
          name,
          preview,
          code,
          time: formatTime(),
        });

        saveHistory(items);
      }

      function storeCurrentRun() {
        const code = codeInput.value.trim();
        if (!code) {
          return;
        }

        const items = loadHistory();
        const match = code.match(/^Algoritmo\s+([A-Za-z][A-Za-z0-9]*)/m);
        items.unshift({
          name: match?.[1] || `Prueba ${items.length + 1}`,
          preview: code.split('\\n').slice(0, 3).join(' | ').slice(0, 120),
          code,
          time: formatTime(),
        });
        saveHistory(items);
      }

      document.querySelectorAll('.tab').forEach((tab) => {
        tab.addEventListener('click', () => {
          document.querySelectorAll('.tab').forEach((item) => item.classList.remove('active'));
          document.querySelectorAll('.tab-panel').forEach((panel) => panel.classList.remove('active'));
          tab.classList.add('active');
          document.querySelector(`[data-panel=\"${tab.dataset.tab}\"]`).classList.add('active');
        });
      });

      historyList.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLButtonElement)) {
          return;
        }

        const index = Number(target.dataset.index);
        const items = loadHistory();

        if (target.dataset.action === 'load') {
          codeInput.value = items[index]?.code || '';
          handleEditorChange();
        }

        if (target.dataset.action === 'delete') {
          items.splice(index, 1);
          saveHistory(items);
        }
      });

      compileButton.addEventListener('click', compileCode);
      healthButton.addEventListener('click', runGeneratedJava);
      if (saveHistoryButton) {
        saveHistoryButton.addEventListener('click', storeCurrentRun);
      }
      clearEditorButton.addEventListener('click', () => {
        codeInput.value = '';
        handleEditorChange();
        setIdleOutputs();
      });
      if (examplesToggle) {
        examplesToggle.addEventListener('click', toggleExamples);
      }
      if (rulesButton) {
        rulesButton.addEventListener('click', openRulesModal);
      }
      if (rulesCloseButton) {
        rulesCloseButton.addEventListener('click', closeRulesModal);
      }
      rulesTabs.forEach((tab) => {
        tab.addEventListener('click', () => activateRulesTab(tab.dataset.rulesTab));
      });
      document.addEventListener('click', (event) => {
        if (!examplesToggle || !exampleButtons) {
          return;
        }

        const target = event.target;
        if (!(target instanceof Node)) {
          return;
        }

        if (examplesToggle.contains(target) || exampleButtons.contains(target)) {
          return;
        }

        examplesToggle.setAttribute('aria-expanded', 'false');
        exampleButtons.classList.add('is-collapsed');
      });
      if (rulesModal) {
        rulesModal.addEventListener('click', (event) => {
          if (event.target === rulesModal) {
            closeRulesModal();
          }
        });
      }
      clearHistoryButton.addEventListener('click', () => saveHistory([]));
      copyJavaButton.addEventListener('click', async () => {
        const java = javaOutput.textContent || '';
        if (!java || java === 'Compila para ver el Java generado.' || java === 'No se genero Java.') {
          return;
        }
        await navigator.clipboard.writeText(java);
        copyJavaButton.textContent = 'Java copiado';
        setTimeout(() => {
          copyJavaButton.textContent = 'Copiar Java';
        }, 1100);
      });
      codeInput.addEventListener('input', handleEditorChange);
      codeInput.addEventListener('scroll', () => {
        syncScroll(codeInput, codeLines);
        updateEditorActiveLine();
      });
      codeInput.addEventListener('click', updateEditorActiveLine);
      codeInput.addEventListener('keyup', updateEditorActiveLine);
      codeInput.addEventListener('focus', updateEditorActiveLine);
      javaOutput.addEventListener('scroll', () => syncScroll(javaOutput, javaLines));
      codeInput.addEventListener('keydown', (event) => {
        if (event.ctrlKey && event.key === 'Enter') {
          event.preventDefault();
          compileCode();
        }
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          closeRulesModal();
        }
      });

      codeInput.value = localStorage.getItem(draftKey) || examples[0].code;
      renderExamples();
      renderHistory();
      setIdleOutputs();
      handleEditorChange();
      syncScroll(codeInput, codeLines);
      updateEditorActiveLine();
      checkBackend();

