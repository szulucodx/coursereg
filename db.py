import os

import pymysql
from dotenv import load_dotenv


load_dotenv()


DB_NAME = os.getenv('DB_NAME', 'BrightFutureUniversity')


def _base_config(include_database=True):
    config = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'user': os.getenv('DB_USER', 'root'),
        'password': os.getenv('DB_PASSWORD', ''),
        'port': int(os.getenv('DB_PORT', '3306')),
        'charset': 'utf8mb4',
        'autocommit': False,
        'cursorclass': pymysql.cursors.DictCursor,
    }
    if include_database:
        config['database'] = DB_NAME
    return config


def _quote_identifier(name):
    return f"`{str(name).replace('`', '``')}`"


def ensure_database_exists():
    connection = pymysql.connect(**_base_config(include_database=False))
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                f"CREATE DATABASE IF NOT EXISTS {_quote_identifier(DB_NAME)} "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
        connection.commit()
    finally:
        connection.close()


def get_connection():
    return pymysql.connect(**_base_config())


def query(sql, params=None):
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(sql, params or ())
            return cursor.fetchall()
    finally:
        connection.close()


def execute(sql, params=None):
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            rowcount = cursor.execute(sql, params or ())
        connection.commit()
        return rowcount
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()
