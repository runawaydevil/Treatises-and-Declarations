// Configuração dos documentos (carregada dinamicamente)
let documents = [];

// Estado da aplicação
let currentDocument = null;
let overlay = null;

// Elementos DOM
const navList = document.getElementById('navList');
const markdownContent = document.getElementById('markdownContent');
const loading = document.getElementById('loading');
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menuToggle');

// Verificar se é mobile
function isMobile() {
    return window.innerWidth <= 768;
}

// Criar overlay
function createOverlay() {
    if (overlay) return overlay;
    
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.4);
        z-index: 99;
        display: none;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    
    overlay.addEventListener('click', () => {
        closeSidebar();
    });
    
    document.body.appendChild(overlay);
    return overlay;
}

// Abrir sidebar
function openSidebar() {
    if (sidebar) {
        sidebar.classList.add('open');
        if (isMobile()) {
            const overlayEl = createOverlay();
            overlayEl.style.display = 'block';
            setTimeout(() => {
                overlayEl.style.opacity = '1';
            }, 10);
            document.body.style.overflow = 'hidden';
        }
    }
}

// Fechar sidebar
function closeSidebar() {
    if (sidebar) {
        sidebar.classList.remove('open');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 300);
        }
        document.body.style.overflow = '';
    }
}

// Toggle sidebar
function toggleSidebar() {
    if (sidebar && sidebar.classList.contains('open')) {
        closeSidebar();
    } else {
        openSidebar();
    }
}

// Configurar marked.js
marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: false,
    mangle: false
});

// Carregar documentos do JSON
async function loadDocuments() {
    try {
        const response = await fetch('documents.json');
        
        if (!response.ok) {
            throw new Error(`Erro ao carregar documents.json: ${response.status} ${response.statusText}`);
        }
        
        documents = await response.json();
        
        if (!Array.isArray(documents) || documents.length === 0) {
            throw new Error('documents.json está vazio ou inválido');
        }
        
        return true;
    } catch (error) {
        console.error('Erro ao carregar documentos:', error);
        
        // Mostrar erro na interface
        if (markdownContent) {
            markdownContent.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <h2>Erro ao carregar documentos</h2>
                    <p style="margin-top: 1rem; color: #666;">${error.message}</p>
                    <p style="margin-top: 1rem; font-size: 0.9rem; color: #999;">
                        Execute o script generate_documents.py para gerar o arquivo documents.json
                    </p>
                </div>
            `;
            markdownContent.style.display = 'block';
        }
        
        if (loading) {
            loading.style.display = 'none';
        }
        
        return false;
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    // Carregar documentos primeiro
    const loaded = await loadDocuments();
    
    if (!loaded) {
        return; // Para aqui se não conseguiu carregar
    }
    
    // Renderizar navegação e carregar primeiro documento
    renderNavigation();
    if (documents.length > 0) {
        // Expandir seção do primeiro documento
        const firstDoc = documents[0];
        if (collapsedSections.has(firstDoc.section)) {
            toggleSection(firstDoc.section);
        }
        loadDocument(documents[0].path);
    }
    
    // Menu toggle para mobile
    if (menuToggle) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSidebar();
        });
    }
    
    // Fechar menu ao clicar fora (mobile)
    document.addEventListener('click', (e) => {
        if (isMobile() && sidebar && sidebar.classList.contains('open')) {
            if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                closeSidebar();
            }
        }
    });
    
    // Fechar menu ao redimensionar para desktop
    window.addEventListener('resize', () => {
        if (!isMobile() && sidebar && sidebar.classList.contains('open')) {
            closeSidebar();
        }
    });
    
    // Prevenir scroll quando menu está aberto no mobile
    if (sidebar) {
        sidebar.addEventListener('touchmove', (e) => {
            if (isMobile() && sidebar.classList.contains('open')) {
                // Permitir scroll apenas dentro do sidebar
                if (e.target === sidebar || sidebar.contains(e.target)) {
                    return;
                }
                e.preventDefault();
            }
        }, { passive: false });
    }
});

// Estado das seções colapsadas
const collapsedSections = new Set();

// Carregar estado das seções do localStorage
function loadSectionState() {
    try {
        const saved = localStorage.getItem('collapsedSections');
        if (saved) {
            const sections = JSON.parse(saved);
            sections.forEach(section => collapsedSections.add(section));
        }
    } catch (e) {
        console.error('Erro ao carregar estado das seções:', e);
    }
}

// Salvar estado das seções no localStorage
function saveSectionState() {
    try {
        localStorage.setItem('collapsedSections', JSON.stringify(Array.from(collapsedSections)));
    } catch (e) {
        console.error('Erro ao salvar estado das seções:', e);
    }
}

// Toggle seção
function toggleSection(sectionName) {
    if (collapsedSections.has(sectionName)) {
        collapsedSections.delete(sectionName);
    } else {
        collapsedSections.add(sectionName);
    }
    saveSectionState();
    updateSectionUI(sectionName);
}

// Atualizar UI da seção
function updateSectionUI(sectionName) {
    const sectionElement = document.querySelector(`[data-section="${sectionName}"]`);
    const sectionContent = document.querySelector(`[data-section-content="${sectionName}"]`);
    const toggleIcon = sectionElement?.querySelector('.section-toggle-icon');
    
    if (!sectionElement || !sectionContent) return;
    
    const isCollapsed = collapsedSections.has(sectionName);
    
    if (isCollapsed) {
        sectionContent.style.display = 'none';
        if (toggleIcon) {
            toggleIcon.textContent = '▶';
            toggleIcon.style.transform = 'rotate(0deg)';
        }
        sectionElement.classList.add('collapsed');
    } else {
        sectionContent.style.display = 'block';
        if (toggleIcon) {
            toggleIcon.textContent = '▼';
            toggleIcon.style.transform = 'rotate(0deg)';
        }
        sectionElement.classList.remove('collapsed');
    }
}

// Renderizar navegação
function renderNavigation() {
    if (!navList) return;
    
    navList.innerHTML = '';
    
    // Carregar estado salvo
    loadSectionState();
    
    const sections = {};
    documents.forEach(doc => {
        if (!sections[doc.section]) {
            sections[doc.section] = [];
        }
        sections[doc.section].push(doc);
    });
    
    Object.keys(sections).forEach(sectionName => {
        // Container da seção
        const sectionContainer = document.createElement('li');
        sectionContainer.className = 'nav-section-container';
        
        // Título da seção (clicável)
        const sectionTitle = document.createElement('div');
        sectionTitle.className = 'nav-section';
        sectionTitle.dataset.section = sectionName;
        sectionTitle.style.cursor = 'pointer';
        
        // Ícone de toggle
        const toggleIcon = document.createElement('span');
        toggleIcon.className = 'section-toggle-icon';
        toggleIcon.textContent = collapsedSections.has(sectionName) ? '▶' : '▼';
        
        // Texto da seção
        const sectionText = document.createElement('span');
        sectionText.textContent = sectionName;
        
        sectionTitle.appendChild(toggleIcon);
        sectionTitle.appendChild(sectionText);
        
        // Event listener para toggle
        sectionTitle.addEventListener('click', () => {
            toggleSection(sectionName);
        });
        
        // Lista de documentos da seção
        const sectionList = document.createElement('ul');
        sectionList.className = 'nav-section-list';
        sectionList.dataset.sectionContent = sectionName;
        sectionList.style.display = collapsedSections.has(sectionName) ? 'none' : 'block';
        
        sections[sectionName].forEach(doc => {
            const listItem = document.createElement('li');
            listItem.className = 'nav-item';
            
            const link = document.createElement('a');
            link.href = '#';
            link.className = 'nav-link';
            link.textContent = doc.title;
            link.dataset.path = doc.path;
            
            link.addEventListener('click', (e) => {
                e.preventDefault();
                loadDocument(doc.path);
                updateActiveLink(link);
                // Fechar menu no mobile após seleção
                if (isMobile()) {
                    closeSidebar();
                }
            });
            
            listItem.appendChild(link);
            sectionList.appendChild(listItem);
        });
        
        sectionContainer.appendChild(sectionTitle);
        sectionContainer.appendChild(sectionList);
        navList.appendChild(sectionContainer);
    });
}

// Atualizar link ativo
function updateActiveLink(activeLink) {
    const allLinks = document.querySelectorAll('.nav-link');
    allLinks.forEach(link => link.classList.remove('active'));
    activeLink.classList.add('active');
}

// Carregar e renderizar documento
async function loadDocument(path) {
    if (currentDocument === path) return;
    
    currentDocument = path;
    
    // Mostrar loading
    if (loading) {
        loading.style.display = 'block';
    }
    if (markdownContent) {
        markdownContent.style.display = 'none';
    }
    
    try {
        const response = await fetch(path);
        
        if (!response.ok) {
            throw new Error(`Erro ao carregar: ${response.status} ${response.statusText}`);
        }
        
        const markdown = await response.text();
        const html = marked.parse(markdown);
        
        // Extrair título do markdown
        const titleMatch = markdown.match(/^#+\s*(.+)$/m);
        const docTitle = titleMatch ? titleMatch[1].trim() : 'Tratados e Declarações';
        
        // Extrair descrição (primeiras linhas)
        const lines = markdown.split('\n').filter(line => {
            line = line.trim();
            return line && !line.startsWith('#') && !line.startsWith('*') && !line.startsWith('---');
        });
        const description = lines.slice(0, 3).join(' ').substring(0, 200) || 'Documento filosófico sobre servidão voluntária e cultura digital.';
        
        // Atualizar JSON-LD dinâmico
        updateStructuredData(docTitle, description, path);
        
        // Atualizar título da página
        document.title = `${docTitle} | Tratados e Declarações`;
        
        if (markdownContent) {
            markdownContent.innerHTML = html;
            markdownContent.style.display = 'block';
        }
        
        if (loading) {
            loading.style.display = 'none';
        }
        
        // Scroll para o topo
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Atualizar link ativo
        const activeLink = document.querySelector(`[data-path="${path}"]`);
        if (activeLink) {
            updateActiveLink(activeLink);
        }
        
    } catch (error) {
        console.error('Erro ao carregar documento:', error);
        
        if (markdownContent) {
            markdownContent.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <h2>Erro ao carregar documento</h2>
                    <p style="margin-top: 1rem; color: #666;">${error.message}</p>
                    <p style="margin-top: 1rem; font-size: 0.9rem; color: #999;">
                        Verifique se o arquivo existe no caminho: ${path}
                    </p>
                </div>
            `;
            markdownContent.style.display = 'block';
        }
        
        if (loading) {
            loading.style.display = 'none';
        }
    }
}

// Atualizar Structured Data (JSON-LD) dinamicamente
function updateStructuredData(title, description, path) {
    // Remove JSON-LD existente
    const existingScript = document.querySelector('script[type="application/ld+json"]');
    if (existingScript && existingScript.id === 'dynamic-structured-data') {
        existingScript.remove();
    }
    
    const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '');
    const fullUrl = `${baseUrl}/${path}`;
    
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": title,
        "description": description,
        "url": fullUrl,
        "author": {
            "@type": "Person",
            "name": "Pablo Murad"
        },
        "publisher": {
            "@type": "Person",
            "name": "Pablo Murad"
        },
        "inLanguage": "pt-BR",
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": fullUrl
        }
    };
    
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'dynamic-structured-data';
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);
}

// Tratamento de erros globais
window.addEventListener('error', (e) => {
    console.error('Erro global:', e);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Promise rejeitada:', e.reason);
});
