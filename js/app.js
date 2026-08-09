/**
 * WikiEdu Central - Main Application Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  const state = {
    currentCategory: 'all',
    searchQuery: '',
    currentTopicId: null,
    currentChapterIdx: 0,
    currentTab: 'article',
    theme: localStorage.getItem('wikiedu_theme') || 'dark',
    isAdmin: false
  };

  // Variables de control para el modal
  let tempChapters = [];
  let currentChapterIndex = 0;

  document.documentElement.setAttribute('data-theme', state.theme);
  updateThemeIcon(state.theme);

  await window.contentManager.init();
  renderDashboard();

  // ==========================================================================
  // ATAJO DE TECLAS: Ctrl + Shift + A (Modo Administrador)
  // ==========================================================================
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      state.isAdmin = !state.isAdmin;

      document.querySelectorAll('.admin-only').forEach(el => {
        el.classList.toggle('d-none', !state.isAdmin);
      });

      renderDashboard();
      console.log(`Modo Admin: ${state.isAdmin ? 'ACTIVADO' : 'DESACTIVADO'}`);
    }
  });

  // Búsqueda global
  const searchInput = document.getElementById('globalSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderDashboard();
    });
  }

  // Filtro por categorías
  const catBar = document.getElementById('categoryFilterBar');
  if (catBar) {
    catBar.addEventListener('click', (e) => {
      const pill = e.target.closest('.category-pill');
      if (pill) {
        state.currentCategory = pill.dataset.cat;
        renderDashboard();
      }
    });
  }

// Selección de Tarjeta de Tema
  document.getElementById('matrixGrid')?.addEventListener('click', (e) => {
    const card = e.target.closest('.topic-card');
    if (card) openTopicReader(card.dataset.topicId, 0, 'article');
  });

  // Pestañas Multimedia
  document.getElementById('multimediaTabs')?.addEventListener('click', (e) => {
    const tabBtn = e.target.closest('.mm-tab-btn');
    if (tabBtn) {
      state.currentTab = tabBtn.dataset.tab;
      const topic = window.contentManager.getTopicById(state.currentTopicId);
      if (topic) window.UIComponents.renderReaderView(topic, state.currentChapterIdx, state.currentTab);
    }
  });

// Cambio de Capítulo en Sidebar
// Controladores para la Barra Lateral y Menú Flotante Móvil
  const sidebar = document.getElementById('readerSidebar');
  const triggerBtn = document.getElementById('mobileChaptersTrigger');
  const overlay = document.getElementById('mobileDrawerOverlay');

  function closeMobileDrawer() {
    sidebar?.classList.remove('open-mobile');
    document.getElementById('mobileDrawerOverlay')?.classList.remove('active');
  }

  function openMobileDrawer() {
    sidebar?.classList.add('open-mobile');
    document.getElementById('mobileDrawerOverlay')?.classList.add('active');
  }

  // Lógica para alternar el Sidebar en PC
  function toggleSidebarPC() {
    const readerView = document.getElementById('readerView');
    const triggerBtn = document.getElementById('mobileChaptersTrigger');
    
    if (readerView) {
      const isCollapsed = readerView.classList.toggle('sidebar-collapsed');
      document.body.classList.toggle('pc-collapsed', isCollapsed);
      
      // Forzar la visibilidad del botón directamente mediante JS
      if (triggerBtn) {
        triggerBtn.style.display = isCollapsed ? 'flex' : 'none';
      }
    }
  }

// Delegación de clics globales (Móvil y PC)
  document.addEventListener('click', (e) => {
    // 1. Clic en el botón flotante de Capítulos
    if (e.target.closest('#mobileChaptersTrigger')) {
      if (window.innerWidth > 1024) {
        const readerView = document.getElementById('readerView');
        readerView?.classList.remove('sidebar-collapsed');
        document.body.classList.remove('pc-collapsed');
      } else {
        openMobileDrawer();
      }
      return; // Salimos para evitar ejecuciones extra
    } 

    // 2. Clic en la 'X' para cerrar el sidebar
    if (e.target.closest('#btnCloseMobileDrawer')) {
      if (window.innerWidth > 1024) {
        toggleSidebarPC();
      } else {
        closeMobileDrawer();
      }
      return;
    }

    // 3. NUEVO: Clic fuera del sidebar en móvil (Overlay o fondo)
    if (window.innerWidth <= 1024) {
      const sidebar = document.getElementById('readerSidebar');
      const isMobileOpen = sidebar?.classList.contains('open-mobile');

      if (isMobileOpen) {
        const isClickInsideSidebar = e.target.closest('#readerSidebar');
        const isClickOnOverlay = e.target.closest('#mobileDrawerOverlay');

        // Si toca el fondo oscuro O cualquier lugar fuera del sidebar, se cierra
        if (isClickOnOverlay || !isClickInsideSidebar) {
          closeMobileDrawer();
        }
      }
    }
  });

  // Cambio de Capítulo en Sidebar
  sidebar?.addEventListener('click', (e) => {
    if (e.target.closest('#btnBackToMatrix')) {
      closeMobileDrawer();
      showDashboard();
      return;
    }

    const navItem = e.target.closest('.chapter-nav-item');
    if (navItem) {
      state.currentChapterIdx = parseInt(navItem.dataset.chapterIdx, 10);
      const topic = window.contentManager.getTopicById(state.currentTopicId);
      if (topic) window.UIComponents.renderReaderView(topic, state.currentChapterIdx, state.currentTab);

      // Cierra la barra desplegable en móvil tras seleccionar un capítulo
      closeMobileDrawer();

      if (window.innerWidth <= 768) {
        document.getElementById('tabContentArea')?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  });

  // Theme Toggle y Brand Click
  document.getElementById('btnThemeToggle')?.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    localStorage.setItem('wikiedu_theme', state.theme);
    updateThemeIcon(state.theme);
  });

  document.getElementById('brandLogo')?.addEventListener('click', showDashboard);
  document.getElementById('btnExportJson')?.addEventListener('click', () => window.contentManager.exportTopicsJSON());

// ==========================================================================
  // EVENTOS DEL MODAL CREADOR / ADMINISTRADOR
  // ==========================================================================
const creatorModal = document.getElementById('creatorModal');
  
  document.getElementById('btnOpenCreator')?.addEventListener('click', () => {
    populateTopicSelectOptions();
    resetCreatorForm();
    creatorModal.classList.add('active');
  });

  creatorModal?.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop') || e.target.closest('.btn-close')) {
      creatorModal.classList.remove('active');
    }
  });

  // Selector de Tema Preexistente para Edición
  const selectTopicToEdit = document.getElementById('selectTopicToEdit');
  selectTopicToEdit?.addEventListener('change', async (e) => {
    const topicId = e.target.value;
    if (topicId === 'NEW_TOPIC') {
      resetCreatorForm();
    } else {
      const topic = window.contentManager.getTopicById(topicId);
      if (topic) await loadTopicIntoForm(topic);
    }
  });

  // Editor Markdown: Previsualización y Sincronización en Tiempo Real
  const editorTextarea = document.getElementById('editorMarkdownTextarea');
  const editorPreview = document.getElementById('editorMarkdownPreview');

  editorTextarea?.addEventListener('input', () => {
    if (tempChapters[currentChapterIndex]) {
      tempChapters[currentChapterIndex].markdownContent = editorTextarea.value;
    }
    if (editorPreview) {
      editorPreview.innerHTML = window.contentManager.parseMarkdown(editorTextarea.value);
    }
  });

  // Escuchar cambios en los inputs del capítulo para actualizar tempChapters
  ['inputChapterTitle', 'inputChapterMdPath', 'inputVideoUrl', 'inputGameUrl', 'inputPdfUrl', 'inputLinkUrl'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', saveCurrentChapterFields);
  });

  // Selector de Capítulo Activo a Editar
  document.getElementById('selectActiveChapter')?.addEventListener('change', (e) => {
    saveCurrentChapterFields();
    currentChapterIndex = parseInt(e.target.value, 10);
    loadChapterFieldsIntoEditor(currentChapterIndex);
  });

  // Botón + Añadir Capítulo
  document.getElementById('btnAddChapter')?.addEventListener('click', () => {
    saveCurrentChapterFields();
    const newIdx = tempChapters.length + 1;
    tempChapters.push({
      id: `cap-${newIdx}`,
      title: `${newIdx}. Nuevo Capítulo`,
      markdownFile: `content/capitulo-${newIdx}.md`,
      markdownContent: `# Capítulo ${newIdx}\n\nEscribe el contenido aquí...`,
      videos: [], games: [], pdfs: [], links: []
    });
    currentChapterIndex = tempChapters.length - 1;
    updateChaptersUI();
    loadChapterFieldsIntoEditor(currentChapterIndex);
  });

  // Submit del Formulario
  document.getElementById('creatorTopicForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    saveCurrentChapterFields(); // Asegurar guardar los datos del último capítulo activo

    const topicId = selectTopicToEdit.value === 'NEW_TOPIC'
      ? document.getElementById('inputTopicTitle').value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      : selectTopicToEdit.value;

    const hidden = document.getElementById('checkTopicHidden').checked;

    // Formatear la lista de capítulos final
    const finalChapters = tempChapters.map((cap, idx) => {
      // Guardar contenido Markdown de cada capítulo en localStorage
      if (cap.markdownFile && cap.markdownContent) {
        window.contentManager.saveChapterMarkdown(cap.markdownFile, cap.markdownContent);
      }

      return {
        id: cap.id || `cap-${idx + 1}`,
        title: cap.title,
        markdownFile: cap.markdownFile,
        videos: cap.videos,
        games: cap.games,
        pdfs: cap.pdfs,
        links: cap.links
      };
    });

    const updatedTopic = {
      id: topicId,
      title: document.getElementById('inputTopicTitle').value.trim(),
      category: document.getElementById('inputTopicCategory').value,
      badge: document.getElementById('inputTopicBadge').value.trim(),
      summary: document.getElementById('inputTopicSummary').value.trim(),
      coverImage: document.getElementById('inputTopicCover').value.trim() || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
      hidden: hidden,
      chapters: finalChapters
    };

    window.contentManager.addOrUpdateTopic(updatedTopic);
    creatorModal.classList.remove('active');
    renderDashboard();

    if (confirm('Tema guardado correctamente. ¿Deseas exportar y descargar el archivo topics.json?')) {
      window.contentManager.exportTopicsJSON();
    }
  });

  // ==========================================================================
  // FUNCIONES AUXILIARES
  // ==========================================================================

  function renderDashboard() {
    const categories = window.contentManager.getCategories();
    const topics = window.contentManager.getTopics(state.currentCategory, state.searchQuery, state.isAdmin);

    window.UIComponents.renderCategoryBar(categories, state.currentCategory);
    window.UIComponents.renderTopicMatrix(topics, categories);
  }

  function showDashboard() {
    const readerView = document.getElementById('readerView');
    if (readerView) {
      readerView.classList.add('hidden');
      readerView.classList.remove('sidebar-collapsed'); // Restablece el sidebar
    }
    
    document.getElementById('dashboardView')?.classList.remove('hidden');
  
    const triggerBtn = document.getElementById('mobileChaptersTrigger');
    if (triggerBtn) triggerBtn.style.display = 'none';
    
    renderDashboard();
  }

  function openTopicReader(topicId, chapterIdx = 0, tab = 'article') {
    state.currentTopicId = topicId;
    state.currentChapterIdx = chapterIdx;
    state.currentTab = tab;

    const topic = window.contentManager.getTopicById(topicId);
    if (topic) {
      window.UIComponents.renderReaderView(topic, chapterIdx, tab);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function populateTopicSelectOptions() {
    const select = document.getElementById('selectTopicToEdit');
    if (!select) return;

    select.innerHTML = '<option value="NEW_TOPIC">+ Crear Un Nuevo Tema</option>';
    const allTopics = window.contentManager.getTopics('all', '', true);

    allTopics.forEach(t => {
      select.innerHTML += `<option value="${t.id}">Editar: ${t.title} ${t.hidden ? '(Oculto)' : ''}</option>`;
    });
  }

  function resetCreatorForm() {
    document.getElementById('creatorTopicForm').reset();
    tempChapters = [{
      id: 'cap-1',
      title: '1. Introducción General',
      markdownFile: 'content/nuevo-tema.md',
      markdownContent: '# Introducción\n\nEscribe el contenido en Markdown...',
      videos: [], games: [], pdfs: [], links: []
    }];
    currentChapterIndex = 0;
    updateChaptersUI();
    loadChapterFieldsIntoEditor(0);
  }

  async function loadTopicIntoForm(topic) {
    document.getElementById('inputTopicTitle').value = topic.title;
    document.getElementById('inputTopicCategory').value = topic.category;
    document.getElementById('inputTopicBadge').value = topic.badge || '';
    document.getElementById('inputTopicCover').value = topic.coverImage || '';
    document.getElementById('inputTopicSummary').value = topic.summary;
    document.getElementById('checkTopicHidden').checked = topic.hidden === true;

    // Clonar capítulos y cargar sus textos .md
    tempChapters = JSON.parse(JSON.stringify(topic.chapters || []));

    for (let cap of tempChapters) {
      cap.markdownContent = await window.contentManager.loadMarkdownContent(cap.markdownFile);
    }

    if (tempChapters.length === 0) {
      tempChapters.push({
        id: 'cap-1',
        title: '1. Introducción General',
        markdownFile: `content/${topic.id}.md`,
        markdownContent: '# Introducción',
        videos: [], games: [], pdfs: [], links: []
      });
    }

    currentChapterIndex = 0;
    updateChaptersUI();
    loadChapterFieldsIntoEditor(0);
  }

// 1. Guardar campos del capítulo activo SIN reconstruir el HTML del selector
  function saveCurrentChapterFields() {
    if (!tempChapters[currentChapterIndex]) return;

    const cap = tempChapters[currentChapterIndex];
    cap.title = document.getElementById('inputChapterTitle').value;
    cap.markdownFile = document.getElementById('inputChapterMdPath').value;

    const vUrl = document.getElementById('inputVideoUrl').value;
    const gUrl = document.getElementById('inputGameUrl').value;
    const pUrl = document.getElementById('inputPdfUrl').value;
    const lUrl = document.getElementById('inputLinkUrl').value;

    cap.videos = vUrl ? [{ title: 'Video Explicativo', url: vUrl }] : [];
    cap.games = gUrl ? [{ title: 'Simulación', embedUrl: gUrl }] : [];
    cap.pdfs = pUrl ? [{ title: 'Documento PDF', url: pUrl }] : [];
    cap.links = lUrl ? [{ title: 'Enlace', url: lUrl }] : [];

    // Actualizamos únicamente el texto visible en la lista superior sin tocar el <select>
    const listItemTitle = document.querySelector(`#chaptersList li[data-idx="${currentChapterIndex}"] .chap-display-title`);
    if (listItemTitle) {
      listItemTitle.textContent = `${currentChapterIndex + 1}. ${cap.title}`;
    }
  }

  // 2. Reconstruir UI (lista y select) solo al añadir, eliminar o cambiar de tema
  function updateChaptersUI() {
    const list = document.getElementById('chaptersList');
    const select = document.getElementById('selectActiveChapter');
    if (!list || !select) return;

    let listHtml = '';
    let selectHtml = '';

    tempChapters.forEach((cap, idx) => {
      listHtml += `
        <li data-idx="${idx}" style="display:flex; justify-content: space-between; align-items: center; background: var(--bg-surface); padding: 0.5rem 0.8rem; border-radius: var(--radius-sm); font-size: 0.88rem;">
          <span class="chap-display-title"><strong>${idx + 1}.</strong> ${cap.title} <small style="color:var(--text-muted);">(${cap.markdownFile})</small></span>
          ${tempChapters.length > 1 ? `<button type="button" onclick="removeChapter(${idx})" style="background:none; border:none; color:#ef4444; cursor:pointer;"><i class="bi bi-trash"></i></button>` : ''}
        </li>
      `;

      selectHtml += `<option value="${idx}" ${idx === currentChapterIndex ? 'selected' : ''}>Capítulo ${idx + 1}: ${cap.title}</option>`;
    });

    list.innerHTML = listHtml;
    select.innerHTML = selectHtml;
    select.value = currentChapterIndex;
  }

  // 3. Cargar los datos del capítulo seleccionado en el formulario
  function loadChapterFieldsIntoEditor(index) {
    const cap = tempChapters[index];
    if (!cap) return;

    document.getElementById('inputChapterTitle').value = cap.title || '';
    document.getElementById('inputChapterMdPath').value = cap.markdownFile || '';
    document.getElementById('inputVideoUrl').value = cap.videos?.[0]?.url || '';
    document.getElementById('inputGameUrl').value = cap.games?.[0]?.embedUrl || '';
    document.getElementById('inputPdfUrl').value = cap.pdfs?.[0]?.url || '';
    document.getElementById('inputLinkUrl').value = cap.links?.[0]?.url || '';

    const mdText = cap.markdownContent || '# Título\n\nContenido...';
    if (editorTextarea) editorTextarea.value = mdText;
    if (editorPreview) editorPreview.innerHTML = window.contentManager.parseMarkdown(mdText);
  }

  function updateThemeIcon(theme) {
    const btnTheme = document.getElementById('btnThemeToggle');
    if (btnTheme) {
      btnTheme.innerHTML = theme === 'dark' 
        ? '<i class="bi bi-sun-fill" style="color: #f59e0b;"></i>' 
        : '<i class="bi bi-moon-stars-fill" style="color: #6366f1;"></i>';
    }
  }

    // Ocultar Header al bajar / Mostrar al subir
  let lastScrollY = window.scrollY;
  const header = document.querySelector('.app-header');
  const delta = 10; // Margen de tolerancia para evitar parpadeos con scrolls mínimos

  window.addEventListener('scroll', () => {
    const currentScrollY = window.scrollY;

    // Si el desplazamiento es mínimo, no hacer nada
    if (Math.abs(lastScrollY - currentScrollY) <= delta) return;

    // Si escrolleas hacia abajo y pasaste la altura inicial del header, ocúltalo
    if (currentScrollY > lastScrollY && currentScrollY > 80) {
      header?.classList.add('header-hidden');
    } else {
      // Si escrolleas hacia arriba, muéstralo de nuevo
      header?.classList.remove('header-hidden');
    }

    lastScrollY = currentScrollY;
  });

});

// Manejo de expansión del buscador en móviles
const searchWrapper = document.querySelector('.search-bar-wrapper');
const searchInput = document.querySelector('.search-input');
const headerContainer = document.querySelector('.header-container');

if (searchInput && searchWrapper) {
  // Al enfocar el input, activamos la clase expandida
  searchInput.addEventListener('focus', () => {
    if (window.innerWidth <= 768) {
      searchWrapper.classList.add('expanded');
      headerContainer?.classList.add('search-active');
    }
  });

  // Al quitar el foco, volvemos al tamaño compacto
  searchInput.addEventListener('blur', () => {
    // Si no hay texto escrito, colapsa la barra
    if (!searchInput.value.trim()) {
      searchWrapper.classList.remove('expanded');
      headerContainer?.classList.remove('search-active');
    }
  });
}

// Registrar Service Worker para habilitar PWA instalable
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker registrado con éxito:', reg.scope))
      .catch(err => console.warn('Error al registrar Service Worker:', err));
  });
}