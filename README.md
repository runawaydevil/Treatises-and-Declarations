# Tratados e Declarações

> **⚠️ Trabalho em andamento**  
> Este repositório contém textos em constante desenvolvimento e atualização.

---

Site minimalista para publicação de textos filosóficos sobre a servidão voluntária às imagens, o culto aos falsos deuses digitais e a transformação da vida em espetáculo.

## Sobre o Projeto

Este é um site estático desenvolvido para exibir textos filosóficos de forma limpa e focada na leitura. O projeto utiliza HTML, CSS e JavaScript vanilla, sem dependências de frameworks, e é hospedado no GitHub Pages.

### Características

- **Interface minimalista**: Design limpo com foco na leitura
- **Navegação hierárquica**: Menus colapsáveis organizados por seções
- **Responsivo**: Funciona perfeitamente em desktop, tablet e mobile
- **SEO otimizado**: Meta tags dinâmicas, structured data e sitemap
- **RSS Feed**: Feed XML para acompanhar atualizações
- **Performance**: Carregamento rápido sem dependências externas pesadas

### Comportamento dos Menus

**Todos os menus iniciam fechados (colapsados) por padrão.** O usuário pode expandir/colapsar manualmente clicando nos títulos das seções. O estado dos menus é salvo no navegador (localStorage) para manter as preferências durante a navegação.

## Estrutura de Conteúdo

### Das vaidades

Textos que examinam a servidão voluntária, a idolatria moderna e a economia da atenção:

- **Manifestos**: Declarações sobre a vida real e a resistência ao espetáculo
- **Tratados**: Análises sistemáticas em seis partes sobre a servidão voluntária às imagens
- **Ensaios**: Reflexões sobre desaceleração demográfica, emburrecimento e tolerância
- **Confissões**: Testemunhos pessoais sobre a busca por autenticidade
- **Zeitgeist**: Referências e links sobre cultura digital, economia da atenção e soberania

### Cartas para Pablo

Correspondências que atravessam décadas, capturando momentos, ideias e conversas:

- **Insane Letters**: Cartas diversas que documentam pensamentos, observações e diálogos sobre os mais variados temas

## Referências Filosóficas

Debord, Bauman, Foucault, Schopenhauer, Kierkegaard, Kant, Nietzsche, Jung.

## Tese Central

A sociedade contemporânea substituiu o ser pelo parecer. A vida virou representação, o amor virou performance, a moral virou acessório. A servidão não foi abolida; foi modernizada. O chicote virou dopamina, o senhor virou algoritmo, a cela virou feed.

E essa servidão é voluntária. O indivíduo escolhe as correntes e ainda agradece.

## Scripts Disponíveis

O projeto inclui scripts Python para gerenciar o conteúdo:

- **`scripts/generate_documents.py`**: Gera `documents.json` a partir dos arquivos Markdown, extraindo metadados e organizando por seções
- **`scripts/generate_rss.py`**: Gera feed RSS em `feeds/feed.xml`
- **`scripts/generate_sitemap.py`**: Gera `sitemap.xml` para SEO
- **`scripts/count_words.py`**: Conta palavras nos documentos e estima páginas para publicação

### Como Usar os Scripts

```bash
# Gerar documents.json (executar após adicionar/editar documentos)
python scripts/generate_documents.py

# Gerar feed RSS
python scripts/generate_rss.py

# Gerar sitemap
python scripts/generate_sitemap.py

# Contar palavras
python scripts/count_words.py
```

## Estrutura Técnica

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Markdown**: Renderização client-side com Marked.js
- **Hospedagem**: GitHub Pages
- **Build**: Scripts Python para geração de metadados

## Desenvolvimento

Para trabalhar localmente:

1. Clone o repositório
2. Execute os scripts de geração conforme necessário
3. Abra `index.html` em um navegador ou use um servidor local

---

> "Tudo o que vemos ou transparecemos  
> É nada além de um sonho dentro de um sonho."  
> *Edgar Allan Poe*
