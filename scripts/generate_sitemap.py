#!/usr/bin/env python3
"""
Script para gerar sitemap.xml a partir dos documentos em documents.json
"""

import os
import json
from pathlib import Path
from datetime import datetime
import xml.etree.ElementTree as ET

def get_priority_for_section(section):
    """Retorna prioridade baseada no tipo de seção"""
    priorities = {
        'Início': 1.0,
        'Manifestos': 0.9,
        'Tratados': 0.8,
        'Ensaios': 0.8,
        'Confissoes': 0.7,
        'Zeitgeist': 0.6,
        'random': 0.7  # Cartas
    }
    return priorities.get(section, 0.7)

def get_change_frequency(section):
    """Retorna frequência de atualização baseada no tipo de seção"""
    frequencies = {
        'Início': 'weekly',
        'Manifestos': 'monthly',
        'Tratados': 'monthly',
        'Ensaios': 'monthly',
        'Confissoes': 'monthly',
        'Zeitgeist': 'weekly',
        'random': 'weekly'  # Cartas
    }
    return frequencies.get(section, 'monthly')

def get_lastmod_from_file(file_path):
    """Obtém data de última modificação do arquivo"""
    try:
        if os.path.exists(file_path):
            mtime = os.path.getmtime(file_path)
            return datetime.fromtimestamp(mtime).strftime('%Y-%m-%d')
    except Exception:
        pass
    return None

def generate_sitemap(documents, output_file, base_url):
    """Gera sitemap.xml a partir dos documentos"""
    # Criar elemento raiz
    urlset = ET.Element('urlset')
    urlset.set('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9')
    
    # Adicionar URL da homepage
    url_elem = ET.SubElement(urlset, 'url')
    ET.SubElement(url_elem, 'loc').text = base_url.rstrip('/')
    ET.SubElement(url_elem, 'lastmod').text = datetime.now().strftime('%Y-%m-%d')
    ET.SubElement(url_elem, 'changefreq').text = 'weekly'
    ET.SubElement(url_elem, 'priority').text = '1.0'
    
    # Adicionar URLs dos documentos
    for doc in documents:
        url_elem = ET.SubElement(urlset, 'url')
        
        # Construir URL completa
        if doc['path'] == 'home.md':
            url = base_url.rstrip('/')
        else:
            # Para documentos, usar hash route
            url = f"{base_url.rstrip('/')}/#/{doc['path']}"
        
        ET.SubElement(url_elem, 'loc').text = url
        
        # Data de última modificação
        lastmod = doc.get('date')
        if not lastmod:
            # Tentar obter do arquivo
            file_path = Path(doc['path'])
            if file_path.exists():
                lastmod = get_lastmod_from_file(str(file_path))
        
        if lastmod:
            # Garantir formato YYYY-MM-DD
            try:
                if isinstance(lastmod, str):
                    # Tentar parsear diferentes formatos
                    if len(lastmod) == 10:  # YYYY-MM-DD
                        ET.SubElement(url_elem, 'lastmod').text = lastmod
                    else:
                        # Tentar converter
                        parsed_date = datetime.strptime(lastmod, '%Y-%m-%d')
                        ET.SubElement(url_elem, 'lastmod').text = parsed_date.strftime('%Y-%m-%d')
                else:
                    ET.SubElement(url_elem, 'lastmod').text = datetime.now().strftime('%Y-%m-%d')
            except Exception:
                ET.SubElement(url_elem, 'lastmod').text = datetime.now().strftime('%Y-%m-%d')
        else:
            ET.SubElement(url_elem, 'lastmod').text = datetime.now().strftime('%Y-%m-%d')
        
        # Frequência de atualização
        section = doc.get('section', '')
        changefreq = get_change_frequency(section)
        ET.SubElement(url_elem, 'changefreq').text = changefreq
        
        # Prioridade
        priority = get_priority_for_section(section)
        ET.SubElement(url_elem, 'priority').text = str(priority)
    
    # Criar árvore XML e escrever
    tree = ET.ElementTree(urlset)
    ET.indent(tree, space='  ')
    tree.write(output_file, encoding='utf-8', xml_declaration=True)
    
    print(f"[OK] sitemap.xml gerado com sucesso em {output_file}")
    print(f"     Total de URLs: {len(documents) + 1}")

def main():
    script_dir = Path(__file__).parent.parent.resolve()
    os.chdir(script_dir)
    
    documents_file = script_dir / 'documents.json'
    output_file = script_dir / 'sitemap.xml'
    base_url = 'https://runawaydevil.github.io/Treatises-and-Declarations/'
    
    if not documents_file.exists():
        print(f"Erro: {documents_file} não encontrado!")
        return
    
    print(f"Lendo {documents_file}...")
    with open(documents_file, 'r', encoding='utf-8') as f:
        documents = json.load(f)
    
    print(f"Encontrados {len(documents)} documentos")
    print(f"Gerando sitemap.xml...")
    
    generate_sitemap(documents, output_file, base_url)

if __name__ == '__main__':
    main()
