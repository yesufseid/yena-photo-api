import { sql } from "./index.js";

async function testConnection() {
  try {
    const result = await sql`SELECT NOW()`;

    console.log("Database Connected ✅");

    console.log(result);
  } catch (error) {
    console.log("Database Error ❌");

    console.log(error);
  }
}

testConnection();