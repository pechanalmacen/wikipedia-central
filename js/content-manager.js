/**
 * WikiEdu Central - Content Manager
 * Gestor de datos, manifiesto JSON, parseo de Markdown y exportaciones.
 */

const STORAGE_KEY = 'wikiedu_topics_manifest_v1';
const LOCAL_MD_PREFIX = 'wikiedu_md_content_';

class ContentManager {
  constructor() {
    this.categories = [];
    this.topics = [];
    this.customMarkdownStore = {};
  }

  /**
   * Carga inicial del manifiesto JSON desde data/topics.json o localStorage
   */
  async init() {
    try {
      const timeKey = STORAGE_KEY + '_time';
      const localData = localStorage.getItem(STORAGE_KEY);
      const localSavedTime = parseInt(localStorage.getItem(timeKey) || '0', 10);

      // 1. Cargar manifest base desde el servidor evitando la caché del navegador (?t=)
      const response = await fetch(`data/topics.json?t=${Date.now()}`);
      if (!response.ok) {
        throw new Error('No se pudo cargar data/topics.json desde el servidor');
      }

      const baseManifest = await response.json();
      const lastModifiedHeader = response.headers.get('Last-Modified');
      const serverModifiedTime = lastModifiedHeader ? new Date(lastModifiedHeader).getTime() : 0;

      // 2. Si hay modificaciones locales en la App Y son más recientes que el archivo topics.json:
      if (localData && localSavedTime > serverModifiedTime) {
        const parsedLocal = JSON.parse(localData);
        this.categories = parsedLocal.categories || baseManifest.categories;
        this.topics = parsedLocal.topics || baseManifest.topics;
      } else {
        // 3. Priorizar siempre el archivo topics.json del servidor/VS Code
        this.categories = baseManifest.categories;
        this.topics = baseManifest.topics;
      }

      console.log('Manifiesto cargado con éxito:', this.topics.length, 'temas registrados.');
      return true;
    } catch (err) {
      console.warn('Error al cargar datos remotos, iniciando modo offline de contingencia:', err);
      // Respaldo en caso de fallo de red
      const localData = localStorage.getItem(STORAGE_KEY);
      if (localData) {
        const parsedLocal = JSON.parse(localData);
        this.categories = parsedLocal.categories || [];
        this.topics = parsedLocal.topics || [];
      }
      return false;
    }
  }

  /**
   * Persistir estado actual en localStorage guardando la marca de tiempo
   */
  saveToLocalStorage() {
    const payload = {
      categories: this.categories,
      topics: this.topics
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    localStorage.setItem(STORAGE_KEY + '_time', Date.now().toString());
  }

  /**
   * Obtener todas las categorías disponibles
   */
  getCategories() {
    return this.categories;
  }

  /**
   * Obtener todos los temas (con soporte para temas ocultos 'hidden')
   */
  getTopics(filterCategory = 'all', searchQuery = '', showHidden = false) {
    return this.topics.filter(topic => {
      // Si el tema es oculto y no tenemos permisos de admin, se omite
      if (topic.hidden && !showHidden) return false;

      const matchCat = filterCategory === 'all' || topic.category === filterCategory;
      const queryLower = searchQuery.toLowerCase().trim();
      const matchQuery = !queryLower ||
        topic.title.toLowerCase().includes(queryLower) ||
        topic.summary.toLowerCase().includes(queryLower) ||
        (topic.badge && topic.badge.toLowerCase().includes(queryLower));
      return matchCat && matchQuery;
    });
  }

  /**
   * Obtener un tema específico por su ID
   */
  getTopicById(topicId) {
    return this.topics.find(t => t.id === topicId);
  }

  /**
   * Cargar el contenido de un archivo Markdown (.md)
   */
  async loadMarkdownContent(filepath) {
    // Clave para la marca de tiempo local
    const timeKey = LOCAL_MD_PREFIX + filepath + '_time';
    const localOverride = localStorage.getItem(LOCAL_MD_PREFIX + filepath);
    const localSavedTime = parseInt(localStorage.getItem(timeKey) || '0', 10);

    try {
      // 1. Petición con parámetro único ?t= para evitar caché HTTP en el navegador
      const response = await fetch(`${filepath}?t=${Date.now()}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} al cargar ${filepath}`);
      }

      const serverText = await response.text();
      const lastModifiedHeader = response.headers.get('Last-Modified');
      const serverModifiedTime = lastModifiedHeader ? new Date(lastModifiedHeader).getTime() : 0;

      // 2. Si editaste desde la App localmente Y esa edición es más reciente que el archivo servidor:
      if (localOverride && localSavedTime > serverModifiedTime) {
        return localOverride;
      }

      // 3. De lo contrario, priorizar siempre la versión real del archivo .md
      return serverText;
    } catch (err) {
      console.warn(`No se pudo leer el archivo en servidor. Buscando en respaldo local...`, err);
      if (localOverride) {
        return localOverride;
      }
      return `# Artículo no encontrado\n\nEl archivo \`${filepath}\` aún no se ha creado en el servidor.`;
    }
  }

  /**
   * Parsear texto Markdown a HTML seguro y enriquecido
   */
  parseMarkdown(mdText) {
    if (!mdText) return '';

    // 1. Limpieza de Comentarios Obsidian (%% inline %% y %% bloque %%)
    let processed = mdText.replace(/%%[\s\S]*?%%/g, '');

    // 2. Extracción de Notas al Pie / Footnotes ([^1]: Contenido)
    const footnotes = {};
    processed = processed.replace(/^\[\^([^\]]+)\]:\s*(.*)$/gm, (match, id, text) => {
      footnotes[id] = text;
      return '';
    });

    // Reemplazar referencias inline a notas al pie [^1]
    processed = processed.replace(/\[\^([^\]]+)\]/g, (match, id) => {
      return `<sup class="footnote-ref"><a href="#fn-${id}" id="fnref-${id}">[${id}]</a></sup>`;
    });

    // 3. Procesar Resaltado de Texto ==texto==
    processed = processed.replace(/==(.*?)==/g, '<mark class="md-highlight">$1</mark>');

    // 4. Procesar Bloques de Alerta / Callouts (> [!NOTE] Título opcional)
    processed = processed.replace(/^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]([^\n]*)\n((?:>[^\n]*\n?)*)/gim, (match, type, titleLine, contentLines) => {
      const typeUpper = type.toUpperCase();
      const typeLower = type.toLowerCase();

      // Limpiar el contenido removiendo únicamente el '>' inicial de cada línea
      const cleanContent = contentLines
        .split('\n')
        .map(line => line.replace(/^>\s?/, ''))
        .join('\n')
        .trim();

      const icons = {
        NOTE: 'bi-info-circle-fill',
        TIP: 'bi-lightbulb-fill',
        IMPORTANT: 'bi-exclamation-circle-fill',
        WARNING: 'bi-exclamation-triangle-fill',
        CAUTION: 'bi-shield-slash-fill'
      };

      const defaultTitles = {
        NOTE: 'Nota',
        TIP: 'Consejo',
        IMPORTANT: 'Importante',
        WARNING: 'Advertencia',
        CAUTION: 'Precaución'
      };

      // Título en la misma línea (si existe) o el por defecto
      const trimmedTitle = titleLine.trim();
      const rawTitle = trimmedTitle !== '' ? trimmedTitle : (defaultTitles[typeUpper] || typeUpper);

      // Parsear Markdown inline para título y contenido
      const parsedTitle = typeof marked !== 'undefined' ? marked.parseInline(rawTitle) : rawTitle;
      const parsedContent = typeof marked !== 'undefined' ? marked.parseInline(cleanContent) : cleanContent;

      return `<div class="callout callout-${typeLower}">
        <div class="callout-header">
          <i class="bi ${icons[typeUpper] || 'bi-info-circle-fill'}"></i>
          <span>${parsedTitle}</span>
        </div>
        <div class="callout-content">${parsedContent}</div>
      </div>\n\n`;
    });

    // 5. Protección de Fórmulas Matemáticas LaTeX ($...$ y $$...$$)
    // Se usan etiquetas HTML unicas para que Marked no altere ni limpie el placeholder
    const mathBlocks = [];
    processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (match, equation) => {
      const placeholder = `MATHBLOCKPLACEHOLDER${mathBlocks.length}END`;
      mathBlocks.push(equation.trim());
      return `\n\n<div data-math-block="${placeholder}"></div>\n\n`;
    });

    const mathInlines = [];
    processed = processed.replace(/\$([^\$\n]+)\$/g, (match, equation) => {
      const placeholder = `MATHINLINEPLACEHOLDER${mathInlines.length}END`;
      mathInlines.push(equation.trim());
      return `<span data-math-inline="${placeholder}"></span>`;
    });

    // 6. Configurar y renderizar con Marked.js
    let html = '';
    if (typeof marked !== 'undefined') {
      marked.use({
        breaks: true,
        gfm: true
      });

      const renderer = new marked.Renderer();

      // Generar IDs navegables para encabezados
      renderer.heading = (arg1, arg2) => {
        const isObject = typeof arg1 === 'object' && arg1 !== null;
        const textContent = isObject ? (arg1.text || '') : String(arg1 || '');
        const level = isObject ? (arg1.depth || 1) : (arg2 || 1);

        const rawText = textContent.replace(/<[^>]*>/g, '').trim();

        const slug = rawText
          .toLowerCase()
          .replace(/[^\w\u0400-\u04FF\u00C0-\u024F\s-]/g, '')
          .trim()
          .replace(/\s+/g, '-');

        const exactSlug = rawText.replace(/\s+/g, '-');

        return `<h${level} id="${slug}" data-raw-id="${exactSlug}" class="md-heading">${textContent}</h${level}>`;
      };

      // Task List Item y formateo interno (preserva negritas, links y marcado dentro de items)
      renderer.listitem = (arg1, isTask, checked) => {
        const isObj = typeof arg1 === 'object' && arg1 !== null;
        // Se usa .tokens si existe (parseado completo) o se recurre al parseo manual del texto
        let itemHtml = '';
        if (isObj) {
          itemHtml = arg1.tokens ? marked.parser(arg1.tokens) : marked.parseInline(arg1.text || '');
        } else {
          itemHtml = marked.parseInline(String(arg1 || ''));
        }

        const taskChecked = isObj ? arg1.checked : checked;
        const taskIsTask = isObj ? arg1.task : isTask;

        if (taskIsTask) {
          return `<li class="task-list-item"><input type="checkbox" ${taskChecked ? 'checked' : ''} disabled readonly> <span>${itemHtml}</span></li>`;
        }
        return `<li>${itemHtml}</li>`;
      };

      // Bloques de código (Mermaid y otros lenguajes) - Compatible con objetos de Marked v12+
      renderer.code = (arg1, arg2) => {
        const isObj = typeof arg1 === 'object' && arg1 !== null;
        const codeText = isObj ? (arg1.text || '') : String(arg1 || '');
        const language = isObj ? (arg1.lang || '') : (arg2 || '');

        if (language === 'mermaid') {
          return `<div class="mermaid">${codeText}</div>`;
        }
        return `<pre><code class="language-${language || 'text'}">${codeText}</code></pre>`;
      };

      html = marked.parse(processed, { renderer });
    } else {
      // Parseador de respaldo básico
      html = processed
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*)\*/gim, '<em>$1</em>')
        .replace(/`([^`]+)`/gim, '<code>$1</code>')
        .replace(/\n/gim, '<br>');
    }

    // 7. Restaurar Fórmulas LaTeX con KaTeX
    mathBlocks.forEach((eq, idx) => {
      let mathHtml = `<div class="math-raw">$$${eq}$$</div>`;
      if (typeof katex !== 'undefined') {
        try {
          mathHtml = katex.renderToString(eq, { displayMode: true, throwOnError: false });
        } catch (e) {
          console.error('KaTeX block error:', e);
        }
      }
      const target = `<div data-math-block="MATHBLOCKPLACEHOLDER${idx}END"></div>`;
      html = html.replace(target, `<div class="math-block">${mathHtml}</div>`);
    });

    mathInlines.forEach((eq, idx) => {
      let mathHtml = `<span class="math-raw">$${eq}$</span>`;
      if (typeof katex !== 'undefined') {
        try {
          mathHtml = katex.renderToString(eq, { displayMode: false, throwOnError: false });
        } catch (e) {
          console.error('KaTeX inline error:', e);
        }
      }
      const target = `<span data-math-inline="MATHINLINEPLACEHOLDER${idx}END"></span>`;
      html = html.replace(target, `<span class="math-inline">${mathHtml}</span>`);
    });

    // 8. Convertir códigos de color Hexadecimal (#ffffff, #000000, etc.) en insignias con previsualizador
    html = html.replace(/(^|[\s>(])#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g, (match, prefix, hex) => {
      const color = `#${hex}`;
      return `${prefix}<span class="color-badge"><span class="color-dot" style="background:${color};"></span><code>${color}</code></span>`;
    });

    // 9. Insertar sección de Notas al Pie (Footnotes) si existen
    const footnoteIds = Object.keys(footnotes);
    if (footnoteIds.length > 0) {
      let fnHtml = '<hr class="footnotes-sep"><section class="footnotes"><ol class="footnotes-list">';
      footnoteIds.forEach(id => {
        fnHtml += `<li id="fn-${id}" class="footnote-item"><p>${footnotes[id]} <a href="#fnref-${id}" class="footnote-backref">↩</a></p></li>`;
      });
      fnHtml += '</ol></section>';
      html += fnHtml;
    }

    return html;
  }

  /**
   * Agregar o actualizar un tema completo en el manifiesto
   */
  addOrUpdateTopic(topicData, rawMarkdown = null) {
    const existingIndex = this.topics.findIndex(t => t.id === topicData.id);

    if (existingIndex >= 0) {
      this.topics[existingIndex] = { ...this.topics[existingIndex], ...topicData };
    } else {
      this.topics.unshift(topicData);
    }

    // Si viene contenido Markdown personalizado, guardarlo localmente
    if (rawMarkdown && topicData.chapters && topicData.chapters.length > 0) {
      const firstChapterPath = topicData.chapters[0].markdownFile;
      localStorage.setItem(LOCAL_MD_PREFIX + firstChapterPath, rawMarkdown);
    }

    this.saveToLocalStorage();
  }

  /**
   * Guardar contenido Markdown específico de un capítulo
   */
  saveChapterMarkdown(filePath, mdContent) {
    localStorage.setItem(LOCAL_MD_PREFIX + filePath, mdContent);
    // Guardar el timestamp actual para saber cuándo se editó desde la web
    localStorage.setItem(LOCAL_MD_PREFIX + filePath + '_time', Date.now().toString());
  }

  /**
   * Exportar manifiesto topics.json actualizado para descarga del usuario
   */
  exportTopicsJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      categories: this.categories,
      topics: this.topics
    }, null, 2));

    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "topics.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  /**
   * Exportar un archivo Markdown individual
   */
  exportMarkdownFile(filename, content) {
    const dataStr = "data:text/markdown;charset=utf-8," + encodeURIComponent(content);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", filename.endsWith('.md') ? filename : `${filename}.md`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }
}

window.contentManager = new ContentManager();
