/* ==========================================================================
   INOVAÇÃO NA MOBILIDADE URBANA — CAMINHO SEGURO (LÓGICA E BACKEND)
   ========================================================================== */

const API_URL = 'http://localhost:5000/api';
// Coordenadas centrais (Rancho Alegre - PR)
const MAP_CENTER = [-23.07621, -50.91612]; 

let map = null;
let markers = [];

// Banco de dados de questões do Quiz
const quizQuestions = [
  {
    question: "1. Ao circular de patinete à noite, qual o procedimento correto?",
    options: [
      "Usar roupas escuras para passar despercebido.",
      "Usar capacete, luzes dianteira/traseira e elementos refletivos.",
      "Circular pela calçada em velocidade máxima.",
      "Utilizar fones de ouvido no volume máximo."
    ],
    correct: 1,
    explanation: "A visibilidade noturna é vital. Luzes e refletivos evitam colisões graves com veículos."
  },
  {
    question: "2. Qual a prioridade no trânsito em áreas de convivência e travessias?",
    options: [
      "Os patinetes elétricos.",
      "Os automóveis e caminhões.",
      "Os pedestres.",
      "Quem estiver em maior velocidade."
    ],
    correct: 2,
    explanation: "O pedestre é a ponta mais vulnerável do trânsito e sempre possui a preferência de passagem."
  },
  {
    question: "3. É permitido transportar passageiros ou caronas no patinete elétrico?",
    options: [
      "Sim, desde que ambos usem capacete.",
      "Não, pois desestabiliza o veículo e altera o centro de gravidade.",
      "Sim, apenas em distâncias curtas.",
      "Livre em vias de baixa velocidade."
    ],
    correct: 1,
    explanation: "Patinetes são projetados estritamente para uso individual. Caronas aumentam drasticamente o risco de quedas."
  },
  {
    question: "4. O que deve ser feito antes de realizar uma curva ou mudança de faixa?",
    options: [
      "Acelerar para concluir a curva rapidamente.",
      "Sinalizar a intenção com os braços e verificar o tráfego em volta.",
      "Buzinar continuadamente sem olhar para trás.",
      "Frear bruscamente no meio da pista."
    ],
    correct: 1,
    explanation: "A sinalização com os braços alerta motoristas e outros ciclistas sobre sua direção."
  },
  {
    question: "5. Como agir ao se aproximar de um cruzamento com pouca visibilidade?",
    options: [
      "Manter a velocidade e cruzar direto.",
      "Reduzir a velocidade, parar se necessário e fazer contato visual com os motoristas.",
      "Subir na calçada em alta velocidade.",
      "Tocar a buzina e acelerar."
    ],
    correct: 1,
    explanation: "A prudência e a parada preventiva evitam acidentes em esquinas cegas."
  }
];

let currentQuizIndex = 0;
let quizScore = 0;

// Inicialização assim que a página carrega
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  initCharts();
  renderQuizQuestion();

  const reportForm = document.getElementById('form-report');
  if (reportForm) {
    reportForm.addEventListener('submit', handleReportSubmit);
  }
});

// NAVEGAÇÃO DE ABAS COM CORREÇÃO AUTOMÁTICA DO MAPA
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

  const selectedBtn = Array.from(document.querySelectorAll('.tab-btn')).find(btn => 
    btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(tabId)
  );
  if (selectedBtn) selectedBtn.classList.add('active');

  const selectedTab = document.getElementById(`tab-${tabId}`);
  if (selectedTab) selectedTab.classList.add('active');

  // Ajuste do mapa ao mudar de aba
  if (tabId === 'mapa') {
    setTimeout(() => {
      if (map) {
        map.invalidateSize(true);
      } else {
        initMap();
      }
    }, 150);
  }

  // Renderiza pergunta do Quiz ao abrir a aba
  if (tabId === 'quiz') {
    renderQuizQuestion();
  }
}

// INICIALIZAÇÃO DO MAPA (Sem erro 403)
function initMap() {
  const mapElement = document.getElementById('map');
  if (!mapElement || map) return;

  map = L.map('map').setView(MAP_CENTER, 16);

  // Provedor CartoDB Voyager
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap, © CARTO'
  }).addTo(map);

  loadMapPoints();
}

// BUSCA PONTOS SALVOS
async function loadMapPoints() {
  try {
    const res = await fetch(`${API_URL}/riscos`);
    if (!res.ok) throw new Error('Servidor não respondeu');
    
    const points = await res.json();

    markers.forEach(m => map.removeLayer(m));
    markers = [];

    points.forEach(pt => {
      let color = pt.nivel === 'high' || pt.nivel.includes('Alto') ? '#ef4444' : 
                  pt.nivel === 'medium' || pt.nivel.includes('Atenção') ? '#f59e0b' : '#10b981';

      const marker = L.circleMarker([pt.lat, pt.lng], {
        color: color,
        fillColor: color,
        fillOpacity: 0.85,
        radius: 10
      }).addTo(map);

      marker.on('click', () => {
        const detailsContainer = document.getElementById('point-details');
        if (detailsContainer) {
          detailsContainer.innerHTML = `
            <h4 style="color: var(--dark-navy); margin-bottom: 6px;">${pt.local}</h4>
            <p style="font-size: 0.88rem; margin-bottom: 4px;"><strong>Risco:</strong> ${pt.nivel}</p>
            <p style="font-size: 0.88rem;"><strong>Descrição:</strong> ${pt.descricao}</p>
          `;
        }
      });

      markers.push(marker);
    });
  } catch (err) {
    // Exemplo padrão no mapa caso o app.py ainda não esteja rodando
    if (markers.length === 0) {
      const defaultMarker = L.circleMarker(MAP_CENTER, {
        color: '#ef4444',
        fillColor: '#ef4444',
        fillOpacity: 0.85,
        radius: 10
      }).addTo(map);

      defaultMarker.on('click', () => {
        document.getElementById('point-details').innerHTML = `
          <h4 style="color: var(--dark-navy); margin-bottom: 6px;">Entrada Principal da Escola</h4>
          <p style="font-size: 0.88rem; margin-bottom: 4px;"><strong>Risco:</strong> Alto</p>
          <p style="font-size: 0.88rem;"><strong>Descrição:</strong> Cruzamento com alto fluxo nos horários de entrada e saída.</p>
        `;
      });
      markers.push(defaultMarker);
    }
  }
}

// CADASTRO DE PONTOS DE RISCO
async function handleReportSubmit(e) {
  e.preventDefault();

  const local = document.getElementById('rep-local').value;
  const nivel = document.getElementById('rep-nivel').value;
  const desc = document.getElementById('rep-desc').value;
  const lat = MAP_CENTER[0];
  const lng = MAP_CENTER[1];

  const novoRisco = { local, nivel, descricao: desc, lat, lng };

  try {
    const res = await fetch(`${API_URL}/riscos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novoRisco)
    });

    if (res.ok) {
      alert('Ponto de risco cadastrado com sucesso no banco de dados!');
      document.getElementById('form-report').reset();
      loadMapPoints();
      switchTab('mapa');
    } else {
      alert('Erro ao salvar ponto no servidor.');
    }
  } catch (err) {
    alert('Aviso: O servidor Python (app.py) não está ativo no momento.');
  }
}

// LÓGICA DO QUIZ
function renderQuizQuestion() {
  const body = document.getElementById('quiz-body');
  if (!body) return;

  if (currentQuizIndex >= quizQuestions.length) {
    showQuizResult();
    return;
  }

  const q = quizQuestions[currentQuizIndex];
  
  const progressText = document.getElementById('quiz-progress-text');
  const progressBar = document.getElementById('quiz-progress-bar');
  
  if (progressText) progressText.innerText = `Pergunta ${currentQuizIndex + 1} de ${quizQuestions.length}`;
  if (progressBar) progressBar.style.width = `${((currentQuizIndex + 1) / quizQuestions.length) * 100}%`;

  body.innerHTML = `
    <div class="quiz-question-title">${q.question}</div>
    <div class="quiz-options">
      ${q.options.map((opt, i) => `
        <button class="quiz-option-btn" onclick="checkAnswer(${i})">${opt}</button>
      `).join('')}
    </div>
    <div id="quiz-feedback" class="quiz-feedback hidden"></div>
  `;
}

function checkAnswer(selectedIdx) {
  const q = quizQuestions[currentQuizIndex];
  const feedback = document.getElementById('quiz-feedback');
  const buttons = document.querySelectorAll('.quiz-option-btn');

  buttons.forEach(btn => btn.disabled = true);

  if (feedback) {
    feedback.classList.remove('hidden');
    if (selectedIdx === q.correct) {
      quizScore++;
      feedback.className = "quiz-feedback correct";
      feedback.innerHTML = `<strong>✓ Resposta Correta!</strong><br>${q.explanation}`;
    } else {
      feedback.className = "quiz-feedback incorrect";
      feedback.innerHTML = `<strong>X Resposta Incorreta.</strong><br>${q.explanation}`;
    }
  }

  setTimeout(() => {
    currentQuizIndex++;
    renderQuizQuestion();
  }, 2500);
}

function showQuizResult() {
  const body = document.getElementById('quiz-body');
  const resultDiv = document.getElementById('quiz-result');

  if (body) body.classList.add('hidden');
  if (resultDiv) {
    resultDiv.classList.remove('hidden');
    const pct = Math.round((quizScore / quizQuestions.length) * 100);

    resultDiv.innerHTML = `
      <div style="text-align:center; padding:20px;">
        <i class="ph ph-award" style="font-size:4rem; color:var(--primary);"></i>
        <h3 style="font-size:1.6rem; color:var(--dark-navy); margin-top:10px;">Quiz Concluído!</h3>
        <p style="font-size:1.1rem; margin:10px 0;">Sua pontuação: <strong>${quizScore} de ${quizQuestions.length} (${pct}%)</strong></p>
        
        <div style="margin-top: 15px;">
          <input type="text" id="quiz-user-name" placeholder="Digite seu nome" style="padding:10px; border-radius:6px; border:1px solid #cbd5e1; width:80%; max-width:300px; margin-bottom:12px;">
          <br>
          <button class="btn btn-primary" onclick="saveQuizResult()"><i class="ph ph-floppy-disk"></i> Salvar Pontuação</button>
        </div>
      </div>
    `;
  }
}

async function saveQuizResult() {
  const nameInput = document.getElementById('quiz-user-name');
  const nome = nameInput ? nameInput.value.trim() : '';

  if (!nome) {
    alert('Por favor, informe seu nome antes de salvar.');
    return;
  }

  try {
    const res = await fetch(`${API_URL}/quiz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, pontuacao: quizScore, total: quizQuestions.length })
    });

    if (res.ok) {
      alert('Pontuação salva com sucesso no banco de dados!');
      resetQuiz();
    }
  } catch (err) {
    alert('Não foi possível salvar no banco de dados.');
  }
}

function resetQuiz() {
  currentQuizIndex = 0;
  quizScore = 0;
  const resultDiv = document.getElementById('quiz-result');
  const body = document.getElementById('quiz-body');
  if (resultDiv) resultDiv.classList.add('hidden');
  if (body) body.classList.remove('hidden');
  renderQuizQuestion();
}

// GRÁFICOS (CHART.JS)
function initCharts() {
  const ctxEpi = document.getElementById('chartEpis');
  if (ctxEpi) {
    new Chart(ctxEpi, {
      type: 'doughnut',
      data: {
        labels: ['Usa Sempre', 'Usa Às Vezes', 'Raramente / Nunca'],
        datasets: [{
          data: [25, 35, 40],
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444']
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  const ctxRiscos = document.getElementById('chartRiscos');
  if (ctxRiscos) {
    new Chart(ctxRiscos, {
      type: 'bar',
      data: {
        labels: ['Baixa Visibilidade', 'Excesso de Velocidade', 'Calçadas Ruins', 'Falta de Faixa'],
        datasets: [{
          label: 'Menções pelos Alunos',
          data: [65, 52, 48, 30],
          backgroundColor: '#0284c7'
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
}