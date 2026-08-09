/**
 * WikiEdu Central - UI Components
 * Funciones de renderizado para Matriz de Inicio, Visor de Capítulo y Pestañas Multimedia.
 */

const UIComponents = {

  /**
   * Renderiza la barra de filtro por categorías
   */
  renderCategoryBar(categories, activeCategory = 'all') {
    const container = document.getElementById('categoryFilterBar');
    if (!container) return;

    let html = `
      <button class="category-pill ${activeCategory === 'all' ? 'active' : ''}" data-cat="all">
        <i class="bi bi-grid-3x2-gap-fill"></i> Todos los Temas
      </button>
    `;

  categories.forEach(cat => {
    const isActive = activeCategory === cat.id ? 'active' : '';
    html += `
      <button class="category-pill ${isActive}" data-cat="${cat.id}">
        <span class="material-symbols-outlined">${cat.icon}</span> ${cat.name}
      </button>
    `;
  });

    container.innerHTML = html;
  },

  /**
   * Renderiza la matriz de tarjetas de temas
   */
  renderTopicMatrix(topics, categories) {
    const container = document.getElementById('matrixGrid');
    const statsContainer = document.getElementById('statsGrid');
    if (!container) return;

    if (topics.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 4rem 1rem; color: var(--text-secondary);">
          <i class="bi bi-search" style="font-size: 3rem; color: var(--text-muted);"></i>
          <h3 style="margin-top: 1rem;">No se encontraron temas</h3>
          <p>Prueba con otros términos de búsqueda o agrega un nuevo tema con el botón superior.</p>
        </div>
      `;
      return;
    }

    // Actualizar contadores globales de la matriz
    if (statsContainer) {
      const totalChapters = topics.reduce((acc, t) => acc + (t.chapters ? t.chapters.length : 0), 0);
      let totalVideos = 0, totalGames = 0, totalPdfs = 0;
      
      topics.forEach(t => {
        t.chapters?.forEach(c => {
          totalVideos += c.videos?.length || 0;
          totalGames += c.games?.length || 0;
          totalPdfs += c.pdfs?.length || 0;
        });
      });

      statsContainer.innerHTML = `
        <div class="stat-chip"><i class="bi bi-journal-bookmark-fill"></i> <strong>${topics.length}</strong> Temas</div>
        <div class="stat-chip"><i class="bi bi-layers-fill"></i> <strong>${totalChapters}</strong> Capítulos</div>
        <div class="stat-chip"><i class="bi bi-play-btn-fill"></i> <strong>${totalVideos}</strong> Videos</div>
        <div class="stat-chip"><i class="bi bi-controller"></i> <strong>${totalGames}</strong> Juegos/Simuladores</div>
        <div class="stat-chip"><i class="bi bi-file-earmark-pdf-fill"></i> <strong>${totalPdfs}</strong> PDFs</div>
      `;
    }

    let html = '';
    topics.forEach(topic => {
      const catObj = categories.find(c => c.id === topic.category) || { name: topic.category, icon: 'bi-folder' };
      const chaptersCount = topic.chapters ? topic.chapters.length : 0;
      
      // Contar recursos multimedia del primer capítulo
      const firstCap = topic.chapters && topic.chapters[0];
      const videoCount = firstCap?.videos?.length || 0;
      const gameCount = firstCap?.games?.length || 0;
      const pdfCount = firstCap?.pdfs?.length || 0;
      const linkCount = firstCap?.links?.length || 0;

      // Distintivo de estado oculto
      const isHidden = topic.hidden === true;

      html += `
        <article class="topic-card fade-in" data-topic-id="${topic.id}">
          <div class="topic-cover-wrapper">
            <img src="${topic.coverImage || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80'}" 
                 alt="${topic.title}" class="topic-cover-img" loading="lazy">
            <div class="topic-cover-overlay"></div>
            ${topic.badge ? `<span class="topic-badge">${topic.badge}</span>` : ''}
            <div class="topic-category-tag">
              <span class="material-symbols-outlined">${catObj.icon}</span> ${catObj.name}
            </div>
          </div>
          <div class="topic-card-body">
            <h3 class="topic-title">${topic.title}</h3>
            <p class="topic-summary">${topic.summary}</p>
            
            <div class="topic-resources-pills">
              <span class="res-pill"><i class="bi bi-file-text"></i> Artículo</span>
              ${videoCount > 0 ? `<span class="res-pill"><i class="bi bi-play-circle"></i> ${videoCount} Video${videoCount > 1 ? 's' : ''}</span>` : ''}
              ${gameCount > 0 ? `<span class="res-pill"><i class="bi bi-controller"></i> ${gameCount} Juego${gameCount > 1 ? 's' : ''}</span>` : ''}
              ${pdfCount > 0 ? `<span class="res-pill"><i class="bi bi-file-pdf"></i> ${pdfCount} PDF${pdfCount > 1 ? 's' : ''}</span>` : ''}
              ${linkCount > 0 ? `<span class="res-pill"><i class="bi bi-link-45deg"></i> ${linkCount} Enlace${linkCount > 1 ? 's' : ''}</span>` : ''}
            </div>

            <div class="topic-card-footer">
              <span class="chapter-count"><i class="bi bi-book"></i> ${chaptersCount} Capítulo${chaptersCount !== 1 ? 's' : ''}</span>
              <span style="color: var(--accent-cyan); font-weight: 600;">Explorar <i class="bi bi-arrow-right"></i></span>
            </div>
          </div>
        </article>
      `;
    });

    container.innerHTML = html;
  },

  /**
   * Renderiza el visor de lectura con navegación por capítulos y pestañas multimedia
   */
  async renderReaderView(topic, chapterIndex = 0, activeTab = 'article') {
    const mainView = document.getElementById('dashboardView');
    const readerView = document.getElementById('readerView');
    
    if (!mainView || !readerView) return;

    mainView.classList.add('hidden');
    readerView.classList.remove('hidden');

    const currentChapter = topic.chapters && topic.chapters[chapterIndex] ? topic.chapters[chapterIndex] : {
      title: 'Capítulo Inicial',
      markdownFile: '',
      videos: [],
      games: [],
      pdfs: [],
      links: []
    };

    // Renderizar barra lateral de capítulos
    const sidebarContainer = document.getElementById('readerSidebar');
    if (sidebarContainer) {
      let capNavHtml = '';
      topic.chapters.forEach((cap, idx) => {
        const isActive = idx === chapterIndex ? 'active' : '';
        capNavHtml += `
          <li class="chapter-nav-item ${isActive}" data-chapter-idx="${idx}">
            <i class="bi ${isActive ? 'bi-journal-richtext' : 'bi-journal-text'}"></i>
            <span>${cap.title}</span>
          </li>
        `;
      });

      sidebarContainer.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div class="btn-back" id="btnBackToMatrix" style="margin-bottom:0;">
            <i class="bi bi-arrow-left"></i> Volver
          </div>
          <button class="btn-close d-md-none" id="btnCloseMobileDrawer" style="font-size: 1.2rem;">&times;</button>
        </div>
        <h3 class="topic-header-title" style="margin-top:0.75rem;">${topic.title}</h3>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.75rem;">${topic.summary}</p>
        <div style="font-size: 0.78rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; letter-spacing: 0.05em; margin-bottom: 0.5rem;">Capítulos</div>
        <ul class="chapter-nav-list" id="chapterNavList">
          ${capNavHtml}
        </ul>
      `;

      // Insertar botón flotante y capa oscura si no existen en el DOM
      if (!document.getElementById('mobileChaptersTrigger')) {
        const triggerBtn = document.createElement('button');
        triggerBtn.id = 'mobileChaptersTrigger';
        triggerBtn.className = 'mobile-chapters-trigger';
        triggerBtn.innerHTML = '<i class="bi bi-list-nested"></i> Capítulos';
        document.body.appendChild(triggerBtn);
      }

      if (!document.getElementById('mobileDrawerOverlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'mobileDrawerOverlay';
        overlay.className = 'mobile-drawer-overlay';
        document.body.appendChild(overlay);
      }
    }

    // Renderizar Pestañas Multimedia
    const tabsContainer = document.getElementById('multimediaTabs');
    if (tabsContainer) {
      const vCount = currentChapter.videos?.length || 0;
      const gCount = currentChapter.games?.length || 0;
      const pCount = currentChapter.pdfs?.length || 0;
      const lCount = currentChapter.links?.length || 0;

      tabsContainer.innerHTML = `
        <button class="mm-tab-btn ${activeTab === 'article' ? 'active' : ''}" data-tab="article">
          <i class="bi bi-file-text-fill"></i> Artículo principal
        </button>
        <button class="mm-tab-btn ${activeTab === 'videos' ? 'active' : ''}" data-tab="videos">
          <i class="bi bi-youtube"></i> Videos (${vCount})
        </button>
        <button class="mm-tab-btn ${activeTab === 'games' ? 'active' : ''}" data-tab="games">
          <i class="bi bi-controller"></i> Juegos y Simuladores (${gCount})
        </button>
        <button class="mm-tab-btn ${activeTab === 'pdfs' ? 'active' : ''}" data-tab="pdfs">
          <i class="bi bi-file-earmark-pdf-fill"></i> Visor PDF (${pCount})
        </button>
        <button class="mm-tab-btn ${activeTab === 'links' ? 'active' : ''}" data-tab="links">
          <i class="bi bi-link-45deg"></i> Enlaces (${lCount})
        </button>
      `;
    }

    // Renderizar el contenido correspondiente a la pestaña activa
    const contentArea = document.getElementById('tabContentArea');
    if (!contentArea) return;

    contentArea.innerHTML = '<div style="text-align:center; padding:3rem;"><i class="bi bi-arrow-repeat spin" style="font-size:2rem; color:var(--accent-cyan);"></i><p>Cargando recurso...</p></div>';

    if (activeTab === 'article') {
      const mdText = await window.contentManager.loadMarkdownContent(currentChapter.markdownFile);
      const parsedHtml = window.contentManager.parseMarkdown(mdText);
      contentArea.innerHTML = `<div class="markdown-body fade-in">${parsedHtml}</div>`;
      this.postProcessMarkdownView(contentArea);
    } else if (activeTab === 'videos') {
      contentArea.innerHTML = this.renderVideosTab(currentChapter.videos);
    } else if (activeTab === 'games') {
      contentArea.innerHTML = this.renderGamesTab(currentChapter.games);
    } else if (activeTab === 'pdfs') {
      contentArea.innerHTML = this.renderPdfsTab(currentChapter.pdfs);
    } else if (activeTab === 'links') {
      contentArea.innerHTML = this.renderLinksTab(currentChapter.links);
    }
  },

  /**
   * Postprocesamiento de renderizado Markdown (Mermaid, Enlaces de Sección y Archivos Relativos)
   */
  postProcessMarkdownView(container) {
    if (!container) return;

    // 1. Renderizar Diagramas Mermaid si la librería está disponible
    if (typeof mermaid !== 'undefined') {
      const mermaidNodes = container.querySelectorAll('.mermaid');
      if (mermaidNodes.length > 0) {
        try {
          mermaid.run({ nodes: mermaidNodes });
        } catch (e) {
          console.error('Error al renderizar diagramas Mermaid:', e);
        }
      }
    }

    // 2. Delegación de eventos para Enlaces de Sección (#Sección-1) y Archivos Relativos (.md)
    container.addEventListener('click', async (e) => {
      const link = e.target.closest('a');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href) return;

      // Caso A: Enlaces de Sección Internos (ej: #Sección-1 o #sección-1)
      if (href.startsWith('#') && !href.startsWith('#fn') && !href.startsWith('#fnref')) {
        e.preventDefault();
        const rawTarget = href.substring(1);
        const targetSlug = rawTarget.toLowerCase().replace(/\s+/g, '-');
        
        // Buscar por id exacto, slug o data-raw-id
        let targetElem = container.querySelector(`#${CSS.escape(rawTarget)}`) ||
                         container.querySelector(`#${CSS.escape(targetSlug)}`) ||
                         container.querySelector(`[data-raw-id="${CSS.escape(rawTarget)}"]`);
        
        if (targetElem) {
          targetElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
      
      // Caso B: Enlaces de Archivos Relativos (.md)
      else if (href.endsWith('.md') || href.includes('.md#')) {
        e.preventDefault();
        const [filePath, hash] = href.split('#');
        
        container.innerHTML = '<div style="text-align:center; padding:3rem;"><i class="bi bi-arrow-repeat spin" style="font-size:2rem; color:var(--accent-cyan);"></i><p>Cargando artículo vinculado...</p></div>';
        
        const newMdText = await window.contentManager.loadMarkdownContent(filePath);
        const newParsedHtml = window.contentManager.parseMarkdown(newMdText);
        container.innerHTML = `<div class="markdown-body fade-in">${newParsedHtml}</div>`;
        this.postProcessMarkdownView(container);
        
        if (hash) {
          setTimeout(() => {
            const hashElem = container.querySelector(`#${CSS.escape(hash.toLowerCase())}`) || container.querySelector(`[data-raw-id="${CSS.escape(hash)}"]`);
            if (hashElem) hashElem.scrollIntoView({ behavior: 'smooth' });
          }, 150);
        }
      }
    });
  },

  renderVideosTab(videos) {
    if (!videos || videos.length === 0) {
      return `
        <div style="text-align: center; padding: 4rem 1rem; color: var(--text-secondary);">
          <i class="bi bi-camera-video-off" style="font-size: 3rem; color: var(--text-muted);"></i>
          <h3 style="margin-top: 1rem;">No hay videos vinculados a este capítulo</h3>
          <p>Puedes agregar URLs de YouTube o Vimeo editando este tema desde el creador.</p>
        </div>
      `;
    }

    let html = '<div class="video-grid fade-in">';
    videos.forEach(v => {
      html += `
        <div class="video-card">
          <div class="iframe-responsive">
            <iframe src="${v.url}" title="${v.title}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
          </div>
          <div class="video-card-info">
            <h4 class="video-card-title">${v.title}</h4>
            <p class="video-card-desc">${v.description || ''}</p>
            ${v.duration ? `<span class="res-pill" style="margin-top:0.5rem;"><i class="bi bi-clock"></i> ${v.duration}</span>` : ''}
          </div>
        </div>
      `;
    });
    html += '</div>';
    return html;
  },

  renderGamesTab(games) {
    if (!games || games.length === 0) {
      return `
        <div style="text-align: center; padding: 4rem 1rem; color: var(--text-secondary);">
          <i class="bi bi-joystick" style="font-size: 3rem; color: var(--text-muted);"></i>
          <h3 style="margin-top: 1rem;">No hay juegos o simulaciones interactivas</h3>
          <p>Agrega iFrames de PhET, Scratch u otros juegos educativos en HTML5.</p>
        </div>
      `;
    }

    let html = '<div class="media-container fade-in">';
    games.forEach((g, idx) => {
      html += `
        <div class="game-viewport">
          <div style="padding: 1rem; background: var(--bg-surface); border-bottom: 1px solid var(--border-color); display:flex; justify-between: space-between; align-items: center;">
            <div>
              <h4 style="font-size:1.1rem; color:var(--text-primary);"><i class="bi bi-controller" style="color:var(--accent-cyan);"></i> ${g.title}</h4>
              <p style="font-size:0.85rem; color:var(--text-secondary);">${g.description || ''}</p>
            </div>
            <button class="btn-icon btn-fullscreen-game" data-iframe-id="gameIframe_${idx}" title="Pantalla Completa">
              <i class="bi bi-arrows-fullscreen"></i>
            </button>
          </div>
          <div class="game-iframe-wrapper">
            <iframe id="gameIframe_${idx}" src="${g.embedUrl}" title="${g.title}" allowfullscreen></iframe>
          </div>
        </div>
      `;
    });
    html += '</div>';
    return html;
  },

  renderPdfsTab(pdfs) {
    if (!pdfs || pdfs.length === 0) {
      return `
        <div style="text-align: center; padding: 4rem 1rem; color: var(--text-secondary);">
          <i class="bi bi-file-earmark-x" style="font-size: 3rem; color: var(--text-muted);"></i>
          <h3 style="margin-top: 1rem;">No se adjuntaron documentos PDF</h3>
          <p>Puedes vincular enlaces directos a guías en formato PDF.</p>
        </div>
      `;
    }

    let html = '<div class="media-container fade-in">';
    pdfs.forEach(pdf => {
      html += `
        <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.25rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem;">
            <div>
              <h4 style="font-size:1.15rem; color:var(--text-primary);"><i class="bi bi-file-earmark-pdf-fill" style="color:var(--accent-rose);"></i> ${pdf.title}</h4>
              <p style="font-size:0.88rem; color:var(--text-secondary);">${pdf.description || ''}</p>
            </div>
            <a href="${pdf.url}" target="_blank" rel="noopener" class="btn-primary" style="padding:0.4rem 1rem; font-size:0.85rem;">
              <i class="bi bi-box-arrow-up-right"></i> Abrir PDF Externo
            </a>
          </div>
          <div class="pdf-viewport">
            <iframe src="${pdf.url}" type="application/pdf"></iframe>
          </div>
        </div>
      `;
    });
    html += '</div>';
    return html;
  },

  renderLinksTab(links) {
    if (!links || links.length === 0) {
      return `
        <div style="text-align: center; padding: 4rem 1rem; color: var(--text-secondary);">
          <i class="bi bi-link-45deg" style="font-size: 3rem; color: var(--text-muted);"></i>
          <h3 style="margin-top: 1rem;">No hay enlaces externos guardados</h3>
        </div>
      `;
    }

    let html = '<div class="links-grid fade-in">';
    links.forEach(l => {
      html += `
        <div class="link-card">
          <div>
            <span class="res-pill" style="margin-bottom:0.6rem;"><i class="bi bi-globe"></i> ${l.siteName || 'Web Externa'}</span>
            <h4 style="font-size:1.05rem; margin-bottom:0.4rem; color:var(--text-primary);">${l.title}</h4>
            <p style="font-size:0.88rem; color:var(--text-secondary);">${l.description || ''}</p>
          </div>
          <a href="${l.url}" target="_blank" rel="noopener" class="btn-primary" style="text-align:center; justify-content:center;">
            Visitar Sitio Web <i class="bi bi-box-arrow-up-right"></i>
          </a>
        </div>
      `;
    });
    html += '</div>';
    return html;
  }
};

window.UIComponents = UIComponents;
