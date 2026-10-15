#!/usr/bin/env python3
"""Add missing query indexes without replacing tables or application data."""
import json
from load_mysql import query
from normalize import INDEXES


def main():
    existing = set(query("SELECT INDEX_NAME FROM information_schema.STATISTICS "
                         "WHERE TABLE_SCHEMA=DATABASE();").splitlines())
    created = []
    for table, columns in INDEXES:
        name = f'idx_{table}_{columns.replace(", ", "_")}'
        if name not in existing:
            query(f'CREATE INDEX `{name}` ON `{table}` ({columns});')
            created.append(name)
    print(json.dumps({'created': created, 'required_indexes': len(INDEXES)}, indent=2))


if __name__ == '__main__':
    main()
