#!/usr/bin/env python3
"""Load this project's generated dataset and verify MySQL counts and all FKs."""
import gzip
import json
import subprocess
from collect import ROOT, DATA

COMPOSE=['docker','compose','-f',str(ROOT/'compose.yaml')]
MYSQL=COMPOSE+['exec','-T','mysql','sh','-c','MYSQL_PWD="$MYSQL_PASSWORD" exec mysql --default-character-set=utf8mb4 -u "$MYSQL_USER" "$MYSQL_DATABASE" --batch --skip-column-names']

def query(sql):
    result=subprocess.run(MYSQL,input=sql,text=True,capture_output=True)
    if result.returncode:
        raise RuntimeError(result.stderr[:2000])
    return result.stdout

def main():
    counts=json.loads((DATA/'normalized'/'counts.json').read_text())
    # Only the tables named in schema.sql in this project's database are replaced.
    process=subprocess.Popen(MYSQL,stdin=subprocess.PIPE,stderr=subprocess.PIPE)
    with gzip.open(DATA/'normalized'/'enjoytrip.mysql.sql.gz','rb') as f:
        while chunk:=f.read(1024*1024):
            process.stdin.write(chunk)
    process.stdin.close()
    error=process.stderr.read().decode()
    if process.wait():
        raise RuntimeError(error[:2000])
    actual={}
    for table,expected in counts.items():
        actual[table]=int(query(f'SELECT COUNT(*) FROM `{table}`;').strip())
        if actual[table]!=expected:
            raise RuntimeError(f'{table}: MySQL {actual[table]} != export {expected}')
    # Check every composite/single-column foreign key in the actual running MySQL.
    fks=query("SELECT TABLE_NAME,CONSTRAINT_NAME,COLUMN_NAME,REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME,ORDINAL_POSITION FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL ORDER BY TABLE_NAME,CONSTRAINT_NAME,ORDINAL_POSITION;")
    groups={}
    for line in fks.splitlines():
        table,name,col,parent,pcol,pos=line.split('\t')
        groups.setdefault((table,name,parent),[]).append((col,pcol))
    for (table,name,parent),cols in groups.items():
        join=' AND '.join(f'c.`{c}`=p.`{pc}`' for c,pc in cols)
        nonnull=' AND '.join(f'c.`{c}` IS NOT NULL' for c,_ in cols)
        n=int(query(f'SELECT COUNT(*) FROM `{table}` c LEFT JOIN `{parent}` p ON {join} WHERE {nonnull} AND p.`{cols[0][1]}` IS NULL;').strip())
        if n:
            raise RuntimeError(f'Orphans: {name}: {n}')
    report=dict(status='verified',row_counts=actual,foreign_keys_checked=len(groups),orphan_rows=0)
    (DATA/'mysql-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(report,ensure_ascii=False,indent=2))

if __name__=='__main__':
    main()
