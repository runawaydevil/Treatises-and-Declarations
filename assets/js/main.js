// Configuração dos documentos (carregada dinamicamente)
let documents = [];

// Configurações de menus por pasta principal
let menuConfigs = {};

// Estado da aplicação
let currentDocument = null;
let overlay = null;

// Elementos DOM
const navList = document.getElementById('navList');
const markdownContent = document.getElementById('markdownContent');
const loading = document.getElementById('loading');
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menuToggle');

// Verificar se é mobile (usando media query para ser mais preciso)
let mobileMediaQuery = null;
function isMobile() {
    if (!mobileMediaQuery) {
        mobileMediaQuery = window.matchMedia('(max-width: 768px)');
    }
    return mobileMediaQuery.matches;
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
    
    // Usar touchstart e click para melhor compatibilidade mobile
    overlay.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeSidebar();
    });
    overlay.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeSidebar();
    });
    
    document.body.appendChild(overlay);
    return overlay;
}

// Abrir sidebar
function openSidebar() {
    if (!sidebar) return;
    
    sidebar.classList.add('open');
    if (menuToggle) {
        menuToggle.classList.add('active');
    }
    
    if (isMobile()) {
        const overlayEl = createOverlay();
        overlayEl.style.display = 'block';
        // Força reflow antes de mudar opacity
        overlayEl.offsetHeight;
        setTimeout(() => {
            overlayEl.style.opacity = '1';
        }, 10);
        document.body.style.overflow = 'hidden';
    }
}

// Fechar sidebar
function closeSidebar() {
    if (!sidebar) return;
    
    sidebar.classList.remove('open');
    if (menuToggle) {
        menuToggle.classList.remove('active');
    }
    
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => {
            if (overlay) {
                overlay.style.display = 'none';
            }
        }, 300);
    }
    document.body.style.overflow = '';
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

// Carregar configurações de menu de uma pasta principal
async function loadMenuConfig(folderPath) {
    try {
        const configPath = `${folderPath}/sections.json`;
        const response = await fetch(configPath);
        
        if (!response.ok) {
            // Se não encontrar, retorna null (usará nomes padrão)
            return null;
        }
        
        const config = await response.json();
        return config;
    } catch (error) {
        // Em caso de erro, retorna null (usará nomes padrão)
        console.warn(`Não foi possível carregar ${folderPath}/sections.json:`, error);
        return null;
    }
}

// Detectar pastas principais a partir dos documentos
function detectMainFolders(docs) {
    const folders = new Set();
    
    docs.forEach(doc => {
        // Ignora home.md e documentos na raiz
        if (doc.path.includes('/') && doc.section !== 'Início') {
            // Extrai a pasta principal (primeira parte do caminho)
            const parts = doc.path.split('/');
            if (parts.length > 1) {
                folders.add(parts[0]);
            }
        }
    });
    
    return Array.from(folders);
}

// Carregar todas as configurações de menu
async function loadAllMenuConfigs() {
    menuConfigs = {};
    
    // Detecta pastas principais dos documentos
    const mainFolders = detectMainFolders(documents);
    
    // Carrega configuração de cada pasta
    for (const folder of mainFolders) {
        const config = await loadMenuConfig(folder);
        if (config) {
            menuConfigs[folder] = config;
        }
    }
}

// Obter nome de exibição de uma seção
function getSectionDisplayName(folderName, sectionName) {
    // sectionName já vem normalizado (lowercase)
    // Tenta encontrar no menuConfigs
    if (menuConfigs[folderName] && menuConfigs[folderName].sections) {
        // Procura pela chave no JSON (que também está em lowercase)
        if (menuConfigs[folderName].sections[sectionName]) {
            return menuConfigs[folderName].sections[sectionName];
        }
    }
    
    // Fallback: capitaliza o nome da seção
    return sectionName.charAt(0).toUpperCase() + sectionName.slice(1);
}

// Obter nome do menu principal de uma pasta
function getMainMenuName(folderName) {
    if (menuConfigs[folderName] && menuConfigs[folderName].mainMenuName) {
        return menuConfigs[folderName].mainMenuName;
    }
    
    // Fallback: capitaliza o nome da pasta
    return folderName.charAt(0).toUpperCase() + folderName.slice(1).toLowerCase();
}

// Obter ordem das seções de uma pasta
function getSectionOrder(folderName) {
    if (menuConfigs[folderName] && menuConfigs[folderName].order) {
        return menuConfigs[folderName].order;
    }
    
    return null; // Sem ordem definida, usa ordem natural
}

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
        
        // Carrega configurações de menu após carregar documentos
        await loadAllMenuConfigs();
        
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
    
    // Carregar estado dos filtros
    loadFilterState();
    
    // Configurar filtros
    setupFilters();
    
    // Renderizar navegação
    renderNavigation();
    
    // Carregar home.md automaticamente se existir, senão carrega o primeiro documento
    const homeDoc = documents.find(doc => doc.path === 'home.md' || doc.section === 'Início');
    if (homeDoc) {
        loadDocument(homeDoc.path);
    } else if (documents.length > 0) {
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
    
    // Fechar menu ao clicar fora (mobile) - melhorado para não interferir com links
    document.addEventListener('click', (e) => {
        if (isMobile() && sidebar && sidebar.classList.contains('open')) {
            // Não fechar se clicou na sidebar ou no menu toggle
            if (sidebar.contains(e.target) || (menuToggle && menuToggle.contains(e.target))) {
                return;
            }
            // Não fechar se clicou em um link de navegação (deixa o handler do link fechar)
            if (e.target.closest('.nav-link')) {
                return;
            }
            closeSidebar();
        }
    });
    
    // Fechar menu ao redimensionar para desktop
    function handleResize() {
        if (!isMobile() && sidebar && sidebar.classList.contains('open')) {
            closeSidebar();
        }
    }
    window.addEventListener('resize', handleResize);
    
    // Atualizar media query quando resize acontece
    if (window.matchMedia) {
        const mq = window.matchMedia('(max-width: 768px)');
        mq.addEventListener('change', () => {
            handleResize();
        });
    }
    
    // Prevenir scroll do body quando menu está aberto no mobile
    // O overflow: hidden no body já faz isso, mas garantimos aqui também
    if (sidebar) {
        // Permitir scroll dentro da sidebar
        sidebar.addEventListener('touchmove', (e) => {
            // Deixa o scroll da sidebar funcionar normalmente
        }, { passive: true });
    }
});

// Estado das seções colapsadas
const collapsedSections = new Set();

// Estado dos filtros
let activeFilters = {
    tags: []
};

// Carregar estado das seções do localStorage
function loadSectionState() {
    try {
        const saved = localStorage.getItem('collapsedSections');
        if (saved) {
            const sections = JSON.parse(saved);
            sections.forEach(section => collapsedSections.add(section));
        } else {
            // Se não há estado salvo, inicia tudo colapsado por padrão
            // Isso será preenchido durante a renderização
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
    // Tenta encontrar por data-section (seções principais) ou data-subsection (subseções)
    let sectionElement = document.querySelector(`[data-section="${sectionName}"]`);
    if (!sectionElement) {
        sectionElement = document.querySelector(`[data-subsection="${sectionName}"]`);
    }
    
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

// Aplicar filtros aos documentos
function applyFilters(docs) {
    let filtered = [...docs];
    
    // Filtro por tags
    if (activeFilters.tags.length > 0) {
        filtered = filtered.filter(doc => {
            const docTags = doc.tags || [];
            return activeFilters.tags.some(tag => docTags.includes(tag));
        });
    }
    
    return filtered;
}

// Coletar todas as tags únicas
function getAllTags() {
    const tagsSet = new Set();
    documents.forEach(doc => {
        if (doc.tags && Array.isArray(doc.tags)) {
            doc.tags.forEach(tag => tagsSet.add(tag));
        }
    });
    return Array.from(tagsSet).sort();
}

// Renderizar filtros de tags
function renderTagFilters() {
    const filtersContainer = document.getElementById('filtersContainer');
    const tagsFilter = document.getElementById('tagsFilter');
    
    if (!filtersContainer || !tagsFilter) return;
    
    const allTags = getAllTags();
    
    if (allTags.length === 0) {
        filtersContainer.style.display = 'none';
        return;
    }
    
    filtersContainer.style.display = 'block';
    tagsFilter.innerHTML = '';
    
    allTags.forEach(tag => {
        const label = document.createElement('label');
        label.className = 'tag-checkbox';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = tag;
        checkbox.checked = activeFilters.tags.includes(tag);
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                if (!activeFilters.tags.includes(tag)) {
                    activeFilters.tags.push(tag);
                }
            } else {
                activeFilters.tags = activeFilters.tags.filter(t => t !== tag);
            }
            saveFilterState();
            renderNavigation();
        });
        
        const span = document.createElement('span');
        span.textContent = tag;
        
        label.appendChild(checkbox);
        label.appendChild(span);
        tagsFilter.appendChild(label);
    });
}

// Salvar estado dos filtros
function saveFilterState() {
    try {
        localStorage.setItem('activeFilters', JSON.stringify(activeFilters));
    } catch (e) {
        console.error('Erro ao salvar estado dos filtros:', e);
    }
}

// Carregar estado dos filtros
function loadFilterState() {
    try {
        const saved = localStorage.getItem('activeFilters');
        if (saved) {
            activeFilters = JSON.parse(saved);
        }
    } catch (e) {
        console.error('Erro ao carregar estado dos filtros:', e);
    }
}

// Configurar event listeners dos filtros
function setupFilters() {
    renderTagFilters();
}

// Renderizar navegação
function renderNavigation() {
    if (!navList) return;
    
    navList.innerHTML = '';
    
    // Carregar estado salvo
    loadSectionState();
    
    // Aplicar filtros
    const filteredDocuments = applyFilters(documents);
    
    // Separar home.md (seção "Início") dos outros documentos
    const homeDocs = filteredDocuments.filter(doc => doc.section === 'Início');
    const otherDocs = filteredDocuments.filter(doc => doc.section !== 'Início');
    
    // Adicionar link para página inicial (home.md) se existir
    if (homeDocs.length > 0) {
        const homeDoc = homeDocs[0];
        const homeItem = document.createElement('li');
        homeItem.className = 'nav-item';
        
        const homeLink = document.createElement('a');
        homeLink.href = '#';
        homeLink.className = 'nav-link';
        homeLink.textContent = 'Início';
        homeLink.dataset.path = homeDoc.path;
        
        homeLink.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            loadDocument(homeDoc.path);
            updateActiveLink(homeLink);
            if (isMobile()) {
                setTimeout(() => {
                    closeSidebar();
                }, 100);
            }
        });
        
        homeLink.addEventListener('touchstart', (e) => {
            e.stopPropagation();
        });
        
        homeItem.appendChild(homeLink);
        navList.appendChild(homeItem);
    }
    
    // Agrupar documentos por pasta principal
    const foldersMap = {};
    
    otherDocs.forEach(doc => {
        // Extrai a pasta principal do caminho
        const pathParts = doc.path.split('/');
        if (pathParts.length > 1) {
            const folderName = pathParts[0];
            const sectionName = doc.section.toLowerCase(); // Normaliza para comparação
            
            if (!foldersMap[folderName]) {
                foldersMap[folderName] = {};
            }
            
            if (!foldersMap[folderName][sectionName]) {
                foldersMap[folderName][sectionName] = [];
            }
            
            foldersMap[folderName][sectionName].push(doc);
        }
    });
    
    // Verificar se há estado salvo
    const hasSavedState = localStorage.getItem('collapsedSections') !== null;
    
    // Criar menu para cada pasta principal
    Object.keys(foldersMap).forEach(folderName => {
        const folderSections = foldersMap[folderName];
        const mainMenuName = getMainMenuName(folderName);
        const sectionOrder = getSectionOrder(folderName);
        
        // Se não há estado salvo, adiciona o menu principal como colapsado
        if (!hasSavedState) {
            collapsedSections.add(mainMenuName);
        }
        
        // Determina ordem das seções
        let orderedSections = [];
        if (sectionOrder) {
            // Usa ordem do JSON, filtrando apenas seções que existem
            // sectionOrder vem com chaves em lowercase (ex: "manifestos")
            orderedSections = sectionOrder.filter(sectionKey => {
                const normalized = sectionKey.toLowerCase();
                return folderSections[normalized] && folderSections[normalized].length > 0;
            });
            // Adiciona seções que não estão no JSON (se houver)
            Object.keys(folderSections).forEach(section => {
                // Verifica se a seção já está na lista ordenada (comparando lowercase)
                const alreadyIncluded = orderedSections.some(ordered => 
                    ordered.toLowerCase() === section.toLowerCase()
                );
                if (!alreadyIncluded) {
                    orderedSections.push(section);
                }
            });
        } else {
            // Sem ordem definida, usa ordem natural
            orderedSections = Object.keys(folderSections);
        }
        
        // Container do menu principal
        const mainMenuContainer = document.createElement('li');
        mainMenuContainer.className = 'nav-section-container';
        
        // Título do menu principal (clicável)
        const mainMenuTitle = document.createElement('div');
        mainMenuTitle.className = 'nav-section';
        mainMenuTitle.dataset.section = mainMenuName;
        mainMenuTitle.style.cursor = 'pointer';
        
        // Ícone de toggle
        const toggleIcon = document.createElement('span');
        toggleIcon.className = 'section-toggle-icon';
        toggleIcon.textContent = collapsedSections.has(mainMenuName) ? '▶' : '▼';
        
        // Texto do menu principal
        const mainMenuText = document.createElement('span');
        mainMenuText.textContent = mainMenuName;
        
        mainMenuTitle.appendChild(toggleIcon);
        mainMenuTitle.appendChild(mainMenuText);
        
        // Event listener para toggle
        mainMenuTitle.addEventListener('click', () => {
            toggleSection(mainMenuName);
        });
        
        // Container para subseções
        const mainMenuContent = document.createElement('ul');
        mainMenuContent.className = 'nav-section-list';
        mainMenuContent.dataset.sectionContent = mainMenuName;
        mainMenuContent.style.display = collapsedSections.has(mainMenuName) ? 'none' : 'block';
        
        // Criar subseções dentro do menu principal
        orderedSections.forEach(sectionKey => {
            const normalizedSection = sectionKey.toLowerCase();
            const sectionDocs = folderSections[normalizedSection];
            
            if (!sectionDocs || sectionDocs.length === 0) return;
            
            const sectionDisplayName = getSectionDisplayName(folderName, normalizedSection);
            
            const subSectionContainer = document.createElement('li');
            subSectionContainer.className = 'nav-subsection-container';
            
            // Título da subseção (clicável)
            const subSectionTitle = document.createElement('div');
            subSectionTitle.className = 'nav-subsection';
            subSectionTitle.dataset.subsection = sectionDisplayName;
            subSectionTitle.style.cursor = 'pointer';
            
            // Ícone de toggle da subseção
            const subToggleIcon = document.createElement('span');
            subToggleIcon.className = 'section-toggle-icon';
            subToggleIcon.textContent = collapsedSections.has(sectionDisplayName) ? '▶' : '▼';
            
            // Texto da subseção
            const subSectionText = document.createElement('span');
            subSectionText.textContent = sectionDisplayName;
            
            subSectionTitle.appendChild(subToggleIcon);
            subSectionTitle.appendChild(subSectionText);
            
            // Event listener para toggle da subseção
            subSectionTitle.addEventListener('click', () => {
                toggleSection(sectionDisplayName);
            });
            
            // Lista de documentos da subseção
            const subSectionList = document.createElement('ul');
            subSectionList.className = 'nav-subsection-list';
            subSectionList.dataset.sectionContent = sectionDisplayName;
            subSectionList.style.display = collapsedSections.has(sectionDisplayName) ? 'none' : 'block';
            
            sectionDocs.forEach(doc => {
                const listItem = document.createElement('li');
                listItem.className = 'nav-item';
                
                const link = document.createElement('a');
                link.href = '#';
                link.className = 'nav-link';
                link.textContent = doc.title;
                link.dataset.path = doc.path;
                
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    loadDocument(doc.path);
                    updateActiveLink(link);
                    if (isMobile()) {
                        setTimeout(() => {
                            closeSidebar();
                        }, 100);
                    }
                });
                
                link.addEventListener('touchstart', (e) => {
                    e.stopPropagation();
                });
                
                listItem.appendChild(link);
                subSectionList.appendChild(listItem);
            });
            
            subSectionContainer.appendChild(subSectionTitle);
            subSectionContainer.appendChild(subSectionList);
            mainMenuContent.appendChild(subSectionContainer);
        });
        
        mainMenuContainer.appendChild(mainMenuTitle);
        mainMenuContainer.appendChild(mainMenuContent);
        navList.appendChild(mainMenuContainer);
    });
    
    // Se não havia estado salvo, salva o estado inicial (tudo colapsado)
    if (!hasSavedState) {
        saveSectionState();
    }
}

// Atualizar link ativo
function updateActiveLink(activeLink) {
    const allLinks = document.querySelectorAll('.nav-link');
    allLinks.forEach(link => link.classList.remove('active'));
    activeLink.classList.add('active');
}

// Remover front matter YAML do markdown
function removeYamlFrontmatter(markdown) {
    if (!markdown.startsWith('---')) {
        return markdown;
    }
    
    // Encontra o fim do front matter
    const endIndex = markdown.indexOf('---', 3);
    if (endIndex === -1) {
        return markdown;
    }
    
    // Remove o front matter e retorna o resto
    return markdown.substring(endIndex + 3).trim();
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
        
        let markdown = await response.text();
        
        // Remove front matter YAML antes de renderizar
        markdown = removeYamlFrontmatter(markdown);
        
        const html = marked.parse(markdown);
        
        // Extrair título do markdown (após remover front matter)
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
            "name": "PM"
        },
        "publisher": {
            "@type": "Person",
            "name": "PM"
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
