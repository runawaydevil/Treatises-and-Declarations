#!/usr/bin/env python3
"""
Script para gerar feed.xml (RSS) a partir dos arquivos .md em servidao/
"""

import os
import json
import re
from pathlib import Path
from datetime import datetime
import time
import xml.etree.ElementTree as ET

def extract_title_from_markdown(file_path):
    """Extrai o título do primeiro # do arquivo markdown"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            first_line = f.readline().strip()
            if first_line.startswith('#'):
                title = re.sub(r'^#+\s*', '', first_line).strip()
                if title:
                    return title
    except Exception as e:
        print(f"Erro ao ler {file_path}: {e}")
    
    filename = Path(file_path).stem
    return ' '.join(word.capitalize() for word in filename.replace('_', ' ').replace('-', ' ').split())

def extract_date_from_markdown(file_path):
    """Extrai data do arquivo markdown ou usa data de modificação"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            # Procura por padrão de data: **Pablo Murad**\n**DD de mês de YYYY**
            date_match = re.search(r'\*\*.*?\*\*\s*\n\*\*(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})\*\*', content)
            if date_match:
                day, month, year = date_match.groups()
                month_map = {
                    'janeiro': '01', 'fevereiro': '02', 'março': '03', 'abril': '04',
                    'maio': '05', 'junho': '06', 'julho': '07', 'agosto': '08',
                    'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12'
                }
                month_num = month_map.get(month.lower(), '01')
                return datetime(int(year), int(month_num), int(day))
    except Exception as e:
        print(f"Erro ao extrair data de {file_path}: {e}")
    
    # Fallback: usa data de modificação do arquivo
    mtime = os.path.getmtime(file_path)
    return datetime.fromtimestamp(mtime)

def extract_description_from_markdown(file_path):
    """Extrai primeiras linhas do markdown como descrição"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = []
            skip_header = True
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                if skip_header and ('**' in line or '---' in line):
                    continue
                skip_header = False
                if line and not line.startswith('*') and not line.startswith('-'):
                    lines.append(line)
                    if len(lines) >= 3:
                        break
            
            description = ' '.join(lines)
            # Remove markdown formatting básico
            description = re.sub(r'\*\*([^*]+)\*\*', r'\1', description)
            description = re.sub(r'#+\s*', '', description)
            if len(description) > 200:
                description = description[:200] + '...'
            return description if description else "Documento filosófico sobre servidão voluntária e cultura digital."
    except Exception as e:
        print(f"Erro ao extrair descrição de {file_path}: {e}")
    
    return "Documento filosófico sobre servidão voluntária e cultura digital."

def scan_markdown_files(servidao_path, base_path):
    """Escaneia recursivamente a pasta servidao/ e encontra todos os .md"""
    documents = []
    servidao_path = Path(servidao_path).resolve()
    base_path = Path(base_path).resolve()
    
    if not servidao_path.exists():
        print(f"Erro: Pasta {servidao_path} não encontrada!")
        return documents
    
    for md_file in servidao_path.rglob('*.md'):
        if any(part.startswith('.') for part in md_file.parts):
            continue
        
        try:
            relative_path = str(md_file.relative_to(base_path))
        except ValueError:
            relative_path = str(md_file)
        
        title = extract_title_from_markdown(md_file)
        date = extract_date_from_markdown(md_file)
        description = extract_description_from_markdown(md_file)
        path = relative_path.replace('\\', '/')
        
        documents.append({
            'title': title,
            'path': path,
            'date': date,
            'description': description
        })
    
    # Ordena por data (mais recente primeiro)
    documents.sort(key=lambda x: x['date'], reverse=True)
    
    return documents

def generate_rss_feed(documents, output_file, base_url):
    """Gera arquivo RSS 2.0"""
    rss = ET.Element('rss', version='2.0')
    rss.set('xmlns:atom', 'http://www.w3.org/2005/Atom')
    
    channel = ET.SubElement(rss, 'channel')
    
    # Informações do canal
    ET.SubElement(channel, 'title').text = 'Tratados e Declarações'
    ET.SubElement(channel, 'link').text = base_url
    ET.SubElement(channel, 'description').text = 'Textos filosóficos sobre a servidão voluntária às imagens, o culto aos falsos deuses digitais e a transformação da vida em espetáculo na era contemporânea.'
    ET.SubElement(channel, 'language').text = 'pt-BR'
    # Formata data com timezone (RSS requer formato RFC 822)
    now = datetime.now()
    # Converte para UTC e formata
    timestamp = time.mktime(now.timetuple())
    utc_time = time.gmtime(timestamp)
    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    last_build = f"{days[utc_time.tm_wday]}, {utc_time.tm_mday:02d} {months[utc_time.tm_mon-1]} {utc_time.tm_year} {utc_time.tm_hour:02d}:{utc_time.tm_min:02d}:{utc_time.tm_sec:02d} +0000"
    ET.SubElement(channel, 'lastBuildDate').text = last_build
    ET.SubElement(channel, 'generator').text = 'generate_rss.py'
    
    # Link atom
    atom_link = ET.SubElement(channel, 'atom:link')
    atom_link.set('href', f'{base_url}/feeds/feed.xml')
    atom_link.set('rel', 'self')
    atom_link.set('type', 'application/rss+xml')
    
    # Items
    for doc in documents:
        item = ET.SubElement(channel, 'item')
        ET.SubElement(item, 'title').text = doc['title']
        ET.SubElement(item, 'link').text = f"{base_url}/{doc['path']}"
        ET.SubElement(item, 'description').text = doc['description']
        # Formata data com timezone (RSS requer formato RFC 822)
        date = doc['date']
        timestamp = time.mktime(date.timetuple())
        utc_time = time.gmtime(timestamp)
        months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        pub_date = f"{days[utc_time.tm_wday]}, {utc_time.tm_mday:02d} {months[utc_time.tm_mon-1]} {utc_time.tm_year} {utc_time.tm_hour:02d}:{utc_time.tm_min:02d}:{utc_time.tm_sec:02d} +0000"
        ET.SubElement(item, 'pubDate').text = pub_date
        ET.SubElement(item, 'guid', isPermaLink='false').text = f"{base_url}/{doc['path']}"
    
    # Escreve o XML
    tree = ET.ElementTree(rss)
    ET.indent(tree, space='  ')
    tree.write(output_file, encoding='utf-8', xml_declaration=True)

def main():
    """Função principal"""
    script_dir = Path(__file__).parent.parent.resolve()
    os.chdir(script_dir)
    
    servidao_path = script_dir / 'servidao'
    feeds_dir = script_dir / 'feeds'
    feeds_dir.mkdir(exist_ok=True)  # Cria a pasta se não existir
    output_file = feeds_dir / 'feed.xml'
    base_url = 'https://runawaydevil.github.io/Treatises-and-Declarations'
    
    print(f"Escaneando arquivos .md em {servidao_path}...")
    documents = scan_markdown_files(servidao_path, script_dir)
    
    if not documents:
        print("Nenhum arquivo .md encontrado em servidao/")
        return
    
    print(f"Encontrados {len(documents)} documento(s) para o feed RSS")
    
    generate_rss_feed(documents, output_file, base_url)
    
    print(f"\n[OK] feed.xml gerado com sucesso em {output_file}")

if __name__ == '__main__':
    main()
