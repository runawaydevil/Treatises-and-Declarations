#!/usr/bin/env python3
"""
Script para gerar documents.json a partir dos arquivos .md em servidao/
"""

import os
import json
import re
from pathlib import Path

def extract_title_from_markdown(file_path):
    """Extrai o título do primeiro # do arquivo markdown"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            first_line = f.readline().strip()
            # Remove # e espaços do início
            if first_line.startswith('#'):
                title = re.sub(r'^#+\s*', '', first_line).strip()
                if title:
                    return title
    except Exception as e:
        print(f"Erro ao ler {file_path}: {e}")
    
    # Fallback: usa o nome do arquivo (sem extensão, capitalizado)
    filename = Path(file_path).stem
    # Capitaliza primeira letra de cada palavra
    return ' '.join(word.capitalize() for word in filename.replace('_', ' ').replace('-', ' ').split())

def get_section_name(file_path, servidao_path):
    """Obtém o nome da seção baseado na pasta pai dentro de servidao/"""
    relative_path = os.path.relpath(file_path, servidao_path)
    path_parts = Path(relative_path).parts
    
    if len(path_parts) > 1:
        # Pega o nome da pasta pai (primeira pasta dentro de servidao/)
        section = path_parts[0]
    else:
        # Se estiver diretamente em servidao/, usa "Documentos"
        section = "Documentos"
    
    # Capitaliza primeira letra de cada palavra
    return ' '.join(word.capitalize() for word in section.replace('_', ' ').replace('-', ' ').split())

def scan_markdown_files(servidao_path, base_path):
    """Escaneia recursivamente a pasta servidao/ e encontra todos os .md"""
    documents = []
    servidao_path = Path(servidao_path).resolve()
    base_path = Path(base_path).resolve()
    
    if not servidao_path.exists():
        print(f"Erro: Pasta {servidao_path} não encontrada!")
        return documents
    
    # Escaneia recursivamente
    for md_file in servidao_path.rglob('*.md'):
        # Ignora arquivos em pastas ocultas (começam com .)
        if any(part.startswith('.') for part in md_file.parts):
            continue
        
        # Calcula caminho relativo ao diretório base
        try:
            relative_path = str(md_file.relative_to(base_path))
        except ValueError:
            # Se não conseguir calcular relativo, usa o caminho absoluto
            relative_path = str(md_file)
        
        title = extract_title_from_markdown(md_file)
        section = get_section_name(md_file, servidao_path)
        
        documents.append({
            'title': title,
            'path': relative_path.replace('\\', '/'),  # Normaliza para /
            'section': section
        })
    
    # Ordena por seção e depois por título
    documents.sort(key=lambda x: (x['section'], x['title']))
    
    return documents

def main():
    """Função principal"""
    # Obtém o diretório onde o script está sendo executado
    script_dir = Path(__file__).parent.parent.resolve()
    os.chdir(script_dir)  # Muda para o diretório do projeto
    
    servidao_path = script_dir / 'servidao'
    output_file = script_dir / 'documents.json'
    
    print(f"Escaneando arquivos .md em {servidao_path}...")
    documents = scan_markdown_files(servidao_path, script_dir)
    
    if not documents:
        print("Nenhum arquivo .md encontrado em servidao/")
        return
    
    print(f"Encontrados {len(documents)} documento(s):")
    for doc in documents:
        print(f"  - [{doc['section']}] {doc['title']} ({doc['path']})")
    
    # Escreve o JSON
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(documents, f, ensure_ascii=False, indent=2)
    
    print(f"\n[OK] documents.json gerado com sucesso em {output_file}")

if __name__ == '__main__':
    main()
