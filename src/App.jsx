import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Trash2, Plus, Download, Camera, X } from 'lucide-react';
import Tesseract from 'tesseract.js';
import './App.css';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState('');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState({ date: '', description: '', amount: '', type: 'spesa', category: 'Cibo' });
  const [receiptImage, setReceiptImage] = useState(null);
  const [recognizedAmount, setRecognizedAmount] = useState('');
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [showReceiptConfirm, setShowReceiptConfirm] = useState(false);

  const users = {
    'Pupo': 'Tr0pic@lSunset2024!',
    'Pupa': 'M0s@ic#Garden5789&'
  };

  // Carica lo stato di login da localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('loggedInUser');
    if (savedUser) {
      setCurrentUser(savedUser);
      setIsLoggedIn(true);
    }
  }, []);

  // Carica i dati da localStorage
  useEffect(() => {
    const saved = localStorage.getItem('finanze');
    if (saved) {
      try {
        setTransactions(JSON.parse(saved));
      } catch (e) {
        console.error('Errore nel caricamento dei dati', e);
      }
    }
  }, []);

  // Salva i dati in localStorage quando cambiano
  useEffect(() => {
    localStorage.setItem('finanze', JSON.stringify(transactions));
  }, [transactions]);

  const addTransaction = (e) => {
    e.preventDefault();
    if (form.date && form.description && form.amount) {
      setTransactions([...transactions, {
        id: Date.now(),
        date: form.date,
        description: form.description,
        amount: parseFloat(form.amount),
        type: form.type,
        category: form.type === 'spesa' ? form.category : undefined
      }]);
      setForm({ date: '', description: '', amount: '', type: 'spesa', category: 'Cibo' });
    }
  };

  const deleteTransaction = (id) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const totalEntrate = Math.round(transactions.filter(t => t.type === 'entrata').reduce((sum, t) => sum + t.amount, 0) * 100) / 100;
  const totalUscite = Math.round(transactions.filter(t => t.type === 'spesa').reduce((sum, t) => sum + t.amount, 0) * 100) / 100;
  const bilancio = Math.round((totalEntrate - totalUscite) * 100) / 100;

  const spesePorCategoria = transactions
    .filter(t => t.type === 'spesa')
    .reduce((acc, t) => {
      const existing = acc.find(x => x.name === t.category);
      if (existing) existing.value += t.amount;
      else acc.push({ name: t.category, value: t.amount });
      return acc;
    }, [])
    .sort((a, b) => b.value - a.value);

  const transactionsSortate = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

  const colors = ['#378ADD', '#639922', '#BA7517', '#1D9E75', '#534AB7', '#E24B4A'];

  const handleLogin = (e) => {
    e.preventDefault();
    if (users[loginForm.username] === loginForm.password) {
      setIsLoggedIn(true);
      setCurrentUser(loginForm.username);
      localStorage.setItem('loggedInUser', loginForm.username);
      setLoginError('');
      setLoginForm({ username: '', password: '' });
    } else {
      setLoginError('Username o password errati');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser('');
    localStorage.removeItem('loggedInUser');
    setLoginForm({ username: '', password: '' });
  };

  const handleReceiptCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      setReceiptImage(event.target.result);
      setIsRecognizing(true);

      try {
        const { data: { text } } = await Tesseract.recognize(
          event.target.result,
          'ita'
        );

        // Estrai numeri con virgola o punto (importi)
        const amounts = text.match(/\d+[.,]\d{2}/g) || [];
        if (amounts.length > 0) {
          const lastAmount = amounts[amounts.length - 1].replace(',', '.');
          setRecognizedAmount(lastAmount);
          setShowReceiptConfirm(true);
        } else {
          alert('Importo non trovato nello scontrino');
        }
      } catch (error) {
        console.error('Errore OCR:', error);
        alert('Errore nella lettura dello scontrino');
      } finally {
        setIsRecognizing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const confirmReceiptAmount = () => {
    if (recognizedAmount) {
      const today = new Date().toISOString().split('T')[0];
      setTransactions([...transactions, {
        id: Date.now(),
        date: today,
        description: 'Spesa (da scontrino)',
        amount: parseFloat(recognizedAmount),
        type: 'spesa',
        category: 'Altro'
      }]);
      setReceiptImage(null);
      setRecognizedAmount('');
      setShowReceiptConfirm(false);
      alert('Spesa aggiunta! 👍');
    }
  };

  const cancelReceipt = () => {
    setReceiptImage(null);
    setRecognizedAmount('');
    setShowReceiptConfirm(false);
  };

  const exportCSV = () => {
    const csv = [
      ['Data', 'Descrizione', 'Importo', 'Tipo', 'Categoria'].join(','),
      ...transactions.map(t => [t.date, t.description, t.amount, t.type, t.category || ''].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finanze-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Schermata di login
  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1>💰 Finanze Famiglia</h1>
          <form onSubmit={handleLogin}>
            <h2>Accedi</h2>
            <input
              type="text"
              placeholder="Username"
              value={loginForm.username}
              onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={loginForm.password}
              onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
              required
            />
            {loginError && <p className="error-message">{loginError}</p>}
            <button type="submit" className="btn-primary">Accedi</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <div>
          <h1>💰 Finanze Famiglia</h1>
          <p className="user-name">Ciao, {currentUser}!</p>
        </div>
        <div className="header-actions">
          <button onClick={exportCSV} className="export-btn">
            <Download size={16} /> Esporta
          </button>
          <button onClick={handleLogout} className="logout-btn">
            Esci
          </button>
        </div>
      </header>

      <div className="cards-grid">
        <div className="card-stat entrate">
          <p className="label">Entrate</p>
          <p className="amount">€{totalEntrate.toFixed(2)}</p>
        </div>
        <div className="card-stat uscite">
          <p className="label">Uscite</p>
          <p className="amount">€{totalUscite.toFixed(2)}</p>
        </div>
        <div className={`card-stat bilancio ${bilancio >= 0 ? 'positivo' : 'negativo'}`}>
          <p className="label">Bilancio</p>
          <p className="amount">€{bilancio.toFixed(2)}</p>
        </div>
      </div>

      <div className="main-grid">
        <div className="card form-card">
          <h2>Aggiungi transazione</h2>
          <label className="receipt-button">
            <Camera size={16} /> Scatta foto scontrino
            <input type="file" accept="image/*" onChange={handleReceiptCapture} style={{display: 'none'}} capture="environment" />
          </label>
          <form onSubmit={addTransaction}>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({...form, date: e.target.value})}
              required
            />
            <input
              type="text"
              placeholder="Descrizione"
              value={form.description}
              onChange={(e) => setForm({...form, description: e.target.value})}
              required
            />
            <input
              type="number"
              step="0.01"
              placeholder="Importo"
              value={form.amount}
              onChange={(e) => setForm({...form, amount: e.target.value})}
              required
            />
            <select value={form.type} onChange={(e) => setForm({...form, type: e.target.value})}>
              <option value="spesa">Spesa</option>
              <option value="entrata">Entrata</option>
            </select>
            {form.type === 'spesa' && (
              <select value={form.category} onChange={(e) => setForm({...form, category: e.target.value})}>
                <option value="Cibo">Cibo</option>
                <option value="Casa">Casa</option>
                <option value="Utenze">Utenze</option>
                <option value="Trasporti">Trasporti</option>
                <option value="Salute">Salute</option>
                <option value="Svago">Svago</option>
                <option value="Altro">Altro</option>
              </select>
            )}
            <button type="submit" className="btn-primary">
              <Plus size={16} /> Aggiungi
            </button>
          </form>
        </div>

        {spesePorCategoria.length > 0 && (
          <div className="card chart-card">
            <h2>Spese per categoria</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={spesePorCategoria}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: €${value.toFixed(0)}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {spesePorCategoria.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `€${value.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="card history-card">
        <h2>Cronologia transazioni</h2>
        {transactionsSortate.length === 0 ? (
          <p className="empty-state">Nessuna transazione ancora. Inizia ad aggiungerne una!</p>
        ) : (
          <div className="transactions-list">
            {transactionsSortate.map((t) => (
              <div key={t.id} className="transaction-item">
                <div className="transaction-info">
                  <p className="description">{t.description}</p>
                  <p className="meta">
                    {t.date} {t.category && `• ${t.category}`}
                  </p>
                </div>
                <div className="transaction-actions">
                  <span className={`amount ${t.type}`}>
                    {t.type === 'entrata' ? '+' : '-'}€{t.amount.toFixed(2)}
                  </span>
                  <button
                    onClick={() => deleteTransaction(t.id)}
                    className="btn-delete"
                    title="Elimina"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showReceiptConfirm && (
        <div className="receipt-modal-overlay">
          <div className="receipt-modal">
            <div className="modal-header">
              <h3>Importo riconosciuto</h3>
              <button onClick={cancelReceipt} className="modal-close">
                <X size={20} />
              </button>
            </div>
            {receiptImage && <img src={receiptImage} alt="Scontrino" className="receipt-preview" />}
            <div className="modal-body">
              <p className="modal-label">Importo trovato:</p>
              <p className="modal-amount">€{recognizedAmount}</p>
              {isRecognizing && <p className="modal-loading">Lettura in corso...</p>}
            </div>
            <div className="modal-actions">
              <button onClick={cancelReceipt} className="btn-secondary">Annulla</button>
              <button onClick={confirmReceiptAmount} className="btn-primary">Conferma e salva</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
