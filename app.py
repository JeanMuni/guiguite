from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3

app = Flask(__name__)
CORS(app)

def init_db():
    conn = sqlite3.connect('dados.db')
    cursor = conn.cursor()
    
    # Tabela de Pontos de Risco (Mapa)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS riscos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            local TEXT NOT NULL,
            nivel TEXT NOT NULL,
            descricao TEXT NOT NULL,
            lat REAL NOT NULL,
            lng REAL NOT NULL
        )
    ''')
    
    # Tabela de Respostas do Quiz
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS quiz_respostas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            pontuacao INTEGER NOT NULL,
            total INTEGER NOT NULL,
            data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

init_db()

# Rota para salvar ponto de risco
@app.route('/api/riscos', methods=['POST'])
def salvar_risco():
    dados = request.json
    conn = sqlite3.connect('dados.db')
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO riscos (local, nivel, descricao, lat, lng) VALUES (?, ?, ?, ?, ?)',
        (dados['local'], dados['nivel'], dados['descricao'], dados['lat'], dados['lng'])
    )
    conn.commit()
    conn.close()
    return jsonify({"status": "sucesso", "mensagem": "Ponto de risco cadastrado!"}), 201

# Rota para buscar todos os pontos de risco
@app.route('/api/riscos', methods=['GET'])
def listar_riscos():
    conn = sqlite3.connect('dados.db')
    cursor = conn.cursor()
    cursor.execute('SELECT id, local, nivel, descricao, lat, lng FROM riscos')
    rows = cursor.fetchall()
    conn.close()
    
    riscos = [
        {"id": r[0], "local": r[1], "nivel": r[2], "descricao": r[3], "lat": r[4], "lng": r[5]}
        for r in rows
    ]
    return jsonify(riscos)

# Rota para salvar resultado do Quiz
@app.route('/api/quiz', methods=['POST'])
def salvar_quiz():
    dados = request.json
    conn = sqlite3.connect('dados.db')
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO quiz_respostas (nome, pontuacao, total) VALUES (?, ?, ?)',
        (dados['nome'], dados['pontuacao'], dados['total'])
    )
    conn.commit()
    conn.close()
    return jsonify({"status": "sucesso", "mensagem": "Resultado do quiz salvo!"}), 201

if __name__ == '__main__':
    app.run(port=5000, debug=True)