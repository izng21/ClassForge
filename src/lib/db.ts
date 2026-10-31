import mysql from "mysql2/promise";

// Single shared pool. Reused across API routes via Next.js module caching.
declare global {
  // eslint-disable-next-line no-var
  var __mysqlPool: mysql.Pool | undefined;
}

export function getPool(): mysql.Pool {
  if (!global.__mysqlPool) {
    global.__mysqlPool = mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "class_emailer",
      waitForConnections: true,
      connectionLimit: 10,
      dateStrings: false,
    });
  }
  return global.__mysqlPool;
}

export const db = {
  query: async <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
    const pool = getPool();
    const [rows] = await pool.query(sql, params);
    return rows as T[];
  },
  execute: async (sql: string, params: any[] = []) => {
    const pool = getPool();
    const [result] = await pool.execute(sql, params);
    return result as mysql.ResultSetHeader;
  },
};
