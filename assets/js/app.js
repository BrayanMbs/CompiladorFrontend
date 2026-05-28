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
      const symbolsOutput = document.getElementById('symbols-output');
      const treeOutput = document.getElementById('tree-output');
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
      const downloadTreeButton = document.getElementById('download-tree-button');
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
        const errorLine = Number(editorPanel.dataset.errorLine || 0);

        editorPanel.style.setProperty('--active-line-offset', `${offset}px`);
        editorPanel.style.setProperty('--active-line-height', `${lineHeight}px`);

        if (errorLine > 0) {
          const errorOffset = paddingTop + ((errorLine - 1) * lineHeight) - codeInput.scrollTop;
          editorPanel.style.setProperty('--error-line-offset', `${errorOffset}px`);
          editorPanel.style.setProperty('--error-line-height', `${lineHeight}px`);
        }
      }

      function setEditorErrorLine(line) {
        if (!editorPanel || !line) {
          clearEditorErrorLine();
          return;
        }

        editorPanel.dataset.errorLine = String(line);
        editorPanel.classList.add('has-error-line');
        updateEditorActiveLine();
      }

      function clearEditorErrorLine() {
        if (!editorPanel) {
          return;
        }

        delete editorPanel.dataset.errorLine;
        editorPanel.classList.remove('has-error-line');
        editorPanel.style.removeProperty('--error-line-offset');
        editorPanel.style.removeProperty('--error-line-height');
      }

      function escapeHtml(value) {
        return String(value ?? '')
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')
          .replaceAll('"', '&quot;')
          .replaceAll("'", '&#39;');
      }

      function getSourceLine(lineNumber) {
        if (!codeInput || !lineNumber) {
          return '';
        }

        return codeInput.value.split('\n')[lineNumber - 1]?.trim() || '';
      }

      function findLineNumber(predicate) {
        if (!codeInput) {
          return undefined;
        }

        const sourceLines = codeInput.value.split('\n');
        const index = sourceLines.findIndex((line) => predicate(line.trim()));
        return index >= 0 ? index + 1 : undefined;
      }

      function findLastCodeLineNumber() {
        if (!codeInput) {
          return undefined;
        }

        const sourceLines = codeInput.value.split('\n');
        for (let index = sourceLines.length - 1; index >= 0; index--) {
          if (sourceLines[index].trim()) {
            return index + 1;
          }
        }

        return undefined;
      }

      function getSyntaxSuggestion(line) {
        const trimmed = line.trim();

        if (!trimmed) {
          return null;
        }

        const validPatterns = [
          /^Algoritmo\s+[A-Za-z][A-Za-z0-9]*$/,
          /^FinAlgoritmo$/,
          /^Definir\s+[A-Za-z][A-Za-z0-9]*\s+Como\s+(Entero|Real|Cadena|Logico)$/,
          /^[A-Za-z][A-Za-z0-9]*\s*<-\s+.+$/,
          /^Escribir\s+.+$/,
          /^Si\s+.+\s+(==|!=|<=|>=|<|>)\s+.+\s+Entonces$/,
          /^Sino$/,
          /^FinSi$/,
          /^Mientras\s+.+\s+(==|!=|<=|>=|<|>)\s+.+\s+Hacer$/,
          /^FinMientras$/,
          /^Hacer$/,
          /^Para\s+[A-Za-z][A-Za-z0-9]*\s*<-\s+.+\s+Hasta\s+.+\s+Hacer$/,
          /^FinPara$/,
          /^Segun\s+.+\s+Hacer$/,
          /^Caso\s+.+$/,
          /^Defecto$/,
          /^FinSegun$/,
          /^Funcion\s+[A-Za-z][A-Za-z0-9]*\s*\(.*\)\s+Como\s+(Entero|Real|Cadena|Logico|Vacio)$/,
          /^FinFuncion$/,
          /^Retornar\s+.+$/,
        ];

        if (validPatterns.some((pattern) => pattern.test(trimmed))) {
          return null;
        }

        const firstWord = trimmed.split(/\s+/)[0] || '';
        const lowerWord = firstWord.toLowerCase();
        const closestKeyword = findClosestKeyword(lowerWord);

        if (/^[A-Za-z][A-Za-z0-9]*\s*=/.test(trimmed)) {
          return 'En NEBULA la asignacion usa <-, no =. Ejemplo correcto: x <- 10.';
        }

        if (/^[A-Za-z][A-Za-z0-9]*\s+<-/.test(trimmed)) {
          return 'Antes de <- debe ir solo el nombre de la variable. Ejemplo correcto: x <- 10.';
        }

        if ('algoritmo'.startsWith(lowerWord) || lowerWord.startsWith('algoritm')) {
          return 'Escribe el encabezado asi: Algoritmo NombreDelPrograma.';
        }

        if ('finalgoritmo'.startsWith(lowerWord) || lowerWord.startsWith('finalgoritm')) {
          return 'Cierra el programa exactamente asi: FinAlgoritmo.';
        }

        if ('finsi'.startsWith(lowerWord) || lowerWord.startsWith('finsi')) {
          return 'FinSi solo cierra un bloque iniciado con: Si condicion Entonces.';
        }

        if ('finmientras'.startsWith(lowerWord) || lowerWord.startsWith('finmientras')) {
          return 'FinMientras solo cierra un ciclo iniciado con: Mientras condicion Hacer.';
        }

        if ('finpara'.startsWith(lowerWord) || lowerWord.startsWith('finpara')) {
          return 'FinPara solo cierra un ciclo iniciado con: Para i <- inicio Hasta fin Hacer.';
        }

        if ('finsegun'.startsWith(lowerWord) || lowerWord.startsWith('finsegun')) {
          return 'FinSegun solo cierra una estructura iniciada con: Segun expresion Hacer.';
        }

        if ('finfuncion'.startsWith(lowerWord) || lowerWord.startsWith('finfuncion')) {
          return 'FinFuncion solo cierra una funcion iniciada con: Funcion Nombre(...) Como Tipo.';
        }

        if (closestKeyword) {
          if (closestKeyword === 'FinMientras') {
            return `No se reconoce "${firstWord}". Si querias cerrar un ciclo Mientras, escribe exactamente FinMientras. Si estas usando Hacer, no lleva FinMientras: termina con una linea como Mientras intentos <= 3.`;
          }

          return `No se reconoce "${firstWord}". Quiza quisiste escribir ${closestKeyword}. Revisa la palabra reservada y escribela exactamente igual.`;
        }

        if (/^[A-Za-z][A-Za-z0-9]*$/.test(trimmed)) {
          return `La linea "${trimmed}" no es una instruccion completa. Si quieres asignar, usa: ${trimmed} <- valor.`;
        }

        if ('definir'.startsWith(lowerWord) || lowerWord.startsWith('defin')) {
          if (!trimmed.includes(' Como ')) {
            return 'A la declaracion le falta Como. Usa: Definir variable Como Tipo.';
          }

          return 'Declara variables asi: Definir variable Como Entero. Tipos validos: Entero, Real, Cadena, Logico.';
        }

        if ('escribir'.startsWith(lowerWord) || lowerWord.startsWith('escri')) {
          return 'Para imprimir usa: Escribir expresion. Ejemplo: Escribir x.';
        }

        if ('si'.startsWith(lowerWord)) {
          return 'La condicion debe escribirse asi: Si x >= 10 Entonces. Debe incluir operador relacional y la palabra Entonces.';
        }

        if ('mientras'.startsWith(lowerWord) || lowerWord.startsWith('mient')) {
          return 'El ciclo debe escribirse asi: Mientras x < 10 Hacer. Debe terminar con Hacer.';
        }

        if ('para'.startsWith(lowerWord)) {
          return 'El ciclo Para debe escribirse asi: Para i <- 1 Hasta 10 Hacer. Debe incluir <-, Hasta y Hacer.';
        }

        if ('segun'.startsWith(lowerWord) || lowerWord.startsWith('seg')) {
          return 'La estructura debe escribirse asi: Segun opcion Hacer. Los casos van como: Caso 1.';
        }

        if ('caso'.startsWith(lowerWord)) {
          return 'Un caso debe escribirse asi: Caso 1.';
        }

        if ('funcion'.startsWith(lowerWord) || lowerWord.startsWith('func')) {
          return 'La funcion debe escribirse asi: Funcion Nombre(param Como Tipo) Como Tipo. Ejemplo: Funcion Sumar(a Como Entero) Como Entero.';
        }

        if ('retornar'.startsWith(lowerWord) || lowerWord.startsWith('ret')) {
          return 'El retorno debe escribirse asi: Retornar expresion.';
        }

        return `No se reconoce la instruccion "${firstWord}". Revisa si la palabra reservada esta mal escrita o usa una regla valida: Definir, Escribir, Si, Mientras, Para, Segun, Funcion o Retornar.`;
      }

      function findClosestKeyword(word) {
        if (!word) {
          return null;
        }

        const keywords = [
          'Algoritmo',
          'FinAlgoritmo',
          'Definir',
          'Escribir',
          'Si',
          'Sino',
          'FinSi',
          'Mientras',
          'FinMientras',
          'Hacer',
          'Para',
          'FinPara',
          'Segun',
          'Caso',
          'Defecto',
          'FinSegun',
          'Funcion',
          'FinFuncion',
          'Retornar',
        ];

        const best = keywords
          .map((keyword) => ({
            keyword,
            distance: levenshtein(word, keyword.toLowerCase()),
          }))
          .sort((left, right) => left.distance - right.distance)[0];

        return best && best.distance <= 3 ? best.keyword : null;
      }

      function levenshtein(left, right) {
        const dp = Array.from({ length: left.length + 1 }, () =>
          Array(right.length + 1).fill(0),
        );

        for (let i = 0; i <= left.length; i++) {
          dp[i][0] = i;
        }

        for (let j = 0; j <= right.length; j++) {
          dp[0][j] = j;
        }

        for (let i = 1; i <= left.length; i++) {
          for (let j = 1; j <= right.length; j++) {
            const cost = left[i - 1] === right[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(
              dp[i - 1][j] + 1,
              dp[i][j - 1] + 1,
              dp[i - 1][j - 1] + cost,
            );
          }
        }

        return dp[left.length][right.length];
      }

      function findInvalidSyntaxLine() {
        if (!codeInput) {
          return null;
        }

        const sourceLines = codeInput.value.split('\n');
        for (let index = 0; index < sourceLines.length; index++) {
          const suggestion = getSyntaxSuggestion(sourceLines[index]);
          if (suggestion) {
            return {
              line: index + 1,
              text: sourceLines[index].trim(),
              suggestion,
            };
          }
        }

        return null;
      }

      function findDuplicateDeclaration() {
        if (!codeInput) {
          return null;
        }

        const declarations = new Map();
        const sourceLines = codeInput.value.split('\n');

        for (let index = 0; index < sourceLines.length; index++) {
          const match = sourceLines[index]
            .trim()
            .match(/^Definir\s+([A-Za-z][A-Za-z0-9]*)\s+Como\s+(Entero|Real|Cadena|Logico)$/);

          if (!match) {
            continue;
          }

          const name = match[1];
          if (declarations.has(name)) {
            return {
              name,
              firstLine: declarations.get(name),
              line: index + 1,
            };
          }

          declarations.set(name, index + 1);
        }

        return null;
      }

      function renderSymbols(symbols) {
        if (!symbolsOutput) {
          return;
        }

        if (!symbols?.length) {
          symbolsOutput.textContent = 'No se encontraron simbolos.';
          symbolsOutput.className = 'symbols-table empty';
          return;
        }

        const rows = symbols.map((symbol) => `
          <tr>
            <td>${escapeHtml(symbol.nombre)}</td>
            <td>${escapeHtml(symbol.categoria)}</td>
            <td>${escapeHtml(symbol.tipo)}</td>
            <td>${escapeHtml(symbol.ambito)}</td>
            <td>${escapeHtml(symbol.linea ?? '-')}</td>
          </tr>
        `).join('');

        symbolsOutput.className = 'symbols-table';
        symbolsOutput.innerHTML = `
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Categoria</th>
                <th>Tipo</th>
                <th>Ambito</th>
                <th>Linea</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        `;
      }

      function formatCondition(condition) {
        if (!condition) {
          return '';
        }

        return `${condition.left} ${condition.operator} ${condition.right}`;
      }

      function grammarNode(label, kind = 'nonterminal', children = []) {
        return { label, kind, children };
      }

      function terminal(label) {
        return grammarNode(`"${label}"`, 'terminal');
      }

      function lexeme(label) {
        return grammarNode(label || 'vacio', 'lexeme');
      }

      function nonterminal(label, children = []) {
        return grammarNode(`<${label}>`, 'nonterminal', children);
      }

      function expressionNode(expression) {
        return nonterminal('expresion', [lexeme(expression)]);
      }

      function conditionNode(condition) {
        return nonterminal('condicion', [
          lexeme(condition?.left),
          lexeme(condition?.operator),
          lexeme(condition?.right),
        ]);
      }

      function blockNode(nodes) {
        return nonterminal('bloque', [
          grammarNode('{ <sentencia> }', 'nonterminal'),
          ...nodes.map(statementNode),
        ]);
      }

      function statementNode(node) {
        return nonterminal('sentencia', [astToGrammarNode(node)]);
      }

      function astToGrammarNode(node) {
        switch (node?.type) {
          case 'PROGRAM':
            return nonterminal('programa', [
              terminal('Algoritmo'),
              nonterminal('identificador', [lexeme(node.name)]),
              blockNode(node.children || []),
              terminal('FinAlgoritmo'),
            ]);
          case 'DECLARATION':
            return nonterminal('declaracion', [
              terminal('Definir'),
              nonterminal('identificador', [lexeme(node.name)]),
              terminal('Como'),
              nonterminal('tipo', [lexeme(node.dataType)]),
            ]);
          case 'ASSIGNMENT':
            return nonterminal('asignacion', [
              nonterminal('identificador', [lexeme(node.name)]),
              terminal('<-'),
              expressionNode(node.expression),
            ]);
          case 'PRINT':
            return nonterminal('escritura', [
              terminal('Escribir'),
              expressionNode(node.expression),
            ]);
          case 'IF':
            return nonterminal('si', [
              terminal('Si'),
              conditionNode(node.condition),
              terminal('Entonces'),
              blockNode(node.children || []),
              ...(node.elseBranch?.length ? [terminal('Sino'), blockNode(node.elseBranch)] : []),
              terminal('FinSi'),
            ]);
          case 'WHILE':
            return nonterminal('mientras', [
              terminal('Mientras'),
              conditionNode(node.condition),
              terminal('Hacer'),
              blockNode(node.children || []),
              terminal('FinMientras'),
            ]);
          case 'DO_WHILE':
            return nonterminal('hacer_mientras', [
              terminal('Hacer'),
              blockNode(node.children || []),
              terminal('Mientras'),
              conditionNode(node.condition),
            ]);
          case 'FOR':
            return nonterminal('para', [
              terminal('Para'),
              nonterminal('identificador', [lexeme(node.name)]),
              terminal('<-'),
              expressionNode(node.value),
              terminal('Hasta'),
              expressionNode(node.expression),
              terminal('Hacer'),
              blockNode(node.children || []),
              terminal('FinPara'),
            ]);
          case 'SWITCH':
            return nonterminal('segun', [
              terminal('Segun'),
              expressionNode(node.expression),
              terminal('Hacer'),
              ...(node.cases || []).map(astToGrammarNode),
              ...(node.defaultCase ? [astToGrammarNode(node.defaultCase)] : []),
              terminal('FinSegun'),
            ]);
          case 'CASE':
            return nonterminal('caso', [
              terminal('Caso'),
              expressionNode(node.expression),
              blockNode(node.children || []),
            ]);
          case 'DEFAULT':
            return nonterminal('defecto', [
              terminal('Defecto'),
              blockNode(node.children || []),
            ]);
          case 'FUNCTION':
            return nonterminal('funcion', [
              terminal('Funcion'),
              nonterminal('identificador', [lexeme(node.name)]),
              nonterminal('parametros', (node.params || []).map((param) =>
                nonterminal('parametro', [
                  nonterminal('identificador', [lexeme(param.name)]),
                  terminal('Como'),
                  nonterminal('tipo', [lexeme(param.dataType)]),
                ]),
              )),
              terminal('Como'),
              nonterminal('tipo_funcion', [lexeme(node.returnType)]),
              blockNode(node.children || []),
              terminal('FinFuncion'),
            ]);
          case 'RETURN':
            return nonterminal('retorno', [
              terminal('Retornar'),
              expressionNode(node.expression),
            ]);
          default:
            return nonterminal(node?.type || 'nodo');
        }
      }

      function renderGrammarNode(node) {
        const children = node.children?.length
          ? `<ul>${node.children.map(renderGrammarNode).join('')}</ul>`
          : '';

        return `
          <li>
            <div class="ast-node ast-node-${escapeHtml(node.kind)}">
              <span class="ast-type">${escapeHtml(node.label)}</span>
            </div>
            ${children}
          </li>
        `;
      }

      function partChip(part) {
        return `<span class="tree-chip tree-chip-${escapeHtml(part.kind)}">${escapeHtml(part.label)}</span>`;
      }

      function terminalPart(label) {
        return { kind: 'terminal', label: `"${label}"` };
      }

      function nonterminalPart(label) {
        return { kind: 'nonterminal', label: `<${label}>` };
      }

      function valuePart(label) {
        return { kind: 'value', label: label || 'vacio' };
      }

      function getReadableTreeNode(node) {
        switch (node?.type) {
          case 'PROGRAM':
            return {
              title: '<programa>',
              parts: [
                terminalPart('Algoritmo'),
                valuePart(node.name),
                nonterminalPart('bloque'),
                terminalPart('FinAlgoritmo'),
              ],
              groups: [{ label: 'bloque', nodes: node.children || [] }],
            };
          case 'DECLARATION':
            return {
              title: '<declaracion>',
              parts: [
                terminalPart('Definir'),
                valuePart(node.name),
                terminalPart('Como'),
                valuePart(node.dataType),
              ],
              groups: [],
            };
          case 'ASSIGNMENT':
            return {
              title: '<asignacion>',
              parts: [valuePart(node.name), terminalPart('<-'), valuePart(node.expression)],
              groups: [],
            };
          case 'PRINT':
            return {
              title: '<escritura>',
              parts: [terminalPart('Escribir'), valuePart(node.expression)],
              groups: [],
            };
          case 'IF':
            return {
              title: '<si>',
              parts: [
                terminalPart('Si'),
                valuePart(formatCondition(node.condition)),
                terminalPart('Entonces'),
                nonterminalPart('bloque'),
                ...(node.elseBranch?.length ? [terminalPart('Sino'), nonterminalPart('bloque')] : []),
                terminalPart('FinSi'),
              ],
              groups: [
                { label: 'entonces', nodes: node.children || [] },
                ...(node.elseBranch?.length ? [{ label: 'sino', nodes: node.elseBranch }] : []),
              ],
            };
          case 'WHILE':
            return {
              title: '<mientras>',
              parts: [
                terminalPart('Mientras'),
                valuePart(formatCondition(node.condition)),
                terminalPart('Hacer'),
                nonterminalPart('bloque'),
                terminalPart('FinMientras'),
              ],
              groups: [{ label: 'bloque', nodes: node.children || [] }],
            };
          case 'DO_WHILE':
            return {
              title: '<hacer_mientras>',
              parts: [
                terminalPart('Hacer'),
                nonterminalPart('bloque'),
                terminalPart('Mientras'),
                valuePart(formatCondition(node.condition)),
              ],
              groups: [{ label: 'bloque', nodes: node.children || [] }],
            };
          case 'FOR':
            return {
              title: '<para>',
              parts: [
                terminalPart('Para'),
                valuePart(node.name),
                terminalPart('<-'),
                valuePart(node.value),
                terminalPart('Hasta'),
                valuePart(node.expression),
                terminalPart('Hacer'),
                nonterminalPart('bloque'),
                terminalPart('FinPara'),
              ],
              groups: [{ label: 'bloque', nodes: node.children || [] }],
            };
          case 'SWITCH':
            return {
              title: '<segun>',
              parts: [
                terminalPart('Segun'),
                valuePart(node.expression),
                terminalPart('Hacer'),
                nonterminalPart('casos'),
                terminalPart('FinSegun'),
              ],
              groups: [
                { label: 'casos', nodes: node.cases || [] },
                ...(node.defaultCase ? [{ label: 'defecto', nodes: [node.defaultCase] }] : []),
              ],
            };
          case 'CASE':
            return {
              title: '<caso>',
              parts: [terminalPart('Caso'), valuePart(node.expression), nonterminalPart('bloque')],
              groups: [{ label: 'bloque', nodes: node.children || [] }],
            };
          case 'DEFAULT':
            return {
              title: '<defecto>',
              parts: [terminalPart('Defecto'), nonterminalPart('bloque')],
              groups: [{ label: 'bloque', nodes: node.children || [] }],
            };
          case 'FUNCTION':
            return {
              title: '<funcion>',
              parts: [
                terminalPart('Funcion'),
                valuePart(node.name),
                nonterminalPart('parametros'),
                terminalPart('Como'),
                valuePart(node.returnType),
                nonterminalPart('bloque'),
                terminalPart('FinFuncion'),
              ],
              groups: [
                {
                  label: 'parametros',
                  nodes: (node.params || []).map((param) => ({
                    type: 'PARAM',
                    name: param.name,
                    dataType: param.dataType,
                  })),
                },
                { label: 'bloque', nodes: node.children || [] },
              ],
            };
          case 'PARAM':
            return {
              title: '<parametro>',
              parts: [valuePart(node.name), terminalPart('Como'), valuePart(node.dataType)],
              groups: [],
            };
          case 'RETURN':
            return {
              title: '<retorno>',
              parts: [terminalPart('Retornar'), valuePart(node.expression)],
              groups: [],
            };
          default:
            return {
              title: `<${node?.type || 'nodo'}>`,
              parts: [],
              groups: [],
            };
        }
      }

      function renderReadableTreeNode(node) {
        const treeNode = getReadableTreeNode(node);
        const groups = treeNode.groups
          .filter((group) => group.nodes.length)
          .map((group) => `
            <div class="readable-tree-group">
              <div class="readable-tree-group-label">${escapeHtml(group.label)}</div>
              <div class="readable-tree-children">
                ${group.nodes.map(renderReadableTreeNode).join('')}
              </div>
            </div>
          `).join('');

        return `
          <article class="readable-tree-node">
            <div class="readable-tree-card">
              <div class="readable-tree-title">${escapeHtml(treeNode.title)}</div>
              <div class="readable-tree-production">${treeNode.parts.map(partChip).join('')}</div>
            </div>
            ${groups}
          </article>
        `;
      }

      function measureTree(node) {
        const nodeWidth = Math.max(82, Math.min(180, node.label.length * 8 + 28));
        const childLayouts = (node.children || []).map(measureTree);
        const gap = 26;
        const childrenWidth = childLayouts.length
          ? childLayouts.reduce((total, child) => total + child.width, 0) + gap * (childLayouts.length - 1)
          : 0;

        return {
          node,
          nodeWidth,
          childLayouts,
          width: Math.max(nodeWidth, childrenWidth),
          x: 0,
          y: 0,
        };
      }

      function positionTree(layout, left, depth) {
        const levelHeight = 84;
        layout.x = left + layout.width / 2;
        layout.y = 34 + depth * levelHeight;

        const gap = 26;
        const childrenWidth = layout.childLayouts.length
          ? layout.childLayouts.reduce((total, child) => total + child.width, 0) + gap * (layout.childLayouts.length - 1)
          : 0;
        let childLeft = layout.x - childrenWidth / 2;

        for (const child of layout.childLayouts) {
          positionTree(child, childLeft, depth + 1);
          childLeft += child.width + gap;
        }

        return layout;
      }

      function getTreeDepth(layout) {
        if (!layout.childLayouts.length) {
          return 1;
        }

        return 1 + Math.max(...layout.childLayouts.map(getTreeDepth));
      }

      function renderSvgTreeNode(layout) {
        const nodeHeight = 36;
        const rx = 6;
        const nodeX = layout.x - layout.nodeWidth / 2;
        const nodeY = layout.y;
        const kind = layout.node.kind === 'nonterminal' ? 'nonterminal' : 'terminal';
        const isNonTerminal = kind === 'nonterminal';
        const fill = isNonTerminal ? '#e8ddff' : '#e6f5dd';
        const stroke = isNonTerminal ? '#8b68d1' : '#82bd70';
        const textFill = isNonTerminal ? '#34235f' : '#2f5625';
        const edges = layout.childLayouts.map((child) => `
          <line
            class="tree-edge"
            x1="${layout.x}"
            y1="${nodeY + nodeHeight}"
            x2="${child.x}"
            y2="${child.y - 4}"
            stroke="rgba(30, 24, 20, 0.82)"
            stroke-width="2"
            marker-end="url(#tree-arrow)"
          />
        `).join('');
        const children = layout.childLayouts.map(renderSvgTreeNode).join('');

        return `
          ${edges}
          <g class="tree-svg-node tree-svg-node-${kind}">
            <rect x="${nodeX}" y="${nodeY}" width="${layout.nodeWidth}" height="${nodeHeight}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="1.6" />
            <text x="${layout.x}" y="${nodeY + 23}" text-anchor="middle" fill="${textFill}" font-family="Consolas, Courier New, monospace" font-size="13" font-weight="800">${escapeHtml(layout.node.label)}</text>
          </g>
          ${children}
        `;
      }

      function renderSvgTree(root) {
        const layout = positionTree(measureTree(root), 24, 0);
        const width = Math.ceil(layout.width + 48);
        const height = getTreeDepth(layout) * 84 + 48;

        return `
          <svg class="tree-svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Arbol de analisis sintactico">
            <rect x="0" y="0" width="${width}" height="${height}" fill="#fbfaf8" />
            <defs>
              <marker id="tree-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L8,4 L0,8 Z" fill="rgba(30, 24, 20, 0.82)" />
              </marker>
            </defs>
            ${renderSvgTreeNode(layout)}
          </svg>
        `;
      }

      function renderAstTree(ast) {
        if (!treeOutput) {
          return;
        }

        if (!ast) {
          treeOutput.textContent = 'Compila para ver el arbol sintactico.';
          treeOutput.className = 'ast-tree empty';
          if (downloadTreeButton) {
            downloadTreeButton.hidden = true;
          }
          return;
        }

        treeOutput.className = 'ast-tree grammar-tree tree-svg-wrap';
        treeOutput.innerHTML = `
          <div class="tree-svg-stage">
            ${renderSvgTree(astToGrammarNode(ast))}
          </div>
        `;
        requestAnimationFrame(() => {
          treeOutput.scrollLeft = Math.max(0, (treeOutput.scrollWidth - treeOutput.clientWidth) / 2);
          treeOutput.scrollTop = 0;
        });
        if (downloadTreeButton) {
          downloadTreeButton.hidden = !document.querySelector('.tab.active[data-tab="tree"]');
        }
      }

      async function downloadAstTreeImage() {
        const svg = treeOutput?.querySelector('svg');
        if (!svg) {
          return;
        }

        const serializer = new XMLSerializer();
        const clonedSvg = svg.cloneNode(true);
        clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        const width = Number(svg.getAttribute('width')) || svg.viewBox.baseVal.width || 1200;
        const height = Number(svg.getAttribute('height')) || svg.viewBox.baseVal.height || 800;
        const svgText = serializer.serializeToString(clonedSvg);
        const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        const image = new Image();

        image.onload = () => {
          const scale = 2;
          const canvas = document.createElement('canvas');
          canvas.width = width * scale;
          canvas.height = height * scale;
          const context = canvas.getContext('2d');

          context.fillStyle = '#fbfaf8';
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.scale(scale, scale);
          context.drawImage(image, 0, 0);
          URL.revokeObjectURL(url);

          const link = document.createElement('a');
          link.download = `arbol-nebula-${Date.now()}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        };

        image.src = url;
      }

      function formatError(result) {
        const details = [];
        const sourceLine = getSourceLine(result.errorLine);

        if (result.errorType) {
          details.push(`Tipo: ${result.errorType}`);
        }

        if (result.errorLine) {
          details.push(`Linea: ${result.errorLine}`);
        }

        if (sourceLine) {
          details.push(`Codigo: ${sourceLine}`);
        }

        if (result.suggestion) {
          details.push(`Sugerencia: ${result.suggestion}`);
        }

        return [result.error || 'Error desconocido.', ...details].join('\n');
      }

      function showCompileIssue(result) {
        if (!suggestionsList) {
          return;
        }

        const sourceLine = getSourceLine(result.errorLine);
        const title = result.errorLine
          ? `Error en linea ${result.errorLine}`
          : 'Error de compilacion';
        const text = sourceLine
          ? `${sourceLine} - ${result.suggestion || result.error || 'Revisa esta linea.'}`
          : result.suggestion || result.error || 'Revisa el codigo ingresado.';

        suggestionsList.className = 'inline-suggestion visible error';
        suggestionsList.innerHTML = `
          <div class="suggestion-badge">${escapeHtml(result.errorLine ? `Linea ${result.errorLine}` : 'Error')}</div>
          <div class="suggestion-copy">
            <strong>${escapeHtml(title)}</strong>
            <span>${escapeHtml(text)}</span>
          </div>
        `;
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
            line: findLineNumber((line) => line.length > 0),
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
            line: findLineNumber((line) => line.startsWith('Definir') &&
              !/^Definir\s+[A-Za-z][A-Za-z0-9]*\s+Como\s+(Entero|Real|Cadena|Logico)$/.test(line)),
          });
        }

        const invalidSyntax = findInvalidSyntaxLine();
        if (invalidSyntax) {
          suggestions.push({
            type: 'error',
            title: 'Regla mal escrita',
            text: invalidSyntax.suggestion,
            line: invalidSyntax.line,
          });
        }

        const duplicateDeclaration = findDuplicateDeclaration();
        if (duplicateDeclaration) {
          suggestions.push({
            type: 'error',
            title: 'Variable duplicada',
            text: `La variable ${duplicateDeclaration.name} ya fue declarada en la linea ${duplicateDeclaration.firstLine}. Cambia el nombre o elimina esta declaracion duplicada.`,
            line: duplicateDeclaration.line,
          });
        }

        if (code.includes('Si ') && !code.includes('FinSi')) {
          suggestions.push({
            type: 'warn',
            title: 'Te falta cerrar un Si',
            text: 'Si abres un bloque Si ... Entonces, debes cerrarlo con FinSi.',
            line: findLineNumber((line) => line.startsWith('Si ')),
          });
        }

        if (code.includes('Mientras ') && code.includes('Hacer') && !code.includes('FinMientras')) {
          suggestions.push({
            type: 'warn',
            title: 'Te falta FinMientras',
            text: 'Los ciclos Mientras ... Hacer deben terminar con FinMientras.',
            line: findLineNumber((line) => line.startsWith('Mientras ')),
          });
        }

        if (code.includes('Para ') && !code.includes('FinPara')) {
          suggestions.push({
            type: 'warn',
            title: 'Te falta FinPara',
            text: 'Cada bloque Para debe cerrarse con FinPara.',
            line: findLineNumber((line) => line.startsWith('Para ')),
          });
        }

        if (code && !/FinAlgoritmo\s*$/.test(code.trim())) {
          suggestions.push({
            type: 'warn',
            title: 'Falta FinAlgoritmo',
            text: 'Todo programa debe terminar con FinAlgoritmo.',
            line: findLastCodeLineNumber(),
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
          clearEditorErrorLine();
          return;
        }

        if (topSuggestion.line) {
          setEditorErrorLine(topSuggestion.line);
        } else {
          clearEditorErrorLine();
        }

        const sourceLine = getSourceLine(topSuggestion.line);
        const suggestionText = sourceLine
          ? `${sourceLine} - ${topSuggestion.text}`
          : topSuggestion.text;

        suggestionsList.className = `inline-suggestion visible ${topSuggestion.type}`;
        suggestionsList.innerHTML = `
          <div class="suggestion-badge">${escapeHtml(topSuggestion.line ? `Linea ${topSuggestion.line}` : topSuggestion.type === 'error' ? 'Atencion' : 'Consejo')}</div>
          <div class="suggestion-copy">
            <strong>${escapeHtml(topSuggestion.line ? `${topSuggestion.title} en linea ${topSuggestion.line}` : topSuggestion.title)}</strong>
            <span>${escapeHtml(suggestionText)}</span>
          </div>
        `;
      }

      function handleEditorChange() {
        const value = codeInput.value;
        localStorage.setItem(draftKey, value);
        draftState.textContent = 'guardado automatico';
        clearEditorErrorLine();
        syncLineNumbers(value, codeLines);
        updateEditorActiveLine();
        updateSuggestions();
      }

      function setIdleOutputs() {
        tokensOutput.textContent = 'Compila para ver los tokens.';
        tokensOutput.className = 'codebox mini-box empty';
        astOutput.textContent = 'Compila para ver el AST.';
        astOutput.className = 'codebox mini-box empty';
        renderSymbols([]);
        renderAstTree(null);
        symbolsOutput.textContent = 'Compila para ver la tabla de simbolos.';
        symbolsOutput.className = 'symbols-table empty';
        errorOutput.textContent = 'Todavia no hay errores ni resultados.';
        errorOutput.className = 'codebox mini-box empty';
        clearEditorErrorLine();
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
          renderSymbols(result.symbolTable || []);
          renderAstTree(result.ast);
          javaOutput.textContent = result.java || '';
          javaOutput.className = 'codebox output-codebox';
          errorOutput.textContent = 'Sin errores. El backend acepto el programa.';
          errorOutput.className = 'codebox mini-box';
          clearEditorErrorLine();
          updateSuggestions();
          syncLineNumbers(javaOutput.textContent, javaLines);
          syncScroll(javaOutput, javaLines);
          resetTerminal();
          autoSaveHistory();
        } else {
          tokensOutput.textContent = 'No disponible por error.';
          tokensOutput.className = 'codebox mini-box empty';
          astOutput.textContent = 'No disponible por error.';
          astOutput.className = 'codebox mini-box empty';
          renderSymbols(result.symbolTable || []);
          renderAstTree(null);
          javaOutput.textContent = 'No se genero Java.';
          javaOutput.className = 'codebox output-codebox empty';
          errorOutput.textContent = formatError(result);
          errorOutput.className = 'codebox mini-box';
          setEditorErrorLine(result.errorLine);
          showCompileIssue(result);
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
          if (downloadTreeButton) {
            downloadTreeButton.hidden = tab.dataset.tab !== 'tree' || !treeOutput?.querySelector('svg');
          }
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
      if (downloadTreeButton) {
        downloadTreeButton.addEventListener('click', downloadAstTreeImage);
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

