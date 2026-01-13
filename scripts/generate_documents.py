#!/usr/bin/env python3
"""
Script para gerar documents.json a partir dos arquivos .md em servidao/
"""

import os
import json
import re
from pathlib import Path
import yaml
from datetime import datetime

# Mapeamento de numerais romanos para números
ROMAN_NUMERALS = {
    'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5,
    'vi': 6, 'vii': 7, 'viii': 8, 'ix': 9, 'x': 10,
    'xi': 11, 'xii': 12, 'xiii': 13, 'xiv': 14, 'xv': 15,
    'xvi': 16, 'xvii': 17, 'xviii': 18, 'xix': 19, 'xx': 20,
    'xxi': 21, 'xxii': 22, 'xxiii': 23, 'xxiv': 24, 'xxv': 25,
    'xxvi': 26, 'xxvii': 27, 'xxviii': 28, 'xxix': 29, 'xxx': 30
}

def roman_to_int(roman_str):
    """Converte numeral romano (string) para inteiro"""
    roman_lower = roman_str.lower().strip()
    return ROMAN_NUMERALS.get(roman_lower, 999)  # Retorna 999 se não encontrar (vai para o final)

def load_section_order(order_file_path):
    """Carrega a ordem das seções do arquivo order.md"""
    section_order = {}
    order_index = 1
    
    try:
        with open(order_file_path, 'r', encoding='utf-8') as f:
            for line in f:
                original_line = line
                line = line.strip()
                
                # Ignora linhas vazias
                if not line:
                    continue
                
                # Ignora a primeira linha se for "servidao/"
                if line == 'servidao/':
                    continue
                
                # Remove "servidao/" se presente no início
                if line.startswith('servidao/'):
                    line = line.replace('servidao/', '', 1).strip()
                
                # Remove espaços e tabs no início (indentação)
                line = line.lstrip()
                
                # Remove trailing slash se houver
                if line.endswith('/'):
                    line = line[:-1]
                
                # Remove espaços extras
                line = line.strip()
                
                if line:
                    # Normaliza o nome da seção (lowercase para comparação)
                    section_key = line.lower()
                    section_order[section_key] = order_index
                    order_index += 1
    except FileNotFoundError:
        print(f"Aviso: Arquivo {order_file_path} não encontrado. Usando ordem alfabética.")
    except Exception as e:
        print(f"Erro ao ler {order_file_path}: {e}")
    
    return section_order

def create_missing_folders(servidao_path, section_order):
    """Cria as pastas faltantes conforme order.md"""
    created = []
    for section_name, order in sorted(section_order.items(), key=lambda x: x[1]):
        folder_path = servidao_path / section_name
        if not folder_path.exists():
            folder_path.mkdir(parents=True, exist_ok=True)
            created.append(section_name)
            print(f"Criada pasta: {folder_path}")
    return created

def extract_yaml_frontmatter(file_path):
    """Extrai metadados YAML do front matter do arquivo markdown"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Verifica se há front matter YAML (delimitado por ---)
        if not content.startswith('---'):
            return None
        
        # Encontra o fim do front matter
        end_index = content.find('---', 3)
        if end_index == -1:
            return None
        
        # Extrai o YAML
        yaml_content = content[3:end_index].strip()
        
        # Parse do YAML
        try:
            metadata = yaml.safe_load(yaml_content)
            return metadata if metadata else None
        except yaml.YAMLError as e:
            print(f"Aviso: Erro ao parsear YAML em {file_path}: {e}")
            return None
    except Exception as e:
        print(f"Erro ao ler front matter de {file_path}: {e}")
        return None

def extract_title_from_markdown(file_path, frontmatter=None):
    """Extrai o título do front matter YAML ou do primeiro # do arquivo markdown"""
    # Prioriza título do front matter
    if frontmatter and 'title' in frontmatter:
        return frontmatter['title']
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
            # Se tem front matter, pula ele
            if content.startswith('---'):
                end_index = content.find('---', 3)
                if end_index != -1:
                    content = content[end_index + 3:].lstrip()
            
            # Procura primeiro título markdown
            for line in content.split('\n'):
                line = line.strip()
                if line.startswith('#'):
                    title = re.sub(r'^#+\s*', '', line).strip()
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

def get_section_key(section_name):
    """Normaliza o nome da seção para chave de comparação"""
    return section_name.lower().replace(' ', '-').replace('_', '-')

def extract_roman_numeral(file_path, title):
    """Extrai número romano do arquivo .md (nome do arquivo, título, ou conteúdo)
    
    Busca agressiva em múltiplos locais, já que sempre haverá um número romano.
    """
    sort_num = 999  # Valor padrão alto para ir ao final
    
    # 1. Tenta extrair do nome do arquivo (mais confiável)
    if file_path:
        filename = Path(file_path).stem.lower()
        
        # Padrões comuns: "parte_i", "parte_ii", "confissoes_i", "tratado_parte_i", etc.
        patterns = [
            r'parte[_\s]+([ivxlcdm]+)',      # parte_i, parte_ii
            r'[_\s]([ivxlcdm]+)[_\s]',       # qualquer numeral romano isolado
            r'^([ivxlcdm]+)[_\s]',          # numeral no início
            r'[_\s]([ivxlcdm]+)$',          # numeral no final
            r'([ivxlcdm]+)',                # qualquer numeral romano (último recurso)
        ]
        
        for pattern in patterns:
            match = re.search(pattern, filename)
            if match:
                num = roman_to_int(match.group(1))
                if num < 999:  # Se encontrou um número válido
                    sort_num = num
                    break
    
    # 2. Se não encontrou no arquivo, tenta no título
    if sort_num == 999 and title:
        # Padrões no título: "PARTE I", "PARTE II", "I —", "CONFISSÕES I", etc.
        patterns = [
            r'(?:PARTE|Parte|parte)[\s]+([IVXLCDM]+)',           # PARTE I, Parte II
            r'^([IVXLCDM]+)[\s—–-]',                             # I —, II —, etc.
            r'[\s—–-]([IVXLCDM]+)[\s—–-]',                       # — I —, etc.
            r'(?:CONFISSÕES|Confissões|confissões)[\s]+([IVXLCDM]+)',  # CONFISSÕES I
            r'\b([IVXLCDM]+)\b',                                 # qualquer numeral romano
        ]
        
        for pattern in patterns:
            match = re.search(pattern, title)
            if match:
                num = roman_to_int(match.group(1).lower())
                if num < 999:  # Se encontrou um número válido
                    sort_num = num
                    break
    
    # 3. Se ainda não encontrou, tenta ler o conteúdo do arquivo (primeiras 20 linhas)
    if sort_num == 999 and file_path:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                # Lê mais linhas para garantir que encontra
                for i, line in enumerate(f):
                    if i >= 20:
                        break
                    line_lower = line.lower()
                    # Procura por padrões como "I.", "II.", "III.", "i —", etc.
                    patterns = [
                        r'\b([ivxlcdm]+)[\.\s—–-]',              # I., II., etc.
                        r'parte[_\s]+([ivxlcdm]+)',              # parte i, parte ii
                        r'([ivxlcdm]+)[\s—–-]',                  # i —, ii —, etc.
                    ]
                    for pattern in patterns:
                        match = re.search(pattern, line_lower)
                        if match:
                            num = roman_to_int(match.group(1))
                            if num < 999:
                                sort_num = num
                                break
                    if sort_num < 999:
                        break
        except Exception:
            pass  # Ignora erros de leitura
    
    # 4. Último recurso: busca mais agressiva no nome do arquivo completo
    if sort_num == 999 and file_path:
        full_path = str(file_path).lower()
        # Busca qualquer sequência de letras que possa ser numeral romano
        match = re.search(r'([ivxlcdm]{1,4})', full_path)
        if match:
            num = roman_to_int(match.group(1))
            if num < 999:
                sort_num = num
    
    return sort_num

def get_sort_key(doc, file_path=None, section_order=None):
    """Gera chave de ordenação que respeita order.md e numerais romanos"""
    section = doc['section']
    title = doc['title']
    section_key = get_section_key(section)
    
    # Se for home.md, sempre vai primeiro (ordem 0)
    if doc.get('_is_home'):
        return (0, 0, title)
    
    # Ordem da seção conforme order.md (999 se não estiver definida)
    section_order_index = 999
    if section_order:
        section_order_index = section_order.get(section_key, 999)
    
    # Extrai número romano
    sort_num = extract_roman_numeral(file_path, title)
    
    # Retorna tupla de ordenação: (ordem_seção, número_romano, título)
    # Seções sem ordem definida vão para o final (999)
    # Documentos sem número romano vão para o final da seção (999)
    return (section_order_index, sort_num, title)

def extract_metadata_from_file(file_path, frontmatter=None):
    """Extrai metadados do front matter ou usa valores padrão"""
    metadata = {
        'date': None,
        'status': None,
        'tags': []
    }
    
    if frontmatter:
        # Extrai date
        if 'date' in frontmatter:
            date_value = frontmatter['date']
            # Tenta converter para formato ISO se necessário
            if isinstance(date_value, str):
                # Se já está em formato ISO (YYYY-MM-DD), usa direto
                if re.match(r'^\d{4}-\d{2}-\d{2}', date_value):
                    metadata['date'] = date_value
                else:
                    # Tenta parsear outros formatos
                    try:
                        # Se tem "XX" no dia, mantém como está
                        metadata['date'] = date_value
                    except:
                        metadata['date'] = date_value
            else:
                metadata['date'] = str(date_value)
        
        # Extrai status
        if 'status' in frontmatter:
            metadata['status'] = frontmatter['status']
        
        # Extrai tags
        if 'tags' in frontmatter:
            tags = frontmatter['tags']
            if isinstance(tags, list):
                metadata['tags'] = [str(tag) for tag in tags]
            elif isinstance(tags, str):
                # Se for string, tenta parsear como lista
                metadata['tags'] = [tag.strip() for tag in tags.split(',')]
            else:
                metadata['tags'] = []
    
    # Se não tem data no front matter, usa data de modificação do arquivo
    if not metadata['date']:
        try:
            mtime = os.path.getmtime(file_path)
            metadata['date'] = datetime.fromtimestamp(mtime).strftime('%Y-%m-%d')
        except:
            pass
    
    return metadata

def scan_markdown_files(servidao_path, base_path, section_order=None):
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
        
        # Extrai front matter YAML
        frontmatter = extract_yaml_frontmatter(md_file)
        
        # Extrai título (prioriza front matter)
        title = extract_title_from_markdown(md_file, frontmatter)
        section = get_section_name(md_file, servidao_path)
        
        # Extrai metadados
        metadata = extract_metadata_from_file(md_file, frontmatter)
        
        doc = {
            'title': title,
            'path': relative_path.replace('\\', '/'),  # Normaliza para /
            'section': section,
            'date': metadata['date'],
            'status': metadata['status'],
            'tags': metadata['tags'],
            '_file_path': str(md_file)  # Guarda caminho para ordenação
        }
        documents.append(doc)
    
    # Ordena: primeiro por ordem da seção (order.md), depois por número romano, depois por título
    documents.sort(key=lambda x: get_sort_key(x, x.get('_file_path'), section_order))
    
    # Remove os campos auxiliares antes de retornar
    for doc in documents:
        doc.pop('_file_path', None)
        doc.pop('_is_home', None)
    
    return documents

def main():
    """Função principal"""
    # Obtém o diretório onde o script está sendo executado
    script_dir = Path(__file__).parent.parent.resolve()
    os.chdir(script_dir)  # Muda para o diretório do projeto
    
    servidao_path = script_dir / 'servidao'
    order_file = script_dir / 'order.md'
    output_file = script_dir / 'documents.json'
    
    # Carrega ordem das seções do order.md
    print(f"Carregando ordem das seções de {order_file}...")
    section_order = load_section_order(order_file)
    
    if section_order:
        print(f"Ordem das seções carregada: {len(section_order)} seções definidas")
        # Cria pastas faltantes
        print("Verificando e criando pastas faltantes...")
        created = create_missing_folders(servidao_path, section_order)
        if created:
            print(f"Pastas criadas: {', '.join(created)}")
        else:
            print("Todas as pastas já existem.")
    else:
        print("Aviso: Ordem das seções não encontrada. Usando ordem alfabética.")
    
    print(f"\nEscaneando arquivos .md em {servidao_path}...")
    documents = scan_markdown_files(servidao_path, script_dir, section_order)
    
    # Escaneia também a pasta cartas/
    cartas_path = script_dir / 'cartas'
    if cartas_path.exists():
        print(f"Escaneando arquivos .md em {cartas_path}...")
        cartas_docs = scan_markdown_files(cartas_path, script_dir, section_order)
        documents.extend(cartas_docs)
    
    # Adiciona home.md se existir na raiz
    home_file = script_dir / 'home.md'
    if home_file.exists():
        print(f"Encontrado home.md na raiz, adicionando como página inicial...")
        frontmatter = extract_yaml_frontmatter(home_file)
        title = extract_title_from_markdown(home_file, frontmatter)
        metadata = extract_metadata_from_file(home_file, frontmatter)
        
        home_doc = {
            'title': title,
            'path': 'home.md',
            'section': 'Início',
            'date': metadata['date'],
            'status': metadata['status'],
            'tags': metadata['tags'],
            '_file_path': str(home_file),
            '_is_home': True  # Flag especial para ordenação
        }
        documents.insert(0, home_doc)  # Insere no início
    
    if not documents:
        print("Nenhum arquivo .md encontrado")
        return
    
    # Remove campos auxiliares de todos os documentos antes de salvar
    for doc in documents:
        doc.pop('_file_path', None)
        doc.pop('_is_home', None)
    
    print(f"\nEncontrados {len(documents)} documento(s):")
    for doc in documents:
        print(f"  - [{doc['section']}] {doc['title']} ({doc['path']})")
    
    # Escreve o JSON
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(documents, f, ensure_ascii=False, indent=2)
    
    print(f"\n[OK] documents.json gerado com sucesso em {output_file}")
    
    # Mostra resumo por seção
    sections_count = {}
    for doc in documents:
        section = doc['section']
        sections_count[section] = sections_count.get(section, 0) + 1
    
    print(f"\nResumo por seção:")
    for section, count in sections_count.items():
        print(f"  - {section}: {count} documento(s)")

if __name__ == '__main__':
    main()
