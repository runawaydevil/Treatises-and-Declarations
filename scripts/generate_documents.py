#!/usr/bin/env python3
"""
Script para gerar documents.json a partir dos arquivos .md em servidao/
"""

import os
import json
import re
from pathlib import Path

# Mapeamento de numerais romanos para números
ROMAN_NUMERALS = {
    'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5,
    'vi': 6, 'vii': 7, 'viii': 8, 'ix': 9, 'x': 10,
    'xi': 11, 'xii': 12, 'xiii': 13, 'xiv': 14, 'xv': 15,
    'xvi': 16, 'xvii': 17, 'xviii': 18, 'xix': 19, 'xx': 20
}

def roman_to_int(roman_str):
    """Converte numeral romano (string) para inteiro"""
    roman_lower = roman_str.lower().strip()
    return ROMAN_NUMERALS.get(roman_lower, 999)  # Retorna 999 se não encontrar (vai para o final)

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

def get_sort_key(doc, file_path=None):
    """Gera chave de ordenação que trata numerais romanos corretamente"""
    section = doc['section']
    title = doc['title']
    path = doc.get('path', '')
    
    # Tenta extrair numeral romano do nome do arquivo primeiro
    sort_num = 999  # Valor padrão alto para ir ao final
    
    if file_path:
        filename = Path(file_path).stem.lower()
        # Procura por padrões como "parte_i", "parte_ii", "parte_iii", etc.
        match = re.search(r'parte[_\s]+([ivxlcdm]+)', filename)
        if match:
            sort_num = roman_to_int(match.group(1))
        else:
            # Tenta encontrar qualquer numeral romano no nome
            match = re.search(r'[_\s]([ivxlcdm]+)[_\s]', filename)
            if match:
                sort_num = roman_to_int(match.group(1))
    
    # Se não encontrou no arquivo, tenta no título
    if sort_num == 999:
        # Procura por padrões como "PARTE I", "PARTE II", "IV", etc. no título
        match = re.search(r'(?:PARTE|Parte|parte)[\s]+([IVXLCDM]+)', title)
        if match:
            sort_num = roman_to_int(match.group(1).lower())
        else:
            # Tenta encontrar numeral romano isolado no início ou meio do título
            match = re.search(r'\b([IVXLCDM]+)\b', title)
            if match:
                sort_num = roman_to_int(match.group(1).lower())
    
    return (section, sort_num, title)

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
        
        doc = {
            'title': title,
            'path': relative_path.replace('\\', '/'),  # Normaliza para /
            'section': section,
            '_file_path': str(md_file)  # Guarda caminho para ordenação
        }
        documents.append(doc)
    
    # Ordena por seção, depois por numeral romano (convertido), depois por título
    documents.sort(key=lambda x: get_sort_key(x, x.get('_file_path')))
    
    # Remove o campo auxiliar antes de retornar
    for doc in documents:
        doc.pop('_file_path', None)
    
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
