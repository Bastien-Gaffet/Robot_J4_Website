import os
import re

folder_path = "frontend"

# Regex HTML href
href_pattern = re.compile(r'href="([^"/]+)\.html"')

# Regex JS redirections simples
js_href_pattern = re.compile(r'window\.location\.href\s*=\s*"([^"/]+)\.html(\?[^"]*)?"')

# Regex JS redirections template string (avec backticks)
js_template_pattern = re.compile(r'window\.location\.href\s*=\s*`([^"/]+)\.html(\?[^`]*)?`')

def replace_href(match):
    page = match.group(1)
    return 'href="/"' if page == "index" else f'href="/{page}"'

def replace_js_href(match):
    page, query = match.group(1), match.group(2) or ""
    return f'window.location.href = "/{page}{query}"' if page != "index" else f'window.location.href = "/"{query}'

def replace_js_template(match):
    page, query = match.group(1), match.group(2) or ""
    return f'window.location.href = `/{page}{query}`' if page != "index" else f'window.location.href = `/`{query}`'

for root, dirs, files in os.walk(folder_path):
    for file in files:
        if file.endswith(".html") or file.endswith(".js"):
            file_path = os.path.join(root, file)
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            original = content
            content = href_pattern.sub(replace_href, content)
            content = js_href_pattern.sub(replace_js_href, content)
            content = js_template_pattern.sub(replace_js_template, content)

            if content != original:
                print(f"[MODIFIÉ] {file_path}")
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(content)
