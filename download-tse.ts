import axios from "axios";
import fs from "fs";
import path from "path";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

// Configuração do Pool (Ajuste com suas credenciais do Supabase ou Postgres local)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://postgres:senha@localhost:5432/postgres",
  ssl: { rejectUnauthorized: false } // Necessário para o Supabase
});

async function baixarESalvar() {
  const url = "https://resultados.tse.jus.br/oficial/ele2024/619/dados-simplificados/df/df-c0001-e000619-r.json";

  console.log("🚀 Iniciando download e persistência...");

  try {
    const response = await axios.get(url);
    const dados = response.data;

    // Exemplo de como salvar os candidatos e seus votos
    for (const cand of dados.cand) {
      await pool.query(
        "INSERT INTO electoral_results (city, zone, section, candidate_name, votes, election_year) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING",
        ['BRASÍLIA', '001', '0001', cand.nm, parseInt(cand.vap), 2026]
      );
    }

    console.log("✅ Dados salvos com sucesso no banco de dados!");

  } catch (error: any) {
    console.error("❌ Erro:", error.message);
  } finally {
    await pool.end();
  }
}

baixarESalvar();

