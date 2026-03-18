
import re

INPUT_FILE = '/a0/usr/projects/project_1_-_wantokjobs/app/legacy-dump.sql'
OUTPUT_FILE = '/a0/usr/projects/project_1_-_wantokjobs/app/legacy-dump-sqlite.sql'

summary = []

def replace_enum_set(match):
    col_def = match.group(0)
    summary.append(f"Replaced ENUM/SET in: {col_def.split('(')[0].strip()} with TEXT.")
    return re.sub(r'ENUM\s*\(.*?\)|SET\s*\(.*?\)', 'TEXT', col_def, flags=re.DOTALL)

def fix_auto_increment_pk(line):
    pattern = re.compile(r'([`\w]+)\s+([A-Za-z]+).*?AUTO_INCREMENT', re.IGNORECASE)
    match = pattern.search(line)
    if match:
        colname = match.group(1)
        newline = f'{colname} INTEGER PRIMARY KEY AUTOINCREMENT'
        summary.append(f"Replaced AUTO_INCREMENT PK: {colname}")
        return newline
    return line

def clean_line(line):
    line = re.sub(r'/\*.*?\*/', '', line)
    line = re.sub(r'--.*$', '', line)
    line = re.sub(r'\s+#.*$', '', line)
    line = re.sub(r'ENGINE=\w+', '', line, flags=re.IGNORECASE)
    line = re.sub(r'DEFAULT\s+CHARSET=\w+', '', line, flags=re.IGNORECASE)
    line = re.sub(r'COLLATE=\w+', '', line, flags=re.IGNORECASE)
    line = re.sub(r'CHARACTER SET \w+', '', line, flags=re.IGNORECASE)
    line = re.sub(r'unsigned', '', line, flags=re.IGNORECASE)
    line = re.sub(r'zerofill', '', line, flags=re.IGNORECASE)
    line = re.sub(r'ROW_FORMAT=\w+', '', line, flags=re.IGNORECASE)
    line = re.sub(r'KEY_BLOCK_SIZE=\d+', '', line, flags=re.IGNORECASE)
    line = re.sub(r'COMMENT\s+'[^']*'', '', line, flags=re.IGNORECASE)
    line = re.sub(r'ON UPDATE CURRENT_TIMESTAMP', '', line, flags=re.IGNORECASE)
    return line

def fix_default_yes_no(line):
    line = re.sub(r"DEFAULT b'0'", "DEFAULT 0", line)
    line = re.sub(r"DEFAULT b'1'", "DEFAULT 1", line)
    return line

def fix_insert(line):
    if not line.strip().upper().startswith("INSERT INTO"):
        return [line]
    m = re.match(r'(INSERT INTO [^\(]+)\s*\(([^;]+)', line, re.IGNORECASE)
    if m and line.count('),(') > 0:
        base_insert = line[:line.find('VALUES')+6]
        values_str = line[line.find('VALUES')+6:]
        values_str = values_str.strip().rstrip(';')
        rows = re.findall(r'\(([^\)]*)\)', values_str)
        inserts = []
        for row in rows:
            inserts.append(f"{base_insert} ({row});
")
        summary.append("Converted multi-row INSERT into single-row INSERTs.")
        return inserts
    return [line]

def fix_keys_constraints(line):
    if re.match(r'\s*(UNIQUE |FULLTEXT |SPATIAL )?KEY ', line, re.IGNORECASE):
        summary.append("Removed MySQL index/KEY: " + line.strip().split()[0])
        return ''
    line = re.sub(r'USING (BTREE|HASH)', '', line, flags=re.IGNORECASE)
    return line

def main():
    with open(INPUT_FILE, encoding='utf-8') as infile:
        lines = infile.readlines()
    out_lines = []
    in_table = False
    for idx, orig_line in enumerate(lines):
        line = orig_line.rstrip('
')
        cline = clean_line(line)
        if cline.upper().startswith('CREATE TABLE'):
            in_table = True
        if in_table:
            cline = re.sub(r'( +[`\w]+ +).*(ENUM\s*\(.*?\)|SET\s*\(.*?\))', replace_enum_set, cline, flags=re.DOTALL)
            cline = fix_auto_increment_pk(cline)
            cline = fix_keys_constraints(cline)
            if cline.strip().endswith(';'):
                in_table = False
        else:
            cline = fix_keys_constraints(cline)
        cline = fix_default_yes_no(cline)
        fixed_insert_lines = fix_insert(cline)
        for outline in fixed_insert_lines:
            if outline.strip():
                out_lines.append(outline + '
')
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as out:
        out.writelines(out_lines)
    with open(OUTPUT_FILE + '.conversion-report.txt', 'w', encoding='utf-8') as rep:
        rep.write('# MySQL→SQLite conversion summary
')
        for item in summary:
            rep.write('- ' + item + '
')
        rep.write('Completed conversion of: ' + INPUT_FILE + ' → ' + OUTPUT_FILE + '
')

if __name__ == '__main__':
    main()
