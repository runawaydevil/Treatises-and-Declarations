// Configuração dos documentos
const documents = [
    {
        title: 'Manifesto da Vida Real',
        path: 'servidao/manifestos/manifesto.md',
        section: 'Manifestos'
    },
    {
        title: 'Tratado Parte I',
        path: 'servidao/tratados/tratado_parte_i.md',
        section: 'Tratados'
    },
    {
        title: 'Tratado Parte II',
        path: 'servidao/tratados/tratado_parte_ii.md',
        section: 'Tratados'
    }
];

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

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    renderNavigation();
    loadDocument(documents[0].path);
    
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

// Renderizar navegação
function renderNavigation() {
    if (!navList) return;
    
    navList.innerHTML = '';
    
    const sections = {};
    documents.forEach(doc => {
        if (!sections[doc.section]) {
            sections[doc.section] = [];
        }
        sections[doc.section].push(doc);
    });
    
    Object.keys(sections).forEach(sectionName => {
        const sectionTitle = document.createElement('li');
        sectionTitle.className = 'nav-section';
        sectionTitle.textContent = sectionName;
        navList.appendChild(sectionTitle);
        
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
            navList.appendChild(listItem);
        });
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

// Tratamento de erros globais
window.addEventListener('error', (e) => {
    console.error('Erro global:', e);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Promise rejeitada:', e.reason);
});
