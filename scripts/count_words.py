#!/usr/bin/env python3
"""
Script para contar palavras nos documentos e estimar páginas de um pocket book
"""

import os
import re
from pathlib import Path

# Configurações para estimativa de páginas
WORDS_PER_PAGE_POCKET = 280  # Média de palavras por página em pocket book (fonte normal, ~10pt)
WORDS_PER_PAGE_STANDARD = 350  # Média para livro padrão (referência)

def clean_markdown(text):
    """Remove sintaxe markdown para contar apenas palavras reais"""
    # Remove headers
    text = re.sub(r'^#+\s+', '', text, flags=re.MULTILINE)
    # Remove bold/italic
    text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)
    text = re.sub(r'\*([^*]+)\*', r'\1', text)
    # Remove links [text](url)
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)
    # Remove imagens ![alt](url)
    text = re.sub(r'!\[([^\]]*)\]\([^\)]+\)', '', text)
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Remove código inline
    text = re.sub(r'`[^`]+`', '', text)
    # Remove blocos de código
    text = re.sub(r'```[\s\S]*?```', '', text)
    # Remove linhas horizontais
    text = re.sub(r'^---+$', '', text, flags=re.MULTILINE)
    # Remove blockquotes
    text = re.sub(r'^>\s+', '', text, flags=re.MULTILINE)
    # Remove list markers
    text = re.sub(r'^\s*[-*+]\s+', '', text, flags=re.MULTILINE)
    text = re.sub(r'^\s*\d+\.\s+', '', text, flags=re.MULTILINE)
    # Remove múltiplos espaços
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def count_words_in_file(file_path):
    """Conta palavras em um arquivo markdown"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Remove metadados do início (autor e data)
        lines = content.split('\n')
        cleaned_lines = []
        skip_metadata = False
        
        for i, line in enumerate(lines):
            # Pula linhas de metadados (autor e data)
            if line.strip().startswith('**') and ('PBLMRD' in line or 'de' in line.lower()):
                continue
            if line.strip() == '---':
                if i < 5:  # Se está no início do arquivo
                    continue
            cleaned_lines.append(line)
        
        cleaned_content = '\n'.join(cleaned_lines)
        cleaned_text = clean_markdown(cleaned_content)
        
        # Conta palavras (separadas por espaços)
        words = cleaned_text.split()
        return len([w for w in words if w.strip()])
    
    except Exception as e:
        print(f"Erro ao processar {file_path}: {e}")
        return 0

def scan_documents(base_path, folder_name):
    """Escaneia todos os documentos em uma pasta"""
    documents = []
    folder_path = Path(base_path) / folder_name
    folder_path = folder_path.resolve()
    
    if not folder_path.exists():
        print(f"Aviso: Pasta {folder_path} não encontrada!")
        return documents
    
    for md_file in folder_path.rglob('*.md'):
        if any(part.startswith('.') for part in md_file.parts):
            continue
        
        relative_path = md_file.relative_to(folder_path)
        # Adiciona o nome da pasta ao caminho relativo
        full_relative_path = f"{folder_name}/{relative_path}"
        word_count = count_words_in_file(md_file)
        
        documents.append({
            'path': str(full_relative_path),
            'words': word_count,
            'pages_pocket': round(word_count / WORDS_PER_PAGE_POCKET, 1),
            'pages_standard': round(word_count / WORDS_PER_PAGE_STANDARD, 1)
        })
    
    return documents

def main():
    """Função principal"""
    script_dir = Path(__file__).parent.parent.resolve()
    
    print("=" * 70)
    print("CONTAGEM DE PALAVRAS - OBRA VIVA")
    print("=" * 70)
    print()
    
    # Escaneia servidao/
    servidao_docs = scan_documents(script_dir, 'servidao')
    
    # Escaneia cartas/
    cartas_docs = scan_documents(script_dir, 'cartas')
    
    # Combina todos os documentos
    documents = servidao_docs + cartas_docs
    
    if not documents:
        print("Nenhum arquivo .md encontrado")
        return
    
    # Ordena por caminho
    documents.sort(key=lambda x: x['path'])
    
    total_words = 0
    total_pages_pocket = 0
    total_pages_standard = 0
    
    print("DOCUMENTOS INDIVIDUAIS:")
    print("-" * 70)
    print(f"{'Documento':<50} {'Palavras':>10} {'Páginas':>10}")
    print("-" * 70)
    
    for doc in documents:
        total_words += doc['words']
        total_pages_pocket += doc['pages_pocket']
        total_pages_standard += doc['pages_standard']
        
        # Trunca nome do arquivo se muito longo
        display_name = doc['path']
        if len(display_name) > 47:
            display_name = '...' + display_name[-44:]
        
        print(f"{display_name:<50} {doc['words']:>10,} {doc['pages_pocket']:>9.1f}")
    
    print("-" * 70)
    print()
    print("=" * 70)
    print("TOTAIS")
    print("=" * 70)
    print(f"Total de palavras: {total_words:,}")
    print(f"Total de documentos: {len(documents)}")
    print()
    print("ESTIMATIVA DE PÁGINAS:")
    print(f"  Pocket Book (fonte normal, ~280 palavras/página): {total_pages_pocket:.1f} páginas")
    print(f"  Livro Padrão (referência, ~350 palavras/página): {total_pages_standard:.1f} páginas")
    print()
    print("=" * 70)

if __name__ == '__main__':
    main()
