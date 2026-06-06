import dotenv from "dotenv";

dotenv.config();

export const env = {
  PYTHON_API: process.env.PYTHON_API,
  DATABASE_URL: process.env.DATABASE_URL,
  PORT: process.env.PORT
};