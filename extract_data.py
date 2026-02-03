import pandas as pd
import json
import re
import os

def slugify_title(title):
    value = str(title or '').lower()
    value = value.replace('&', 'and')
    value = re.sub(r'[^a-z0-9]+', '-', value)
    value = re.sub(r'^-+|-+$', '', value)
    return value

def extract_all_sheets(file_path, output_dir):
    print(f"Reading {file_path}...")
    try:
        xl = pd.ExcelFile(file_path)
        all_data = {}
        slug_index = {}
        base_url = "https://audio.iskcondesiretree.com/"

        os.makedirs(output_dir, exist_ok=True)
        tabs_dir = os.path.join(output_dir, "tabs")
        os.makedirs(tabs_dir, exist_ok=True)
        
        for sheet_name in xl.sheet_names:
            print(f"Processing sheet: {sheet_name}")
            df = pd.read_excel(file_path, sheet_name=sheet_name)
            df = df.dropna(how='all')
            df = df.where(pd.notnull(df), None)
            
            records = df.to_dict(orient='records')
            
            # Normalize keys to lowercase for robustness
            normalized_records = []
            for row in records:
                new_row = {k.lower().strip(): v for k, v in row.items()}
                normalized_records.append(new_row)
            records = normalized_records

            processed_records = []
            
            for row in records:
                # Sanitization
                for key in row:
                    if row[key] is not None:
                        row[key] = str(row[key]).strip()

                raw_link = str(row.get('link', '')).strip()
                raw_title = str(row.get('title', '')).strip()
                raw_theme = str(row.get('theme', '')).strip()

                # Determine correct filename & title for each sheet type
                filename = ""
                display_title = ""
                category = ""

                if sheet_name == 'SP-Iskcon desire tree':
                    filename = raw_link
                    display_title = raw_title or filename
                    category = raw_theme
                elif sheet_name == 'HHRNSM':
                    # HHRNSM columns are swapped: title=folder, Theme=filename, link=filename
                    filename = raw_theme or raw_link
                    display_title = filename
                    category = raw_title
                elif sheet_name == 'Vaishnav Songs':
                    filename = raw_link
                    display_title = raw_title
                    category = "Vaishnava Songs"
                    url = filename if filename.startswith('http') else f"{base_url}{filename}"
                elif sheet_name == 'HHBRSM':
                    filename = raw_link
                    display_title = raw_title or filename
                    category = "HHBRSM"
                elif sheet_name == 'HG RSP' or sheet_name == 'HGRSP':
                    filename = raw_link
                    display_title = raw_title
                    category = "English Lectures"

                file_exts = ('.mp3', '.MP3', '.m4a', '.wav', '.ogg')
                # Clean filename of row indices or artifacts
                clean_filename = re.sub(r'\d+$', '', filename) if filename.endswith(tuple(f"{e}RowIndex" for e in file_exts)) else filename
                if not filename.lower().endswith(file_exts):
                    continue

                # URL Construction
                url = ""
                if filename.startswith('http'):
                    url = filename
                else:
                    url_part = filename.replace(' ', '%20')
                    if sheet_name == 'SP-Iskcon desire tree':
                        if '06_-_Srila_Prabhupada' in filename:
                            url = f"{base_url}{filename.replace('06_-_Srila_Prabhupada', '01_-_Srila_Prabhupada')}".replace(' ', '%20')
                        else:
                            url = f"{base_url}01_-_Srila_Prabhupada/{url_part}" if '/' not in filename else f"{base_url}{url_part}"
                    
                    elif sheet_name == 'HHRNSM':
                        cat_part = category.replace(' ', '_')
                        # Search logic for Year-wise
                        if 'Year_wise' in category:
                            year_match = re.search(r'(\d{4})', filename)
                            year = year_match.group(1) if year_match else "1989"
                            url = f"{base_url}02_-_ISKCON_Swamis/ISKCON_Swamis_-_R_to_Y/His_Holiness_Radhanath_Swami/Lectures/00_-_Year_wise/Devotional_Nectar_-_{year}/{url_part}"
                        else:
                            url = f"{base_url}02_-_ISKCON_Swamis/ISKCON_Swamis_-_R_to_Y/His_Holiness_Radhanath_Swami/Lectures/01_-_Theme_wise/{cat_part}/{url_part}"

                    elif sheet_name == 'HHBRSM':
                        url = f"{base_url}{url_part}"

                    elif sheet_name == 'HG RSP' or sheet_name == 'HGRSP':
                        # Default to Pune 2025 cluster for raw filenames
                        url = f"{base_url}06_-_More/01_-_ISKCON_Pune/2025/{url_part}"

                # Drive Resolver (Final Pass)
                if 'docs.google.com' in url or 'drive.google.com' in url:
                    match = re.search(r'id=([a-zA-Z0-9_-]+)', url)
                    if not match: match = re.search(r'/d/([a-zA-Z0-9_-]+)', url)
                    if match: url = f"https://drive.google.com/uc?id={match.group(1)}&export=download"

                # Title Cleanup
                final_title = display_title.split('/').pop().replace('.mp3', '').replace('.MP3', '').replace('_', ' ')
                
                processed_records.append({
                    'title': final_title,
                    'Theme': category,
                    'link': url
                })

            all_data[sheet_name] = processed_records

        # Write per-tab files and index
        tabs = []
        used_files = set()
        for sheet_name, records in all_data.items():
            file_slug = slugify_title(sheet_name) or "tab"
            filename = f"{file_slug}.json"
            if filename in used_files:
                suffix = 2
                while f"{file_slug}-{suffix}.json" in used_files:
                    suffix += 1
                filename = f"{file_slug}-{suffix}.json"
            used_files.add(filename)

            with open(os.path.join(tabs_dir, filename), 'w', encoding='utf-8') as f:
                json.dump(records, f, ensure_ascii=False, indent=2)

            for idx, row in enumerate(records):
                slug = slugify_title(row.get('title'))
                if slug and slug not in slug_index:
                    slug_index[slug] = {
                        'tab': sheet_name,
                        'file': filename,
                        'index': idx
                    }

            tabs.append({
                'name': sheet_name,
                'file': filename
            })

        with open(os.path.join(output_dir, "tabs.json"), 'w', encoding='utf-8') as f:
            json.dump({ "tabs": tabs }, f, ensure_ascii=False, indent=2)

        with open(os.path.join(output_dir, "slug_index.json"), 'w', encoding='utf-8') as f:
            json.dump(slug_index, f, ensure_ascii=False, indent=2)

        # Optional full export (kept for reference)
        with open(os.path.join(output_dir, "vani_data.json"), 'w', encoding='utf-8') as f:
            json.dump(all_data, f, ensure_ascii=False, indent=2)
            
        print(f"Successfully extracted all sheets to {output_dir}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    extract_all_sheets("Srila Prabhupad Vani.xlsx", os.path.join("public", "data"))
